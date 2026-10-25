import { formatDateTime } from '../lib/dates';
import { useI18n } from '../lib/i18n';
import { href } from '../lib/router';
import { PORTFOLIO_URL, REPO_URL } from '../lib/site';
import type { Meta } from '../lib/types';
import { BrandMark } from './Header';
import { Icon, type IconName } from './Icon';

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
  const features: { icon: IconName; label: string }[] = [
    { icon: 'globe', label: t('feat_sources') },
    { icon: 'clock', label: t('feat_hourly') },
    { icon: 'shield', label: t('feat_nopaid') },
  ];
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <p className="footer-brand" lang="en" dir="ltr">
            <span className="footer-glyph" aria-hidden="true">
              <BrandMark size={22} />
            </span>
            <span className="footer-name">FRONTIER</span>
          </p>
          <ul className="footer-features">
            {features.map((f) => (
              <li key={f.icon}>
                <Icon name={f.icon} size={16} /> {f.label}
              </li>
            ))}
            <li dir="ltr">
              <span lang="fa">فا</span> / <span lang="en">EN</span>
            </li>
          </ul>
        </div>
        <div className="footer-grid">
          <div>
            <p className="footer-note">{t('footer_note')}</p>
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
                <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>
              </li>
              <li>
                <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer">
                  {t('footer_creator')}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
