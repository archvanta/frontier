/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages cannot send headers, so production builds carry a CSP meta tag. Only same-origin
// scripts, data and fonts; publisher images may come from any https host. (Not in dev: Vite's
// dev server injects inline scripts.)
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' https: data:",
  "media-src 'self'",
  "font-src 'self' data:", // Vite inlines very small font subsets as data: URLs
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const csp = (): Plugin => ({
  name: 'signal-csp',
  apply: 'build',
  transformIndexHtml: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' }],
});

// GitHub Pages serves this project from /<repo>/. Override with SIGNAL_BASE=/ for a root deploy.
const base = process.env.SIGNAL_BASE ?? '/SIGNAL_AI/';

export default defineConfig(({ mode }) => ({
  base,
  plugins: [react(), csp()],
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
