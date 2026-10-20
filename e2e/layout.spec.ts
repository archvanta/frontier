import { expect, test, type Page } from '@playwright/test';
import { revealHero } from './helpers';

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

test('hero is a full-bleed carousel that fills the first screen under the header bar, Top Signals below the fold', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./#/');
  const stage = page.locator('.nh-stage');
  await revealHero(page);
  const header = await page.locator('.site-header').boundingBox();
  const hero = await stage.boundingBox();
  const picks = await page.locator('#top-signals').boundingBox();
  expect(header && hero && picks).toBeTruthy();
  expect(hero!.x).toBeLessThanOrEqual(0.5);
  expect(hero!.width).toBeGreaterThanOrEqual(1430);
  expect(hero!.y).toBeGreaterThanOrEqual(header!.y + header!.height - 1);
  expect(hero!.y).toBeLessThanOrEqual(header!.y + header!.height + 1);
  // The first screen is the hero and nothing else: it reaches the bottom of the viewport and Top Signals starts below the fold.
  expect(hero!.y + hero!.height).toBeGreaterThanOrEqual(899);
  expect(hero!.y + hero!.height).toBeLessThanOrEqual(901);
  expect(picks!.y).toBeGreaterThan(hero!.y + hero!.height - 1);
  expect(picks!.y).toBeGreaterThanOrEqual(900);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('FRONTIER');
});

const counter = (page: Page) => page.locator('.nh-count');
const activeSlide = (page: Page) => page.locator('.nh-slide.is-active');

test('hero advances every 5 seconds, loops, and shows exactly one active slide', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./#/');
  await revealHero(page);
  await expect(counter(page)).toContainText('01');
  const t0 = Date.now();
  await expect(counter(page)).toContainText('02', { timeout: 8000 });
  const dt = Date.now() - t0;
  expect(dt).toBeGreaterThan(3000);
  expect(dt).toBeLessThan(7000);
  await expect(activeSlide(page)).toHaveCount(1);
  await expect(page.locator('.nh-slide[aria-hidden="false"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Next story' }).click();
  await page.getByRole('button', { name: 'Next story' }).click();
  await expect(counter(page)).toContainText('01'); // wrapped around
});

for (const [w, h] of [
  [1440, 900],
  [390, 844],
] as const) {
  test(`hero: one fixed template on every story; fast clicks settle on one fully visible slide that matches the counter @${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('./#/');
    await expect(activeSlide(page)).toHaveCount(1);
    // Scrolled a little, as on the reported screens.
    await page.mouse.wheel(0, 160);
    const next = page.getByRole('button', { name: 'Next story' });
    const total = await page.locator('.nh-dot').count();
    const frames = new Set<string>();
    for (let k = 0; k < total + 2; k++) {
      if (await next.isVisible()) await next.click();
      else
        await page
          .locator('.nh-dot')
          .nth((k + 1) % total)
          .click();
      await page.waitForTimeout(80);
    }
    await page.mouse.move(2, 2);
    for (let k = 0; k < total; k++) {
      await page.locator('.nh-dot').nth(k).click();
      await page.mouse.move(2, 2);
      await expect
        .poll(() =>
          page.evaluate(() => {
            const a = document.querySelector<HTMLElement>('.nh-slide.is-active')!;
            const parts = Array.from(a.querySelectorAll<HTMLElement>('.nh-content > *, .nh-frame'));
            return Math.min(+getComputedStyle(a).opacity, ...parts.map((e) => +getComputedStyle(e).opacity));
          }),
        )
        .toBe(1);
      const m = await page.evaluate(() => {
        const slides = Array.from(document.querySelectorAll<HTMLElement>('.nh-slide'));
        const a = document.querySelector<HTMLElement>('.nh-slide.is-active')!;
        const f = a.querySelector('.nh-frame')!.getBoundingClientRect();
        const c = document.querySelector('.nh-controls')!.getBoundingClientRect();
        return {
          visible: slides.filter((s) => +getComputedStyle(s).opacity > 0).length,
          activeIndex: slides.indexOf(a),
          dot: Array.from(document.querySelectorAll('.nh-dot')).findIndex((d) => d.getAttribute('aria-current') === 'true'),
          frame: `${Math.round(f.x)},${Math.round(f.y)},${Math.round(f.width)}x${Math.round(f.height)}`,
          clearOfControls: f.bottom <= c.top + 1,
        };
      });
      expect(m.visible).toBe(1);
      expect(m.activeIndex).toBe(k);
      expect(m.dot).toBe(k);
      expect(m.clearOfControls).toBe(true);
      frames.add(m.frame);
    }
    await expect(counter(page)).toContainText(String(total).padStart(2, '0'));
    expect(frames.size, [...frames].join(' | ')).toBe(1);
  });
}

// The mock data has three slides: a wide photo (frame and background), a boxy photo (frame only) and no photo (frame placeholder only).
for (const locale of ['en', 'fa'] as const) {
  test(`hero: background photo on suitable images only, same template and sides on every slide — ${locale}`, async ({ page }) => {
    await page.addInitScript((l) => localStorage.setItem('signal-ai:locale', l), locale);
    await page.setViewportSize({ width: 1440, height: 820 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('./#/');
    await expect(activeSlide(page)).toHaveCount(1);
    const slides = page.getByTestId('hero-slide');
    await expect.poll(() => slides.nth(1).getAttribute('data-photo')).toBe('yes'); // the next slide's photo is preloaded
    const n = await slides.count();
    expect(n).toBe(3);
    const seen: { bg: string | null; photo: string | null; copyBeforeFrame: boolean; frame: string; bgFillsStage: boolean | null }[] = [];
    for (let k = 0; k < n; k++) {
      await page.locator('.nh-dot').nth(k).click();
      await page.mouse.move(2, 2);
      await expect(slides.nth(k)).toHaveClass(/is-active/);
      if (k === 0) await expect(slides.nth(0).locator('.nh-bg-img')).toHaveClass(/is-loaded/);
      seen.push(
        await page.evaluate((rtl) => {
          const a = document.querySelector<HTMLElement>('.nh-slide.is-active')!;
          const content = a.querySelector('.nh-content')!.getBoundingClientRect();
          const frame = a.querySelector('.nh-frame')!.getBoundingClientRect();
          const stage = document.querySelector('.nh-main')!.getBoundingClientRect();
          const bg = a.querySelector('.nh-bg')?.getBoundingClientRect();
          return {
            bg: a.dataset.bg ?? null,
            photo: a.dataset.photo ?? null,
            // The copy is on the start side and the photo frame on the end side, for every slide.
            copyBeforeFrame: rtl ? content.left > frame.left : content.left < frame.left,
            frame: `${Math.round(frame.x)},${Math.round(frame.y)},${Math.round(frame.width)}x${Math.round(frame.height)}`,
            bgFillsStage: bg ? Math.abs(bg.width - stage.width) < 2 && Math.abs(bg.height - stage.height) < 2 : null,
          };
        }, locale === 'fa'),
      );
    }
    expect(seen.map((s) => [s.bg, s.photo])).toEqual([
      ['yes', 'yes'],
      ['no', 'yes'],
      ['no', 'no'],
    ]);
    expect(seen.every((s) => s.copyBeforeFrame)).toBe(true);
    expect(new Set(seen.map((s) => s.frame)).size).toBe(1);
    expect(seen[0]!.bgFillsStage).toBe(true);
    // Text stays readable over the photo: the overlay is dark where the copy sits.
    const overlay = await page.evaluate(() => getComputedStyle(document.querySelector('.nh-slide .nh-bg')!, '::after').backgroundImage);
    expect(overlay).toContain('linear-gradient');
    // The copy-side gradient flips with the reading direction (to right = 90deg, to left = 270deg).
    expect(overlay).toContain(locale === 'fa' ? '270deg' : '90deg');
  });
}

test('hero: the background reuses the frame photo (one request) and the next photo is loaded before its slide shows', async ({ page }) => {
  const photoRequests: string[] = [];
  page.on('request', (r) => /mock-(wide|boxy)-.*\.svg/.test(r.url()) && photoRequests.push(r.url()));
  await page.setViewportSize({ width: 1440, height: 820 });
  await page.goto('./#/');
  await expect(activeSlide(page)).toHaveCount(1);
  await expect(page.locator('.nh-slide').first().locator('.nh-bg-img')).toHaveClass(/is-loaded/);
  // The upcoming slide's photo is already decoded while it is still hidden.
  const next = await page
    .locator('.nh-slide')
    .nth(1)
    .locator('.nh-img')
    .evaluate((img: HTMLImageElement) => ({ done: img.complete, w: img.naturalWidth }));
  expect(next).toEqual({ done: true, w: 800 });
  await page.waitForTimeout(500);
  expect(photoRequests.filter((u) => u.includes('mock-wide')).length).toBe(1);
  expect(photoRequests.filter((u) => u.includes('mock-boxy')).length).toBe(1);
});

test('hero: every slide stays exactly 5 seconds', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 820 });
  await page.goto('./#/');
  await revealHero(page);
  await expect(counter(page)).toContainText('01');
  const marks = await page.evaluate(
    () =>
      new Promise<number[]>((resolve) => {
        const el = document.querySelector('.nh-count')!;
        const times: number[] = [];
        let last = el.textContent;
        const mo = new MutationObserver(() => {
          if (el.textContent !== last) {
            last = el.textContent;
            times.push(performance.now());
            if (times.length === 3) {
              mo.disconnect();
              resolve(times);
            }
          }
        });
        mo.observe(el, { childList: true, characterData: true, subtree: true });
      }),
  );
  const gaps = [marks[1]! - marks[0]!, marks[2]! - marks[1]!];
  for (const g of gaps) {
    expect(g).toBeGreaterThan(4800);
    expect(g).toBeLessThan(5400);
  }
});

test('hero: indicators, arrows and keyboard navigate, and a manual change restarts the timer', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./#/');
  await page.getByRole('button', { name: 'Story 3 of 3' }).click();
  await expect(counter(page)).toContainText('03');
  await expect(page.getByRole('button', { name: 'Story 3 of 3' })).toHaveAttribute('aria-current', 'true');
  await page.getByRole('button', { name: 'Previous story' }).click();
  await expect(counter(page)).toContainText('02');
  await page.getByRole('button', { name: 'Next story' }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(counter(page)).toContainText('01');
  // Timer restarted at the manual change: still on 01 well within the next 5 s.
  await page.waitForTimeout(2500);
  await expect(counter(page)).toContainText('01');
});

test('hero never stops for the mouse or focus; only the pause button stops it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./#/');
  await revealHero(page);
  await expect(counter(page)).toContainText('01');
  // Mouse parked on the slide and on the side card, and keyboard focus inside the hero: every story still leaves after 5 seconds.
  await page.mouse.move(700, 300);
  await page.mouse.move(700, 400);
  await page.getByRole('button', { name: 'Next story' }).focus();
  const t0 = Date.now();
  await expect(counter(page)).toContainText('02', { timeout: 8000 });
  expect(Date.now() - t0).toBeLessThan(6500);
  await page.mouse.move(1350, 400); // over the side card
  await expect(counter(page)).toContainText('03', { timeout: 8000 });
  await page.getByRole('button', { name: 'Pause slideshow' }).click();
  await expect(page.getByRole('button', { name: 'Start slideshow' })).toHaveAttribute('aria-pressed', 'true');
  const before = await counter(page).textContent();
  await page.waitForTimeout(6500);
  expect(await counter(page).textContent()).toBe(before);
});

test('hero swipes on touch and follows the reading direction in RTL', async ({ page }) => {
  const swipe = (dx: number) =>
    page.evaluate((d) => {
      const el = document.querySelector('.news-hero')!;
      const fire = (type: string, x: number) =>
        el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType: 'touch', clientX: x, clientY: 300, isPrimary: true }));
      fire('pointerdown', 200);
      fire('pointerup', 200 + d);
    }, dx);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./#/');
  await expect(counter(page)).toHaveCount(1);
  await page.getByRole('button', { name: 'Pause slideshow' }).click();
  await swipe(-120); // LTR: swipe left = next
  await expect(page.locator('.nh-dot[aria-current="true"]')).toHaveAttribute('aria-label', 'Story 2 of 3');
  await swipe(120);
  await expect(page.locator('.nh-dot[aria-current="true"]')).toHaveAttribute('aria-label', 'Story 1 of 3');
  await swipe(30); // too short
  await expect(page.locator('.nh-dot[aria-current="true"]')).toHaveAttribute('aria-label', 'Story 1 of 3');

  await page.evaluate(() => localStorage.setItem('signal-ai:locale', 'fa'));
  await page.reload();
  await page.getByRole('button', { name: 'توقف نمایش خودکار' }).click();
  await swipe(120); // RTL: swipe right = next
  await expect(page.locator('.nh-dot[aria-current="true"]')).toHaveAttribute('aria-label', 'خبر 2 از 3');
});

test('reduced motion: no autoplay, static wall', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('./#/');
  await expect(page.getByRole('button', { name: 'Start slideshow' })).toBeVisible();
  await page.waitForTimeout(6000);
  await expect(counter(page)).toContainText('01');
  await expect(page.locator('.wall-static')).toBeVisible();
  await expect(page.locator('.marquee')).toHaveCount(0);
  await page.getByRole('button', { name: 'Start slideshow' }).click();
  await expect(counter(page)).toContainText('02', { timeout: 8000 });
  await ctx.close();
});

test('signal wall shows real story cards in tilted drifting columns', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./#/');
  const wall = page.getByTestId('signal-wall');
  await expect(wall.getByRole('heading', { name: 'Signal wall' })).toBeVisible();
  await wall.scrollIntoViewIfNeeded();
  await expect(wall.locator('.wall-stage')).toHaveAttribute('aria-hidden', 'true');
  expect(await wall.locator('.marquee').count()).toBe(4);
  // Only the first copy of each column carries links, and they are out of the tab order.
  const tabbable = await wall.locator('a[href]:not([tabindex="-1"])').count();
  expect(tabbable).toBe(0);
  const first = await wall.getByTestId('wall-card').first().getAttribute('href');
  expect(first).toMatch(/#\/story\/\d{4}-\d{2}-\d{2}\//);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect
    .poll(() =>
      wall
        .locator('.marquee')
        .first()
        .evaluate((m) => getComputedStyle(m.querySelector('.marquee-track')!).animationPlayState),
    )
    .toBe('paused'); // paused while off-screen
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

test('hero side card: about 30% wide beside the slider, shows the next story and changes with it every 5 seconds', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./#/');
  await revealHero(page);
  const side = page.locator('.nh-side .story-card');
  await expect(side).toHaveCount(1);
  const box = await page.evaluate(() => {
    const m = document.querySelector('.nh-main')!.getBoundingClientRect();
    const s = document.querySelector('.nh-side')!.getBoundingClientRect();
    return { main: m.width, side: s.width, mainH: m.height, sideH: s.height, gap: s.left - m.right };
  });
  expect(box.main / (box.main + box.side)).toBeGreaterThan(0.68);
  expect(box.main / (box.main + box.side)).toBeLessThan(0.72);
  expect(Math.abs(box.mainH - box.sideH)).toBeLessThan(2);
  expect(box.gap).toBeGreaterThan(4);
  await expect(side).toHaveAttribute('data-tone', 'crimson');
  // Rank badge = position of the story, one ahead of the slide on screen; the title is a real, different story from the active slide.
  await expect(counter(page)).toContainText('01');
  await expect(side.locator('.rank')).toContainText('02');
  const first = await side.getAttribute('data-id');
  const activeTitle = await activeSlide(page).locator('.nh-title').innerText();
  expect(await side.locator('.story-title').innerText()).not.toBe(activeTitle);
  // In step with the slider: when the slide moves on, the card shows the one after it.
  await expect(counter(page)).toContainText('02', { timeout: 8000 });
  await expect(side.locator('.rank')).toContainText('03');
  expect(await side.getAttribute('data-id')).not.toBe(first);
  // The slide that was queued is now the one on screen.
  const nowActive = await activeSlide(page).locator('.nh-title').innerText();
  expect(nowActive.length).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Next story' }).click();
  await expect(counter(page)).toContainText('03');
  await expect(side.locator('.rank')).toContainText('01');
});

test('hero side card stacks right under the slider on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./#/');
  await revealHero(page);
  const m = await page.evaluate(() => {
    const main = document.querySelector('.nh-main')!.getBoundingClientRect();
    const side = document.querySelector('.nh-side')!.getBoundingClientRect();
    return { mainBottom: main.bottom, sideTop: side.top, vh: window.innerHeight, sideW: side.width, mainW: main.width };
  });
  expect(m.sideTop).toBeGreaterThanOrEqual(m.mainBottom);
  expect(m.sideTop - m.mainBottom).toBeLessThan(40);
  expect(m.sideW).toBeCloseTo(m.mainW, 0);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

for (const locale of ['en', 'fa'] as const) {
  test(`phone hero: copy follows the photo frame, a suitable photo is also the dimmed background, and the text stays readable — ${locale} @390`, async ({
    page,
  }) => {
    await page.addInitScript((l) => localStorage.setItem('signal-ai:locale', l), locale);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./#/');
    await revealHero(page);
    const slide = activeSlide(page);
    await expect(slide).toHaveAttribute('data-bg', 'yes');
    await expect(slide.locator('.nh-bg-img')).toHaveClass(/is-loaded/);
    const m = await page.evaluate(() => {
      const a = document.querySelector<HTMLElement>('.nh-slide.is-active')!;
      const bg = a.querySelector('.nh-bg')!;
      const r = a.getBoundingClientRect();
      const b = bg.getBoundingClientRect();
      const frame = a.querySelector('.nh-frame')!.getBoundingClientRect();
      const cat = a.querySelector('.nh-cat')!.getBoundingClientRect();
      const actions = a.querySelector('.nh-actions')!.getBoundingClientRect();
      return {
        shown: getComputedStyle(bg).display !== 'none',
        fills: Math.abs(b.width - r.width) < 2 && Math.abs(b.height - r.height) < 2,
        overlay: getComputedStyle(bg, '::after').backgroundColor,
        gap: cat.top - frame.bottom,
        below: r.bottom - actions.bottom,
      };
    });
    expect(m.shown).toBe(true);
    expect(m.fills).toBe(true);
    // The even dark overlay keeps white text readable over any photo.
    expect(m.overlay).toMatch(/rgba\(5, 3, 15, 0\.7/);
    expect(m.gap).toBeLessThan(40);
    expect(m.below).toBeLessThan(110);
  });
}

test('changing story never shows two headlines on top of each other', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./#/');
  await revealHero(page);
  const worst = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const slides = Array.from(document.querySelectorAll<HTMLElement>('.nh-slide'));
        let worstOverlap = 0;
        const t0 = performance.now();
        const next = document.querySelector<HTMLButtonElement>('.nh-next') ?? document.querySelectorAll<HTMLButtonElement>('.nh-dot')[1]!;
        next.click();
        const sample = () => {
          const o = slides.map((s) => +getComputedStyle(s).opacity).sort((a, b) => b - a);
          worstOverlap = Math.max(worstOverlap, Math.min(o[0]!, o[1]!));
          if (performance.now() - t0 < 1200) requestAnimationFrame(sample);
          else resolve(worstOverlap);
        };
        sample();
      }),
  );
  expect(worst).toBeLessThan(0.2);
});
