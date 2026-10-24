import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// The mock build uses the labelled in-browser account service; production credentials live in Supabase Auth.

async function signIn(page: Page, username = 'reader') {
  await page.goto('./#/signin?mode=create');
  await expect(page.getByText(/Mock mode: this account is stored only in this browser/)).toBeVisible();
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill('frontier-pass-123');
  await page.getByRole('button', { name: 'Create account' }).click();
}

test('sign up with username/password, onboard, get a personal feed, save across reloads, sign out', async ({ page }) => {
  await signIn(page);
  await expect(page).toHaveURL(/#\/welcome$/);

  await page.getByLabel('Display name').fill('Reader');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: /AI Models & Releases/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: /OpenAI/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Review your feed' })).toBeVisible();
  await page.getByRole('button', { name: 'Finish' }).click();

  await expect(page).toHaveURL(/#\/for-you$/);
  await expect(page.getByRole('heading', { name: 'Hi, Reader' })).toBeVisible();
  await expect(page.getByTestId('fy-reason').first()).toContainText(/OpenAI|AI Models/);

  const first = page.getByTestId('fy-item').first();
  const id = await first.getByTestId('story-card').getAttribute('data-id');
  await first.getByRole('button', { name: 'Save story' }).click();
  // The mock service answers after a short delay, like a real network; wait until the save is stored.
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('signal-ai:mock-accounts:v1') ?? '')).toContain(id!);
  await page.goto('./#/saved');
  await page.reload();
  await expect(page.getByRole('button', { name: /Account menu/ })).toBeVisible();
  await expect(page.getByText('Saved to your account')).toBeVisible();
  await expect(page.getByTestId('saved-row')).toHaveCount(1);
  await expect(page.getByTestId('saved-row').getByRole('link').first()).toHaveAttribute('href', new RegExp(`${id}$`));

  await page.getByRole('button', { name: /Account menu/ }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  await page.goto('./#/for-you');
  await expect(page.getByText('Sign in to see this page')).toBeVisible();
});

test('the account menu works with the keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page);
  await expect(page).toHaveURL(/#\/welcome$/);
  const trigger = page.getByRole('button', { name: /Account menu/ });
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('link', { name: /For You/ })).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeHidden();
});

for (const theme of ['dark', 'light'] as const) {
  for (const locale of ['en', 'fa'] as const) {
    test(`signed-in screens have no WCAG A/AA violations — ${theme} ${locale}`, async ({ page }) => {
      await page.addInitScript(
        ([l, t]) => {
          window.localStorage.setItem('signal-ai:locale', l!);
          window.localStorage.setItem('signal-ai:theme', t!);
        },
        [locale, theme],
      );
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('./#/signin?mode=create');
      await page.getByLabel(locale === 'fa' ? 'نام کاربری' : 'Username').fill(`a11y-${theme}-${locale}`);
      await page.getByLabel(locale === 'fa' ? 'رمز عبور' : 'Password').fill('frontier-pass-123');
      await page.locator('form button[type=submit]').click();
      await expect(page).toHaveURL(/#\/welcome$/);
      for (const route of ['#/welcome', '#/for-you', '#/account', '#/saved']) {
        await page.goto(`./${route}`);
        await expect(page.locator('main')).toBeVisible();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(400);
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        const summary = results.violations.map((v) => `${route} ${v.id} (${v.impact}): ${v.nodes.length} × ${v.nodes[0]?.target.join(' ')}`);
        expect(summary).toEqual([]);
      }
    });
  }
}
