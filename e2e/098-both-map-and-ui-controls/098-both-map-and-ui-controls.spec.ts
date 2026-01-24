import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('098 - Both Map Control and UI Scale Controls', () => {
  test('Both map zoom and UI scale controls are available and work independently', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection and select Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    
    // Select power cards for Quinn
    await selectDefaultPowerCards(page, 'quinn');
    
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Hide movement overlay for stable screenshot
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/hideMovement' });
    });

    // Wait for movement overlay to be hidden
    await page.waitForFunction(() => {
      const buttons = document.querySelectorAll('[data-testid^="move-to-"]');
      return buttons.length === 0;
    });

    // STEP 2: Capture initial state showing both control buttons in corner
    await screenshots.capture(page, 'both-buttons-visible', {
      programmaticCheck: async () => {
        // Verify game board is visible
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
        
        // Verify BOTH control buttons are present in the SE corner
        const seControls = page.locator('[data-testid="corner-controls-se"]');
        await expect(seControls.locator('[data-testid="corner-map-button"]')).toBeVisible();
        await expect(seControls.locator('[data-testid="corner-font-scale-button"]')).toBeVisible();
        
        // Verify neither control panel is visible initially
        await expect(page.locator('[data-testid="map-zoom-controls"]')).not.toBeVisible();
        await expect(page.locator('[data-testid="font-scale-controls"]')).not.toBeVisible();
      }
    });

    // STEP 3: Activate map control mode to show map zoom controls
    await page.locator('[data-testid="corner-controls-se"] [data-testid="corner-map-button"]').click();
    await page.waitForTimeout(500);

    await screenshots.capture(page, 'map-controls-active', {
      programmaticCheck: async () => {
        // Verify map zoom controls are now visible
        await expect(page.locator('[data-testid="map-zoom-controls"]')).toBeVisible();
        await expect(page.locator('[data-testid="zoom-in-button"]')).toBeVisible();
        await expect(page.locator('[data-testid="zoom-out-button"]')).toBeVisible();
        await expect(page.locator('[data-testid="zoom-slider"]')).toBeVisible();
        
        // Verify UI scale controls are still hidden
        await expect(page.locator('[data-testid="font-scale-controls"]')).not.toBeVisible();
        
        // Verify map button is active
        await expect(page.locator('[data-testid="corner-controls-se"] [data-testid="corner-map-button"]')).toHaveClass(/active/);
      }
    });

    // STEP 4: Use map zoom controls
    await page.locator('[data-testid="zoom-in-button"]').click();
    await page.locator('[data-testid="zoom-in-button"]').click();
    await page.waitForTimeout(500);

    await screenshots.capture(page, 'map-zoomed-in', {
      programmaticCheck: async () => {
        // Verify zoom level increased
        await expect(page.locator('[data-testid="zoom-level"]')).toContainText('120%');
      }
    });

    // STEP 5: Exit map control mode
    await page.locator('[data-testid="corner-controls-se"] [data-testid="corner-map-button"]').click();
    await page.waitForTimeout(500);

    await screenshots.capture(page, 'map-controls-closed', {
      programmaticCheck: async () => {
        // Verify map zoom controls are hidden
        await expect(page.locator('[data-testid="map-zoom-controls"]')).not.toBeVisible();
        
        // Verify map button is no longer active
        await expect(page.locator('[data-testid="corner-controls-se"] [data-testid="corner-map-button"]')).not.toHaveClass(/active/);
      }
    });

    // STEP 6: Activate UI scale controls
    await page.locator('[data-testid="corner-controls-se"] [data-testid="corner-font-scale-button"]').click();
    await page.waitForTimeout(500);

    await screenshots.capture(page, 'ui-scale-controls-active', {
      programmaticCheck: async () => {
        // Verify UI scale controls are now visible
        await expect(page.locator('[data-testid="font-scale-controls"]')).toBeVisible();
        await expect(page.locator('[data-testid="font-scale-increase"]')).toBeVisible();
        await expect(page.locator('[data-testid="font-scale-decrease"]')).toBeVisible();
        await expect(page.locator('[data-testid="font-scale-value"]')).toContainText('100%');
        
        // Verify map zoom controls are still hidden
        await expect(page.locator('[data-testid="map-zoom-controls"]')).not.toBeVisible();
        
        // Verify font scale button is active
        await expect(page.locator('[data-testid="corner-controls-se"] [data-testid="corner-font-scale-button"]')).toHaveClass(/active/);
      }
    });

    // STEP 7: Use UI scale controls
    await page.locator('[data-testid="font-scale-increase"]').click();
    await page.locator('[data-testid="font-scale-increase"]').click();
    await page.locator('[data-testid="font-scale-increase"]').click();
    await page.waitForTimeout(800);

    await screenshots.capture(page, 'ui-scaled-to-130', {
      programmaticCheck: async () => {
        // Verify UI scale increased
        await expect(page.locator('[data-testid="font-scale-value"]')).toContainText('130%');
      }
    });

    // STEP 8: Close UI scale controls
    await page.locator('[data-testid="corner-controls-se"] [data-testid="corner-font-scale-button"]').click();
    await page.waitForTimeout(500);

    await screenshots.capture(page, 'both-controls-closed', {
      programmaticCheck: async () => {
        // Verify both control panels are hidden
        await expect(page.locator('[data-testid="map-zoom-controls"]')).not.toBeVisible();
        await expect(page.locator('[data-testid="font-scale-controls"]')).not.toBeVisible();
        
        // Verify both buttons are still visible and not active
        const seControls = page.locator('[data-testid="corner-controls-se"]');
        await expect(seControls.locator('[data-testid="corner-map-button"]')).toBeVisible();
        await expect(seControls.locator('[data-testid="corner-font-scale-button"]')).toBeVisible();
        await expect(seControls.locator('[data-testid="corner-map-button"]')).not.toHaveClass(/active/);
        await expect(seControls.locator('[data-testid="corner-font-scale-button"]')).not.toHaveClass(/active/);
      }
    });
  });
});
