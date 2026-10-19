import type { BrandId, CategoryId, SearchEntry } from './types';
import { CATEGORY_IDS } from './types';
import { categoryLabel } from './i18n';

/** Case/diacritic-insensitive normaliser that also unifies Arabic/Persian letter variants. */
export function normalize(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ًͯ-ٰٟ]/g, '')
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[‌‍]/g, ' ')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .toLowerCase();
}

export interface SearchFilters {
  q: string;
  c: CategoryId | '';
  s: string;
  b: BrandId | '';
  from: string;
  to: string;
}

export const EMPTY_FILTERS: SearchFilters = { q: '', c: '', s: '', b: '', from: '', to: '' };

const BRANDS: readonly BrandId[] = ['claude', 'openai', 'gemini'];
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function filtersFromParams(p: URLSearchParams): SearchFilters {
  const c = p.get('c') ?? '';
  const b = p.get('b') ?? '';
  const from = p.get('from') ?? '';
  const to = p.get('to') ?? '';
  return {
    q: (p.get('q') ?? '').slice(0, 200),
    c: (CATEGORY_IDS as readonly string[]).includes(c) ? (c as CategoryId) : '',
    s: (p.get('s') ?? '').slice(0, 80),
    b: (BRANDS as readonly string[]).includes(b) ? (b as BrandId) : '',
    from: DAY_RE.test(from) ? from : '',
    to: DAY_RE.test(to) ? to : '',
  };
}

export function hasActiveFilters(f: SearchFilters): boolean {
  return Boolean(f.q || f.c || f.s || f.b || f.from || f.to);
}

/** Words that match a brand filter's company as well as its product name. */
const BRAND_ALIASES: Record<BrandId, string> = { claude: 'claude anthropic', openai: 'openai chatgpt gpt', gemini: 'gemini google' };

function haystack(e: SearchEntry): string {
  return normalize(
    [e.t, e.tf ?? '', e.sn, e.s, e.x, e.e.join(' '), e.c, categoryLabel('en', e.c), categoryLabel('fa', e.c), e.b ? BRAND_ALIASES[e.b] : ''].join(' \u0001 '),
  );
}

const cache = new WeakMap<SearchEntry, string>();

export function searchEntries(entries: readonly SearchEntry[], f: SearchFilters): SearchEntry[] {
  const tokens = normalize(f.q).split(/\s+/).filter(Boolean);
  const seen = new Set<string>();
  const out: SearchEntry[] = [];
  for (const e of entries) {
    if (seen.has(e.id)) continue;
    if (f.c && e.c !== f.c) continue;
    if (f.s && e.s !== f.s) continue;
    if (f.b && e.b !== f.b && !e.e.includes(f.b === 'claude' ? 'anthropic' : f.b === 'gemini' ? 'google' : 'openai')) continue;
    if (f.from && e.d < f.from) continue;
    if (f.to && e.d > f.to) continue;
    if (tokens.length) {
      let h = cache.get(e);
      if (h === undefined) {
        h = haystack(e);
        cache.set(e, h);
      }
      if (!tokens.every((tk) => h!.includes(tk))) continue;
    }
    seen.add(e.id);
    out.push(e);
  }
  return out.sort((a, b) => (a.p !== b.p ? (a.p < b.p ? 1 : -1) : a.id < b.id ? -1 : 1));
}

export function sourceOptions(entries: readonly SearchEntry[]): { id: string; name: string }[] {
  const map = new Map<string, string>();
  for (const e of entries) if (!map.has(e.s)) map.set(e.s, e.sn);
  return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

export const RESULTS_PER_PAGE = 24;

export function paginate<T>(items: readonly T[], page: number, per = RESULTS_PER_PAGE): { items: T[]; page: number; total: number } {
  const total = Math.max(1, Math.ceil(items.length / per));
  const p = Math.min(Math.max(1, Math.trunc(page) || 1), total);
  return { items: items.slice((p - 1) * per, p * per), page: p, total };
}
