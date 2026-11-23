import { CANONICAL_QURAN } from '../../src/core/quran/quran-versification.ts';
import { expect, test } from '@playwright/test';
import { serveQuranBuild } from './serve-quran-build.ts';

test.describe('Quran-first application', () => {
  test('loads a canonical root ayah link without requesting Bible datasets', async ({ page }) => {
    const legacyRequests: string[] = [];
    page.on('request', (request) => {
      if (/\/data\/(?:translations|cross-references|words)\//.test(request.url())) {
        legacyRequests.push(request.url());
      }
    });
    await page.goto('./?ref=2%3A255');
    await expect(page.getByRole('heading', { name: /Al-Baqarah.*2:255/ })).toBeVisible();
    await expect(page.locator('[aria-label="Selected ayah"] [lang="ar"][dir="rtl"]')).toBeVisible();
    await expect(page.locator('[aria-label="Selected ayah"] [lang="en"][dir="ltr"]')).toBeVisible();
    await expect(page.getByRole('group', { name: /Relationships along/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Bible Explorer' })).toHaveCount(0);
    await expect(page.getByText('Loading verified Quran text and relationships…')).toHaveCount(0);
    expect(legacyRequests).toEqual([]);
  });

  test('switches between arc visualization and bilingual threads while preserving references', async ({
    page,
  }) => {
    await page.goto('./?ref=2%3A255');
    await expect(page.getByRole('heading', { name: /Al-Baqarah.*2:255/ })).toBeVisible();
    await page.getByRole('button', { name: 'Threads & Reader' }).click();
    await expect(page.getByRole('heading', { name: 'Threads from 2:255' })).toBeVisible();
    await expect(page).toHaveURL(/view=threads/);
    await expect(
      page
        .locator('[aria-label="Quran text and relationship threads"] [lang="ar"][dir="rtl"]')
        .first(),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Next ayah' }).click();
    await expect(page.getByRole('heading', { name: /Al-Baqarah.*2:256/ })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('heading', { name: /Al-Baqarah.*2:255/ })).toBeVisible();
  });

  test('allows changing surah and applying scope filters from the root', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { name: /Al-Baqarah.*2:1/ })).toBeVisible();
    await page.getByRole('combobox', { name: 'Surah' }).selectOption('114');
    await expect(page.getByRole('heading', { name: /An-Nas.*114:1/ })).toBeVisible();
    await page.getByRole('combobox', { name: 'Relationship scope' }).selectOption('cross-surah');
    await expect(page).toHaveURL(/scope=cross-surah/);
  });

  test('retains Phase 1C /quran/ links and navigates to canonical root URLs', async ({ page }) => {
    await page.goto('quran/?ref=2%3A255');
    await expect(page.getByRole('heading', { name: /Al-Baqarah.*2:255/ })).toBeVisible();
    await page.getByRole('button', { name: 'Threads & Reader' }).click();
    await expect(page).toHaveURL(/\/quran-cross-references\/\?ref=2%3A255&view=threads/);
    await expect(page.getByRole('heading', { name: 'Threads from 2:255' })).toBeVisible();
  });
});

test.describe('Phase 3A.1 bilingual verse search', () => {
  test('searches the existing English Quran offline-friendly dataset and restores query history', async ({
    page,
  }) => {
    const optionalSources: string[] = [];
    page.on('request', (request) => {
      if (/\/(?:qac|expressions|themes|emotions)\.json/.test(request.url())) {
        optionalSources.push(request.url());
      }
    });
    await page.goto('./?ref=2%3A1&view=threads');
    const search = page.getByRole('region', { name: 'Bilingual Quran verse search' });
    await search.getByRole('searchbox', { name: 'Verse text' }).fill('ALLAH');
    await search.getByRole('combobox', { name: 'Search surah filter' }).selectOption('1');
    await search.getByRole('button', { name: 'Search verses' }).click();
    await expect(page).toHaveURL(/q=ALLAH&qlang=en&qsurah=1/);
    await expect(search.locator('p[role="status"]')).toBeVisible();
    await expect(search.locator('mark').first()).toContainText(/allah/i);
    await search.getByRole('button', { name: /Al-Fatiha.*1:1/ }).click();
    await expect(page.getByRole('heading', { name: /Al-Fatiha.*1:1/ })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('heading', { name: /Al-Baqarah.*2:1/ })).toBeVisible();
    await expect(search.getByRole('searchbox', { name: 'Verse text' })).toHaveValue('ALLAH');
    expect(optionalSources).toEqual([]);
  });

  test('restores Arabic search deep links and highlights original Uthmani marks on phone and desktop', async ({
    page,
  }) => {
    await page.goto(
      './?ref=2%3A1&view=threads&q=%D8%A8%D8%B3%D9%85&qlang=ar&qmatch=unmarked&qsurah=1',
    );
    const search = page.getByRole('region', { name: 'Bilingual Quran verse search' });
    await expect(search.getByRole('searchbox', { name: 'Verse text' })).toHaveValue('بسم');
    await expect(search.getByRole('combobox', { name: 'Arabic matching' })).toHaveValue('unmarked');
    await expect(search.locator('p[role="status"]')).toBeVisible();
    await expect(search.locator('mark').first()).toContainText('بِسْم');
    await search.getByRole('button', { name: /Al-Fatiha.*1:1/ }).click();
    await expect(page.getByRole('heading', { name: /Al-Fatiha.*1:1/ })).toBeVisible();
    await expect(page).toHaveURL(/qmatch=unmarked/);
  });
});

test.describe('Phase 3B.1 reader-first experience', () => {
  test('restores research without losing the ayah or verse search after focused reading', async ({
    page,
  }) => {
    await page.goto('./?ref=2%3A255&view=threads&q=Allah&qlang=en');
    const originalUrl = new URL(page.url()).search;
    const search = page.getByRole('region', { name: 'Bilingual Quran verse search' });
    await expect(search).toBeVisible();
    await page.getByRole('button', { name: 'Enter reading mode' }).click();
    await expect(page.getByRole('region', { name: 'Distraction-free Quran reader' })).toBeVisible();
    await expect(search).toHaveCount(0);
    await expect(page.locator('[aria-label="Selected ayah relationships"]')).toHaveCount(0);
    await expect(page.getByRole('group', { name: 'Visualization' })).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: 'Surah' })).toBeVisible();
    await expect(page.locator('#quran-ayah-2-255')).toBeInViewport();
    expect(new URL(page.url()).search).toBe(originalUrl);

    await page.reload();
    await expect(page.getByRole('button', { name: 'Exit reading mode' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Distraction-free Quran reader' })).toBeVisible();
    await page.getByRole('button', { name: 'Next ayah' }).click();
    await expect(page).toHaveURL(/ref=2%3A256/);
    await page.getByRole('button', { name: 'Exit reading mode' }).click();
    await expect(search).toBeVisible();
    await expect(search.getByRole('searchbox', { name: 'Verse text' })).toHaveValue('Allah');
    await expect(page.getByRole('heading', { name: 'Threads from 2:256' })).toBeVisible();
    await expect(page).toHaveURL(/q=Allah&qlang=en/);
  });

  test('persists independent typography and language settings, including RTL text', async ({
    page,
  }) => {
    await page.goto('./?ref=2%3A255&view=threads');
    await page.getByText('Reading settings').click();
    await page.getByRole('combobox', { name: 'Reader language' }).selectOption('arabic');
    await page.getByRole('combobox', { name: 'Arabic text size' }).selectOption('140');
    await page.getByRole('combobox', { name: 'English text size' }).selectOption('120');
    await page.getByRole('combobox', { name: 'Reader line spacing' }).selectOption('spacious');
    const reader = page.getByRole('region', { name: 'Quran text and relationship threads' });
    await expect(reader.locator('[lang="ar"][dir="rtl"]').first()).toBeVisible();
    await expect(reader.locator('ol').first().locator('[lang="en"]')).toHaveCount(0);
    await expect(page.locator('#quran-main')).toHaveAttribute(
      'style',
      /--reading-arabic-size: 2\.45rem/,
    );
    await page.reload();
    await page.getByText('Reading settings').click();
    await expect(page.getByRole('combobox', { name: 'Reader language' })).toHaveValue('arabic');
    await expect(page.getByRole('combobox', { name: 'Arabic text size' })).toHaveValue('140');
    await expect(page.getByRole('combobox', { name: 'English text size' })).toHaveValue('120');
    await expect(page.getByRole('combobox', { name: 'Reader line spacing' })).toHaveValue(
      'spacious',
    );
    await page.getByRole('combobox', { name: 'Reader language' }).selectOption('english');
    await expect(reader.locator('[lang="ar"]')).toHaveCount(0);
    await expect(reader.locator('[lang="en"][dir="ltr"]').first()).toBeVisible();
    await expect(page).toHaveURL(/ref=2%3A255&view=threads/);
  });
});

test.describe('Phase 3B.2 reading navigation and accessibility', () => {
  test('provides one verse tab stop, canonical keyboard movement and preserved browser history', async ({
    page,
  }) => {
    await page.goto('./?ref=1%3A7&view=threads');
    const reader = page.getByRole('region', { name: 'Quran text and relationship threads' });
    const current = reader.locator('ol button[aria-current="true"]');
    await expect(reader.locator('ol button[tabindex="0"]')).toHaveCount(1);
    await expect(reader.locator('ol button[tabindex="-1"]')).toHaveCount(6);
    await current.focus();

    await page.keyboard.press('ArrowDown');
    await expect(page).toHaveURL(/ref=2%3A1&view=threads/);
    await expect(current).toBeFocused();
    await expect(reader.getByRole('status')).toContainText('Selected Al-Baqarah 2:1');

    await page.keyboard.press('End');
    await expect(page).toHaveURL(/ref=2%3A286&view=threads/);
    await expect(current).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(page).toHaveURL(/ref=3%3A1&view=threads/);
    await expect(current).toBeFocused();

    await page.keyboard.press('ArrowUp');
    await expect(page).toHaveURL(/ref=2%3A286&view=threads/);

    const url = page.url();
    await page.getByRole('searchbox', { name: 'Ayah reference' }).focus();
    await page.keyboard.press('ArrowDown');
    expect(page.url()).toBe(url);
    await page.goBack();
    await expect(page).toHaveURL(/ref=3%3A1&view=threads/);
    await expect(reader.locator('ol button[tabindex="0"]')).toHaveCount(1);
  });

  test('maintains 44px controls and surah navigation on a narrow phone', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('./?ref=114%3A6&view=threads');
    await page.getByRole('button', { name: 'Enter reading mode' }).click();

    const nav = page.getByRole('navigation', { name: 'Surah navigation' });
    await expect(nav).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next surah' })).toBeDisabled();
    const previous = page.getByRole('button', { name: 'Previous surah' });
    const bounds = await previous.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(bounds?.width ?? 0).toBeGreaterThanOrEqual(44);

    const step = page.getByRole('button', { name: 'Next ayah' });
    const stepBounds = await step.boundingBox();
    expect(stepBounds?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(stepBounds?.width ?? 0).toBeGreaterThanOrEqual(44);
    const navRight = await nav.evaluate((element) => element.getBoundingClientRect().right);
    expect(navRight).toBeLessThanOrEqual(321);

    await previous.click();
    await expect(page).toHaveURL(/ref=113%3A1&view=threads/);
    await nav.getByRole('button', { name: 'Focus selected ayah' }).click();
    await expect(
      page.getByRole('region', { name: 'Distraction-free Quran reader' }).locator(
        'ol button[aria-current="true"]',
      ),
    ).toBeFocused();
  });

  test('focuses the content landmark on view transitions without changing the ayah', async ({
    page,
  }) => {
    await page.goto('./?ref=2%3A255');
    await page.getByRole('button', { name: 'Threads & Reader' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#quran-main')).toBeFocused();
    await expect(page).toHaveURL(/ref=2%3A255&view=threads/);
    await page.getByRole('button', { name: 'Arcs' }).click();
    await expect(page.locator('#quran-main')).toBeFocused();
    await expect(page).toHaveURL(/ref=2%3A255/);
  });
});

test.describe('Quran production readiness', () => {
  test('publishes an installable manifest, generated icons and link preview metadata', async ({
    page,
    request,
  }) => {
    await page.goto('./');
    const manifestLink = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifestLink).toBeTruthy();
    const manifestResponse = await request.get(manifestLink ?? '');
    expect(manifestResponse.ok()).toBe(true);
    const manifest = (await manifestResponse.json()) as {
      name: string;
      start_url: string;
      scope: string;
      icons: { src: string; sizes: string; purpose: string }[];
    };
    expect(manifest.name).toBe('Quran Cross-References');
    expect(manifest.start_url).toBe('./');
    expect(manifest.scope).toBe('./');
    for (const size of [192, 512]) {
      const icon = manifest.icons.find(
        (entry) => entry.sizes === `${String(size)}x${String(size)}` && entry.purpose === 'any',
      );
      expect(icon).toBeDefined();
      const response = await request.get(new URL(icon?.src ?? '', manifestResponse.url()).href);
      expect(response.ok()).toBe(true);
      const data = await response.body();
      expect(data.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(data.readUInt32BE(16)).toBe(size);
      expect(data.readUInt32BE(20)).toBe(size);
    }
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
    const previewUrl = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(previewUrl).toMatch(/social-preview\.png$/);
    const localPreview = new URL(new URL(previewUrl ?? '').pathname, page.url()).href;
    const preview = await request.get(localPreview);
    expect(preview.ok()).toBe(true);
    const previewBytes = await preview.body();
    expect(previewBytes.readUInt32BE(16)).toBe(1200);
    expect(previewBytes.readUInt32BE(20)).toBe(630);
    const scripture = await request.get('data/quran/text.json');
    expect(scripture.ok()).toBe(true);
    const publishedText = (await scripture.json()) as { tanzilNotice: string };
    expect(publishedText.tanzilNotice).toContain('Copyright (C) 2007-2021 Tanzil Project');
    const evidenceResponse = await request.get('data/quran/evidence.json');
    expect(evidenceResponse.ok()).toBe(true);
    const evidence = (await evidenceResponse.json()) as {
      format: string;
      sources: { id: string; sha256: string }[];
      relationships: { stableId: string; legacyId: number; type: string }[];
    };
    expect(evidence.format).toBe('quran-relationship-evidence');
    expect(evidence.relationships).toHaveLength(2445);
    expect(evidence.relationships[0]?.legacyId).toBe(0);
    expect(evidence.relationships[0]?.stableId).toMatch(/^curated:mutashabihat:\d+-\d+:\d+-\d+$/);
    expect(evidence.relationships[0]?.type).toBe('curated-similar-passage');
    expect(evidence.sources[0]?.sha256).toBe(
      '785d5efa266a19c405a449b0a01ebf34fe7dc09836d5b6ef301eae874db780f0',
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://markrai.github.io/quran-cross-references/',
    );
  });

  test('loads Arabic, English and related passages when origin content is unavailable', async ({
    page,
    context,
  }) => {
    const site = await serveQuranBuild();
    try {
      await page.goto(site.url + '?ref=2%3A255');
      await expect(page.getByRole('heading', { name: /Al-Baqarah.*2:255/ })).toBeVisible();
      await page.waitForFunction(async () => {
        const registration = await navigator.serviceWorker.ready;
        const controller = navigator.serviceWorker.controller;
        if (controller?.state !== 'activated' || !controller.scriptURL.endsWith('/sw.js')) {
          return false;
        }
        const names = await caches.keys();
        const name = names.find((candidate) =>
          candidate.startsWith('quran-cross-references-shell-'),
        );
        if (!name) return false;
        const cache = await caches.open(name);
        const required = [
          '',
          'index.html',
          'quran/',
          'quran/index.html',
          'data/quran/text.json',
          'data/quran/relationships.json',
          'data/quran/evidence.json',
        ];
        const responses = await Promise.all(
          required.map((path) => cache.match(new URL(path, registration.scope))),
        );
        return responses.every((response) => response !== undefined);
      });
      await page.reload();
      await expect(page.getByRole('heading', { name: /Al-Baqarah.*2:255/ })).toBeVisible();
      await page.waitForFunction(() => navigator.serviceWorker.controller?.state === 'activated');
      const failures: string[] = [];
      page.on('pageerror', (error) => failures.push('Page error: ' + error.message));
      page.on('requestfailed', (request) => {
        failures.push(
          'Failed request: ' + request.url() + ' ' + (request.failure()?.errorText ?? ''),
        );
      });
      site.setUnavailable();
      const probe = await page.evaluate(async () => {
        const scope = (await navigator.serviceWorker.ready).scope;
        const paths = ['', 'quran/', 'data/quran/text.json', 'data/quran/relationships.json'];
        return Promise.all(
          paths.map(async (path) => {
            try {
              const response = await fetch(new URL(path, scope));
              return { path, status: response.status };
            } catch (error: unknown) {
              return { path, status: -1, error: String(error) };
            }
          }),
        );
      });
      expect(probe).toEqual([
        { path: '', status: 200 },
        { path: 'quran/', status: 200 },
        { path: 'data/quran/text.json', status: 200 },
        { path: 'data/quran/relationships.json', status: 200 },
      ]);
      const reloadResponse = await page.reload();
      expect(reloadResponse?.status()).toBe(200);
      try {
        await expect(page.getByRole('heading', { name: /Al-Baqarah.*2:255/ })).toBeVisible();
      } catch (error: unknown) {
        await test.info().attach('offline-reload-diagnostics.json', {
          contentType: 'application/json',
          body: Buffer.from(
            JSON.stringify(
              {
                url: page.url(),
                body: await page
                  .locator('body')
                  .innerText()
                  .catch(() => 'unavailable'),
                failures,
                probe,
              },
              null,
              2,
            ),
          ),
        });
        throw error;
      }
      await expect(page.locator('[aria-label="Selected ayah"] [lang="ar"]')).toBeVisible();
      await expect(page.locator('[aria-label="Selected ayah"] [lang="en"]')).toBeVisible();
      await page.goto(site.url + 'quran/?ref=114%3A6&view=threads');
      await expect(page.getByRole('heading', { name: /An-Nas.*114:6/ })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Threads from 114:6' })).toBeVisible();
      if (process.platform !== 'win32') {
        await context.setOffline(true);
        try {
          await page.reload();
          await expect(page.getByRole('heading', { name: /An-Nas.*114:6/ })).toBeVisible();
        } finally {
          await context.setOffline(false);
        }
      }
    } finally {
      await site.stop();
    }
  });

  test('supports keyboard skip navigation and touch-size passage controls', async ({ page }) => {
    await page.goto('./');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to Quran content' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#quran-main$/);
    await expect(page.getByRole('heading', { name: /Al-Baqarah.*2:1/ })).toBeVisible();
    const next = page.getByRole('button', { name: 'Next ayah' });
    const box = await next.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    await next.click();
    await expect(page).toHaveURL(/ref=2%3A2/);
  });

  test('shares a canonical ayah URL without a dependency on native sharing', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: (value: string) => {
            (window as Window & { copiedAyahLink?: string }).copiedAyahLink = value;
            return Promise.resolve();
          },
        },
      });
    });
    await page.goto('./?ref=2%3A255');
    await expect(page.getByRole('heading', { name: /Al-Baqarah.*2:255/ })).toBeVisible();
    await page.getByRole('button', { name: 'Share ayah' }).click();
    await expect(page.getByText('Ayah link copied')).toBeVisible();
    const copied = await page.evaluate(
      () => (window as Window & { copiedAyahLink?: string }).copiedAyahLink,
    );
    expect(copied).toBe('http://localhost:4173/quran-cross-references/?ref=2%3A255');
  });
});

test.describe('Quran Phase 2A graph exploration', () => {
  test('dragging immediately from the full-Quran overview zooms and pans', async ({ page }) => {
    await page.goto('./?ref=2%3A1');
    const graph = page.getByRole('group', { name: 'Relationships along the 6,236-ayah Quran' });
    const handle = page.getByRole('group', { name: 'Drag graph horizontally' });
    await expect(graph).toHaveAttribute('viewBox', '0 0 1200 400');
    await expect(handle).toContainText('Drag here to zoom and pan the graph');
    await handle.scrollIntoViewIfNeeded();
    const box = await handle.boundingBox();
    expect(box).toBeTruthy();
    if (!box) return;
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    try {
      await page.mouse.move(startX - 2, startY);
      await expect(graph).toHaveAttribute('viewBox', '0 0 1200 400');
      await page.mouse.move(startX - 120, startY, { steps: 8 });
      await expect
        .poll(async () => {
          const value = await graph.getAttribute('viewBox');
          return Number(value?.split(' ')[2] ?? '1200');
        })
        .toBeLessThan(1200);
      const viewBox = await graph.getAttribute('viewBox');
      const [x, , width] = (viewBox ?? '').split(' ').map(Number);
      expect(x).toBeGreaterThan(0);
      expect(width).toBeLessThan(1200);
      await expect(handle).toHaveAttribute('data-dragging', 'true');
    } finally {
      await page.mouse.up();
    }
    await expect(handle).toContainText('Drag here to pan the graph');
    await expect(handle).toHaveAttribute('data-dragging', 'false');
    await page.getByRole('button', { name: 'Reset graph view' }).click();
    await expect(graph).toHaveAttribute('viewBox', '0 0 1200 400');
  });

  test('zooms, pans and restores the full Quran viewport', async ({ page }) => {
    await page.goto('./?ref=2%3A1');
    await expect(page.getByRole('heading', { name: /Al-Baqarah.*2:1/ })).toBeVisible();
    const graph = page.getByRole('group', { name: 'Relationships along the 6,236-ayah Quran' });
    await expect(graph).toHaveAttribute('viewBox', '0 0 1200 400');

    await page.getByRole('button', { name: 'Zoom in graph' }).click();
    const zoomed = await graph.getAttribute('viewBox');
    expect(zoomed).not.toBe('0 0 1200 400');
    await expect(page.getByText('1.8×')).toBeVisible();

    await page.getByRole('button', { name: 'Pan graph right' }).click();
    expect(await graph.getAttribute('viewBox')).not.toBe(zoomed);

    const handle = page.getByRole('group', { name: 'Drag graph horizontally' });
    await expect(handle).toBeVisible();
    await handle.scrollIntoViewIfNeeded();
    const box = await handle.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;
      const beforeDrag = await graph.getAttribute('viewBox');
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      try {
        await expect(handle).toHaveAttribute('data-dragging', 'true');
        await page.mouse.move(startX + 90, startY, { steps: 6 });
        await expect.poll(async () => graph.getAttribute('viewBox')).not.toBe(beforeDrag);
      } finally {
        await page.mouse.up();
      }
      await expect(handle).toHaveAttribute('data-dragging', 'false');
    }

    await page.getByRole('button', { name: 'Reset graph view' }).click();
    await expect(graph).toHaveAttribute('viewBox', '0 0 1200 400');
  });

  test('focuses on a Quran passage range and restores it on browser back', async ({ page }) => {
    await page.goto('./?ref=2%3A1');
    await expect(page.getByRole('heading', { name: /Al-Baqarah.*2:1/ })).toBeVisible();
    await page.getByRole('combobox', { name: 'Graph focus end ayah' }).selectOption('5');
    await expect(page).toHaveURL(/ref=2%3A1&end=2%3A5/);
    await expect(page.getByText(/Focused passage: Al-Baqarah 2:1–5/)).toBeVisible();

    await page.getByRole('checkbox', { name: 'Only links touching selected passage' }).check();
    const links = page.locator('[data-graph-interactive][aria-pressed]');
    expect(await links.count()).toBeGreaterThan(0);

    await page.getByRole('combobox', { name: 'Graph focus end ayah' }).selectOption('');
    await expect(page).not.toHaveURL(/end=/);
    await page.goBack();
    await expect(page.getByRole('combobox', { name: 'Graph focus end ayah' })).toHaveValue('5');
  });

  test('shares relationship selections through the URL and returns to the reader', async ({
    page,
  }) => {
    await page.goto('./?ref=2%3A2');
    await expect(page.getByRole('heading', { name: /Al-Baqarah.*2:2/ })).toBeVisible();

    const arc = page.locator('[data-graph-interactive][aria-pressed]').first();
    await expect(arc).toBeVisible();
    await arc.focus();
    await arc.press('Enter');
    await expect(page).toHaveURL(/link=\d+/);
    await expect(page.getByRole('heading', { name: 'Selected relationship' })).toBeVisible();
    const selectedURL = page.url();

    await page.reload();
    await expect(page).toHaveURL(selectedURL);
    await expect(page.getByRole('heading', { name: 'Selected relationship' })).toBeVisible();
    await page.getByRole('button', { name: 'Read in Threads' }).click();
    await expect(page).toHaveURL(/view=threads/);
    await expect(page.getByRole('heading', { name: /Threads from/ })).toBeVisible();
  });

  test('selects ayahs through the graph axis keyboard and synchronizes history', async ({
    page,
  }) => {
    await page.goto('./?ref=2%3A1');
    await expect(page.getByRole('heading', { name: /Al-Baqarah.*2:1/ })).toBeVisible();
    const axis = page.getByRole('button', { name: 'Select ayah on Quran axis' });
    await axis.focus();
    await axis.press('ArrowRight');
    await expect(page).toHaveURL(/ref=2%3A2/);
    await expect(page.getByRole('heading', { name: /Al-Baqarah.*2:2/ })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('heading', { name: /Al-Baqarah.*2:1/ })).toBeVisible();
  });

  test('rejects invalid relationship URL IDs without crashing the graph', async ({ page }) => {
    await page.goto('./?ref=2%3A255&link=999999999');
    await expect(page.getByRole('heading', { name: /Al-Baqarah.*2:255/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Selected relationship' })).toHaveCount(0);
    await expect(
      page.getByRole('group', { name: 'Relationships along the 6,236-ayah Quran' }),
    ).toBeVisible();
  });
});

test.describe('Quran Phase 2B.3 computed expression exploration', () => {
  test('loads exact evidence only on demand without adding it to the offline installation cache', async ({
    page,
  }) => {
    const requested: string[] = [];
    page.on('request', (request) => {
      if (request.url().endsWith('/data/quran/expressions.json')) requested.push(request.url());
    });
    await page.goto('./?ref=2%3A1');
    await expect(page.getByRole('heading', { name: /Al-Baqarah.*2:1/ })).toBeVisible();
    expect(requested).toEqual([]);

    await page.getByRole('combobox', { name: 'Evidence type' }).selectOption('exact');
    await expect(page.getByRole('heading', { name: 'Verbatim Arabic repetitions' })).toBeVisible();
    expect(requested).toHaveLength(1);
    await expect(page).toHaveURL(/evidence=exact/);
    const expressionIsPrecached = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      const names = await caches.keys();
      const name = names.find((candidate) => candidate.startsWith('quran-cross-references-shell-'));
      if (!name) throw new Error('Quran PWA cache missing.');
      const cache = await caches.open(name);
      return (
        (await cache.match(new URL('data/quran/expressions.json', registration.scope))) !==
        undefined
      );
    });
    expect(expressionIsPrecached).toBe(false);

    await page.getByRole('combobox', { name: 'Evidence type' }).selectOption('curated');
    await expect(page.getByText(/visible links/)).toBeVisible();
    await expect(page).not.toHaveURL(/evidence=exact/);
  });

  test('restores a stable expression link and navigates its bounded graph and source spans', async ({
    page,
    request,
  }) => {
    const response = await request.get('data/quran/expressions.json');
    expect(response.ok()).toBe(true);
    const published = (await response.json()) as {
      format: string;
      tanzilNotice: string;
      expressions: {
        id: string;
        words: string[];
        occurrences: { ayah: number; start: number; end: number }[];
      }[];
    };
    expect(published.format).toBe('quran-exact-expressions');
    expect(published.tanzilNotice).toContain('Copyright (C) 2007-2021 Tanzil Project');
    expect(published.expressions).toHaveLength(5084);
    const expression = published.expressions.find(
      (item) => new Set(item.occurrences.map((site) => site.ayah)).size > 32,
    );
    expect(expression).toBeDefined();
    if (!expression) return;
    const first = expression.occurrences[0];
    if (!first) throw new Error('No source for selected expression.');
    const source = CANONICAL_QURAN.refAt(first.ayah);
    await page.goto(
      './?ref=' +
        encodeURIComponent(String(source.surah) + ':' + String(source.ayah)) +
        '&evidence=exact&expression=' +
        encodeURIComponent(expression.id),
    );
    await expect(page.getByRole('heading', { name: 'Verbatim Arabic repetitions' })).toBeVisible();
    await expect(
      page.getByRole('group', {
        name: 'Exact expression occurrences along the 6,236-ayah Quran',
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('region', { name: 'Exact Arabic expressions' }).locator('p[lang="ar"]'),
    ).toHaveText(expression.words.join(' '));
    await page.getByRole('button', { name: 'Next expression graph targets' }).click();
    await expect(page.getByText(/Showing 33–/)).toBeVisible();
    const target = expression.occurrences.find((site) => site.ayah !== first.ayah);
    if (!target) throw new Error('No second ayah for selected expression.');
    const targetRef = CANONICAL_QURAN.refAt(target.ayah);
    const targetLabel = String(targetRef.surah) + ':' + String(targetRef.ayah);
    await page
      .getByRole('region', { name: 'Exact Arabic expressions' })
      .getByRole('button', { name: new RegExp('^' + targetLabel) })
      .first()
      .click();
    await expect(page).toHaveURL(
      new RegExp('ref=' + String(targetRef.surah) + '%3A' + String(targetRef.ayah)),
    );
    await expect(page).toHaveURL(/expression=exact%3Av1%3A/);
    await page.getByRole('button', { name: 'Threads & Reader' }).click();
    await expect(page.getByRole('heading', { name: 'Verbatim Arabic repetitions' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Threads from ' + targetLabel })).toHaveCount(0);
    await expect(
      page.getByRole('region', { name: 'Quran text and exact expressions' }),
    ).toBeVisible();
  });
});

test.describe('Quran Phase 2C.1 reproducible analytics', () => {
  test('loads a pinned analytics projection on demand without loading full exact-expression evidence', async ({
    page,
    request,
  }) => {
    const downloads: string[] = [];
    page.on('request', (request) => {
      if (
        request.url().endsWith('/data/quran/analytics.json') ||
        request.url().endsWith('/data/quran/expressions.json')
      ) {
        downloads.push(request.url());
      }
    });
    await page.goto('./?ref=2%3A255');
    await expect(page.getByRole('heading', { name: /Al-Baqarah.*2:255/ })).toBeVisible();
    expect(downloads).toEqual([]);
    await page.getByRole('button', { name: 'Analytics' }).click();
    await expect(page).toHaveURL(/view=analytics/);
    await expect(
      page.getByRole('heading', { name: 'Explore the Quran through its connections' }),
    ).toBeVisible();
    await expect(page.getByLabel('Corpus summary')).toContainText('2,445');
    await expect(page.getByLabel('Corpus summary')).toContainText('5,084');
    expect(downloads.filter((url) => url.endsWith('/analytics.json'))).toHaveLength(1);
    expect(downloads.filter((url) => url.endsWith('/expressions.json'))).toHaveLength(0);

    const response = await request.get('data/quran/analytics.json');
    expect(response.ok()).toBe(true);
    const report = (await response.json()) as {
      format: string;
      surahs: unknown[];
      totals: { curatedLinks: number; exactExpressions: number; exactSpans: number };
      tanzilNotice: string;
    };
    expect(report.format).toBe('quran-analytics');
    expect(report.surahs).toHaveLength(114);
    expect(report.totals).toMatchObject({
      curatedLinks: 2445,
      exactExpressions: 5084,
      exactSpans: 16924,
    });
    expect(report.tanzilNotice).toContain('Copyright (C) 2007-2021 Tanzil Project');

    await page
      .getByRole('combobox', { name: 'Analytics evidence metric' })
      .selectOption('computed');
    await page.getByRole('combobox', { name: 'Analytics measure' }).selectOption('count');
    await page.getByRole('searchbox', { name: 'Filter analytics by surah' }).fill('Al-Fatihah');
    await expect(page.getByText(/1 surahs · Computed word spans/)).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Explore Al-Fatihah computed evidence' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Explore Al-Fatihah computed evidence' }).click();
    await expect(page).toHaveURL(/evidence=exact/);
    await expect(page.getByRole('heading', { name: 'Verbatim Arabic repetitions' })).toBeVisible();
    await page.goBack();
    await expect(
      page.getByRole('heading', { name: 'Explore the Quran through its connections' }),
    ).toBeVisible();
  });

  test('opens ranked exact Arabic evidence through stable expression links', async ({ page }) => {
    await page.goto('./?ref=55%3A13&view=analytics');
    await expect(page.getByRole('heading', { name: 'Most repeated exact phrases' })).toBeVisible();
    await page.getByRole('button', { name: 'Explore ranked Arabic phrase 1', exact: true }).click();
    await expect(page).toHaveURL(/evidence=exact&expression=exact%3Av1%3A/);
    await expect(page.getByRole('heading', { name: 'Verbatim Arabic repetitions' })).toBeVisible();
    await expect(
      page.getByRole('group', { name: 'Exact expression occurrences along the 6,236-ayah Quran' }),
    ).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/view=analytics/);
    await expect(
      page.getByRole('heading', { name: 'Explore the Quran through its connections' }),
    ).toBeVisible();
  });

  test('includes the compact analytics report in the offline PWA shell', async ({ page }) => {
    await page.goto('./?view=analytics');
    await expect(
      page.getByRole('heading', { name: 'Explore the Quran through its connections' }),
    ).toBeVisible();
    const cached = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      const names = await caches.keys();
      const name = names.find((candidate) => candidate.startsWith('quran-cross-references-shell-'));
      if (!name) return { analytics: false, expressions: false };
      const cache = await caches.open(name);
      const analytics = await cache.match(new URL('data/quran/analytics.json', registration.scope));
      const expressions = await cache.match(
        new URL('data/quran/expressions.json', registration.scope),
      );
      return { analytics: analytics !== undefined, expressions: expressions !== undefined };
    });
    expect(cached).toEqual({ analytics: true, expressions: false });
  });
});

test.describe('Quran Phase 2C.2 curated graph network', () => {
  test('publishes verified directed topology and loads it only on Network, without fetching exact expressions', async ({
    page,
    request,
  }) => {
    const downloads: string[] = [];
    page.on('request', (event) => {
      if (
        event.url().endsWith('/data/quran/topology.json') ||
        event.url().endsWith('/data/quran/expressions.json')
      )
        downloads.push(event.url());
    });
    await page.goto('./?ref=2%3A1');
    await expect(page.getByRole('heading', { name: /Al-Baqarah.*2:1/ })).toBeVisible();
    expect(downloads).toEqual([]);

    await page.getByRole('button', { name: 'Network', exact: true }).click();
    await expect(page).toHaveURL(/view=network/);
    await expect(
      page.getByRole('heading', { name: "Explore the Quran's relationship network" }),
    ).toBeVisible();
    await expect(
      page.getByRole('group', { name: 'Interactive surah connectivity network' }),
    ).toBeVisible();
    expect(downloads.filter((url) => url.endsWith('topology.json'))).toHaveLength(1);
    expect(downloads.filter((url) => url.endsWith('expressions.json'))).toHaveLength(0);

    const response = await request.get('data/quran/topology.json');
    expect(response.ok()).toBe(true);
    const graph = (await response.json()) as {
      format: string;
      linkCount: number;
      surahs: unknown[];
      edges: { source: number; target: number; ids: number[] }[];
      topAyahs: unknown[];
    };
    expect(graph.format).toBe('quran-curated-topology');
    expect(graph.linkCount).toBe(2445);
    expect(graph.surahs).toHaveLength(114);
    expect(graph.topAyahs).toHaveLength(32);
    expect(graph.edges.length).toBeGreaterThan(0);
    await page.getByRole('combobox', { name: 'Network direction' }).selectOption('incoming');
    await expect(page).toHaveURL(/direction=incoming/);
    await page.getByRole('combobox', { name: 'Minimum surah links' }).selectOption('5');
    await expect(page.getByLabel('Surah connections')).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('combobox', { name: 'Network direction' })).toHaveValue('both');
  });

  test('opens a real curated source link from the directed surah network and restores graph history', async ({
    page,
  }) => {
    await page.goto('./?ref=2%3A1&view=network');
    await expect(
      page.getByRole('heading', { name: "Explore the Quran's relationship network" }),
    ).toBeVisible();
    const links = page.getByLabel('Verified surah pair links').getByRole('button');
    await expect(links.first()).toBeVisible();
    await links.first().click();
    await expect(page).toHaveURL(/link=\d+/);
    await expect(page.getByRole('heading', { name: 'Selected relationship' })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/view=network/);
    await expect(
      page.getByRole('heading', { name: "Explore the Quran's relationship network" }),
    ).toBeVisible();
  });

  test('navigates ranked ayah nodes and expands only a bounded second-hop neighborhood', async ({
    page,
    request,
  }) => {
    const response = await request.get('data/quran/topology.json');
    expect(response.ok()).toBe(true);
    const report = (await response.json()) as {
      topAyahs: { ayah: number }[];
    };
    const first = report.topAyahs[0];
    if (!first) throw new Error('No curated ayahs in topology.');
    const ref = CANONICAL_QURAN.refAt(first.ayah);
    const label = String(ref.surah) + ':' + String(ref.ayah);
    await page.goto('./?ref=2%3A1&view=network');
    await page.getByRole('button', { name: 'Explore ranked connected ayah ' + label }).click();
    await expect(page).toHaveURL(/view=network&network=ayah/);
    await expect(
      page.getByRole('group', { name: 'Interactive bounded ayah neighborhood' }),
    ).toBeVisible();
    await page.getByRole('combobox', { name: 'Neighborhood depth' }).selectOption('2');
    await expect(page).toHaveURL(/depth=2/);
    await expect(page.getByText(/second-hop incidences/)).toBeVisible();
    await expect(page.getByLabel('Neighborhood source links')).toBeVisible();
    const edges = page.getByLabel('Neighborhood source links').getByRole('button');
    expect(await edges.count()).toBeLessThanOrEqual(36);
    expect(await edges.count()).toBeGreaterThan(0);
    await edges.first().click();
    await expect(page).toHaveURL(/link=\d+/);
    await expect(page.getByRole('heading', { name: 'Selected relationship' })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/view=network&network=ayah&depth=2/);
  });

  test('precaches the compact topology report but not all computed phrase occurrences', async ({
    page,
  }) => {
    await page.goto('./?view=network');
    await expect(
      page.getByRole('heading', { name: "Explore the Quran's relationship network" }),
    ).toBeVisible();
    const cached = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      const names = await caches.keys();
      const name = names.find((candidate) => candidate.startsWith('quran-cross-references-shell-'));
      if (!name) return { topology: false, expressions: false };
      const cache = await caches.open(name);
      const topology = await cache.match(new URL('data/quran/topology.json', registration.scope));
      const expressions = await cache.match(
        new URL('data/quran/expressions.json', registration.scope),
      );
      return { topology: topology !== undefined, expressions: expressions !== undefined };
    });
    expect(cached).toEqual({ topology: true, expressions: false });
    await page
      .getByRole('button', { name: 'Explore computed exact Arabic phrases separately' })
      .click();
    await expect(page).toHaveURL(/evidence=exact/);
    await expect(page.getByRole('heading', { name: 'Verbatim Arabic repetitions' })).toBeVisible();
  });
});

test.describe('Quran Phase 2B.4 original QAC morphology', () => {
  test('fetches QAC only on demand and lets the user explore real word, lemma and root occurrences', async ({
    page,
    request,
  }) => {
    const morphologyRequests: string[] = [];
    page.on('request', (event) => {
      if (event.url().endsWith('/data/quran/morphology.json')) {
        morphologyRequests.push(event.url());
      }
    });
    await page.goto('./?ref=1%3A1');
    await expect(page.getByRole('heading', { name: /Al-Fatihah.*1:1/ })).toBeVisible();
    expect(morphologyRequests).toEqual([]);
    await page.getByRole('combobox', { name: 'Evidence type' }).selectOption('morphology');
    await expect(page).toHaveURL(/evidence=morphology/);
    await expect(
      page.getByRole('heading', { name: 'Arabic lemmas, roots, and grammar' }),
    ).toBeVisible();
    expect(morphologyRequests).toHaveLength(1);

    const response = await request.get('data/quran/morphology.json');
    expect(response.ok()).toBe(true);
    const dataset = (await response.json()) as {
      format: string;
      wordCount: number;
      segmentCount: number;
      stemCount: number;
      ayahs: unknown[][];
      qacNotice: string;
    };
    expect(dataset).toMatchObject({
      format: 'quran-qac-morphology',
      wordCount: 77429,
      segmentCount: 128219,
      stemCount: 77915,
    });
    expect(dataset.ayahs).toHaveLength(6236);
    expect(dataset.ayahs[0]).toHaveLength(4);
    expect(dataset.qacNotice).toContain('Copyright (C) 2011 Kais Dukes');

    await page.getByRole('combobox', { name: 'Morphology grouping' }).selectOption('root');
    await page.getByRole('button', { name: 'Inspect annotated word 3' }).click();
    await expect(page).toHaveURL(/morph=root&term=rHm&word=3/);
    await expect(page.getByLabel('Original word segment analysis')).toContainText('ROOT:rHm');
    const occurrences = page.getByRole('button', { name: /Open morphology source/ });
    await expect(occurrences.first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next occurrences' })).toBeEnabled();
    await page.getByRole('button', { name: 'Next occurrences' }).click();
    await expect(page.getByText(/Page 2 of/)).toBeVisible();
    await occurrences.first().click();
    await expect(page).toHaveURL(/word=\d+/);
    await expect(
      page.getByRole('heading', { name: 'Arabic lemmas, roots, and grammar' }),
    ).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/morph=root&term=rHm&word=3/);
  });

  test('supports Arabic root search, deep-link restoration, and separate evidence switching', async ({
    page,
  }) => {
    await page.goto('./?ref=1%3A1&evidence=morphology&morph=root');
    await expect(
      page.getByRole('heading', { name: 'Arabic lemmas, roots, and grammar' }),
    ).toBeVisible();
    await page.getByRole('textbox', { name: 'Search morphology term' }).fill('رحم');
    await page.getByRole('button', { name: 'Find', exact: true }).click();
    await expect(page).toHaveURL(/term=rHm/);
    await expect(page.getByLabel('Morphology occurrence evidence')).toContainText('rHm');
    await page.getByRole('combobox', { name: 'Evidence type' }).selectOption('exact');
    await expect(page).toHaveURL(/evidence=exact/);
    await expect(page).not.toHaveURL(/term=/);
    await expect(page.getByRole('heading', { name: 'Verbatim Arabic repetitions' })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/evidence=morphology&morph=root&term=rHm/);
  });

  test('does not precache the large QAC sidecar with the offline reader', async ({ page }) => {
    await page.goto('./?ref=2%3A255&evidence=morphology');
    await expect(
      page.getByRole('heading', { name: 'Arabic lemmas, roots, and grammar' }),
    ).toBeVisible();
    const cached = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      const names = await caches.keys();
      const name = names.find((candidate) => candidate.startsWith('quran-cross-references-shell-'));
      if (!name) return { morphology: false, text: false };
      const cache = await caches.open(name);
      const morphology = await cache.match(
        new URL('data/quran/morphology.json', registration.scope),
      );
      const text = await cache.match(new URL('data/quran/text.json', registration.scope));
      return { morphology: morphology !== undefined, text: text !== undefined };
    });
    expect(cached).toEqual({ morphology: false, text: true });
  });
});

test.describe('Quran Phase 2D.1 independently annotated themes', () => {
  test('loads experimental theme annotations on demand, with integrity and no separate translation shipping', async ({
    page,
    request,
  }) => {
    const requests: string[] = [];
    page.on('request', (event) => {
      if (event.url().endsWith('/data/quran/themes.json')) requests.push(event.url());
    });
    await page.goto('./?ref=1%3A1');
    await expect(page.getByRole('heading', { name: /Al-Fatihah.*1:1/ })).toBeVisible();
    expect(requests).toEqual([]);
    await page.getByRole('button', { name: 'Themes', exact: true }).click();
    await expect(page).toHaveURL(/view=themes/);
    await expect(
      page.getByRole('heading', { name: 'Thematic exploration across the Quran' }),
    ).toBeVisible();
    expect(requests).toHaveLength(1);
    const response = await request.get('data/quran/themes.json');
    expect(response.ok()).toBe(true);
    const report = (await response.json()) as {
      format: string;
      origin: string;
      tags: unknown[];
      ayahs: number[][];
      annotationCount: number;
    };
    expect(report.format).toBe('quran-external-themes');
    expect(report.origin).toBe('external-llm-assisted-annotation');
    expect(report.tags).toHaveLength(338);
    expect(report.ayahs).toHaveLength(6236);
    expect(report.annotationCount).toBeGreaterThan(14000);
    expect(Object.keys(report)).not.toContain('eng');
    expect(Object.keys(report)).not.toContain('arabic');
  });

  test('filters thematic concepts and opens the original cited ayah with back navigation', async ({
    page,
  }) => {
    await page.goto('./?ref=1%3A1&view=themes');
    await expect(
      page.getByRole('heading', { name: 'Thematic exploration across the Quran' }),
    ).toBeVisible();
    await page.getByRole('searchbox', { name: 'Search Quran topics' }).fill('Divine Mercy');
    await page
      .getByRole('button', { name: /Divine Mercy/ })
      .first()
      .click();
    await expect(page).toHaveURL(/view=themes&theme=Divine\+Mercy/);
    await expect(page.getByRole('heading', { name: 'Divine Mercy' })).toBeVisible();
    await expect(page.getByLabel('Theme distribution by surah')).toBeVisible();
    await page.getByRole('combobox', { name: 'Theme verse scope' }).selectOption('surah');
    await expect(page.getByLabel('Theme tagged Quran verses')).toBeVisible();
    await page.getByRole('combobox', { name: 'Theme verse scope' }).selectOption('all');
    await expect(page.getByRole('button', { name: 'Next labeled verses' })).toBeEnabled();
    await page.getByRole('button', { name: 'Next labeled verses' }).click();
    await expect(page.getByText(/2 \/ \d+/).last()).toBeVisible();
    await page
      .getByRole('button', { name: /Read tagged Quran ayah/ })
      .first()
      .click();
    await expect(page).toHaveURL(/view=threads/);
    await expect(page.getByRole('heading', { name: /Threads from/ })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/view=themes&theme=Divine\+Mercy/);
    await expect(page.getByRole('heading', { name: 'Divine Mercy' })).toBeVisible();
  });

  test('does not add optional experimental themes to the offline reader installation cache', async ({
    page,
  }) => {
    await page.goto('./?view=themes');
    await expect(
      page.getByRole('heading', { name: 'Thematic exploration across the Quran' }),
    ).toBeVisible();
    const cached = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      const names = await caches.keys();
      const name = names.find((candidate) => candidate.startsWith('quran-cross-references-shell-'));
      if (!name) return { themes: false, text: false };
      const cache = await caches.open(name);
      const themes = await cache.match(new URL('data/quran/themes.json', registration.scope));
      const text = await cache.match(new URL('data/quran/text.json', registration.scope));
      return { themes: themes !== undefined, text: text !== undefined };
    });
    expect(cached).toEqual({ themes: false, text: true });
  });
});

test.describe('Quran Phase 2D.2 specialist-reviewed emotion evidence', () => {
  test('loads optional emotion source without forcing QSAC or republishing source texts', async ({
    page,
    request,
  }) => {
    const emotionRequests: string[] = [];
    const themeRequests: string[] = [];
    page.on('request', (event) => {
      if (event.url().endsWith('/data/quran/emotions.json')) emotionRequests.push(event.url());
      if (event.url().endsWith('/data/quran/themes.json')) themeRequests.push(event.url());
    });
    await page.goto('./?ref=2%3A255');
    await expect(page.getByRole('heading', { name: /Al-Baqarah.*2:255/ })).toBeVisible();
    expect(emotionRequests).toEqual([]);
    await page.getByRole('button', { name: 'Emotions', exact: true }).click();
    await expect(page).toHaveURL(/view=emotions/);
    await expect(
      page.getByRole('heading', { name: 'Emotion labels and thematic intersections' }),
    ).toBeVisible();
    expect(emotionRequests).toHaveLength(1);
    expect(themeRequests).toEqual([]);
    await expect(page.getByLabel('ELQV source coverage audit')).toContainText('2,087');
    const response = await request.get('data/quran/emotions.json');
    expect(response.ok()).toBe(true);
    const report = (await response.json()) as {
      format: string;
      origin: string;
      rowCount: number;
      distinctAyahCount: number;
      membershipCount: number;
      identicalDuplicateCount: number;
      conflictedAyahCount: number;
      entries: unknown[];
    };
    expect(report).toMatchObject({
      format: 'quran-external-emotions',
      origin: 'external-specialist-annotated-emotions',
      rowCount: 2100,
      distinctAyahCount: 2087,
      membershipCount: 2092,
      identicalDuplicateCount: 8,
      conflictedAyahCount: 4,
    });
    expect(report.entries).toHaveLength(2087);
    expect(Object.keys(report)).not.toContain('Verse Diac');
    expect(Object.keys(report)).not.toContain('arabic');
    expect(Object.keys(report)).not.toContain('english');
  });

  test('shows each disputed label instead of collapsing ambiguity, with browser back navigation', async ({
    page,
  }) => {
    await page.goto('./?ref=26%3A8&view=emotions&emotion=conflicts');
    await expect(
      page.getByRole('heading', { name: 'Emotion labels and thematic intersections' }),
    ).toBeVisible();
    await expect(page.getByLabel('Source-annotated emotion verses')).toContainText(
      '4 distinct matching ayahs',
    );
    const verse = page.getByRole('button', { name: 'Read emotion-annotated Quran ayah 26:8' });
    await expect(verse).toContainText('fear, anger, sadness');
    await expect(verse).toContainText('Conflicting annotations');
    await verse.click();
    await expect(page).toHaveURL(/view=threads/);
    await expect(page.getByRole('heading', { name: 'Threads from 26:8' })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/view=emotions&emotion=conflicts/);
    await expect(verse).toBeVisible();
    await page.getByRole('combobox', { name: 'Emotion research filter' }).selectOption('fear');
    await expect(page).toHaveURL(/view=emotions&emotion=fear/);
    await expect(page.getByRole('button', { name: 'Next annotated verses' })).toBeEnabled();
  });

  test('loads QSAC independently only when requested and allows shareable topic intersections', async ({
    page,
  }) => {
    const qsac: string[] = [];
    page.on('request', (event) => {
      if (event.url().endsWith('/data/quran/themes.json')) qsac.push(event.url());
    });
    await page.goto('./?ref=1%3A1&view=emotions&emotion=fear');
    await expect(
      page.getByRole('heading', { name: 'Emotion labels and thematic intersections' }),
    ).toBeVisible();
    expect(qsac).toEqual([]);
    await page.getByRole('button', { name: 'Load QSAC topics for comparison' }).click();
    await expect(page.getByRole('combobox', { name: 'Compare with QSAC topic' })).toBeVisible();
    expect(qsac).toHaveLength(1);
    await page
      .getByRole('combobox', { name: 'Compare with QSAC topic' })
      .selectOption('Divine Mercy');
    await expect(page).toHaveURL(/view=emotions&theme=Divine\+Mercy&emotion=fear/);
    await expect(page.getByLabel('Independent source intersections')).toContainText('Divine Mercy');
    await expect(page.getByLabel('Source-annotated emotion verses')).toContainText(
      'matching ayahs',
    );
    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Compare with QSAC topic' })).toHaveValue(
      'Divine Mercy',
    );
  });

  test('excludes the optional emotion source from installation precache', async ({ page }) => {
    await page.goto('./?view=emotions');
    await expect(
      page.getByRole('heading', { name: 'Emotion labels and thematic intersections' }),
    ).toBeVisible();
    const cached = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      const names = await caches.keys();
      const name = names.find((candidate) => candidate.startsWith('quran-cross-references-shell-'));
      if (!name) return { emotion: false, text: false };
      const cache = await caches.open(name);
      const emotion = await cache.match(new URL('data/quran/emotions.json', registration.scope));
      const text = await cache.match(new URL('data/quran/text.json', registration.scope));
      return { emotion: emotion !== undefined, text: text !== undefined };
    });
    expect(cached).toEqual({ emotion: false, text: true });
  });
});

test.describe('Quran Phase 2E.1 unified ayah evidence inspector', () => {
  test('keeps optional sources unloaded until chosen and restores the curated section through history', async ({
    page,
  }) => {
    const optional: string[] = [];
    page.on('request', (request) => {
      if (/\/data\/quran\/(?:expressions|morphology|themes|emotions)\.json$/.test(request.url())) {
        optional.push(request.url());
      }
    });
    await page.goto('./?ref=2%3A255&view=threads');
    await expect(page.getByRole('heading', { name: /Al-Baqarah.*2:255/ })).toBeVisible();
    const toggle = page.getByRole('button', { name: /Evidence for this ayah/ });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(optional).toEqual([]);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page).toHaveURL(/view=threads&inspect=curated/);
    await expect(page.getByLabel('Inspector curated passage evidence')).toBeVisible();
    await expect(page.getByLabel('Choose an ayah evidence source')).toContainText('Not checked');
    expect(optional).toEqual([]);
    await page.getByRole('button', { name: 'Next ayah' }).click();
    await expect(page).toHaveURL(/ref=2%3A256&view=threads&inspect=curated/);
    await expect(page.getByLabel('Ayah evidence inspector')).toContainText('2:256');
    await page.goBack();
    await expect(page).toHaveURL(/ref=2%3A255&view=threads&inspect=curated/);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page).not.toHaveURL(/inspect=/);
  });

  test('opens a single verified QSAC source and returns from original topic explorer', async ({
    page,
  }) => {
    const requests: string[] = [];
    page.on('request', (event) => {
      if (/\/data\/quran\/(?:expressions|morphology|themes|emotions)\.json$/.test(event.url())) {
        requests.push(event.url());
      }
    });
    await page.goto('./?ref=1%3A1&view=threads&inspect=themes');
    await expect(page.getByLabel('Inspector QSAC thematic evidence')).toContainText('Divine Mercy');
    expect(requests).toHaveLength(1);
    expect(requests[0]).toContain('/themes.json');
    await expect(page.getByLabel('Choose an ayah evidence source')).toContainText('Not checked');
    await page
      .getByLabel('Inspector QSAC thematic evidence')
      .getByRole('button', {
        name: /Divine Mercy/,
      })
      .click();
    await expect(page).toHaveURL(/view=themes&theme=Divine\+Mercy/);
    await expect(page.getByRole('heading', { name: 'Divine Mercy' })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/view=threads&inspect=themes/);
    await expect(page.getByLabel('Inspector QSAC thematic evidence')).toContainText('Divine Mercy');
    expect(requests).toHaveLength(1);
  });

  test('preserves conflicting ELQV labels without inferring neutral labels for uncovered verses', async ({
    page,
  }) => {
    await page.goto('./?ref=26%3A8&view=threads&inspect=emotions');
    const panel = page.getByLabel('Inspector ELQV emotion evidence');
    await expect(panel).toContainText(
      'Multiple conflicting categories are preserved without voting',
    );
    await expect(panel.getByRole('button', { name: /Fear/ })).toBeVisible();
    await expect(panel.getByRole('button', { name: /Anger/ })).toBeVisible();
    await expect(panel.getByRole('button', { name: /Sadness/ })).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(/view=threads&inspect=emotions/);
    await expect(panel.getByRole('button', { name: /Fear/ })).toBeVisible();
    await page.getByRole('button', { name: 'Next ayah' }).click();
    await expect(page).toHaveURL(/ref=26%3A9&view=threads&inspect=emotions/);
    await page.goto('./?ref=1%3A1&view=threads&inspect=emotions');
    await expect(page.getByLabel('Inspector ELQV emotion evidence')).toContainText(
      'Not covered by the ELQV sample',
    );
    await expect(page.getByLabel('Ayah evidence inspector')).toContainText('Not covered by ELQV');
  });

  test('drills into QAC source words without aligning historical token positions to displayed Arabic', async ({
    page,
  }) => {
    await page.goto('./?ref=1%3A1&view=threads&inspect=morphology');
    const panel = page.getByLabel('Inspector Arabic morphology evidence');
    await expect(panel).toContainText('historical QAC tokenization');
    await expect(panel.getByRole('button', { name: /QAC word 3/ })).toBeVisible();
    await panel.getByRole('button', { name: /QAC word 3/ }).click();
    await expect(page).toHaveURL(/evidence=morphology/);
    await expect(page).toHaveURL(/word=3/);
    await expect(page).not.toHaveURL(/inspect=/);
    await expect(
      page.getByRole('heading', { name: 'Arabic lemmas, roots, and grammar' }),
    ).toBeVisible();
  });

  test('checks all independently verified sources on explicit request and retains coverage as ayahs change', async ({
    page,
  }) => {
    const requested = new Set<string>();
    page.on('request', (event) => {
      const source = /\/data\/quran\/(expressions|morphology|themes|emotions)\.json$/;
      const match = source.exec(event.url());
      if (match?.[1]) requested.add(match[1]);
    });
    await page.goto('./?ref=2%3A255&view=threads');
    await page.getByRole('button', { name: /Evidence for this ayah/ }).click();
    await page.getByRole('button', { name: 'Check all five sources' }).click();
    await expect(page).toHaveURL(/inspect=all/);
    await expect(page.getByLabel('Inspector curated passage evidence')).toBeVisible();
    await expect(page.getByLabel('Inspector exact Arabic evidence')).toBeVisible();
    await expect(page.getByLabel('Inspector Arabic morphology evidence')).toBeVisible();
    await expect(page.getByLabel('Inspector QSAC thematic evidence')).toBeVisible();
    await expect(page.getByLabel('Inspector ELQV emotion evidence')).toBeVisible();
    await expect(page.getByLabel('Choose an ayah evidence source')).not.toContainText(
      'Checking source',
    );
    await expect(page.getByLabel('Choose an ayah evidence source')).not.toContainText(
      'Verification failed',
    );
    await expect(page.getByLabel('Ayah evidence inspector')).toContainText('of 5 checked sources');
    expect([...requested].sort()).toEqual(['emotions', 'expressions', 'morphology', 'themes']);
    await page.getByRole('button', { name: 'Next ayah' }).click();
    await expect(page).toHaveURL(/ref=2%3A256&view=threads&inspect=all/);
    await expect(page.getByLabel('Ayah evidence inspector')).toContainText('2:256');
    expect(requested.size).toBe(4);
  });
});

test.describe('Quran Phase 2E.2 linguistic pattern discovery', () => {
  test('loads QAC on explicit theme-language exploration without requesting exact expressions', async ({
    page,
  }) => {
    const requested: string[] = [];
    page.on('request', (request) => {
      if (/\/data\/quran\/(?:themes|morphology|expressions)\.json$/.test(request.url())) {
        requested.push(request.url());
      }
    });
    await page.goto('./?ref=1%3A1&view=themes&theme=Divine+Mercy');
    await expect(
      page.getByRole('heading', { name: 'Thematic exploration across the Quran' }),
    ).toBeVisible();
    expect(requested.some((url) => url.endsWith('/morphology.json'))).toBe(false);
    expect(requested.some((url) => url.endsWith('/expressions.json'))).toBe(false);
    await page.getByRole('button', { name: 'Analyze Arabic patterns within this topic' }).click();
    await expect(page).toHaveURL(/view=themes&theme=Divine\+Mercy&analysis=language/);
    await expect(
      page.getByRole('heading', { name: 'Language patterns across Quran themes' }),
    ).toBeVisible();
    await expect(page.getByLabel('Linguistic feature comparisons')).toContainText('Tagged:');
    await expect(page.getByLabel('Selected linguistic pattern')).toContainText(
      'Descriptive rate difference',
    );
    await expect(page.getByLabel('Surah language distribution')).toBeVisible();
    await expect(page.getByLabel('Theme and language co-occurrence verses')).toBeVisible();
    expect(requested.filter((url) => url.endsWith('/themes.json'))).toHaveLength(1);
    expect(requested.filter((url) => url.endsWith('/morphology.json'))).toHaveLength(1);
    expect(requested.some((url) => url.endsWith('/expressions.json'))).toBe(false);
    await page.getByRole('button', { name: '← Back to QSAC topic explorer' }).click();
    await expect(page).not.toHaveURL(/analysis=language/);
    await expect(
      page.getByRole('heading', { name: 'Thematic exploration across the Quran' }),
    ).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/analysis=language/);
    expect(requested.filter((url) => url.endsWith('/morphology.json'))).toHaveLength(1);
  });

  test('compares exact phrases in separate tagged and untagged ayah samples with original drilldown', async ({
    page,
  }) => {
    const requested: string[] = [];
    page.on('request', (request) => {
      if (/\/data\/quran\/(?:themes|morphology|expressions)\.json$/.test(request.url())) {
        requested.push(request.url());
      }
    });
    await page.goto('./?ref=1%3A1&view=themes&theme=Divine+Mercy&analysis=language&pattern=exact');
    await expect(
      page.getByRole('heading', { name: 'Language patterns across Quran themes' }),
    ).toBeVisible();
    await expect(page.getByLabel('Linguistic feature comparisons')).toContainText('Tagged:');
    expect(requested.filter((url) => url.endsWith('/expressions.json'))).toHaveLength(1);
    expect(requested.some((url) => url.endsWith('/morphology.json'))).toBe(false);
    const comparisons = page.getByLabel('Linguistic feature comparisons');
    const first = comparisons.locator('button[aria-pressed]').first();
    await expect(first).toBeVisible();
    await first.click();
    await expect(page).toHaveURL(/feature=exact%3Av1%3A/);
    await page.reload();
    await expect(page.getByLabel('Selected linguistic pattern')).toContainText(
      'Original feature ID:',
    );
    const details = page.getByLabel('Selected linguistic pattern');
    await details.getByRole('button', { name: 'Open original exact phrase evidence' }).click();
    await expect(page).not.toHaveURL(/view=themes/);
    await expect(page.getByRole('button', { name: 'Arcs' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page).toHaveURL(/evidence=exact/);
    await expect(page).toHaveURL(/expression=exact%3Av1%3A/);
    await page.goBack();
    await expect(page).toHaveURL(/analysis=language&pattern=exact&feature=exact%3Av1%3A/);
  });

  test('switches QAC roots and lemmas and exposes surah-aware evidence without fabricated relationships', async ({
    page,
  }) => {
    await page.goto('./?ref=1%3A1&view=themes&theme=Divine+Mercy&analysis=language');
    await expect(page.getByLabel('Linguistic feature comparisons')).toContainText('Tagged:');
    await page.getByRole('combobox', { name: 'Linguistic feature type' }).selectOption('lemma');
    await expect(page).toHaveURL(/analysis=language&pattern=lemma/);
    await expect(page.getByLabel('Linguistic feature comparisons')).toContainText('Tagged:');
    const distribution = page.getByLabel('Surah language distribution');
    await expect(distribution).toContainText('Tagged');
    await expect(distribution).toContainText('Untagged');
    const selected = page.getByLabel('Selected linguistic pattern');
    await selected.getByRole('button', { name: 'Open original QAC morphology evidence' }).click();
    await expect(page).toHaveURL(/view=threads/);
    await expect(page).toHaveURL(/evidence=morphology/);
    await expect(page).toHaveURL(/morph=lemma|term=/);
    await expect(
      page.getByRole('heading', { name: 'Arabic lemmas, roots, and grammar' }),
    ).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/analysis=language&pattern=lemma/);
    const verses = page.getByLabel('Theme and language co-occurrence verses');
    await expect(verses).toContainText('matching tagged ayahs');
    await verses
      .getByRole('button', { name: /Read linguistic evidence at Quran ayah/ })
      .first()
      .click();
    await expect(page).toHaveURL(/view=threads/);
    await page.goBack();
    await expect(page).toHaveURL(/analysis=language&pattern=lemma/);
  });
});
