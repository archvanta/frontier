import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { NotConfigured } from '../../components/account/AccountGate';
import { OtpInput } from '../../components/account/OtpInput';
import { Icon } from '../../components/Icon';
import { destinationFor, safeNext, useAccount } from '../../lib/account/AccountProvider';
import { CODE_LENGTH, CODE_TTL_S, MOCK_CODE, RESEND_COOLDOWN_S } from '../../lib/account/config';
import { toAccountError } from '../../lib/account/errors';
import { errorMessageKey, useAccountText, type AccountMessageKey } from '../../lib/account/messages';
import { formatNumber } from '../../lib/dates';
import { useI18n } from '../../lib/i18n';
import { href, navigate } from '../../lib/router';

const PENDING_KEY = 'signal-ai:otp-pending';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface Pending {
  email: string;
  sentAt: number;
}

/** The address and send time survive a reload of the code screen (sessionStorage only: never the code). */
function readPending(): Pending | null {
  try {
    const v = JSON.parse(window.sessionStorage.getItem(PENDING_KEY) ?? 'null') as Pending | null;
    return v && typeof v.email === 'string' && typeof v.sentAt === 'number' ? v : null;
  } catch {
    return null;
  }
}

function writePending(p: Pending | null) {
  try {
    if (p) window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(p));
    else window.sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* storage blocked: the code step lasts for this view */
  }
}

/** Shows "f•••@gmail.com" so a shoulder-surfer does not read the whole address. */
export function maskEmail(email: string): string {
  const [user = '', domain = ''] = email.split('@');
  if (!domain) return email;
  return `${user.slice(0, 1)}${'•'.repeat(Math.max(1, Math.min(4, user.length - 1)))}@${domain}`;
}

function useSecondsLeft(sentAt: number | null, total: number): number {
  const [now, setNow] = useState(() => Date.now());
  const left = sentAt === null ? 0 : Math.max(0, Math.ceil(total - (now - sentAt) / 1000));
  useEffect(() => {
    if (left <= 0) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [left]);
  return left;
}

function GoogleMark() {
  return (
    <svg className="google-mark" width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export function SignInPage({ create, next }: { create: boolean; next: string | null }) {
  const account = useAccount();
  const at = useAccountText();
  const { locale } = useI18n();
  const uid = useId();
  const [pending, setPending] = useState<Pending | null>(() => readPending());
  const [email, setEmail] = useState(() => pending?.email ?? '');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'send' | 'verify' | 'google' | null>(null);
  const [error, setError] = useState<AccountMessageKey | null>(null);
  const [info, setInfo] = useState<AccountMessageKey | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const cooldown = useSecondsLeft(pending?.sentAt ?? null, RESEND_COOLDOWN_S);
  const target = safeNext(next) ?? undefined;
  const { prepare } = account;

  useEffect(() => prepare(), [prepare]);

  // Already signed in (another tab, or a restored session): go where the reader was heading.
  const signedIn = account.status === 'signed-in' && account.profile !== null;
  useEffect(() => {
    if (signedIn && busy === null) navigate(destinationFor(account.profile, target), undefined, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  if (account.status === 'off') {
    return (
      <div className="auth-stage">
        <NotConfigured />
      </div>
    );
  }

  const fail = (err: unknown) => {
    const e = toAccountError(err);
    if (e.kind === 'invalid_code' && pending && Date.now() - pending.sentAt > CODE_TTL_S * 1000) setError('err_expired_code');
    else setError(errorMessageKey(e.kind));
  };

  const send = async (resend = false) => {
    const addr = email.trim().toLowerCase();
    setError(null);
    setInfo(null);
    if (!EMAIL_RE.test(addr)) {
      setError('err_invalid_email');
      emailRef.current?.focus();
      return;
    }
    setBusy('send');
    try {
      await account.requestCode(addr);
      const p = { email: addr, sentAt: Date.now() };
      writePending(p);
      setPending(p);
      setCode('');
      if (resend) setInfo('code_sent');
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  };

  const verify = async (value = code) => {
    if (!pending) return;
    setError(null);
    setInfo(null);
    if (value.length !== CODE_LENGTH) {
      setError('err_code_length');
      return;
    }
    setBusy('verify');
    try {
      const dest = await account.verifyCode(pending.email, value, target);
      writePending(null);
      setInfo('verified');
      navigate(dest);
    } catch (err) {
      fail(err);
      setCode('');
    } finally {
      setBusy(null);
    }
  };

  const google = async () => {
    setError(null);
    setBusy('google');
    try {
      await account.signInWithGoogle(target);
    } catch (err) {
      fail(err);
      setBusy(null);
    }
  };

  const editEmail = () => {
    writePending(null);
    setPending(null);
    setCode('');
    setError(null);
    setInfo(null);
    window.setTimeout(() => emailRef.current?.focus(), 0);
  };

  const errId = `${uid}-err`;
  const helpId = `${uid}-help`;
  const mmss = (s: number) => `${formatNumber(Math.floor(s / 60), locale)}:${formatNumber(s % 60, locale).padStart(2, formatNumber(0, locale))}`;

  return (
    <div className="auth-stage">
      <section className="auth-card" aria-labelledby={`${uid}-title`} data-testid="auth-card">
        <span className="auth-logo" aria-hidden="true">
          <Icon name={pending ? 'mail' : 'signal'} size={26} />
        </span>
        {!pending ? (
          <>
            <h1 id={`${uid}-title`} className="auth-title">
              {create ? at('create_title') : at('signin_title')}
            </h1>
            <p className="auth-sub">{at('signin_sub')}</p>
            <form
              className="auth-form"
              noValidate
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                void send();
              }}
            >
              <label className="auth-label" htmlFor={`${uid}-email`}>
                {at('email_label')}
              </label>
              <input
                ref={emailRef}
                id={`${uid}-email`}
                className="auth-input"
                type="email"
                inputMode="email"
                autoComplete="email"
                dir="ltr"
                required
                maxLength={254}
                placeholder={at('email_placeholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={error === 'err_invalid_email' || undefined}
                aria-describedby={error ? errId : undefined}
              />
              {error && (
                <p id={errId} className="form-error" role="alert">
                  {at(error)}
                </p>
              )}
              <button type="submit" className="btn is-primary auth-submit" disabled={busy !== null} aria-busy={busy === 'send'}>
                {busy === 'send' ? at('sending') : at('send_code')}
              </button>
            </form>
            {account.googleEnabled && (
              <>
                <p className="auth-or">
                  <span>{at('or')}</span>
                </p>
                <button type="button" className="btn is-dark auth-google" onClick={google} disabled={busy !== null} aria-describedby={`${uid}-gnote`}>
                  <GoogleMark />
                  {at('google')}
                </button>
                <p id={`${uid}-gnote`} className="auth-fine">
                  {at('google_note')}
                </p>
              </>
            )}
            <p className="auth-switch">
              {create ? at('have_account') : at('no_account')}{' '}
              <a href={href('/signin', { mode: create ? undefined : 'create', next: target })}>{create ? at('signin_link') : at('create_link')}</a>
            </p>
          </>
        ) : (
          <>
            <h1 id={`${uid}-title`} className="auth-title">
              {at('verify_title')}
            </h1>
            <p className="auth-sub">
              {at('verify_sub', { email: '⁨' + maskEmail(pending.email) + '⁩' })}{' '}
              <button type="button" className="link-btn" onClick={editEmail}>
                {at('change_email')}
              </button>
            </p>
            <form
              className="auth-form"
              noValidate
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                void verify();
              }}
            >
              <label className="auth-label" htmlFor={`${uid}-code`}>
                {at('code_label')}
              </label>
              <OtpInput
                id={`${uid}-code`}
                value={code}
                onChange={(v) => {
                  setCode(v);
                  if (error) setError(null);
                }}
                onComplete={(v) => void verify(v)}
                label={at('code_label')}
                describedBy={[error ? errId : '', helpId].filter(Boolean).join(' ')}
                invalid={error === 'err_invalid_code' || error === 'err_expired_code'}
                disabled={busy === 'verify'}
              />
              {error && (
                <p id={errId} className="form-error" role="alert">
                  {at(error)}
                </p>
              )}
              {info && (
                <p className="form-info" role="status">
                  {at(info)}
                </p>
              )}
              <button type="submit" className="btn is-primary auth-submit" disabled={busy !== null} aria-busy={busy === 'verify'}>
                {busy === 'verify' ? at('verifying') : at('verify')}
              </button>
            </form>
            <p className="auth-resend">
              {cooldown > 0 ? (
                <span aria-live="off">{at('resend_in', { s: mmss(cooldown) })}</span>
              ) : (
                <button type="button" className="link-btn" onClick={() => void send(true)} disabled={busy !== null}>
                  {at('resend')}
                </button>
              )}
            </p>
            <p id={helpId} className="auth-fine">
              {at('code_help', { m: formatNumber(CODE_TTL_S / 60, locale) })}
            </p>
          </>
        )}
        {account.mode === 'mock' && (
          <p className="auth-mock" role="note">
            {at('mock_note', { code: MOCK_CODE })}
          </p>
        )}
      </section>
      <div className="auth-after">
        <p>
          <Icon name="lock" size={14} /> {at('privacy_short')} <a href={href('/privacy')}>{at('privacy_link')}</a>
        </p>
        {!pending && <p>{at('recovery_note')}</p>}
      </div>
    </div>
  );
}
