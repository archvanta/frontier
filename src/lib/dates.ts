import type { Locale } from './types';

/**
 * Archive policy: stories are grouped by the UTC calendar day of their source
 * publication time. "Today" and "Yesterday" are UTC days relative to the
 * viewer's clock. Display times are shown in the viewer's local timezone.
 */
export const ARCHIVE_TIMEZONE = 'UTC';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDay(value: string | null | undefined): value is string {
  if (!value || !DAY_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return utcDay(d);
}

export function todayAndYesterday(now: Date): { today: string; yesterday: string } {
  const today = utcDay(now);
  return { today, yesterday: addDays(today, -1) };
}

const LOCALE_TAG: Record<Locale, string> = { en: 'en-GB', fa: 'fa-IR' };

export function formatDateTime(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatTime(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], { hour: '2-digit', minute: '2-digit' }).format(d);
}

/** Formats an archive day (a UTC date) without shifting it into local time. */
export function formatDay(day: string, locale: Locale, style: 'long' | 'short' = 'long'): string {
  const d = new Date(`${day}T12:00:00Z`);
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    timeZone: 'UTC',
    weekday: style === 'long' ? 'long' : undefined,
    year: 'numeric',
    month: style === 'long' ? 'long' : 'short',
    day: 'numeric',
  }).format(d);
}

export function relativeTime(iso: string, now: Date, locale: Locale): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diffSec = Math.round((t - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(LOCALE_TAG[locale], { numeric: 'auto' });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  return rtf.format(Math.round(diffSec / 86400), 'day');
}

export function formatNumber(n: number, locale: Locale): string {
  return new Intl.NumberFormat(LOCALE_TAG[locale]).format(n);
}
