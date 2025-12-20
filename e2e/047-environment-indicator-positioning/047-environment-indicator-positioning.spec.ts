import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards } from '../helpers/screenshot-helper';

test.describe('047 - Environment Indicator Positioning', () => {
  test('environment indicator displays at top of game state panel without overlapping controls', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Navigate and start game
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'character-select-screen', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="character-select"]')).toBeVisible();
      }
    });
    
    // Select Vistra from right edge to ensure game state panel is visible
    await page.locator('[data-testid="hero-vistra-right"]').click();
    
    // Select power cards
    await selectDefaultPowerCards(page, 'vistra');
    
    await page.locator('[data-testid="start-game-button"]').click();
    
    // Wait for game board
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    
    // STEP 2: Verify initial state without environment
    await screenshots.capture(page, 'game-started-no-environment', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.activeEnvironmentId).toBeNull();
        await expect(page.locator('[data-testid="environment-indicator"]')).not.toBeVisible();
        // Verify game state panel controls are visible
        await expect(page.locator('[data-testid="objective-display"]')).toBeVisible();
        await expect(page.locator('[data-testid="end-phase-button"]')).toBeVisible();
      }
    });
    
    // STEP 3: Programmatically activate Kobold Trappers environment
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setActiveEnvironment',
        payload: 'kobold-trappers'
      });
    });
    
    // Wait for environment indicator to appear
    await page.locator('[data-testid="environment-indicator"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'kobold-trappers-environment-active', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.activeEnvironmentId).toBe('kobold-trappers');
        
        // Verify environment indicator is visible and contains correct text
        await expect(page.locator('[data-testid="environment-indicator"]')).toBeVisible();
        await expect(page.locator('[data-testid="environment-indicator"]')).toContainText('Kobold Trappers');
        
        // Verify all game state panel controls are still visible (no overlap)
        await expect(page.locator('[data-testid="objective-display"]')).toBeVisible();
        await expect(page.locator('[data-testid="end-phase-button"]')).toBeVisible();
        
        // Verify environment indicator position in board-controls
        const environmentIndicator = page.locator('[data-testid="environment-indicator"]');
        const objectiveDisplay = page.locator('[data-testid="objective-display"]');
        
        const envBox = await environmentIndicator.boundingBox();
        const objBox = await objectiveDisplay.boundingBox();
        
        // Environment indicator should be above objective display
        expect(envBox).not.toBeNull();
        expect(objBox).not.toBeNull();
        if (envBox && objBox) {
          expect(envBox.y).toBeLessThan(objBox.y);
        }
      }
    });
    
    // STEP 4: Replace with different environment (Surrounded)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setActiveEnvironment',
        payload: 'surrounded'
      });
    });
    
    await page.locator('[data-testid="environment-indicator"]').waitFor({ state: 'visible' });
    await expect(page.locator('[data-testid="environment-indicator"]')).toContainText('Surrounded');
    
    await screenshots.capture(page, 'surrounded-environment-replaces-previous', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.activeEnvironmentId).toBe('surrounded');
        
        // Verify environment indicator updated
        await expect(page.locator('[data-testid="environment-indicator"]')).toBeVisible();
        await expect(page.locator('[data-testid="environment-indicator"]')).toContainText('Surrounded');
        await expect(page.locator('[data-testid="environment-indicator"]')).not.toContainText('Kobold Trappers');
        
        // Verify controls still visible
        await expect(page.locator('[data-testid="objective-display"]')).toBeVisible();
        await expect(page.locator('[data-testid="end-phase-button"]')).toBeVisible();
      }
    });
    
    // STEP 5: Clear environment
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setActiveEnvironment',
        payload: null
      });
    });
    
    await page.locator('[data-testid="environment-indicator"]').waitFor({ state: 'hidden' });
    
    await screenshots.capture(page, 'environment-cleared', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.activeEnvironmentId).toBeNull();
        await expect(page.locator('[data-testid="environment-indicator"]')).not.toBeVisible();
        
        // Verify controls remain visible
        await expect(page.locator('[data-testid="objective-display"]')).toBeVisible();
        await expect(page.locator('[data-testid="end-phase-button"]')).toBeVisible();
      }
    });
  });
});
