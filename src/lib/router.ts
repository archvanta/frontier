import { useSyncExternalStore } from 'react';
import { isDay } from './dates';
import type { CategoryId, PickWindow } from './types';
import { CATEGORY_IDS } from './types';

/**
 * Hash routing: GitHub Pages has no SPA fallback, so every deep link lives after
 * `#` (e.g. /SIGNAL_AI/#/story/2026-10-19/abc) and survives a hard reload.
 */
export type Route =
  | { name: 'home'; page: number }
  | { name: 'picks'; window: PickWindow }
  | { name: 'explore'; params: URLSearchParams }
  | { name: 'archive' }
  | { name: 'day'; day: string }
  | { name: 'story'; day: string; id: string }
  | { name: 'saved' }
  | { name: 'about' }
  | { name: 'sources' }
  | { name: 'not-found'; path: string };

const WINDOWS: readonly PickWindow[] = ['daily', 'weekly', 'monthly'];

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '');
  const [pathPart = '', query = ''] = raw.split('?', 2);
  const params = new URLSearchParams(query);
  const segs = pathPart.split('/').filter(Boolean).map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });
  const [head, a, b] = segs;
  if (!head) {
    const page = Number.parseInt(params.get('page') ?? '1', 10);
    return { name: 'home', page: Number.isFinite(page) && page > 0 ? page : 1 };
  }
  switch (head) {
    case 'picks':
      if (a && (WINDOWS as readonly string[]).includes(a)) return { name: 'picks', window: a as PickWindow };
      if (!a) return { name: 'picks', window: 'daily' };
      break;
    case 'explore':
      return { name: 'explore', params };
    case 'category':
      if (a && (CATEGORY_IDS as readonly string[]).includes(a)) {
        return { name: 'explore', params: new URLSearchParams({ c: a as CategoryId }) };
      }
      break;
    case 'archive':
      return { name: 'archive' };
    case 'day':
      if (isDay(a)) return { name: 'day', day: a };
      break;
    case 'story':
      if (isDay(a) && b && /^[a-f0-9]{6,40}$/.test(b)) return { name: 'story', day: a, id: b };
      break;
    case 'saved':
      return { name: 'saved' };
    case 'about':
      return { name: 'about' };
    case 'sources':
      return { name: 'sources' };
  }
  return { name: 'not-found', path: pathPart };
}

export function href(path: string, params?: Record<string, string | number | undefined | null>): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  const q = qs.toString();
  return `#${clean}${q ? `?${q}` : ''}`;
}

export function navigate(path: string, params?: Record<string, string | number | undefined | null>, replace = false) {
  const target = href(path, params);
  if (replace) {
    history.replaceState(null, '', target);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = target;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

export function useHash(): string {
  return useSyncExternalStore(subscribe, () => window.location.hash, () => '');
}
