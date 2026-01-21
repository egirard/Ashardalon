import { test, expect } from '@playwright/test';
import { createScreenshotHelper, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('093 - Thief in the Dark Encounter Card', () => {
  test('thief steals treasure card, then treasure token, then gets nothing', async ({ page }) => {
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
    
    // STEP 2: Setup test state - give Quinn treasure cards and a treasure token
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Give Quinn 2 treasure cards (Potion of Healing and Lucky Charm)
      store.dispatch({
        type: 'game/setHeroInventories',
        payload: {
          quinn: {
            heroId: 'quinn',
            items: [
              { cardId: 150, isFlipped: false }, // Potion of Healing
              { cardId: 147, isFlipped: false }  // Lucky Charm
            ]
          }
        }
      });
    });
    
    // Add a treasure token by dispatching Hidden Treasure encounter and placing it
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Trigger Hidden Treasure encounter
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'hidden-treasure'
      });
      
      // Dismiss encounter to set up treasure placement
      store.dispatch({ type: 'game/dismissEncounterCard' });
      
      // Place treasure token at position (5, 4) - away from Quinn
      store.dispatch({
        type: 'game/placeTreasureToken',
        payload: { position: { x: 5, y: 4 } }
      });
      
      // Move Quinn to the treasure token position to set up the test
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 5, y: 4 } }
      });
    });
    
    await screenshots.capture(page, 'game-started-with-treasures', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify Quinn has 2 treasure cards
        expect(storeState.game.heroInventories.quinn.items).toHaveLength(2);
        // Verify there's 1 treasure token
        expect(storeState.game.treasureTokens).toHaveLength(1);
      }
    });
    
    // STEP 3: Draw "Thief in the Dark" encounter card (first time)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'thief-in-dark'
      });
    });
    
    // Wait for encounter card to appear
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'thief-in-dark-first-draw', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-card"]')).toBeVisible();
        await expect(page.locator('[data-testid="encounter-card"]')).toContainText('Thief in the Dark');
      }
    });
    
    // STEP 4: Dismiss encounter - should show selection modal (3 treasures available)
    await page.locator('[data-testid="dismiss-encounter-card"]').click();
    
    // Wait for thief discard modal to appear
    await page.locator('[data-testid="thief-discard-modal"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'thief-discard-selection-modal', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="thief-discard-modal"]')).toBeVisible();
        await expect(page.locator('[data-testid="thief-discard-title"]')).toContainText('Thief in the Dark');
        // Verify 2 treasure cards + 1 treasure token = 3 options
        await expect(page.locator('[data-testid^="treasure-card-option"]')).toHaveCount(2);
        await expect(page.locator('[data-testid^="treasure-token-option"]')).toHaveCount(1);
      }
    });
    
    // STEP 5: Select to discard first treasure card (Potion of Healing)
    await page.locator('[data-testid="select-treasure-card-0"]').click();
    
    // Wait for encounter effect message
    await page.locator('[data-testid="encounter-effect-notification"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'treasure-card-lost', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify Quinn now has only 1 treasure card (Lucky Charm)
        expect(storeState.game.heroInventories.quinn.items).toHaveLength(1);
        expect(storeState.game.heroInventories.quinn.items[0].cardId).toBe(147); // Lucky Charm
        
        // Verify treasure token is still there
        expect(storeState.game.treasureTokens).toHaveLength(1);
        
        // Verify message shows lost treasure
        await expect(page.locator('[data-testid="encounter-effect-notification"]')).toContainText('lost Potion of Healing');
      }
    });
    
    // Dismiss the message
    await page.locator('[data-testid="dismiss-effect-notification"]').click();
    
    // STEP 6: Draw "Thief in the Dark" again (second time)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'thief-in-dark'
      });
    });
    
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'thief-in-dark-second-draw', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-card"]')).toBeVisible();
      }
    });
    
    // STEP 7: Dismiss encounter - should show selection modal (2 treasures available)
    await page.locator('[data-testid="dismiss-encounter-card"]').click();
    
    // Wait for thief discard modal to appear
    await page.locator('[data-testid="thief-discard-modal"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'thief-discard-selection-modal-second', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="thief-discard-modal"]')).toBeVisible();
        // Verify 1 treasure card + 1 treasure token = 2 options
        await expect(page.locator('[data-testid^="treasure-card-option"]')).toHaveCount(1);
        await expect(page.locator('[data-testid^="treasure-token-option"]')).toHaveCount(1);
      }
    });
    
    // STEP 8: Select to discard treasure token
    await page.locator('[data-testid="select-treasure-token-0"]').click();
    await page.locator('[data-testid="encounter-effect-notification"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'treasure-token-lost', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify Quinn still has 1 treasure card (Lucky Charm)
        expect(storeState.game.heroInventories.quinn.items).toHaveLength(1);
        expect(storeState.game.heroInventories.quinn.items[0].cardId).toBe(147); // Lucky Charm
        
        // Verify treasure token is now gone
        expect(storeState.game.treasureTokens).toHaveLength(0);
        
        // Verify message shows lost token
        await expect(page.locator('[data-testid="encounter-effect-notification"]')).toContainText('lost a treasure token');
      }
    });
    
    await page.locator('[data-testid="dismiss-effect-notification"]').click();
    
    // STEP 9: Draw "Thief in the Dark" again (third time)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'thief-in-dark'
      });
    });
    
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'thief-in-dark-third-draw', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-card"]')).toBeVisible();
      }
    });
    
    // STEP 10: Dismiss encounter - should auto-discard last treasure card (only 1 treasure)
    await page.locator('[data-testid="dismiss-encounter-card"]').click();
    await page.locator('[data-testid="encounter-effect-notification"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'last-treasure-card-lost', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify Quinn has no treasure cards left
        expect(storeState.game.heroInventories.quinn.items).toHaveLength(0);
        
        // Verify no treasure tokens
        expect(storeState.game.treasureTokens).toHaveLength(0);
        
        // Verify message shows lost treasure
        await expect(page.locator('[data-testid="encounter-effect-notification"]')).toContainText('lost Lucky Charm');
      }
    });
    
    await page.locator('[data-testid="dismiss-effect-notification"]').click();
    
    // STEP 11: Draw "Thief in the Dark" again (fourth time)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'thief-in-dark'
      });
    });
    
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'thief-in-dark-fourth-draw', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-card"]')).toBeVisible();
      }
    });
    
    // STEP 12: Dismiss encounter - should get "thief gets nothing" message
    await page.locator('[data-testid="dismiss-encounter-card"]').click();
    await page.locator('[data-testid="encounter-effect-notification"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'thief-gets-nothing', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify Quinn still has no treasure cards
        expect(storeState.game.heroInventories.quinn.items).toHaveLength(0);
        
        // Verify no treasure tokens
        expect(storeState.game.treasureTokens).toHaveLength(0);
        
        // Verify message shows "thief gets nothing"
        await expect(page.locator('[data-testid="encounter-effect-notification"]')).toContainText('thief gets nothing');
      }
    });
    
    await page.locator('[data-testid="dismiss-effect-notification"]').click();
    
    await screenshots.capture(page, 'final-state', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Final verification - no treasures left
        expect(storeState.game.heroInventories.quinn.items).toHaveLength(0);
        expect(storeState.game.treasureTokens).toHaveLength(0);
      }
    });
  });
});
