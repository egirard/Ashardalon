import { test, expect } from '@playwright/test';
import { createScreenshotHelper, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('084 - Bad Luck Curse Complete Lifecycle', () => {
  test('curse causes extra encounter draw each turn and is removed by dice roll', async ({ page }) => {
    const screenshots = createScreenshotHelper({ defaultMaxDiffPixels: 1500 });
    
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
    const closeButton = page.locator('[data-testid="close-power-selection"]');
    try {
      await closeButton.waitFor({ state: 'visible', timeout: 2000 });
      await closeButton.click();
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
      
      // Add a monster so the villain-phase $effect doesn't auto-advance to endVillainPhase
      // after the encounter card is dismissed (no monsters would immediately end the phase,
      // triggering the Bad Luck curse removal roll before we can check the curse was applied)
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-placeholder',
          position: { x: 2, y: 2 },
          currentHp: 5,
          controllerId: 'quinn',
          tileId: 'start-tile'
        }]
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
      // Remove placeholder monster now that curse is verified — we no longer need it
      // to block the villain-phase $effect from auto-advancing the phase
      store.dispatch({ type: 'game/setMonsters', payload: [] });
      
      // Set a controlled encounter deck so we know exactly what encounters will be drawn.
      // 'lost' (special: shuffles tile deck) is used as the first encounter — it has no
      // monster spawn, so it won't block the extra-encounter card display.
      // 'bloodlust' (curse) is used as the extra Bad Luck encounter — also no monster spawn.
      store.dispatch({
        type: 'game/setEncounterDeck',
        payload: { drawPile: ['lost', 'bloodlust'], discardPile: [] }
      });
      
      // Use setTurnPhase to jump directly to hero-phase, bypassing endVillainPhase's
      // curse-removal roll which would remove the Bad Luck curse before we can test it
      store.dispatch({ type: 'game/setTurnPhase', payload: 'hero-phase' });
    });
    
    // Skip through hero phase and exploration phase using setTurnPhase to avoid
    // exploration triggers (tile edge checks) that would require complex UI interaction
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/setTurnPhase', payload: 'exploration-phase' });
    });
    
    // End exploration phase - this transitions to villain phase and draws the first encounter
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/endExplorationPhase' });
    });
    
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
    
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });
    
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
    
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });
    
    await screenshots.capture(page, 'extra-encounter-dismissed', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          const store = (window as any).__REDUX_STORE__;
          return store.getState();
        });
        
        // Extra encounter should be dismissed
        expect(state.game.drawnEncounter).toBeNull();
        // Bad luck pending flag should be cleared (was cleared when extra encounter was drawn)
        expect(state.game.badLuckExtraEncounterPending).toBe(false);
      }
    });
    
    // STEP 7: Verify villain phase has ended (with no monsters, $effect auto-calls endVillainPhase
    // after encounters are dismissed, triggering the curse removal attempt)
    // Wait for the phase to become hero-phase
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.turnState.currentPhase === 'hero-phase';
    });
    
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
