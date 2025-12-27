import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards } from '../helpers/screenshot-helper';

test.describe('041 - Submit Feedback Button', () => {
  test('feedback button is visible and accessible on game board', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection screen
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    // STEP 2: Select a hero and start the game
    await page.locator('[data-testid="hero-quinn"]').click();
    await selectDefaultPowerCards(page, 'quinn');

    // STEP 3: Start the game
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Wait for the game board to be fully rendered
    await page.locator('[data-testid="start-tile"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'game-board-with-feedback-button', {
      programmaticCheck: async () => {
        // Verify the feedback button is visible (now part of corner controls)
        await expect(page.locator('[data-testid="corner-feedback-button"]').first()).toBeVisible();
        
        // Verify the button has the correct aria-label (icon-only button)
        await expect(page.locator('[data-testid="corner-feedback-button"]').first()).toHaveAttribute('aria-label', 'Submit Feedback');
        
        // Verify the button is enabled (can be clicked)
        await expect(page.locator('[data-testid="corner-feedback-button"]').first()).toBeEnabled();
        
        // Verify game board is in correct state
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
        await expect(page.locator('[data-testid="corner-home-button"]').first()).toBeVisible();
      }
    });
  });

  test('feedback button triggers window.open when clicked', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to game board
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // STEP 2: Set up window.open spy before clicking
    const windowOpenPromise = page.evaluateHandle(() => {
      return new Promise<string>((resolve) => {
        const originalOpen = window.open;
        window.open = function(url?: string | URL, target?: string): WindowProxy | null {
          if (url) {
            resolve(url.toString());
          }
          return null; // Return null to prevent actual window opening in test
        };
      });
    });

    // STEP 3: Click the feedback button
    const clickPromise = page.locator('[data-testid="corner-feedback-button"]').first().click();

    // Wait for window.open to be called (with timeout)
    const openedUrl = await Promise.race([
      windowOpenPromise.then(handle => 
        handle.evaluate((promise: Promise<string>) => promise)
      ),
      new Promise<string>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout waiting for window.open')), 5000)
      )
    ]);

    await clickPromise;

    // Check that the URL is a GitHub issue creation URL
    expect(openedUrl).toContain('https://github.com/egirard/Ashardalon/issues/new');
    expect(openedUrl).toContain('labels=UserGenerated');

    await screenshots.capture(page, 'after-feedback-button-click', {
      programmaticCheck: async () => {
        // Verify the game board is still visible (not navigated away)
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
        await expect(page.locator('[data-testid="corner-feedback-button"]').first()).toBeVisible();
      }
    });
  });
});
