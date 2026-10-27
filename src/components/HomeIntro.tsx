import { useEffect, useRef } from 'react';
import { displayTitle, storyPath } from '../lib/article';
import { formatNumber, relativeTime } from '../lib/dates';
import { useI18n } from '../lib/i18n';
import { iconArt, type IconArtId } from '../lib/iconArt';
import type { IntroStats } from '../lib/introStats';
import { useMotionMode } from '../lib/motion';
import { href } from '../lib/router';
import type { PickEntry } from '../lib/types';
import { HalftoneWordmark } from './HalftoneWordmark';
import { Icon } from './Icon';

/**
 * First scene of the homepage: a cinematic film, the site identity and the four ways into the coverage. The page's h1 lives here.
 */

interface Entry {
  key: string;
  to: string;
  params?: Record<string, string>;
  label: string;
  desc: string;
  art: IconArtId;
  /** Stories published in the last 24 hours. */
  fresh?: number;
}

/** Everything below is read from the stored feed: no figure on this scene is estimated or made up. */
export interface IntroData {
  stats: IntroStats;
  signals: PickEntry[];
  now: Date;
  architectureFresh: number;
}

export function HomeIntro({ onContinue, data }: { onContinue: () => void; data: IntroData | null }) {
  const { t, locale } = useI18n();
  const stats = data?.stats;
  const motionMode = useMotionMode();
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  // Decode and play the film only while the scene is on screen.
  useEffect(() => {
    const el = root.current;
    const film = video.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      el?.setAttribute('data-live', 'true');
      return;
    }
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let startTimer = 0;
    const sync = (live: boolean) => {
      el.setAttribute('data-live', String(live));
      if (!film) return;
      window.clearTimeout(startTimer);
      if (live && !motion.matches && motionMode === 'full') {
        // Keep media fetch/decode out of the critical first paint. The poster makes the hero complete
        // immediately; the compact loop starts once React and the initial feed have settled.
        startTimer = window.setTimeout(() => void film.play().catch(() => undefined), 650);
      } else film.pause();
    };
    const io = new IntersectionObserver(([e]) => sync(Boolean(e?.isIntersecting)), { threshold: 0 });
    io.observe(el);
    const onMotion = () => sync(el.getAttribute('data-live') !== 'false');
    motion.addEventListener('change', onMotion);
    return () => {
      io.disconnect();
      window.clearTimeout(startTimer);
      motion.removeEventListener('change', onMotion);
    };
  }, [motionMode]);

  const entries: Entry[] = [
    {
      key: 'ai-games',
      to: '/ai-games',
      label: t('nav_ai_games'),
      desc: t('menu_ai_games_d'),
      art: 'ai-games',
      fresh: stats?.fresh.sections['ai-games'],
    },
    {
      key: 'data-centers',
      to: '/data-centers',
      label: t('nav_data_centers'),
      desc: t('menu_data_centers_d'),
      art: 'data-centers',
      fresh: stats?.fresh.sections['data-centers'],
    },
    {
      key: 'architecture',
      to: '/explore',
      params: { q: 'architecture' },
      label: t('nav_architecture'),
      desc: t('menu_architecture_d'),
      art: 'architecture',
      fresh: data?.architectureFresh,
    },
    { key: 'ai-news', to: '/ai-news', label: t('intro_link_news'), desc: t('menu_ai_news_d'), art: 'ai-news', fresh: stats?.fresh.news },
  ];
  const freshTotal = stats?.fresh.news ?? 0;

  return (
    <section ref={root} className="home-intro" aria-labelledby="home-title" data-live="true">
      <div className="container hi-inner">
        <header className="hi-dashboard-head">
          <p className="hi-overview">
            {t('intro_overview')}
            <span>{t('intro_updated_today')}</span>
          </p>
          <div className="hi-head-pills" aria-label={t('signal_status')}>
            <span className="is-active">24H</span>
            {stats?.sources != null && <span>{t('intro_sources', { n: formatNumber(stats.sources, locale) })}</span>}
          </div>
        </header>

        <div className="hi-bento">
          <div className="hi-primary-card">
            <video
              ref={video}
              className="hi-hero-video"
              muted
              loop
              playsInline
              preload="none"
              poster={`${import.meta.env.BASE_URL}media/frontier-hero-poster.webp`}
              aria-hidden="true"
            >
              <source src={`${import.meta.env.BASE_URL}media/frontier-hero.mp4`} type="video/mp4" />
            </video>
            <span className="hi-hero-scrim" aria-hidden="true" />
            <span className="hi-card-rim" aria-hidden="true" />
            <p className="hi-kicker">[ {t('intro_kicker')} ]</p>
            <h1 id="home-title" className="hi-title" lang="en" dir="ltr">
              <HalftoneWordmark word="FRONTIER" />
            </h1>
            <div className="hi-hero-copy">
              <p className="hi-body">{t('intro_body')}</p>
              <a className="hi-join" href={href('/signin', { mode: 'create' })}>
                <span>{t('intro_join')}</span>
                <i aria-hidden="true"><Icon name="arrow" size={18} directional /></i>
              </a>
            </div>
          </div>

          <aside className="hi-coverage-card" aria-label={t('intro_fresh_24h')}>
            <span className="hi-card-rim" aria-hidden="true" />
            <header>
              <h2>{t('intro_coverage')}</h2>
              <span>24H</span>
            </header>
            <div className="hi-gauge">
              <span className="hi-gauge-ticks" aria-hidden="true" />
              <strong>{formatNumber(freshTotal, locale)}</strong>
              <small>{t('intro_fresh_24h')}</small>
            </div>
            <ul>
              {entries.map((entry) => (
                <li key={entry.key} data-entry={entry.key}>
                  <i aria-hidden="true" />
                  <span>{entry.label}</span>
                  <b>{formatNumber(entry.fresh ?? 0, locale)}</b>
                </li>
              ))}
            </ul>
          </aside>

          <nav className="hi-links" aria-label={t('intro_links')}>
            {entries.map((e) => (
              <a key={e.key} className="hi-link" href={href(e.to, e.params)} data-entry={e.key}>
                <img className="hi-link-art" src={iconArt(e.art)} alt="" width={52} height={52} decoding="async" />
                <span className="hi-link-label">{e.label}</span>
                <span className="hi-link-desc">{e.desc}</span>
                <span className="hi-link-count" title={t('intro_new_24h', { n: formatNumber(e.fresh ?? 0, locale) })}>
                  +{formatNumber(e.fresh ?? 0, locale)}
                  <span className="visually-hidden"> {t('intro_new_24h', { n: formatNumber(e.fresh ?? 0, locale) })}</span>
                </span>
                <Icon name="arrow" size={14} directional />
              </a>
            ))}
          </nav>

          <ul className={`hi-status ${stats ? 'is-ready' : ''}`} aria-label={t('signal_status')}>
            <li className="hi-live">
              <i aria-hidden="true" />
              {t('intro_live')}
            </li>
            {stats?.lastSignal && data && (
              <li>
                <span>{t('intro_last_signal')}</span>
                <b>{relativeTime(stats.lastSignal, data.now, locale)}</b>
              </li>
            )}
            {stats?.topCompany && (
              <li>
                <span>{t('intro_top_mention')}</span>
                <b>{stats.topCompany.name}</b>
              </li>
            )}
          </ul>
        </div>
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
