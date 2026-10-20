import { useSyncExternalStore } from 'react';

export type Theme = 'dark' | 'light';

/** Same key and default as `public/theme-init.js`, which applies the saved theme before first paint. */
const STORAGE_KEY = 'signal-ai:theme';
const THEME_COLOR: Record<Theme, string> = { dark: '#000000', light: '#ffffff' };

const listeners = new Set<() => void>();

export function readStoredTheme(): Theme {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function currentTheme(): Theme {
  return typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function apply(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
  listeners.forEach((l) => l());
}

export function setTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* storage blocked: the choice lasts for this visit only */
  }
  apply(theme);
}

/** Re-applies the stored theme (the inline script already did this before paint; this also syncs `theme-color`). */
export function initTheme(): void {
  apply(readStoredTheme());
}

export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void; toggle: () => void } {
  const theme = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    currentTheme,
    () => 'dark' as Theme,
  );
  return { theme, setTheme, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') };
}
