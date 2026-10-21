import { useCallback, useState } from 'react';
import { Icon } from '../components/Icon';
import { ScoreExplain } from '../components/ScoreExplain';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { BookmarkButton } from '../components/StoryCard';
import { StoryImage } from '../components/StoryImage';
import { VideoPlayer } from '../components/VideoPlayer';
import { displayExcerpt, displayTitle, hostOf, persianDigits, safeUrl } from '../lib/article';
import { useData } from '../lib/dataContext';
import { formatDateTime, formatDay } from '../lib/dates';
import { useAsync } from '../lib/hooks';
import { categoryLabel, useI18n } from '../lib/i18n';
import { href } from '../lib/router';
import type { CardFit } from '../lib/imageFit';
import type { Article, ArticleVideo, SearchEntry } from '../lib/types';
import { playableVideo, videoSourceUrl } from '../lib/video';

const LANG_NAMES: Record<string, { en: string; fa: string }> = {
  en: { en: 'English', fa: 'انگلیسی' },
  fa: { en: 'Persian', fa: 'فارسی' },
};

/** The story's photo with its credit; dropped together with the caption when it is broken or tiny. */
function StoryFigure({ article, caption, publisherImage }: { article: Article; caption?: string; publisherImage: string | null }) {
  const { t } = useI18n();
  const [hidden, setHidden] = useState(false);
  const onFit = useCallback((fit: CardFit) => setHidden(fit === 'hide'), []);
  if (hidden) return null;
  const credit = caption ?? (article.image?.credit || undefined);
  return (
    <figure className="story-figure">
      <StoryImage article={article} eager onFit={onFit} />
      {(credit || article.image?.sourceUrl) && (
        <figcaption>
          {t('image_credit')}: {credit ?? hostOf(article.image?.sourceUrl ?? article.url)}
          {publisherImage && (
            <>
              {' · '}
              <a href={publisherImage} target="_blank" rel="noopener noreferrer">
                {t('publisher_image')}
              </a>
            </>
          )}
        </figcaption>
      )}
    </figure>
  );
}

/** The story's video, played in the page, credited to its publisher with a link to the original. */
function StoryVideo({ article, video }: { article: Article; video: ArticleVideo }) {
  const { t } = useI18n();
  const source = safeUrl(videoSourceUrl(video));
  return (
    <figure className="story-figure story-video">
      <VideoPlayer article={article} video={video} eager />
      <figcaption>
        {t('video_credit')}: {article.sourceName}
        {source && (
          <>
            {' · '}
            <a href={source} target="_blank" rel="noopener noreferrer">
              {video.provider === 'youtube' ? t('video_watch_youtube') : t('video_open_file')}
            </a>
          </>
        )}
      </figcaption>
    </figure>
  );
}

export function StoryPage({ day, id }: { day: string; id: string }) {
  const data = useData();
  const { t, locale } = useI18n();
  const res = useAsync(async () => {
    const [file, picks, index] = await Promise.all([data.day(day), data.picks(), data.searchIndex().catch(() => null)]);
    const article = file?.articles.find((a) => a.id === id) ?? null;
    const byId = new Map<string, SearchEntry>((index?.entries ?? []).map((e) => [e.id, e]));
    const related = (article?.related ?? []).map((rid) => byId.get(rid)).filter((e): e is SearchEntry => Boolean(e));
    return { article, related, weights: picks?.weights };
  }, [data, day, id]);

  if (res.status === 'loading') return <Loading rows={1} />;
  if (res.status === 'error') return <ErrorState onRetry={res.reload} />;
  const { article: a, related, weights } = res.data;
  if (!a) {
    return (
      <div className="page container-narrow">
        <h1 className="page-title">{t('not_found')}</h1>
        <EmptyState title={t('story_missing')}>
          <a className="btn" href={href(`/day/${day}`)}>
            {t('open_day')}
          </a>
        </EmptyState>
      </div>
    );
  }
  const title = displayTitle(a, locale);
  const excerpt = displayExcerpt(a, locale);
  const external = safeUrl(a.url);
  const lang = LANG_NAMES[a.lang]?.[locale] ?? a.lang;
  const credit = a.image?.kind === 'brand' ? t('brand_art_note') : a.image?.credit;
  const publisherImage = a.image?.kind === 'brand' ? safeUrl(a.sourceImage?.url) : null;
  const video = playableVideo(a);

  return (
    <article className="page story-page container-narrow">
      <nav className="crumbs" aria-label="Breadcrumb">
        <a href={href('/')}>{t('nav_home')}</a>
        <Icon name="chevron" size={14} directional />
        <a href={href(`/day/${a.day}`)}>
          <time dateTime={a.day}>{formatDay(a.day, locale, 'short')}</time>
        </a>
      </nav>
      <header className="story-head">
        <div className="story-kicker">
          <a className="chip" href={href('/explore', { c: a.category })}>
            {categoryLabel(locale, a.category)}
          </a>
          {video && (
            <a className="sec-badge" href={href('/videos')} data-section="videos">
              {t('video_label')}
            </a>
          )}
          <span className="kicker-source">{a.sourceName}</span>
        </div>
        <h1 className="story-headline" lang={title.lang} dir="auto">
          {title.text}
        </h1>
        {title.translated && (
          <p className="original-title">
            <span className="mt-label">{t('translation_machine')}</span>
            <br />
            {t('original_title')}:{' '}
            <span lang={a.lang} dir="auto">
              {a.title}
            </span>
          </p>
        )}
        {locale === 'fa' && !title.translated && a.lang !== 'fa' && <p className="mt-label">{t('translation_missing')}</p>}
      </header>

      <div className="story-layout">
        <div className="story-main">
          {video ? (
            <StoryVideo article={a} video={video} />
          ) : (
            <StoryFigure article={a} caption={credit ?? undefined} publisherImage={publisherImage} />
          )}
          {excerpt.text && (
            <p className="story-lede" lang={excerpt.lang} dir="auto">
              {excerpt.text}
            </p>
          )}
          <div className="story-actions">
            {external && (
              <a className="btn is-primary" href={external} target="_blank" rel="noopener noreferrer">
                {t('read_source')} — {hostOf(external)} <Icon name="external" size={16} />
              </a>
            )}
            <BookmarkButton article={a} />
          </div>
          {related.length > 0 && (
            <section className="related" aria-labelledby="related-h">
              <h2 id="related-h" className="related-title">
                {t('related')}
              </h2>
              <ul>
                {related.map((r) => (
                  <li key={r.id}>
                    <a href={href(`/story/${r.d}/${r.id}`)}>{locale === 'fa' && r.tf ? persianDigits(r.tf) : r.t}</a>
                    <span className="kicker-source"> — {r.sn}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <aside className="story-side">
          <dl className="facts">
            <div>
              <dt>{t('source')}</dt>
              <dd>{a.sourceName}</dd>
            </div>
            <div>
              <dt>{t('published')}</dt>
              <dd>
                <time dateTime={a.publishedAt}>{formatDateTime(a.publishedAt, locale)}</time>
                {a.dateEstimated && <span className="fact-note">{t('date_estimated')}</span>}
              </dd>
            </div>
            <div>
              <dt>{t('fetched')}</dt>
              <dd>
                <time dateTime={a.fetchedAt}>{formatDateTime(a.fetchedAt, locale)}</time>
              </dd>
            </div>
            <div>
              <dt>{t('language')}</dt>
              <dd>{lang}</dd>
            </div>
          </dl>
          {a.score && <ScoreExplain score={a.score} weights={weights} />}
          <p className="fact-note">{t('picks_note')}</p>
        </aside>
      </div>
    </article>
  );
}
