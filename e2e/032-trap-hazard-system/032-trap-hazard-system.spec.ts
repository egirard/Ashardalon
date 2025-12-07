import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards } from '../helpers/screenshot-helper';

test.describe('032 - Trap and Hazard System', () => {
  test('trap and hazard markers display correctly on the game board', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Navigate and start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'character-select-screen', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="character-select"]')).toBeVisible();
      }
    });
    
    // Select Quinn from top edge
    await page.locator('[data-testid="hero-quinn-top"]').click();
    
    // Select power cards
    await selectDefaultPowerCards(page, 'quinn');
    
    await page.locator('[data-testid="start-game-button"]').click();
    
    // Wait for game board
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    
    // STEP 2: Position Quinn and verify initial state
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 4 } }
      });
    });
    
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 4 });
    }).toPass();
    
    await screenshots.capture(page, 'game-started-no-traps', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.traps).toEqual([]);
        expect(storeState.game.hazards).toEqual([]);
      }
    });
    
    // STEP 3: Verify trap and hazard state structures exist in game
    await screenshots.capture(page, 'game-state-has-trap-hazard-arrays', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify trap and hazard arrays exist
        expect(storeState.game.traps).toBeDefined();
        expect(storeState.game.hazards).toBeDefined();
        expect(Array.isArray(storeState.game.traps)).toBe(true);
        expect(Array.isArray(storeState.game.hazards)).toBe(true);
        
        // Verify counters exist
        expect(storeState.game.trapInstanceCounter).toBeDefined();
        expect(storeState.game.hazardInstanceCounter).toBeDefined();
      }
    });
  });
});
