import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards } from '../helpers/screenshot-helper';

test.describe('013 - Wall Collision Detection', () => {
  test('Movement overlay excludes diagonal moves through wall corners', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection and select Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    // Select power cards for Quinn
    await selectDefaultPowerCards(page, 'quinn');
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
    // Select power cards for Quinn
    await selectDefaultPowerCards(page, 'quinn');
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

  test('Hero cannot move diagonally to non-adjacent tile (north and east tiles)', async ({ page }) => {
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
    // Select power cards for Quinn
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // STEP 2: Set up three tiles: Start, North, and East
    // This creates a scenario where North tile (3,-1) is diagonally adjacent to East tile (4,0)
    // but they are NOT directly connected tiles
    
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

    // Now move hero to east edge and trigger second exploration to create east tile
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 3, y: 2 } }
      });
    });

    // Wait for position
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 3, y: 2 });
    }).toPass();

    // End hero phase to trigger east exploration
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

    // Find the north tile (row < 0) and east tile (col > 0)
    const northTile = dungeonState.tiles.find((t: any) => t.position.row < 0);
    const eastTile = dungeonState.tiles.find((t: any) => t.position.col > 0);
    expect(northTile).toBeDefined();
    expect(eastTile).toBeDefined();

    // Position hero on east tile at corner position (4, 0) - adjacent to north tile diagonally
    // East tile at col=1 has x coordinates starting at 4 (x: 4-7, y: 0-3)
    // North tile at row=-1 has y coordinates from -4 to -1 (x: 0-3)
    // So (4, 0) on east tile is diagonally adjacent to (3, -1) on north tile
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 4, y: 0 } }
      });
      // Refresh movement overlay with Quinn's speed (1) to test direct adjacency only
      store.dispatch({
        type: 'game/showMovement',
        payload: { heroId: 'quinn', speed: 1 }
      });
    });

    // Wait for state to be applied
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 4, y: 0 });
      expect(storeState.game.showingMovement).toBe(true);
    }).toPass();

    await screenshots.capture(page, 'three-tiles-north-east-hero-on-east', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify at least three tiles exist (start + north + east)
        expect(storeState.game.dungeon.tiles.length).toBeGreaterThanOrEqual(3);
        
        // Verify hero is on east tile at corner
        expect(storeState.game.heroTokens[0].position).toEqual({ x: 4, y: 0 });
      }
    });

    // STEP 4: Verify movement overlay excludes diagonally adjacent non-connected tile
    await page.locator('[data-testid="movement-overlay"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'movement-excludes-diagonal-non-adjacent-tile', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="movement-overlay"]')).toBeVisible();
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        const validSquares = storeState.game.validMoveSquares;
        
        // Hero is on east tile at (4, 0) with speed 1
        // East tile: x: 4-7, y: 0-3
        // Start tile: x: 0-3, y: 0-7
        // North tile: x: 0-3, y: -4 to -1
        
        // The key test: With speed=1, hero at (4, 0) should only be able to move to:
        // - (3, 0) - west to start tile (cardinal movement, allowed if edge is open)
        // - (5, 0) - east within east tile
        // - (4, 1) - south within east tile
        // - (5, 1) - diagonal within east tile
        // 
        // The hero should NOT be able to move to:
        // - (3, -1) - diagonal to north tile (different tiles, diagonal blocked)
        
        // Specifically verify (3, -1) - the diagonally adjacent non-connected tile square - is NOT reachable
        expect(validSquares.some(
          (s: { x: number; y: number }) => s.x === 3 && s.y === -1
        )).toBe(false);
        
        // With speed 1, no north tile squares (y < 0) should be reachable
        // because we can't reach them in a single step from (4, 0)
        const northTileSquares = validSquares.filter(
          (s: { x: number; y: number }) => s.y < 0
        );
        expect(northTileSquares.length).toBe(0);
        
        // Verify hero CAN reach start tile at (3, 0) if edge is open
        // (cardinal movement between adjacent tiles)
        const canReachStartTile = validSquares.some(
          (s: { x: number; y: number }) => s.x === 3 && s.y === 0
        );
        // This depends on edge configuration - just log for debugging
        console.log('Can reach start tile at (3,0):', canReachStartTile);
        
        // Verify hero CAN reach other east tile squares (diagonal within same tile)
        expect(validSquares.some(
          (s: { x: number; y: number }) => s.x === 5 && s.y === 0
        )).toBe(true);
        expect(validSquares.some(
          (s: { x: number; y: number }) => s.x === 4 && s.y === 1
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
    // Select power cards for Quinn
    await selectDefaultPowerCards(page, 'quinn');
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
