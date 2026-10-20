import { useCallback, useSyncExternalStore } from 'react';
import type { Article } from './types';

/**
 * Bookmarks of signed-out readers live only in this browser's localStorage and are never sent anywhere.
 * Signed-in readers save to their account instead (lib/account); local ones are only copied there when the reader agrees.
 * A small snapshot is kept so saved stories still render if the day file changes.
 */
export interface Bookmark {
  id: string;
  day: string;
  title: string;
  titleFa?: string;
  sourceName: string;
  url: string;
  publishedAt: string;
  savedAt: string;
}

const KEY = 'signal-ai:bookmarks:v1';
const MAX = 500;
const listeners = new Set<() => void>();
let cache: Bookmark[] | null = null;

function isBookmark(v: unknown): v is Bookmark {
  if (!v || typeof v !== 'object') return false;
  const b = v as Record<string, unknown>;
  return typeof b.id === 'string' && typeof b.day === 'string' && typeof b.title === 'string' && typeof b.url === 'string';
}

export function readBookmarks(): Bookmark[] {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed.filter(isBookmark) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: Bookmark[]) {
  cache = next.slice(0, MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* quota or private mode: keep in memory for this visit */
  }
  listeners.forEach((l) => l());
}

/** The attribution snapshot kept for a saved story (also used for account bookmarks). */
export function snapshotOf(a: Article, now = new Date()): Bookmark {
  return {
    id: a.id,
    day: a.day,
    title: a.title,
    titleFa: a.tr?.fa?.title,
    sourceName: a.sourceName,
    url: a.url,
    publishedAt: a.publishedAt,
    savedAt: now.toISOString(),
  };
}

export function toggleBookmark(a: Article, now = new Date()): boolean {
  const list = readBookmarks();
  if (list.some((b) => b.id === a.id)) {
    write(list.filter((b) => b.id !== a.id));
    return false;
  }
  write([snapshotOf(a, now), ...list]);
  return true;
}

export function removeBookmark(id: string) {
  write(readBookmarks().filter((b) => b.id !== id));
}

/** Test helper: forget the in-memory cache. */
export function _resetBookmarkCache() {
  cache = null;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

const EMPTY: Bookmark[] = [];

export function useBookmarks() {
  const list = useSyncExternalStore(subscribe, readBookmarks, () => EMPTY);
  const isSaved = useCallback((id: string) => list.some((b) => b.id === id), [list]);
  return { list, isSaved, toggle: toggleBookmark, remove: removeBookmark };
}
