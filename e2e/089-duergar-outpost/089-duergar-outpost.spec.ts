import { test, expect } from '@playwright/test';
import { createScreenshotHelper, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('089 - Duergar Outpost Encounter Card', () => {
  test('duergar outpost filters monster deck for devils and places them on top', async ({ page }) => {
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
    
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    
    // Wait for game board
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);
    
    // STEP 2: Verify initial game state
    await screenshots.capture(page, 'game-started', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.turnState.currentPhase).toBe('hero-phase');
      }
    });
    
    // STEP 3: Get the initial monster deck state before the encounter
    const initialDeckState = await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      return {
        drawPileLength: state.game.monsterDeck.drawPile.length,
        discardPileLength: state.game.monsterDeck.discardPile.length,
        drawPile: [...state.game.monsterDeck.drawPile],
      };
    });
    
    // STEP 4: Draw Duergar Outpost encounter card
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Force draw the Duergar Outpost encounter using the encounter ID
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'duergar-outpost'
      });
    });
    
    // Wait for encounter card to appear
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'duergar-outpost-encounter-drawn', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        expect(storeState.game.drawnEncounter).not.toBeNull();
        expect(storeState.game.drawnEncounter.id).toBe('duergar-outpost');
        
        // Verify encounter card is visible
        await expect(page.locator('[data-testid="encounter-card"]')).toBeVisible();
        await expect(page.locator('[data-testid="encounter-card"]')).toContainText('Duergar Outpost');
        
        // Verify the description mentions filtering for Devils
        await expect(page.locator('[data-testid="encounter-card"]')).toContainText('Devil');
      }
    });
    
    // STEP 5: Dismiss the encounter card - this should filter the monster deck
    await page.locator('[data-testid="dismiss-encounter-card"]').click();
    
    // Wait for encounter card to be dismissed
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });
    
    await screenshots.capture(page, 'duergar-outpost-effect-applied', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify encounter card is dismissed
        expect(storeState.game.drawnEncounter).toBeNull();
        
        // Verify the effect message was shown
        expect(storeState.game.encounterEffectMessage).toBeTruthy();
        expect(storeState.game.encounterEffectMessage).toContain('Drew 5 monster cards');
        
        // Verify monster deck was manipulated
        // Since there are no devils in the current deck (only kobold, snake, cultist),
        // all 5 drawn cards should be discarded
        const currentDeckState = {
          drawPileLength: storeState.game.monsterDeck.drawPile.length,
          discardPileLength: storeState.game.monsterDeck.discardPile.length,
        };
        
        // 5 cards were drawn and discarded (no devils found)
        expect(currentDeckState.drawPileLength).toBe(initialDeckState.drawPileLength - 5);
        expect(currentDeckState.discardPileLength).toBe(initialDeckState.discardPileLength + 5);
        
        // Verify the message indicates no devils were found
        expect(storeState.game.encounterEffectMessage).toContain('0 Devils placed on top');
        expect(storeState.game.encounterEffectMessage).toContain('5 discarded');
      }
    });
    
    // STEP 6: Verify the effect persists in game state
    await screenshots.capture(page, 'effect-complete', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify the effect message is still available in state
        expect(storeState.game.encounterEffectMessage).toBeTruthy();
        expect(storeState.game.encounterEffectMessage).toContain('Drew 5 monster cards');
        
        // Verify game continues normally after the effect
        expect(storeState.game.drawnEncounter).toBeNull();
        expect(storeState.game.turnState.currentPhase).toBe('hero-phase');
      }
    });
  });
});
