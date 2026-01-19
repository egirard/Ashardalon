import { test, expect } from '@playwright/test';
import { createScreenshotHelper, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('086 - Kobold Trappers Trap Disable Penalty', () => {
  test('kobold trappers applies -4 penalty to trap disable rolls', async ({ page }) => {
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
    
    // STEP 2: Verify initial game state (no environment, no traps)
    await screenshots.capture(page, 'game-started-no-environment', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.activeEnvironmentId).toBeNull();
        expect(storeState.game.traps).toHaveLength(0);
        expect(storeState.game.turnState.currentPhase).toBe('hero-phase');
        
        // Verify no environment indicator
        await expect(page.locator('[data-testid="environment-indicator"]')).not.toBeVisible();
      }
    });
    
    // STEP 3: Activate Kobold Trappers environment
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setActiveEnvironment',
        payload: 'kobold-trappers'
      });
    });
    
    // Wait for environment indicator to appear
    await page.locator('[data-testid="environment-indicator"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'kobold-trappers-environment-active', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.activeEnvironmentId).toBe('kobold-trappers');
        
        // Verify environment indicator is visible
        await expect(page.locator('[data-testid="environment-indicator"]')).toBeVisible();
        await expect(page.locator('[data-testid="environment-indicator"]')).toContainText('Kobold Trappers');
      }
    });
    
    // STEP 4: Place a trap at Quinn's position
    const trapPlaced = await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      
      // Get Quinn's position
      const quinnToken = state.game.heroTokens[0];
      const quinnPos = quinnToken.position;
      
      // Place a lava flow trap at Quinn's position (DC 10)
      store.dispatch({
        type: 'game/setTraps',
        payload: [{
          id: 'trap-test-1',
          encounterId: 'lava-flow',
          position: quinnPos,
          disableDC: 10
        }]
      });
      
      return { position: quinnPos, dc: 10 };
    });
    
    await screenshots.capture(page, 'trap-placed-at-hero-position', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify trap exists
        expect(storeState.game.traps).toHaveLength(1);
        expect(storeState.game.traps[0].encounterId).toBe('lava-flow');
        expect(storeState.game.traps[0].disableDC).toBe(10);
        
        // Verify trap is at Quinn's position
        const quinnPos = storeState.game.heroTokens[0].position;
        expect(storeState.game.traps[0].position).toEqual(quinnPos);
      }
    });
    
    // STEP 5: Attempt to disable trap with roll of 13 (should fail due to -4 penalty)
    // Roll 13 - 4 = 9, which is < DC 10, so it should fail
    const disableResult1 = await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      const trapsBefore = state.game.traps.length;
      
      // Attempt to disable with roll of 13 (randomFn returns 0.60 → 12 + 1 = 13)
      store.dispatch({
        type: 'game/attemptDisableTrap',
        payload: {
          trapId: 'trap-test-1',
          randomFn: () => 0.60  // 0.60 * 20 = 12, +1 = 13
        }
      });
      
      const stateAfter = store.getState();
      const trapsAfter = stateAfter.game.traps.length;
      
      return {
        roll: 13,
        dc: 10,
        penalty: -4,
        modifiedRoll: 9,
        trapsBefore,
        trapsAfter,
        success: trapsAfter < trapsBefore
      };
    });
    
    await screenshots.capture(page, 'disable-attempt-failed-with-penalty', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify trap still exists (disable failed)
        expect(storeState.game.traps).toHaveLength(1);
        expect(disableResult1.success).toBe(false);
        expect(disableResult1.modifiedRoll).toBeLessThan(disableResult1.dc);
      }
    });
    
    // STEP 6: Attempt to disable trap with roll of 14 (should succeed despite penalty)
    // Roll 14 - 4 = 10, which is >= DC 10, so it should succeed
    const disableResult2 = await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      const trapsBefore = state.game.traps.length;
      
      // Attempt to disable with roll of 14 (randomFn returns 0.65 → 13 + 1 = 14)
      store.dispatch({
        type: 'game/attemptDisableTrap',
        payload: {
          trapId: 'trap-test-1',
          randomFn: () => 0.65  // 0.65 * 20 = 13, +1 = 14
        }
      });
      
      const stateAfter = store.getState();
      const trapsAfter = stateAfter.game.traps.length;
      
      return {
        roll: 14,
        dc: 10,
        penalty: -4,
        modifiedRoll: 10,
        trapsBefore,
        trapsAfter,
        success: trapsAfter < trapsBefore
      };
    });
    
    await screenshots.capture(page, 'disable-attempt-succeeded-despite-penalty', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify trap was removed (disable succeeded)
        expect(storeState.game.traps).toHaveLength(0);
        expect(disableResult2.success).toBe(true);
        expect(disableResult2.modifiedRoll).toBeGreaterThanOrEqual(disableResult2.dc);
      }
    });
    
    // STEP 7: Verify behavior without Kobold Trappers environment
    // First, place another trap
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      
      // Get Quinn's position
      const quinnToken = state.game.heroTokens[0];
      const quinnPos = quinnToken.position;
      
      // Place another trap
      store.dispatch({
        type: 'game/setTraps',
        payload: [{
          id: 'trap-test-2',
          encounterId: 'lava-flow',
          position: quinnPos,
          disableDC: 10
        }]
      });
    });
    
    // Deactivate Kobold Trappers environment
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setActiveEnvironment',
        payload: null
      });
    });
    
    await screenshots.capture(page, 'environment-deactivated-new-trap-placed', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify environment is deactivated
        expect(storeState.game.activeEnvironmentId).toBeNull();
        
        // Verify new trap exists
        expect(storeState.game.traps).toHaveLength(1);
        
        // Verify environment indicator is hidden
        await expect(page.locator('[data-testid="environment-indicator"]')).not.toBeVisible();
      }
    });
    
    // STEP 8: Attempt to disable trap with roll of 10 (should succeed without penalty)
    // Roll 10 with no penalty = 10, which is >= DC 10, so it should succeed
    const disableResult3 = await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      const trapsBefore = state.game.traps.length;
      
      // Attempt to disable with roll of 10 (randomFn returns 0.45 → 9 + 1 = 10)
      store.dispatch({
        type: 'game/attemptDisableTrap',
        payload: {
          trapId: 'trap-test-2',
          randomFn: () => 0.45  // 0.45 * 20 = 9, +1 = 10
        }
      });
      
      const stateAfter = store.getState();
      const trapsAfter = stateAfter.game.traps.length;
      
      return {
        roll: 10,
        dc: 10,
        penalty: 0,
        modifiedRoll: 10,
        trapsBefore,
        trapsAfter,
        success: trapsAfter < trapsBefore
      };
    });
    
    await screenshots.capture(page, 'disable-succeeded-without-environment', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify trap was removed (disable succeeded)
        expect(storeState.game.traps).toHaveLength(0);
        expect(disableResult3.success).toBe(true);
        
        // Verify same roll (10) succeeded without penalty but would have failed with penalty
        expect(disableResult3.roll).toBe(10);
        expect(disableResult3.modifiedRoll).toBe(10);
      }
    });
  });
});
