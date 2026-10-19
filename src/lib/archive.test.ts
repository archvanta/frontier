import { describe, expect, it } from 'vitest';
import { DAYS_PER_ARCHIVE_PAGE, planHomePage, sortNewestFirst, uniqueById } from './archive';
import type { Article } from './types';

const idx = (days: string[]) => days.map((day) => ({ day, count: 3 }));

describe('planHomePage', () => {
  const now = new Date('2026-10-19T10:00:00Z');

  it('page 1 is always today then yesterday (UTC)', () => {
    const plan = planHomePage(idx(['2026-10-19', '2026-10-18', '2026-10-17']), 1, now);
    expect(plan.days).toEqual(['2026-10-19', '2026-10-18']);
    expect(plan.totalPages).toBe(2);
  });

  it('older pages hold real archive days only, newest first, without overlap', () => {
    const days = ['2026-10-19', '2026-10-18', '2026-10-16', '2026-10-15', '2026-10-12', '2026-10-10', '2026-10-01'];
    const p2 = planHomePage(idx(days), 2, now);
    const p3 = planHomePage(idx(days), 3, now);
    expect(p2.days).toEqual(['2026-10-16', '2026-10-15', '2026-10-12']);
    expect(p3.days).toEqual(['2026-10-10', '2026-10-01']);
    expect(p2.days.filter((d) => p3.days.includes(d))).toEqual([]);
    expect(p2.totalPages).toBe(1 + Math.ceil(5 / DAYS_PER_ARCHIVE_PAGE));
  });

  it('skips empty days and clamps out-of-range pages', () => {
    const plan = planHomePage([{ day: '2026-10-10', count: 0 }, { day: '2026-10-09', count: 2 }], 99, now);
    expect(plan.page).toBe(2);
    expect(plan.days).toEqual(['2026-10-09']);
    expect(planHomePage([], -4, now).page).toBe(1);
  });

  it('uses the UTC day even when local time has already rolled over', () => {
    // 23:30 UTC is already the next day in Tehran (UTC+3:30), but the archive policy is UTC.
    const plan = planHomePage([], 1, new Date('2026-03-20T23:30:00Z'));
    expect(plan.today).toBe('2026-03-20');
    expect(plan.yesterday).toBe('2026-03-19');
  });

  it('handles month and year boundaries', () => {
    expect(planHomePage([], 1, new Date('2027-01-01T00:05:00Z')).yesterday).toBe('2026-12-31');
    expect(planHomePage([], 1, new Date('2028-03-01T01:00:00Z')).yesterday).toBe('2028-02-29');
  });
});

describe('sorting helpers', () => {
  const mk = (id: string, publishedAt: string) => ({ id, publishedAt }) as Article;
  it('sorts newest first with stable tie-break', () => {
    const out = sortNewestFirst([mk('b', '2026-01-01T01:00:00Z'), mk('a', '2026-01-01T03:00:00Z'), mk('c', '2026-01-01T01:00:00Z')]);
    expect(out.map((a) => a.id)).toEqual(['a', 'b', 'c']);
  });
  it('removes duplicate ids', () => {
    expect(uniqueById([mk('a', 'x'), mk('a', 'y'), mk('b', 'z')]).map((a) => a.publishedAt)).toEqual(['x', 'z']);
  });
});
