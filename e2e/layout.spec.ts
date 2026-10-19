import { expect, test } from '@playwright/test';

const WIDTHS = [375, 768, 1440];
const SHOTS = process.env.E2E_SCREENSHOTS;

for (const locale of ['en', 'fa'] as const) {
  for (const width of WIDTHS) {
    test(`home has no horizontal overflow — ${locale} @${width}px`, async ({ page }) => {
      await page.addInitScript((l) => localStorage.setItem('signal-ai:locale', l), locale);
      await page.setViewportSize({ width, height: 900 });
      await page.goto('./#/');
      await expect(page.getByTestId('story-card').first()).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'fa' ? 'rtl' : 'ltr');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/home-${locale}-${width}.png`, fullPage: false });
    });
  }
}

test('hero sits between navigation and Top Signals and stays compact', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./#/');
  const header = await page.locator('.site-header').boundingBox();
  const hero = await page.locator('.hero-frame').boundingBox();
  const picks = await page.locator('#top-signals').boundingBox();
  expect(header && hero && picks).toBeTruthy();
  expect(hero!.y).toBeGreaterThanOrEqual(header!.y + header!.height - 1);
  expect(picks!.y).toBeGreaterThan(hero!.y + hero!.height - 1);
  expect(hero!.height).toBeGreaterThanOrEqual(300);
  expect(hero!.height).toBeLessThanOrEqual(421);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('THE WORLD IS CHANGING.');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('TRACK THE SIGNAL.');
});

test('hero video is muted, inline and pauses off-screen', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./#/');
  const video = page.getByTestId('hero-video');
  await expect(video).toBeVisible();
  expect(await video.evaluate((v: HTMLVideoElement) => v.muted && v.playsInline && v.loop)).toBe(true);
  await page.waitForFunction(() => {
    const v = document.querySelector('video');
    return v && !v.paused;
  });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForFunction(() => document.querySelector('video')?.paused === true);
});

test('reduced motion shows the poster instead of autoplaying', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('./#/');
  await expect(page.getByTestId('hero-poster')).toBeVisible();
  await expect(page.getByTestId('hero-video')).toHaveCount(0);
  await page.getByRole('button', { name: 'Play intro video' }).click();
  await expect(page.getByTestId('hero-video')).toBeVisible();
  await ctx.close();
});

test('keyboard: skip link and picks tabs are operable', async ({ page }) => {
  await page.goto('./#/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Skip to news' })).toBeFocused();
  const tab = page.getByRole('tab', { name: 'Daily' });
  await tab.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Weekly' })).toHaveAttribute('aria-selected', 'true');
});
