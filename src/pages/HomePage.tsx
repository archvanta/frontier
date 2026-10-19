import { DaySection } from '../components/DaySection';
import { HeroVideo } from '../components/HeroVideo';
import { Pagination } from '../components/Pagination';
import { PicksPanel } from '../components/PicksPanel';
import { SignalStatus } from '../components/SignalStatus';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { planHomePage, sortNewestFirst, uniqueById } from '../lib/archive';
import { useData } from '../lib/dataContext';
import { formatNumber } from '../lib/dates';
import { useAsync } from '../lib/hooks';
import { useI18n } from '../lib/i18n';
import type { Meta } from '../lib/types';

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

  return (
    <>
      {page === 1 && <HeroVideo aside={<SignalStatus meta={meta} todayCount={todayCount} />} />}
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
          <div id="latest" className="feed" aria-label={t('stories')}>
            {feed.data.plan.page > 1 && (
              <p className="page-label">
                {t('page')} {formatNumber(feed.data.plan.page, locale)} {t('of')} {formatNumber(feed.data.plan.totalPages, locale)}
              </p>
            )}
            {feed.data.groups.map((g, i) => (
              <DaySection
                key={g.day}
                day={g.day}
                articles={g.articles}
                label={feed.data.plan.page === 1 ? (i === 0 ? t('today') : t('yesterday')) : undefined}
              />
            ))}
            <p className="page-note">{t('page1_note')}</p>
            <Pagination page={feed.data.plan.page} total={feed.data.plan.totalPages} />
          </div>
        </>
      )}
    </>
  );
}
