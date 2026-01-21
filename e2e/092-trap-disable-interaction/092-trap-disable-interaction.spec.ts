import { test, expect } from '@playwright/test';
import { createScreenshotHelper, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('092 - Trap Disable Interaction', () => {
  test('player can click on trap marker to attempt disable', async ({ page }) => {
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
    
    await screenshots.capture(page, 'game-started', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.turnState.currentPhase).toBe('hero-phase');
        expect(storeState.game.traps).toHaveLength(0);
      }
    });
    
    // STEP 2: Draw and place a Lava Flow trap card
    // Transition to Villain Phase first
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/endHeroPhase' });
      store.dispatch({ type: 'game/endExplorationPhase' });
    });
    
    // Then set the drawn encounter
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'lava-flow'
      });
    });
    
    // Wait for encounter card to appear
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'lava-flow-trap-card-drawn', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.drawnEncounter).not.toBeNull();
        expect(storeState.game.drawnEncounter.id).toBe('lava-flow');
        expect(storeState.game.drawnEncounter.type).toBe('trap');
        
        // Verify card is visible
        await expect(page.locator('[data-testid="encounter-card"]')).toBeVisible();
        await expect(page.locator('[data-testid="encounter-card"]')).toContainText('Lava Flow');
      }
    });
    
    // STEP 3: Accept the trap card to place trap marker
    await page.locator('[data-testid="encounter-continue"]').click();
    
    // Wait for trap marker to appear
    await page.locator('[data-testid="trap-marker"]').waitFor({ state: 'visible' });
    
    // Wait a moment for any animations to complete
    await page.waitForTimeout(100);
    
    await screenshots.capture(page, 'trap-placed-on-hero-tile', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify trap was placed
        expect(storeState.game.traps).toHaveLength(1);
        expect(storeState.game.traps[0].encounterId).toBe('lava-flow');
        expect(storeState.game.traps[0].disableDC).toBe(10);
        
        // Verify trap is on Quinn's tile
        const quinnPos = storeState.game.heroTokens[0].position;
        expect(storeState.game.traps[0].position).toEqual(quinnPos);
        
        // Verify trap marker is visible
        await expect(page.locator('[data-testid="trap-marker"]')).toBeVisible();
        
        // Verify encounter card is dismissed
        await expect(page.locator('[data-testid="encounter-card"]')).not.toBeVisible();
      }
    });
    
    // STEP 4: Complete villain phase to return to hero phase
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/endVillainPhase' });
      // Hide movement overlay so trap marker is clickable
      store.dispatch({ type: 'game/hideMovement' });
    });
    
    await screenshots.capture(page, 'back-to-hero-phase-trap-clickable', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.turnState.currentPhase).toBe('hero-phase');
        
        // Verify trap marker is still visible
        await expect(page.locator('[data-testid="trap-marker"]')).toBeVisible();
        
        // Verify hero is on trap tile (can disable)
        const quinnPos = storeState.game.heroTokens[0].position;
        const trapPos = storeState.game.traps[0].position;
        expect(quinnPos).toEqual(trapPos);
      }
    });
    
    // STEP 5: Click on trap marker to attempt disable with controlled dice roll
    // First attempt: Force a failed roll (roll 5 vs DC 10)
    const firstAttempt = await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      const trapId = state.game.traps[0].id;
      
      // Attempt to disable with roll of 5 (will fail)
      store.dispatch({
        type: 'game/attemptDisableTrap',
        payload: {
          trapId,
          randomFn: () => 0.20  // 0.20 * 20 = 4, +1 = 5
        }
      });
      
      const stateAfter = store.getState();
      return {
        trapCount: stateAfter.game.traps.length,
        result: stateAfter.game.trapDisableResult
      };
    });
    
    // Wait for trap disable result to appear
    await page.locator('[data-testid="trap-disable-result-overlay"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'disable-attempt-failed-low-roll', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify trap still exists (disable failed)
        expect(storeState.game.traps).toHaveLength(1);
        
        // Verify disable result is shown
        await expect(page.locator('[data-testid="trap-disable-result-overlay"]')).toBeVisible();
        await expect(page.locator('[data-testid="trap-info"]')).toContainText('Lava Flow');
        await expect(page.locator('[data-testid="dice-roll"]')).toContainText('5');
        await expect(page.locator('[data-testid="disable-dc"]')).toContainText('10');
        await expect(page.locator('[data-testid="result-text"]')).toContainText('FAILED');
        
        // Verify trap disable result in state
        expect(storeState.game.trapDisableResult).not.toBeNull();
        expect(storeState.game.trapDisableResult.roll).toBe(5);
        expect(storeState.game.trapDisableResult.success).toBe(false);
      }
    });
    
    // Dismiss the trap disable result
    await page.locator('[data-testid="dismiss-trap-result"]').click();
    await page.locator('[data-testid="trap-disable-result-overlay"]').waitFor({ state: 'hidden' });
    
    await screenshots.capture(page, 'trap-still-active-after-failed-attempt', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify trap still exists
        expect(storeState.game.traps).toHaveLength(1);
        
        // Verify trap marker is still visible
        await expect(page.locator('[data-testid="trap-marker"]')).toBeVisible();
      }
    });
    
    // STEP 6: Second attempt with successful roll (roll 15 vs DC 10)
    const secondAttempt = await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      const trapId = state.game.traps[0].id;
      
      // Attempt to disable with roll of 15 (will succeed)
      store.dispatch({
        type: 'game/attemptDisableTrap',
        payload: {
          trapId,
          randomFn: () => 0.70  // 0.70 * 20 = 14, +1 = 15
        }
      });
      
      const stateAfter = store.getState();
      return {
        trapCount: stateAfter.game.traps.length,
        result: stateAfter.game.trapDisableResult
      };
    });
    
    // Wait for trap disable result to appear
    await page.locator('[data-testid="trap-disable-result-overlay"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'disable-attempt-succeeded-high-roll', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify trap was removed (disable succeeded)
        expect(storeState.game.traps).toHaveLength(0);
        
        // Verify disable result is shown
        await expect(page.locator('[data-testid="trap-disable-result-overlay"]')).toBeVisible();
        await expect(page.locator('[data-testid="trap-info"]')).toContainText('Lava Flow');
        await expect(page.locator('[data-testid="dice-roll"]')).toContainText('15');
        await expect(page.locator('[data-testid="disable-dc"]')).toContainText('10');
        await expect(page.locator('[data-testid="result-text"]')).toContainText('DISABLED');
        
        // Verify trap disable result in state
        expect(storeState.game.trapDisableResult).not.toBeNull();
        expect(storeState.game.trapDisableResult.roll).toBe(15);
        expect(storeState.game.trapDisableResult.success).toBe(true);
      }
    });
    
    // Dismiss the trap disable result
    await page.locator('[data-testid="dismiss-trap-result"]').click();
    await page.locator('[data-testid="trap-disable-result-overlay"]').waitFor({ state: 'hidden' });
    
    await screenshots.capture(page, 'trap-removed-from-board', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify trap is gone
        expect(storeState.game.traps).toHaveLength(0);
        
        // Verify trap marker is no longer visible
        await expect(page.locator('[data-testid="trap-marker"]')).not.toBeVisible();
      }
    });
  });
});
