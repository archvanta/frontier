import { useCallback, useEffect, useRef, useState } from 'react';
import { sortNewestFirst, uniqueById } from '../lib/archive';
import { useData } from '../lib/dataContext';
import { pickHeroStories } from '../lib/heroStories';
import { useI18n } from '../lib/i18n';
import { motionMode, useMotionMode } from '../lib/motion';
import { parseHash } from '../lib/router';
import { INTRO_ENABLED, introSeen, markIntroSeen } from '../lib/tunnel';
import type { Article } from '../lib/types';
import { TunnelScene } from './TunnelScene';

/** Longest the opening waits for the stories to arrive; after that the site simply opens. */
const WAIT_MS = 1800;
const FLIGHT_MS = 3600;
const LEAVE_MS = 520;
const CARDS = 12;

function shouldRun(): boolean {
  return INTRO_ENABLED && motionMode() !== 'reduced' && !introSeen() && parseHash(window.location.hash).name === 'home';
}

/**
 * Opening animation: a corridor of today's real stories flies toward the camera, then the page appears.
 * Plays by itself (no scroll needed), once per browser session and only when the visit starts on the home page; skipped under
 * reduced motion. Any click, tap, key, wheel or touch ends it at once, so it never holds the visitor back or traps scroll.
 */
export function SiteIntro() {
  const [active, setActive] = useState(shouldRun);
  const close = useCallback(() => setActive(false), []);
  if (!active) return null;
  return <Overlay onClose={close} />;
}

function Overlay({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const data = useData();
  const lite = useMotionMode() === 'lite';
  const [stories, setStories] = useState<Article[] | null>(null);
  const [phase, setPhase] = useState<'wait' | 'play' | 'leave'>('wait');
  const root = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLDivElement>(null);
  const skip = useRef<HTMLButtonElement>(null);

  const leave = useCallback(() => setPhase((p) => (p === 'leave' ? p : 'leave')), []);

  // Real stories only: today's top picks first, then the newest, each with its own photo.
  useEffect(() => {
    let alive = true;
    const give = window.setTimeout(() => alive && onClose(), WAIT_MS);
    (async () => {
      const [index, picks] = await Promise.all([data.archiveIndex(), data.picks()]);
      const day = index?.days[0]?.day;
      const file = day ? await data.day(day) : null;
      const newest = uniqueById(sortNewestFirst(file?.articles ?? []));
      const picked = pickHeroStories(newest, picks, lite ? 5 : CARDS);
      if (!alive) return;
      window.clearTimeout(give);
      if (picked.length < 3) return onClose(); // nothing worth flying through
      markIntroSeen();
      setStories(picked);
      setPhase('play');
    })().catch(() => alive && onClose());
    return () => {
      alive = false;
      window.clearTimeout(give);
    };
  }, [data, lite, onClose]);

  useEffect(() => {
    skip.current?.focus({ preventScroll: true });
    const end = () => leave();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Tab') return; // let keyboard users reach the skip button
      end();
    };
    window.addEventListener('keydown', key);
    window.addEventListener('wheel', end, { passive: true });
    window.addEventListener('touchmove', end, { passive: true });
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('wheel', end);
      window.removeEventListener('touchmove', end);
    };
  }, [leave]);

  useEffect(() => {
    if (phase !== 'leave') return;
    const id = window.setTimeout(onClose, LEAVE_MS);
    return () => window.clearTimeout(id);
  }, [phase, onClose]);

  const onFrame = useCallback((p: number) => {
    const el = title.current;
    if (!el) return;
    const fadeIn = Math.min(1, p / 0.12);
    const fadeOut = p > 0.82 ? Math.max(0, (1 - p) / 0.18) : 1;
    el.style.opacity = String(Math.min(fadeIn, fadeOut) * 0.95);
    el.style.transform = `scale(${(0.8 + p * 0.5).toFixed(3)})`;
  }, []);

  return (
    <div ref={root} className="site-intro" data-phase={phase} role="dialog" aria-label="FRONTIER" onClick={leave}>
      {stories && <TunnelScene stories={stories} mode="intro" duration={lite ? 2400 : FLIGHT_MS} play={phase === 'play'} onFrame={onFrame} onDone={leave} />}
      <div ref={title} className="si-title" aria-hidden="true">
        <span className="si-word" lang="en" dir="ltr">
          FRONTIER
        </span>
        <span className="si-kicker">{t('intro_kicker')}</span>
      </div>
      <button ref={skip} type="button" className="si-skip" onClick={leave}>
        {t('intro_skip')}
      </button>
    </div>
  );
}
