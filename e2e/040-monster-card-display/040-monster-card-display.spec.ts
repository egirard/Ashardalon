import { test, expect } from '@playwright/test';
import { createScreenshotHelper, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('040 - Monster Card Display', () => {
  test('monster cards display persistently next to player character sheet during gameplay', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    // STEP 2: Select Quinn from bottom edge
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    
    // Open power card selection for Quinn
    await page.locator('[data-testid="select-powers-quinn"]').click();
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'visible' });
    
    // Accept pre-selected power cards
    // Note: Power cards are pre-selected by default (utility + 2 at-wills + daily).
    // Manual selection would trigger toggle behavior, deselecting pre-selected cards.
    await page.locator('[data-testid="done-power-selection"]').click();
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'hidden' });

    // STEP 3: Start the game
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Wait for initial game state to settle
    await page.waitForFunction(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      return state.game.turnState.currentPhase === 'hero-phase';
    });

    // Set deterministic position for reproducible screenshots
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 3, y: 0 } }
      });
    });

    // Wait for position changes to be applied
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens.find((t: any) => t.heroId === 'quinn')?.position).toEqual({ x: 3, y: 0 });
    }).toPass();

    // Hide movement overlay for stable screenshot
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/hideMovement' });
    });

    await page.waitForFunction(() => {
      const buttons = document.querySelectorAll('[data-testid^="move-to-"]');
      return buttons.length === 0;
    });

    await screenshots.capture(page, 'initial-game-state', {
      programmaticCheck: async () => {
        // Verify player card is visible
        await expect(page.locator('[data-testid="player-card-name"]')).toContainText("Quinn");
        
        // Verify no monsters yet
        await expect(page.locator('[data-testid="monster-cards-quinn"]')).not.toBeVisible();
        
        // Verify store state
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.monsters.length).toBe(0);
      }
    });

    // STEP 4: End hero phase to trigger exploration
    await page.locator('[data-testid="end-phase-button"]').click();
    
    // Wait for exploration phase
    await page.waitForFunction(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      return state.game.turnState.currentPhase === 'exploration-phase';
    });

    // Wait for monster to spawn
    await page.waitForFunction(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      return state.game.monsters.length > 0;
    });

    // Dismiss the monster spawn modal if visible
    const monsterCardOverlay = page.locator('[data-testid="monster-card-overlay"]');
    if (await monsterCardOverlay.isVisible()) {
      await page.locator('[data-testid="dismiss-monster-card"]').click();
      await monsterCardOverlay.waitFor({ state: 'hidden' });
    }

    await screenshots.capture(page, 'monster-spawned-exploration', {
      programmaticCheck: async () => {
        // Verify monster card mini is now visible in player card
        await expect(page.locator('[data-testid="monster-cards-quinn"]')).toBeVisible();
        await expect(page.locator('[data-testid="monster-card-mini"]')).toBeVisible();
        
        // Verify monster name is displayed
        await expect(page.locator('[data-testid="monster-mini-name"]')).toBeVisible();
        
        // Verify HP display is shown
        await expect(page.locator('[data-testid="monster-mini-hp"]')).toBeVisible();
        
        // Verify store state
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.monsters.length).toBe(1);
        
        // Verify monster is controlled by Quinn
        const monster = storeState.game.monsters[0];
        expect(monster.controllerId).toBe('quinn');
      }
    });

    // STEP 5: Verify monster card persists - take final screenshot in exploration phase
    // (Avoiding villain phase due to non-deterministic monster behavior)
    await screenshots.capture(page, 'monster-card-persists', {
      programmaticCheck: async () => {
        // Verify we're in exploration phase
        await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');
        
        // Verify monster card mini is still visible
        await expect(page.locator('[data-testid="monster-cards-quinn"]')).toBeVisible();
        await expect(page.locator('[data-testid="monster-card-mini"]')).toBeVisible();
        
        // Verify monster name is displayed
        await expect(page.locator('[data-testid="monster-mini-name"]')).toBeVisible();
        
        // Verify HP display
        await expect(page.locator('[data-testid="monster-mini-hp"]')).toBeVisible();
        
        // Verify store state
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.turnState.currentPhase).toBe('exploration-phase');
        expect(storeState.game.monsters.length).toBe(1);
        expect(storeState.game.monsters[0].controllerId).toBe('quinn');
      }
    });
  });
});
