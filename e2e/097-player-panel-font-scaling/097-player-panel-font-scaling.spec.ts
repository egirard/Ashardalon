import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('097 - Player Panel Font Scaling', () => {
  test('User can adjust UI scale to make player panels larger or smaller', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection and select a hero
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

    // STEP 2: Capture initial state with default (100%) scale
    await screenshots.capture(page, 'default-scale-100', {
      programmaticCheck: async () => {
        // Verify game board is visible
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
        
        // Verify player card is visible (Quinn is active, so has turn-indicator)
        await expect(page.locator('[data-testid="turn-indicator"]')).toBeVisible();
        
        // Verify corner controls are visible
        await expect(page.locator('[data-testid="corner-controls-se"]')).toBeVisible();
        
        // Verify font scale button exists in SE corner
        await expect(page.locator('[data-testid="corner-controls-se"] [data-testid="corner-font-scale-button"]')).toBeVisible();
      }
    });

    // STEP 3: Open font scale controls
    await page.locator('[data-testid="corner-controls-se"] [data-testid="corner-font-scale-button"]').click();

    await screenshots.capture(page, 'font-scale-controls-visible', {
      programmaticCheck: async () => {
        // Verify font scale controls are visible
        await expect(page.locator('[data-testid="font-scale-controls"]')).toBeVisible();
        await expect(page.locator('[data-testid="font-scale-increase"]')).toBeVisible();
        await expect(page.locator('[data-testid="font-scale-decrease"]')).toBeVisible();
        await expect(page.locator('[data-testid="font-scale-reset"]')).toBeVisible();
        await expect(page.locator('[data-testid="font-scale-value"]')).toContainText('100%');
      }
    });

    // STEP 4: Increase font scale to 130%
    await page.locator('[data-testid="font-scale-increase"]').click();
    await page.locator('[data-testid="font-scale-increase"]').click();
    await page.locator('[data-testid="font-scale-increase"]').click();

    // Wait for CSS to apply and transitions to complete
    await page.waitForTimeout(800);

    await screenshots.capture(page, 'increased-scale-130', {
      programmaticCheck: async () => {
        // Verify scale increased to 130%
        await expect(page.locator('[data-testid="font-scale-value"]')).toContainText('130%');
        
        // Verify CSS custom property is updated
        const fontScale = await page.evaluate(() => {
          return getComputedStyle(document.documentElement).getPropertyValue('--ui-font-scale');
        });
        expect(parseFloat(fontScale)).toBeCloseTo(1.3, 1);
      }
    });

    // STEP 5: Decrease font scale to 90%
    await page.locator('[data-testid="font-scale-decrease"]').click();
    await page.locator('[data-testid="font-scale-decrease"]').click();
    await page.locator('[data-testid="font-scale-decrease"]').click();
    await page.locator('[data-testid="font-scale-decrease"]').click();

    // Wait for CSS to apply and transitions to complete
    await page.waitForTimeout(800);

    await screenshots.capture(page, 'decreased-scale-90', {
      programmaticCheck: async () => {
        // Verify scale decreased to 90%
        await expect(page.locator('[data-testid="font-scale-value"]')).toContainText('90%');
        
        // Verify CSS custom property is updated
        const fontScale = await page.evaluate(() => {
          return getComputedStyle(document.documentElement).getPropertyValue('--ui-font-scale');
        });
        expect(parseFloat(fontScale)).toBeCloseTo(0.9, 1);
      }
    });

    // STEP 6: Test maximum scale (150%)
    // First reset, then increase to max
    await page.locator('[data-testid="font-scale-reset"]').click();
    
    // Click increase 5 times to reach 150%
    for (let i = 0; i < 5; i++) {
      await page.locator('[data-testid="font-scale-increase"]').click();
    }

    // Wait for CSS to apply and transitions to complete
    await page.waitForTimeout(800);

    await screenshots.capture(page, 'maximum-scale-150', {
      programmaticCheck: async () => {
        // Verify scale is at maximum (150%)
        await expect(page.locator('[data-testid="font-scale-value"]')).toContainText('150%');
        
        // Verify increase button is disabled
        await expect(page.locator('[data-testid="font-scale-increase"]')).toBeDisabled();
        
        // Verify CSS custom property is updated
        const fontScale = await page.evaluate(() => {
          return getComputedStyle(document.documentElement).getPropertyValue('--ui-font-scale');
        });
        expect(parseFloat(fontScale)).toBeCloseTo(1.5, 1);
      }
    });

    // STEP 7: Test minimum scale (80%)
    // Click decrease until minimum
    for (let i = 0; i < 7; i++) {
      await page.locator('[data-testid="font-scale-decrease"]').click();
    }

    // Wait for CSS to apply and transitions to complete
    await page.waitForTimeout(800);

    await screenshots.capture(page, 'minimum-scale-80', {
      programmaticCheck: async () => {
        // Verify scale is at minimum (80%)
        await expect(page.locator('[data-testid="font-scale-value"]')).toContainText('80%');
        
        // Verify decrease button is disabled
        await expect(page.locator('[data-testid="font-scale-decrease"]')).toBeDisabled();
        
        // Verify CSS custom property is updated
        const fontScale = await page.evaluate(() => {
          return getComputedStyle(document.documentElement).getPropertyValue('--ui-font-scale');
        });
        expect(parseFloat(fontScale)).toBeCloseTo(0.8, 1);
      }
    });

    // STEP 8: Reset to default
    await page.locator('[data-testid="font-scale-reset"]').click();

    // Wait for CSS to apply and transitions to complete
    await page.waitForTimeout(800);

    await screenshots.capture(page, 'reset-to-default', {
      programmaticCheck: async () => {
        // Verify scale is back to 100%
        await expect(page.locator('[data-testid="font-scale-value"]')).toContainText('100%');
        
        // Verify reset button is disabled
        await expect(page.locator('[data-testid="font-scale-reset"]')).toBeDisabled();
        
        // Verify CSS custom property is reset
        const fontScale = await page.evaluate(() => {
          return getComputedStyle(document.documentElement).getPropertyValue('--ui-font-scale');
        });
        expect(parseFloat(fontScale)).toBeCloseTo(1.0, 1);
      }
    });

    // STEP 9: Close font scale controls
    await page.locator('[data-testid="corner-controls-se"] [data-testid="corner-font-scale-button"]').click();

    await screenshots.capture(page, 'controls-closed', {
      programmaticCheck: async () => {
        // Verify font scale controls are hidden
        await expect(page.locator('[data-testid="font-scale-controls"]')).not.toBeVisible();
      }
    });
  });
});
