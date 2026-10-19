import { Icon } from '../components/Icon';
import { EmptyState } from '../components/States';
import { safeUrl } from '../lib/article';
import { useBookmarks } from '../lib/bookmarks';
import { formatDateTime } from '../lib/dates';
import { useI18n } from '../lib/i18n';
import { href } from '../lib/router';

export function SavedPage() {
  const { t, locale } = useI18n();
  const { list, remove } = useBookmarks();
  return (
    <div className="page container-narrow">
      <header className="page-head">
        <p className="eyebrow">SIGNAL / SAVED</p>
        <h1 className="page-title">{t('saved_title')}</h1>
        <p className="page-intro">
          <Icon name="info" size={14} /> {t('saved_note')}
        </p>
      </header>
      {list.length === 0 ? (
        <EmptyState title={t('saved_empty')} />
      ) : (
        <ol className="result-list">
          {list.map((b) => {
            const title = locale === 'fa' && b.titleFa ? b.titleFa : b.title;
            const ext = safeUrl(b.url);
            return (
              <li key={b.id} className="result-row" data-testid="saved-row">
                <span className="kicker-source">{b.sourceName}</span>
                <h2 className="result-title" dir="auto">
                  <a href={href(`/story/${b.day}/${b.id}`)}>{title}</a>
                </h2>
                <div className="story-meta">
                  <time dateTime={b.publishedAt}>{formatDateTime(b.publishedAt, locale)}</time>
                  <span className="meta-spacer" />
                  {ext && (
                    <a className="icon-btn" href={ext} target="_blank" rel="noopener noreferrer" aria-label={t('read_source')}>
                      <Icon name="external" />
                    </a>
                  )}
                  <button type="button" className="icon-btn bookmark is-on" aria-label={t('unsave')} onClick={() => remove(b.id)}>
                    <Icon name="bookmark" filled />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
