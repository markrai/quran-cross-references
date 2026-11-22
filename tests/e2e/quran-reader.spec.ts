import { expect, test } from '@playwright/test';

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
    await expect(page.locator('[aria-label="Quran text and relationship threads"] [lang="ar"][dir="rtl"]').first())
      .toBeVisible();
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
      const icon = manifest.icons.find((entry) => entry.sizes === `${String(size)}x${String(size)}` && entry.purpose === 'any');
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
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://markrai.github.io/quran-cross-references/',
    );
  });

  test('loads Arabic, English and related passages after losing network access', async ({
    page,
    context,
  }) => {
    await page.goto('./?ref=2%3A255');
    await expect(page.getByRole('heading', { name: /Al-Baqarah.*2:255/ })).toBeVisible();
    await page.waitForFunction(async () => {
      const registration = await navigator.serviceWorker.ready;
      const names = await caches.keys();
      return registration.active?.state === 'activated' &&
        names.some((name) => name.startsWith('quran-cross-references-shell-'));
    });
    await context.setOffline(true);
    try {
      await page.reload();
      await expect(page.getByRole('heading', { name: /Al-Baqarah.*2:255/ })).toBeVisible();
      await expect(page.locator('[aria-label="Selected ayah"] [lang="ar"]')).toBeVisible();
      await expect(page.locator('[aria-label="Selected ayah"] [lang="en"]')).toBeVisible();
      await page.goto('quran/?ref=114%3A6&view=threads');
      await expect(page.getByRole('heading', { name: /An-Nas.*114:6/ })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Threads from 114:6' })).toBeVisible();
    } finally {
      await context.setOffline(false);
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
