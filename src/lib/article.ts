import type { Article, Locale } from './types';

/** Only http(s) links are ever rendered; anything else (javascript:, data:) is dropped. */
export function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

export interface DisplayText {
  text: string;
  /** True when the text is an offline machine translation. */
  translated: boolean;
  /** BCP-47 language of the text actually shown. */
  lang: string;
}

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
// A run of digits that is not part of a Latin or Greek token, so "68 میلیارد" changes but GPT-6, i14, 3D and τ2-bench stay.
const STANDALONE_NUMBER = /(?<![\p{Script=Latin}\p{Script=Greek}\d.\-_/])\d+(?:[.,]\d+)*(?![\p{Script=Latin}\p{Script=Greek}\d\-_/])/gu;

/** Persian digits for numbers that stand on their own in machine-translated Persian text; product and model names keep theirs. */
export function persianDigits(text: string): string {
  return text.replace(STANDALONE_NUMBER, (n) => n.replace(/\d/g, (d) => FA_DIGITS.charAt(Number(d))));
}

const localDigits = (text: string, locale: Locale) => (locale === 'fa' ? persianDigits(text) : text);

export function displayTitle(a: Pick<Article, 'title' | 'lang' | 'tr'>, locale: Locale): DisplayText {
  const tr = locale !== a.lang ? a.tr?.[locale] : undefined;
  return tr?.title ? { text: localDigits(tr.title, locale), translated: true, lang: locale } : { text: a.title, translated: false, lang: a.lang };
}

export function displayExcerpt(a: Pick<Article, 'excerpt' | 'lang' | 'tr'>, locale: Locale): DisplayText {
  const tr = locale !== a.lang ? a.tr?.[locale] : undefined;
  return tr?.excerpt ? { text: localDigits(tr.excerpt, locale), translated: true, lang: locale } : { text: a.excerpt, translated: false, lang: a.lang };
}

export function storyPath(a: Pick<Article, 'day' | 'id'>): string {
  return `/story/${a.day}/${a.id}`;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
