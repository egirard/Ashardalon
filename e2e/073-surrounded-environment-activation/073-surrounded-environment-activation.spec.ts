import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('073 - Surrounded Environment Activation', () => {
  test('surrounded environment spawns monsters for heroes without monsters at end of exploration phase', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Navigate and start game with Vistra
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'character-select-screen', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="character-select"]')).toBeVisible();
      }
    });
    
    // Select Vistra from right edge to ensure game state panel is visible
    await page.locator('[data-testid="hero-vistra-right"]').click();
    
    // Select power cards
    await selectDefaultPowerCards(page, 'vistra');
    
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
    
    // STEP 7: Check if hero controls any monsters before ending exploration
    const heroControlsMonsterBefore = await page.evaluate(() => {
      const storeState = (window as any).__REDUX_STORE__.getState();
      const heroId = storeState.game.heroTokens[storeState.game.turnState.currentHeroIndex].heroId;
      const controlledMonsters = storeState.game.monsters.filter(
        (m: any) => m.controllerId === heroId
      );
      return controlledMonsters.length > 0;
    });
    
    // STEP 8: End exploration phase - this should trigger Surrounded! effect
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/endExplorationPhase'
      });
    });
    
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
    
    await screenshots.capture(page, 'after-exploration-phase-ended', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.turnState.currentPhase).toBe('villain-phase');
        
        // Verify monster count increased if hero didn't control any monsters
        const finalMonsterCount = storeState.game.monsters.length;
        
        if (!heroControlsMonsterBefore) {
          // If hero didn't control any monsters, a new one should have been spawned
          expect(finalMonsterCount).toBeGreaterThan(initialMonsterCount);
        }
      }
    });
    
    // STEP 9: Verify the spawned monster location and controller
    await screenshots.capture(page, 'surrounded-monster-spawned', {
      programmaticCheck: async () => {
        const monsterInfo = await page.evaluate(() => {
          const storeState = (window as any).__REDUX_STORE__.getState();
          const heroId = storeState.game.heroTokens[storeState.game.turnState.currentHeroIndex].heroId;
          const controlledMonsters = storeState.game.monsters.filter(
            (m: any) => m.controllerId === heroId
          );
          
          return {
            totalMonsters: storeState.game.monsters.length,
            controlledByHero: controlledMonsters.length,
            heroId: heroId,
            unexploredEdges: storeState.game.dungeon.unexploredEdges.length
          };
        });
        
        // Hero should now control at least one monster (either from exploration or Surrounded)
        expect(monsterInfo.controlledByHero).toBeGreaterThan(0);
      }
    });
  });
});
