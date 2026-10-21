import { expect, test, type Page } from '@playwright/test';
import { revealHero } from './helpers';

/**
 * Mobile overflow, whole-card text and photos, and the hero's first-screen rules (issues reported on phones, 2026-10-20).
 * Every hero story uses one fixed template (copy + one rounded photo frame); photo handling is covered by unit tests, and here
 * the long-headline case is exercised by putting a long title into every slide and re-fitting.
 */

const PHONES = [360, 390, 430];
const LONG_EN =
  '[MOCK] A deliberately long fixture headline that keeps going well past the length of any real story title so the hero has to shrink it to fit the first screen';
const LONG_FA =
  '[آزمایشی] یک تیتر آزمایشی عمداً بسیار طولانی که از طول هر تیتر واقعی بیشتر است تا هیرو مجبور شود آن را کوچک کند و در صفحهٔ اول جا بدهد بدون اینکه زیر سربرگ برود';

async function open(page: Page, locale: 'en' | 'fa', width: number, height: number) {
  await page.addInitScript((l) => localStorage.setItem('signal-ai:locale', l), locale);
  await page.setViewportSize({ width, height });
  await page.goto('./#/');
  await expect(page.getByTestId('hero-slide').first()).toBeAttached();
  await expect(page.getByTestId('story-card').first()).toBeVisible();
}

for (const locale of ['en', 'fa'] as const) {
  for (const width of PHONES) {
    test(`phone: nothing is wider than the screen and card text is never cut — ${locale} @${width}px`, async ({ page }) => {
      await open(page, locale, width, 800);
      const res = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const wide: string[] = [];
        for (const el of Array.from(document.querySelectorAll<HTMLElement>('.site-main *, .site-header *, .news-hero *'))) {
          // Scrollers (chip rows), the tilted signal wall, the sideways story rows, inactive or zooming hero layers and visually hidden text are clipped on purpose.
          if (el.closest('.wall-stage, .nh-slide, .visually-hidden, .carousel-track') || el.parentElement?.closest('[class*="chips"], .tabs, .pill-track')) continue;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.right > vw + 1 || r.left < -1)
            wide.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} ${Math.round(r.left)}..${Math.round(r.right)}`);
        }
        const cut: string[] = [];
        for (const el of Array.from(
          document.querySelectorAll<HTMLElement>('.story-card .story-title, .story-card .story-excerpt, .wall-title, .brief-story'),
        )) {
          const cs = getComputedStyle(el);
          if (cs.textOverflow === 'ellipsis' || (cs.webkitLineClamp && cs.webkitLineClamp !== 'none')) cut.push(el.className);
        }
        return { wide: wide.slice(0, 10), cut: [...new Set(cut)] };
      });
      expect(res.wide).toEqual([]);
      expect(res.cut).toEqual([]);
    });
  }
}

test('gradient cards: photo fills a rounded frame that sits inside the card with room below, no rim line along the top', async ({ page }) => {
  await open(page, 'en', 390, 800);
  // Let every lazy preview load.
  for (let y = 0; y < 12000; y += 600) await page.evaluate((yy) => window.scrollTo(0, yy), y);
  const cards = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('.story-card[data-tone]'), (c) => {
      const cr = c.getBoundingClientRect();
      const media = c.querySelector<HTMLElement>('.story-media');
      const img = c.querySelector<HTMLImageElement>('.story-media img');
      const mr = media?.getBoundingClientRect();
      return {
        variant: Array.from(c.classList).find((k) => k.startsWith('is-') && k !== 'is-text-only'),
        origin: getComputedStyle(c).backgroundOrigin,
        gapBelow: mr ? cr.bottom - mr.bottom : null,
        fit: img ? getComputedStyle(img).objectFit : 'cover',
        frameInside: mr ? mr.left >= cr.left - 0.5 && mr.right <= cr.right + 0.5 : true,
        inside: cr.left >= -0.5 && cr.right <= document.documentElement.clientWidth + 0.5,
      };
    }),
  );
  expect(cards.length).toBeGreaterThan(4);
  for (const c of cards) {
    expect(c.origin, c.variant).toBe('border-box');
    expect(c.inside, c.variant).toBe(true);
    expect(c.fit, c.variant).toBe('cover');
    expect(c.frameInside, c.variant).toBe(true);
    if (c.gapBelow !== null) expect(c.gapBelow, c.variant).toBeGreaterThanOrEqual(8);
  }
});

const SCREENS: [number, number][] = [
  [390, 844],
  [768, 1024],
  [1366, 768],
  [1440, 800],
];

for (const locale of ['en', 'fa'] as const) {
  for (const [w, h] of SCREENS) {
    test(`hero fills the first screen and every headline fits under the header — ${locale} @${w}x${h}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await open(page, locale, w, h);
      await revealHero(page);
      // Worst case: a very long headline on every slide, then let the hero re-fit.
      await page.evaluate(
        (text) => {
          document.querySelectorAll('.nh-slide .nh-title').forEach((t) => (t.textContent = text));
          window.dispatchEvent(new Event('resize'));
        },
        locale === 'fa' ? LONG_FA : LONG_EN,
      );
      await page.waitForTimeout(150);
      await revealHero(page);
      const n = await page.getByTestId('hero-slide').count();
      expect(n).toBeGreaterThan(1);
      for (let k = 0; k < n; k++) {
        await page.locator('.nh-dot').nth(k).click();
        await expect(page.getByTestId('hero-slide').nth(k)).toHaveClass(/is-active/);
        const m = await page.evaluate(() => {
          const slide = document.querySelector('.nh-slide.is-active')!;
          const title = slide.querySelector('.nh-title')!;
          const range = document.createRange();
          range.selectNodeContents(title);
          const box = (sel: string) => document.querySelector(sel)!.getBoundingClientRect();
          return {
            vh: window.innerHeight,
            header: box('.site-header').bottom,
            cat: slide.querySelector('.nh-cat')!.getBoundingClientRect().top,
            title: range.getBoundingClientRect().top,
            actions: slide.querySelector('.nh-actions')!.getBoundingClientRect().bottom,
            controlsTop: box('.nh-controls').top,
            controlsBottom: box('.nh-controls').bottom,
            stageBottom: box('.nh-stage').bottom,
            picks: box('#top-signals').top,
            clamp: getComputedStyle(title).webkitLineClamp,
            frameBottom: slide.querySelector('.nh-frame')!.getBoundingClientRect().bottom,
            mainBottom: box('.nh-main').bottom,
          };
        });
        expect(m.cat, `slide ${k}: label under the header`).toBeGreaterThanOrEqual(m.header);
        expect(m.title, `slide ${k}: headline under the header`).toBeGreaterThanOrEqual(m.header);
        expect(m.actions, `slide ${k}: buttons run into the controls`).toBeLessThanOrEqual(m.controlsTop + 1);
        expect(m.controlsBottom, `slide ${k}: controls below the fold`).toBeLessThanOrEqual(m.vh);
        if (w >= 900) {
          expect(m.stageBottom, `slide ${k}: hero shorter than the screen`).toBeGreaterThanOrEqual(m.vh - 1);
          expect(m.picks, `slide ${k}: Top Signals peeks into the first screen`).toBeGreaterThanOrEqual(m.vh - 1);
        } else {
          // Stacked (phones, tablets): the copy follows the photo frame directly and the slider is only as tall as its content.
          expect(m.cat - m.frameBottom, `slide ${k}: dead space between the photo and the text`).toBeLessThanOrEqual(48);
          expect(m.mainBottom - m.actions, `slide ${k}: dead space below the buttons`).toBeLessThanOrEqual(110);
        }
        expect(m.clamp === '' || m.clamp === 'none').toBe(true);
      }
    });
  }
}
