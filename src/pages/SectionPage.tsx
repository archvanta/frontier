import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { Marquee } from '../components/Marquee';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { BookmarkButton, SourceMark, StoryCard } from '../components/StoryCard';
import { StoryImage, assetUrl, resolveImageUrl } from '../components/StoryImage';
import { displayExcerpt, displayTitle, safeUrl, storyPath } from '../lib/article';
import { useData } from '../lib/dataContext';
import { formatDateTime, formatNumber } from '../lib/dates';
import { useAsync } from '../lib/hooks';
import { useI18n, type MessageKey } from '../lib/i18n';
import { rememberedCardFit } from '../lib/imageFit';
import { href, navigate } from '../lib/router';
import type { Article, SectionFile, SectionId } from '../lib/types';
import { VideosPage } from './VideosPage';

/** Stories revealed per click of "More stories". */
const STEP = 9;

type Entity = 'anthropic' | 'openai' | 'google';

interface Character {
  entity: Entity;
  name: string;
  image: string;
  tag: string;
}

/** The owner's character illustrations (unofficial editorial artwork), used only on the AI Games page. */
const CAST: Character[] = [
  { entity: 'anthropic', name: 'Claude', image: 'images/ai-brands/claude-character.webp', tag: 'CLD' },
  { entity: 'openai', name: 'OpenAI', image: 'images/ai-brands/openai-character.webp', tag: 'GPT' },
  { entity: 'google', name: 'Gemini', image: 'images/ai-brands/gemini-character.webp', tag: 'GEIM' },
];

function isEntity(v: string | null): v is Entity {
  return CAST.some((c) => c.entity === v);
}

export function useSection(id: SectionId) {
  const data = useData();
  return useAsync<SectionFile | null>(() => data.section(id), [data, id]);
}

export function sourceCount(articles: Article[]): number {
  return new Set(articles.map((a) => a.sourceId)).size;
}

/* ---------- Shared pieces ---------- */

export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="sec-stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function SectionEmpty() {
  const { t } = useI18n();
  return (
    <EmptyState title={t('section_empty')}>
      <p>{t('section_empty_body')}</p>
    </EmptyState>
  );
}

export function HowNote({ body = 'section_how_body' }: { body?: MessageKey }) {
  const { t } = useI18n();
  return (
    <aside className="sec-how" aria-labelledby="sec-how-title">
      <h2 id="sec-how-title">{t('section_how')}</h2>
      <p>{t(body)}</p>
      <a className="sec-how-link" href={href('/sources')}>
        {t('nav_sources')}
        <Icon name="arrow" size={14} directional />
      </a>
    </aside>
  );
}

/* ---------- AI Games ---------- */

function GameCell({ article, lead = false }: { article: Article; lead?: boolean }) {
  const { t, locale } = useI18n();
  const title = displayTitle(article, locale);
  const excerpt = displayExcerpt(article, locale);
  const external = safeUrl(article.url);
  const link = href(storyPath(article));
  const [noPhoto, setNoPhoto] = useState(() => {
    const url = article.image?.kind === 'fallback' ? null : resolveImageUrl(article.image?.url);
    return Boolean(url) && rememberedCardFit(url!) === 'hide';
  });
  const H = lead ? 'h2' : 'h3';
  return (
    <article className={`game-cell ${lead ? 'is-lead' : ''} ${noPhoto ? 'is-text-only' : ''}`} data-testid="game-cell">
      {!noPhoto && (
        <a href={link} className="game-cell-media" tabIndex={-1} aria-hidden="true">
          <StoryImage article={article} eager={lead} onFit={(fit) => setNoPhoto(fit === 'hide')} />
        </a>
      )}
      <div className="game-cell-body">
        <p className="game-cell-kicker">
          <span className="kicker-source">
            <SourceMark name={article.sourceName} />
            {article.sourceName}
          </span>
          <time dateTime={article.publishedAt} title={article.dateEstimated ? t('date_estimated') : undefined}>
            {formatDateTime(article.publishedAt, locale)}
            {article.dateEstimated && <span aria-hidden="true">*</span>}
          </time>
        </p>
        <H className="game-cell-title" lang={title.lang} dir="auto">
          <a href={link}>{title.text}</a>
        </H>
        {title.translated && <span className="mt-label">{t('translation_machine')}</span>}
        {excerpt.text && (
          <p className="game-cell-excerpt" lang={excerpt.lang} dir="auto">
            {excerpt.text}
          </p>
        )}
        <div className="game-cell-actions">
          <a className="game-read" href={link}>
            {t('card_read')}
            <Icon name="arrow" size={14} directional />
          </a>
          <span className="meta-spacer" />
          <BookmarkButton article={article} />
          {external && (
            <a className="icon-btn" href={external} target="_blank" rel="noopener noreferrer" aria-label={`${t('read_source')}: ${article.sourceName}`} title={t('read_source')}>
              <Icon name="external" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export function GamesPage({ params }: { params: URLSearchParams }) {
  const { t, locale } = useI18n();
  const res = useSection('ai-games');
  const raw = params.get('e');
  const entity = isEntity(raw) ? raw : null;
  const [shown, setShown] = useState(STEP + 1);

  const all = useMemo(() => (res.status === 'ready' ? (res.data?.articles ?? []) : []), [res.status, res.data]);
  const filtered = useMemo(() => (entity ? all.filter((a) => a.entities.includes(entity)) : all), [all, entity]);
  const visible = filtered.slice(0, shown);
  const [lead, ...rest] = visible;
  const latest = all[0];

  const pick = (next: Entity | null) => {
    setShown(STEP + 1);
    navigate('/ai-games', { e: next }, true);
  };

  const ticker = t('games_ticker');
  const wall = t('games_wall').split(' · ');

  return (
    <div className="games-page">
      <div className="games-ticker" aria-hidden="true">
        <Marquee repeat={2} duration={36} pauseOnHover={false}>
          {() => (
            <>
              {Array.from({ length: 4 }, (_, i) => (
                <span key={i} className="games-ticker-item">
                  {ticker}
                </span>
              ))}
            </>
          )}
        </Marquee>
      </div>

      <section className="games-hero" aria-labelledby="games-title">
        <figure className="games-poster">
          <img src={assetUrl('images/games/ai-games-poster.webp')} alt="" width={900} height={2009} loading="eager" decoding="async" />
          <figcaption>{t('games_art_note')}</figcaption>
        </figure>
        <div className="games-intro">
          <p className="games-kicker">
            <Icon name="gamepad" size={16} /> {t('nav_ai_games')}
          </p>
          <h1 id="games-title" className="games-title">
            {t('games_title')}
          </h1>
          <p className="games-body">{t('games_body')}</p>
          <p className="games-note">{t('games_cast_note')}</p>
        </div>
        <aside className="games-log" aria-label={t('section_log')}>
          <h2 className="games-log-title">{t('section_log')}</h2>
          <dl className="sec-stats">
            <Stat value={res.status === 'ready' ? formatNumber(res.data?.total ?? 0, locale) : '…'} label={t('section_stories')} />
            <Stat value={res.status === 'ready' ? formatNumber(sourceCount(all), locale) : '…'} label={t('section_sources')} />
            <Stat value={res.status === 'ready' ? formatNumber(res.data?.windowDays ?? 90, locale) : '…'} label={t('section_days')} />
          </dl>
          {latest && (
            <div className="games-log-latest">
              <span>{t('section_latest')}</span>
              <a href={href(storyPath(latest))} lang={displayTitle(latest, locale).lang} dir="auto">
                {displayTitle(latest, locale).text}
              </a>
            </div>
          )}
        </aside>
      </section>

      <div className="games-wall" aria-hidden="true">
        <Marquee repeat={2} duration={48} reverse pauseOnHover={false}>
          {() => (
            <>
              {Array.from({ length: 3 }, (_, round) =>
                wall.map((w) => (
                  <span key={`${round}-${w}`} className="games-wall-item">
                    {w}
                  </span>
                )),
              )}
            </>
          )}
        </Marquee>
      </div>

      <section className="games-cast" aria-labelledby="games-cast-title">
        <div className="games-cast-head">
          <h2 id="games-cast-title">{t('games_cast')}</h2>
          <p>{t('section_filter')}</p>
          <button type="button" className="games-chip" aria-pressed={entity === null} onClick={() => pick(null)}>
            {t('section_all')}
          </button>
        </div>
        <div className="games-cast-grid" role="group" aria-label={t('section_filter')}>
          {CAST.map((c) => (
            <button key={c.entity} type="button" className="games-char" aria-pressed={entity === c.entity} onClick={() => pick(entity === c.entity ? null : c.entity)}>
              <img src={assetUrl(c.image)} alt="" width={800} height={800} loading="lazy" decoding="async" />
              <span className="games-char-tag" lang="en" dir="ltr">
                +{c.tag}+
              </span>
              <span className="games-char-name" lang="en" dir="ltr">
                {c.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="games-feed" aria-label={t('nav_ai_games')}>
        {res.status === 'loading' && <Loading rows={2} />}
        {res.status === 'error' && <ErrorState onRetry={res.reload} />}
        {res.status === 'ready' &&
          (all.length === 0 ? (
            <SectionEmpty />
          ) : filtered.length === 0 ? (
            <EmptyState title={t('section_empty')}>
              <p>{t('games_empty_hint')}</p>
              <button type="button" className="btn" onClick={() => pick(null)}>
                {t('section_all')}
              </button>
            </EmptyState>
          ) : (
            <>
              <p className="games-count" aria-live="polite">
                {t('section_showing', { n: formatNumber(filtered.length, locale) })}
              </p>
              <div key={entity ?? 'all'} className="games-grid swap-in">
                {lead && <GameCell article={lead} lead />}
                {rest.map((a) => (
                  <GameCell key={a.id} article={a} />
                ))}
              </div>
              {filtered.length > shown && (
                <button type="button" className="btn games-more" onClick={() => setShown((n) => n + STEP)}>
                  {t('section_more')}
                </button>
              )}
            </>
          ))}
      </section>
      <HowNote />
    </div>
  );
}

/* ---------- Data Center Design ---------- */

export function DataCentersPage() {
  const { t, locale } = useI18n();
  const res = useSection('data-centers');
  const [shown, setShown] = useState(STEP);
  const all = useMemo(() => (res.status === 'ready' ? (res.data?.articles ?? []) : []), [res.status, res.data]);
  const [first, second, third, ...more] = all;

  return (
    <div className="page dc-page">
      <header className="page-head">
        <p className="eyebrow">
          <Icon name="server" size={14} /> {t('nav_data_centers')}
        </p>
        <h1 className="page-title">{t('dc_title')}</h1>
        <p className="page-intro">{t('dc_body')}</p>
        {res.status === 'ready' && (
          <dl className="sec-stats">
            <Stat value={formatNumber(res.data?.total ?? 0, locale)} label={t('section_stories')} />
            <Stat value={formatNumber(sourceCount(all), locale)} label={t('section_sources')} />
            <Stat value={formatNumber(res.data?.windowDays ?? 90, locale)} label={t('section_days')} />
          </dl>
        )}
      </header>
      {res.status === 'loading' && <Loading rows={2} />}
      {res.status === 'error' && <ErrorState onRetry={res.reload} />}
      {res.status === 'ready' &&
        (all.length === 0 ? (
          <SectionEmpty />
        ) : (
          <>
            <div className="picks-grid">
              <StoryCard article={first!} variant="feature" rank={1} eagerImage headingLevel={2} />
              {(second || third) && (
                <div className="picks-secondary">
                  {[second, third].map(
                    (a, i) => a && <StoryCard key={a.id} article={a} variant="split" rank={i + 2} eagerImage headingLevel={2} />,
                  )}
                </div>
              )}
            </div>
            {more.length > 0 && (
              <div className="picks-more">
                <p className="picks-more-label">{t('dc_also')}</p>
                <ol className="picks-list" start={4}>
                  {more.slice(0, shown).map((a, i) => (
                    <li key={a.id}>
                      <StoryCard article={a} variant="row" rank={i + 4} headingLevel={2} />
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {more.length > shown && (
              <button type="button" className="btn dc-more" onClick={() => setShown((n) => n + STEP)}>
                {t('section_more')}
              </button>
            )}
          </>
        ))}
      <HowNote />
    </div>
  );
}

export function SectionPage({ id, params }: { id: SectionId; params: URLSearchParams }) {
  if (id === 'videos') return <VideosPage />;
  return id === 'ai-games' ? <GamesPage params={params} /> : <DataCentersPage />;
}
