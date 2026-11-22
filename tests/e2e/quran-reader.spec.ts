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
      expressions: {
        id: string;
        words: string[];
        occurrences: { ayah: number; start: number; end: number }[];
      }[];
    };
    expect(published.format).toBe('quran-exact-expressions');
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
