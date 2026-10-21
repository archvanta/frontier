import { expect, test } from '@playwright/test';

test('Sections menu opens AI Games with the character cast and filterable stories', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./#/');
  await page.getByRole('button', { name: 'Sections' }).click();
  await page.locator('.site-header').getByRole('link', { name: /AI Games/ }).click();
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

test('Videos page plays videos in the page, and story cards carry a video label', async ({ page }) => {
  // Nothing may reach YouTube during tests; the player frame is still put in the page.
  await page.route(/youtube-nocookie\.com/, (route) => route.abort());
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./#/');
  await page.getByRole('button', { name: 'Sections' }).click();
  await page.locator('.site-header').getByRole('link', { name: /Videos/ }).click();
  await expect(page).toHaveURL(/#\/videos$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Watch the news.' })).toBeVisible();
  const cells = page.getByTestId('video-cell');
  await expect(cells.first()).toBeVisible();
  expect(await cells.count()).toBeGreaterThan(1);
  // Before play: only the thumbnail, no third-party frame.
  await expect(page.locator('iframe')).toHaveCount(0);

  const yt = cells.filter({ hasText: 'OpenAI announces developer tooling' }).first();
  await yt.getByRole('button', { name: /Play video/ }).click();
  await expect(yt.locator('iframe')).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\/MOCKvideo01\?/);

  const file = cells.filter({ hasText: 'Chipmaker outlines' }).first();
  await file.getByRole('button', { name: /Play video/ }).click();
  await expect(file.locator('video')).toHaveAttribute('src', /videos\/signal-ai-intro\.mp4$/);

  // A video story's page plays the video where the photo would be.
  await yt.getByRole('link', { name: /OpenAI announces developer tooling/ }).click();
  await expect(page).toHaveURL(/#\/story\//);
  await expect(page.locator('.story-video figcaption')).toContainText('Watch on YouTube');
  await page.locator('.story-video').getByRole('button', { name: /Play video/ }).click();
  await expect(page.locator('.story-video iframe')).toHaveCount(1);
});

test('Videos page works in Persian (RTL) on a phone without horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./#/videos');
  await page.evaluate(() => localStorage.setItem('signal-ai:locale', 'fa'));
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { level: 1, name: 'خبرها را ببینید.' })).toBeVisible();
  await expect(page.getByTestId('video-cell').first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
