import { test, expect } from '@playwright/test';
import { createScreenshotHelper, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('073 - Surrounded Environment Activation', () => {
  test('surrounded environment spawns monster for active player without monsters at end of exploration phase', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Navigate and start game with two heroes (Vistra and Quinn)
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'character-select-screen', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="character-select"]')).toBeVisible();
      }
    });
    
    // Select Vistra from right edge to ensure game state panel is visible
    await page.locator('[data-testid="hero-vistra-right"]').click();
    
    // Powers are auto-selected when hero is selected, no need to manually select
    
    // Select Quinn from bottom edge as second hero
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    
    // Powers are auto-selected when hero is selected, no need to manually select
    
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    
    // Wait for game board
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);
    
    // STEP 2: Verify initial game state
    await screenshots.capture(page, 'game-started-initial-state', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.activeEnvironmentId).toBeNull();
        expect(storeState.game.turnState.currentPhase).toBe('hero-phase');
        
        // Verify no environment indicator
        await expect(page.locator('[data-testid="environment-indicator"]')).not.toBeVisible();
      }
    });
    
    // STEP 3: Activate Surrounded environment
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setActiveEnvironment',
        payload: 'surrounded'
      });
    });
    
    // Wait for environment indicator to appear
    await page.locator('[data-testid="environment-indicator"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'surrounded-environment-active', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.activeEnvironmentId).toBe('surrounded');
        
        // Verify environment indicator is visible
        await expect(page.locator('[data-testid="environment-indicator"]')).toBeVisible();
        await expect(page.locator('[data-testid="environment-indicator"]')).toContainText('Surrounded');
      }
    });
    
    // STEP 4: Click environment indicator to show card detail
    await page.locator('[data-testid="environment-indicator"]').click();
    
    // Wait for card detail to appear
    await page.locator('.encounter-card').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'environment-card-detail-shown', {
      programmaticCheck: async () => {
        // Verify card detail popup is visible
        await expect(page.locator('.encounter-card')).toBeVisible();
        await expect(page.locator('.encounter-card')).toContainText('Surrounded');
        
        // Verify it shows the environment description
        await expect(page.locator('.encounter-card')).toContainText('Environment');
      }
    });
    
    // Dismiss card detail
    await page.locator('.encounter-card .accept-button').click();
    await page.locator('.encounter-card').waitFor({ state: 'hidden' });
    
    // STEP 5: Store initial monster count
    const initialMonsterCount = await page.evaluate(() => {
      const storeState = (window as any).__REDUX_STORE__.getState();
      return storeState.game.monsters.length;
    });
    
    // STEP 6: End hero phase to trigger exploration phase
    await page.locator('[data-testid="end-phase-button"]').click();
    
    // Wait for exploration phase
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const checkPhase = () => {
          const state = (window as any).__REDUX_STORE__.getState();
          if (state.game.turnState.currentPhase === 'exploration-phase') {
            resolve(true);
          } else {
            setTimeout(checkPhase, 100);
          }
        };
        checkPhase();
      });
    });
    
    await screenshots.capture(page, 'exploration-phase-started', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.turnState.currentPhase).toBe('exploration-phase');
      }
    });
    
    // STEP 7: Ensure the active hero doesn't control any monsters
    // This guarantees the Surrounded effect will trigger for the active player
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      
      // Get the current active hero
      const currentHeroIndex = state.game.turnState.currentHeroIndex;
      const activeHeroId = state.game.heroTokens[currentHeroIndex]?.heroId;
      
      if (activeHeroId) {
        // Remove all monsters controlled by the active hero
        const updatedMonsters = state.game.monsters.filter((m: any) => m.controllerId !== activeHeroId);
        
        // Update the state directly (this is for testing purposes)
        state.game.monsters = updatedMonsters;
      }
    });
    
    // STEP 8: End exploration phase - this triggers Surrounded! effect for the active player
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/endExplorationPhase'
      });
    });
    
    // After ending exploration phase, an encounter card is drawn first
    // Wait for and dismiss the encounter card
    await page.locator('[data-testid="encounter-card-overlay"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('.encounter-card .accept-button').click();
    await page.locator('[data-testid="encounter-card-overlay"]').waitFor({ state: 'hidden' });
    
    // Now wait for the Surrounded! monster card popup to appear
    // The monster card shows after a delay (4 seconds for animation sequencing)
    await page.locator('[data-testid="monster-card"]').waitFor({ state: 'visible', timeout: 10000 });
    
    // Wait a moment for animations to complete
    await page.waitForTimeout(500);
    
    await screenshots.capture(page, 'surrounded-monster-card-shown', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify monster card is displayed
        await expect(page.locator('[data-testid="monster-card"]')).toBeVisible();
        
        // Verify recentlySpawnedMonsterId is set (monster spawned by Surrounded effect)
        expect(storeState.game.recentlySpawnedMonsterId).not.toBeNull();
        
        // Verify monster exists in state
        expect(storeState.game.monsters.length).toBeGreaterThan(initialMonsterCount);
      }
    });
    
    // Dismiss the monster card
    await page.locator('[data-testid="dismiss-monster-card"]').click();
    await page.locator('[data-testid="monster-card"]').waitFor({ state: 'hidden' });
    
    // Wait for villain phase
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const checkPhase = () => {
          const state = (window as any).__REDUX_STORE__.getState();
          if (state.game.turnState.currentPhase === 'villain-phase') {
            resolve(true);
          } else {
            setTimeout(checkPhase, 100);
          }
        };
        checkPhase();
      });
    });
    
    // STEP 9: Verify villain phase and monster spawning completed
    await screenshots.capture(page, 'after-exploration-phase-ended', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.turnState.currentPhase).toBe('villain-phase');
        
        // Verify monster count increased (Surrounded spawned a monster for Quinn)
        const finalMonsterCount = storeState.game.monsters.length;
        expect(finalMonsterCount).toBeGreaterThan(initialMonsterCount);
      }
    });
    
    // STEP 10: Verify the spawned monster location and controller
    await screenshots.capture(page, 'surrounded-monster-spawned', {
      programmaticCheck: async () => {
        const monsterInfo = await page.evaluate(() => {
          const storeState = (window as any).__REDUX_STORE__.getState();
          
          // Get the active hero ID
          const currentHeroIndex = storeState.game.turnState.currentHeroIndex;
          const activeHeroId = storeState.game.heroTokens[currentHeroIndex]?.heroId;
          
          // Check if the active hero now controls a monster
          const activeHeroMonsters = storeState.game.monsters.filter(
            (m: any) => m.controllerId === activeHeroId
          );
          
          return {
            totalMonsters: storeState.game.monsters.length,
            activeHeroId: activeHeroId,
            activeHeroControlledMonsters: activeHeroMonsters.length,
            unexploredEdges: storeState.game.dungeon.unexploredEdges.length
          };
        });
        
        // Active hero should now control at least one monster (from Surrounded effect)
        expect(monsterInfo.activeHeroControlledMonsters).toBeGreaterThan(0);
      }
    });
  });
});
