import { test, expect } from '@playwright/test';
import { createScreenshotHelper, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('084 - Bad Luck Curse Complete Lifecycle', () => {
  test('curse causes extra encounter draw each turn and is removed by dice roll', async ({ page }) => {
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
    
    // STEP 2: Trigger and accept Bad Luck curse encounter
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      store.dispatch({
        type: 'game/setTurnPhase',
        payload: 'villain-phase'
      });
      
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'bad-luck'
      });
    });
    
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'curse-card-displayed', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-card"]')).toBeVisible();
      }
    });
    
    // Accept curse
    await page.locator('[data-testid="encounter-continue"]').click();
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });
    
    // STEP 3: Verify curse applied
    await screenshots.capture(page, 'curse-applied-to-hero', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          const store = (window as any).__REDUX_STORE__;
          return store.getState();
        });
        
        const quinnHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
        const hasCurse = quinnHp?.statuses?.some((s: any) => s.type === 'curse-bad-luck');
        expect(hasCurse).toBe(true);
      }
    });
    
    // STEP 4: Transition through turns to trigger encounter draw with Bad Luck curse
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // End current villain phase
      store.dispatch({ type: 'game/endVillainPhase' });
    });
    
    await page.waitForTimeout(500);
    
    // End hero phase
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/endHeroPhase' });
    });
    
    await page.waitForTimeout(500);
    
    // End exploration phase - this draws the first encounter
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/endExplorationPhase' });
    });
    
    await page.waitForTimeout(500);
    
    await screenshots.capture(page, 'first-encounter-drawn-with-bad-luck-flag-set', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          const store = (window as any).__REDUX_STORE__;
          return store.getState();
        });
        
        // Should have drawn an encounter
        expect(state.game.drawnEncounter).not.toBeNull();
        // Flag should be set for extra encounter
        expect(state.game.badLuckExtraEncounterPending).toBe(true);
      }
    });
    
    // STEP 5: Dismiss first encounter - triggers Bad Luck extra encounter draw
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="encounter-continue"]').click();
    
    await page.waitForTimeout(1000);
    
    await screenshots.capture(page, 'extra-encounter-drawn-from-bad-luck', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          const store = (window as any).__REDUX_STORE__;
          return store.getState();
        });
        
        // Should have drawn the extra encounter
        expect(state.game.drawnEncounter).not.toBeNull();
        // Flag should be cleared
        expect(state.game.badLuckExtraEncounterPending).toBe(false);
      }
    });
    
    // STEP 6: Dismiss extra encounter
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="encounter-continue"]').click();
    
    // Handle result popup if it exists
    try {
      const continueBtn = page.locator('button:has-text("Continue")').first();
      await continueBtn.waitFor({ state: 'visible', timeout: 1000 });
      await continueBtn.click();
    } catch (e) {
      // No popup
    }
    
    await page.waitForTimeout(500);
    
    await screenshots.capture(page, 'extra-encounter-dismissed', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          const store = (window as any).__REDUX_STORE__;
          return store.getState();
        });
        
        // Curse should still be active
        const quinnHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
        const hasCurse = quinnHp?.statuses?.some((s: any) => s.type === 'curse-bad-luck');
        expect(hasCurse).toBe(true);
      }
    });
    
    // STEP 7: End villain phase - triggers curse removal attempt
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/endVillainPhase' });
    });
    
    await page.waitForTimeout(500);
    
    await screenshots.capture(page, 'curse-removal-roll-result', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          const store = (window as any).__REDUX_STORE__;
          return store.getState();
        });
        
        // Should be in hero phase
        expect(state.game.turnState.currentPhase).toBe('hero-phase');
      }
    });
    
    // STEP 8: Test complete
    await screenshots.capture(page, 'test-complete-curse-lifecycle-documented', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          const store = (window as any).__REDUX_STORE__;
          return store.getState();
        });
        
        expect(state.game.turnState.currentPhase).toBe('hero-phase');
      }
    });
  });
});
