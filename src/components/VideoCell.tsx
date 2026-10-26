import { displayExcerpt, displayTitle, safeUrl, storyPath } from '../lib/article';
import { formatDateTime } from '../lib/dates';
import { useI18n } from '../lib/i18n';
import { href } from '../lib/router';
import type { Article, ArticleVideo } from '../lib/types';
import { videoSourceUrl } from '../lib/video';
import { Icon } from './Icon';
import { BookmarkButton, SourceMark } from './StoryCard';
import { VideoPlayer } from './VideoPlayer';

/** A playable news video card shared by the Videos page and the homepage interlude. */
export function VideoCell({ article, video, lead = false }: { article: Article; video: ArticleVideo; lead?: boolean }) {
  const { t, locale } = useI18n();
  const title = displayTitle(article, locale);
  const excerpt = displayExcerpt(article, locale);
  const source = safeUrl(videoSourceUrl(video));
  const H = lead ? 'h2' : 'h3';
  return (
    <article className={`video-cell ${lead ? 'is-lead' : ''}`} data-testid="video-cell" data-id={article.id}>
      <VideoPlayer article={article} video={video} eager={lead} compact={!lead} />
      <div className="video-cell-body">
        <p className="video-cell-kicker">
          <span className="kicker-source">
            <SourceMark name={article.sourceName} />
            {article.sourceName}
          </span>
          <time dateTime={article.publishedAt} title={article.dateEstimated ? t('date_estimated') : undefined}>
            {formatDateTime(article.publishedAt, locale)}
            {article.dateEstimated && <span aria-hidden="true">*</span>}
          </time>
        </p>
        <H className="video-cell-title" lang={title.lang} dir="auto">
          <a href={href(storyPath(article))}>{title.text}</a>
        </H>
        {title.translated && <span className="mt-label">{t('translation_machine')}</span>}
        {lead && excerpt.text && (
          <p className="video-cell-excerpt" lang={excerpt.lang} dir="auto">
            {excerpt.text}
          </p>
        )}
        <div className="video-cell-actions">
          <span className="meta-spacer" />
          <BookmarkButton article={article} />
          {source && (
            <a
              className="icon-btn"
              href={source}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${video.provider === 'youtube' ? t('video_watch_youtube') : t('video_open_file')}: ${article.sourceName}`}
              title={video.provider === 'youtube' ? t('video_watch_youtube') : t('video_open_file')}
            >
              <Icon name="external" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
