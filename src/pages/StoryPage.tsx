import { Icon } from '../components/Icon';
import { ScoreExplain } from '../components/ScoreExplain';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { BookmarkButton } from '../components/StoryCard';
import { StoryImage } from '../components/StoryImage';
import { displayExcerpt, displayTitle, hostOf, safeUrl } from '../lib/article';
import { useData } from '../lib/dataContext';
import { formatDateTime } from '../lib/dates';
import { useAsync } from '../lib/hooks';
import { categoryLabel, useI18n } from '../lib/i18n';
import { href } from '../lib/router';
import type { SearchEntry } from '../lib/types';

const LANG_NAMES: Record<string, { en: string; fa: string }> = {
  en: { en: 'English', fa: 'انگلیسی' },
  fa: { en: 'Persian', fa: 'فارسی' },
};

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

  return (
    <article className="page story-page container-narrow">
      <nav className="crumbs" aria-label="Breadcrumb">
        <a href={href('/')}>{t('nav_home')}</a>
        <Icon name="chevron" size={14} directional />
        <a href={href(`/day/${a.day}`)}>{a.day}</a>
      </nav>
      <header className="story-head">
        <div className="story-kicker">
          <a className="chip" href={href('/explore', { c: a.category })}>
            {categoryLabel(locale, a.category)}
          </a>
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
          <figure className="story-figure">
            <StoryImage article={a} eager />
            {(credit || a.image?.sourceUrl) && (
              <figcaption>
                {t('image_credit')}: {credit ?? hostOf(a.image?.sourceUrl ?? a.url)}
              </figcaption>
            )}
          </figure>
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
                    <a href={href(`/story/${r.d}/${r.id}`)}>{locale === 'fa' && r.tf ? r.tf : r.t}</a>
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
