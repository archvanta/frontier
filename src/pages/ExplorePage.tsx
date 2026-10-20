import { useEffect, useMemo, useState } from 'react';
import { Pagination } from '../components/Pagination';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { useData } from '../lib/dataContext';
import { formatDateTime, formatNumber } from '../lib/dates';
import { useAsync } from '../lib/hooks';
import { categoryLabel, useI18n } from '../lib/i18n';
import { href, navigate } from '../lib/router';
import { filtersFromParams, hasActiveFilters, paginate, searchEntries, sourceOptions, type SearchFilters } from '../lib/search';
import { CATEGORY_IDS, type SearchEntry } from '../lib/types';

function ResultRow({ e }: { e: SearchEntry }) {
  const { t, locale } = useI18n();
  const translated = locale === 'fa' && e.tf;
  return (
    <li className="result-row" data-testid="result-row">
      <div className="story-kicker">
        <a className="chip" href={href('/explore', { c: e.c })}>
          {categoryLabel(locale, e.c)}
        </a>
        <span className="kicker-source">{e.sn}</span>
      </div>
      <h2 className="result-title" lang={translated ? 'fa' : 'en'} dir="auto">
        <a href={href(`/story/${e.d}/${e.id}`)}>{translated ? e.tf : e.t}</a>
      </h2>
      {translated && <span className="mt-label">{t('translation_machine')}</span>}
      <time className="result-time" dateTime={e.p}>
        {formatDateTime(e.p, locale)}
      </time>
    </li>
  );
}

export function ExplorePage({ params }: { params: URLSearchParams }) {
  const data = useData();
  const { t, locale } = useI18n();
  const filters = useMemo(() => filtersFromParams(params), [params]);
  const page = Number.parseInt(params.get('page') ?? '1', 10) || 1;
  const index = useAsync(() => data.searchIndex(), [data]);
  const [q, setQ] = useState(filters.q);
  useEffect(() => setQ(filters.q), [filters.q]);

  const apply = (patch: Partial<SearchFilters>) => {
    const next = { ...filters, ...patch };
    navigate('/explore', { ...next, page: undefined }, true);
  };

  const entries = useMemo(() => (index.status === 'ready' ? (index.data?.entries ?? []) : []), [index.status, index.data]);
  const results = useMemo(() => searchEntries(entries, filters), [entries, filters]);
  const sources = useMemo(() => sourceOptions(entries), [entries]);
  const pageData = paginate(results, page);
  const windowDays = index.status === 'ready' ? (index.data?.windowDays ?? 90) : 90;

  return (
    <div className="page container-narrow">
      <header className="page-head">
        <p className="eyebrow">{t('nav_search')}</p>
        <h1 className="page-title">{filters.c ? categoryLabel(locale, filters.c) : t('explore_title')}</h1>
        <form
          className="filters surface"
          role="search"
          onSubmit={(ev) => {
            ev.preventDefault();
            apply({ q: q.trim() });
          }}
        >
          <div className="filter-q">
            <label htmlFor="explore-q">{t('search_label')}</label>
            <input id="explore-q" type="search" value={q} onChange={(ev) => setQ(ev.target.value)} placeholder={t('search_placeholder')} />
          </div>
          <div>
            <label htmlFor="f-c">{t('filter_category')}</label>
            <select id="f-c" value={filters.c} onChange={(ev) => apply({ c: ev.target.value as SearchFilters['c'] })}>
              <option value="">{t('filter_all')}</option>
              {CATEGORY_IDS.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(locale, c)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-s">{t('filter_source')}</label>
            <select id="f-s" value={filters.s} onChange={(ev) => apply({ s: ev.target.value })}>
              <option value="">{t('filter_all')}</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-b">{t('filter_brand')}</label>
            <select id="f-b" value={filters.b} onChange={(ev) => apply({ b: ev.target.value as SearchFilters['b'] })}>
              <option value="">{t('filter_all')}</option>
              <option value="claude">Claude / Anthropic</option>
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini / Google</option>
            </select>
          </div>
          <div>
            <label htmlFor="f-from">{t('filter_from')}</label>
            <input id="f-from" type="date" value={filters.from} onChange={(ev) => apply({ from: ev.target.value })} />
          </div>
          <div>
            <label htmlFor="f-to">{t('filter_to')}</label>
            <input id="f-to" type="date" value={filters.to} onChange={(ev) => apply({ to: ev.target.value })} />
          </div>
          <div className="filter-actions">
            <button type="submit" className="btn is-primary">
              {t('nav_search')}
            </button>
            {hasActiveFilters(filters) && (
              <a className="btn" href={href('/explore')}>
                {t('filter_reset')}
              </a>
            )}
          </div>
        </form>
        <p className="page-intro">{t('search_window', { n: formatNumber(windowDays, locale) })}</p>
      </header>

      {index.status === 'loading' && <Loading rows={2} />}
      {index.status === 'error' && <ErrorState onRetry={index.reload} />}
      {index.status === 'ready' && (
        <>
          <p className="result-count" aria-live="polite">
            {formatNumber(results.length, locale)} {t('results')}
          </p>
          {results.length === 0 ? (
            <EmptyState title={entries.length ? t('no_results') : t('no_data_title')}>
              {hasActiveFilters(filters) && (
                <a className="btn" href={href('/explore')}>
                  {t('filter_reset')}
                </a>
              )}
            </EmptyState>
          ) : (
            <>
              {/* New results fade in place of the old ones; the rest of the page stays put. */}
              <ol key={`${JSON.stringify(filters)}:${pageData.page}`} className="result-list swap-in">
                {pageData.items.map((e) => (
                  <ResultRow key={e.id} e={e} />
                ))}
              </ol>
              <Pagination page={pageData.page} total={pageData.total} path="/explore" params={{ ...filters }} />
            </>
          )}
        </>
      )}
    </div>
  );
}
