import { describe, expect, it } from 'vitest';
import type { Article } from '../types';
import { companyStories, PERSONAL_WEIGHTS as W, rankForReader, scoreArticle } from './personalize';

const NOW = new Date('2026-10-20T12:00:00Z');

function art(id: string, extra: Partial<Article> = {}): Article {
  return {
    id,
    url: `https://example.com/${id}`,
    sourceId: 's',
    sourceName: 'Source',
    title: `Story ${id}`,
    excerpt: '',
    lang: 'en',
    publishedAt: '2026-10-20T12:00:00Z',
    dateEstimated: false,
    fetchedAt: '2026-10-20T12:00:00Z',
    day: '2026-10-20',
    category: 'business',
    tags: [],
    entities: [],
    brand: null,
    image: null,
    eventId: id,
    related: [],
    score: { total: 60, parts: { reliability: 0, corroboration: 0, recency: 0, topic: 0, novelty: 0 }, asOf: '2026-10-20T12:00:00Z' },
    ...extra,
  };
}

const NONE = { topics: [], companies: [] };

describe('personal ranking', () => {
  it('adds up the documented parts', () => {
    const r = scoreArticle(art('a', { category: 'research', related: ['b', 'c'] }), { topics: ['research'], companies: [] }, NOW);
    expect(r.parts).toEqual({ editorial: 30, topic: W.topic, company: 0, recency: W.recencyMax, coverage: 2 * W.coveragePerSource });
    expect(r.score).toBe(30 + 18 + 15 + 6);
    expect(r.reasons).toEqual([{ kind: 'topic', topic: 'research' }, { kind: 'coverage', sources: 3 }]);
    expect(r.personal).toBe(true);
  });

  it('boosts followed companies, and their model releases most', () => {
    const release = scoreArticle(art('r', { category: 'models', entities: ['openai'] }), { topics: [], companies: ['openai'] }, NOW);
    const mention = scoreArticle(art('m', { entities: ['openai'] }), { topics: [], companies: ['openai'] }, NOW);
    expect(release.parts.company).toBe(W.company + W.release);
    expect(mention.parts.company).toBe(W.company);
    expect(release.reasons[0]).toEqual({ kind: 'release', company: 'openai' });
    expect(mention.reasons[0]).toEqual({ kind: 'company', company: 'openai' });
  });

  it('matches companies by brand as well as entities', () => {
    const r = scoreArticle(art('c', { brand: 'claude' }), { topics: [], companies: ['anthropic'] }, NOW);
    expect(r.reasons[0]).toEqual({ kind: 'company', company: 'anthropic' });
  });

  it('matches cross-category topics by keywords', () => {
    expect(scoreArticle(art('k', { title: 'New AI coding assistant lands in the IDE' }), { topics: ['coding'], companies: [] }, NOW).parts.topic).toBe(W.topic);
    expect(scoreArticle(art('k2', { title: 'Humanoid robots learn to fold laundry' }), { topics: ['agents'], companies: [] }, NOW).parts.topic).toBe(W.topic);
    // "architecture" alone means model architecture, not design.
    expect(scoreArticle(art('k3', { title: 'A new transformer architecture' }), { topics: ['design'], companies: [] }, NOW).parts.topic).toBe(0);
  });

  it('halves recency every 24 hours', () => {
    const day = scoreArticle(art('o', { publishedAt: '2026-10-19T12:00:00Z' }), NONE, NOW);
    expect(day.parts.recency).toBe(W.recencyMax / 2);
  });

  it('ranks matches above a stronger unrelated story, deterministically', () => {
    const strong = art('strong', { score: { ...art('x').score!, total: 90 } });
    const match = art('match', { category: 'hardware', entities: ['nvidia'] });
    const prefs = { topics: ['hardware' as const], companies: ['nvidia' as const] };
    expect(rankForReader([strong, match], prefs, NOW).map((r) => r.article.id)).toEqual(['match', 'strong']);
    expect(rankForReader([match, strong], prefs, NOW).map((r) => r.article.id)).toEqual(['match', 'strong']);
  });

  it('falls back to the global order when there are no preferences', () => {
    const a = art('a', { score: { ...art('x').score!, total: 80 } });
    const b = art('b', { score: { ...art('x').score!, total: 50 } });
    const ranked = rankForReader([b, a], null, NOW);
    expect(ranked.map((r) => r.article.id)).toEqual(['a', 'b']);
    expect(ranked.every((r) => !r.personal && r.parts.topic === 0 && r.parts.company === 0)).toBe(true);
  });

  it('breaks ties by newest, then id, and drops duplicates', () => {
    const older = art('b', { publishedAt: '2026-10-20T11:00:00Z' });
    const newer = art('a', { publishedAt: '2026-10-20T11:00:00Z' });
    const ranked = rankForReader([older, newer, older], NONE, NOW);
    expect(ranked.map((r) => r.article.id)).toEqual(['a', 'b']);
  });

  it('never changes the articles or their public scores', () => {
    const a = art('a', { entities: ['openai'] });
    const before = JSON.stringify(a);
    rankForReader([a], { topics: ['business'], companies: ['openai'] }, NOW);
    expect(JSON.stringify(a)).toBe(before);
  });

  it('lists newest stories from followed companies', () => {
    const list = companyStories(
      [art('1', { entities: ['meta'], publishedAt: '2026-10-20T01:00:00Z' }), art('2', { entities: ['meta'] }), art('3', { entities: ['apple'] })],
      ['meta'],
    );
    expect(list.map((a) => a.id)).toEqual(['2', '1']);
  });
});
