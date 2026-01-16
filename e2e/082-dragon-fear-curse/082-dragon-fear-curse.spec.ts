import { test, expect } from '@playwright/test';
import { createScreenshotHelper, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('082 - Dragon Fear Curse Movement Damage', () => {
  test('curse applies damage when hero moves to a new tile', async ({ page }) => {
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
    
    // STEP 2: Trigger and accept Dragon Fear curse encounter
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      store.dispatch({
        type: 'game/setTurnPhase',
        payload: 'villain-phase'
      });
      
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'dragon-fear'
      });
    });
    
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'curse-card-displayed', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-card"]')).toBeVisible();
        const cardText = await page.locator('[data-testid="encounter-card"]').textContent();
        expect(cardText).toContain('Dragon Fear');
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
        const hasCurse = quinnHp?.statuses?.some((s: any) => s.type === 'curse-dragon-fear');
        expect(hasCurse).toBe(true);
      }
    });
    
    // STEP 4: Return to hero phase and record HP before movement
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/endVillainPhase' });
    });
    
    await page.waitForTimeout(500);
    
    const hpBeforeMove = await page.evaluate(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      const quinnHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
      return quinnHp.currentHp;
    });
    
    await screenshots.capture(page, 'ready-to-move-with-curse', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          const store = (window as any).__REDUX_STORE__;
          return store.getState();
        });
        
        expect(state.game.turnState.currentPhase).toBe('hero-phase');
        const quinnHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
        const hasCurse = quinnHp?.statuses?.some((s: any) => s.type === 'curse-dragon-fear');
        expect(hasCurse).toBe(true);
      }
    });
    
    // STEP 5: Get hero's current position and verify they're in north sub-tile
    const heroPosition = await page.evaluate(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      const quinnToken = state.game.heroTokens.find((t: any) => t.heroId === 'quinn');
      console.log('Hero initial position:', quinnToken.position);
      return quinnToken.position;
    });
    
    // Verify hero is in north sub-tile (y < 4)
    console.log('Hero position:', heroPosition);
    
    const hpBeforeSameTileMove = await page.evaluate(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      const quinnHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
      return quinnHp.currentHp;
    });
    
    // Initiate movement to show valid squares
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/initiateMove' });
    });
    
    await page.waitForTimeout(500);
    
    await screenshots.capture(page, 'movement-overlay-shown', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          const store = (window as any).__REDUX_STORE__;
          return store.getState();
        });
        
        expect(state.game.showingMovement).toBe(true);
        expect(state.game.validMoveSquares.length).toBeGreaterThan(0);
        
        // Log valid move squares for debugging
        console.log('Valid move squares:', state.game.validMoveSquares.slice(0, 10));
      }
    });
    
    // STEP 6: Move within same sub-tile - should NOT trigger damage
    // Calculate a move in the same sub-tile
    const sameTilePosition = heroPosition.y < 4 
      ? { x: heroPosition.x, y: Math.min(heroPosition.y + 1, 3) } // Stay in north (y < 4)
      : { x: heroPosition.x, y: Math.min(heroPosition.y + 1, 7) }; // Stay in south (y >= 4)
    
    await page.evaluate((pos) => {
      const store = (window as any).__REDUX_STORE__;
      console.log('Moving to same tile position:', pos);
      
      // Move within same sub-tile
      store.dispatch({
        type: 'game/moveHero',
        payload: {
          heroId: 'quinn',
          position: pos,
          speed: 5
        }
      });
    }, sameTilePosition);
    
    await page.waitForTimeout(500);
    
    await screenshots.capture(page, 'moved-within-same-tile-no-damage', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          const store = (window as any).__REDUX_STORE__;
          return store.getState();
        });
        
        // Verify hero did NOT take Dragon Fear damage
        const quinnHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
        expect(quinnHp.currentHp).toBe(hpBeforeSameTileMove);
        
        // Verify no message was shown
        expect(state.game.encounterEffectMessage).toBeNull();
      }
    });
    
    // STEP 7: Now move to different sub-tile (crossing sub-tile boundary) - should trigger Dragon Fear damage
    const hpBeforeCrossTileMove = await page.evaluate(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      const quinnHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
      return quinnHp.currentHp;
    });
    
    // Calculate a move to different sub-tile
    const differentTilePosition = heroPosition.y < 4
      ? { x: 2, y: 5 } // Move from north (y < 4) to south (y >= 4)
      : { x: 2, y: 2 }; // Move from south to north
    
    await page.evaluate((pos) => {
      const store = (window as any).__REDUX_STORE__;
      console.log('Moving to different tile position:', pos);
      
      // Move to different sub-tile
      store.dispatch({
        type: 'game/moveHero',
        payload: {
          heroId: 'quinn',
          position: pos,
          speed: 5
        }
      });
    }, differentTilePosition);
    
    await page.waitForTimeout(500);
    
    await screenshots.capture(page, 'moved-to-different-subtile-damage-applied', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          const store = (window as any).__REDUX_STORE__;
          return store.getState();
        });
        
        // Verify hero took Dragon Fear damage (1 damage)
        const quinnHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
        const actualHp = quinnHp.currentHp;
        const expectedHp = hpBeforeCrossTileMove - 1;
        
        // Debug info
        console.log(`HP before cross-tile move: ${hpBeforeCrossTileMove}, after: ${actualHp}, expected: ${expectedHp}`);
        
        expect(actualHp).toBe(expectedHp);
        
        // Verify damage message was shown
        expect(state.game.encounterEffectMessage).toContain('quinn');
        expect(state.game.encounterEffectMessage).toContain('1 damage');
        expect(state.game.encounterEffectMessage).toContain('Dragon Fear');
      }
    });
    
    // STEP 8: Clear message
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Clear the message
      store.dispatch({
        type: 'game/dismissEncounterEffectMessage'
      });
    });
    
    await page.waitForTimeout(300);
    
    await screenshots.capture(page, 'curse-damage-applied-message-cleared', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          const store = (window as any).__REDUX_STORE__;
          return store.getState();
        });
        
        // Verify curse is still active
        const quinnHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
        const hasCurse = quinnHp?.statuses?.some((s: any) => s.type === 'curse-dragon-fear');
        expect(hasCurse).toBe(true);
        
        // Verify message was cleared
        expect(state.game.encounterEffectMessage).toBeNull();
        
        // Note: The curse description indicates "Roll 10+ to remove" 
        // This would be implemented when exploration phase curse removal is added
      }
    });
  });
});
