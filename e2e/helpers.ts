import { expect, type Page } from '@playwright/test';

/** The home page opens on the intro and the topic picker; bring the hero slider to the top of the screen (under the header). */
export async function revealHero(page: Page) {
  await expect(page.locator('#news-hero')).toBeAttached();
  await page.evaluate(() => document.fonts.ready); // font swaps change the height of everything above the hero
  await page.evaluate(() => {
    const hero = document.getElementById('news-hero')!;
    const header = document.querySelector<HTMLElement>('.site-header')?.offsetHeight ?? 0;
    window.scrollTo({ top: hero.getBoundingClientRect().top + window.scrollY - header, behavior: 'instant' });
  });
  await expect(page.locator('.nh-main')).toBeInViewport({ ratio: 0.9 });
}
