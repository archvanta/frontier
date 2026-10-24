import { Icon } from '../components/Icon';
import { ScoreExplain } from '../components/ScoreExplain';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { StoryCard } from '../components/StoryCard';
import { useData } from '../lib/dataContext';
import { formatDateTime, formatNumber } from '../lib/dates';
import { useAsync } from '../lib/hooks';
import { pickWindowLabel, useI18n } from '../lib/i18n';
import { useSlidingIndicator } from '../lib/motion';
import { href } from '../lib/router';
import type { PickWindow } from '../lib/types';

export function PicksPage({ window: w }: { window: PickWindow }) {
  const data = useData();
  const { t, locale } = useI18n();
  const res = useAsync(() => data.picks(), [data]);
  const track = useSlidingIndicator<HTMLElement>(w);

  return (
    <div className="page container-narrow">
      <header className="page-head">
        <p className="eyebrow">{t('nav_picks')}</p>
        <h1 className="page-title">{pickWindowLabel(locale, w)}</h1>
        <nav ref={track} className="tabs is-links pill-track" aria-label={t('picks_window')}>
          {(['daily', 'weekly', 'monthly'] as const).map((x) => (
            <a key={x} className="tab" href={href(`/picks/${x}`)} aria-current={x === w ? 'page' : undefined}>
              {pickWindowLabel(locale, x)}
            </a>
          ))}
        </nav>
        <p className="page-intro">
          <Icon name="info" size={14} /> {t('picks_note')}
        </p>
      </header>
      {res.status === 'loading' && <Loading rows={2} />}
      {res.status === 'error' && <ErrorState onRetry={res.reload} />}
      {res.status === 'ready' &&
        (() => {
          const win = res.data?.windows[w];
          if (!win || win.picks.length === 0) return <EmptyState title={t('picks_empty')} />;
          return (
            <>
              <p className="window-range">
                {t('picks_window')}: <time dateTime={win.from}>{formatDateTime(win.from, locale)}</time> —{' '}
                <time dateTime={win.to}>{formatDateTime(win.to, locale)}</time>
              </p>
              <ol className="picks-ranked">
                {win.picks.map((p) => (
                  <li key={p.article.id} className="pick-item">
                    <StoryCard article={p.article} variant="grid" rank={p.rank} headingLevel={2} />
                    <div className="pick-why">
                      {p.article.score && <details className="score-details"><summary>{locale === 'fa' ? 'جزئیات امتیاز' : 'Score breakdown'} · {Math.round(p.article.score.total)}/100</summary><ScoreExplain score={p.article.score} weights={res.data?.weights} compact /></details>}
                      <p className="pick-sources">
                        {formatNumber(p.sources, locale)} {t('sources_count')}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          );
        })()}
    </div>
  );
}
