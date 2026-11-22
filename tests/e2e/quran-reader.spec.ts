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
