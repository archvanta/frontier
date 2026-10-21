import { afterEach, describe, expect, it, vi } from 'vitest';
import { displayExcerpt, displayTitle, persianDigits } from './article';
import { MESSAGES, dirFor, initialLocale, translate } from './i18n';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('i18n messages', () => {
  it('has every key in both languages, non-empty, with the same placeholders', () => {
    const en = MESSAGES.en;
    const fa = MESSAGES.fa;
    expect(Object.keys(fa).sort()).toEqual(Object.keys(en).sort());
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(en[key].trim(), key).not.toBe('');
      expect(fa[key].trim(), key).not.toBe('');
      expect(placeholders(fa[key]), key).toEqual(placeholders(en[key]));
    }
  });

  it('fills placeholders and maps direction', () => {
    expect(translate('en', 'search_window', { n: 90 })).toContain('90');
    expect(dirFor('fa')).toBe('rtl');
    expect(dirFor('en')).toBe('ltr');
  });
});

describe('initial locale', () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('prefers the stored choice, then the browser language', () => {
    vi.stubGlobal('navigator', { language: 'fa-IR' });
    expect(initialLocale()).toBe('fa');
    window.localStorage.setItem('signal-ai:locale', 'en');
    expect(initialLocale()).toBe('en');
    window.localStorage.setItem('signal-ai:locale', 'xx');
    vi.stubGlobal('navigator', { language: 'de-DE' });
    expect(initialLocale()).toBe('en');
  });
});

describe('translated story text', () => {
  const base = { title: 'Model released', excerpt: 'Weights are out.', lang: 'en' };

  it('shows the machine translation only in Persian and keeps the original otherwise', () => {
    const a = { ...base, tr: { fa: { title: 'مدل منتشر شد', excerpt: 'وزن‌ها منتشر شد.', engine: 'argos-en_fa-1.5', at: '2026-10-19T12:00:00Z' } } };
    expect(displayTitle(a, 'fa')).toEqual({ text: 'مدل منتشر شد', translated: true, lang: 'fa' });
    expect(displayTitle(a, 'en')).toEqual({ text: 'Model released', translated: false, lang: 'en' });
    expect(displayExcerpt(a, 'fa').translated).toBe(true);
  });

  it('falls back to the English original with its language when no translation exists', () => {
    expect(displayTitle(base, 'fa')).toEqual({ text: 'Model released', translated: false, lang: 'en' });
    const titleOnly = { ...base, tr: { fa: { title: 'مدل', engine: 'x', at: 'y' } } };
    expect(displayExcerpt(titleOnly, 'fa')).toEqual({ text: 'Weights are out.', translated: false, lang: 'en' });
  });
});

describe('Persian digits in machine-translated text', () => {
  it('turns standalone numbers into Persian digits', () => {
    expect(persianDigits('آسیا به قیمت 68 میلیارد دلار')).toBe('آسیا به قیمت ۶۸ میلیارد دلار');
    expect(persianDigits('اگر +50 نفر کشته شوند در 2026')).toBe('اگر +۵۰ نفر کشته شوند در ۲۰۲۶');
  });

  it('keeps digits that belong to product, model or benchmark names', () => {
    for (const name of ['GPT-6', 'GPT-5.6', 'i14', 'Trainium2', '3D', 'τ2-bench', 'X.509', 'FSR 4.1']) {
      expect(persianDigits(name)).toBe(name.replace('4.1', '۴.۱'));
    }
  });

  it('applies only to translated Persian text', () => {
    const a = { title: 'Raises $68 billion', excerpt: '', lang: 'en', tr: { fa: { title: 'جذب 68 میلیارد', engine: 'x', at: 'y' } } };
    expect(displayTitle(a, 'fa').text).toBe('جذب ۶۸ میلیارد');
    expect(displayTitle(a, 'en').text).toBe('Raises $68 billion');
  });
});
