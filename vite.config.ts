/// <reference types="vitest/config" />
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { QURAN_DEPLOY_BASE } from './vite/quran-site.ts';

export default defineConfig(({ command, isPreview = false }) => ({
  base: process.env['BASE_PATH'] ?? (command === 'build' || isPreview ? QURAN_DEPLOY_BASE : '/'),
  publicDir: resolve(import.meta.dirname, 'public/quran-only'),
  plugins: [react()],
  build: {
    rolldownOptions: {
      input: {
        home: resolve(import.meta.dirname, 'index.html'),
        quranAlias: resolve(import.meta.dirname, 'quran/index.html'),
      },
    },
  },
  test: {
    include: [
      'src/**/*.test.{ts,tsx}',
      'scripts/**/*.test.ts',
      'vite/**/*.test.ts',
      'tests/**/*.test.ts',
    ],
    // A DOM for the components; the pipeline's tests use Node's APIs, which are still here.
    environment: 'happy-dom',
    setupFiles: ['./src/test-utils/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}', 'scripts/data/**/*.ts', 'vite/**/*.ts'],
      // The gate: `npm run check` fails below these, so a change that adds untested code is
      // caught before review. Branches sit lower on purpose — `noUncheckedIndexedAccess` makes
      // TypeScript demand a fallback on every array read (`counts[verse] ?? 0`), and most of
      // those fallbacks cannot happen, so the last few points would be tests of nothing.
      thresholds: { statements: 98, lines: 98, functions: 98, branches: 88 },
      exclude: [
        '**/*.test.{ts,tsx}',
        'src/test-utils/**',
        'src/env.d.ts',
        // Entry points: they run on import, so importing them is running them.
        'src/app/main.tsx',
        'src/features/debug/main.tsx',
        'scripts/data/build.ts',
        'scripts/data/fetch.ts',
        // Drawing code that needs a GPU: a WebGL context, shaders and canvas painting cannot be
        // exercised in this environment, and a mock of them would test the mock.
        'src/visualizations/arcs/arc-scene.ts',
        'src/visualizations/arcs/arc-shaders.ts',
        'src/visualizations/arcs/arcs-controller.ts',
        'src/visualizations/arcs/axis-painter.ts',
        'src/visualizations/arcs/ArcsStage.tsx',
        'src/visualizations/shared/components/LoadingArcs.tsx',
        'src/visualizations/threads/threads-drawing.ts',
        // The share card's canvas and PNG encoding, which this environment has neither of. What
        // it draws is `verse-card.ts` and what it decides is `verse-card-layout.ts`, both tested.
        'src/visualizations/shared/verse-card-image.ts',
        'src/visualizations/threads/ThreadsStage.tsx',
        'src/visualizations/shared/glow.ts',
        'src/visualizations/shared/instanced-templates.ts',
        'src/visualizations/shared/webgl.ts',
        // Touch choreography and the views that host a GPU canvas. A fake DOM can be made to
        // report any pointer path and any transform, so a test here would mostly be checking
        // the fake; these are covered by the end-to-end suite in a real browser instead
        // (tests/e2e/, `npm run test:e2e`).
        'src/visualizations/shared/use-bottom-sheet.ts',
        'src/visualizations/arcs/ArcsExplorer.tsx',
        'src/visualizations/threads/ThreadsExplorer.tsx',
        'src/app/Explorer.tsx',
      ],
    },
  },
}));
