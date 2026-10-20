import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DUR, initMotion, motionMode, runTransition, usePresence } from './motion';
import { routePath } from './router';

type Doc = { startViewTransition?: unknown };

function mockReduced(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((q: string) => ({ matches: reduced && q.includes('reduce'), media: q, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  delete (document as unknown as Doc).startViewTransition;
  delete document.documentElement.dataset.vt;
  Reflect.deleteProperty(navigator, 'connection');
});

describe('motionMode', () => {
  beforeEach(() => mockReduced(false));

  it('is full by default and reduced when the user asks for less motion', () => {
    expect(motionMode()).toBe('full');
    mockReduced(true);
    expect(motionMode()).toBe('reduced');
  });

  it('is lite with Save-Data or a 2G connection', () => {
    Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true });
    expect(motionMode()).toBe('lite');
    Object.defineProperty(navigator, 'connection', { value: { effectiveType: 'slow-2g' }, configurable: true });
    expect(motionMode()).toBe('lite');
    Object.defineProperty(navigator, 'connection', { value: { effectiveType: '4g' }, configurable: true });
    expect(motionMode()).toBe('full');
  });

  it('writes the mode and view-transition support to <html>', () => {
    initMotion();
    expect(document.documentElement.dataset.motion).toBe('full');
    expect(document.documentElement.dataset.vtSupport).toBe('no');
  });
});

describe('runTransition', () => {
  beforeEach(() => mockReduced(false));

  it('runs the update at once when the browser has no view transitions', () => {
    const update = vi.fn();
    runTransition(update, 'page');
    expect(update).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.vt).toBeUndefined();
  });

  it('runs the update inside a view transition and labels it for the CSS', async () => {
    let finish!: () => void;
    const start = vi.fn((cb: () => void) => {
      cb();
      return { finished: new Promise<void>((r) => (finish = r)) };
    });
    (document as unknown as Doc).startViewTransition = start;
    const update = vi.fn();
    runTransition(update, 'lang');
    expect(start).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.vt).toBe('lang');
    finish();
    await Promise.resolve();
    await Promise.resolve();
    expect(document.documentElement.dataset.vt).toBeUndefined();
  });

  it('skips the view transition under reduced motion', () => {
    mockReduced(true);
    const start = vi.fn();
    (document as unknown as Doc).startViewTransition = start;
    const update = vi.fn();
    runTransition(update, 'theme');
    expect(start).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('treats a transition overtaken by a newer one as normal, with no unhandled rejection', async () => {
    const skipped = () => Promise.reject(new DOMException('Transition was skipped. New ViewTransition started', 'AbortError'));
    (document as unknown as Doc).startViewTransition = (cb: () => void) => {
      cb();
      return { ready: skipped(), updateCallbackDone: Promise.resolve(), finished: Promise.resolve() };
    };
    const update = vi.fn();
    runTransition(update, 'page');
    await new Promise((r) => setTimeout(r, 0));
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('still applies the change if starting the transition throws', () => {
    (document as unknown as Doc).startViewTransition = () => {
      throw new Error('InvalidStateError');
    };
    const update = vi.fn();
    runTransition(update, 'page');
    expect(update).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.vt).toBeUndefined();
  });
});

describe('usePresence', () => {
  it('keeps a closing panel mounted for its exit animation, then removes it', () => {
    mockReduced(false);
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ open }) => usePresence(open, DUR.press), { initialProps: { open: true } });
    expect(result.current).toEqual({ mounted: true, closing: false });
    rerender({ open: false });
    expect(result.current).toEqual({ mounted: true, closing: true });
    act(() => void vi.advanceTimersByTime(DUR.press));
    expect(result.current).toEqual({ mounted: false, closing: false });
  });

  it('closes at once under reduced motion', () => {
    mockReduced(true);
    const { result, rerender } = renderHook(({ open }) => usePresence(open), { initialProps: { open: true } });
    rerender({ open: false });
    expect(result.current.mounted).toBe(false);
  });
});

describe('routePath', () => {
  it('drops the query so search text and filters do not count as a new page', () => {
    expect(routePath('#/explore?q=claude')).toBe('/explore');
    expect(routePath('#/story/2026-10-19/abcdef')).toBe('/story/2026-10-19/abcdef');
    expect(routePath('')).toBe('/');
    expect(routePath('#/?page=2')).toBe('/');
  });
});
