import { DaySection } from '../components/DaySection';
import { Icon } from '../components/Icon';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { sortNewestFirst } from '../lib/archive';
import { useData } from '../lib/dataContext';
import { formatDay, formatNumber } from '../lib/dates';
import { useAsync } from '../lib/hooks';
import { useI18n } from '../lib/i18n';
import { href } from '../lib/router';
import type { ArchiveDay } from '../lib/types';

export function groupByMonth(days: readonly ArchiveDay[]): { month: string; days: ArchiveDay[] }[] {
  const out: { month: string; days: ArchiveDay[] }[] = [];
  for (const d of [...days].sort((a, b) => (a.day < b.day ? 1 : -1))) {
    const m = d.day.slice(0, 7);
    if (out[out.length - 1]?.month !== m) out.push({ month: m, days: [] });
    out[out.length - 1]!.days.push(d);
  }
  return out;
}

export function ArchivePage() {
  const data = useData();
  const { t, locale } = useI18n();
  const res = useAsync(() => data.archiveIndex(), [data]);
  const monthFmt = new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-GB', { timeZone: 'UTC', year: 'numeric', month: 'long' });

  return (
    <div className="page container-narrow">
      <header className="page-head">
        <p className="eyebrow">FRONTIER / ARCHIVE</p>
        <h1 className="page-title">{t('archive_title')}</h1>
        <p className="page-intro">{t('archive_intro')}</p>
      </header>
      {res.status === 'loading' && <Loading rows={1} />}
      {res.status === 'error' && <ErrorState onRetry={res.reload} />}
      {res.status === 'ready' &&
        (!res.data?.days.length ? (
          <EmptyState title={t('archive_empty')} />
        ) : (
          groupByMonth(res.data.days).map((g) => (
            <section key={g.month} className="archive-month" aria-label={g.month}>
              <h2 className="archive-month-title">{monthFmt.format(new Date(`${g.month}-15T12:00:00Z`))}</h2>
              <ul className="archive-days">
                {g.days.map((d) => (
                  <li key={d.day}>
                    <a href={href(`/day/${d.day}`)}>
                      <span>{formatDay(d.day, locale)}</span>
                      <span className="archive-count">
                        {formatNumber(d.count, locale)} {d.count === 1 ? t('story') : t('stories')}
                      </span>
                      <Icon name="arrow" size={14} directional />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))
        ))}
    </div>
  );
}

export function DayPage({ day }: { day: string }) {
  const data = useData();
  const { t, locale } = useI18n();
  const res = useAsync(async () => {
    const [file, index] = await Promise.all([data.day(day), data.archiveIndex()]);
    const days = (index?.days ?? []).map((d) => d.day).sort();
    const i = days.indexOf(day);
    const older = i > 0 ? days[i - 1] : [...days].reverse().find((d) => d < day);
    const newer = i >= 0 ? days[i + 1] : days.find((d) => d > day);
    return { articles: sortNewestFirst(file?.articles ?? []), older, newer };
  }, [data, day]);

  return (
    <div className="page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <a href={href('/archive')}>{t('archive_title')}</a>
        <Icon name="chevron" size={14} directional />
        <span>{day}</span>
      </nav>
      <h1 className="visually-hidden">{formatDay(day, locale)}</h1>
      {res.status === 'loading' && <Loading rows={3} />}
      {res.status === 'error' && <ErrorState onRetry={res.reload} />}
      {res.status === 'ready' && (
        <>
          <DaySection day={day} articles={res.data.articles} />
          <nav className="pagination" aria-label={t('pagination')}>
            {res.data.newer ? (
              <a className="page-step" href={href(`/day/${res.data.newer}`)} rel="prev">
                <Icon name="arrow" back size={16} /> {formatDay(res.data.newer, locale, 'short')}
              </a>
            ) : (
              <span className="page-step is-disabled" aria-hidden="true" />
            )}
            {res.data.older ? (
              <a className="page-step" href={href(`/day/${res.data.older}`)} rel="next">
                {formatDay(res.data.older, locale, 'short')} <Icon name="arrow" directional size={16} />
              </a>
            ) : (
              <span className="page-step is-disabled" aria-hidden="true" />
            )}
          </nav>
        </>
      )}
    </div>
  );
}
