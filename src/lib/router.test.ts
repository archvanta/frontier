import { describe, expect, it } from 'vitest';
import { href, parseHash } from './router';

describe('parseHash', () => {
  it('parses home with page', () => {
    expect(parseHash('')).toEqual({ name: 'home', page: 1 });
    expect(parseHash('#/?page=3')).toEqual({ name: 'home', page: 3 });
    expect(parseHash('#/?page=abc')).toEqual({ name: 'home', page: 1 });
  });
  it('parses story deep links and rejects malformed ones', () => {
    expect(parseHash('#/story/2026-10-19/abcdef0123456789')).toEqual({ name: 'story', day: '2026-10-19', id: 'abcdef0123456789' });
    expect(parseHash('#/story/2026-13-40/abcdef').name).toBe('not-found');
    expect(parseHash('#/story/2026-10-19/<script>').name).toBe('not-found');
  });
  it('parses picks windows and category aliases', () => {
    expect(parseHash('#/picks/weekly')).toEqual({ name: 'picks', window: 'weekly' });
    expect(parseHash('#/picks/yearly').name).toBe('not-found');
    const r = parseHash('#/category/policy');
    expect(r.name === 'explore' && r.params.get('c')).toBe('policy');
  });
  it('keeps explore query parameters', () => {
    const r = parseHash('#/explore?q=gemini&c=models');
    expect(r.name === 'explore' && r.params.get('q')).toBe('gemini');
  });
  it('builds hrefs without empty params', () => {
    expect(href('/explore', { q: 'claude', c: '', page: undefined })).toBe('#/explore?q=claude');
  });
});
