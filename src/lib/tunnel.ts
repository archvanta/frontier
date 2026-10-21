/**
 * The perspective "tunnel": story cards spread over a golden-angle spiral that fly toward the camera.
 * Shared by the opening animation (`SiteIntro`, plays once) and the hero backdrop (`TunnelScene` in loop mode).
 * Pure functions only: the components write the result straight to element styles from one rAF loop, so React never re-renders per frame.
 */
export interface TunnelSlot {
  /** Position on the spiral, as a fraction of the stage width/height. */
  fx: number;
  fy: number;
  rot: number;
}

export interface TunnelStage {
  width: number;
  height: number;
  mobile: boolean;
}

export interface TunnelFrame {
  /** Translation in px from the stage centre, depth in px. */
  x: number;
  y: number;
  z: number;
  opacity: number;
  /** Stacking order: nearer cards paint above farther ones. */
  order: number;
}

const GOLDEN = (137.5 * Math.PI) / 180;
/** Share of the timeline over which one card makes its trip; cards start staggered over the rest. */
export const STAGGER_SPAN = 0.55;

export function tunnelSlots(count: number): TunnelSlot[] {
  return Array.from({ length: count }, (_, i) => {
    const a = i * GOLDEN;
    return {
      fx: Math.cos(a) * (0.28 + (i % 3) * 0.08),
      fy: Math.sin(a) * (0.26 + (i % 2) * 0.09),
      rot: (i % 2 === 0 ? 1 : -1) * (3 + (i % 5) * 2),
    };
  });
}

export const tunnelPerspective = (s: TunnelStage): number => (s.mobile ? 900 : 1200);

export function cardWidth(s: TunnelStage): number {
  return s.mobile ? Math.max(130, Math.min(180, s.width * 0.38)) : Math.max(180, Math.min(270, s.width * 0.18));
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Fades in over the first `inEnd`, holds, fades out between `outStart` and 1. */
function envelope(p: number, inEnd: number, outStart: number): number {
  if (p <= 0 || p >= 1) return 0;
  if (p < inEnd) return p / inEnd;
  if (p > outStart) return (1 - p) / (1 - outStart);
  return 1;
}

/** One card at local progress `p` (0 = far away, 1 = passing the camera). */
export function cardFrame(slot: TunnelSlot, p: number, s: TunnelStage): TunnelFrame {
  const far = s.mobile ? -1200 : -1700;
  const near = s.mobile ? 350 : 500;
  return {
    x: slot.fx * s.width,
    y: slot.fy * s.height,
    z: lerp(far, near, clamp01(p)),
    opacity: envelope(p, 0.18, 0.82),
    order: Math.round(clamp01(p) * 100),
  };
}

/** Intro timeline: card `i` of `n` at overall progress `t` (0..1). */
export function introProgress(i: number, n: number, t: number): number {
  const start = (n > 1 ? i / (n - 1) : 0) * (1 - STAGGER_SPAN);
  return (t - start) / STAGGER_SPAN;
}

/** Loop timeline: every card keeps flying forever, evenly spread in depth; `cycles` counts finished periods (fractional). */
export function loopProgress(i: number, n: number, cycles: number): number {
  const v = (cycles + i / n) % 1;
  return v < 0 ? v + 1 : v;
}

/** Warp feel: eases in, so the first cards drift and the last ones rush past. */
export const warpEase = (t: number): number => {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
};

/** Master switch for the opening animation (`SiteIntro`). Off at the owner's request; the code stays so it can be turned back on. The hero backdrop is separate. */
export const INTRO_ENABLED = false;

/** Whether the opening animation should run: once per browser session, only on the home page, never under reduced motion. */
export const INTRO_KEY = 'signal-ai:intro-seen:v1';

/** Opt-out kept in localStorage (`signal-ai:intro` = `off`): used by the e2e suite so the overlay never covers the page under test. */
export const INTRO_OFF_KEY = 'signal-ai:intro';

export function introSeen(): boolean {
  try {
    return window.sessionStorage.getItem(INTRO_KEY) === '1' || window.localStorage.getItem(INTRO_OFF_KEY) === 'off';
  } catch {
    return false;
  }
}

export function markIntroSeen(): void {
  try {
    window.sessionStorage.setItem(INTRO_KEY, '1');
  } catch {
    /* storage blocked: the intro may play again next load, nothing else */
  }
}
