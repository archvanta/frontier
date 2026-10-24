import { MergeOffer } from '../components/account/MergeOffer';
import { Icon } from '../components/Icon';
import { EmptyState, Loading } from '../components/States';
import { useAccountText } from '../lib/account/messages';
import { useSavedStories } from '../lib/account/saved';
import type { SavedStory } from '../lib/account/types';
import { safeUrl } from '../lib/article';
import { useBookmarks } from '../lib/bookmarks';
import { formatDateTime } from '../lib/dates';
import { useI18n } from '../lib/i18n';
import { href } from '../lib/router';

function SavedList({ list, onRemove, testId = 'saved-row' }: { list: SavedStory[]; onRemove: (id: string) => void; testId?: string }) {
  const { t, locale } = useI18n();
  return (
    <ol className="result-list">
      {list.map((b) => {
        const title = locale === 'fa' && b.titleFa ? b.titleFa : b.title;
        const ext = safeUrl(b.url);
        return (
          <li key={b.id} className="result-row" data-testid={testId}>
            <span className="kicker-source">{b.sourceName}</span>
            <h2 className="result-title" dir="auto">
              <a href={href(`/story/${b.day}/${b.id}`)}>{title}</a>
            </h2>
            <div className="story-meta">
              {b.publishedAt && <time dateTime={b.publishedAt}>{formatDateTime(b.publishedAt, locale)}</time>}
              <span className="meta-spacer" />
              {ext && (
                <a className="icon-btn" href={ext} target="_blank" rel="noopener noreferrer" aria-label={t('read_source')}>
                  <Icon name="external" />
                </a>
              )}
              <button type="button" className="icon-btn bookmark is-on" aria-label={t('unsave')} onClick={() => onRemove(b.id)}>
                <Icon name="bookmark" filled />
              </button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Signed out: this browser's bookmarks. Signed in: the account's bookmarks, plus an offer to copy
 * this browser's ones over and a separate list of anything still saved only here.
 */
export function SavedPage() {
  const { t } = useI18n();
  const at = useAccountText();
  const saved = useSavedStories();
  const local = useBookmarks();
  const cloudIds = new Set(saved.list.map((b) => b.id));
  const localOnly = saved.cloud ? local.list.filter((b) => !cloudIds.has(b.id)) : [];
  return (
    <div className="page container-narrow">
      <header className="page-head">
        <p className="eyebrow">{t('nav_saved')}</p>
        <h1 className="page-title">{t('saved_title')}</h1>
        <p className="page-intro">
          <Icon name="info" size={14} /> {saved.cloud ? at('saved_cloud_note') : t('saved_note')}
        </p>
      </header>
      {saved.cloud && <MergeOffer />}
      {saved.loading ? (
        <Loading rows={2} />
      ) : saved.list.length === 0 ? (
        <EmptyState title={t('saved_empty')}><a className="btn is-primary" href={href('/explore')}>{t('nav_explore')}</a></EmptyState>
      ) : (
        <SavedList list={saved.list} onRemove={saved.remove} />
      )}
      {localOnly.length > 0 && (
        <section className="saved-local" aria-labelledby="saved-local-h">
          <h2 id="saved-local-h" className="section-title">
            {at('saved_local_section')}
          </h2>
          <SavedList list={localOnly} onRemove={local.remove} testId="saved-local-row" />
        </section>
      )}
    </div>
  );
}
