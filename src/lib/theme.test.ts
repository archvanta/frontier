import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { currentTheme, initTheme, readStoredTheme, setTheme } from './theme';

describe('theme', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.head.innerHTML = '<meta name="theme-color" content="#000000" />';
  });
  afterEach(() => vi.restoreAllMocks());

  it('defaults to dark', () => {
    expect(readStoredTheme()).toBe('dark');
    initTheme();
    expect(currentTheme()).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('saves the choice, applies it to <html> and updates the browser theme colour', () => {
    setTheme('light');
    expect(window.localStorage.getItem('signal-ai:theme')).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#ffffff');
    expect(readStoredTheme()).toBe('light');
    setTheme('dark');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#000000');
  });

  it('re-applies the stored theme on init and ignores unknown stored values', () => {
    window.localStorage.setItem('signal-ai:theme', 'light');
    initTheme();
    expect(currentTheme()).toBe('light');
    window.localStorage.setItem('signal-ai:theme', 'sepia');
    expect(readStoredTheme()).toBe('dark');
  });

  it('still switches for this visit when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readStoredTheme()).toBe('dark');
    setTheme('light');
    expect(currentTheme()).toBe('light');
  });
});
