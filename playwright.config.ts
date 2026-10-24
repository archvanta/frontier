import { defineConfig, devices } from '@playwright/test';

// The cloud dev container ships a Chromium build; CI uses `npx playwright install chromium`.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4174/frontier/',
    trace: 'retain-on-failure',
    // The opening animation is switched off for the suite (so it never covers the page under test); e2e/site-intro.spec.ts turns it back on.
    storageState: { cookies: [], origins: [{ origin: 'http://localhost:4174', localStorage: [{ name: 'signal-ai:intro', value: 'off' }] }] },
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run preview:mock',
    url: 'http://localhost:4174/frontier/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
