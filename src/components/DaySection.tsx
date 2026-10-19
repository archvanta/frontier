import { formatDay, formatNumber } from '../lib/dates';
import { useI18n } from '../lib/i18n';
import type { Article } from '../lib/types';
import { EmptyState } from './States';
import { StoryCard } from './StoryCard';

export function DaySection({ day, label, articles, id }: { day: string; label?: string; articles: Article[]; id?: string }) {
  const { t, locale } = useI18n();
  const hid = `day-${day}`;
  return (
    <section className="day-section" aria-labelledby={hid} id={id}>
      <header className="day-head">
        <h2 id={hid} className="day-title">
          {label ?? formatDay(day, locale, 'short')}
        </h2>
        <p className="day-meta">
          <time dateTime={day}>{formatDay(day, locale)}</time>
          <span aria-hidden="true"> · </span>
          {formatNumber(articles.length, locale)} {articles.length === 1 ? t('story') : t('stories')}
        </p>
      </header>
      {articles.length === 0 ? (
        <EmptyState title={t('day_empty')} />
      ) : (
        <div className="story-grid">
          {articles.map((a) => (
            <StoryCard key={a.id} article={a} timeOnly />
          ))}
        </div>
      )}
    </section>
  );
}
