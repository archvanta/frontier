import type { Article, ArticleVideo } from './types';

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const FILE_TYPES = new Set(['video/mp4', 'video/webm', 'video/ogg']);

/** A video the page can actually play: a well-formed YouTube id, or an https (or bundled, same-site) video file. */
export function playableVideo(article: Pick<Article, 'video'>): ArticleVideo | null {
  const v = article.video;
  if (!v) return null;
  if (v.provider === 'youtube') return YOUTUBE_ID.test(v.id) ? v : null;
  if (v.provider === 'file') {
    if (!FILE_TYPES.has(v.type)) return null;
    if (/^https:\/\//i.test(v.url)) return v;
    // Repo-relative paths are same-site assets (the mock dataset); any other scheme is refused.
    return /^[a-z][a-z0-9+.-]*:|^\/\//i.test(v.url) ? null : v;
  }
  return null;
}

/**
 * The privacy-enhanced YouTube player: no YouTube cookies until the viewer presses play inside it.
 * It is only put in the page after the viewer clicks our own play button.
 */
export function youtubeEmbedUrl(id: string, origin?: string): string {
  const q = new URLSearchParams({ autoplay: '1', rel: '0', playsinline: '1' });
  if (origin) q.set('origin', origin);
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?${q.toString()}`;
}

/** Where the video lives at its publisher, for the "watch at source" link. */
export function videoSourceUrl(v: ArticleVideo): string {
  return v.provider === 'youtube' ? `https://www.youtube.com/watch?v=${v.id}` : v.url;
}
