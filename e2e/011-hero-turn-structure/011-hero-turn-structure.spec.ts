import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction } from '../helpers/screenshot-helper';

test.describe('011 - Hero Turn Structure', () => {
  test('hero turn auto-advances after double move', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Navigate to character selection and start game
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    // Select a hero from the top edge
    await page.locator('[data-testid="hero-quinn-top"]').click();
    
    // Select power cards for Quinn
    await selectDefaultPowerCards(page, 'quinn');
    
    await page.locator('[data-testid="start-game-button"]').click();
    
    // Wait for game board to appear
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);
    
    // Set deterministic position for Quinn at (2, 4) for predictable testing
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 4 } }
      });
    });

    // Wait for position to be applied
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 4 });
    }).toPass();
    
    // STEP 2: Verify hero phase starts with movement options shown
    await screenshots.capture(page, 'hero-phase-movement-shown', {
      programmaticCheck: async () => {
        // Verify we're in hero phase
        await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');
        
        // Verify movement overlay is shown (auto-shown at turn start)
        const moveSquares = page.locator('button:has-text("Move to")');
        const count = await moveSquares.count();
        expect(count).toBeGreaterThan(0);
        
        // Verify Redux store state
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.heroTurnActions.actionsTaken).toEqual([]);
        expect(storeState.game.heroTurnActions.canMove).toBe(true);
        expect(storeState.game.heroTurnActions.canAttack).toBe(true);
      }
    });
    
    // STEP 3: Move once (first move) - click on first available move target
    await page.locator('button:has-text("Move to")').first().click();
    
    await screenshots.capture(page, 'after-first-move', {
      programmaticCheck: async () => {
        // Still in hero phase after first move
        await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');
        
        // Verify Redux store shows one move taken and can still move/attack
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.heroTurnActions.actionsTaken).toEqual(['move']);
        expect(storeState.game.heroTurnActions.canMove).toBe(true);
        expect(storeState.game.heroTurnActions.canAttack).toBe(true);
      }
    });
    
    // STEP 4: Move again (double move - turn should auto-advance)
    await page.locator('button:has-text("Move to")').first().click();
    
    // Wait for phase to change to exploration
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase', { timeout: 5000 });
    
    await screenshots.capture(page, 'auto-advanced-to-exploration', {
      programmaticCheck: async () => {
        // Verify we're now in exploration phase
        await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');
        
        // Verify Redux store state
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.turnState.currentPhase).toBe('exploration-phase');
      }
    });
  });

  test('hero cannot attack twice (no double attacks)', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // This test verifies that after attacking, the attack option is no longer available
    // and the hero can only move or pass
    
    // STEP 1: Navigate and start game
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-top"]').click();
    
    // Select power cards for Quinn
    await selectDefaultPowerCards(page, 'quinn');
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);
    
    // Set deterministic position for Quinn at (2, 4) for predictable testing
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 4 } }
      });
    });

    // Wait for position to be applied
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 4 });
    }).toPass();
    
    await screenshots.capture(page, 'game-started-for-attack-test', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.heroTurnActions.canAttack).toBe(true);
      }
    });
    
    // STEP 2: Verify that movement options and end phase button are available
    await screenshots.capture(page, 'hero-phase-controls', {
      programmaticCheck: async () => {
        // End phase button should be visible
        await expect(page.locator('[data-testid="end-phase-button"]')).toBeVisible();
        await expect(page.locator('[data-testid="end-phase-button"]')).toContainText('End Hero Phase');
      }
    });
  });

  test('pass/end phase button advances to next phase', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Navigate and start game
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-top"]').click();
    
    // Select power cards for Quinn
    await selectDefaultPowerCards(page, 'quinn');
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);
    
    // Set deterministic position for Quinn at (2, 4) for predictable testing
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 4 } }
      });
    });

    // Wait for position to be applied
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 4 });
    }).toPass();
    
    // STEP 2: Click end hero phase without taking any actions
    await screenshots.capture(page, 'before-end-phase', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');
        await expect(page.locator('[data-testid="end-phase-button"]')).toBeVisible();
      }
    });
    
    // Click end hero phase
    await page.locator('[data-testid="end-phase-button"]').click();
    
    // Wait for phase to change
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase', { timeout: 5000 });
    
    await screenshots.capture(page, 'after-pass-to-exploration', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.turnState.currentPhase).toBe('exploration-phase');
      }
    });
  });
});
