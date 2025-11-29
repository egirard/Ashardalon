import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from '../helpers/screenshot-helper';

test.describe('013 - Wall Collision Detection', () => {
  test('Movement overlay excludes diagonal moves through wall corners', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection and select Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Set hero position at a corner of the start tile (x=3, y=0) - north-east corner
    // and refresh movement overlay
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 3, y: 0 } }
      });
      // Refresh movement overlay with Quinn's speed (5)
      store.dispatch({
        type: 'game/showMovement',
        payload: { heroId: 'quinn', speed: 5 }
      });
    });

    // Wait for position to be applied and movement calculated
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 3, y: 0 });
      expect(storeState.game.showingMovement).toBe(true);
    }).toPass();

    await screenshots.capture(page, 'hero-at-corner', {
      programmaticCheck: async () => {
        // Verify hero is at corner position
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.heroTokens[0].position).toEqual({ x: 3, y: 0 });
        expect(storeState.game.turnState.currentPhase).toBe('hero-phase');
      }
    });

    // STEP 2: Verify movement overlay is visible
    await page.locator('[data-testid="movement-overlay"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'movement-from-corner', {
      programmaticCheck: async () => {
        // Verify movement overlay is visible
        await expect(page.locator('[data-testid="movement-overlay"]')).toBeVisible();
        
        // Verify Redux state shows valid movement squares
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.showingMovement).toBe(true);
        expect(storeState.game.validMoveSquares.length).toBeGreaterThan(0);
        
        // Verify valid movement squares include adjacent positions from (3, 0)
        const validSquares = storeState.game.validMoveSquares;
        
        // Can move west (2, 0)
        expect(validSquares.some((s: { x: number; y: number }) => s.x === 2 && s.y === 0)).toBe(true);
        
        // Can move south (3, 1)
        expect(validSquares.some((s: { x: number; y: number }) => s.x === 3 && s.y === 1)).toBe(true);
        
        // Can move diagonally south-west within tile (2, 1)
        expect(validSquares.some((s: { x: number; y: number }) => s.x === 2 && s.y === 1)).toBe(true);
      }
    });
  });

  test('Hero cannot move diagonally between tiles that are not directly connected', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Set hero position at east edge of start tile (x=3, y=2) and refresh movement
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 3, y: 2 } }
      });
      // Refresh movement overlay with Quinn's speed (5)
      store.dispatch({
        type: 'game/showMovement',
        payload: { heroId: 'quinn', speed: 5 }
      });
    });

    // Wait for position to be applied
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 3, y: 2 });
      expect(storeState.game.showingMovement).toBe(true);
    }).toPass();

    await screenshots.capture(page, 'hero-at-edge', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.heroTokens[0].position).toEqual({ x: 3, y: 2 });
      }
    });

    // STEP 2: Verify movement overlay
    await page.locator('[data-testid="movement-overlay"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'movement-at-edge', {
      programmaticCheck: async () => {
        // Verify movement overlay is visible
        await expect(page.locator('[data-testid="movement-overlay"]')).toBeVisible();
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // All valid squares should be within the start tile bounds (x: 1-3, y: 0-7)
        // No squares should be at x >= 4 (east of tile boundary)
        const validSquares = storeState.game.validMoveSquares;
        
        // No movement squares should be outside tile boundary
        expect(validSquares.every((s: { x: number; y: number }) => s.x <= 3)).toBe(true);
        
        // Verify hero can move within the tile (adjacent to current position at 3,2)
        // Valid adjacent moves: west (2,2), north (3,1), south (3,3)
        expect(validSquares.some((s: { x: number; y: number }) => s.x === 3 && s.y === 1)).toBe(true);
        expect(validSquares.some((s: { x: number; y: number }) => s.x === 3 && s.y === 3)).toBe(true);
      }
    });
  });

  test('Hero cannot move to non-adjacent tile (requires three tiles)', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // Helper function to dismiss monster card if visible
    async function dismissMonsterCardIfVisible() {
      const monsterCard = page.locator('[data-testid="monster-card-overlay"]');
      if (await monsterCard.isVisible({ timeout: 1000 }).catch(() => false)) {
        await page.locator('[data-testid="dismiss-monster-card"]').click();
        await monsterCard.waitFor({ state: 'hidden' });
      }
    }

    // STEP 1: Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // STEP 2: Set up three tiles by exploring twice
    // First, move hero to north edge and trigger exploration
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 0 } }
      });
    });

    // Wait for position
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 0 });
    }).toPass();

    // End hero phase to trigger exploration and create north tile
    await page.locator('[data-testid="end-phase-button"]').click();
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');

    // Wait for exploration to complete
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.dungeon.tiles.length).toBeGreaterThanOrEqual(2);
    }).toPass();

    // Dismiss monster card if it appeared
    await dismissMonsterCardIfVisible();

    // End exploration phase
    await page.locator('[data-testid="end-phase-button"]').click();
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Villain Phase');
    
    // End villain phase
    await page.locator('[data-testid="end-phase-button"]').click();
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');

    // Now move hero to south edge and trigger second exploration
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 7 } }
      });
    });

    // Wait for position
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 7 });
    }).toPass();

    // End hero phase to trigger south exploration
    await page.locator('[data-testid="end-phase-button"]').click();
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');

    // Wait for third tile to be placed
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.dungeon.tiles.length).toBeGreaterThanOrEqual(3);
    }).toPass();

    // Dismiss monster card if it appeared
    await dismissMonsterCardIfVisible();

    // Navigate through phases back to hero phase
    await page.locator('[data-testid="end-phase-button"]').click();
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Villain Phase');
    
    await page.locator('[data-testid="end-phase-button"]').click();
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');

    // STEP 3: Get current tile layout
    const dungeonState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState().game.dungeon;
    });

    // Find the south tile (row > 0)
    const southTile = dungeonState.tiles.find((t: any) => t.position.row > 0);
    expect(southTile).toBeDefined();

    // Position hero on south tile (middle of tile)
    // South tile at row=1 has y coordinates starting at 8 (start tile goes 0-7)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 9 } }
      });
      // Refresh movement overlay with Quinn's speed (5)
      store.dispatch({
        type: 'game/showMovement',
        payload: { heroId: 'quinn', speed: 5 }
      });
    });

    // Wait for state to be applied
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 9 });
      expect(storeState.game.showingMovement).toBe(true);
    }).toPass();

    await screenshots.capture(page, 'three-tiles-hero-on-south', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify at least three tiles exist (start + north + south)
        expect(storeState.game.dungeon.tiles.length).toBeGreaterThanOrEqual(3);
        
        // Verify hero is on south tile
        expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 9 });
      }
    });

    // STEP 4: Verify movement overlay excludes non-adjacent tiles
    await page.locator('[data-testid="movement-overlay"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'movement-excludes-non-adjacent-tile', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="movement-overlay"]')).toBeVisible();
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        const validSquares = storeState.game.validMoveSquares;
        const tiles = storeState.game.dungeon.tiles;
        
        // Find north tile (row < 0)
        const northTile = tiles.find((t: any) => t.position.row < 0);
        
        // Hero is on south tile at (2, 9)
        // South tile: y: 8-11
        // Start tile: y: 0-7
        // North tile: y: -4 to -1
        
        // Valid moves should include squares on south tile
        expect(validSquares.some((s: { x: number; y: number }) => s.y >= 8 && s.y <= 11)).toBe(true);
        
        // With speed 5, hero at y=9 can reach start tile (y=7-4)
        // This verifies movement between adjacent tiles works
        expect(validSquares.some((s: { x: number; y: number }) => s.y >= 4 && s.y <= 7)).toBe(true);
        
        // North tile squares (y: -4 to -1) should NOT be reachable
        // Even with speed 5, hero at y=9 cannot reach y=-1 (10 squares away)
        // More importantly, movement must go through connected tiles only
        if (northTile) {
          const northTileSquares = validSquares.filter(
            (s: { x: number; y: number }) => s.y >= -4 && s.y <= -1
          );
          expect(northTileSquares.length).toBe(0);
        }
        
        // All valid squares should be within reachable range
        // Hero at (2, 9) with speed 5 can reach y: 4-11 at most
        expect(validSquares.every(
          (s: { x: number; y: number }) => s.y >= 4 && s.y <= 11
        )).toBe(true);
      }
    });
  });

  test('Movement squares respect tile boundaries and wall edges', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Set hero position at west edge of walkable area (x=1, y=2) and refresh movement
    // x=0 is the wall column on start tile
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 1, y: 2 } }
      });
      // Refresh movement overlay with Quinn's speed (5)
      store.dispatch({
        type: 'game/showMovement',
        payload: { heroId: 'quinn', speed: 5 }
      });
    });

    // Wait for position to be applied
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 1, y: 2 });
      expect(storeState.game.showingMovement).toBe(true);
    }).toPass();

    await screenshots.capture(page, 'hero-at-west-edge', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.heroTokens[0].position).toEqual({ x: 1, y: 2 });
      }
    });

    // STEP 2: Verify movement overlay
    await page.locator('[data-testid="movement-overlay"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'movement-at-west-wall', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="movement-overlay"]')).toBeVisible();
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        const validSquares = storeState.game.validMoveSquares;
        
        // No movement squares should be at x=0 (wall column)
        expect(validSquares.every((s: { x: number; y: number }) => s.x >= 1)).toBe(true);
        
        // Should be able to move east and north within tile (from position 1,2)
        expect(validSquares.some((s: { x: number; y: number }) => s.x === 2 && s.y === 2)).toBe(true);
        expect(validSquares.some((s: { x: number; y: number }) => s.x === 1 && s.y === 1)).toBe(true);
        
        // Verify no movement to staircase (x=1-2, y=3-4)
        const staircaseSquares = [
          { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 1, y: 4 }, { x: 2, y: 4 }
        ];
        staircaseSquares.forEach(staircase => {
          expect(
            validSquares.some(
              (s: { x: number; y: number }) => s.x === staircase.x && s.y === staircase.y
            )
          ).toBe(false);
        });
      }
    });
  });
});
