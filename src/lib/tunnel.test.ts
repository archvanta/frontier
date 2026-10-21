import { describe, expect, it } from 'vitest';
import { cardFrame, INTRO_KEY, introProgress, introSeen, loopProgress, markIntroSeen, tunnelSlots, warpEase, STAGGER_SPAN } from './tunnel';

const stage = { width: 1440, height: 900, mobile: false };

describe('tunnel timeline', () => {
  it('spreads cards over the spiral without stacking them', () => {
    const slots = tunnelSlots(9);
    expect(slots).toHaveLength(9);
    const keys = new Set(slots.map((s) => `${s.fx.toFixed(3)},${s.fy.toFixed(3)}`));
    expect(keys.size).toBe(9);
  });

  it('flies a card from far and invisible to near and invisible, brightest in between', () => {
    const slot = tunnelSlots(1)[0]!;
    const far = cardFrame(slot, 0, stage);
    const mid = cardFrame(slot, 0.5, stage);
    const near = cardFrame(slot, 1, stage);
    expect(far.opacity).toBe(0);
    expect(near.opacity).toBe(0);
    expect(mid.opacity).toBe(1);
    expect(far.z).toBeLessThan(mid.z);
    expect(mid.z).toBeLessThan(near.z);
    expect(mid.order).toBeGreaterThan(far.order);
  });

  it('uses a shallower tunnel on phones', () => {
    const slot = tunnelSlots(1)[0]!;
    expect(cardFrame(slot, 0, { ...stage, mobile: true }).z).toBeGreaterThan(cardFrame(slot, 0, stage).z);
  });

  it('starts cards one after another and finishes the last one exactly at the end', () => {
    expect(introProgress(0, 9, 0)).toBe(0);
    expect(introProgress(4, 9, 0)).toBeLessThan(0);
    expect(introProgress(8, 9, 1)).toBeCloseTo(1, 10);
    expect(STAGGER_SPAN).toBeLessThan(1);
  });

  it('loops: progress stays within [0, 1) and cards are evenly spaced in depth', () => {
    for (const c of [0, 0.37, 5.9, -0.2]) {
      for (let i = 0; i < 6; i++) {
        const p = loopProgress(i, 6, c);
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThan(1);
      }
    }
    expect(loopProgress(3, 6, 0)).toBeCloseTo(0.5, 10);
  });

  it('eases in and out and clamps', () => {
    expect(warpEase(-1)).toBe(0);
    expect(warpEase(2)).toBe(1);
    expect(warpEase(0.25)).toBeLessThan(0.25);
  });
});

describe('once per session', () => {
  it('remembers that the intro was shown', () => {
    window.sessionStorage.removeItem(INTRO_KEY);
    expect(introSeen()).toBe(false);
    markIntroSeen();
    expect(introSeen()).toBe(true);
  });
});
