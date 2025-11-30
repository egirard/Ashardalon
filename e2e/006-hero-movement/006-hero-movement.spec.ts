import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards } from '../helpers/screenshot-helper';

test.describe('006 - Move a Hero', () => {
  test('User moves hero to a new position', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection and select Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    
    // Select power cards for Quinn
    await selectDefaultPowerCards(page, 'quinn');
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Set deterministic position for Quinn at (2, 2) for predictable testing
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 2 } }
      });
    });

    // Wait for position to be applied
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 2 });
    }).toPass();

    await screenshots.capture(page, 'quinn-turn', {
      programmaticCheck: async () => {
        // Verify it's Quinn's turn in Hero Phase
        await expect(page.locator('[data-testid="turn-indicator"]')).toContainText("Quinn's Turn");
        await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');
        
        // Verify hero token is visible
        await expect(page.locator('[data-testid="hero-token"]')).toBeVisible();
        
        // Verify Redux store state
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.turnState.currentPhase).toBe('hero-phase');
        expect(storeState.game.heroTokens[0].heroId).toBe('quinn');
        expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 2 });
        // Quinn has speed 5
        expect(storeState.heroes.selectedHeroes[0].speed).toBe(5);
      }
    });

    // STEP 2: Click on the board to show movement options
    await page.locator('[data-testid="start-tile"]').click();
    await page.locator('[data-testid="movement-overlay"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'movement-highlight', {
      programmaticCheck: async () => {
        // Verify movement overlay is visible
        await expect(page.locator('[data-testid="movement-overlay"]')).toBeVisible();
        
        // Verify valid movement squares are displayed
        const moveSquares = page.locator('[data-testid="move-square"]');
        const squareCount = await moveSquares.count();
        expect(squareCount).toBeGreaterThan(0);
        
        // Verify Redux state shows movement
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.showingMovement).toBe(true);
        expect(storeState.game.validMoveSquares.length).toBeGreaterThan(0);
        
        // Verify staircase squares are NOT in valid moves (positions 1,3 2,3 1,4 2,4)
        const staircaseSquares = [
          { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 1, y: 4 }, { x: 2, y: 4 }
        ];
        staircaseSquares.forEach(staircase => {
          expect(
            storeState.game.validMoveSquares.some(
              (s: { x: number; y: number }) => s.x === staircase.x && s.y === staircase.y
            )
          ).toBe(false);
        });
      }
    });

    // STEP 3: Click on a highlighted square to move
    // Find and click on a valid movement square (3, 2 should be adjacent and valid)
    const targetSquare = page.locator('[data-testid="move-square"][data-position-x="3"][data-position-y="2"]');
    await expect(targetSquare).toBeVisible();

    await screenshots.capture(page, 'select-destination', {
      programmaticCheck: async () => {
        // Verify the target square exists and is visible
        await expect(targetSquare).toBeVisible();
        
        // Verify hero is still at original position
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 2 });
      }
    });

    // Click the target square to move
    await targetSquare.click();

    // Wait for movement to complete (overlay should disappear)
    await expect(page.locator('[data-testid="movement-overlay"]')).not.toBeVisible();

    await screenshots.capture(page, 'hero-moved', {
      programmaticCheck: async () => {
        // Verify movement overlay is gone
        await expect(page.locator('[data-testid="movement-overlay"]')).not.toBeVisible();
        
        // Verify hero token is still visible
        await expect(page.locator('[data-testid="hero-token"]')).toBeVisible();
        
        // Verify Redux state shows new position
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.heroTokens[0].position).toEqual({ x: 3, y: 2 });
        expect(storeState.game.showingMovement).toBe(false);
        expect(storeState.game.validMoveSquares).toEqual([]);
      }
    });
  });

  test('Movement respects occupied squares', async ({ page }) => {
    // Start game with two heroes
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    // Select Quinn and Vistra
    await page.locator('[data-testid="hero-quinn"]').click();
    await page.locator('[data-testid="hero-vistra"]').click();
    
    // Select power cards for both heroes
    await selectDefaultPowerCards(page, 'quinn');
    await selectDefaultPowerCards(page, 'vistra');
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Set deterministic positions - Quinn at (2, 2), Vistra at (3, 2)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 2 } }
      });
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'vistra', position: { x: 3, y: 2 } }
      });
    });

    // Wait for positions to be applied
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 2 });
      expect(storeState.game.heroTokens[1].position).toEqual({ x: 3, y: 2 });
    }).toPass();

    // Click on board to show movement for Quinn
    await page.locator('[data-testid="start-tile"]').click();
    await page.locator('[data-testid="movement-overlay"]').waitFor({ state: 'visible' });

    // Verify Vistra's position (3, 2) is NOT in valid move squares
    const storeState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    
    expect(
      storeState.game.validMoveSquares.some(
        (s: { x: number; y: number }) => s.x === 3 && s.y === 2
      )
    ).toBe(false);
    
    // Verify the movement square for (3, 2) does not exist
    const occupiedSquare = page.locator('[data-testid="move-square"][data-position-x="3"][data-position-y="2"]');
    await expect(occupiedSquare).not.toBeVisible();
  });
});
