import { expect, test } from '@playwright/test';

const KEY = 'signal-ai:followed-topics:v1';

test('homepage order: intro, hero, signal wall, story rows, topics to follow, Latest News', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./#/');
  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1).toHaveText('FRONTIER');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(h1).toBeInViewport();
  const sels = ['.home-intro', '#news-hero', '[data-testid=signal-wall]', '.carousel', '#follow', '#latest'];
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
  // The intro fills the first screen.
  expect(boxes[1]!.top).toBeGreaterThanOrEqual(899);
  // The topic panel sits between the story rows and Latest News with the same spacing above and below.
  const lastRow = await page.evaluate(() => {
    const rows = document.querySelectorAll('.carousel');
    return rows[rows.length - 1]!.getBoundingClientRect().bottom + window.scrollY;
  });
  const above = boxes[4]!.top - lastRow;
  const below = boxes[5]!.top - boxes[4]!.bottom;
  expect(above).toBeGreaterThan(20);
  expect(Math.abs(above - below)).toBeLessThan(2);
});

test('"scroll" on the intro brings the hero into view', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#/');
  await page.locator('.hi-scroll').click();
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

test('three ways in sit under the intro text: AI Games with a tiny character thumbnail, Data Centers, AI News', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./#/');
  const links = page.locator('.hi-links .hi-link');
  await expect(links).toHaveCount(3);
  await expect(links.nth(0)).toContainText('AI Games');
  await expect(links.nth(1)).toContainText('Data Centers');
  await expect(links.nth(2)).toContainText('AI News');
  const m = await page.evaluate(() => {
    const body = document.querySelector('.hi-body')!.getBoundingClientRect();
    const nav = document.querySelector('.hi-links')!.getBoundingClientRect();
    const img = document.querySelector<HTMLImageElement>('.hi-link-art')!;
    const r = img.getBoundingClientRect();
    return {
      below: nav.top >= body.bottom,
      gap: nav.top - body.bottom,
      w: r.width,
      natural: img.naturalWidth,
      loaded: img.complete,
    };
  });
  expect(m.below).toBe(true);
  expect(m.gap).toBeLessThan(60);
  expect(m.w).toBeLessThanOrEqual(40);
  expect(m.loaded && m.natural > 0).toBe(true);
  // The thumbnail is a small file, not the original artwork.
  const res = await page.request.get(await page.locator('.hi-link-art').evaluate((i: HTMLImageElement) => i.src));
  expect((await res.body()).length).toBeLessThan(10_000);
  await links.nth(0).click();
  await expect(page).toHaveURL(/#\/ai-games$/);
  await page.goBack();
  await page.locator('.hi-link[data-entry=data-centers]').click();
  await expect(page).toHaveURL(/#\/data-centers$/);
  await page.goBack();
  await page.locator('.hi-link[data-entry=ai-news]').click();
  await expect(page).toHaveURL(/#\/ai-news$/);
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

test('animated intro backdrop: moves in full motion, pauses off-screen, stands still under reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('./#/');
  const state = () =>
    page.evaluate(() => {
      const names = ['.hi-glow-a', '.hi-glow-b', '.hi-glow-c', '.hi-grid', '.hi-beam', '.hi-specks i'].map((s) => {
        const cs = getComputedStyle(document.querySelector(s)!);
        return `${cs.animationName}:${cs.animationPlayState}`;
      });
      return names;
    });
  const html = page.locator('html');
  const mode = await html.getAttribute('data-motion');
  if (mode === 'full') {
    for (const s of await state()) expect(s).toMatch(/^hi-.*:running$/);
    await page.evaluate(() => window.scrollTo(0, 2400));
    await expect.poll(async () => (await state())[0]).toMatch(/:paused$/);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await page.evaluate(() => window.scrollTo(0, 0));
  for (const s of await state()) expect(s.startsWith('none')).toBe(true);
});

test('AI News page is the news front page: slideshow with the red card, then the feed, no intro', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./#/ai-news');
  await expect(page.locator('.home-intro')).toHaveCount(0);
  await expect(page.locator('#follow')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.locator('#news-hero .nh-main')).toBeVisible();
  await expect(page.locator('#news-hero .nh-side')).toBeVisible();
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

test('intro shows live status and the top three signals from the stored feed, with real links', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./#/');
  const status = page.locator('.hi-status');
  await expect(status).toHaveClass(/is-ready/);
  await expect(status).toContainText('sources monitored');
  await expect(status).toContainText('Last signal');
  const cards = page.locator('.hi-signal');
  await expect(cards).toHaveCount(3);
  await expect(page.locator('.hi-signals-title')).toHaveText('Top signals right now');
  // Same stories, same order as the Weekly Brief / picks list: the first card is the top-ranked story.
  const first = cards.first();
  await expect(first.locator('.hi-signal-score')).toHaveText(/^\d+$/);
  await expect(first.locator('.hi-signal-meta')).toContainText(' · ');
  await first.click();
  await expect(page).toHaveURL(/#\/story\/\d{4}-\d{2}-\d{2}\/[a-f0-9]+$/);
});

test('intro chips carry the count of stories from the last 24 hours, and nothing is shown when there are none', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./#/');
  await expect(page.locator('.hi-status')).toHaveClass(/is-ready/);
  const news = page.locator('.hi-link[data-entry=ai-news] .hi-link-count');
  await expect(news).toHaveText(/^\+\d+/);
  expect(await page.locator('.hi-link-count').evaluateAll((els) => els.every((e) => !/\+0\b/.test(e.textContent ?? '')))).toBe(true);
});

test('Persian intro: status and signals are RTL, on a phone without sideways scroll', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('signal-ai:locale', 'fa'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./#/');
  await expect(page.locator('.hi-status')).toHaveClass(/is-ready/);
  await expect(page.locator('.hi-signals-title')).toHaveText('سیگنال‌های برتر همین حالا');
  await expect(page.locator('.hi-signal')).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});
