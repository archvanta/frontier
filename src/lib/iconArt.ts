import type { CategoryId } from './types';

export type IconArtId =
  | CategoryId
  | 'archive'
  | 'sources'
  | 'method'
  | 'ai-games'
  | 'data-centers'
  | 'videos'
  | 'ai-news'
  | 'architecture'
  | 'daily'
  | 'weekly'
  | 'monthly';

/** Generated editorial artwork shared by navigation, section entry cards and image fallbacks. */
export function iconArt(id: IconArtId): string {
  return `${import.meta.env.BASE_URL}images/icons/3d/${id}.webp?v=1`;
}
