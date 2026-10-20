// @vitest-environment node
/**
 * Row Level Security isolation, run against the real migration in an in-process Postgres (PGlite).
 * A small stub stands in for the parts of Supabase the migration relies on: the `auth` schema,
 * `auth.users`, `auth.uid()` (read from the JWT claim Supabase sets per request) and the
 * `anon` / `authenticated` roles. Everything else is the exact SQL that runs on Supabase.
 */
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import migration from '../../../supabase/migrations/20261020000000_accounts.sql?raw';

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  grant usage on schema auth to anon, authenticated;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public to anon, authenticated;
`;

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';

let db: PGlite;

async function asUser(uid: string | null, sql: string, params: unknown[] = []) {
  await db.exec(uid ? `set role authenticated; set request.jwt.claim.sub = '${uid}';` : `set role anon; set request.jwt.claim.sub = '';`);
  try {
    return await db.query<Record<string, unknown>>(sql, params);
  } finally {
    await db.exec('reset role; reset request.jwt.claim.sub;');
  }
}

const bookmark = (id: string) =>
  `insert into public.user_bookmarks (article_id, day, title, source_name, url) values ('${id}', '2026-10-20', 'T', 'S', 'https://example.com/${id}')`;

describe('database RLS isolation between users', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(SUPABASE_STUB);
    await db.exec(migration);
    await db.exec(`
      insert into auth.users (id, email, raw_user_meta_data) values
        ('${A}', 'a@example.com', '{"full_name": "Ada", "avatar_url": "javascript:alert(1)"}'),
        ('${B}', 'b@example.com', '{}');
    `);
  }, 60_000);
  afterAll(async () => {
    await db?.close();
  });

  it('creates a profile and preference row for every new auth user', async () => {
    const r = await db.query<{ id: string; email: string; display_name: string; avatar_url: string | null }>(
      'select id, email, display_name, avatar_url from public.profiles order by email',
    );
    expect(r.rows).toEqual([
      { id: A, email: 'a@example.com', display_name: 'Ada', avatar_url: null },
      { id: B, email: 'b@example.com', display_name: null, avatar_url: null },
    ]);
    expect((await db.query('select count(*)::int as n from public.user_preferences')).rows).toEqual([{ n: 2 }]);
  });

  it('lets a user read only their own profile and preferences', async () => {
    expect((await asUser(A, 'select id from public.profiles')).rows).toEqual([{ id: A }]);
    expect((await asUser(B, 'select user_id from public.user_preferences')).rows).toEqual([{ user_id: B }]);
    expect((await asUser(B, `select id from public.profiles where id = '${A}'`)).rows).toEqual([]);
  });

  it("cannot change another user's profile by passing their id", async () => {
    const r = await asUser(B, `update public.profiles set display_name = 'pwned' where id = '${A}'`);
    expect(r.affectedRows).toBe(0);
    const name = await db.query(`select display_name from public.profiles where id = '${A}'`);
    expect(name.rows).toEqual([{ display_name: 'Ada' }]);
  });

  it('keeps email and id server-owned', async () => {
    await expect(asUser(A, `update public.profiles set email = 'x@evil.test' where id = '${A}'`)).rejects.toThrow(/permission denied/);
    await expect(asUser(A, `update public.profiles set id = '${B}' where id = '${A}'`)).rejects.toThrow(/permission denied/);
    const r = await asUser(A, `update public.profiles set display_name = 'Ada L', locale = 'fa', onboarding_step = 2 where id = '${A}' returning email, locale`);
    expect(r.rows).toEqual([{ email: 'a@example.com', locale: 'fa' }]);
  });

  it('validates profile fields', async () => {
    await expect(asUser(A, `update public.profiles set avatar_url = 'javascript:alert(1)' where id = '${A}'`)).rejects.toThrow(/check constraint/);
    await expect(asUser(A, `update public.profiles set locale = 'de' where id = '${A}'`)).rejects.toThrow(/check constraint/);
    await expect(asUser(A, `update public.profiles set display_name = '   ' where id = '${A}'`)).rejects.toThrow(/check constraint/);
  });

  it('stores only known topics and companies, privately', async () => {
    await asUser(A, `update public.user_preferences set topics = '{models,research}' where user_id = '${A}'`);
    await expect(asUser(A, `update public.user_preferences set topics = '{crypto}' where user_id = '${A}'`)).rejects.toThrow(/check constraint/);
    await asUser(A, `insert into public.user_followed_companies (company_id) values ('openai'), ('anthropic')`);
    await expect(asUser(A, `insert into public.user_followed_companies (company_id) values ('acme')`)).rejects.toThrow(/check constraint/);
    expect((await asUser(B, 'select * from public.user_followed_companies')).rows).toEqual([]);
    expect((await asUser(B, `update public.user_preferences set topics = '{}' where user_id = '${A}'`)).affectedRows).toBe(0);
    expect((await asUser(B, `delete from public.user_followed_companies where user_id = '${A}'`)).affectedRows).toBe(0);
    expect((await db.query(`select count(*)::int as n from public.user_followed_companies where user_id = '${A}'`)).rows).toEqual([{ n: 2 }]);
  });

  it('refuses rows written in another user’s name', async () => {
    await expect(
      asUser(B, `insert into public.user_followed_companies (user_id, company_id) values ('${A}', 'meta')`),
    ).rejects.toThrow(/row-level security/);
    await expect(
      asUser(B, `insert into public.user_bookmarks (user_id, article_id, day, title, source_name, url) values ('${A}', 'abcdef12', '2026-10-20', 'T', 'S', 'https://x.test')`),
    ).rejects.toThrow(/row-level security/);
    await expect(asUser(B, `insert into public.profiles (id) values ('${A}')`)).rejects.toThrow(/row-level security|duplicate key/);
  });

  it('keeps bookmarks private and free of duplicates', async () => {
    await asUser(A, bookmark('aaaa1111'));
    await expect(asUser(A, bookmark('aaaa1111'))).rejects.toThrow(/duplicate key/);
    // The app's merge path: insert … on conflict do nothing.
    await asUser(A, `${bookmark('aaaa1111')} on conflict (user_id, article_id) do nothing`);
    await asUser(B, bookmark('aaaa1111')); // the same story in another account is fine
    expect((await asUser(A, 'select article_id from public.user_bookmarks')).rows).toEqual([{ article_id: 'aaaa1111' }]);
    expect((await asUser(B, `delete from public.user_bookmarks where user_id = '${A}'`)).affectedRows).toBe(0);
    expect((await db.query('select count(*)::int as n from public.user_bookmarks')).rows).toEqual([{ n: 2 }]);
    await expect(
      asUser(A, `insert into public.user_bookmarks (article_id, day, title, source_name, url) values ('bbbb2222', '2026-10-20', 'T', 'S', 'javascript:alert(1)')`),
    ).rejects.toThrow(/check constraint/);
  });

  it('gives signed-out visitors no access at all', async () => {
    for (const table of ['profiles', 'user_preferences', 'user_followed_companies', 'user_bookmarks']) {
      await expect(asUser(null, `select * from public.${table}`)).rejects.toThrow(/permission denied/);
    }
    await expect(asUser(null, 'select public.delete_my_account()')).rejects.toThrow(/permission denied/);
  });

  it('deletes only the caller’s own account, with everything attached', async () => {
    await asUser(B, 'select public.delete_my_account()');
    expect((await db.query('select id from auth.users')).rows).toEqual([{ id: A }]);
    for (const [table, col] of [
      ['profiles', 'id'],
      ['user_preferences', 'user_id'],
      ['user_followed_companies', 'user_id'],
      ['user_bookmarks', 'user_id'],
    ] as const) {
      expect((await db.query(`select count(*)::int as n from public.${table} where ${col} = '${B}'`)).rows).toEqual([{ n: 0 }]);
    }
    expect((await db.query(`select count(*)::int as n from public.user_bookmarks where user_id = '${A}'`)).rows).toEqual([{ n: 1 }]);
  });
});
