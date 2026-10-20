import { expect, test } from '@playwright/test';

test('header is a full-width bar that stays at the top while scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./#/');
  const header = page.locator('.site-header');
  const box = await header.boundingBox();
  expect(box!.x).toBeLessThanOrEqual(0.5);
  expect(box!.width).toBeGreaterThanOrEqual(1430);
  await page.evaluate(() => window.scrollTo(0, 1500));
  await expect.poll(async () => (await header.boundingBox())!.y).toBeCloseTo(0, 0);
});

test('drop-downs open on click, move with the arrow keys and close with Escape, outside click and navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./#/');
  const trigger = page.getByRole('button', { name: 'Categories' });
  const panel = page.getByRole('list', { name: 'Categories' });
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(panel.getByRole('link')).toHaveCount(8);

  // Only one panel at a time.
  await page.getByRole('button', { name: 'Picks' }).click();
  await expect(panel).toBeHidden();
  await expect(page.getByRole('list', { name: 'Picks' }).getByRole('link')).toHaveCount(3);

  // Keyboard: ArrowDown from the trigger enters the panel; Escape returns focus to the trigger.
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  await expect(panel.getByRole('link').first()).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(panel.getByRole('link').nth(1)).toBeFocused();
  await page.keyboard.press('End');
  await expect(panel.getByRole('link').last()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(trigger).toBeFocused();

  // Outside click closes.
  await trigger.click();
  await expect(panel).toBeVisible();
  await page.mouse.click(700, 500);
  await expect(panel).toBeHidden();

  // Choosing a row navigates and closes the panel.
  await trigger.click();
  await panel.getByRole('link', { name: /Policy/ }).click();
  await expect(page).toHaveURL(/#\/explore\?c=policy$/);
  await expect(panel).toBeHidden();
  await trigger.click();
  await expect(panel.getByRole('link', { name: /Policy/ })).toHaveAttribute('aria-current', 'page');
});

test('Persian header mirrors: wordmark on the right, call-to-action on the left, drop-down stays on screen', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('signal-ai:locale', 'fa'));
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('./#/');
  const word = await page.locator('.wordmark').boundingBox();
  const cta = await page.locator('.header-cta').boundingBox();
  expect(word!.x).toBeGreaterThan(640);
  expect(cta!.x).toBeLessThan(640);
  await page.getByRole('button', { name: 'بیشتر' }).click();
  const panel = await page.getByRole('list', { name: 'بیشتر' }).boundingBox();
  expect(panel!.x).toBeGreaterThanOrEqual(0);
  expect(panel!.x + panel!.width).toBeLessThanOrEqual(1280);
});

test('no horizontal overflow or clipped header between 1181px and the mobile breakpoint, in both languages', async ({ page }) => {
  for (const locale of ['en', 'fa']) {
    await page.addInitScript((l) => window.localStorage.setItem('signal-ai:locale', l), locale);
    for (const width of [1181, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('./#/');
      await expect(page.locator('.header-cta')).toBeVisible();
      const over = await page.evaluate(() => {
        const bar = document.querySelector('.header-bar')!;
        return bar.scrollWidth - bar.clientWidth;
      });
      expect(over, `${locale} ${width}`).toBeLessThanOrEqual(0);
    }
  }
});

test.describe('theme', () => {
  test('dark is the default, the toggle switches to light and the choice survives reloads and language changes', async ({ page }) => {
    await page.goto('./#/');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: 'Switch to light theme' }).click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(255, 255, 255)');
    expect(await page.evaluate(() => window.localStorage.getItem('signal-ai:theme'))).toBe('light');
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await page.getByRole('button', { name: /فارسی|Persian/ }).click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await page.getByRole('button', { name: 'تغییر به تم تیره' }).click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(0, 0, 0)');
  });

  test('the saved theme is applied before the app loads, so there is no flash', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('signal-ai:theme', 'light'));
    await page.route('**/assets/*.js', (route) => route.abort()); // the app bundle never runs
    await page.goto('./#/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(255, 255, 255)');
  });

  test('light theme keeps hero text, cards and the header readable and nothing overflows', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('signal-ai:theme', 'light'));
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ['#/', '#/explore', '#/saved', '#/about']) {
        await page.goto(`./${route}`);
        await expect(page.locator('main')).toBeVisible();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${route} @${width}`).toBeLessThanOrEqual(0);
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('./#/');
    await expect(page.getByTestId('hero-slide').first()).toBeAttached();
    // The hero stays a dark stage in the light theme: its title is white.
    expect(await page.locator('.nh-slide.is-active .nh-title').evaluate((el) => getComputedStyle(el).color)).toBe('rgb(255, 255, 255)');
    // Gradient cards keep white type.
    expect(
      await page
        .locator('.story-card.is-feature .story-title a')
        .first()
        .evaluate((el) => getComputedStyle(el).color),
    ).toBe('rgb(255, 255, 255)');
  });
});

test('the site is called FRONTIER in the tab title, the wordmark and the footer, in both languages', async ({ page }) => {
  await page.goto('./#/');
  await expect(page).toHaveTitle(/FRONTIER/);
  await expect(page.locator('.wordmark-text')).toHaveText('FRONTIER');
  await expect(page.getByRole('link', { name: 'FRONTIER' }).first()).toBeVisible();
  await expect(page.locator('.footer-name')).toHaveText('FRONTIER');
  await page.getByRole('button', { name: 'فارسی (Persian)' }).click();
  await expect(page.getByRole('link', { name: 'فرانتیر' }).first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText('SIGNAL AI');
});
