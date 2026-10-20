import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { href, parseHash, useHash } from './router';

describe('parseHash', () => {
  it('parses home with page', () => {
    expect(parseHash('')).toEqual({ name: 'home', page: 1 });
    expect(parseHash('#/?page=3')).toEqual({ name: 'home', page: 3 });
    expect(parseHash('#/?page=abc')).toEqual({ name: 'home', page: 1 });
  });
  it('parses story deep links and rejects malformed ones', () => {
    expect(parseHash('#/story/2026-10-19/abcdef0123456789')).toEqual({ name: 'story', day: '2026-10-19', id: 'abcdef0123456789' });
    expect(parseHash('#/story/2026-13-40/abcdef').name).toBe('not-found');
    expect(parseHash('#/story/2026-10-19/<script>').name).toBe('not-found');
  });
  it('parses picks windows and category aliases', () => {
    expect(parseHash('#/picks/weekly')).toEqual({ name: 'picks', window: 'weekly' });
    expect(parseHash('#/picks/yearly').name).toBe('not-found');
    const r = parseHash('#/category/policy');
    expect(r.name === 'explore' && r.params.get('c')).toBe('policy');
  });
  it('keeps explore query parameters', () => {
    const r = parseHash('#/explore?q=gemini&c=models');
    expect(r.name === 'explore' && r.params.get('q')).toBe('gemini');
  });
  it('parses the topic sections and their company filter', () => {
    const r = parseHash('#/ai-games?e=openai');
    expect(r.name === 'section' && r.id === 'ai-games' && r.params.get('e')).toBe('openai');
    expect(parseHash('#/data-centers')).toMatchObject({ name: 'section', id: 'data-centers' });
    expect(parseHash('#/ai-games/extra').name).toBe('not-found');
  });
  it('builds hrefs without empty params', () => {
    expect(href('/explore', { q: 'claude', c: '', page: undefined })).toBe('#/explore?q=claude');
  });
});

describe('useHash', () => {
  type Doc = { startViewTransition?: unknown };
  afterEach(() => {
    delete (document as unknown as Doc).startViewTransition;
    history.replaceState(null, '', '#/');
  });

  const go = (hash: string) =>
    act(() => {
      history.pushState(null, '', hash);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

  it('follows the URL at once when the browser has no view transitions', () => {
    history.replaceState(null, '', '#/');
    const { result } = renderHook(() => useHash());
    go('#/archive');
    expect(result.current).toBe('#/archive');
  });

  it('keeps the old page on screen until the transition captures it, and skips the transition for query changes', () => {
    history.replaceState(null, '', '#/explore');
    const pending: (() => void)[] = [];
    const start = vi.fn((cb: () => void) => {
      pending.push(cb);
      return { finished: Promise.resolve() };
    });
    (document as unknown as Doc).startViewTransition = start;
    const { result } = renderHook(() => useHash());

    go('#/explore?q=claude');
    expect(start).not.toHaveBeenCalled();
    expect(result.current).toBe('#/explore?q=claude');

    go('#/archive');
    expect(start).toHaveBeenCalledTimes(1);
    expect(result.current).toBe('#/explore?q=claude');
    act(() => pending.shift()!());
    expect(result.current).toBe('#/archive');
  });

  it('folds a query added during a transition into it, and lets a newer page change win', () => {
    history.replaceState(null, '', '#/');
    const pending: (() => void)[] = [];
    const start = vi.fn((cb: () => void) => {
      pending.push(cb);
      return { finished: Promise.resolve() };
    });
    (document as unknown as Doc).startViewTransition = start;
    const { result } = renderHook(() => useHash());

    go('#/explore');
    go('#/explore?q=claude');
    expect(start).toHaveBeenCalledTimes(1);
    act(() => pending.shift()!());
    expect(result.current).toBe('#/explore?q=claude');

    go('#/archive');
    go('#/saved');
    expect(start).toHaveBeenCalledTimes(3);
    act(() => pending.shift()!()); // the overtaken transition changes nothing
    expect(result.current).toBe('#/explore?q=claude');
    act(() => pending.shift()!());
    expect(result.current).toBe('#/saved');
  });
});
