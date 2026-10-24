import { useState } from 'react';
import { displayTitle } from '../lib/article';
import { useI18n } from '../lib/i18n';
import type { Article, ArticleVideo } from '../lib/types';
import { youtubeEmbedUrl } from '../lib/video';
import { Icon } from './Icon';
import { StoryImage, assetUrl, fallbackFor, resolveImageUrl } from './StoryImage';

interface Props {
  article: Article;
  video: ArticleVideo;
  eager?: boolean;
  /** Small play button without the provider note (grid tiles). */
  compact?: boolean;
}

/** Same-site paths (the mock dataset's bundled clip) resolve against the site base; https files stay as they are. */
function fileUrl(url: string): string {
  return /^https:\/\//i.test(url) ? url : assetUrl(url);
}

/**
 * Plays a story's video in the page. Until the viewer presses play only the story's own thumbnail is shown,
 * so nothing is requested from YouTube or the publisher's video server on page load. YouTube videos then
 * play in the privacy-enhanced youtube-nocookie.com player; video files play from the publisher's server.
 */
export function VideoPlayer({ article, video, eager = false, compact = false }: Props) {
  const { t, locale } = useI18n();
  const [playing, setPlaying] = useState(false);
  const title = displayTitle(article, locale).text;

  if (playing) {
    return (
      <div className="video-frame is-playing" data-testid="video-player">
        {video.provider === 'youtube' ? (
          <iframe
            src={youtubeEmbedUrl(video.id, window.location.origin)}
            title={`${t('video_label')}: ${title}`}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            // YouTube's player needs to know the embedding site; the path and hash are not sent.
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <video
            src={fileUrl(video.url)}
            poster={(article.image?.kind === 'fallback' ? fallbackFor(article.category) : resolveImageUrl(article.image?.url)) ?? undefined}
            controls
            autoPlay
            playsInline
            preload="metadata"
            aria-label={`${t('video_label')}: ${title}`}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`video-frame ${compact ? 'is-compact' : ''}`} data-testid="video-facade">
      <StoryImage article={article} eager={eager} />
      <button type="button" className="video-play" onClick={() => setPlaying(true)} aria-label={`${t('video_play')}: ${title}`}>
        <span className="video-play-icon" aria-hidden="true">
          <Icon name="play" size={compact ? 22 : 30} filled />
        </span>
        {!compact && <span className="video-play-label">{t('video_play')}</span>}
      </button>
      {!compact && video.provider === 'youtube' && <span className="video-note">{t('video_youtube_note')}</span>}
    </div>
  );
}
