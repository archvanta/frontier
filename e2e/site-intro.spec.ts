import { expect, test } from '@playwright/test';
import { INTRO_ENABLED } from '../src/lib/tunnel';

// The rest of the suite switches the intro off through localStorage (playwright.config.ts); these specs play it.
test.use({ storageState: { cookies: [], origins: [] }, reducedMotion: 'no-preference', viewport: { width: 1280, height: 800 } });

test.describe('opening animation (INTRO_ENABLED)', () => {
  test.skip(!INTRO_ENABLED, 'the opening animation is switched off in src/lib/tunnel.ts');

test('plays by itself, then opens the home page without any scrolling', async ({ page }) => {
  await page.goto('./#/');
  const intro = page.locator('.site-intro');
  await expect(intro).toBeVisible();
  await expect(intro.locator('.tn-card').first()).toBeAttached();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('FRONTIER');
  await expect(intro).toHaveCount(0, { timeout: 9000 });
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('a click, the skip button or Escape ends it at once, and it shows once per session', async ({ page }) => {
  await page.goto('./#/');
  await expect(page.locator('.site-intro .tn-card').first()).toBeAttached();
  await page.getByRole('button', { name: 'Skip intro' }).click();
  await expect(page.locator('.site-intro')).toHaveCount(0, { timeout: 2000 });
  await page.reload();
  await page.waitForTimeout(800);
  await expect(page.locator('.site-intro')).toHaveCount(0);

  const fresh = await page.context().newPage();
  await fresh.goto('./#/');
  await expect(fresh.locator('.site-intro')).toBeVisible();
  await fresh.keyboard.press('Escape');
  await expect(fresh.locator('.site-intro')).toHaveCount(0, { timeout: 2000 });
});

});

test('with the intro off the home page opens at once, with no overlay and nothing stored', async ({ page }) => {
  test.skip(INTRO_ENABLED, 'only meaningful while the intro is switched off');
  await page.goto('./#/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('FRONTIER');
  await expect(page.locator('.site-intro')).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.getItem('signal-ai:intro-seen:v1'))).toBeNull();
});

test('does not hold up deep links or reduced motion', async ({ page, browser }) => {
  await page.goto('./#/about');
  await page.waitForTimeout(500);
  await expect(page.locator('.site-intro')).toHaveCount(0);

  const ctx = await browser.newContext({ reducedMotion: 'reduce', storageState: { cookies: [], origins: [] } });
  const calm = await ctx.newPage();
  await calm.goto('./#/');
  await expect(calm.getByRole('heading', { level: 1 })).toHaveText('FRONTIER');
  await expect(calm.locator('.site-intro')).toHaveCount(0);
  await ctx.close();
});

test('the hero shows a quiet feed of real stories behind the word and keeps the title readable', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('signal-ai:intro-seen:v1', '1'));
  await page.goto('./#/');
  const loop = page.locator('.home-intro .tunnel-loop');
  await expect(loop.locator('.tn-card').first()).toBeAttached();
  expect(await loop.getAttribute('aria-hidden')).toBe('true');
  expect(await loop.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
  await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
});
