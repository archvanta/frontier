import { describe, expect, it } from 'vitest';
import { genuineImage, pickHeroStories } from './heroStories';
import type { Article, PicksFile } from './types';

function story(id: string, kind: 'feed' | 'og' | 'fallback' | 'brand' | null, at = '2026-10-20T05:00:00Z', extra: Partial<Article> = {}): Article {
  return {
    id,
    url: `https://example.com/${id}`,
    sourceId: 's',
    sourceName: 'Source',
    title: `Story ${id}`,
    excerpt: '',
    lang: 'en',
    publishedAt: at,
    dateEstimated: false,
    fetchedAt: at,
    day: at.slice(0, 10),
    category: 'models',
    tags: [],
    entities: [],
    brand: null,
    image: kind ? { url: kind === 'fallback' ? 'images/fallbacks/models.svg' : `https://img.example.com/${id}.jpg`, kind } : null,
    eventId: id,
    related: [],
    ...extra,
  };
}

function picksOf(...articles: Article[]): PicksFile {
  const win = { from: '', to: '', picks: articles.map((article, i) => ({ article, rank: i + 1, sources: 1, reason: [] })) };
  return { schemaVersion: 1, asOf: '', weights: { reliability: 0, corroboration: 0, recency: 0, topic: 0, novelty: 0 }, windows: { daily: win, weekly: win, monthly: win } };
}

describe('genuineImage', () => {
  it('accepts feed and og images and rejects generated art or missing images', () => {
    expect(genuineImage(story('a', 'feed'))).not.toBeNull();
    expect(genuineImage(story('a', 'og'))).not.toBeNull();
    expect(genuineImage(story('a', 'fallback'))).toBeNull();
    expect(genuineImage(story('a', null))).toBeNull();
  });
  it('uses the source image instead of brand art', () => {
    const a = story('a', 'brand', undefined, { sourceImage: { url: 'https://img.example.com/real.jpg', kind: 'og' } });
    expect(genuineImage(a)?.url).toBe('https://img.example.com/real.jpg');
    expect(genuineImage(story('b', 'brand'))).toBeNull();
  });
});

describe('pickHeroStories', () => {
  const latest = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7'].map((id) => story(id, 'feed'));

  it('puts today’s top-ranked picks first, then the newest, without duplicates', () => {
    const top = story('top', 'feed');
    const out = pickHeroStories(latest, picksOf(top, latest[2]!));
    expect(out.map((a) => a.id)).toEqual(['top', 'n3', 'n1', 'n2', 'n4', 'n5']);
  });

  it('caps the carousel and skips stories without a real image', () => {
    const mixed = [story('x', 'fallback'), ...latest];
    const out = pickHeroStories(mixed, null);
    expect(out).toHaveLength(6);
    expect(out.some((a) => a.id === 'x')).toBe(false);
  });

  it('fills up to three with artwork stories only when real images are scarce', () => {
    const few = [story('a', 'feed'), story('b', 'fallback'), story('c', 'fallback'), story('d', 'fallback')];
    expect(pickHeroStories(few, null).map((a) => a.id)).toEqual(['a', 'b', 'c']);
  });

  it('moves stories on followed topics to the front of the carousel', () => {
    const mine = story('mine', 'feed', undefined, { category: 'hardware' });
    const out = pickHeroStories([...latest, mine], null, 6, (a) => a.category === 'hardware');
    expect(out[0]!.id).toBe('mine');
    expect(out).toHaveLength(6);
  });

  it('returns an empty list when there is nothing to show', () => {
    expect(pickHeroStories([], null)).toEqual([]);
  });
});
