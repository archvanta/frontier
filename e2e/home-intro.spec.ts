import { expect, test } from '@playwright/test';

const KEY = 'signal-ai:followed-topics:v1';

test('homepage order: short masthead, hero, story rows, topics to follow, Latest News', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./#/');
  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1).toHaveText('FRONTIER');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(h1).toBeInViewport();
  const sels = ['.home-masthead', '#news-hero', '.carousel', '#follow', '#latest'];
  const boxes = await page.evaluate(
    (ss) =>
      ss.map((s) => {
        const r = document.querySelector(s)!.getBoundingClientRect();
        return {
          top: r.top + window.scrollY,
          bottom: r.bottom + window.scrollY,
        };
      }),
    sels,
  );
  expect(boxes.map((b) => b.top)).toEqual(boxes.map((b) => b.top).sort((a, b) => a - b));
  // The masthead is short: the news starts inside the first screen.
  expect(boxes[1]!.top).toBeLessThan(900 * 0.75);
  // The topic panel sits between the story rows and Latest News with the same spacing above and below.
  const lastRow = await page.evaluate(() => {
    const rows = document.querySelectorAll('.carousel');
    return rows[rows.length - 1]!.getBoundingClientRect().bottom + window.scrollY;
  });
  const above = boxes[3]!.top - lastRow;
  const below = boxes[4]!.top - boxes[3]!.bottom;
  expect(above).toBeGreaterThan(20);
  expect(Math.abs(above - below)).toBeLessThan(2);
});

test('"Today’s top stories" on the masthead brings the hero into view', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#/');
  await page.locator('.hm-cta').click();
  await expect(page.locator('.nh-main')).toBeInViewport({ ratio: 0.8 });
});

test('"Skip to the news" under the topics goes to Latest News', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#/');
  await page.locator('#follow').scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: /Skip to the news/ }).click();
  await expect(page.locator('#latest .section-title')).toBeInViewport();
});

test('choosing topics is saved on this device and puts those stories first', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('./#/');
  const order = () =>
    page
      .locator('.day-section [data-testid=story-card]')
      .evaluateAll((els) => els.map((e) => `${e.getAttribute('data-id')}:${e.querySelector('.kicker-cat, .chip')?.textContent}`));
  await expect(page.locator('.day-section [data-testid=story-card]').first()).toBeAttached();
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
  await expect(page.locator('.home-masthead')).toBeVisible();
});

test('four desks sit under the masthead, each with a small icon, and lead to their pages', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./#/');
  const desks = page.locator('.hm-desks .hm-desk');
  await expect(desks).toHaveCount(4);
  await expect(desks.nth(0)).toContainText('AI News');
  await expect(desks.nth(1)).toContainText('AI Games');
  await expect(desks.nth(2)).toContainText('Data Centers');
  await expect(desks.nth(3)).toContainText('Videos');
  const m = await page.evaluate(() => {
    const card = document.querySelector('.hm-card')!.getBoundingClientRect();
    const nav = document.querySelector('.hm-desks')!.getBoundingClientRect();
    const img = document.querySelector<HTMLImageElement>('.hm-desk-art')!;
    return { below: nav.top >= card.bottom, gap: nav.top - card.bottom, w: img.getBoundingClientRect().width, inView: nav.bottom <= window.innerHeight };
  });
  expect(m.below).toBe(true);
  expect(m.gap).toBeLessThan(40);
  expect(m.w).toBeLessThanOrEqual(40);
  expect(m.inView).toBe(true);
  for (const [desk, route] of [
    ['ai-news', 'ai-news'],
    ['ai-games', 'ai-games'],
    ['data-centers', 'data-centers'],
    ['videos', 'videos'],
  ] as const) {
    await page.locator(`.hm-desk[data-desk=${desk}]`).click();
    await expect(page).toHaveURL(new RegExp(`#/${route}$`));
    await page.goBack();
  }
});

test('the Sections menu also lists AI News', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./#/');
  await page.getByRole('button', { name: 'Sections' }).click();
  const item = page.locator('.site-header').getByRole('link', { name: /AI News/ });
  await expect(item).toBeVisible();
  await expect(item).toContainText('slideshow');
  await item.click();
  await expect(page).toHaveURL(/#\/ai-news$/);
});

test('masthead film: loads nothing up front, has a poster, and stands still under reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#/');
  const film = page.locator('.hm-film');
  await expect(film).toHaveAttribute('preload', 'none');
  await expect(film).toHaveAttribute('aria-hidden', 'true');
  expect(await film.getAttribute('poster')).toMatch(/frontier-hero-poster\.webp$/);
  expect(await film.getAttribute('autoplay')).toBeNull();
  await page.waitForTimeout(900);
  expect(await film.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
});

test('AI News page is the news front page: slideshow, then the feed, no masthead', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./#/ai-news');
  await expect(page.locator('.home-masthead')).toHaveCount(0);
  await expect(page.locator('#follow')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.locator('#news-hero .nh-main')).toBeVisible();
  await expect(page.locator('#latest .day-section').first()).toBeVisible();
  await page.getByRole('button', { name: 'Sections' }).click();
  await expect(page.locator('.site-header').getByRole('link', { name: /AI News/ })).toHaveAttribute('aria-current', 'page');
});

test('home feed labels stories of AI Games, Data Centers and Videos and can filter to them', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./#/');
  const badge = page.locator('#latest .sec-badge').first();
  await expect(badge).toBeVisible();
  const name = (await badge.textContent())!.trim();
  expect(['AI Games', 'Data Centers', 'Videos']).toContain(name);
  const all = await page.locator('#latest [data-testid=story-card]').count();
  await page.locator('#latest .filter-chip', { hasText: name }).click();
  const cards = page.locator('#latest [data-testid=story-card]');
  const n = await cards.count();
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThan(all);
  await expect(page.locator('#latest [data-testid=story-card] .sec-badge')).toHaveCount(n);
  await page.locator('#latest .filter-chip', { hasText: 'All' }).click();
  await expect(cards).toHaveCount(all);
});

test('masthead numbers come from the stored feed: last update, stories in 24 hours, active sources', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./#/');
  const stats = page.locator('.hm-stats .hm-stat');
  await expect(stats).toHaveCount(3);
  await expect(stats.nth(0).locator('dt')).toHaveText('Updated');
  await expect(stats.nth(1).locator('dt')).toHaveText('New in 24h');
  await expect(stats.nth(2).locator('dt')).toHaveText('Sources');
  await expect(stats.nth(1).locator('dd')).toHaveText(/^\d[\d,]*$/);
  await expect(stats.nth(2).locator('dd')).toHaveText(/^\d[\d,]*$/);
  await expect(stats.nth(0).locator('dd')).not.toHaveText('—');
  await expect(stats.nth(0)).toHaveAttribute('data-live', /^(true|false)$/);
});

test('desks carry the count of stories from the last 24 hours, and nothing is shown when there are none', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./#/');
  await expect(page.locator('.hm-stats .hm-stat').nth(1).locator('dd')).toHaveText(/\d/);
  const news = page.locator('.hm-desk[data-desk=ai-news] .hm-desk-count');
  await expect(news).toHaveText(/^\+\d+/);
  expect(await page.locator('.hm-desk-count').evaluateAll((els) => els.every((e) => !/\+0\b/.test(e.textContent ?? '')))).toBe(true);
});

test('Persian masthead: right-to-left numbers and desks, on a phone without sideways scroll', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('signal-ai:locale', 'fa'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./#/');
  await expect(page.locator('.hm-stats .hm-stat').nth(1).locator('dt')).toHaveText('تازهٔ ۲۴ ساعت');
  await expect(page.locator('.hm-stats .hm-stat').nth(1).locator('dd')).toHaveText(/^[۰-۹٬,]+$/);
  await expect(page.locator('.hm-desk')).toHaveCount(4);
  const d = await page.evaluate(() => {
    const desks = Array.from(document.querySelectorAll('.hm-desk'), (e) => e.getBoundingClientRect());
    return { firstRight: desks[0]!.right, lastRight: desks[3]!.right, sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  // The first desk (AI News) sits on the right in RTL.
  expect(d.firstRight).toBeGreaterThan(d.lastRight);
  expect(d.sideways).toBeLessThanOrEqual(0);
});
