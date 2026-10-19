/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves this project from /<repo>/. Override with SIGNAL_BASE=/ for a root deploy.
const base = process.env.SIGNAL_BASE ?? '/SIGNAL_AI/';

export default defineConfig(({ mode }) => ({
  base,
  plugins: [react()],
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
