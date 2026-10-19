import { formatNumber } from '../lib/dates';
import { useI18n } from '../lib/i18n';
import { href } from '../lib/router';
import { Icon } from './Icon';

/** Numbered pagination with a window of pages around the current one. */
export function pageWindow(page: number, total: number, span = 2): (number | '…')[] {
  const out: (number | '…')[] = [];
  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || Math.abs(p - page) <= span) out.push(p);
    else if (out[out.length - 1] !== '…') out.push('…');
  }
  return out;
}

export function Pagination({ page, total, path = '/', params }: { page: number; total: number; path?: string; params?: Record<string, string> }) {
  const { t, locale } = useI18n();
  if (total <= 1) return null;
  const link = (p: number) => href(path, { ...params, page: p === 1 ? undefined : p });
  return (
    <nav className="pagination" aria-label={t('pagination')}>
      {page > 1 ? (
        <a className="page-step" href={link(page - 1)} rel="prev">
          <Icon name="arrow" back size={16} /> <span>{t('newer')}</span>
        </a>
      ) : (
        <span className="page-step is-disabled" aria-hidden="true" />
      )}
      <ol className="page-list">
        {pageWindow(page, total).map((p, i) =>
          p === '…' ? (
            <li key={`gap-${i}`} aria-hidden="true" className="page-gap">
              …
            </li>
          ) : (
            <li key={p}>
              <a className="page-num" href={link(p)} aria-current={p === page ? 'page' : undefined} aria-label={`${t('page')} ${formatNumber(p, locale)} ${t('of')} ${formatNumber(total, locale)}`}>
                {formatNumber(p, locale)}
              </a>
            </li>
          ),
        )}
      </ol>
      {page < total ? (
        <a className="page-step" href={link(page + 1)} rel="next">
          <span>{t('older')}</span> <Icon name="arrow" directional size={16} />
        </a>
      ) : (
        <span className="page-step is-disabled" aria-hidden="true" />
      )}
    </nav>
  );
}
