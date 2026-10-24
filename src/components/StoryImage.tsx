import { useCallback, useEffect, useRef, useState } from 'react';
import { safeUrl } from '../lib/article';
import { judgeCardImage, rememberCardFit, rememberedCardFit, type CardFit } from '../lib/imageFit';
import { useI18n } from '../lib/i18n';
import { iconArt } from '../lib/iconArt';
import type { Article, CategoryId } from '../lib/types';

const BASE = import.meta.env.BASE_URL;

export function assetUrl(path: string): string {
  return `${BASE}${path.replace(/^\/+/, '')}`;
}

export function fallbackFor(category: CategoryId): string {
  return iconArt(category);
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
  /** Called when the photo has been judged. `hide` means the photo is broken or tiny: the caller drops the whole media block. */
  onFit?: (fit: CardFit) => void;
}

/**
 * Fixed-ratio rounded frame that never collapses the grid; the photo fills it edge to edge (`object-fit: cover`, see `lib/imageFit.ts`).
 * A story with no image at all shows its category artwork; a photo that fails to load or is tiny is dropped (`onFit('hide')`).
 * Brand character art is labelled as an unofficial illustration.
 */
export function StoryImage({ article, className = '', eager = false, onFit }: Props) {
  const { t } = useI18n();
  const primary = article.image?.kind === 'fallback' ? null : resolveImageUrl(article.image?.url);
  const fallback = fallbackFor(article.category);
  const isBrand = article.image?.kind === 'brand';
  const [fit, setFit] = useState<CardFit>(() => (primary && !isBrand ? (rememberedCardFit(primary) ?? 'ok') : 'ok'));
  const img = useRef<HTMLImageElement>(null);
  const judged = primary && !isBrand;

  const decide = useCallback(
    (next: CardFit) => {
      if (primary) rememberCardFit(primary, next);
      setFit(next);
    },
    [primary],
  );

  useEffect(() => {
    if (fit === 'hide') onFit?.('hide');
  }, [fit, onFit]);

  // Cached images can finish loading before React attaches `onLoad`.
  useEffect(() => {
    const el = img.current;
    if (judged && el?.complete && el.naturalWidth > 0) decide(judgeCardImage({ width: el.naturalWidth, height: el.naturalHeight }));
  }, [judged, decide]);

  if (fit === 'hide') return null;
  const src = primary ?? fallback;
  const isFallback = !primary;

  return (
    <div
      className={`story-media ${isBrand ? `is-brand brand-${article.brand}` : ''} ${isFallback ? 'is-fallback' : ''} ${className}`}
      data-fallback-category={isFallback ? article.category : undefined}
    >
      <img
        ref={img}
        src={src}
        alt={isFallback ? '' : (article.image?.alt ?? '')}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={(e) => {
          if (judged) decide(judgeCardImage({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight }));
        }}
        onError={() => decide('hide')}
        width={640}
        height={360}
      />
      {isBrand && <span className="media-tag">{t('brand_art_note')}</span>}
    </div>
  );
}
