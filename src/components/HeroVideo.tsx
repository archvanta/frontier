import { useEffect, useRef, useState } from 'react';
import { useMediaQuery } from '../lib/hooks';
import { useI18n } from '../lib/i18n';
import { Icon } from './Icon';
import { assetUrl } from './StoryImage';

/** In-page jumps can't use #fragments (the hash is the router), so scroll + focus instead. */
export function focusSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
  el.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}

const VIDEO_MP4 = assetUrl('videos/signal-ai-intro.mp4');
const VIDEO_WEBM = assetUrl('videos/signal-ai-intro.webm');
const POSTER = assetUrl('videos/signal-ai-intro-poster.webp');

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
}

function prefersLowData(): boolean {
  const c = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
  return Boolean(c?.saveData) || /(^|-)2g$/.test(c?.effectiveType ?? '');
}

/**
 * Wide cinematic intro: the clip is graded into the hero's lighting, copy sits in the scene. The clip has no audio track and is always muted.
 * - Autoplays only when ≥25% visible, pauses when scrolled away.
 * - Reduced motion, Save-Data/2G and small screens get the poster frame; the user may still press play.
 * - Fixed aspect ratio box, so nothing shifts while the video loads.
 */
export function HeroVideo() {
  const { t } = useI18n();
  const ref = useRef<HTMLVideoElement>(null);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const small = useMediaQuery('(max-width: 640px)');
  const [userChoice, setUserChoice] = useState<'play' | 'pause' | null>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const autoAllowed = !reducedMotion && !small && !prefersLowData();
  const wantPlay = userChoice === 'play' || (userChoice === null && autoAllowed);
  const loadVideo = wantPlay && !failed;

  useEffect(() => {
    const v = ref.current;
    if (!v || !loadVideo) return;
    const tryPlay = () => {
      let attempt: Promise<void>;
      try {
        attempt = Promise.resolve(v.play());
      } catch (err) {
        attempt = Promise.reject(err);
      }
      attempt.then(
        () => setPlaying(true),
        () => {
          setPlaying(false);
          if (userChoice === null) setUserChoice('pause'); // autoplay blocked: show poster + play button
        },
      );
    };
    if (typeof IntersectionObserver === 'undefined') {
      tryPlay();
      return () => v.pause();
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && entry.intersectionRatio >= 0.25) tryPlay();
        else {
          v.pause();
          setPlaying(false);
        }
      },
      { threshold: [0, 0.25, 0.6] },
    );
    io.observe(v);
    return () => {
      io.disconnect();
      v.pause();
    };
  }, [loadVideo, userChoice]);

  const toggle = () => {
    const v = ref.current;
    if (playing) {
      v?.pause();
      setPlaying(false);
      setUserChoice('pause');
    } else {
      setUserChoice('play');
    }
  };

  // The brand line stays English in both locales; the last word of the sub-line carries the accent.
  const sub = t('hero_sub');
  const cut = sub.lastIndexOf(' ');
  const subLead = cut > 0 ? sub.slice(0, cut + 1) : '';
  const subLast = cut > 0 ? sub.slice(cut + 1) : sub;

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-frame">
        <div className="hero-atmosphere" aria-hidden="true" />
        <div className={`hero-media ${playing ? 'is-playing' : ''}`}>
          {loadVideo ? (
            <video
              ref={ref}
              className="hero-video"
              poster={POSTER}
              muted
              playsInline
              loop
              preload="metadata"
              aria-hidden="true"
              tabIndex={-1}
              disablePictureInPicture
              onPause={() => setPlaying(false)}
              onPlay={() => setPlaying(true)}
              data-testid="hero-video"
            >
              {/* MP4 (H.264) first for Safari/iOS; VP9 WebM for browsers without H.264. */}
              <source src={VIDEO_MP4} type="video/mp4" />
              <source src={VIDEO_WEBM} type="video/webm" onError={() => setFailed(true)} />
            </video>
          ) : (
            <img className="hero-video" src={POSTER} alt="" width={1280} height={720} data-testid="hero-poster" />
          )}
          <div className="hero-grade" aria-hidden="true" />
        </div>
        <div className="hero-copy">
          <p className="hero-kicker">
            <span className="hero-kicker-dot" aria-hidden="true" />
            {t('hero_kicker')}
          </p>
          <h1 id="hero-title" className="hero-title" lang="en" dir="ltr">
            <span className="hero-line">{t('hero_title')}</span>
            <span className="hero-line hero-sub">
              {subLead}
              <span className="hero-accent">{subLast}</span>
            </span>
          </h1>
          <p className="hero-body">{t('hero_body')}</p>
          <div className="hero-actions">
            <button type="button" className="btn is-primary hero-cta" onClick={() => focusSection('top-signals')}>
              <Icon name="arrow" directional size={16} /> {t('hero_cta')}
            </button>
            {!failed && (
              <button type="button" className="btn is-glass hero-toggle" onClick={toggle}>
                <span className="hero-toggle-icon" aria-hidden="true">
                  <Icon name={playing ? 'pause' : 'play'} size={14} filled />
                </span>
                {playing ? t('hero_pause') : t('hero_play')}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
