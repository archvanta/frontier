import { useEffect, useRef, type CSSProperties } from 'react';
import { displayTitle, storyPath } from '../lib/article';
import { formatNumber, relativeTime } from '../lib/dates';
import { useI18n } from '../lib/i18n';
import { iconArt, type IconArtId } from '../lib/iconArt';
import type { IntroStats } from '../lib/introStats';
import { href } from '../lib/router';
import type { Article, PickEntry } from '../lib/types';
import { HalftoneWordmark } from './HalftoneWordmark';
import { Icon } from './Icon';
import { TunnelScene } from './TunnelScene';

/**
 * First scene of the homepage: what the site is, in one calm screen, with the three ways in. The page's h1 lives here.
 * The backdrop is plain CSS (drifting light, a moving grid, a light sweep and a few rising specks): transforms and opacity only, nothing to
 * download, and it stands still when the motion mode is not "full" or while the scene is off-screen.
 */
const SPECKS = [
  { x: 6, s: 3, d: 15, w: 0 },
  { x: 13, s: 2, d: 19, w: 6 },
  { x: 21, s: 4, d: 17, w: 3 },
  { x: 29, s: 2, d: 22, w: 9 },
  { x: 37, s: 3, d: 16, w: 1 },
  { x: 44, s: 2, d: 20, w: 11 },
  { x: 52, s: 4, d: 18, w: 5 },
  { x: 59, s: 2, d: 14, w: 8 },
  { x: 66, s: 3, d: 21, w: 2 },
  { x: 73, s: 2, d: 17, w: 12 },
  { x: 80, s: 4, d: 19, w: 4 },
  { x: 87, s: 3, d: 15, w: 10 },
  { x: 93, s: 2, d: 23, w: 7 },
] as const;

interface Entry {
  key: string;
  to: string;
  label: string;
  art: IconArtId;
  /** Stories published in the last 24 hours. */
  fresh?: number;
}

/** Everything below is read from the stored feed: no figure on this scene is estimated or made up. */
export interface IntroData {
  stats: IntroStats;
  signals: PickEntry[];
  now: Date;
}

export function HomeIntro({ onContinue, data, stories }: { onContinue: () => void; data: IntroData | null; stories?: readonly Article[] | null }) {
  const { t, locale } = useI18n();
  const stats = data?.stats;
  const root = useRef<HTMLElement>(null);

  // The backdrop only animates while the scene is on screen.
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      el?.setAttribute('data-live', 'true');
      return;
    }
    const io = new IntersectionObserver(([e]) => el.setAttribute('data-live', String(Boolean(e?.isIntersecting))), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const entries: Entry[] = [
    {
      key: 'ai-games',
      to: '/ai-games',
      label: t('nav_ai_games'),
      art: 'ai-games',
      fresh: stats?.fresh.sections['ai-games'],
    },
    { key: 'data-centers', to: '/data-centers', label: t('nav_data_centers'), art: 'data-centers', fresh: stats?.fresh.sections['data-centers'] },
    { key: 'ai-news', to: '/ai-news', label: t('intro_link_news'), art: 'ai-news', fresh: stats?.fresh.news },
  ];

  return (
    <section ref={root} className="home-intro" aria-labelledby="home-title" data-live="true">
      <div className="hi-backdrop" aria-hidden="true">
        <span className="hi-glow hi-glow-a" />
        <span className="hi-glow hi-glow-b" />
        <span className="hi-glow hi-glow-c" />
        <span className="hi-grid" />
        {stories && stories.length >= 3 && <TunnelScene stories={stories} mode="loop" />}
        <span className="hi-beam" />
        <span className="hi-specks">
          {SPECKS.map((p) => (
            <i key={p.x} style={{ '--x': `${p.x}%`, '--s': `${p.s}px`, '--d': `${p.d}s`, '--w': `-${p.w}s` } as CSSProperties} />
          ))}
        </span>
      </div>
      <div className="container hi-inner">
        <ul className={`hi-status ${stats ? 'is-ready' : ''}`} aria-label={t('signal_status')}>
          <li className="hi-live">
            <i aria-hidden="true" />
            {t('intro_live')}
          </li>
          {stats?.sources != null && <li>{t('intro_sources', { n: formatNumber(stats.sources, locale) })}</li>}
          {stats?.lastSignal && data && (
            <li>
              {t('intro_last_signal')}: <b>{relativeTime(stats.lastSignal, data.now, locale)}</b>
            </li>
          )}
          {stats?.topCompany && (
            <li>
              {t('intro_top_mention')}: <b>{stats.topCompany.name}</b>
            </li>
          )}
        </ul>
        <p className="hi-kicker">[ {t('intro_kicker')} ]</p>
        <h1 id="home-title" className="hi-title" lang="en" dir="ltr">
          <HalftoneWordmark word="FRONTIER" />
        </h1>
        <p className="hi-body">{t('intro_body')}</p>
        <nav className="hi-links" aria-label={t('intro_links')}>
          {entries.map((e) => (
            <a key={e.key} className="hi-link" href={href(e.to)} data-entry={e.key}>
              <img className="hi-link-art" src={iconArt(e.art)} alt="" width={52} height={52} decoding="async" />
              <span className="hi-link-label">{e.label}</span>
              {e.fresh ? (
                <span className="hi-link-count" title={t('intro_new_24h', { n: formatNumber(e.fresh, locale) })}>
                  +{formatNumber(e.fresh, locale)}
                  <span className="visually-hidden"> {t('intro_new_24h', { n: formatNumber(e.fresh, locale) })}</span>
                </span>
              ) : null}
              <Icon name="arrow" size={14} directional />
            </a>
          ))}
        </nav>
        <p className="hi-meta">{t('intro_meta')}</p>
      </div>
      <div className="container hi-signals">
        <div className="hi-signals-head">
          {data && data.signals.length > 0 ? <h2 className="hi-signals-title">{t('intro_top_signals')}</h2> : <span />}
          <button type="button" className="hi-scroll" onClick={onContinue}>
            <span>{t('intro_explore')}</span>
            <Icon name="chevronDown" size={16} />
          </button>
        </div>
        {data && data.signals.length > 0 && (
          <ol className="hi-signal-list">
            {data.signals.map((p, i) => {
              const title = displayTitle(p.article, locale);
              return (
                <li key={p.article.id}>
                  <a className="hi-signal" href={href(storyPath(p.article))}>
                    <span className="hi-signal-rank" aria-hidden="true">
                      {formatNumber(i + 1, locale)}
                    </span>
                    <span className="hi-signal-title" lang={title.lang} dir="auto">
                      {title.text}
                    </span>
                    {p.article.score && (
                      <span
                        className="hi-signal-score"
                        title={t('intro_score')}
                        aria-label={`${t('intro_score')} ${Math.round(p.article.score.total)}`}
                      >
                        {formatNumber(Math.round(p.article.score.total), locale)}
                      </span>
                    )}
                    <span className="hi-signal-meta">
                      {p.article.sourceName} · {relativeTime(p.article.publishedAt, data.now, locale)}
                    </span>
                  </a>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
