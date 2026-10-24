import { AccountError, type AccountErrorKind } from './types';

const RATE_LIMIT = new Set(['over_request_rate_limit']);
const DISABLED = new Set(['email_provider_disabled', 'provider_disabled', 'signup_disabled']);

interface ErrorLike {
  name?: unknown;
  status?: unknown;
  code?: unknown;
  message?: unknown;
}

/**
 * Turns a Supabase Auth / PostgREST / fetch failure into one of a few user-facing kinds. Messages
 * stay generic on purpose: nothing says whether an account exists for an address.
 */
export function toAccountError(err: unknown): AccountError {
  if (err instanceof AccountError) return err;
  const e = (err && typeof err === 'object' ? err : {}) as ErrorLike;
  const name = String(e.name ?? '');
  const code = String(e.code ?? '');
  const status = typeof e.status === 'number' ? e.status : 0;
  const message = String(e.message ?? err ?? '');
  let kind: AccountErrorKind = 'unknown';
  if (name === 'AuthRetryableFetchError' || (err instanceof TypeError && /fetch|network/i.test(message)) || /Failed to fetch|NetworkError|Load failed/i.test(message)) {
    kind = 'network';
  } else if (RATE_LIMIT.has(code) || status === 429) {
    kind = 'rate_limited';
  } else if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) {
    kind = 'invalid_credentials';
  } else if (code === 'weak_password' || /password should be at least|weak password/i.test(message)) {
    kind = 'invalid_password';
  } else if (code === 'user_already_exists' || /already registered|already exists/i.test(message)) {
    kind = 'username_taken';
  } else if (code === 'email_address_invalid' || (code === 'validation_failed' && /email/i.test(message))) {
    kind = 'invalid_username';
  } else if (DISABLED.has(code)) {
    kind = 'method_disabled';
  } else if (name === 'AuthSessionMissingError' || code === 'session_not_found' || code === 'PGRST301' || status === 401) {
    kind = 'not_signed_in';
  } else if (code === '54000') {
    kind = 'limit_reached';
  }
  return new AccountError(kind, message);
}
