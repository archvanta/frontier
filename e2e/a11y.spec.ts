import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// WCAG 2.1 A/AA rules from axe-core on the main routes, in both languages.
for (const locale of ['en', 'fa'] as const) {
  for (const route of ['#/', '#/picks/weekly', '#/explore', '#/archive', '#/about']) {
    test(`no WCAG A/AA violations — ${locale} ${route}`, async ({ page }) => {
      await page.addInitScript((l) => window.localStorage.setItem('signal-ai:locale', l), locale);
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
