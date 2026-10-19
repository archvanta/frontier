import { useEffect, useMemo, useState } from 'react';
import { DaySection } from '../components/DaySection';
import { HeroVideo } from '../components/HeroVideo';
import { Icon } from '../components/Icon';
import { Pagination } from '../components/Pagination';
import { PicksPanel } from '../components/PicksPanel';
import { SignalStatus } from '../components/SignalStatus';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { WeeklyBrief } from '../components/WeeklyBrief';
import { planHomePage, sortNewestFirst, uniqueById } from '../lib/archive';
import { useData } from '../lib/dataContext';
import { formatNumber } from '../lib/dates';
import { useAsync } from '../lib/hooks';
import { categoryLabel, useI18n } from '../lib/i18n';
import { CATEGORY_IDS, type CategoryId, type Meta } from '../lib/types';

export function HomePage({ page, meta, now }: { page: number; meta: Meta | null; now: Date }) {
  const data = useData();
  const { t, locale } = useI18n();

  const feed = useAsync(async () => {
    const [index, picks] = await Promise.all([data.archiveIndex(), data.picks()]);
    const plan = planHomePage(index?.days ?? [], page, now);
    const files = await Promise.all(plan.days.map((d) => data.day(d)));
    const seen = new Set<string>();
    const groups = plan.days.map((day, i) => {
      // A story belongs to exactly one day; uniqueness across groups guards against bad data.
      const articles = uniqueById(sortNewestFirst(files[i]?.articles ?? [])).filter((a) => !seen.has(a.id) && (seen.add(a.id), true));
      return { day, articles };
    });
    return { plan, groups, picks, hasAny: (index?.days.length ?? 0) > 0 };
  }, [data, page, now.toISOString().slice(0, 13)]);

  const todayCount = feed.status === 'ready' && feed.data.plan.page === 1 ? (feed.data.groups[0]?.articles.length ?? 0) : null;
  const [category, setCategory] = useState<CategoryId | 'all'>('all');
  const present = useMemo(() => {
    if (feed.status !== 'ready') return [];
    const ids = new Set(feed.data.groups.flatMap((g) => g.articles.map((a) => a.category)));
    return CATEGORY_IDS.filter((c) => ids.has(c));
  }, [feed]);
  useEffect(() => setCategory('all'), [page]);

  return (
    <>
      {page === 1 && <HeroVideo />}
      {feed.status === 'loading' && <Loading rows={3} />}
      {feed.status === 'error' && <ErrorState onRetry={feed.reload} />}
      {feed.status === 'ready' && (
        <>
          {!feed.data.hasAny && (
            <EmptyState title={t('no_data_title')}>
              <p>{t('no_data_body')}</p>
            </EmptyState>
          )}
          {page === 1 && feed.data.hasAny && <PicksPanel picks={feed.data.picks} />}
          <div className="latest-layout">
            <aside className="latest-aside" aria-label={t('weekly_brief')}>
              {page === 1 && <WeeklyBrief picks={feed.data.picks} />}
              <SignalStatus meta={meta} todayCount={todayCount} />
            </aside>
            <div id="latest" className="feed" aria-label={t('stories')}>
              <header className="section-head latest-head">
                <h2 className="section-title">
                  <span className="section-glyph" aria-hidden="true">
                    <Icon name="signal" size={22} />
                  </span>
                  {t('latest_news')}
                </h2>
                {present.length > 1 && (
                  <div className="filter-chips glass-control" role="group" aria-label={t('filter_by_category')}>
                    {(['all', ...present] as const).map((c) => (
                      <button key={c} type="button" className="filter-chip" aria-pressed={category === c} onClick={() => setCategory(c)}>
                        {c === 'all' ? t('filter_all') : categoryLabel(locale, c)}
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
                <DaySection
                  key={g.day}
                  day={g.day}
                  level={3}
                  articles={category === 'all' ? g.articles : g.articles.filter((a) => a.category === category)}
                  emptyText={category === 'all' ? undefined : t('filter_empty')}
                  label={feed.data.plan.page === 1 ? (i === 0 ? t('today') : t('yesterday')) : undefined}
                />
              ))}
              <p className="page-note">{t('page1_note')}</p>
              <Pagination page={feed.data.plan.page} total={feed.data.plan.totalPages} />
            </div>
          </div>
        </>
      )}
    </>
  );
}
