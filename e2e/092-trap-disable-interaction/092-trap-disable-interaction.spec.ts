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
    
    // STEP 5: Click on trap marker to attempt disable
    // Click the trap marker
    await page.locator('[data-testid="trap-marker"]').click({ force: true });
    
    // Wait for trap disable result to appear
    await page.locator('[data-testid="trap-disable-result-overlay"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'disable-attempt-result-shown', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify disable result is shown
        await expect(page.locator('[data-testid="trap-disable-result-overlay"]')).toBeVisible();
        await expect(page.locator('[data-testid="trap-info"]')).toContainText('Lava Flow');
        
        // Verify trap disable result in state
        expect(storeState.game.trapDisableResult).not.toBeNull();
        expect(storeState.game.trapDisableResult.trapName).toBe('Lava Flow');
        expect(storeState.game.trapDisableResult.disableDC).toBe(10);
      }
    });
    
    // Check if the trap was disabled or not
    const wasDisabled = await page.evaluate(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.traps.length === 0;
    });
    
    // Dismiss the trap disable result
    await page.locator('[data-testid="dismiss-trap-result"]').click();
    await page.locator('[data-testid="trap-disable-result-overlay"]').waitFor({ state: 'hidden' });
    
    // If trap wasn't disabled, try again
    if (!wasDisabled) {
      await screenshots.capture(page, 'trap-still-active-after-first-attempt', {
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
      
      // Try to disable again
      await page.locator('[data-testid="trap-marker"]').click({ force: true });
      await page.locator('[data-testid="trap-disable-result-overlay"]').waitFor({ state: 'visible' });
      
      await screenshots.capture(page, 'second-disable-attempt-result', {
        programmaticCheck: async () => {
          await expect(page.locator('[data-testid="trap-disable-result-overlay"]')).toBeVisible();
          await expect(page.locator('[data-testid="trap-info"]')).toContainText('Lava Flow');
        }
      });
      
      await page.locator('[data-testid="dismiss-trap-result"]').click();
      await page.locator('[data-testid="trap-disable-result-overlay"]').waitFor({ state: 'hidden' });
    }
    
    await screenshots.capture(page, 'final-state', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Trap should eventually be disabled or still active
        // Either state is valid for the test (we're testing the UI, not the dice)
        const trapCount = storeState.game.traps.length;
        expect(trapCount).toBeGreaterThanOrEqual(0);
        expect(trapCount).toBeLessThanOrEqual(1);
      }
    });
  });
});
