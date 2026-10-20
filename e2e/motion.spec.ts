import { expect, test, type Page } from '@playwright/test';

/**
 * Phase 3 motion system: page, language and theme changes run inside view transitions (Chromium has them), with the
 * route still correct for Back, Forward and deep links; cards reveal once on scroll; reduced motion and Save-Data are
 * respected. `window.__vt` records the kind of every view transition the app starts.
 */
async function recordTransitions(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __vt: string[] };
    w.__vt = [];
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    const original = doc.startViewTransition?.bind(document);
    if (original) {
      doc.startViewTransition = (cb: () => void) => {
        w.__vt.push(document.documentElement.dataset.vt ?? '');
        return original(cb);
      };
    }
  });
}

const transitions = (page: Page) => page.evaluate(() => (window as unknown as { __vt: string[] }).__vt);
const setHash = (page: Page, hash: string) => page.evaluate((h) => (window.location.hash = h), hash);

test('page changes run in a view transition and Back, Forward and deep links land on the right page', async ({ page }) => {
  await recordTransitions(page);
  await page.goto('./#/');
  await expect(page.getByTestId('story-card').first()).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
  await expect(page.locator('html')).toHaveAttribute('data-vt-support', 'yes');
  expect(await transitions(page)).toEqual([]);

  await setHash(page, '#/archive');
  await expect(page.getByRole('heading', { level: 1, name: 'Archive' })).toBeVisible();
  expect(await transitions(page)).toEqual(['page']);

  await page.goBack();
  await expect(page.locator('#latest')).toBeVisible();
  await page.goForward();
  await expect(page.getByRole('heading', { level: 1, name: 'Archive' })).toBeVisible();
  expect(await transitions(page)).toEqual(['page', 'page', 'page']);

  // A query change (search text, filters, page number) updates in place, without a page transition.
  await setHash(page, '#/explore');
  await expect(page.locator('#explore-q')).toBeVisible();
  const before = (await transitions(page)).length;
  await setHash(page, '#/explore?q=claude');
  await expect(page).toHaveURL(/q=claude/);
  await expect(page.locator('.result-list, .empty-state').first()).toBeVisible();
  expect((await transitions(page)).length).toBe(before);
  await expect(page.locator('html')).not.toHaveAttribute('data-vt', /.+/);
});

test('a deep link renders its page directly, with no transition', async ({ page }) => {
  await recordTransitions(page);
  await page.goto('./#/archive');
  await expect(page.getByRole('heading', { level: 1, name: 'Archive' })).toBeVisible();
  expect(await transitions(page)).toEqual([]);
});

test('cards reveal once as they scroll into view', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('./#/');
  const cards = page.locator('#latest [data-testid=story-card]');
  await expect(cards.first()).toBeAttached();
  const last = cards.last();
  await expect(last).toHaveAttribute('data-reveal', 'pending');
  await last.scrollIntoViewIfNeeded();
  await expect(last).toHaveAttribute('data-reveal', 'in');
  await expect.poll(() => last.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
});

test('language and theme changes cross-fade; the language indicator follows the choice', async ({ page }) => {
  await recordTransitions(page);
  await page.goto('./#/');
  await expect(page.getByTestId('story-card').first()).toBeVisible();
  const track = page.locator('.lang-switch');
  await expect(track).toHaveClass(/has-indicator/);
  // The highlight sits exactly under the active language (the pair swaps sides with the reading direction).
  const under = () =>
    track.evaluate((el) => {
      const a = el.querySelector<HTMLElement>("[aria-pressed='true']")!;
      return el.style.getPropertyValue('--ind-x') === `${a.offsetLeft}px` && el.style.getPropertyValue('--ind-w') === `${a.offsetWidth}px`;
    });
  await expect.poll(under).toBe(true);

  await page.getByRole('button', { name: 'فارسی (Persian)' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('button', { name: 'فارسی (Persian)' })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(under).toBe(true);
  // Re-selecting the current language does nothing.
  await page.getByRole('button', { name: 'فارسی (Persian)' }).click();
  await page.getByRole('button', { name: 'تغییر به تم روشن' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await transitions(page)).toEqual(['lang', 'theme']);
});

test('picks tabs: one highlight slides to the chosen window', async ({ page }) => {
  await page.goto('./#/');
  const tabs = page.locator('.picks .tabs');
  await expect(tabs).toHaveAttribute('data-ind-ready', '');
  const x = () => tabs.evaluate((el) => el.style.getPropertyValue('--ind-x'));
  const daily = await x();
  await page.getByRole('tab', { name: 'Monthly' }).click();
  await expect.poll(x).not.toBe(daily);
  const monthly = page.getByRole('tab', { name: 'Monthly' });
  const box = await monthly.evaluate((el: HTMLElement) => `${el.offsetLeft}px`);
  await expect.poll(x).toBe(box);
});

test('a closing drop-down animates out, inert, then leaves the page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./#/');
  await page.getByRole('button', { name: 'Categories' }).click();
  const panel = page.locator('#nav-panel-categories');
  await expect(panel).toHaveAttribute('data-state', 'open');
  await page.keyboard.press('Escape');
  const closing = await panel.evaluate((el) => [el.dataset.state, el.hasAttribute('inert')]);
  expect(closing).toEqual(['closing', true]);
  await expect(panel).toHaveCount(0);
});

test('reduced motion: no view transitions, no reveal wait, menus close at once', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await recordTransitions(page);
  await page.goto('./#/');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  const last = page.locator('#latest [data-testid=story-card]').last();
  await expect(last).toHaveAttribute('data-reveal', 'in');
  expect(await last.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  await page.getByRole('button', { name: 'Categories' }).click();
  await expect(page.locator('#nav-panel-categories')).toBeVisible();
  await page.keyboard.press('Escape');
  expect(await page.locator('#nav-panel-categories').count()).toBe(0);
  await setHash(page, '#/archive');
  await expect(page.getByRole('heading', { level: 1, name: 'Archive' })).toBeVisible();
  await page.getByRole('button', { name: /Persian/ }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  expect(await transitions(page)).toEqual([]);
});

test('Save-Data switches to the lighter motion mode', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true }));
  await page.goto('./#/');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'lite');
});
