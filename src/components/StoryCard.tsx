import { displayExcerpt, displayTitle, safeUrl, storyPath } from '../lib/article';
import { useBookmarks } from '../lib/bookmarks';
import { formatDateTime, formatTime } from '../lib/dates';
import { categoryLabel, useI18n } from '../lib/i18n';
import { href } from '../lib/router';
import type { Article } from '../lib/types';
import { Icon } from './Icon';
import { StoryImage } from './StoryImage';

interface Props {
  article: Article;
  variant?: 'grid' | 'feature' | 'row';
  /** Show only the time (inside a day section) instead of the full date. */
  timeOnly?: boolean;
  rank?: number;
  eagerImage?: boolean;
  headingLevel?: 2 | 3 | 4;
}

export function BookmarkButton({ article }: { article: Article }) {
  const { t } = useI18n();
  const { isSaved, toggle } = useBookmarks();
  const saved = isSaved(article.id);
  return (
    <button
      type="button"
      className={`icon-btn bookmark ${saved ? 'is-on' : ''}`}
      aria-pressed={saved}
      aria-label={saved ? t('unsave') : t('save')}
      title={saved ? t('unsave') : t('save')}
      onClick={() => toggle(article)}
    >
      <Icon name="bookmark" filled={saved} />
    </button>
  );
}

export function StoryCard({ article, variant = 'grid', timeOnly = false, rank, eagerImage, headingLevel = 3 }: Props) {
  const { t, locale } = useI18n();
  const title = displayTitle(article, locale);
  const excerpt = displayExcerpt(article, locale);
  const external = safeUrl(article.url);
  const H = `h${headingLevel}` as const;
  const when = timeOnly ? formatTime(article.publishedAt, locale) : formatDateTime(article.publishedAt, locale);
  const link = href(storyPath(article));

  return (
    <article className={`story-card is-${variant}`} data-testid="story-card" data-id={article.id}>
      {variant !== 'row' && (
        <a href={link} className="story-media-link" tabIndex={-1} aria-hidden="true">
          <StoryImage article={article} eager={eagerImage} />
        </a>
      )}
      <div className="story-body">
        <div className="story-kicker">
          {rank !== undefined && <span className="rank">{String(rank).padStart(2, '0')}</span>}
          <a className="chip" href={href('/explore', { c: article.category })}>
            {categoryLabel(locale, article.category)}
          </a>
          <span className="kicker-source">{article.sourceName}</span>
        </div>
        <H className="story-title" lang={title.lang} dir="auto">
          <a href={link}>{title.text}</a>
        </H>
        {title.translated && <span className="mt-label">{t('translation_machine')}</span>}
        {variant !== 'row' && excerpt.text && (
          <p className="story-excerpt" lang={excerpt.lang} dir="auto">
            {excerpt.text}
          </p>
        )}
        <div className="story-meta">
          <time dateTime={article.publishedAt} title={article.dateEstimated ? t('date_estimated') : `${t('published')}: ${formatDateTime(article.publishedAt, locale)}`}>
            {when}
            {article.dateEstimated && <span aria-hidden="true">*</span>}
          </time>
          {article.score && (
            <span className="score-pill" title={t('score')} aria-label={`${t('score')} ${article.score.total}`}>
              <span className="score-bar" style={{ inlineSize: `${Math.max(4, article.score.total)}%` }} />
              {Math.round(article.score.total)}
            </span>
          )}
          <span className="meta-spacer" />
          <BookmarkButton article={article} />
          {external && (
            <a className="icon-btn" href={external} target="_blank" rel="noopener noreferrer" aria-label={`${t('read_source')}: ${article.sourceName}`} title={t('read_source')}>
              <Icon name="external" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
