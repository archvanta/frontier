import { resolveImageUrl } from '../components/StoryImage';
import type { Article, ArticleImage, PicksFile } from './types';

/** Slides in the homepage carousel. */
export const HERO_MAX = 6;
/** Below this many stories with a genuine image, stories with category artwork fill the carousel up to HERO_MIN. */
export const HERO_MIN = 3;

/**
 * The genuine source image of a story, or null when it only has generated category art.
 * Brand character art (when enabled) is never used here: the hero shows the story's own image.
 */
export function genuineImage(a: Pick<Article, 'image' | 'sourceImage'>): ArticleImage | null {
  const img = a.image?.kind === 'brand' ? a.sourceImage : a.image;
  if (!img || img.kind === 'fallback' || img.kind === 'brand') return null;
  return resolveImageUrl(img.url) ? img : null;
}

/**
 * Chooses the carousel stories from data the page already loaded; nothing is invented.
 * Order: today's top-ranked picks first (the most important story opens the page), then the newest stories.
 * Only stories with a genuine feed/og image qualify, unless fewer than HERO_MIN do.
 * `preferred` (stories on followed topics) moves those stories to the front before that choice.
 */
export function pickHeroStories(newestFirst: readonly Article[], picks: PicksFile | null, max = HERO_MAX, preferred?: (a: Article) => boolean): Article[] {
  const ranked = (picks?.windows.daily.picks ?? [])
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .map((p) => p.article);
  let ordered: Article[] = [];
  const seen = new Set<string>();
  for (const a of [...ranked, ...newestFirst]) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    ordered.push(a);
  }
  // Stories on topics the reader follows come first (each group keeps its order).
  if (preferred) ordered = [...ordered.filter(preferred), ...ordered.filter((a) => !preferred(a))];
  const withImage = ordered.filter((a) => genuineImage(a)).slice(0, max);
  if (withImage.length >= HERO_MIN) return withImage;
  const chosen = new Set(withImage.map((a) => a.id));
  const filler = ordered.filter((a) => !chosen.has(a.id)).slice(0, HERO_MIN - withImage.length);
  return [...withImage, ...filler];
}
