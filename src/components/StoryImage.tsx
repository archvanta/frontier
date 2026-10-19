import { useState } from 'react';
import { safeUrl } from '../lib/article';
import { useI18n } from '../lib/i18n';
import type { Article, CategoryId } from '../lib/types';

const BASE = import.meta.env.BASE_URL;

export function assetUrl(path: string): string {
  return `${BASE}${path.replace(/^\/+/, '')}`;
}

export function fallbackFor(category: CategoryId): string {
  return assetUrl(`images/fallbacks/${category}.svg`);
}

/** Resolves stored image URLs: external http(s) as-is, repo-relative paths against the site base. */
export function resolveImageUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return safeUrl(url);
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return null; // data:, javascript:, …
  return assetUrl(url);
}

interface Props {
  article: Pick<Article, 'image' | 'category' | 'brand' | 'title'>;
  className?: string;
  eager?: boolean;
  sizes?: string;
}

/**
 * Fixed-ratio image box. Never collapses the grid: a broken or blocked source image swaps to the
 * category artwork. Brand character art is labelled as an unofficial illustration.
 */
export function StoryImage({ article, className = '', eager = false }: Props) {
  const { t } = useI18n();
  const primary = resolveImageUrl(article.image?.url);
  const fallback = fallbackFor(article.category);
  const [failed, setFailed] = useState(false);
  const src = !primary || failed ? fallback : primary;
  const isBrand = article.image?.kind === 'brand' && !failed;
  const isFallback = src === fallback;

  return (
    <div className={`story-media ${isBrand ? `is-brand brand-${article.brand}` : ''} ${isFallback ? 'is-fallback' : ''} ${className}`}>
      <img
        src={src}
        alt={isFallback ? '' : (article.image?.alt ?? '')}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        width={640}
        height={360}
      />
      {isBrand && <span className="media-tag">{t('brand_art_note')}</span>}
    </div>
  );
}
