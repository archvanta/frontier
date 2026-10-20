import { expect, test } from '@playwright/test';

test('Sections menu opens AI Games with the character cast and filterable stories', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./#/');
  await page.getByRole('button', { name: 'Sections' }).click();
  await page.getByRole('link', { name: /AI Games/ }).click();
  await expect(page).toHaveURL(/#\/ai-games$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Games made with AI.' })).toBeVisible();
  const cells = page.getByTestId('game-cell');
  await expect(cells.first()).toBeVisible();
  for (const text of await cells.allInnerTexts()) expect(text.toLowerCase()).toContain('game');
  // The three character illustrations are the company filter and live in the URL.
  await expect(page.locator('.games-char')).toHaveCount(3);
  await page.getByRole('button', { name: /Claude/ }).click();
  await expect(page).toHaveURL(/#\/ai-games\?e=anthropic$/);
  await expect(page.getByRole('button', { name: /Claude/ })).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.games-chip').click();
  await expect(page).toHaveURL(/#\/ai-games$/);
});

test('Data Centers section lists its stories and is reachable by deep link', async ({ page }) => {
  await page.goto('./#/data-centers');
  await expect(page.getByRole('heading', { level: 1, name: 'Where AI gets built.' })).toBeVisible();
  await expect(page.getByTestId('story-card').first()).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('story-card').first()).toContainText('[MOCK]');
});

test('AI Games works in Persian (RTL) and on a phone without horizontal scroll', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('signal-ai:locale', 'fa'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./#/ai-games');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('هوش مصنوعی');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByTestId('game-cell').first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBe(0);
});
