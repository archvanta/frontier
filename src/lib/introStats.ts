import { COMPANIES } from './account/catalog';
import type { Article, Meta, PickEntry, PicksFile, SectionId } from './types';

const DAY_MS = 24 * 3600 * 1000;
/** A company must be named by at least this many stories before the intro calls it the top mention. */
const MIN_TOP_MENTIONS = 3;

export interface IntroStats {
  /** Sources that answered on the last collector run, straight from meta.json. */
  sources: number | null;
  /** Publication time of the newest stored story. */
  lastSignal: string | null;
  /** Most-mentioned company over the last 48 hours, only when the count is meaningful. */
  topCompany: { id: string; name: string; stories: number } | null;
  /** Stories published in the last 24 hours, in all and per section. */
  fresh: { news: number; sections: Record<SectionId, number> };
}

/** Everything the intro shows about the feed, derived from stories already stored (nothing is estimated or invented). */
export function introStats(stories: readonly Article[], sectionOf: ReadonlyMap<string, SectionId>, meta: Meta | null, now: Date): IntroStats {
  const t = now.getTime();
  let lastMs = -Infinity;
  let last: string | null = null;
  const fresh = { news: 0, sections: { 'ai-games': 0, 'data-centers': 0, videos: 0 } as Record<SectionId, number> };
  const mentions = new Map<string, number>();
  for (const a of stories) {
    const ms = Date.parse(a.publishedAt);
    if (Number.isNaN(ms) || ms > t) continue;
    if (ms > lastMs) {
      lastMs = ms;
      last = a.publishedAt;
    }
    if (t - ms <= DAY_MS) {
      fresh.news += 1;
      const s = sectionOf.get(a.id);
      if (s) fresh.sections[s] += 1;
    }
    if (t - ms <= 2 * DAY_MS) for (const e of new Set(a.entities)) mentions.set(e, (mentions.get(e) ?? 0) + 1);
  }
  let top: IntroStats['topCompany'] = null;
  for (const c of COMPANIES) {
    const n = mentions.get(c.id) ?? 0;
    if (n >= MIN_TOP_MENTIONS && (!top || n > top.stories)) top = { id: c.id, name: c.name, stories: n };
  }
  return { sources: meta?.sourcesOk ?? null, lastSignal: last, topCompany: top, fresh };
}

/** The top ranked stories right now: the daily list first, topped up from the weekly one, no story twice. */
export function topSignals(picks: PicksFile | null, count = 3): PickEntry[] {
  if (!picks) return [];
  const seen = new Set<string>();
  const out: PickEntry[] = [];
  for (const w of ['daily', 'weekly'] as const) {
    for (const p of picks.windows[w]?.picks ?? []) {
      if (out.length >= count) return out;
      if (!seen.has(p.article.id)) {
        seen.add(p.article.id);
        out.push(p);
      }
    }
  }
  return out;
}
