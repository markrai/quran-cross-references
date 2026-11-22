import { defineConfig, devices } from '@playwright/test';
import { QURAN_DEPLOY_BASE } from './vite/quran-site.ts';

const PORT = 4173;
export const BASE_URL = `http://localhost:${String(PORT)}${QURAN_DEPLOY_BASE}`;

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: /quran-reader\.spec\.ts/,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 1 : 0,
  failOnFlakyTests: Boolean(process.env['CI']),
  workers: process.env['CI'] ? 2 : 4,
  reporter: process.env['CI']
    ? [['github'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'phone',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: 'npm run preview -- --strictPort',
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
