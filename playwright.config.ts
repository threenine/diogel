import { defineConfig } from '@playwright/test';

/**
 * End-to-end configuration (#141).
 *
 * These specs load the built extension into a real browser. They are slower and heavier than the
 * unit suite and are kept out of `vitest` entirely — see the `exclude` in `vitest.config.ts`.
 *
 * Run them with `npm run test:e2e`, which builds the extension first.
 */
export default defineConfig({
  testDir: './tests/e2e',
  // Extensions need a persistent context per worker, and the vault is global to a profile, so
  // parallel workers would fight over the same state.
  workers: 1,
  fullyParallel: false,
  // A failing approval assertion is a real failure; retrying would hide flakiness rather than
  // report it. CI gets one retry only to absorb browser-startup noise.
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  // The app boots slowly by design: App.vue waits on the background bridge for up to 10s and on
  // settings for 1.5s before it decides which surface to show. Assertions have to outlast that.
  expect: { timeout: 25_000 },
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    trace: 'retain-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      // Chromium is where `side_panel` and the MV3 service worker live, so it is the reference
      // target and carries the deeper coverage.
      testIgnore: '**/firefox/**',
      use: { browserName: 'chromium' },
    },
    {
      // Driven through WebDriver, not Playwright: Playwright cannot install extensions in Firefox.
      // The runner here is only providing structure and reporting — see tests/e2e/fixtures/firefox.ts.
      name: 'firefox',
      testMatch: '**/firefox/**/*.spec.ts',
    },
  ],
});
