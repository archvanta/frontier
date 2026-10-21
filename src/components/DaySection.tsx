import { useState } from 'react';
import { formatDay, formatNumber } from '../lib/dates';
import { useI18n } from '../lib/i18n';
import { useReveal } from '../lib/motion';
import type { Article, SectionId } from '../lib/types';
import { EmptyState } from './States';
import { StoryCard } from './StoryCard';

const MORE_STEP = 24;

/**
 * One day of news, newest first, set as an editorial page: the newest story leads, the next three
 * get image cards, and the rest form a structured two-column list. Reading order stays chronological.
 * `listLimit` folds a long list of plain rows behind a "Show more" button.
 */
export function DaySection({
  day,
  label,
  articles,
  id,
  level = 2,
  emptyText,
  sectionOf,
  listLimit,
}: {
  day: string;
  label?: string;
  articles: Article[];
  id?: string;
  level?: 2 | 3;
  emptyText?: string;
  /** Story id to its curated section; those stories get a section label next to the category. */
  sectionOf?: ReadonlyMap<string, SectionId>;
  listLimit?: number;
}) {
  const { t, locale } = useI18n();
  const hid = `day-${day}`;
  const revealHead = useReveal<HTMLElement>('head');
  const H = `h${level}` as const;
  const cardLevel = level === 2 ? 3 : 4;
  const [shown, setShown] = useState(listLimit ?? Infinity);
  const [lead, ...others] = articles;
  const cards = others.slice(0, 3);
  const list = others.slice(3);
  const visible = list.slice(0, shown);
  return (
    <section className="day-section" aria-labelledby={hid} id={id}>
      <header ref={revealHead} className="day-head">
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
          <StoryCard article={lead} variant="lead" timeOnly headingLevel={cardLevel} section={sectionOf?.get(lead.id)} />
          {cards.length > 0 && (
            <div className="story-grid">
              {cards.map((a) => (
                <StoryCard key={a.id} article={a} timeOnly headingLevel={cardLevel} section={sectionOf?.get(a.id)} />
              ))}
            </div>
          )}
          {list.length > 0 && (
            <div className="story-list">
              {visible.map((a) => (
                <StoryCard key={a.id} article={a} variant="list" timeOnly headingLevel={cardLevel} section={sectionOf?.get(a.id)} />
              ))}
            </div>
          )}
          {list.length > visible.length && (
            <button type="button" className="btn show-more" onClick={() => setShown((n) => n + MORE_STEP)}>
              {t('show_more')}
              <span className="show-more-count">{formatNumber(list.length - visible.length, locale)}</span>
            </button>
          )}
        </div>
      )}
    </section>
  );
}
