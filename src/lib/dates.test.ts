import { describe, expect, it } from 'vitest';
import { addDays, formatDay, isDay, todayAndYesterday, utcDay } from './dates';

describe('dates', () => {
  it('validates real calendar days only', () => {
    expect(isDay('2026-10-19')).toBe(true);
    expect(isDay('2026-02-30')).toBe(false);
    expect(isDay('2026-1-1')).toBe(false);
    expect(isDay(undefined)).toBe(false);
  });
  it('adds days across DST changes without drifting (UTC arithmetic)', () => {
    // Europe DST ends 2026-10-25 and US DST 2026-11-01; UTC days are unaffected.
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
  });
  it('computes today/yesterday from UTC', () => {
    expect(todayAndYesterday(new Date('2026-10-19T00:00:00Z'))).toEqual({ today: '2026-10-19', yesterday: '2026-10-18' });
    expect(utcDay(new Date('2026-10-18T23:59:59.999Z'))).toBe('2026-10-18');
  });
  it('formats a UTC archive day in both locales without shifting it', () => {
    expect(formatDay('2026-10-19', 'en')).toContain('19');
    expect(formatDay('2026-10-19', 'fa')).toMatch(/[۰-۹]/);
  });
});
