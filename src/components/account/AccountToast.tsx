import { useEffect } from 'react';
import { useAccount } from '../../lib/account/AccountProvider';
import { useAccountText } from '../../lib/account/messages';
import { Icon } from '../Icon';

/** Short account notices (session expired, saved to account, sync failed). Announced politely, dismissed after a few seconds. */
export function AccountToast() {
  const { toast, dismissToast } = useAccount();
  const at = useAccountText();
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(dismissToast, 6000);
    return () => window.clearTimeout(id);
  }, [toast, dismissToast]);
  return (
    <div className="account-toast-region" role="status" aria-live="polite">
      {toast && (
        <div key={toast.id} className={`account-toast ${toast.tone === 'error' ? 'is-error' : ''}`}>
          <Icon name={toast.tone === 'error' ? 'info' : 'check'} size={16} />
          <span>{at(toast.key)}</span>
          <button type="button" className="icon-btn" onClick={dismissToast} aria-label={at('cancel')}>
            <Icon name="close" size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
