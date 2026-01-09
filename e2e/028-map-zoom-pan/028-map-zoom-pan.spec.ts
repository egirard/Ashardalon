import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('028 - Map Zoom and Pan Controls', () => {
  test('User can toggle map control mode and use zoom controls', async ({ page }) => {
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

    // Set deterministic position for Quinn
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 2 } }
      });
      // Hide movement overlay for stable screenshot
      store.dispatch({ type: 'game/hideMovement' });
    });

    // Wait for the position to be applied
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 2 });
    }).toPass();

    // Wait for movement overlay to be hidden
    await page.waitForFunction(() => {
      const buttons = document.querySelectorAll('[data-testid^="move-to-"]');
      return buttons.length === 0;
    });

    await screenshots.capture(page, 'game-board-initial', {
      programmaticCheck: async () => {
        // Verify game board is visible
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
        
        // Verify map control button is visible and not active
        const mapControlButton = page.locator('[data-testid="map-control-button"]');
        await expect(mapControlButton).toBeVisible();
        await expect(mapControlButton).toContainText('Control Map');
        
        // Verify zoom controls are NOT visible initially
        await expect(page.locator('[data-testid="map-zoom-controls"]')).not.toBeVisible();
      }
    });

    // STEP 2: Click the map control button to enter map control mode
    await page.locator('[data-testid="map-control-button"]').click();

    await screenshots.capture(page, 'map-control-active', {
      programmaticCheck: async () => {
        // Verify map control button shows active state
        const mapControlButton = page.locator('[data-testid="map-control-button"]');
        await expect(mapControlButton).toContainText('Exit Map Control');
        
        // Verify zoom controls are now visible
        await expect(page.locator('[data-testid="map-zoom-controls"]')).toBeVisible();
        await expect(page.locator('[data-testid="zoom-in-button"]')).toBeVisible();
        await expect(page.locator('[data-testid="zoom-out-button"]')).toBeVisible();
        await expect(page.locator('[data-testid="zoom-slider"]')).toBeVisible();
        await expect(page.locator('[data-testid="reset-view-button"]')).toBeVisible();
        
        // Verify initial zoom level is 100%
        await expect(page.locator('[data-testid="zoom-level"]')).toContainText('100%');
      }
    });

    // STEP 3: Zoom in using the zoom button
    await page.locator('[data-testid="zoom-in-button"]').click();
    await page.locator('[data-testid="zoom-in-button"]').click();

    await screenshots.capture(page, 'map-zoomed-in', {
      programmaticCheck: async () => {
        // Verify zoom level has increased to 120%
        await expect(page.locator('[data-testid="zoom-level"]')).toContainText('120%');
        
        // Verify zoom out button is now enabled
        await expect(page.locator('[data-testid="zoom-out-button"]')).toBeEnabled();
      }
    });

    // STEP 4: Reset the view
    await page.locator('[data-testid="reset-view-button"]').click();

    await screenshots.capture(page, 'map-view-reset', {
      programmaticCheck: async () => {
        // Verify zoom level is back to 100%
        await expect(page.locator('[data-testid="zoom-level"]')).toContainText('100%');
      }
    });

    // STEP 5: Exit map control mode
    await page.locator('[data-testid="map-control-button"]').click();

    await screenshots.capture(page, 'map-control-exited', {
      programmaticCheck: async () => {
        // Verify map control button shows inactive state
        const mapControlButton = page.locator('[data-testid="map-control-button"]');
        await expect(mapControlButton).toContainText('Control Map');
        
        // Verify zoom controls are hidden
        await expect(page.locator('[data-testid="map-zoom-controls"]')).not.toBeVisible();
      }
    });
  });

  test('Zoom out button works correctly', async ({ page }) => {
    // Navigate to game board
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Hide movement overlay
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/hideMovement' });
    });

    // Enter map control mode
    await page.locator('[data-testid="map-control-button"]').click();
    await expect(page.locator('[data-testid="map-zoom-controls"]')).toBeVisible();

    // First zoom in, then zoom out
    await page.locator('[data-testid="zoom-in-button"]').click();
    await expect(page.locator('[data-testid="zoom-level"]')).toContainText('110%');

    await page.locator('[data-testid="zoom-out-button"]').click();
    await expect(page.locator('[data-testid="zoom-level"]')).toContainText('100%');

    // Zoom out below 100%
    await page.locator('[data-testid="zoom-out-button"]').click();
    await expect(page.locator('[data-testid="zoom-level"]')).toContainText('90%');
  });

  test('Zoom slider works correctly', async ({ page }) => {
    // Navigate to game board
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Hide movement overlay
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/hideMovement' });
    });

    // Enter map control mode
    await page.locator('[data-testid="map-control-button"]').click();
    await expect(page.locator('[data-testid="map-zoom-controls"]')).toBeVisible();

    // Use slider to set zoom to 150%
    const slider = page.locator('[data-testid="zoom-slider"]');
    await slider.fill('1.5');
    
    await expect(page.locator('[data-testid="zoom-level"]')).toContainText('150%');
  });
});
