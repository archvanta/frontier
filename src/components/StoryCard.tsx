import { displayExcerpt, displayTitle, safeUrl, storyPath } from '../lib/article';
import { useCallback, useState } from 'react';
import { useSavedStories } from '../lib/account/saved';
import { formatDateTime, formatTime } from '../lib/dates';
import { categoryLabel, useI18n } from '../lib/i18n';
import { rememberedCardFit, type CardFit } from '../lib/imageFit';
import { href } from '../lib/router';
import { categoryIcon, toneFor } from '../lib/tones';
import type { Article } from '../lib/types';
import { Icon } from './Icon';
import { StoryImage, resolveImageUrl } from './StoryImage';

/**
 * Variants. The first four are gradient cards (tone follows the category, white type, the story's real image as the preview):
 * - feature: large card, muted label over a big title, image bleeding off the bottom (Top Signals #1)
 * - split:   secondary card, copy beside the image (Top Signals #2–3)
 * - lead:    first story of a day, wide horizontal card
 * - grid:    three-up card: icon tile and "Read" pill, title, two-line excerpt, divider, image
 * - list:    open feed row with a small thumbnail
 * - row:     text-only ranked row
 */
export type StoryVariant = 'feature' | 'split' | 'lead' | 'grid' | 'list' | 'row';

interface Props {
  article: Article;
  variant?: StoryVariant;
  /** Show only the time (inside a day section) instead of the full date. */
  timeOnly?: boolean;
  rank?: number;
  eagerImage?: boolean;
  headingLevel?: 2 | 3 | 4;
}

export function BookmarkButton({ article }: { article: Article }) {
  const { t } = useI18n();
  const { isSaved, toggle } = useSavedStories();
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

/** Small first-letter mark next to a source name (no third-party favicons are fetched). */
export function SourceMark({ name }: { name: string }) {
  const letter = Array.from(name.replace(/^the\s+/i, '').trim())[0] ?? '·';
  return (
    <span className="src-mark" aria-hidden="true">
      {letter.toUpperCase()}
    </span>
  );
}

const WITH_EXCERPT: StoryVariant[] = ['feature', 'split', 'lead', 'grid', 'list'];

export function StoryCard({ article, variant = 'grid', timeOnly = false, rank, eagerImage, headingLevel = 3 }: Props) {
  const { t, locale } = useI18n();
  // A broken or tiny photo is dropped, and the text then takes the full card.
  const [noPhoto, setNoPhoto] = useState(() => {
    const url = resolveImageUrl(article.image?.url);
    return Boolean(url) && rememberedCardFit(url!) === 'hide';
  });
  const onFit = useCallback((fit: CardFit) => setNoPhoto(fit === 'hide'), []);
  const title = displayTitle(article, locale);
  const excerpt = displayExcerpt(article, locale);
  const external = safeUrl(article.url);
  const H = `h${headingLevel}` as const;
  const when = timeOnly ? formatTime(article.publishedAt, locale) : formatDateTime(article.publishedAt, locale);
  const link = href(storyPath(article));
  const rankLabel = rank !== undefined ? String(rank).padStart(2, '0') : null;
  const gradient = variant === 'feature' || variant === 'split' || variant === 'lead' || variant === 'grid';
  // Dense list rows carry the category as quiet text, ranked rows as a chip, gradient cards as a muted label above the title.
  const catLink = (
    <a className={variant === 'row' ? 'chip' : 'kicker-cat'} href={href('/explore', { c: article.category })}>
      {categoryLabel(locale, article.category)}
    </a>
  );
  const source = (
    <span className="kicker-source">
      <SourceMark name={article.sourceName} />
      {article.sourceName}
    </span>
  );
  const media = variant !== 'row' && !noPhoto && (
    <div className="story-media-wrap">
      <a href={link} className="story-media-link" tabIndex={-1} aria-hidden="true">
        <StoryImage article={article} eager={eagerImage} onFit={onFit} />
      </a>
    </div>
  );
  const mediaFirst = variant === 'lead' || variant === 'list';

  return (
    <article
      className={`story-card is-${variant} ${noPhoto && variant !== 'row' ? 'is-text-only' : ''}`}
      data-testid="story-card"
      data-id={article.id}
      data-tone={gradient ? toneFor(article.category) : undefined}
    >
      {mediaFirst && media}
      <div className="story-body">
        {variant === 'grid' && (
          <div className="story-top">
            <span className="story-tile" aria-hidden="true">
              <Icon name={categoryIcon(article.category)} size={22} />
            </span>
            <span className="story-pill" aria-hidden="true">
              {t('card_read')}
            </span>
          </div>
        )}
        <div className="story-kicker">
          {rankLabel && (
            <span className="rank">
              <span className="visually-hidden">{t('pick_rank')} </span>
              {rankLabel}
            </span>
          )}
          {catLink}
          {!gradient && source}
        </div>
        <H className="story-title" lang={title.lang} dir="auto">
          <a href={link}>{title.text}</a>
        </H>
        {title.translated && <span className="mt-label">{t('translation_machine')}</span>}
        {WITH_EXCERPT.includes(variant) && excerpt.text && (
          <p className="story-excerpt" lang={excerpt.lang} dir="auto">
            {excerpt.text}
          </p>
        )}
        <div className="story-meta">
          {gradient && source}
          <time
            dateTime={article.publishedAt}
            title={article.dateEstimated ? t('date_estimated') : `${t('published')}: ${formatDateTime(article.publishedAt, locale)}`}
          >
            <Icon name="clock" size={13} />
            {when}
            {article.dateEstimated && <span aria-hidden="true">*</span>}
          </time>
          {article.score && (
            <span className="score-pill" title={t('score')} aria-label={`${t('score')} ${Math.round(article.score.total)}`}>
              <span className="score-bar" style={{ inlineSize: `${Math.max(4, article.score.total)}%` }} />
              {Math.round(article.score.total)}
            </span>
          )}
          <span className="meta-spacer" />
          <BookmarkButton article={article} />
          {external && (
            <a
              className="icon-btn"
              href={external}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${t('read_source')}: ${article.sourceName}`}
              title={t('read_source')}
            >
              <Icon name="external" />
            </a>
          )}
        </div>
      </div>
      {!mediaFirst && media}
    </article>
  );
}
