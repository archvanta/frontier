import type { Article } from '../types';
import { COMPANIES, TOPICS, matchesCompany, matchesTopic, type CompanyId, type TopicId } from './catalog';
import type { Preferences } from './types';

/**
 * Deterministic, explainable personal ranking. It runs in the browser on the public news data and
 * the reader's saved preferences, returns new arrays, and never touches the articles or the global
 * scores, so nothing here can change what other readers see. The weights are documented in the UI
 * (messages `fy_formula`) and in docs/ACCOUNTS.md; keep the three in step.
 */
export const PERSONAL_WEIGHTS = {
  /** Multiplier on the public 0–100 signal score. */
  editorial: 0.5,
  /** Used when a story has no public score yet. */
  editorialDefault: 40,
  topic: 18,
  company: 24,
  /** Extra for a model release from a followed company. */
  release: 8,
  recencyMax: 15,
  recencyHalfLifeHours: 24,
  coveragePerSource: 3,
  coverageMax: 9,
  /** Public score at or above which "High signal score" is offered as a reason. */
  topSignal: 70,
} as const;

export type Reason =
  | { kind: 'release'; company: CompanyId }
  | { kind: 'company'; company: CompanyId }
  | { kind: 'topic'; topic: TopicId }
  | { kind: 'coverage'; sources: number }
  | { kind: 'top' };

export interface RankParts {
  editorial: number;
  topic: number;
  company: number;
  recency: number;
  coverage: number;
}

export interface Ranked {
  article: Article;
  score: number;
  parts: RankParts;
  /** Most specific reason first. */
  reasons: Reason[];
  /** True when the story matched at least one of the reader's own topics or companies. */
  personal: boolean;
}

export const hasPreferences = (p: Preferences | null | undefined): p is Preferences => !!p && (p.topics.length > 0 || p.companies.length > 0);

const round = (n: number) => Math.round(n * 100) / 100;

export function scoreArticle(a: Article, prefs: Preferences, now: Date): Ranked {
  const W = PERSONAL_WEIGHTS;
  const publicScore = a.score?.total ?? W.editorialDefault;
  const ageHours = Math.max(0, (now.getTime() - Date.parse(a.publishedAt)) / 3_600_000);
  const sources = 1 + new Set(a.related ?? []).size;

  const topics = TOPICS.filter((t) => prefs.topics.includes(t.id) && matchesTopic(a, t));
  const companies = COMPANIES.filter((c) => prefs.companies.includes(c.id) && matchesCompany(a, c));
  const release = a.category === 'models' && companies.length > 0;

  const parts: RankParts = {
    editorial: round(publicScore * W.editorial),
    topic: topics.length ? W.topic : 0,
    company: companies.length ? W.company + (release ? W.release : 0) : 0,
    recency: Number.isFinite(ageHours) ? round(W.recencyMax * 0.5 ** (ageHours / W.recencyHalfLifeHours)) : 0,
    coverage: Math.min(W.coverageMax, (sources - 1) * W.coveragePerSource),
  };

  const reasons: Reason[] = [];
  if (release) reasons.push({ kind: 'release', company: companies[0]!.id });
  for (const c of companies) if (!release || c.id !== companies[0]!.id) reasons.push({ kind: 'company', company: c.id });
  for (const t of topics) reasons.push({ kind: 'topic', topic: t.id });
  if (sources >= 3) reasons.push({ kind: 'coverage', sources });
  if (publicScore >= W.topSignal) reasons.push({ kind: 'top' });

  const score = round(parts.editorial + parts.topic + parts.company + parts.recency + parts.coverage);
  return { article: a, score, parts, reasons, personal: topics.length + companies.length > 0 };
}

function compare(x: Ranked, y: Ranked): number {
  return y.score - x.score || y.article.publishedAt.localeCompare(x.article.publishedAt) || x.article.id.localeCompare(y.article.id);
}

const unique = (articles: readonly Article[]) => {
  const seen = new Set<string>();
  return articles.filter((a) => !seen.has(a.id) && (seen.add(a.id), true));
};

/**
 * Ranks stories for one reader. With no preferences every personal part is zero, which gives the
 * normal global order (public score plus recency): the dashboard is never empty.
 */
export function rankForReader(articles: readonly Article[], prefs: Preferences | null, now: Date): Ranked[] {
  const p: Preferences = prefs ?? { topics: [], companies: [] };
  return unique(articles).map((a) => scoreArticle(a, p, now)).sort(compare);
}

/** Newest stories that mention any of the given companies. */
export function companyStories(articles: readonly Article[], companies: readonly CompanyId[], limit = 12): Article[] {
  const wanted = COMPANIES.filter((c) => companies.includes(c.id));
  return unique(articles)
    .filter((a) => wanted.some((c) => matchesCompany(a, c)))
    .sort((x, y) => y.publishedAt.localeCompare(x.publishedAt) || x.id.localeCompare(y.id))
    .slice(0, limit);
}
