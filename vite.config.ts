/// <reference types="vitest/config" />
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { QURAN_DEPLOY_BASE } from './vite/quran-site.ts';
import { quranMetadata } from './vite/quran-metadata.ts';

export default defineConfig(({ command, isPreview = false }) => ({
  base: process.env['BASE_PATH'] ?? (command === 'build' || isPreview ? QURAN_DEPLOY_BASE : '/'),
  publicDir: resolve(import.meta.dirname, 'public/quran-only'),
  plugins: [react(), quranMetadata()],
  build: {
    rolldownOptions: {
      input: {
        home: resolve(import.meta.dirname, 'index.html'),
        quranAlias: resolve(import.meta.dirname, 'quran/index.html'),
      },
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'scripts/quran/**/*.test.ts', 'vite/**/*.test.ts'],
    environment: 'happy-dom',
    setupFiles: ['./src/test-utils/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html', 'lcov'],
      include: [
        'src/core/lib/**/*.ts',
        'src/core/quran/**/*.ts',
        'src/quran/location.ts',
        'src/quran/model.ts',
        'src/quran/share.ts',
        'scripts/quran/datasets.ts',
        'scripts/quran/pwa.ts',
        'scripts/quran/pinned-source.ts',
      ],
      exclude: ['**/*.test.{ts,tsx}'],
      thresholds: { statements: 98, lines: 98, functions: 98, branches: 88 },
    },
  },
}));
