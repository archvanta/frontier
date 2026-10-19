import { todayAndYesterday } from './dates';
import type { ArchiveDay, Article } from './types';

/** Older archive pages each hold this many calendar days that actually have stories. */
export const DAYS_PER_ARCHIVE_PAGE = 3;

export interface HomePagePlan {
  page: number;
  totalPages: number;
  /** Days rendered on this page, newest first. */
  days: string[];
  today: string;
  yesterday: string;
}

/**
 * Page 1 = today + yesterday (UTC), even when either is empty.
 * Page n ≥ 2 = the next DAYS_PER_ARCHIVE_PAGE older days that have stories.
 * Pages never overlap, so no story can appear on two pages.
 */
export function planHomePage(index: ArchiveDay[], page: number, now: Date): HomePagePlan {
  const { today, yesterday } = todayAndYesterday(now);
  const older = index
    .filter((d) => d.count > 0 && d.day < yesterday)
    .map((d) => d.day)
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  const olderPages = Math.ceil(older.length / DAYS_PER_ARCHIVE_PAGE);
  const totalPages = 1 + olderPages;
  const safePage = Number.isFinite(page) ? Math.min(Math.max(1, Math.trunc(page)), totalPages) : 1;
  if (safePage === 1) return { page: 1, totalPages, days: [today, yesterday], today, yesterday };
  const start = (safePage - 2) * DAYS_PER_ARCHIVE_PAGE;
  return {
    page: safePage,
    totalPages,
    days: older.slice(start, start + DAYS_PER_ARCHIVE_PAGE),
    today,
    yesterday,
  };
}

/** Newest publication first; ties broken by id so ordering is stable. */
export function sortNewestFirst(articles: readonly Article[]): Article[] {
  return [...articles].sort((a, b) => {
    if (a.publishedAt !== b.publishedAt) return a.publishedAt < b.publishedAt ? 1 : -1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** Removes repeated ids, keeping the first occurrence. */
export function uniqueById(articles: readonly Article[]): Article[] {
  const seen = new Set<string>();
  return articles.filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)));
}
