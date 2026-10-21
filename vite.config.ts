/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages cannot send headers, so production builds carry a CSP meta tag. Only same-origin
// scripts, data and fonts; publisher images and video files may come from any https host. YouTube
// videos play only in the privacy-enhanced youtube-nocookie.com player frame. The only other origin
// the page may call is the Supabase project, when accounts are configured. (Not in dev: Vite's
// dev server injects inline scripts.)
function contentSecurityPolicy(supabaseOrigin: string | null): string {
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' https: data:",
    "media-src 'self' https:",
    "frame-src https://www.youtube-nocookie.com",
    "font-src 'self' data:", // Vite inlines very small font subsets as data: URLs
    `connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin}` : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

const csp = (policy: string): Plugin => ({
  name: 'signal-csp',
  apply: 'build',
  transformIndexHtml: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' }],
});

/** Account settings are public build variables. A secret key must never be bundled: fail the build instead. */
function supabaseOriginFrom(env: Record<string, string>): string | null {
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
  if (key.startsWith('sb_secret_') || /service_role/.test(Buffer.from(key.split('.')[1] ?? '', 'base64').toString('utf8'))) {
    throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY holds a secret/service_role key. Use the publishable (or anon) key; see docs/AUTH-SETUP.md.');
  }
  try {
    const u = new URL(env.VITE_SUPABASE_URL ?? '');
    return u.protocol === 'https:' ? u.origin : null;
  } catch {
    return null;
  }
}

// GitHub Pages serves this project from /<repo>/. Override with SIGNAL_BASE=/ for a root deploy.
const base = process.env.SIGNAL_BASE ?? '/SIGNAL_AI/';

export default defineConfig(({ mode }) => ({
  base,
  plugins: [react(), csp(contentSecurityPolicy(mode === 'mock' ? null : supabaseOriginFrom(loadEnv(mode, process.cwd(), 'VITE_'))))],
  define: {
    // "mock" mode renders clearly-labelled generated fixtures instead of public/data.
    __SIGNAL_DATA_MODE__: JSON.stringify(mode === 'mock' ? 'mock' : 'live'),
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 400,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
}));
