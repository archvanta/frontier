import { expect, test } from '@playwright/test';

test('language choice applies on every route and survives reloads', async ({ page }) => {
  await page.goto('./#/');
  await page.getByRole('button', { name: /فارسی|Persian/ }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  for (const route of ['#/picks/weekly', '#/explore', '#/archive', '#/saved', '#/sources', '#/about']) {
    await page.goto(`./${route}`);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, route).toBeLessThanOrEqual(1);
  }
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
  await page.getByRole('button', { name: /English|انگلیسی/ }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
});

test('Persian story pages label machine translation and keep the original and source link', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('signal-ai:locale', 'fa'));
  await page.goto('./#/');
  const translated = page.locator('[data-testid=story-card] .story-title[lang=fa]').first();
  await translated.getByRole('link').click();
  await expect(page.getByText('عنوان اصلی', { exact: false })).toBeVisible();
  await expect(page.locator('.story-head .mt-label').first()).toBeVisible();
  await expect(page.locator('.story-actions a[target=_blank]')).toHaveAttribute('href', /^https:\/\//);

  await page.goto('./#/');
  const untranslated = page.locator('[data-testid=story-card] .story-title[lang=en]').first();
  await untranslated.getByRole('link').click();
  await expect(page.getByText('هنوز ترجمه نشده', { exact: false })).toBeVisible();
});
