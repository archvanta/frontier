import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { NotConfigured } from '../../components/account/AccountGate';
import { Icon } from '../../components/Icon';
import { destinationFor, safeNext, useAccount } from '../../lib/account/AccountProvider';
import { USERNAME_RE } from '../../lib/account/config';
import { toAccountError } from '../../lib/account/errors';
import { errorMessageKey, useAccountText, type AccountMessageKey } from '../../lib/account/messages';
import { href, navigate } from '../../lib/router';

const MIN_PASSWORD_LENGTH = 8;

export function SignInPage({ create, next }: { create: boolean; next: string | null }) {
  const account = useAccount();
  const at = useAccountText();
  const uid = useId();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AccountMessageKey | null>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const target = safeNext(next) ?? undefined;
  const { prepare } = account;

  useEffect(() => prepare(), [prepare]);

  const signedIn = account.status === 'signed-in' && account.profile !== null;
  useEffect(() => {
    if (signedIn && !busy) navigate(destinationFor(account.profile, target), undefined, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  if (account.status === 'off') {
    return <div className="auth-stage"><NotConfigured /></div>;
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const handle = username.trim().toLowerCase();
    setError(null);
    if (!USERNAME_RE.test(handle)) {
      setError('err_invalid_username');
      usernameRef.current?.focus();
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError('err_invalid_password');
      return;
    }
    setBusy(true);
    try {
      const destination = create ? await account.signUp(handle, password, target) : await account.signIn(handle, password, target);
      navigate(destination);
    } catch (err) {
      setError(errorMessageKey(toAccountError(err).kind));
    } finally {
      setBusy(false);
    }
  };

  const errId = `${uid}-err`;
  const passwordHelp = `${uid}-password-help`;

  return (
    <div className="auth-stage">
      <section className="auth-card" aria-labelledby={`${uid}-title`} data-testid="auth-card">
        <span className="auth-logo" aria-hidden="true"><Icon name="signal" size={26} /></span>
        <h1 id={`${uid}-title`} className="auth-title">{create ? at('create_title') : at('signin_title')}</h1>
        <p className="auth-sub">{create ? at('create_sub') : at('signin_sub')}</p>
        <form className="auth-form" noValidate onSubmit={(e) => void submit(e)}>
          <label className="auth-label" htmlFor={`${uid}-username`}>{at('username_label')}</label>
          <input
            ref={usernameRef}
            id={`${uid}-username`}
            className="auth-input"
            type="text"
            autoComplete="username"
            dir="ltr"
            required
            minLength={3}
            maxLength={24}
            spellCheck={false}
            placeholder={at('username_placeholder')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            aria-invalid={error === 'err_invalid_username' || undefined}
            aria-describedby={error ? errId : undefined}
          />
          <label className="auth-label" htmlFor={`${uid}-password`}>{at('password_label')}</label>
          <div className="auth-password-wrap">
            <input
              id={`${uid}-password`}
              className="auth-input"
              type={showPassword ? 'text' : 'password'}
              autoComplete={create ? 'new-password' : 'current-password'}
              dir="ltr"
              required
              minLength={MIN_PASSWORD_LENGTH}
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={error === 'err_invalid_password' || error === 'err_invalid_credentials' || undefined}
              aria-describedby={[passwordHelp, error ? errId : ''].filter(Boolean).join(' ')}
            />
            <button type="button" className="link-btn auth-password-toggle" onClick={() => setShowPassword((v) => !v)}>
              {showPassword ? at('password_hide') : at('password_show')}
            </button>
          </div>
          <p id={passwordHelp} className="field-help">{at(create ? 'password_help_create' : 'password_help_signin')}</p>
          {error && <p id={errId} className="form-error" role="alert">{at(error)}</p>}
          <button type="submit" className="btn is-primary auth-submit" disabled={busy} aria-busy={busy}>
            {busy ? at('auth_working') : at(create ? 'create_submit' : 'signin_submit')}
          </button>
        </form>
        <p className="auth-switch">
          {create ? at('have_account') : at('no_account')}{' '}
          <a href={href('/signin', { mode: create ? undefined : 'create', next: target })}>{create ? at('signin_link') : at('create_link')}</a>
        </p>
        {account.mode === 'mock' && <p className="auth-mock" role="note">{at('mock_note')}</p>}
      </section>
      <div className="auth-after">
        <p><Icon name="lock" size={14} /> {at('privacy_short')} <a href={href('/privacy')}>{at('privacy_link')}</a></p>
        <p>{at('recovery_note')}</p>
      </div>
    </div>
  );
}
