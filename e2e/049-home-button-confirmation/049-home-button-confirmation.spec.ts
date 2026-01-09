import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('049 - Home Button Confirmation Dialog', () => {
  test('user sees confirmation dialog when clicking Home button and can cancel or confirm', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Start a game (navigate to character select and start game with Quinn)
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    // Select Quinn
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    
    // Select power cards
    await selectDefaultPowerCards(page, 'quinn');
    
    // Start the game
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    await screenshots.capture(page, 'game-started', {
      programmaticCheck: async () => {
        // Verify we're on the game board
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
        
        // Verify Home button is visible
        await expect(page.locator('[data-testid="corner-home-button"]').first()).toBeVisible();
      }
    });

    // STEP 2: Click the Home button to trigger confirmation dialog
    await page.locator('[data-testid="corner-home-button"]').first().click();
    
    // Wait for confirmation dialog to appear
    await page.locator('[data-testid="confirmation-dialog"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'confirmation-dialog-shown', {
      programmaticCheck: async () => {
        // Verify confirmation dialog is visible
        await expect(page.locator('[data-testid="confirmation-dialog"]')).toBeVisible();
        
        // Verify dialog title
        await expect(page.locator('[data-testid="dialog-title"]')).toContainText('Return to Character Select?');
        
        // Verify dialog message warns about losing progress
        const message = await page.locator('[data-testid="dialog-message"]').textContent();
        expect(message).toContain('lose');
        expect(message).toContain('progress');
        
        // Verify both buttons are visible
        await expect(page.locator('[data-testid="dialog-cancel-button"]')).toBeVisible();
        await expect(page.locator('[data-testid="dialog-confirm-button"]')).toBeVisible();
        
        // Verify game board is still in background
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
      }
    });

    // STEP 3: Click Cancel button to dismiss dialog and stay in game
    await page.locator('[data-testid="dialog-cancel-button"]').click();
    
    // Wait for dialog to disappear
    await page.locator('[data-testid="confirmation-dialog"]').waitFor({ state: 'hidden' });

    await screenshots.capture(page, 'dialog-cancelled', {
      programmaticCheck: async () => {
        // Verify dialog is hidden
        await expect(page.locator('[data-testid="confirmation-dialog"]')).not.toBeVisible();
        
        // Verify we're still on the game board
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
        
        // Verify Home button is still visible
        await expect(page.locator('[data-testid="corner-home-button"]').first()).toBeVisible();
      }
    });

    // STEP 4: Click Home button again to trigger confirmation dialog again
    await page.locator('[data-testid="corner-home-button"]').first().click();
    await page.locator('[data-testid="confirmation-dialog"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'confirmation-dialog-shown-again', {
      programmaticCheck: async () => {
        // Verify confirmation dialog is visible again
        await expect(page.locator('[data-testid="confirmation-dialog"]')).toBeVisible();
      }
    });

    // STEP 5: Click Confirm button to return to character select
    await page.locator('[data-testid="dialog-confirm-button"]').click();
    
    // Wait for character select screen to appear
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'returned-to-character-select', {
      programmaticCheck: async () => {
        // Verify we're back at character select
        await expect(page.locator('[data-testid="character-select"]')).toBeVisible();
        
        // Verify game board is no longer visible
        await expect(page.locator('[data-testid="game-board"]')).not.toBeVisible();
        
        // Verify dialog is not visible
        await expect(page.locator('[data-testid="confirmation-dialog"]')).not.toBeVisible();
      }
    });
  });

  test('user can dismiss confirmation dialog with Escape key', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // Start a game
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Click Home button to show dialog
    await page.locator('[data-testid="corner-home-button"]').first().click();
    await page.locator('[data-testid="confirmation-dialog"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'dialog-before-escape', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="confirmation-dialog"]')).toBeVisible();
      }
    });

    // Press Escape key to dismiss
    await page.keyboard.press('Escape');
    await page.locator('[data-testid="confirmation-dialog"]').waitFor({ state: 'hidden' });

    await screenshots.capture(page, 'dialog-dismissed-with-escape', {
      programmaticCheck: async () => {
        // Verify dialog is hidden
        await expect(page.locator('[data-testid="confirmation-dialog"]')).not.toBeVisible();
        
        // Verify we're still on the game board
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
      }
    });
  });

  test('user can confirm with Enter key', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // Start a game
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Click Home button to show dialog
    await page.locator('[data-testid="corner-home-button"]').first().click();
    await page.locator('[data-testid="confirmation-dialog"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'dialog-before-enter', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="confirmation-dialog"]')).toBeVisible();
      }
    });

    // Press Enter key to confirm
    await page.keyboard.press('Enter');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'confirmed-with-enter', {
      programmaticCheck: async () => {
        // Verify we're back at character select
        await expect(page.locator('[data-testid="character-select"]')).toBeVisible();
        await expect(page.locator('[data-testid="game-board"]')).not.toBeVisible();
      }
    });
  });
});
