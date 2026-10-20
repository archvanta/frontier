import { displayTitle, storyPath } from '../lib/article';
import { formatNumber } from '../lib/dates';
import { categoryLabel, useI18n } from '../lib/i18n';
import { href } from '../lib/router';
import type { PicksFile } from '../lib/types';
import { Icon } from './Icon';

/** Circular score gauge (0–100). Decorative ring; the number is the accessible value. */
export function ScoreRing({ value, size = 40 }: { value: number; size?: number }) {
  const { t, locale } = useI18n();
  const r = 16;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <span className="score-ring" style={{ inlineSize: size, blockSize: size }} title={t('score')}>
      <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
        <circle cx="20" cy="20" r={r} className="score-ring-track" />
        <circle cx="20" cy="20" r={r} className="score-ring-fill" strokeDasharray={`${(v / 100) * c} ${c}`} />
      </svg>
      <span className="score-ring-value">
        <span className="visually-hidden">{t('score')} </span>
        {formatNumber(Math.round(v), locale)}
      </span>
    </span>
  );
}

/** The week's highest-ranked stories as a compact numbered brief (real weekly picks). */
export function WeeklyBrief({ picks, limit = 5 }: { picks: PicksFile | null; limit?: number }) {
  const { t, locale } = useI18n();
  const entries = picks?.windows.weekly?.picks.slice(0, limit) ?? [];
  if (entries.length === 0) return null;
  return (
    <section className="brief" aria-labelledby="weekly-brief-h">
      <header className="brief-head">
        <span className="brief-icon" aria-hidden="true">
          <Icon name="calendar" size={18} />
        </span>
        <div>
          <h2 id="weekly-brief-h" className="brief-title">
            {t('weekly_brief')}
          </h2>
          <p className="brief-sub">{t('weekly_brief_sub')}</p>
        </div>
      </header>
      <ol className="brief-list">
        {entries.map((p) => {
          const title = displayTitle(p.article, locale);
          return (
            <li key={p.article.id} className="brief-item">
              <span className="brief-rank" aria-hidden="true">
                {formatNumber(p.rank, locale)}
              </span>
              <div className="brief-text">
                <h3 className="brief-story" lang={title.lang} dir="auto">
                  <a href={href(storyPath(p.article))}>{title.text}</a>
                </h3>
                <p className="brief-meta">
                  {categoryLabel(locale, p.article.category)} · {p.article.sourceName}
                </p>
              </div>
              {p.article.score && <ScoreRing value={p.article.score.total} />}
            </li>
          );
        })}
      </ol>
      <a className="section-link brief-link" href={href('/picks/weekly')}>
        {t('view_all')} <Icon name="arrow" size={14} directional />
      </a>
    </section>
  );
}
