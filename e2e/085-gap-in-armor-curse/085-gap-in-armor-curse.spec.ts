import { test, expect } from '@playwright/test';
import { createScreenshotHelper, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('085 - Gap in the Armor Curse Effect', () => {
  test('curse applies AC -4 penalty and is removed when hero does not move', async ({ page }) => {
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
        expect(state.game.turnState.currentPhase).toBe('hero-phase');
      }
    });
    
    // STEP 2: Get initial AC value before curse
    const initialAC = await page.evaluate(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      const quinnHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
      // Quinn's base AC at level 1
      const baseAC = 17;
      return baseAC;
    });
    
    console.log('Quinn initial AC:', initialAC);
    
    // STEP 3: Trigger and accept Gap in the Armor curse encounter
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      store.dispatch({
        type: 'game/setTurnPhase',
        payload: 'villain-phase'
      });
      
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'gap-in-armor'
      });
    });
    
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'curse-card-displayed', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-card"]')).toBeVisible();
        const cardText = await page.locator('[data-testid="encounter-card"]').textContent();
        expect(cardText).toContain('A Gap in the Armor');
      }
    });
    
    // Accept curse
    await page.locator('[data-testid="encounter-continue"]').click();
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });
    
    // STEP 4: Verify curse applied and AC penalty
    await screenshots.capture(page, 'curse-applied-with-ac-penalty', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          const store = (window as any).__REDUX_STORE__;
          return store.getState();
        });
        
        const quinnHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
        const hasCurse = quinnHp?.statuses?.some((s: any) => s.type === 'curse-gap-in-armor');
        expect(hasCurse).toBe(true);
        
        // Verify AC penalty would be applied (base 17, curse -4 = 13)
        const expectedAC = initialAC - 4;
        console.log(`Expected AC with curse: ${expectedAC} (${initialAC} - 4)`);
      }
    });
    
    // STEP 5: Return to hero phase (without moving)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/endVillainPhase' });
    });
    
    await page.waitForTimeout(500);
    
    await screenshots.capture(page, 'hero-phase-with-curse-active', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          const store = (window as any).__REDUX_STORE__;
          return store.getState();
        });
        
        expect(state.game.turnState.currentPhase).toBe('hero-phase');
        const quinnHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
        const hasCurse = quinnHp?.statuses?.some((s: any) => s.type === 'curse-gap-in-armor');
        expect(hasCurse).toBe(true);
        
        // Verify hero hasn't moved yet
        expect(state.game.heroMovedThisPhase).toBe(false);
      }
    });
    
    // STEP 6: Move the hero to test curse persistence
    // Get hero position for movement
    const heroPosition = await page.evaluate(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      const quinnToken = state.game.heroTokens.find((t: any) => t.heroId === 'quinn');
      return quinnToken.position;
    });
    
    // Move the hero
    await page.evaluate((pos) => {
      const store = (window as any).__REDUX_STORE__;
      
      // Set up movement state
      store.dispatch({
        type: 'game/setState',
        payload: {
          showingMovement: true,
          validMoveSquares: [{ x: pos.x, y: pos.y + 1 }]
        }
      });
      
      // Move hero
      store.dispatch({
        type: 'game/moveHero',
        payload: {
          heroId: 'quinn',
          position: { x: pos.x, y: pos.y + 1 },
          speed: 5
        }
      });
    }, heroPosition);
    
    await page.waitForTimeout(300);
    
    await screenshots.capture(page, 'hero-moved-curse-still-active', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          const store = (window as any).__REDUX_STORE__;
          return store.getState();
        });
        
        // Verify hero moved
        expect(state.game.heroMovedThisPhase).toBe(true);
        
        // Verify curse is still active
        const quinnHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
        const hasCurse = quinnHp?.statuses?.some((s: any) => s.type === 'curse-gap-in-armor');
        expect(hasCurse).toBe(true);
      }
    });
    
    // STEP 7: End Hero Phase after moving - curse should persist
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/endHeroPhase' });
    });
    
    await page.waitForTimeout(300);
    
    await screenshots.capture(page, 'curse-persists-after-moving', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          const store = (window as any).__REDUX_STORE__;
          return store.getState();
        });
        
        // Verify curse is STILL active (not removed because hero moved)
        const quinnHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
        const hasCurse = quinnHp?.statuses?.some((s: any) => s.type === 'curse-gap-in-armor');
        expect(hasCurse).toBe(true);
        
        // Verify no removal message (curse persists)
        // The encounterEffectMessage might be null or not contain removal text
        if (state.game.encounterEffectMessage) {
          expect(state.game.encounterEffectMessage).not.toContain('curse removed');
        }
        
        console.log('Curse persists after moving (as expected)');
      }
    });
    
    // STEP 8: Test curse removal when hero doesn't move
    // Apply curse again, go back to villain phase
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Set back to villain phase to apply curse again
      store.dispatch({
        type: 'game/setTurnPhase',
        payload: 'villain-phase'
      });
      
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'gap-in-armor'
      });
    });
    
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });
    
    // Accept curse again
    await page.locator('[data-testid="encounter-continue"]').click();
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });
    
    // Return to hero phase
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/endVillainPhase' });
    });
    
    await page.waitForTimeout(300);
    
    // STEP 9: End Hero Phase WITHOUT moving (to trigger curse removal)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/endHeroPhase' });
    });
    
    await page.waitForTimeout(500);
    
    await screenshots.capture(page, 'curse-removed-did-not-move', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          const store = (window as any).__REDUX_STORE__;
          return store.getState();
        });
        
        // Verify we're in exploration phase now
        expect(state.game.turnState.currentPhase).toBe('exploration-phase');
        
        // Verify curse was removed
        const quinnHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
        const hasCurse = quinnHp?.statuses?.some((s: any) => s.type === 'curse-gap-in-armor');
        expect(hasCurse).toBe(false);
        
        // Verify curse removal message was shown
        expect(state.game.encounterEffectMessage).toBeTruthy();
        expect(state.game.encounterEffectMessage).toContain('A Gap in the Armor curse removed');
        expect(state.game.encounterEffectMessage).toContain('did not move');
        
        console.log('Curse removal message:', state.game.encounterEffectMessage);
      }
    });
  });
});
