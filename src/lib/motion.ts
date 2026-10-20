import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type RefCallback, type RefObject } from 'react';
import { flushSync } from 'react-dom';

/**
 * The motion system in one place. The CSS side lives in `styles/motion.css` and reads the same values from tokens
 * (`--ease-out`, `--dur-*` in `styles/tokens.css`); keep them in sync.
 *
 * Modes (`<html data-motion>`):
 * - `full`    : everything on.
 * - `lite`    : Save-Data, a 2G connection or a low-memory device. Short fades only: no blur, no scroll-linked effects.
 * - `reduced` : `prefers-reduced-motion`. Nothing moves; state changes are instant.
 */
export const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
export const DUR = { press: 140, tab: 200, overlay: 240, page: 380, reveal: 640 } as const;
/** Entrance stagger between siblings revealed together, capped so a long list never waits on itself. */
export const STAGGER_MS = 60;
export const STAGGER_MAX = 5;

export type MotionMode = 'full' | 'lite' | 'reduced';

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
}

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';

function prefersReduced(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(REDUCE_QUERY).matches;
}

function isLowPower(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { connection?: NetworkInformationLike; deviceMemory?: number };
  const c = nav.connection;
  return Boolean(c?.saveData) || /(^|-)2g$/.test(c?.effectiveType ?? '') || (nav.deviceMemory !== undefined && nav.deviceMemory <= 2);
}

export function motionMode(): MotionMode {
  if (prefersReduced()) return 'reduced';
  return isLowPower() ? 'lite' : 'full';
}

const modeListeners = new Set<() => void>();

function applyMode() {
  const root = document.documentElement;
  root.dataset.motion = motionMode();
  root.dataset.vtSupport = typeof (document as DocWithVT).startViewTransition === 'function' ? 'yes' : 'no';
  modeListeners.forEach((l) => l());
}

/** Sets `data-motion` (and `data-vt-support`) on <html> and keeps them current. Call once before the first render. */
export function initMotion(): () => void {
  applyMode();
  if (typeof window.matchMedia !== 'function') return () => undefined;
  const mq = window.matchMedia(REDUCE_QUERY);
  mq.addEventListener?.('change', applyMode);
  return () => mq.removeEventListener?.('change', applyMode);
}

export function useMotionMode(): MotionMode {
  return useSyncExternalStore(
    (cb) => {
      modeListeners.add(cb);
      return () => modeListeners.delete(cb);
    },
    motionMode,
    () => 'full',
  );
}

/* ---------- View transitions (pages, language, theme) with an instant fallback ---------- */

interface ViewTransitionLike {
  finished: Promise<void>;
  ready?: Promise<void>;
  updateCallbackDone?: Promise<void>;
}
type DocWithVT = Document & { startViewTransition?: (cb: () => void | Promise<void>) => ViewTransitionLike };

/** What a transition is for; `styles/motion.css` picks its animation from `<html data-vt>`. */
export type TransitionKind = 'page' | 'lang' | 'theme';

export function viewTransitionsAvailable(): boolean {
  return typeof document !== 'undefined' && typeof (document as DocWithVT).startViewTransition === 'function' && motionMode() !== 'reduced';
}

/**
 * Runs `update` (a state change that swaps what is on screen) inside a view transition when the browser has them and
 * motion is allowed; otherwise runs it at once and the CSS entrance of the new view (if any) is the only motion.
 * `flushSync` makes React commit before the browser captures the new snapshot, so there is never a blank frame.
 */
export function runTransition(update: () => void, kind: TransitionKind): void {
  if (!viewTransitionsAvailable()) {
    update();
    return;
  }
  const root = document.documentElement;
  try {
    root.dataset.vt = kind;
    const vt = (document as DocWithVT).startViewTransition!(() => {
      flushSync(update);
    });
    // A transition overtaken by a newer one is skipped and its promises reject; that is expected, not an error.
    void vt.ready?.catch(() => undefined);
    void vt.updateCallbackDone?.catch(() => undefined);
    void vt.finished
      .catch(() => undefined)
      .finally(() => {
        if (root.dataset.vt === kind) delete root.dataset.vt;
      });
  } catch {
    delete root.dataset.vt;
    update();
  }
}

/* ---------- Scroll reveal ---------- */

export type RevealVariant = 'up' | 'head' | 'feature';
let revealObserver: IntersectionObserver | null = null;

function observer(): IntersectionObserver | null {
  if (revealObserver || typeof IntersectionObserver === 'undefined') return revealObserver;
  revealObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
      visible.forEach((e, i) => {
        const el = e.target as HTMLElement;
        el.style.setProperty('--ri', String(Math.min(i, STAGGER_MAX)));
        el.dataset.reveal = 'in';
        revealObserver?.unobserve(el); // each element animates once
      });
    },
    { rootMargin: '0px 0px -4% 0px', threshold: 0.04 },
  );
  return revealObserver;
}

/**
 * Ref callback: the element waits hidden (`data-reveal="pending"`) and animates in once, the first time it scrolls into
 * view; nearby elements entering together are staggered (at most STAGGER_MAX steps). Without IntersectionObserver, or
 * when motion is reduced, it is simply shown. `variant` picks the keyframes in motion.css.
 */
export function useReveal<T extends HTMLElement>(variant: RevealVariant = 'up'): RefCallback<T> {
  return useCallback(
    (el: T | null) => {
      if (!el) return;
      el.dataset.revealVariant = variant;
      if (el.dataset.reveal === 'in') return;
      const io = motionMode() === 'reduced' ? null : observer();
      if (!io) {
        el.dataset.reveal = 'in';
        el.style.setProperty('--ri', '0');
        return;
      }
      el.dataset.reveal = 'pending';
      io.observe(el);
      return () => io.unobserve(el);
    },
    [variant],
  );
}

/* ---------- Sliding active indicator for segmented controls ---------- */

const ACTIVE = "[aria-selected='true'], [aria-pressed='true'], [aria-current='page']";

/**
 * Moves one highlight under the active item of a segmented control (tabs, chips, the language switch). The container
 * gets `--ind-x/-y/-w/-h` (px) and `--ind-o`; motion.css draws `::before` from them. The first placement is instant
 * (`data-ind-ready` is set a frame later), so nothing slides in on mount; until then the active item paints its own
 * background, so there is never a frame without a highlight.
 */
export function useSlidingIndicator<T extends HTMLElement>(dep: unknown): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add('has-indicator');
    const measure = () => {
      const a = el.querySelector<HTMLElement>(ACTIVE);
      if (!a || a.offsetParent !== el) {
        el.style.setProperty('--ind-o', '0');
        return;
      }
      el.style.setProperty('--ind-x', `${a.offsetLeft}px`);
      el.style.setProperty('--ind-y', `${a.offsetTop}px`);
      el.style.setProperty('--ind-w', `${a.offsetWidth}px`);
      el.style.setProperty('--ind-h', `${a.offsetHeight}px`);
      el.style.setProperty('--ind-o', '1');
    };
    measure();
    const raf = requestAnimationFrame(() => {
      el.dataset.indReady = '';
    });
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    ro?.observe(el);
    el.querySelectorAll<HTMLElement>(':scope > *').forEach((c) => ro?.observe(c));
    void document.fonts?.ready.then(measure);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [dep]);
  return ref;
}

/* ---------- Exit animations for things that unmount when closed ---------- */

/**
 * Keeps a closing panel mounted for `ms` so it can animate out. Returns whether to render it and whether it is closing
 * (render it `inert` then, so a closing menu can never take focus or clicks). Reduced motion closes at once.
 */
export function usePresence(open: boolean, ms: number = DUR.overlay): { mounted: boolean; closing: boolean } {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    if (motionMode() === 'reduced') {
      setMounted(false);
      return;
    }
    const id = window.setTimeout(() => setMounted(false), ms);
    return () => window.clearTimeout(id);
  }, [open, ms]);
  // Under reduced motion a closed panel leaves in the same render, not an effect later.
  if (motionMode() === 'reduced') return { mounted: open, closing: false };
  return { mounted: open || mounted, closing: !open && mounted };
}
