// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for the Todo App E2E test suite.
 *
 * The app is a pure static site — no build step. The `webServer` block
 * spins up `serve` before the test run and tears it down afterward.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if test.only is accidentally left in source */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Limit parallelism on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter: verbose on CI, concise locally */
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],

  use: {
    /* Base URL so tests can use relative paths like page.goto('/') */
    baseURL: 'http://localhost:3000',

    /* Collect trace on first retry to aid debugging */
    trace: 'on-first-retry',

    /* Screenshots on failure */
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  /* Start a static file server before tests; reuse if already running locally */
  webServer: {
    command: 'npx serve . --listen 3000 --no-clipboard',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
});
