import { describe, expect, it } from 'vitest';
import type { Article, PicksFile } from './types';
import { introStats, topSignals } from './introStats';

const now = new Date('2026-10-21T12:00:00Z');
const art = (id: string, hoursAgo: number, entities: string[] = []): Article =>
  ({ id, publishedAt: new Date(now.getTime() - hoursAgo * 3600_000).toISOString(), entities }) as Article;

describe('introStats', () => {
  it('counts the last 24 hours in all and per section, and finds the newest story', () => {
    const s = introStats([art('a', 1), art('b', 5), art('c', 30)], new Map([['b', 'ai-games' as const]]), null, now);
    expect(s.fresh).toEqual({ news: 2, sections: { 'ai-games': 1, 'data-centers': 0, videos: 0 } });
    expect(s.lastSignal).toBe(art('a', 1).publishedAt);
    expect(s.sources).toBeNull();
  });
  it('names a top company only from real mentions, three at least', () => {
    const two = [art('a', 1, ['openai']), art('b', 2, ['openai'])];
    expect(introStats(two, new Map(), null, now).topCompany).toBeNull();
    const three = [...two, art('c', 3, ['openai']), art('d', 3, ['meta']), art('e', 60, ['meta'])];
    expect(introStats(three, new Map(), null, now).topCompany).toEqual({ id: 'openai', name: 'OpenAI', stories: 3 });
  });
  it('ignores stories dated in the future', () => {
    expect(introStats([art('a', -3)], new Map(), null, now).lastSignal).toBeNull();
  });
});

describe('topSignals', () => {
  const pick = (id: string, rank: number) => ({ article: { id } as Article, rank, sources: 1, reason: [] });
  const win = (ids: string[]) => ({ from: '', to: '', picks: ids.map((id, i) => pick(id, i + 1)) });
  it('tops up from the weekly list without repeating a story', () => {
    const picks = { windows: { daily: win(['a']), weekly: win(['a', 'b', 'c', 'd']), monthly: win([]) } } as unknown as PicksFile;
    expect(topSignals(picks).map((p) => p.article.id)).toEqual(['a', 'b', 'c']);
    expect(topSignals(null)).toEqual([]);
  });
});
