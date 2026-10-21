import { expect, test } from '@playwright/test';

test('homepage story rows: AI News, AI Games and Data Centers scroll sideways', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./#/');
  const rows = page.locator('.carousel');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0).locator('.carousel-title')).toHaveText(/AI News/i);
  // Each row links to its own page.
  const links = await rows.locator('.carousel-all').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  expect(links).toEqual(['#/ai-news', '#/ai-games', '#/data-centers']);

  const first = rows.first();
  await first.scrollIntoViewIfNeeded();
  const track = first.locator('.carousel-track');
  const prev = first.getByRole('button', { name: 'Previous stories' });
  const next = first.getByRole('button', { name: 'Next stories' });
  await expect(prev).toBeDisabled();
  await expect(next).toBeEnabled();
  expect(await track.evaluate((el) => el.scrollLeft)).toBe(0);
  await next.click();
  await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);
  await expect(prev).toBeEnabled();
  // The dots follow the scroll and jump back on click.
  const dots = first.locator('.carousel-dot');
  expect(await dots.count()).toBeGreaterThan(1);
  await dots.first().click();
  await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeLessThan(5);
  await expect(dots.first()).toHaveAttribute('aria-current', 'true');
  // The page itself never scrolls sideways.
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});

test('story rows start on the right in Persian and the next arrow scrolls toward the left', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => localStorage.setItem('signal-ai:locale', 'fa'));
  await page.goto('./#/');
  const first = page.locator('.carousel').first();
  await first.scrollIntoViewIfNeeded();
  const track = first.locator('.carousel-track');
  const lead = first.locator('.carousel-item').first();
  const box = await track.boundingBox();
  const leadBox = await lead.boundingBox();
  // The large first story sits at the right edge.
  expect(Math.abs(leadBox!.x + leadBox!.width - (box!.x + box!.width))).toBeLessThan(8);
  await first.locator('.carousel-arrow.is-next').click();
  await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeLessThan(-100);
});

test('story rows on a phone swipe without arrows or page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./#/');
  const first = page.locator('.carousel').first();
  await first.scrollIntoViewIfNeeded();
  await expect(first.locator('.carousel-arrow.is-next')).toBeHidden();
  await expect(first.locator('.carousel-item').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});

test('the Persian intro scene has the same size and spacing as the English one', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const measure = async () => {
    await page.reload();
    await expect(page.locator('.hi-title')).toBeVisible();
    return page.evaluate(() =>
      ['.hi-status', '.hi-kicker', '.hi-title', '.hi-body', '.hi-links', '.hi-meta', '.hi-signals'].map((s) => {
        const r = document.querySelector(s)!.getBoundingClientRect();
        return Math.round(r.height);
      }),
    );
  };
  await page.addInitScript(() => localStorage.setItem('signal-ai:locale', 'en'));
  await page.goto('./#/');
  const en = await measure();
  await page.evaluate(() => localStorage.setItem('signal-ai:locale', 'fa'));
  const fa = await measure();
  // Texts differ in length, but every block is the same height (within a pixel or two).
  fa.forEach((h, i) => expect(Math.abs(h - en[i]!)).toBeLessThanOrEqual(3));
});
