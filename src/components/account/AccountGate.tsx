import type { ReactNode } from 'react';
import { useAccount } from '../../lib/account/AccountProvider';
import { useAccountText } from '../../lib/account/messages';
import { useI18n } from '../../lib/i18n';
import { href } from '../../lib/router';
import { Icon } from '../Icon';
import { EmptyState, ErrorState, Loading } from '../States';

/** Shown wherever an account screen is opened on a build without Supabase settings. */
export function NotConfigured() {
  const at = useAccountText();
  const { t } = useI18n();
  const { config } = useAccount();
  return (
    <div className="auth-notice" role="note" data-testid="auth-not-configured">
      <span className="auth-notice-icon" aria-hidden="true">
        <Icon name="lock" size={20} />
      </span>
      <div className="auth-notice-text">
        <p className="auth-notice-title">{at('not_configured_title')}</p>
        <p>{at('not_configured_body')}</p>
        {config.problems.length > 0 && (
          <p className="auth-notice-meta" dir="ltr">
            {at('not_configured_missing', { list: config.problems.join(', ') })}
          </p>
        )}
        <p>
          <a className="btn is-primary" href={href('/')}>
            {t('go_home')}
          </a>
        </p>
      </div>
    </div>
  );
}

/**
 * Wraps pages that need a signed-in reader. It never redirects on its own: visitors see why the
 * page needs an account and a way to sign in, while the rest of the site stays open.
 */
export function AccountGate({ next, children }: { next: string; children: ReactNode }) {
  const account = useAccount();
  const at = useAccountText();
  if (account.status === 'off') return <NotConfigured />;
  if (account.status === 'restoring') return <Loading rows={2} />;
  if (account.status === 'signed-out') {
    return (
      <EmptyState title={at('need_signin_title')}>
        <p>{at('need_signin_body')}</p>
        <a className="btn is-primary" href={href('/signin', { next })}>
          <Icon name="user" size={16} />
          {at('sign_in')}
        </a>
      </EmptyState>
    );
  }
  if (account.dataStatus === 'error') return <ErrorState onRetry={account.reload} />;
  if (!account.profile || !account.prefs) return <Loading rows={2} />;
  return <>{children}</>;
}
