/**
 * Data contracts shared with the Python pipeline (pipeline/signal_pipeline/schema.py).
 * Schema changes must bump SCHEMA_VERSION on both sides and be recorded in docs/DATA-SCHEMA.md.
 */
export const SCHEMA_VERSION = 3;

export type Locale = 'en' | 'fa';

export type CategoryId =
  | 'models'
  | 'research'
  | 'products'
  | 'business'
  | 'policy'
  | 'open-source'
  | 'hardware'
  | 'safety';

export const CATEGORY_IDS: readonly CategoryId[] = [
  'models',
  'research',
  'products',
  'business',
  'policy',
  'open-source',
  'hardware',
  'safety',
];

/**
 * Sections: curated slices of the stored stories, each with its own page and `data/sections/<id>.json`.
 * `videos` is a format rather than a topic: every story with a playable video.
 */
export type SectionId = 'ai-games' | 'data-centers' | 'videos';

export const SECTION_IDS: readonly SectionId[] = ['ai-games', 'data-centers', 'videos'];

/** Brands that get the user's fixed character artwork when they are the story's primary subject. */
export type BrandId = 'claude' | 'openai' | 'gemini';

export type ImageKind = 'feed' | 'og' | 'brand' | 'fallback';

export interface ArticleImage {
  url: string;
  kind: ImageKind;
  alt?: string;
  /** Credit line supplied by the source (e.g. media:credit), if any. */
  credit?: string;
  /** Page the image metadata came from (feed URL or article URL). */
  sourceUrl?: string;
}

/**
 * A video the site can play in the page. Only a reference is stored: a YouTube id (played through the
 * youtube-nocookie.com player, loaded on click) or an https video file the publisher's feed offers.
 */
export type ArticleVideo =
  | { provider: 'youtube'; id: string; url: string }
  | { provider: 'file'; url: string; type: string };

export interface ScoreParts {
  reliability: number;
  corroboration: number;
  recency: number;
  topic: number;
  novelty: number;
}

export interface ArticleScore {
  /** Weighted 0–100 total. Deterministic editorial signal — not truth, not popularity. */
  total: number;
  parts: ScoreParts;
  /** ISO time the recency part was measured against. */
  asOf: string;
}

export interface Translation {
  title: string;
  excerpt?: string;
  engine: string;
  /** ISO time the translation was produced. */
  at: string;
}

export interface Article {
  /** Stable id: first 16 hex chars of sha1(canonical URL). */
  id: string;
  url: string;
  sourceId: string;
  sourceName: string;
  title: string;
  /** Short plain-text excerpt from the source feed (never the full article). */
  excerpt: string;
  lang: string;
  /** Source publication time in ISO-8601 UTC. */
  publishedAt: string;
  /** True when the feed gave no usable date and fetch time was used instead. */
  dateEstimated: boolean;
  /** Time our pipeline first saw the item (ISO-8601 UTC). */
  fetchedAt: string;
  /** Archive day (UTC) — YYYY-MM-DD. */
  day: string;
  category: CategoryId;
  tags: string[];
  entities: string[];
  brand: BrandId | null;
  image: ArticleImage | null;
  /** Genuine source image kept when brand artwork replaces the card thumbnail. */
  sourceImage?: ArticleImage | null;
  /** Playable video of the story, when the feed carried one (v3). */
  video?: ArticleVideo;
  eventId: string;
  /** Other article ids in the same event cluster (other sources covering it). */
  related: string[];
  score?: ArticleScore;
  tr?: Partial<Record<Locale, Translation>>;
}

export interface DayFile {
  schemaVersion: number;
  day: string;
  articles: Article[];
}

export interface ArchiveDay {
  day: string;
  count: number;
}

export interface ArchiveIndex {
  schemaVersion: number;
  timezone: 'UTC';
  days: ArchiveDay[];
}

export type PickWindow = 'daily' | 'weekly' | 'monthly';

export interface PickEntry {
  article: Article;
  rank: number;
  /** Number of independent sources that covered the same event. */
  sources: number;
  reason: string[];
}

export interface PicksFile {
  schemaVersion: number;
  asOf: string;
  weights: ScoreParts;
  windows: Record<PickWindow, { from: string; to: string; halfLifeHours?: number; picks: PickEntry[] }>;
}

export interface SectionFile {
  schemaVersion: number;
  section: SectionId;
  /** How many days back the section covers. */
  windowDays: number;
  /** Matching stories in the window; `articles` holds the newest of them. */
  total: number;
  articles: Article[];
}

export type SourceStatus = 'ok' | 'error' | 'disabled' | 'unverified';

export interface SourceInfo {
  id: string;
  name: string;
  homepage: string;
  feed: string;
  kind: 'official' | 'research' | 'media' | 'community';
  tier: 1 | 2 | 3 | 4;
  lang: string;
  enabled: boolean;
  status: SourceStatus;
  /** First UTC day the feed was fetched successfully by the pipeline. */
  verifiedOn?: string;
  lastError?: string;
  items?: number;
  notes?: string;
}

export interface SourcesFile {
  schemaVersion: number;
  sources: SourceInfo[];
}

export interface Meta {
  schemaVersion: number;
  /** Last time the stored data actually changed (ISO UTC). */
  dataUpdatedAt: string | null;
  timezone: 'UTC';
  articleCount: number;
  dayCount: number;
  latestDay: string | null;
  sourcesOk: number;
  sourcesFailed: number;
  translation: { enabled: boolean; engine: string | null; translated: number };
}

export interface SearchEntry {
  id: string;
  d: string;
  t: string;
  tf?: string;
  s: string;
  sn: string;
  c: CategoryId;
  b: BrandId | null;
  e: string[];
  x: string;
  p: string;
}

export interface SearchIndex {
  schemaVersion: number;
  /** How many days back the index covers. Older stories remain in the day archive. */
  windowDays: number;
  entries: SearchEntry[];
}
