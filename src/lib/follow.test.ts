import { beforeEach, describe, expect, it } from 'vitest';
import { followsAny, prioritizeFollowed, readFollowed, resetFollowedCache } from './follow';
import type { Article } from './types';

const story = (id: string, category: Article['category'], title = `Story ${id}`): Article =>
  ({ id, category, title, excerpt: '', entities: [], brand: null }) as unknown as Article;

describe('followed topics', () => {
  beforeEach(() => {
    localStorage.clear();
    resetFollowedCache();
  });

  it('starts empty and reads only known topic ids from storage', () => {
    expect(readFollowed()).toEqual([]);
    localStorage.setItem('signal-ai:followed-topics:v1', JSON.stringify(['models', 'nope', 'models', 7, 'hardware']));
    resetFollowedCache();
    expect(readFollowed()).toEqual(['models', 'hardware']);
  });

  it('ignores corrupted storage', () => {
    localStorage.setItem('signal-ai:followed-topics:v1', '{not json');
    expect(readFollowed()).toEqual([]);
    localStorage.setItem('signal-ai:followed-topics:v1', '{"a":1}');
    resetFollowedCache();
    expect(readFollowed()).toEqual([]);
  });

  it('matches a story by category or by the topic keywords', () => {
    expect(followsAny(story('a', 'hardware'), ['hardware'])).toBe(true);
    expect(followsAny(story('a', 'hardware'), ['models'])).toBe(false);
    expect(followsAny(story('b', 'products', 'New Copilot update for programmers'), ['coding'])).toBe(true);
    expect(followsAny(story('c', 'models'), [])).toBe(false);
  });

  it('puts followed stories first and keeps the order inside each group', () => {
    const list = [story('1', 'business'), story('2', 'hardware'), story('3', 'research'), story('4', 'hardware')];
    expect(prioritizeFollowed(list, ['hardware']).map((a) => a.id)).toEqual(['2', '4', '1', '3']);
    expect(prioritizeFollowed(list, ['hardware', 'business']).map((a) => a.id)).toEqual(['1', '2', '4', '3']);
  });

  it('returns the list unchanged (as a copy) when nothing is followed', () => {
    const list = [story('1', 'business'), story('2', 'hardware')];
    const out = prioritizeFollowed(list, []);
    expect(out).toEqual(list);
    expect(out).not.toBe(list);
  });
});
