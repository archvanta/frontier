import { formatNumber } from '../lib/dates';
import { useI18n } from '../lib/i18n';
import { href } from '../lib/router';
import type { Meta } from '../lib/types';
import { LastUpdate } from './Footer';
import { Icon } from './Icon';

export function SignalStatus({ meta, todayCount }: { meta: Meta | null; todayCount: number | null }) {
  const { t, locale } = useI18n();
  const n = (v: number | null | undefined) => (v === null || v === undefined ? '—' : formatNumber(v, locale));
  return (
    <section className="signal-status" aria-label={t('signal_status')}>
      <p className="status-label">{t('signal_status')}</p>
      <dl className="status-grid">
        <div>
          <dt>{t('today')}</dt>
          <dd>{n(todayCount)}</dd>
        </div>
        <div>
          <dt>{t('stories')}</dt>
          <dd>{n(meta?.articleCount)}</dd>
        </div>
        <div>
          <dt>{t('nav_sources')}</dt>
          <dd>
            {n(meta?.sourcesOk)}
            {meta && meta.sourcesFailed > 0 && (
              <a className="status-warn" href={href('/sources')}>
                {n(meta.sourcesFailed)} {t('status_error')}
              </a>
            )}
          </dd>
        </div>
        <div>
          <dt>{t('nav_archive')}</dt>
          <dd>{n(meta?.dayCount)}</dd>
        </div>
      </dl>
      <LastUpdate meta={meta} />
      <p className="status-tz">{t('times_local')}</p>
      <div className="status-links">
        {(['daily', 'weekly', 'monthly'] as const).map((w) => (
          <a key={w} href={href(`/picks/${w}`)}>
            {t(`picks_${w}`)} <Icon name="arrow" size={14} directional />
          </a>
        ))}
      </div>
    </section>
  );
}
