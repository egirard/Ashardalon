import { defineConfig, devices } from '@playwright/test';

/**
 * Screenshot comparison tolerance configuration
 * 
 * RATIONALE:
 * E2E tests exhibit systemic screenshot non-determinism due to browser rendering
 * variations (see E2E_SCREENSHOT_INVESTIGATION.md for detailed analysis).
 * Pixel differences of 1-2% (~5,000-12,000 pixels) occur between consecutive runs
 * even with identical application state, due to:
 * - Chromium compositor sub-pixel rendering variations
 * - Font anti-aliasing timing differences
 * - CSS Grid/Flexbox sub-pixel rounding
 * 
 * SOLUTION:
 * Use strict comparison in CI (baseline source of truth), but allow small tolerance
 * locally to prevent false positives while still catching real visual regressions.
 * 
 * The thresholds below were chosen based on empirical data from test 072 and others:
 * - maxDiffPixels: 200 = ~0.05% of a 1920x1080 screen (2,073,600 pixels)
 * - threshold: 0.2 = 20% per-pixel color difference tolerance (catches anti-aliasing)
 * 
 * These values allow minor rendering variations while still detecting actual bugs.
 */
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: 0, // Tests must pass on first attempt
  workers: isCI ? 1 : undefined,
  reporter: 'html',
  timeout: 60000, // 60 second timeout for complex multi-turn tests
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  expect: {
    toHaveScreenshot: {
      // Strict mode in CI (source of truth), lenient locally
      maxDiffPixels: isCI ? 100 : 200,
      // Allow minimal per-pixel color difference to handle anti-aliasing
      threshold: isCI ? 0.15 : 0.2,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 120 seconds to start the server
  },
});
