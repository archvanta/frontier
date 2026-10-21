import { expect, test } from '@playwright/test';

test('story deep link survives a hard reload and shows attribution + times', async ({ page }) => {
  await page.goto('./#/');
  const first = page.getByTestId('story-card').first();
  const id = await first.getAttribute('data-id');
  await first.getByRole('heading').getByRole('link').click();
  await expect(page).toHaveURL(new RegExp(`#/story/\\d{4}-\\d{2}-\\d{2}/${id}$`));
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('[MOCK]');
  await expect(page.getByText('Published', { exact: true })).toBeVisible();
  await expect(page.getByText('Collected', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /Read at source/ })).toHaveAttribute('rel', 'noopener noreferrer');
});

test('archive pages hold different stories and page 1 is today + yesterday', async ({ page }) => {
  await page.goto('./#/');
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  const ids1 = await page.locator('#latest [data-testid=story-card]').evaluateAll((els) => els.map((e) => e.getAttribute('data-id')));
  await page.goto('./#/?page=2');
  await expect(page.getByRole('heading', { name: 'Today' })).toHaveCount(0);
  const ids2 = await page.locator('#latest [data-testid=story-card]').evaluateAll((els) => els.map((e) => e.getAttribute('data-id')));
  expect(ids2.length).toBeGreaterThan(0);
  expect(ids1.filter((id) => ids2.includes(id))).toEqual([]);
  await page.reload();
  await expect(page.locator('.page-num[aria-current=page]')).toHaveText('2');
});

test('search and filters live in the URL and work without a backend', async ({ page }) => {
  await page.goto('./#/explore?q=claude');
  const rows = page.getByTestId('result-row');
  await expect(rows.first()).toBeVisible();
  for (const text of await rows.allInnerTexts()) expect(text.toLowerCase()).toMatch(/claude|anthropic/);
  await page.getByLabel('Category').selectOption('policy');
  await expect(page).toHaveURL(/c=policy/);
  await page.goto('./#/explore?q=zzzz-no-match');
  await expect(page.getByText('No stories match these filters.')).toBeVisible();
});

test('bookmarks persist locally across reloads', async ({ page }) => {
  await page.goto('./#/');
  const card = page.locator('#latest [data-testid=story-card]').first();
  await card.getByRole('button', { name: 'Save story' }).click();
  await page.goto('./#/saved');
  await page.reload();
  await expect(page.getByTestId('saved-row')).toHaveCount(1);
  await expect(page.getByText(/stored only in this browser/)).toBeVisible();
});

test('archive index links to day pages', async ({ page }) => {
  await page.goto('./#/archive');
  await page.locator('.archive-days a').first().click();
  await expect(page).toHaveURL(/#\/day\/\d{4}-\d{2}-\d{2}$/);
  await expect(page.getByTestId('story-card').first()).toBeVisible();
});

test('unknown routes show a not-found state with a way home', async ({ page }) => {
  await page.goto('./#/nope/nothing');
  await expect(page.getByRole('link', { name: 'Go to Top Signals' })).toBeVisible();
});

test('home category chips filter the latest feed in place', async ({ page }) => {
  await page.goto('./#/');
  const cards = page.locator('#latest [data-testid=story-card]');
  await expect(cards.first()).toBeVisible();
  const all = await cards.count();
  const chips = page.getByRole('group', { name: 'Filter stories by category' });
  const chip = chips.getByRole('button').nth(1);
  const label = (await chip.textContent())!.trim();
  await chip.click();
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  const filtered = await cards.count();
  expect(filtered).toBeGreaterThan(0);
  expect(filtered).toBeLessThan(all);
  const shown = await page.locator('#latest [data-testid=story-card] :is(.chip, .kicker-cat)').allTextContents();
  expect(shown.every((t) => t.trim() === label)).toBe(true);
  await chips.getByRole('button', { name: 'All' }).click();
  await expect(cards).toHaveCount(all);
});

test('"/" focuses the header search and the mobile menu exposes categories', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./#/');
  await expect(page.getByTestId('story-card').first()).toBeVisible();
  await page.keyboard.press('/');
  await expect(page.locator('#site-search')).toBeFocused();
  await page.locator('#site-search').blur();
  await page.getByRole('button', { name: 'Menu' }).click();
  const nav = page.locator('#primary-nav');
  await expect(nav.getByRole('link', { name: 'Explore' })).toBeVisible();
  await nav.getByRole('button', { name: 'Categories' }).click();
  await expect(nav.getByRole('list', { name: 'Categories' }).getByRole('link').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(nav.getByRole('link', { name: 'Explore' })).toBeHidden();
});

test('Persian Explore offers ready-made date ranges instead of a Gregorian date field', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('signal-ai:locale', 'fa'));
  await page.goto('./#/explore');
  await expect(page.locator('input[type=date]')).toHaveCount(0);
  const week = page.getByRole('button', { name: /۷ روز اخیر/ });
  await expect(week).toHaveAttribute('aria-pressed', 'false');
  await week.click();
  await expect(week).toHaveAttribute('aria-pressed', 'true');
  expect(page.url()).toMatch(/from=\d{4}-\d{2}-\d{2}/);
  await page.getByRole('button', { name: 'همه', exact: true }).click();
  expect(page.url()).not.toContain('from=');
});

test('English Explore keeps the native date fields', async ({ page }) => {
  await page.goto('./#/explore');
  await expect(page.locator('input[type=date]')).toHaveCount(2);
});

test('on a phone the header search rests as an icon and opens over the header', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./#/');
  const form = page.locator('.header-search');
  await expect(form).toBeVisible();
  expect((await form.boundingBox())!.width).toBeLessThanOrEqual(44);
  await form.click();
  await expect(page.locator('#site-search')).toBeFocused();
  expect((await form.boundingBox())!.width).toBeGreaterThan(250);
  await page.locator('#site-search').fill('claude');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/explore\?.*q=claude/);
});

test('the sign-in link has an accessible name even when only its icon shows', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./#/');
  await expect(page.locator('.user-signin')).toHaveAccessibleName('Sign in');
});
