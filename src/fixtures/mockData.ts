/**
 * MOCK DATA — NOT NEWS.
 * Generated relative to the current clock so layouts, grouping and pagination can be
 * exercised without network access. Every title starts with "[MOCK]", every source is
 * a fictitious "Fixture" outlet, and every URL points at example.com. The app shows a
 * permanent banner whenever this dataset is active. It is only bundled in `--mode mock`.
 */
import { utcDay } from '../lib/dates';
import type {
  ArchiveIndex,
  Article,
  BrandId,
  CategoryId,
  DayFile,
  Meta,
  PicksFile,
  PickWindow,
  SearchIndex,
  SourceInfo,
  SourcesFile,
} from '../lib/types';
import { SCHEMA_VERSION } from '../lib/types';

export interface MockDataset {
  meta: Meta;
  archiveIndex: ArchiveIndex;
  days: Record<string, DayFile>;
  picks: PicksFile;
  sources: SourcesFile;
  searchIndex: SearchIndex;
}

const SOURCES: SourceInfo[] = [
  { id: 'fixture-lab', name: 'Fixture Lab Blog', homepage: 'https://example.com/lab', feed: 'https://example.com/lab/rss.xml', kind: 'official', tier: 1, lang: 'en', enabled: true, status: 'ok', notes: 'Mock source' },
  { id: 'fixture-wire', name: 'Fixture Wire', homepage: 'https://example.com/wire', feed: 'https://example.com/wire/rss.xml', kind: 'media', tier: 2, lang: 'en', enabled: true, status: 'ok', notes: 'Mock source' },
  { id: 'fixture-papers', name: 'Fixture Papers', homepage: 'https://example.com/papers', feed: 'https://example.com/papers/rss.xml', kind: 'research', tier: 1, lang: 'en', enabled: true, status: 'ok', notes: 'Mock source' },
  { id: 'fixture-weekly', name: 'Fixture Weekly', homepage: 'https://example.com/weekly', feed: 'https://example.com/weekly/rss.xml', kind: 'media', tier: 3, lang: 'en', enabled: true, status: 'error', lastError: 'Mock failure: HTTP 503', notes: 'Mock source used to show the failed-source state' },
];

interface Seed {
  t: string;
  fa: string | null;
  c: CategoryId;
  b: BrandId | null;
  e: string[];
  s: number;
  img: boolean;
}

const SEEDS: Seed[] = [
  { t: 'Claude model update ships longer context in fixture scenario', fa: 'به‌روزرسانی مدل Claude با زمینهٔ طولانی‌تر (سناریوی آزمایشی)', c: 'models', b: 'claude', e: ['anthropic'], s: 0, img: false },
  { t: 'OpenAI announces developer tooling refresh in fixture scenario', fa: 'OpenAI ابزارهای توسعه‌دهندگان را به‌روز می‌کند (سناریوی آزمایشی)', c: 'products', b: 'openai', e: ['openai'], s: 1, img: false },
  { t: 'Gemini gains multimodal reasoning features in fixture scenario', fa: 'Gemini قابلیت‌های استدلال چندوجهی می‌گیرد (سناریوی آزمایشی)', c: 'models', b: 'gemini', e: ['google'], s: 1, img: false },
  { t: 'Benchmark study compares small open models on reasoning tasks', fa: 'مطالعهٔ بنچمارک مدل‌های باز کوچک را مقایسه می‌کند', c: 'research', b: null, e: [], s: 2, img: true },
  { t: 'Regulators publish draft guidance for general-purpose AI audits', fa: null, c: 'policy', b: null, e: [], s: 1, img: true },
  { t: 'Chipmaker outlines next accelerator roadmap for data centres', fa: 'سازندهٔ تراشه نقشهٔ راه شتاب‌دهندهٔ بعدی را ارائه می‌کند', c: 'hardware', b: null, e: ['nvidia'], s: 1, img: true },
  { t: 'Open-source inference engine adds speculative decoding', fa: 'موتور استنتاج متن‌باز رمزگشایی گمانه‌زنانه اضافه می‌کند', c: 'open-source', b: null, e: [], s: 3, img: false },
  { t: 'Startup raises funding to build evaluation infrastructure', fa: null, c: 'business', b: null, e: [], s: 1, img: true },
  { t: 'Safety researchers release red-teaming dataset for agents', fa: 'پژوهشگران ایمنی مجموعه‌دادهٔ ردتیمینگ عامل‌ها را منتشر می‌کنند', c: 'safety', b: null, e: [], s: 2, img: false },
  { t: 'Anthropic expands Claude availability to new regions', fa: 'Anthropic دسترسی Claude را به مناطق جدید گسترش می‌دهد', c: 'business', b: 'claude', e: ['anthropic'], s: 1, img: false },
  { t: 'Paper proposes cheaper retrieval for long documents', fa: null, c: 'research', b: null, e: [], s: 2, img: true },
  { t: 'Cloud provider launches managed fine-tuning service', fa: 'ارائه‌دهندهٔ ابری سرویس تنظیم دقیق مدیریت‌شده راه‌اندازی می‌کند', c: 'products', b: null, e: ['microsoft'], s: 3, img: true },
];

// Hours before "now" at which each mock story is placed: today, yesterday and older days.
const HOURS_AGO = [1, 2, 3, 5, 26, 27, 30, 50, 75, 98, 122, 146, 170, 194, 218, 242, 266, 290, 314, 338, 362, 386];

function hex(n: number): string {
  return (0x5eed0000 + n * 7919).toString(16).padStart(16, 'a').slice(-16);
}

const FALLBACK_BY_CATEGORY: Record<CategoryId, string> = {
  models: 'models',
  research: 'research',
  products: 'products',
  business: 'business',
  policy: 'policy',
  'open-source': 'open-source',
  hardware: 'hardware',
  safety: 'safety',
};

export function buildMockDataset(now: Date): MockDataset {
  const base = import.meta.env.BASE_URL ?? '/';
  const anchor = new Date(Math.floor(now.getTime() / 3_600_000) * 3_600_000);
  const articles: Article[] = HOURS_AGO.map((h, i) => {
    const seed = SEEDS[i % SEEDS.length]!;
    const src = SOURCES[seed.s]!;
    const published = new Date(anchor.getTime() - h * 3_600_000 + 7 * 60_000);
    const id = hex(i);
    const day = utcDay(published);
    const image = seed.b
      ? { url: `${base}images/ai-brands/${seed.b}-character.webp`, kind: 'brand' as const, alt: `${seed.b} editorial character illustration` }
      : seed.img
        ? { url: `${base}images/fallbacks/${FALLBACK_BY_CATEGORY[seed.c]}.svg`, kind: 'fallback' as const, alt: '' }
        : null;
    const total = Math.max(20, 92 - i * 3);
    return {
      id,
      url: `https://example.com/mock/${id}`,
      sourceId: src.id,
      sourceName: src.name,
      title: `[MOCK] ${seed.t}`,
      excerpt: 'Mock fixture text used for layout testing. This is not a real news story and links to example.com.',
      lang: 'en',
      publishedAt: published.toISOString(),
      dateEstimated: i === 6,
      fetchedAt: new Date(published.getTime() + 20 * 60_000).toISOString(),
      day,
      category: seed.c,
      tags: [seed.c],
      entities: seed.e,
      brand: seed.b,
      image,
      eventId: i === 1 ? hex(2) : id,
      related: [],
      score: {
        total,
        parts: { reliability: 95 - src.tier * 5, corroboration: i < 3 ? 50 : 0, recency: Math.max(0, 100 - h), topic: 70, novelty: 100 },
        asOf: anchor.toISOString(),
      },
      tr: seed.fa ? { fa: { title: `[آزمایشی] ${seed.fa}`, excerpt: 'متن آزمایشی برای بررسی چیدمان؛ این خبر واقعی نیست.', engine: 'mock', at: anchor.toISOString() } } : undefined,
    };
  });

  const days: Record<string, DayFile> = {};
  for (const a of articles) {
    days[a.day] ??= { schemaVersion: SCHEMA_VERSION, day: a.day, articles: [] };
    days[a.day]!.articles.push(a);
  }
  const dayList = Object.keys(days).sort().reverse();

  const window = (name: PickWindow, hours: number, limit: number) => {
    const from = new Date(anchor.getTime() - hours * 3_600_000);
    const picks = articles
      .filter((a) => new Date(a.publishedAt) >= from)
      .sort((x, y) => (y.score?.total ?? 0) - (x.score?.total ?? 0))
      .slice(0, limit)
      .map((article, idx) => ({ article, rank: idx + 1, sources: 1, reason: ['mock'] }));
    return [name, { from: from.toISOString(), to: anchor.toISOString(), picks }] as const;
  };

  return {
    meta: {
      schemaVersion: SCHEMA_VERSION,
      dataUpdatedAt: anchor.toISOString(),
      timezone: 'UTC',
      articleCount: articles.length,
      dayCount: dayList.length,
      latestDay: dayList[0] ?? null,
      sourcesOk: 3,
      sourcesFailed: 1,
      translation: { enabled: true, engine: 'mock', translated: articles.filter((a) => a.tr?.fa).length },
    },
    archiveIndex: {
      schemaVersion: SCHEMA_VERSION,
      timezone: 'UTC',
      days: dayList.map((d) => ({ day: d, count: days[d]!.articles.length })),
    },
    days,
    picks: {
      schemaVersion: SCHEMA_VERSION,
      asOf: anchor.toISOString(),
      weights: { reliability: 0.3, corroboration: 0.25, recency: 0.2, topic: 0.15, novelty: 0.1 },
      windows: Object.fromEntries([window('daily', 24, 6), window('weekly', 24 * 7, 8), window('monthly', 24 * 30, 10)]) as PicksFile['windows'],
    },
    sources: { schemaVersion: SCHEMA_VERSION, sources: SOURCES },
    searchIndex: {
      schemaVersion: SCHEMA_VERSION,
      windowDays: 90,
      entries: articles.map((a) => ({
        id: a.id,
        d: a.day,
        t: a.title,
        tf: a.tr?.fa?.title,
        s: a.sourceId,
        sn: a.sourceName,
        c: a.category,
        b: a.brand,
        e: a.entities,
        x: a.excerpt.slice(0, 160),
        p: a.publishedAt,
      })),
    },
  };
}

