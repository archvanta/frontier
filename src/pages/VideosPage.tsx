import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { ErrorState, Loading } from '../components/States';
import { BookmarkButton, SourceMark } from '../components/StoryCard';
import { VideoPlayer } from '../components/VideoPlayer';
import { displayExcerpt, displayTitle, safeUrl, storyPath } from '../lib/article';
import { formatDateTime, formatNumber } from '../lib/dates';
import { useI18n } from '../lib/i18n';
import { href } from '../lib/router';
import type { Article, ArticleVideo } from '../lib/types';
import { playableVideo, videoSourceUrl } from '../lib/video';
import { HowNote, SectionEmpty, Stat, sourceCount, useSection } from './SectionPage';

/** Videos revealed per click of "More stories". */
const STEP = 9;

/** One video: it plays right in the tile; the title opens the story page, the icon the original at its publisher. */
function VideoCell({ article, video, lead = false }: { article: Article; video: ArticleVideo; lead?: boolean }) {
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

export function VideosPage() {
  const { t, locale } = useI18n();
  const res = useSection('videos');
  const [shown, setShown] = useState(STEP + 1);
  const all = useMemo(() => {
    const articles = res.status === 'ready' ? (res.data?.articles ?? []) : [];
    return articles.flatMap((a) => {
      const video = playableVideo(a);
      return video ? [{ article: a, video }] : [];
    });
  }, [res.status, res.data]);
  const [lead, ...rest] = all.slice(0, shown);

  return (
    <div className="page videos-page">
      <header className="page-head">
        <p className="eyebrow">
          <Icon name="play" size={14} /> {t('nav_videos')}
        </p>
        <h1 className="page-title">{t('videos_title')}</h1>
        <p className="page-intro">{t('videos_body')}</p>
        {res.status === 'ready' && (
          <dl className="sec-stats">
            <Stat value={formatNumber(res.data?.total ?? 0, locale)} label={t('section_stories')} />
            <Stat value={formatNumber(sourceCount(all.map((v) => v.article)), locale)} label={t('section_sources')} />
            <Stat value={formatNumber(res.data?.windowDays ?? 90, locale)} label={t('section_days')} />
          </dl>
        )}
        <p className="videos-note">{t('videos_note')}</p>
      </header>
      {res.status === 'loading' && <Loading rows={2} />}
      {res.status === 'error' && <ErrorState onRetry={res.reload} />}
      {res.status === 'ready' &&
        (all.length === 0 ? (
          <SectionEmpty />
        ) : (
          <>
            {lead && <VideoCell article={lead.article} video={lead.video} lead />}
            {rest.length > 0 && (
              <div className="videos-grid">
                {rest.map((v) => (
                  <VideoCell key={v.article.id} article={v.article} video={v.video} />
                ))}
              </div>
            )}
            {all.length > shown && (
              <button type="button" className="btn videos-more" onClick={() => setShown((n) => n + STEP)}>
                {t('section_more')}
              </button>
            )}
          </>
        ))}
      <HowNote body="videos_how_body" />
    </div>
  );
}
