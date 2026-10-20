import type { ArchiveIndex, DayFile, Meta, PicksFile, SearchIndex, SectionFile, SectionId, SourcesFile } from './types';

declare const __SIGNAL_DATA_MODE__: 'mock' | 'live';

export const DATA_MODE: 'mock' | 'live' =
  typeof __SIGNAL_DATA_MODE__ === 'undefined' ? 'live' : __SIGNAL_DATA_MODE__;

export interface DataSource {
  mode: 'mock' | 'live';
  meta(): Promise<Meta | null>;
  archiveIndex(): Promise<ArchiveIndex | null>;
  day(day: string): Promise<DayFile | null>;
  picks(): Promise<PicksFile | null>;
  sources(): Promise<SourcesFile | null>;
  searchIndex(): Promise<SearchIndex | null>;
  section(id: SectionId): Promise<SectionFile | null>;
}

export class DataError extends Error {}

function createLiveSource(baseUrl: string, fetcher: typeof fetch = fetch): DataSource {
  const cache = new Map<string, Promise<unknown>>();
  const get = <T>(path: string): Promise<T | null> => {
    const hit = cache.get(path);
    if (hit) return hit as Promise<T | null>;
    const p = fetcher(`${baseUrl}data/${path}`, { cache: 'no-cache' })
      .then(async (res) => {
        if (res.status === 404) return null;
        if (!res.ok) throw new DataError(`HTTP ${res.status} for ${path}`);
        return (await res.json()) as T;
      })
      .catch((err: unknown) => {
        cache.delete(path); // allow retry after a network failure
        throw err instanceof DataError ? err : new DataError(String(err));
      });
    cache.set(path, p);
    return p;
  };
  return {
    mode: 'live',
    meta: () => get<Meta>('meta.json'),
    archiveIndex: () => get<ArchiveIndex>('archive-index.json'),
    day: (day) => get<DayFile>(`days/${day}.json`),
    picks: () => get<PicksFile>('picks.json'),
    sources: () => get<SourcesFile>('sources.json'),
    searchIndex: () => get<SearchIndex>('search-index.json'),
    section: (id) => get<SectionFile>(`sections/${id}.json`),
  };
}

function createMockSource(now: Date): DataSource {
  // Loaded lazily so production (live) bundles never ship fixture content.
  const ds = import('../fixtures/mockData').then((m) => m.buildMockDataset(now));
  return {
    mode: 'mock',
    meta: () => ds.then((d) => d.meta),
    archiveIndex: () => ds.then((d) => d.archiveIndex),
    day: (day) => ds.then((d) => d.days[day] ?? null),
    picks: () => ds.then((d) => d.picks),
    sources: () => ds.then((d) => d.sources),
    searchIndex: () => ds.then((d) => d.searchIndex),
    section: (id) => ds.then((d) => d.sections[id] ?? null),
  };
}

export function createDataSource(mode = DATA_MODE, now = new Date(), fetcher?: typeof fetch): DataSource {
  if (__SIGNAL_DATA_MODE__ === 'mock' || (import.meta.env.MODE === 'test' && mode === 'mock')) return createMockSource(now);
  return createLiveSource(import.meta.env.BASE_URL, fetcher);
}

export { createLiveSource as _createLiveSourceForTests };
