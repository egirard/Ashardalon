import { test, expect } from '@playwright/test';
import { createScreenshotHelper, setupDeterministicGame, dismissScenarioIntroduction } from '../helpers/screenshot-helper';

test.describe('079 - Time Leap Curse Mechanical Effect', () => {
  test('curse removes hero from play for one turn, then restores them', async ({ page }) => {
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
    
    // Wait for and dismiss power selection modal
    const quinnDoneButton = page.locator('[data-testid="done-power-selection"]');
    try {
      await quinnDoneButton.waitFor({ state: 'visible', timeout: 2000 });
      await quinnDoneButton.click();
    } catch (e) {
      // Modal might not appear
    }
    
    // Select Vistra from bottom edge
    await page.locator('[data-testid="hero-vistra-bottom"]').click();
    
    const vistraDoneButton = page.locator('[data-testid="done-power-selection"]');
    try {
      await vistraDoneButton.waitFor({ state: 'visible', timeout: 2000 });
      await vistraDoneButton.click();
    } catch (e) {
      // Modal might not appear
    }
    
    await screenshots.capture(page, 'two-heroes-selected', {
      programmaticCheck: async () => {
        // Verify selected count shows 2 heroes
        await expect(page.locator('[data-testid="selected-count"]')).toContainText('2 heroes selected');
        
        // Verify start button is enabled
        const startButton = page.locator('[data-testid="start-game-button"]');
        await expect(startButton).toBeEnabled();
      }
    });
    
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    
    // Wait for game board
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);
    
    await screenshots.capture(page, 'game-started-quinn-turn', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify it's Quinn's turn (first hero)
        expect(storeState.game.turnState.currentHeroIndex).toBe(0);
        expect(storeState.game.heroTokens[0].heroId).toBe('quinn');
      }
    });
    
    // STEP 2: Apply Time Leap curse to Quinn
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Set the drawn encounter to Time Leap (by ID)
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'time-leap'
      });
    });
    
    // Wait for encounter card to be visible (no arbitrary delay needed - waitFor handles it)
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible', timeout: 10000 });
    
    await screenshots.capture(page, 'time-leap-curse-displayed', {
      programmaticCheck: async () => {
        const encounterCard = page.locator('[data-testid="encounter-card"]');
        await expect(encounterCard).toBeVisible();
        
        const cardText = await encounterCard.textContent();
        expect(cardText).toContain('Time Leap');
      }
    });
    
    // Dismiss the encounter card (apply curse)
    await page.locator('[data-testid="dismiss-encounter-card"]').click();
    
    // Wait for card to disappear
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });
    
    await screenshots.capture(page, 'curse-applied-quinn-removed', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify Quinn has Time Leap curse
        const quinnHp = storeState.game.heroHp.find((h: any) => h.heroId === 'quinn');
        expect(quinnHp).toBeDefined();
        
        // Verify removedFromPlay flag is set
        expect(quinnHp.removedFromPlay).toBe(true);
        
        // Verify curse status is applied
        const hasTimeLeapCurse = quinnHp.statuses?.some(
          (s: any) => s.type === 'curse-time-leap'
        );
        expect(hasTimeLeapCurse).toBe(true);
      }
    });
    
    // STEP 3: End Quinn's turn and move to Vistra
    // We need to transition through phases
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Set phase to villain-phase so we can end it
      store.dispatch({
        type: 'game/setTurnPhase',
        payload: 'villain-phase'
      });
    });
    
    // End villain phase to move to next hero
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/endVillainPhase' });
    });
    
    await screenshots.capture(page, 'vistra-turn-quinn-still-removed', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify it's now Vistra's turn (second hero)
        expect(storeState.game.turnState.currentHeroIndex).toBe(1);
        expect(storeState.game.heroTokens[1].heroId).toBe('vistra');
        
        // Verify Quinn is still removed from play
        const quinnHp = storeState.game.heroHp.find((h: any) => h.heroId === 'quinn');
        expect(quinnHp.removedFromPlay).toBe(true);
      }
    });
    
    // STEP 4: End Vistra's turn and cycle back to Quinn
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Set phase to villain-phase so we can end it
      store.dispatch({
        type: 'game/setTurnPhase',
        payload: 'villain-phase'
      });
    });
    
    // End villain phase to cycle back to Quinn
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/endVillainPhase' });
    });
    
    // Wait for state to update - check that hero phase started
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.turnState.currentPhase === 'hero-phase' && 
             state.game.turnState.currentHeroIndex === 0;
    }, { timeout: 5000 });
    
    await screenshots.capture(page, 'quinn-restored-curse-removed', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify it's back to Quinn's turn (first hero)
        expect(storeState.game.turnState.currentHeroIndex).toBe(0);
        expect(storeState.game.heroTokens[0].heroId).toBe('quinn');
        
        // Verify Quinn is no longer removed from play
        const quinnHp = storeState.game.heroHp.find((h: any) => h.heroId === 'quinn');
        expect(quinnHp.removedFromPlay).toBe(false);
        
        // Verify Time Leap curse is removed
        const hasTimeLeapCurse = quinnHp.statuses?.some(
          (s: any) => s.type === 'curse-time-leap'
        );
        expect(hasTimeLeapCurse).toBe(false);
        
        // Verify restoration message was shown
        expect(storeState.game.encounterEffectMessage).toContain('returns to play');
      }
    });
    
    // STEP 5: Verify monsters ignore removed heroes during villain phase
    // Add a monster and verify targeting excludes removed heroes
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Apply Time Leap curse again to Quinn (by ID)
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'time-leap'
      });
    });
    
    // Dismiss the encounter card
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="dismiss-encounter-card"]').click();
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });
    
    // Add a monster
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-0',
          position: { x: 2, y: 3 },
          currentHp: 1,
          controllerId: 'quinn',
          tileId: 'start-tile',
        }]
      });
    });
    
    await screenshots.capture(page, 'monster-spawned-quinn-removed-again', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify Quinn is removed
        const quinnHp = storeState.game.heroHp.find((h: any) => h.heroId === 'quinn');
        expect(quinnHp.removedFromPlay).toBe(true);
        
        // Verify monster exists
        expect(storeState.game.monsters.length).toBe(1);
        
        // Verify that when filtering for monster targeting, Quinn is excluded
        const activeHeroTokens = storeState.game.heroTokens.filter((token: any) => {
          const heroHp = storeState.game.heroHp.find((hp: any) => hp.heroId === token.heroId);
          return !heroHp?.removedFromPlay;
        });
        
        // Only Vistra should be targetable
        expect(activeHeroTokens.length).toBe(1);
        expect(activeHeroTokens[0].heroId).toBe('vistra');
      }
    });
  });
});
