import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { resolveAccountConfig } from './config';
import { createSupabaseBackend } from './supabaseBackend';

/**
 * A recording stand-in for the Supabase client: every query builder call is logged, and each
 * chain resolves to the queued result for its table. No network is involved.
 */
function fakeClient(results: Record<string, unknown[]> = {}, session: object | null = { user: { id: 'u1', email: 'a@x.test', app_metadata: {}, user_metadata: {} } }) {
  const calls: { table: string; chain: [string, unknown[]][] }[] = [];
  const auth: [string, unknown][] = [];
  const builder = (table: string) => {
    const entry = { table, chain: [] as [string, unknown[]][] };
    calls.push(entry);
    const proxy: object = new Proxy(
      {},
      {
        get(_t, prop: string) {
          if (prop === 'then') {
            const next = results[table]?.shift() ?? { data: null, error: null };
            return (res: (v: unknown) => void) => res(next);
          }
          return (...args: unknown[]) => {
            entry.chain.push([prop, args]);
            return proxy;
          };
        },
      },
    );
    return proxy;
  };
  const client = {
    from: builder,
    rpc: (fn: string) => {
      calls.push({ table: `rpc:${fn}`, chain: [] });
      return Promise.resolve({ data: null, error: null });
    },
    auth: {
      getSession: async () => ({ data: { session }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithOtp: async (a: unknown) => (auth.push(['signInWithOtp', a]), { data: {}, error: null }),
      verifyOtp: async (a: unknown) => (auth.push(['verifyOtp', a]), { data: { user: { id: 'u1', email: 'a@x.test', email_confirmed_at: 'x', app_metadata: { provider: 'email' }, user_metadata: {} } }, error: null }),
      signInWithOAuth: async (a: unknown) => (auth.push(['signInWithOAuth', a]), { data: {}, error: null }),
      signOut: async (a: unknown) => (auth.push(['signOut', a]), { error: null }),
    },
  };
  return { client: client as unknown as SupabaseClient, calls, auth };
}

const cfg = resolveAccountConfig({ VITE_SUPABASE_URL: 'https://p.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x', VITE_SUPABASE_GOOGLE: 'true' }, 'live');

describe('Supabase backend', () => {
  it('requests email codes that work for new and existing users alike, and verifies as type "email"', async () => {
    const f = fakeClient();
    const b = createSupabaseBackend(cfg, f.client);
    await b.requestCode('a@x.test');
    const user = await b.verifyCode('a@x.test', '123456');
    expect(f.auth[0]).toEqual(['signInWithOtp', { email: 'a@x.test', options: { shouldCreateUser: true, emailRedirectTo: expect.any(String) } }]);
    expect(f.auth[1]).toEqual(['verifyOtp', { email: 'a@x.test', token: '123456', type: 'email' }]);
    expect(user).toMatchObject({ id: 'u1', emailVerified: true, provider: 'email' });
  });

  it('maps an Auth error to a generic kind', async () => {
    const f = fakeClient();
    f.client.auth.verifyOtp = (async () => ({ data: { user: null, session: null }, error: { name: 'AuthApiError', status: 403, code: 'otp_expired', message: 'Token has expired or is invalid' } })) as never;
    await expect(createSupabaseBackend(cfg, f.client).verifyCode('a@x.test', '000000')).rejects.toMatchObject({ kind: 'invalid_code' });
  });

  it('never sends a user id in rows it writes; RLS and column defaults supply it', async () => {
    const f = fakeClient({ user_followed_companies: [{ data: [{ company_id: 'meta' }], error: null }] });
    const b = createSupabaseBackend(cfg, f.client);
    await b.saveTopics(['research', 'research']);
    await b.saveCompanies(['openai']);
    await b.addSaved([{ id: 'abcdef12', day: '2026-10-20', title: 'T', sourceName: 'S', url: 'https://x.test', publishedAt: '', savedAt: '' }]);
    const writes = f.calls.flatMap((c) => c.chain.filter(([m]) => m === 'upsert' || m === 'insert').map(([, args]) => JSON.stringify(args[0])));
    expect(writes.length).toBe(3);
    for (const w of writes) expect(w).not.toMatch(/user_id|"id"/);
    const prefs = f.calls.find((c) => c.table === 'user_preferences')!;
    expect(prefs.chain[0]).toEqual(['upsert', [{ topics: ['research'] }, { onConflict: 'user_id' }]]);
    const follows = f.calls.filter((c) => c.table === 'user_followed_companies').map((c) => c.chain.map(([m]) => m));
    expect(follows).toEqual([['select'], ['delete', 'in'], ['upsert']]);
    const saved = f.calls.find((c) => c.table === 'user_bookmarks')!;
    expect(saved.chain[0]![1][1]).toEqual({ onConflict: 'user_id,article_id', ignoreDuplicates: true });
  });

  it('deletes the account through the server function, then clears the local session', async () => {
    const f = fakeClient();
    await createSupabaseBackend(cfg, f.client).deleteAccount();
    expect(f.calls.map((c) => c.table)).toEqual(['rpc:delete_my_account']);
    expect(f.auth).toEqual([['signOut', { scope: 'local' }]]);
  });

  it('signs out locally by default and everywhere on request', async () => {
    const f = fakeClient();
    const b = createSupabaseBackend(cfg, f.client);
    await b.signOut();
    await b.signOut(true);
    expect(f.auth).toEqual([
      ['signOut', { scope: 'local' }],
      ['signOut', { scope: 'global' }],
    ]);
  });

  it('refuses data calls without a session', async () => {
    const f = fakeClient({}, null);
    await expect(createSupabaseBackend(cfg, f.client).updateProfile({ displayName: 'x' })).rejects.toMatchObject({ kind: 'not_signed_in' });
  });
});
