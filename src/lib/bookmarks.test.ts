import { beforeEach, describe, expect, it } from 'vitest';
import { _resetBookmarkCache, readBookmarks, removeBookmark, toggleBookmark } from './bookmarks';
import type { Article } from './types';

const art = { id: 'abc', day: '2026-10-19', title: 'T', sourceName: 'S', url: 'https://x.test/a', publishedAt: '2026-10-19T00:00:00Z' } as Article;

describe('bookmarks', () => {
  beforeEach(() => {
    localStorage.clear();
    _resetBookmarkCache();
  });
  it('toggles and persists to localStorage only', () => {
    expect(toggleBookmark(art)).toBe(true);
    expect(JSON.parse(localStorage.getItem('signal-ai:bookmarks:v1')!)[0].id).toBe('abc');
    expect(toggleBookmark(art)).toBe(false);
    expect(readBookmarks()).toEqual([]);
  });
  it('ignores corrupted storage', () => {
    localStorage.setItem('signal-ai:bookmarks:v1', '{not json');
    expect(readBookmarks()).toEqual([]);
    localStorage.setItem('signal-ai:bookmarks:v1', JSON.stringify([{ id: 1 }, { ...art, savedAt: 'x' }]));
    _resetBookmarkCache();
    expect(readBookmarks().map((b) => b.id)).toEqual(['abc']);
  });
  it('removes by id', () => {
    toggleBookmark(art);
    removeBookmark('abc');
    expect(readBookmarks()).toHaveLength(0);
  });
});
