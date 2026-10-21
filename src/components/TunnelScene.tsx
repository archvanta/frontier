import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { displayTitle } from '../lib/article';
import { useI18n } from '../lib/i18n';
import { useMotionMode } from '../lib/motion';
import { genuineImage } from '../lib/heroStories';
import {
  cardFrame,
  cardWidth,
  introProgress,
  loopProgress,
  tunnelPerspective,
  tunnelSlots,
  warpEase,
  type TunnelFrame,
  type TunnelStage,
} from '../lib/tunnel';
import type { Article } from '../lib/types';
import { fallbackFor, resolveImageUrl } from './StoryImage';

/** Seconds a card takes to cross the whole tunnel in the looping backdrop (slow: it is a background, not an event). */
const LOOP_PERIOD_S = 40;

interface Props {
  stories: readonly Article[];
  /** `intro`: one eased flight of `duration` ms, then `onDone`. `loop`: endless drift while on screen. */
  mode: 'intro' | 'loop';
  duration?: number;
  /** Intro: called every frame with the eased overall progress (0..1), for the title in front of the tunnel. */
  onFrame?: (t: number) => void;
  onDone?: () => void;
  /** Intro: the flight waits until this is true (data and first images are in). */
  play?: boolean;
  className?: string;
}

function readStage(el: HTMLElement): TunnelStage {
  const r = el.getBoundingClientRect();
  return { width: r.width, height: r.height, mobile: r.width < 768 };
}

function place(el: HTMLElement, f: TunnelFrame, rot: number, alpha: number) {
  el.style.transform = `translate3d(calc(-50% + ${f.x.toFixed(1)}px), calc(-50% + ${f.y.toFixed(1)}px), ${f.z.toFixed(1)}px) rotateZ(${rot}deg)`;
  el.style.opacity = (f.opacity * alpha).toFixed(3);
  el.style.zIndex = String(f.order);
}

/**
 * Real stories flying toward the camera through a perspective corridor. Decorative (aria-hidden): every story is also on the page.
 * Cards are positioned from one requestAnimationFrame loop that writes `transform`/`opacity` directly (no React renders per frame),
 * the loop pauses while the scene is off-screen or the tab is hidden, and stands still unless motion is "full".
 */
export function TunnelScene({ stories, mode, duration = 3600, onFrame, onDone, play = true, className = '' }: Props) {
  const { locale } = useI18n();
  const motion = useMotionMode();
  const root = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLElement | null)[]>([]);
  const [stage, setStage] = useState<TunnelStage>({ width: 1440, height: 900, mobile: false });
  const stageRef = useRef(stage);
  const [broken, setBroken] = useState<ReadonlySet<string>>(new Set());
  // Cards whose photo failed are dropped, so a flying card never shows a broken image.
  const shown = stories.filter((a) => !broken.has(a.id));
  const count = shown.length;
  const slots = useMemo(() => tunnelSlots(count), [count]);
  const callbacks = useRef({ onFrame, onDone });
  useEffect(() => {
    callbacks.current = { onFrame, onDone };
  });

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const measure = () => {
      const s = readStage(el);
      stageRef.current = s;
      setStage((prev) => (prev.width === s.width && prev.height === s.height ? prev : s));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // A still backdrop is laid out again when the stage is resized; the intro must not restart on resize.
  const loopStage = mode === 'loop' ? stage : null;
  useEffect(() => {
    const el = root.current;
    if (!el || count === 0) return;
    const alpha = mode === 'loop' ? 0.34 : 1;
    const render = (progressOf: (i: number) => number) => {
      for (let i = 0; i < count; i++) {
        const c = cards.current[i];
        const slot = slots[i];
        if (c && slot) place(c, cardFrame(slot, progressOf(i), stageRef.current), slot.rot, alpha);
      }
    };

    if (mode === 'loop') {
      // A still frame when motion is reduced/lite or the browser has no observer: same composition, nothing moves.
      render((i) => loopProgress(i, count, 0.15));
      if (motion !== 'full' || typeof IntersectionObserver === 'undefined') return;
      let raf = 0;
      let visible = true;
      let last: number | null = null;
      let cycles = 0.15;
      const tick = (now: number) => {
        cycles += last === null ? 0 : (now - last) / 1000 / LOOP_PERIOD_S;
        last = now;
        render((i) => loopProgress(i, count, cycles));
        raf = requestAnimationFrame(tick);
      };
      const start = () => {
        last = null;
        raf = requestAnimationFrame(tick);
      };
      const io = new IntersectionObserver(([e]) => {
        const v = Boolean(e?.isIntersecting);
        if (v === visible) return;
        visible = v;
        cancelAnimationFrame(raf);
        if (v) start();
      });
      io.observe(el);
      start();
      return () => {
        cancelAnimationFrame(raf);
        io.disconnect();
      };
    }

    // Intro: everything starts out of sight; once `play` is true one eased flight runs, then onDone.
    render(() => 0);
    if (!play) return;
    let raf = 0;
    let t0: number | null = null;
    const tick = (now: number) => {
      t0 ??= now;
      const raw = Math.min(1, (now - t0) / duration);
      const t = warpEase(raw);
      render((i) => introProgress(i, count, t));
      callbacks.current.onFrame?.(t);
      if (raw < 1) raf = requestAnimationFrame(tick);
      else callbacks.current.onDone?.();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode, motion, count, slots, play, duration, loopStage]);

  const w = cardWidth(stage);
  return (
    <div
      ref={root}
      className={`tunnel tunnel-${mode} ${className}`}
      aria-hidden="true"
      style={{ perspective: `${tunnelPerspective(stage)}px`, '--tn-w': `${Math.round(w)}px` } as CSSProperties}
    >
      {shown.map((a, i) => {
        const img = genuineImage(a);
        // The story's own photo, else its category artwork (never anything invented).
        const src = resolveImageUrl(img?.url) ?? fallbackFor(a.category);
        const title = displayTitle(a, locale);
        return (
          <figure
            key={a.id}
            ref={(el) => {
              cards.current[i] = el;
            }}
            className="tn-card"
          >
            <img
              src={src}
              alt=""
              draggable={false}
              decoding="async"
              loading={mode === 'intro' ? 'eager' : 'lazy'}
              referrerPolicy="no-referrer"
              onError={() => setBroken((b) => new Set(b).add(a.id))}
            />
            <figcaption>
              <span className="tn-src">{a.sourceName}</span>
              <span className="tn-title" lang={title.lang} dir="auto">
                {title.text}
              </span>
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
