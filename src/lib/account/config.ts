import { DATA_MODE } from '../data';

/**
 * Account settings come from build-time variables (GitHub Actions *variables*, not secrets — both
 * values are public by design and end up in the browser bundle):
 *   VITE_SUPABASE_URL              https://<project-ref>.supabase.co
 *   VITE_SUPABASE_PUBLISHABLE_KEY  sb_publishable_… (or the legacy anon key)
 * Without them the site still works; account screens explain that sign-in is not set up yet.
 * The mock build uses an in-browser mock service so tests never need a network.
 */
export type AccountMode = 'supabase' | 'mock' | 'off';

export interface AccountConfig {
  mode: AccountMode;
  url: string;
  key: string;
  /** Names of the variables that are missing or unusable (empty when ready). */
  problems: string[];
}
/** True for keys that must never reach a browser: new secret keys and legacy service_role JWTs. */
export function isSecretKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true;
  const parts = key.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/'))) as { role?: unknown };
    return payload.role === 'service_role';
  } catch {
    return false;
  }
}

export function resolveAccountConfig(env: Record<string, string | boolean | undefined>, dataMode: 'mock' | 'live'): AccountConfig {
  const url = String(env.VITE_SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
  const key = String(env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim();
  if (dataMode === 'mock') return { mode: 'mock', url: '', key: '', problems: [] };
  if (env.VITE_ACCOUNTS_ENABLED === 'false') return { mode: 'off', url, key, problems: [] };
  const problems: string[] = [];
  if (!/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(url)) problems.push('VITE_SUPABASE_URL');
  if (!key) problems.push('VITE_SUPABASE_PUBLISHABLE_KEY');
  else if (isSecretKey(key)) problems.push('VITE_SUPABASE_PUBLISHABLE_KEY (a secret key was supplied; use the publishable key)');
  return { mode: problems.length ? 'off' : 'supabase', url, key, problems };
}

export const ACCOUNT_CONFIG: AccountConfig = resolveAccountConfig(import.meta.env, DATA_MODE);

/** localStorage key that holds the Supabase session (set explicitly so we can check it without loading the SDK). */
export const SESSION_STORAGE_KEY = 'signal-ai:auth';
/** Lowercase account handles; deliberately ASCII so the internal auth alias is stable. */
export const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,23}$/;
/** Where the mock service keeps its signed-in email. */
export const MOCK_SESSION_KEY = 'signal-ai:mock-session:v1';

/** True when this browser may hold a session, so restoring is worth loading the SDK for. */
export function mayHaveSession(mode: AccountMode): boolean {
  if (mode === 'off') return false;
  try {
    if (mode === 'mock') return !!window.localStorage.getItem(MOCK_SESSION_KEY) && window.localStorage.getItem(MOCK_SESSION_KEY) !== 'null';
    return !!window.localStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return false;
  }
}
