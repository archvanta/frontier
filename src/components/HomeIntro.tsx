import { useEffect, useRef } from 'react';
import { formatNumber, relativeTime } from '../lib/dates';
import { useI18n } from '../lib/i18n';
import { iconArt, type IconArtId } from '../lib/iconArt';
import type { IntroStats } from '../lib/introStats';
import { useMotionMode } from '../lib/motion';
import { href } from '../lib/router';
import { HalftoneWordmark } from './HalftoneWordmark';
import { Icon } from './Icon';

/**
 * Masthead of the homepage: the FRONTIER wordmark over the short film, a one-line promise, three honest numbers from the stored feed and
 * a row of desks. It is deliberately short, so the lead stories start inside the first screen on phones and desktops. The page's h1 lives here.
 */

/** Everything below is read from the stored feed and meta.json: no figure on this masthead is estimated or made up. */
export interface IntroData {
  stats: IntroStats;
  now: Date;
  /** meta.dataUpdatedAt: when the collector last stored news. */
  updatedAt: string | null;
}

interface Desk {
  key: string;
  to: string;
  label: string;
  art: IconArtId;
  /** Stories published in the last 24 hours. */
  fresh?: number;
}

/** Collector runs land a few times a day (GitHub throttles scheduled runs), so "live" is only claimed for data stored in the last 3 hours. */
const LIVE_MS = 3 * 3600 * 1000;

export function HomeIntro({ onContinue, data }: { onContinue: () => void; data: IntroData | null }) {
  const { t, locale } = useI18n();
  const stats = data?.stats;
  const motionMode = useMotionMode();
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  // Play the film only while the masthead is on screen, never on Save-Data/reduced motion, and only after first paint.
  useEffect(() => {
    const el = root.current;
    const film = video.current;
    if (!el || !film || typeof IntersectionObserver === 'undefined') return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let startTimer = 0;
    let onScreen = true;
    const sync = () => {
      window.clearTimeout(startTimer);
      if (onScreen && !motion.matches && motionMode === 'full') {
        startTimer = window.setTimeout(() => void film.play().catch(() => undefined), 650);
      } else film.pause();
    };
    const io = new IntersectionObserver(([e]) => {
      onScreen = Boolean(e?.isIntersecting);
      sync();
    });
    io.observe(el);
    motion.addEventListener('change', sync);
    return () => {
      io.disconnect();
      window.clearTimeout(startTimer);
      motion.removeEventListener('change', sync);
    };
  }, [motionMode]);

  const desks: Desk[] = [
    { key: 'ai-news', to: '/ai-news', label: t('intro_link_news'), art: 'ai-news', fresh: stats?.fresh.news },
    { key: 'ai-games', to: '/ai-games', label: t('nav_ai_games'), art: 'ai-games', fresh: stats?.fresh.sections['ai-games'] },
    { key: 'data-centers', to: '/data-centers', label: t('nav_data_centers'), art: 'data-centers', fresh: stats?.fresh.sections['data-centers'] },
    { key: 'videos', to: '/videos', label: t('nav_videos'), art: 'videos', fresh: stats?.fresh.sections.videos },
  ];

  const updatedMs = data?.updatedAt ? Date.parse(data.updatedAt) : NaN;
  const live = data && !Number.isNaN(updatedMs) && data.now.getTime() - updatedMs <= LIVE_MS;

  return (
    <section ref={root} className="home-masthead" aria-labelledby="home-title">
      <div className="container hm-inner">
        <div className="hm-card">
          <video
            ref={video}
            className="hm-film"
            muted
            loop
            playsInline
            preload="none"
            poster={`${import.meta.env.BASE_URL}media/frontier-hero-poster.webp`}
            aria-hidden="true"
          >
            <source src={`${import.meta.env.BASE_URL}media/frontier-hero.mp4`} type="video/mp4" />
          </video>
          <span className="hm-scrim" aria-hidden="true" />
          <div className="hm-copy">
            <p className="hi-kicker hm-kicker">[ {t('intro_kicker')} ]</p>
            <h1 id="home-title" className="hi-title hm-title" lang="en" dir="ltr">
              <HalftoneWordmark word="FRONTIER" />
            </h1>
            <p className="hm-body">{t('intro_body')}</p>
          </div>
          <div className="hm-side">
            <dl className="hm-stats" aria-label={t('signal_status')}>
              <div className="hm-stat is-updated" data-live={live ? 'true' : 'false'}>
                <dt>
                  <i aria-hidden="true" />
                  {t('intro_updated_label')}
                </dt>
                <dd>{data?.updatedAt ? relativeTime(data.updatedAt, data.now, locale) : '—'}</dd>
              </div>
              <div className="hm-stat">
                <dt>{t('intro_fresh_24h')}</dt>
                <dd>{stats ? formatNumber(stats.fresh.news, locale) : '—'}</dd>
              </div>
              <div className="hm-stat">
                <dt>{t('intro_sources_label')}</dt>
                <dd>{stats?.sources != null ? formatNumber(stats.sources, locale) : '—'}</dd>
              </div>
            </dl>
            <button type="button" className="hm-cta" onClick={onContinue}>
              <span>{t('intro_read_today')}</span>
              <Icon name="chevronDown" size={18} />
            </button>
          </div>
        </div>
        <nav className="hm-desks" aria-label={t('intro_links')}>
          {desks.map((d) => (
            <a key={d.key} className="hm-desk" href={href(d.to)} data-desk={d.key}>
              <img className="hm-desk-art" src={iconArt(d.art)} alt="" width={32} height={32} decoding="async" />
              <span className="hm-desk-label">{d.label}</span>
              {d.fresh != null && d.fresh > 0 && (
                <span className="hm-desk-count" title={t('intro_new_24h', { n: formatNumber(d.fresh, locale) })}>
                  {/* The plus sign stays in front of the number in Persian too. */}
                  <span dir="ltr">+{formatNumber(d.fresh, locale)}</span>
                  <span className="visually-hidden"> {t('intro_new_24h', { n: formatNumber(d.fresh, locale) })}</span>
                </span>
              )}
              <Icon name="arrow" size={14} directional />
            </a>
          ))}
        </nav>
      </div>
    </section>
  );
}
