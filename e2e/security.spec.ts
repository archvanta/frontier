import { expect, test } from '@playwright/test';

test('pages render under the production CSP with no console errors', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(m.text());
  });
  page.on('pageerror', (e) => problems.push(e.message));
  await page.goto('./#/');
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);
  await expect(page.getByTestId('story-card').first()).toBeVisible();
  for (const route of ['#/picks/daily', '#/explore?q=model', '#/archive', '#/about']) {
    await page.goto(`./${route}`);
    await expect(page.locator('main')).toBeVisible();
  }
  expect(problems).toEqual([]);
});

test('external links never leak the opener', async ({ page }) => {
  await page.goto('./#/');
  const external = page.locator('a[target=_blank]');
  const n = await external.count();
  for (let i = 0; i < n; i++) await expect(external.nth(i)).toHaveAttribute('rel', /noopener/);
});
