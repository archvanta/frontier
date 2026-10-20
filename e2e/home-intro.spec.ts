import { expect, test } from '@playwright/test';

const KEY = 'signal-ai:followed-topics:v1';

test('the first screen introduces the site; topics and the hero follow below it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./#/');
  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1).toHaveText('FRONTIER');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(h1).toBeInViewport();
  // Order: intro, topics, hero, then the news.
  const tops = await page.evaluate(() =>
    ['.home-intro', '#follow', '#news-hero', '#top-signals'].map((s) => document.querySelector(s)!.getBoundingClientRect().top + window.scrollY),
  );
  expect(tops).toEqual([...tops].sort((a, b) => a - b));
  // The intro fills the first screen: the topic picker starts at or below the fold.
  expect(tops[1]).toBeGreaterThanOrEqual(899);
  await expect(page.locator('#follow')).not.toBeInViewport();
});

test('"scroll" on the intro brings the topics into view', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#/');
  await page.locator('.hi-scroll').click();
  await expect(page.locator('#follow-title')).toBeInViewport();
  await expect(page.locator('#follow')).toBeFocused();
});

test('skipping the topics goes straight to the hero slider', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#/');
  await page.getByRole('button', { name: /Skip to the news/ }).click();
  await expect(page.locator('.nh-main')).toBeInViewport({ ratio: 0.8 });
  await expect(page.locator('.nh-count')).toContainText('01');
});

test('choosing topics is saved on this device and puts those stories first', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('./#/');
  const order = () =>
    page
      .locator('.day-section [data-testid=story-card]')
      .evaluateAll((els) => els.map((e) => `${e.getAttribute('data-id')}:${e.querySelector('.kicker-cat, .chip')?.textContent}`));
  const before = await order();

  const chip = page.locator('#follow [data-topic=hardware]');
  await chip.click();
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  expect(JSON.parse(await page.evaluate((k) => localStorage.getItem(k) ?? '[]', KEY))).toEqual(['hardware']);

  // Same stories, but the hardware ones now lead their day (the mock feed has hardware stories in its second day).
  const after = await order();
  expect([...after].sort()).toEqual([...before].sort());
  expect(after).not.toEqual(before);
  const firstHardware = (list: string[]) => list.findIndex((x) => x.endsWith(':Hardware'));
  expect(firstHardware(after)).toBeLessThan(firstHardware(before));

  // Survives a reload, and "clear" restores the original order.
  await page.reload();
  await expect(page.locator('#follow [data-topic=hardware]')).toHaveAttribute('aria-pressed', 'true');
  expect(await order()).toEqual(after);
  await page.getByRole('button', { name: /Clear/ }).click();
  expect(JSON.parse(await page.evaluate((k) => localStorage.getItem(k) ?? '[]', KEY))).toEqual([]);
  expect(await order()).toEqual(before);
});

test('Persian: intro and topics are right-to-left with a Latin wordmark', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('signal-ai:locale', 'fa'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./#/');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1).toHaveText('FRONTIER');
  await expect(h1).toHaveAttribute('dir', 'ltr');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(page.locator('.home-intro')).toBeVisible();
});
