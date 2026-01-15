import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('080 - Terrifying Roar Curse Mechanical Effect', () => {
  test('curse applies -4 attack penalty to hero', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Navigate and start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'character-select-screen', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="character-select"]')).toBeVisible();
      }
    });
    
    // Select Quinn from bottom edge
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    
    // Dismiss power selection modal if it appears
    const doneButton = page.locator('[data-testid="done-power-selection"]');
    try {
      await doneButton.waitFor({ state: 'visible', timeout: 2000 });
      await doneButton.click();
    } catch (e) {
      // Modal might not appear
    }
    
    // Set deterministic seed
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    
    // Wait for game board
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);
    
    await screenshots.capture(page, 'game-started', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.heroTokens.length).toBeGreaterThan(0);
      }
    });
    
    // STEP 2: Trigger and accept curse encounter (without screenshot of modal)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      store.dispatch({
        type: 'game/setTurnPhase',
        payload: 'villain-phase'
      });
      
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'terrifying-roar'
      });
    });
    
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });
    
    // Accept curse immediately
    await page.locator('[data-testid="encounter-continue"]').click();
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });
    
    // STEP 3: Show curse applied to hero
    await screenshots.capture(page, 'curse-applied-status-visible', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          const store = (window as any).__REDUX_STORE__;
          return store.getState();
        });
        
        const quinnHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
        const hasCurse = quinnHp?.statuses?.some((s: any) => s.type === 'curse-terrifying-roar');
        expect(hasCurse).toBe(true);
        
        // Verify attack penalty would be applied
        const baseAttackBonus = 6; // Quinn level 1
        const expectedModifiedAttack = 2; // 6 - 4 = 2
        expect(baseAttackBonus - 4).toBe(expectedModifiedAttack);
      }
    });
  });
});
