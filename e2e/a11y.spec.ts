import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// WCAG 2.1 A/AA rules from axe-core on the main routes, in both languages and both colour themes.
for (const theme of ['dark', 'light'] as const) {
  for (const locale of ['en', 'fa'] as const) {
    for (const route of ['#/', '#/picks/weekly', '#/explore', '#/archive', '#/about', '#/sources', '#/saved', '#/signin', '#/privacy', '#/ai-games', '#/data-centers']) {
      test(`no WCAG A/AA violations — ${theme} ${locale} ${route}`, async ({ page }) => {
        await page.addInitScript(
          ([l, t]) => {
            window.localStorage.setItem('signal-ai:locale', l!);
            window.localStorage.setItem('signal-ai:theme', t!);
          },
          [locale, theme],
        );
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto(`./${route}`);
        await expect(page.locator('main')).toBeVisible();
        await page.waitForLoadState('networkidle');
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} × ${v.nodes[0]?.target.join(' ')}`);
        expect(summary).toEqual([]);
      });
    }
  }
}
