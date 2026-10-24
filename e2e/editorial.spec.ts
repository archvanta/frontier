import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const locale of ['en', 'fa']) {
  test(`editorial navigation and search at phone width — ${locale}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript((l) => localStorage.setItem('signal-ai:locale', l), locale);
    await page.goto('./#/');
    await expect(page.getByTestId('hero-slide').first()).toBeAttached();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('.header-github')).toHaveCount(0);
    await page.locator('[aria-controls="primary-nav"]').click();
    await expect(page.locator('.mobile-settings .theme-toggle')).toBeVisible();
    await expect(page.locator('.mobile-settings .lang-switch')).toBeVisible();
    await page.goto('./#/explore');
    const advanced = page.locator('.advanced-filters');
    await expect(advanced).not.toHaveAttribute('open');
    await advanced.locator('summary').click();
    await expect(page.locator('#f-c')).toBeVisible();
    await page.locator('#f-c').selectOption('research');
    await expect(page).toHaveURL(/c=research/);
    await expect(advanced).toHaveAttribute('open');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
  });
}

test('sources use mobile cards and score details stay available on demand', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./#/sources');
  await expect(page.locator('.source-card').first()).toBeVisible();
  await expect(page.locator('.sources-table')).not.toBeVisible();
  await page.goto('./#/picks/weekly');
  const details = page.locator('.score-details').first();
  await expect(details).not.toHaveAttribute('open');
  await details.locator('summary').click();
  await expect(details.locator('.score-explain')).toBeVisible();
});
