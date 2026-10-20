import { formatDay, formatNumber } from '../lib/dates';
import { useI18n } from '../lib/i18n';
import type { Article } from '../lib/types';
import { EmptyState } from './States';
import { StoryCard } from './StoryCard';

/**
 * One day of news, newest first, set as an editorial page: the newest story leads, the next three
 * get image cards, and the rest form a structured two-column list. Reading order stays chronological.
 */
export function DaySection({
  day,
  label,
  articles,
  id,
  level = 2,
  emptyText,
}: {
  day: string;
  label?: string;
  articles: Article[];
  id?: string;
  level?: 2 | 3;
  emptyText?: string;
}) {
  const { t, locale } = useI18n();
  const hid = `day-${day}`;
  const H = `h${level}` as const;
  const cardLevel = level === 2 ? 3 : 4;
  const [lead, ...others] = articles;
  const cards = others.slice(0, 3);
  const list = others.slice(3);
  return (
    <section className="day-section" aria-labelledby={hid} id={id}>
      <header className="day-head">
        <H id={hid} className="day-title">
          {label ?? formatDay(day, locale, 'short')}
        </H>
        <p className="day-meta">
          <time dateTime={day}>{formatDay(day, locale)}</time>
          <span aria-hidden="true"> · </span>
          {formatNumber(articles.length, locale)} {articles.length === 1 ? t('story') : t('stories')}
        </p>
      </header>
      {!lead ? (
        <EmptyState title={emptyText ?? t('day_empty')} />
      ) : (
        <div className="day-body">
          <StoryCard article={lead} variant="lead" timeOnly headingLevel={cardLevel} />
          {cards.length > 0 && (
            <div className="story-grid">
              {cards.map((a) => (
                <StoryCard key={a.id} article={a} timeOnly headingLevel={cardLevel} />
              ))}
            </div>
          )}
          {list.length > 0 && (
            <div className="story-list">
              {list.map((a) => (
                <StoryCard key={a.id} article={a} variant="list" timeOnly headingLevel={cardLevel} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
