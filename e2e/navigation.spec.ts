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
