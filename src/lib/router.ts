import { useSyncExternalStore } from 'react';
import { isDay } from './dates';
import { runTransition } from './motion';
import type { CategoryId, PickWindow, SectionId } from './types';
import { CATEGORY_IDS, SECTION_IDS } from './types';

/**
 * Hash routing: GitHub Pages has no SPA fallback, so every deep link lives after
 * `#` (e.g. /SIGNAL_AI/#/story/2026-10-19/abc) and survives a hard reload.
 */
export type Route =
  | { name: 'home'; page: number }
  | { name: 'ai-news'; page: number }
  | { name: 'picks'; window: PickWindow }
  | { name: 'explore'; params: URLSearchParams }
  | { name: 'section'; id: SectionId; params: URLSearchParams }
  | { name: 'archive' }
  | { name: 'day'; day: string }
  | { name: 'story'; day: string; id: string }
  | { name: 'saved' }
  | { name: 'about' }
  | { name: 'sources' }
  | { name: 'signin'; create: boolean; next: string | null }
  | { name: 'welcome' }
  | { name: 'account' }
  | { name: 'for-you' }
  | { name: 'privacy' }
  | { name: 'not-found'; path: string };

const WINDOWS: readonly PickWindow[] = ['daily', 'weekly', 'monthly'];

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '');
  const [pathPart = '', query = ''] = raw.split('?', 2);
  const params = new URLSearchParams(query);
  const segs = pathPart
    .split('/')
    .filter(Boolean)
    .map((s) => {
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
    case 'ai-news':
      if (!a) {
        const page = Number.parseInt(params.get('page') ?? '1', 10);
        return { name: 'ai-news', page: Number.isFinite(page) && page > 0 ? page : 1 };
      }
      break;
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
    case 'ai-games':
    case 'data-centers':
    case 'videos':
      if (!a && (SECTION_IDS as readonly string[]).includes(head)) return { name: 'section', id: head as SectionId, params };
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
    case 'signin':
      return { name: 'signin', create: params.get('mode') === 'create', next: params.get('next') };
    case 'welcome':
      return { name: 'welcome' };
    case 'account':
      return { name: 'account' };
    case 'for-you':
      return { name: 'for-you' };
    case 'privacy':
      return { name: 'privacy' };
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

/** The route part of a hash, without the query: `#/story/d/id?x=1` → `/story/d/id`. */
export function routePath(hash: string): string {
  return hash.replace(/^#/, '').split('?', 1)[0] || '/';
}

/*
 * The hash the app renders. A change of page (not just of its query, such as search text, filters or the page number)
 * is committed inside a view transition (lib/motion.ts), so the old page animates out and the new one in. Links, Back,
 * Forward and `navigate` all arrive here as `hashchange`; a direct load or refresh renders the URL as it is.
 */
let shown: string | null = null;
/** The page a pending transition is heading to, or null. */
let pending: string | null = null;
let latest = 0;
const hashListeners = new Set<() => void>();

function onHashChange() {
  const next = window.location.hash;
  // Same page as a transition already on its way (e.g. a query added right after the click): it commits the latest URL.
  if (pending !== null && routePath(next) === pending) return;
  const prev = shown ?? next;
  if (next === prev) return;
  const id = ++latest;
  const commit = () => {
    if (id !== latest) return; // overtaken by a newer navigation, which commits the final URL itself
    pending = null;
    shown = window.location.hash; // the latest, if the user navigated again meanwhile
    hashListeners.forEach((l) => l());
  };
  if (pending === null && routePath(next) === routePath(prev)) {
    commit();
    return;
  }
  pending = routePath(next);
  runTransition(commit, 'page');
}

function subscribe(cb: () => void) {
  if (hashListeners.size === 0) window.addEventListener('hashchange', onHashChange);
  hashListeners.add(cb);
  return () => {
    hashListeners.delete(cb);
    if (hashListeners.size === 0) window.removeEventListener('hashchange', onHashChange);
  };
}

function snapshot(): string {
  // While a page change waits for its transition the old page stays on screen; otherwise always the real URL.
  if (pending === null || shown === null) shown = window.location.hash;
  return shown;
}

export function useHash(): string {
  return useSyncExternalStore(subscribe, snapshot, () => '');
}
