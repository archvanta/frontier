import { describe, expect, it } from 'vitest';
import { isSecretKey, resolveAccountConfig } from './config';
import { toAccountError } from './errors';
import { AccountError } from './types';

const jwt = (payload: object) => `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify(payload)).replace(/=+$/, '')}.sig`;

describe('account configuration', () => {
  it('is off without build variables, and says which are missing', () => {
    const cfg = resolveAccountConfig({}, 'live');
    expect(cfg.mode).toBe('off');
    expect(cfg.problems).toEqual(['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']);
  });

  it('turns on with a project URL and a publishable key', () => {
    const cfg = resolveAccountConfig(
      { VITE_SUPABASE_URL: 'https://abcd.supabase.co/', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x' },
      'live',
    );
    expect(cfg).toMatchObject({ mode: 'supabase', url: 'https://abcd.supabase.co', problems: [] });
  });

  it('refuses secret and service_role keys', () => {
    expect(isSecretKey('sb_secret_abc')).toBe(true);
    expect(isSecretKey(jwt({ role: 'service_role' }))).toBe(true);
    expect(isSecretKey(jwt({ role: 'anon' }))).toBe(false);
    expect(isSecretKey('sb_publishable_abc')).toBe(false);
    const cfg = resolveAccountConfig({ VITE_SUPABASE_URL: 'https://abcd.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abc' }, 'live');
    expect(cfg.mode).toBe('off');
  });

  it('rejects non-https project URLs', () => {
    expect(resolveAccountConfig({ VITE_SUPABASE_URL: 'http://abcd.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'k' }, 'live').mode).toBe('off');
  });

  it('uses the mock service in the mock build', () => {
    expect(resolveAccountConfig({}, 'mock').mode).toBe('mock');
  });
});

describe('auth error mapping', () => {
  const kind = (e: unknown) => toAccountError(e).kind;
  it('maps Supabase codes to generic kinds', () => {
    expect(kind({ name: 'AuthApiError', status: 400, code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe('invalid_credentials');
    expect(kind({ name: 'AuthApiError', status: 422, code: 'weak_password', message: 'Weak password' })).toBe('invalid_password');
    expect(kind({ name: 'AuthApiError', status: 429, code: 'over_request_rate_limit' })).toBe('rate_limited');
    expect(kind({ status: 429 })).toBe('rate_limited');
    expect(kind({ name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' })).toBe('network');
    expect(kind(new TypeError('Failed to fetch'))).toBe('network');
    expect(kind({ code: 'email_address_invalid' })).toBe('invalid_username');
    expect(kind({ code: 'signup_disabled' })).toBe('method_disabled');
    expect(kind({ code: '54000' })).toBe('limit_reached');
    expect(kind({ code: 'something_new' })).toBe('unknown');
  });
  it('keeps AccountErrors as they are', () => {
    const e = new AccountError('network');
    expect(toAccountError(e)).toBe(e);
  });
});
