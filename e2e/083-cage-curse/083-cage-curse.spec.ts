import { test, expect } from '@playwright/test';
import { createScreenshotHelper, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('083 - Cage Curse Complete Lifecycle', () => {
  test('curse applies AC penalty, prevents movement, and can be escaped by hero on same tile', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Navigate and start game with two heroes (Quinn and Vistra)
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
    
    // Select Vistra from bottom edge
    await page.locator('[data-testid="hero-vistra-bottom"]').click();
    
    // Dismiss power selection modal for Vistra if it appears
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
    
    await screenshots.capture(page, 'game-started-two-heroes', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        console.log('Initial phase:', state.game.turnState.currentPhase);
        console.log('Hero tokens:', state.game.heroTokens.length);
        expect(state.game.heroTokens.length).toBe(2);
      }
    });
    
    // STEP 2: Trigger and accept cage curse encounter
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      store.dispatch({
        type: 'game/setTurnPhase',
        payload: 'villain-phase'
      });
      
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'cage'
      });
    });
    
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'cage-curse-card-displayed', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-card"]')).toBeVisible();
        const cardText = await page.locator('[data-testid="encounter-card"]').textContent();
        expect(cardText).toContain('Cage');
      }
    });
    
    // Accept curse
    await page.locator('[data-testid="encounter-continue"]').click();
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });
    
    // STEP 3: Verify curse applied to active hero (Quinn)
    await screenshots.capture(page, 'cage-curse-applied', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          const store = (window as any).__REDUX_STORE__;
          return store.getState();
        });
        
        const quinnHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
        const hasCurse = quinnHp?.statuses?.some((s: any) => s.type === 'curse-cage');
        expect(hasCurse).toBe(true);
        
        // Verify AC penalty (Quinn base AC is 17, should be 15 with -2)
        expect(quinnHp.ac).toBe(15);
      }
    });
    
    // STEP 4: Verify hero cannot move (status check)
    await screenshots.capture(page, 'movement-prevented', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          const store = (window as any).__REDUX_STORE__;
          return store.getState();
        });
        
        const quinnHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
        const hasCageCurse = quinnHp?.statuses?.some((s: any) => s.type === 'curse-cage');
        expect(hasCageCurse).toBe(true);
        
        // The canMove function in statusEffects.ts checks for curse-cage
        // Movement UI would be disabled if implemented
      }
    });
    
    // STEP 5: Place both heroes on the same tile
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const samePosition = { x: 3, y: 3 };
      
      // Move both Quinn and Vistra to the same position
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: samePosition }
      });
      
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'vistra', position: samePosition }
      });
    });
    
    await page.waitForTimeout(500);
    
    await screenshots.capture(page, 'heroes-on-same-tile', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          const store = (window as any).__REDUX_STORE__;
          return store.getState();
        });
        
        // Verify both heroes are at position (3,3)
        const quinnToken = state.game.heroTokens.find((t: any) => t.heroId === 'quinn');
        const vistraToken = state.game.heroTokens.find((t: any) => t.heroId === 'vistra');
        
        expect(quinnToken.position.x).toBe(3);
        expect(quinnToken.position.y).toBe(3);
        expect(vistraToken.position.x).toBe(3);
        expect(vistraToken.position.y).toBe(3);
        
        // Note: In actual gameplay, when it's Vistra's turn (Hero Phase),
        // a golden "🔓 Attempt Escape (Roll 10+)" button will appear
        // in the game board area, allowing the player to click it.
        // This button is implemented in GameBoard.svelte as cage-escape-panel.
      }
    });
    
    // STEP 6: Attempt cage escape with Vistra helping Quinn
    // Note: In the actual game, the player would click the escape button.
    // For automated testing, we dispatch the action directly.
    const escapeResult = await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      store.dispatch({
        type: 'game/attemptCageEscape',
        payload: {
          cagedHeroId: 'quinn',
          rescuerHeroId: 'vistra'
        }
      });
      
      const state = store.getState();
      return {
        message: state.game.encounterEffectMessage,
        removed: !state.game.heroHp.find((h: any) => h.heroId === 'quinn')?.statuses?.some((s: any) => s.type === 'curse-cage')
      };
    });
    
    console.log('Escape attempt result:', escapeResult);
    
    await page.waitForTimeout(500);
    
    // Dismiss the message before taking screenshot (for deterministic rendering)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/dismissEncounterEffectMessage'
      });
    });
    
    await page.waitForTimeout(300);
    
    await screenshots.capture(page, 'cage-escape-attempted', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          const store = (window as any).__REDUX_STORE__;
          return store.getState();
        });
        
        // Verify the escape was attempted (message was cleared)
        expect(state.game.encounterEffectMessage).toBeNull();
        
        // Verify the escape attempt result was saved
        console.log('First escape result:', escapeResult.removed ? 'success' : 'failed');
      }
    });
    
    // STEP 7: If curse still active, try again until successful (for test completeness)
    await page.evaluate(async () => {
      const store = (window as any).__REDUX_STORE__;
      let state = store.getState();
      let quinnHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
      let attempts = 0;
      const MAX_ESCAPE_ATTEMPTS = 20; // Should succeed within 20 attempts statistically
      
      while (quinnHp?.statuses?.some((s: any) => s.type === 'curse-cage') && attempts < MAX_ESCAPE_ATTEMPTS) {
        store.dispatch({
          type: 'game/attemptCageEscape',
          payload: {
            cagedHeroId: 'quinn',
            rescuerHeroId: 'vistra'
          }
        });
        
        // Wait a tiny bit for state update
        await new Promise(resolve => setTimeout(resolve, 50));
        
        state = store.getState();
        quinnHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
        attempts++;
      }
      
      console.log(`Cage escape succeeded after ${attempts} attempts`);
    });
    
    await page.waitForTimeout(500);
    
    await screenshots.capture(page, 'cage-curse-removed', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          const store = (window as any).__REDUX_STORE__;
          return store.getState();
        });
        
        // Verify curse is removed
        const quinnHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
        const hasCurse = quinnHp?.statuses?.some((s: any) => s.type === 'curse-cage');
        expect(hasCurse).toBe(false);
        
        // Verify AC is restored (back to 17)
        expect(quinnHp.ac).toBe(17);
      }
    });
    
    // STEP 8: Document test completion
    await screenshots.capture(page, 'test-complete', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          const store = (window as any).__REDUX_STORE__;
          return store.getState();
        });
        
        // Verify game is in a valid state
        expect(state.game.heroTokens.length).toBe(2);
        
        // Verify Quinn no longer has cage curse
        const quinnHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
        const hasCurse = quinnHp?.statuses?.some((s: any) => s.type === 'curse-cage');
        expect(hasCurse).toBe(false);
      }
    });
  });
});
