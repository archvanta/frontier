import { Fragment, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Carousel } from '../components/Carousel';
import { DaySection } from '../components/DaySection';
import { Icon } from '../components/Icon';
import { FollowTopics } from '../components/FollowTopics';
import { HomeIntro } from '../components/HomeIntro';
import { NewsHero } from '../components/NewsHero';
import { Pagination } from '../components/Pagination';
import { PicksPanel } from '../components/PicksPanel';
import { SignalStatus } from '../components/SignalStatus';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { WeeklyBrief } from '../components/WeeklyBrief';
import { VideoCell } from '../components/VideoCell';
import { planHomePage, sortNewestFirst, uniqueById } from '../lib/archive';
import { introStats } from '../lib/introStats';
import { useData } from '../lib/dataContext';
import { formatNumber } from '../lib/dates';
import { followsAny, prioritizeFollowed, useFollowedTopics } from '../lib/follow';
import { pickHeroStories } from '../lib/heroStories';
import { useAsync } from '../lib/hooks';
import { useReveal, useSlidingIndicator } from '../lib/motion';
import { categoryLabel, sectionLabel, useI18n } from '../lib/i18n';
import { href } from '../lib/router';
import { CATEGORY_IDS, SECTION_IDS, type Article, type CategoryId, type Meta, type SectionId } from '../lib/types';
import { playableVideo } from '../lib/video';

/** `home` is the intro page (all three sections mixed, with a section label on each story); `ai-news` is the plain news front page: slideshow and the full feed. */
/** Stories per day shown as plain rows before "Show more"; the rest of a long day stays one tap away. */
const FEED_LIST_LIMIT = 12;
/** Stories in each homepage carousel. */
const CAROUSEL_STORIES = 10;

export function HomePage({
  page,
  meta,
  now,
  heroSlot,
  variant = 'home',
}: {
  page: number;
  meta: Meta | null;
  now: Date;
  heroSlot: HTMLElement | null;
  variant?: 'home' | 'ai-news';
}) {
  const home = variant === 'home';
  const data = useData();
  const { t, locale } = useI18n();

  const feed = useAsync(async () => {
    // Start every independent request together. Once the small archive index arrives, fetch its day files
    // immediately instead of waiting for the larger section indexes first; this removes a network waterfall.
    const indexPromise = data.archiveIndex();
    const picksPromise = data.picks();
    const sectionPromises = SECTION_IDS.map((id) => data.section(id).catch(() => null));
    const index = await indexPromise;
    const plan = planHomePage(index?.days ?? [], page, now);
    const [picks, sectionFiles, files] = await Promise.all([
      picksPromise,
      Promise.all(sectionPromises),
      Promise.all(plan.days.map((d) => data.day(d))),
    ]);
    const seen = new Set<string>();
    const groups = plan.days.map((day, i) => {
      // A story belongs to exactly one day; uniqueness across groups guards against bad data.
      const articles = uniqueById(sortNewestFirst(files[i]?.articles ?? [])).filter((a) => !seen.has(a.id) && (seen.add(a.id), true));
      return { day, articles };
    });
    // Which curated section (AI Games, Data Centers) a story belongs to, so the one feed can label and filter all three.
    const sectionOf = new Map<string, SectionId>();
    SECTION_IDS.forEach((id, i) => sectionFiles[i]?.articles.forEach((a) => sectionOf.has(a.id) || sectionOf.set(a.id, id)));
    const sectionStories = Object.fromEntries(SECTION_IDS.map((id, i) => [id, sortNewestFirst(sectionFiles[i]?.articles ?? [])])) as Record<
      SectionId,
      Article[]
    >;
    return {
      plan,
      groups,
      picks,
      sectionOf,
      sectionStories,
      hasAny: (index?.days.length ?? 0) > 0,
    };
  }, [data, page, now.toISOString().slice(0, 13)]);

  const todayCount = feed.status === 'ready' && feed.data.plan.page === 1 ? (feed.data.groups[0]?.articles.length ?? 0) : null;
  const [category, setCategory] = useState<CategoryId | SectionId | 'all'>('all');
  const present = useMemo(() => {
    if (feed.status !== 'ready') return [];
    const ids = new Set(feed.data.groups.flatMap((g) => g.articles.map((a) => a.category)));
    return CATEGORY_IDS.filter((c) => ids.has(c));
  }, [feed]);
  const presentSections = useMemo(() => {
    if (feed.status !== 'ready' || !home) return [];
    const have = new Set(feed.data.groups.flatMap((g) => g.articles.map((a) => feed.data.sectionOf.get(a.id))));
    return SECTION_IDS.filter((s) => have.has(s));
  }, [feed, home]);
  const matches = (a: Article, sectionOf: ReadonlyMap<string, SectionId>) =>
    category === 'all' || (SECTION_IDS as readonly string[]).includes(category)
      ? category === 'all' || sectionOf.get(a.id) === category
      : a.category === category;
  useEffect(() => setCategory('all'), [page, variant]);
  const revealLatest = useReveal<HTMLElement>('head');
  const chips = useSlidingIndicator<HTMLDivElement>(`${category}:${present.length}`);

  // Carousel and wall use only what the feed already loaded: today's and yesterday's real stories, newest first.
  const newest = useMemo(() => (feed.status === 'ready' ? sortNewestFirst(feed.data.groups.flatMap((g) => g.articles)) : []), [feed]);
  const { topics: followed } = useFollowedTopics();
  const heroStories = useMemo(
    () =>
      feed.status === 'loading'
        ? null
        : feed.status === 'ready'
          ? pickHeroStories(newest, feed.data.picks, 3, followed.length ? (a) => followsAny(a, followed) : undefined)
          : [],
    [feed, newest, followed],
  );
  // Secondary picks must introduce stories not already shown by the hero.
  const featured = useMemo(() => new Set((heroStories ?? []).map((a) => a.id)), [heroStories]);
  const homeVideos = useMemo(
    () =>
      feed.status === 'ready'
        ? feed.data.sectionStories.videos.flatMap((article) => {
            const video = playableVideo(article);
            return video ? [{ article, video }] : [];
          }).slice(0, 3)
        : [],
    [feed],
  );

  const introData = useMemo(
    () =>
      feed.status === 'ready'
        ? {
            stats: introStats(newest, feed.data.sectionOf, meta, now),
            signals: [],
            now,
          }
        : null,
    [feed, newest, meta, now],
  );
  const goTo = (id: string) => () => {
    const el = document.getElementById(id);
    el?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
    el?.focus({ preventScroll: true });
  };

  return (
    <>
      {page === 1 &&
        heroSlot &&
        createPortal(
          <>
            {home && <HomeIntro onContinue={goTo('news-hero')} data={introData} />}
            {heroStories === null || heroStories.length > 0 ? (
              <NewsHero key={heroStories?.map((a) => a.id).join() ?? 'loading'} stories={heroStories} standalone={!home} />
            ) : null}
          </>,
          heroSlot,
        )}
      {feed.status === 'loading' && <Loading rows={3} />}
      {feed.status === 'error' && <ErrorState onRetry={feed.reload} />}
      {feed.status === 'ready' && (
        <>
          {!feed.data.hasAny && (
            <EmptyState title={t('no_data_title')}>
              <p>{t('no_data_body')}</p>
            </EmptyState>
          )}
          {page === 1 && feed.data.hasAny && <PicksPanel picks={feed.data.picks} excludeIds={featured} />}

          {page === 1 && home && (
            <>
              <Carousel title={t('intro_link_news')} seeAllTo="/ai-news" articles={newest.filter((a) => !featured.has(a.id)).slice(0, CAROUSEL_STORIES)} />
              <Carousel
                title={t('nav_ai_games')}
                seeAllTo="/ai-games"
                section="ai-games"
                articles={feed.data.sectionStories['ai-games'].slice(0, CAROUSEL_STORIES)}
              />
              <Carousel
                title={t('nav_data_centers')}
                seeAllTo="/data-centers"
                section="data-centers"
                articles={feed.data.sectionStories['data-centers'].slice(0, CAROUSEL_STORIES)}
              />
              <FollowTopics onSkip={goTo('latest')} />
            </>
          )}
          <div className="latest-layout">
            <aside className="latest-aside" aria-label={t('weekly_brief')}>
              {page === 1 && <WeeklyBrief picks={feed.data.picks} />}
              <SignalStatus meta={meta} todayCount={todayCount} />
            </aside>
            <div id="latest" className="feed" aria-label={t('stories')}>
              <header ref={revealLatest} className="section-head latest-head">
                <h2 className="section-title">
                  <span className="section-glyph" aria-hidden="true">
                    <Icon name="signal" size={22} />
                  </span>
                  {t('latest_news')}
                </h2>
                {present.length + presentSections.length > 1 && (
                  <div ref={chips} className="filter-chips pill-track" role="group" aria-label={t('filter_by_category')}>
                    {(['all', ...present, ...presentSections] as const).map((c) => (
                      <button key={c} type="button" className="filter-chip" aria-pressed={category === c} onClick={() => setCategory(c)}>
                        {c === 'all'
                          ? t('filter_all')
                          : (SECTION_IDS as readonly string[]).includes(c)
                            ? sectionLabel(t, c as SectionId)
                            : categoryLabel(locale, c as CategoryId)}
                      </button>
                    ))}
                  </div>
                )}
              </header>
              {feed.data.plan.page > 1 && (
                <p className="page-label">
                  {t('page')} {formatNumber(feed.data.plan.page, locale)} {t('of')} {formatNumber(feed.data.plan.totalPages, locale)}
                </p>
              )}
              {feed.data.groups.map((g, i) => (
                <Fragment key={`${g.day}:${category}`}>
                  <DaySection
                    day={g.day}
                    level={3}
                    articles={prioritizeFollowed(category === 'all' ? g.articles : g.articles.filter((a) => matches(a, feed.data.sectionOf)), followed)}
                    sectionOf={home ? feed.data.sectionOf : undefined}
                    emptyText={category === 'all' ? undefined : t('filter_empty')}
                    listLimit={FEED_LIST_LIMIT}
                    label={feed.data.plan.page === 1 ? (i === 0 ? t('today') : t('yesterday')) : undefined}
                  />
                  {i === 0 && page === 1 && home && category === 'all' && homeVideos.length > 0 && (
                    <section className="home-video-interlude" aria-labelledby="home-videos-title">
                      <header className="home-video-head">
                        <div>
                          <p className="eyebrow">{t('home_videos_kicker')}</p>
                          <h3 id="home-videos-title" className="home-video-title">{t('home_videos_title')}</h3>
                        </div>
                        <a className="section-link" href={href('/videos')}>
                          {t('home_videos_all')} <Icon name="arrow" directional />
                        </a>
                      </header>
                      <div className="home-video-grid">
                        {homeVideos.map(({ article, video }) => <VideoCell key={article.id} article={article} video={video} />)}
                      </div>
                    </section>
                  )}
                </Fragment>
              ))}
              <p className="page-note">{t('page1_note')}</p>
              <Pagination page={feed.data.plan.page} total={feed.data.plan.totalPages} path={home ? '/' : '/ai-news'} />
            </div>
          </div>
        </>
      )}
    </>
  );
}
