import { useState } from 'react';
import { useAccountText } from '../../lib/account/messages';
import { useMergeOffer } from '../../lib/account/saved';
import { formatNumber } from '../../lib/dates';
import { useI18n } from '../../lib/i18n';
import { Icon } from '../Icon';

/** Offers to copy this browser's bookmarks into the signed-in account. Nothing moves without a click. */
export function MergeOffer() {
  const { pending, accept, decline } = useMergeOffer();
  const at = useAccountText();
  const { locale } = useI18n();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (pending.length === 0) return null;
  return (
    <section className="merge-offer" aria-labelledby="merge-title" data-testid="merge-offer">
      <span className="nav-tile" data-tone="blue" aria-hidden="true">
        <Icon name="bookmark" size={18} />
      </span>
      <div className="merge-text">
        <h2 id="merge-title" className="merge-title">
          {at('merge_title', { n: formatNumber(pending.length, locale) })}
        </h2>
        <p>{at('merge_body')}</p>
        {failed && (
          <p className="form-error" role="alert">
            {at('err_save')}
          </p>
        )}
      </div>
      <div className="merge-actions">
        <button
          type="button"
          className="btn is-primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setFailed(false);
            try {
              await accept();
            } catch {
              setFailed(true);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? at('saving') : at('merge_go')}
        </button>
        <button type="button" className="btn is-dark" disabled={busy} onClick={decline}>
          {at('merge_skip')}
        </button>
      </div>
    </section>
  );
}
