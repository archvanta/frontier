import { EmptyState, ErrorState, Loading } from '../components/States';
import { safeUrl } from '../lib/article';
import { useData } from '../lib/dataContext';
import { formatDay } from '../lib/dates';
import { useAsync } from '../lib/hooks';
import { useI18n, type MessageKey } from '../lib/i18n';
import type { SourceStatus } from '../lib/types';

const STATUS_KEY: Record<SourceStatus, MessageKey> = {
  ok: 'status_ok',
  error: 'status_error',
  disabled: 'status_disabled',
  unverified: 'status_unverified',
};

export function SourcesPage() {
  const data = useData();
  const { t, locale } = useI18n();
  const res = useAsync(() => data.sources(), [data]);
  return (
    <div className="page container-narrow">
      <header className="page-head">
        <p className="eyebrow">SIGNAL / SOURCES</p>
        <h1 className="page-title">{t('sources_title')}</h1>
        <p className="page-intro">{t('sources_intro')}</p>
      </header>
      {res.status === 'loading' && <Loading rows={1} />}
      {res.status === 'error' && <ErrorState onRetry={res.reload} />}
      {res.status === 'ready' &&
        (!res.data?.sources.length ? (
          <EmptyState title={t('no_data_title')} />
        ) : (
          <div className="table-wrap">
            <table className="sources-table">
              <thead>
                <tr>
                  <th scope="col">{t('source')}</th>
                  <th scope="col">{t('tier')}</th>
                  <th scope="col">Status</th>
                  <th scope="col">{t('verified_on')}</th>
                </tr>
              </thead>
              <tbody>
                {res.data.sources.map((s) => {
                  const home = safeUrl(s.homepage);
                  return (
                    <tr key={s.id}>
                      <th scope="row">
                        {home ? (
                          <a href={home} target="_blank" rel="noopener noreferrer">
                            {s.name}
                          </a>
                        ) : (
                          s.name
                        )}
                        <span className="source-kind">{s.kind}</span>
                      </th>
                      <td>{s.tier}</td>
                      <td>
                        <span className={`status status-${s.status}`}>{t(STATUS_KEY[s.status])}</span>
                        {s.lastError && <span className="source-error">{s.lastError}</span>}
                      </td>
                      <td>{s.verifiedOn ? formatDay(s.verifiedOn, locale, 'short') : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
}
