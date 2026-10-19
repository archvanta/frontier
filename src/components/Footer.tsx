import { formatDateTime } from '../lib/dates';
import { useI18n } from '../lib/i18n';
import { href } from '../lib/router';
import type { Meta } from '../lib/types';

export function LastUpdate({ meta }: { meta: Meta | null | undefined }) {
  const { t, locale } = useI18n();
  return (
    <p className="last-update" data-testid="last-update">
      <span className="live-dot" aria-hidden="true" />
      {meta?.dataUpdatedAt ? (
        <>
          {t('last_update')}: <time dateTime={meta.dataUpdatedAt}>{formatDateTime(meta.dataUpdatedAt, locale)}</time>
        </>
      ) : (
        t('never_updated')
      )}
    </p>
  );
}

export function Footer({ meta }: { meta: Meta | null | undefined }) {
  const { t } = useI18n();
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <p className="footer-brand" lang="en" dir="ltr">
            SIGNAL<span>AI</span>
          </p>
          <p className="footer-note">{t('footer_note')}</p>
          <p className="footer-note">{t('footer_cost')}</p>
        </div>
        <div className="footer-meta">
          <LastUpdate meta={meta} />
          <p className="footer-note">{t('times_local')}</p>
          <ul className="footer-links">
            <li>
              <a href={href('/sources')}>{t('nav_sources')}</a>
            </li>
            <li>
              <a href={href('/about')}>{t('nav_about')}</a>
            </li>
            <li>
              <a href={href('/archive')}>{t('nav_archive')}</a>
            </li>
            <li>
              <a href="https://github.com/sadeghimohammadamin83-ship-it/SIGNAL_AI" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
