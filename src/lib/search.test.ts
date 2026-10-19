import { describe, expect, it } from 'vitest';
import { filtersFromParams, normalize, paginate, searchEntries, sourceOptions, EMPTY_FILTERS } from './search';
import type { SearchEntry } from './types';

const e = (over: Partial<SearchEntry>): SearchEntry => ({
  id: 'id',
  d: '2026-10-19',
  t: 'Title',
  s: 'src',
  sn: 'Source',
  c: 'models',
  b: null,
  e: [],
  x: '',
  p: '2026-10-19T10:00:00Z',
  ...over,
});

const entries: SearchEntry[] = [
  e({ id: 'a', t: 'Anthropic releases Claude update', b: 'claude', e: ['anthropic'], s: 'tc', sn: 'TechCrunch', p: '2026-10-19T10:00:00Z' }),
  e({ id: 'b', t: 'Gemini gets new tools', tf: 'جمنای ابزارهای تازه می‌گیرد', b: 'gemini', e: ['google'], c: 'products', s: 'gb', sn: 'Google Blog', d: '2026-10-18', p: '2026-10-18T09:00:00Z' }),
  e({ id: 'c', t: 'EU AI Act guidance published', c: 'policy', s: 'tc', sn: 'TechCrunch', d: '2026-10-10', p: '2026-10-10T08:00:00Z' }),
  e({ id: 'a', t: 'duplicate id should be ignored', p: '2026-10-19T12:00:00Z' }),
];

describe('search', () => {
  it('matches all query tokens case-insensitively across title, source and entities', () => {
    expect(searchEntries(entries, { ...EMPTY_FILTERS, q: 'CLAUDE techcrunch' }).map((x) => x.id)).toEqual(['a']);
    expect(searchEntries(entries, { ...EMPTY_FILTERS, q: 'anthropic' }).map((x) => x.id)).toEqual(['a']);
  });
  it('searches Persian translations with letter normalisation', () => {
    expect(searchEntries(entries, { ...EMPTY_FILTERS, q: 'ابزارهاي' }).map((x) => x.id)).toEqual(['b']);
  });
  it('filters by category, source, company and date range', () => {
    expect(searchEntries(entries, { ...EMPTY_FILTERS, c: 'policy' }).map((x) => x.id)).toEqual(['c']);
    expect(searchEntries(entries, { ...EMPTY_FILTERS, s: 'tc' }).map((x) => x.id)).toEqual(['a', 'c']);
    expect(searchEntries(entries, { ...EMPTY_FILTERS, b: 'gemini' }).map((x) => x.id)).toEqual(['b']);
    expect(searchEntries(entries, { ...EMPTY_FILTERS, from: '2026-10-11', to: '2026-10-18' }).map((x) => x.id)).toEqual(['b']);
  });
  it('never returns the same id twice and sorts newest first', () => {
    const ids = searchEntries(entries, EMPTY_FILTERS).map((x) => x.id);
    expect(ids).toEqual(['a', 'b', 'c']);
  });
  it('parses and sanitises URL params', () => {
    const f = filtersFromParams(new URLSearchParams('q=gpt&c=nope&b=openai&from=2026-01-01&to=bad'));
    expect(f).toEqual({ q: 'gpt', c: '', s: '', b: 'openai', from: '2026-01-01', to: '' });
  });
  it('normalises digits and zero-width joiners', () => {
    expect(normalize('GPT‌۵')).toBe('gpt 5');
  });
  it('paginates without overlap and clamps pages', () => {
    const items = Array.from({ length: 50 }, (_, i) => i);
    const p1 = paginate(items, 1, 24);
    const p3 = paginate(items, 9, 24);
    expect(p1.items).toHaveLength(24);
    expect(p3.page).toBe(3);
    expect(p3.items).toEqual([48, 49]);
  });
  it('lists sources alphabetically', () => {
    expect(sourceOptions(entries).map((s) => s.name)).toEqual(['Google Blog', 'Source', 'TechCrunch']);
  });
});
