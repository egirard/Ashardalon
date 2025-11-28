import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from '../helpers/screenshot-helper';

// Test constants for better readability
const INITIAL_TILE_DECK_SIZE = 8;
const TILE_DECK_SIZE_AFTER_EXPLORATION = 7;
const INITIAL_UNEXPLORED_EDGE_COUNT = 4;

/**
 * Start Tile Edge Positions:
 * The Start Tile is a double-height tile with valid squares from x: 1-3, y: 0-7.
 * 
 * Edge positions for exploration:
 * - North edge: y=0 (positions (1,0), (2,0), (3,0))
 * - South edge: y=7 (positions (1,7), (2,7), (3,7))
 * - West edge: x=1 (positions (1,0), (1,1), (1,2), (1,5), (1,6), (1,7))
 * - East edge: x=3 (positions (3,0), (3,1), (3,2), (3,5), (3,6), (3,7))
 * 
 * Non-edge positions (middle of tile, will NOT trigger exploration):
 * - Any position where x=2 AND y is not 0 or 7
 * - Example: (2,1), (2,2), (2,5), (2,6)
 */
const EDGE_POSITIONS = {
  NORTH: { x: 2, y: 0 },  // North edge (y=0)
  SOUTH: { x: 2, y: 7 },  // South edge (y=7)
  EAST: { x: 3, y: 2 },   // East edge (x=3)
  WEST: { x: 1, y: 2 },   // West edge (x=1)
};

const NON_EDGE_POSITIONS = {
  CENTER: { x: 2, y: 2 },  // Center of tile
  MID_NORTH: { x: 2, y: 1 },  // Between center and north edge
};

test.describe('008 - Movement Triggers Exploration', () => {
  test('Hero moves to edge using movement UI and triggers tile exploration', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection and select Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Set deterministic position for Quinn at center position for predictable testing
    // This is near the center, with enough movement to reach any edge
    const startPosition = NON_EDGE_POSITIONS.CENTER;
    await page.evaluate((pos) => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: pos }
      });
    }, startPosition);

    // Wait for position to be applied
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual(startPosition);
    }).toPass();

    await screenshots.capture(page, 'initial-hero-position', {
      programmaticCheck: async () => {
        // Verify it's Quinn's turn in Hero Phase
        await expect(page.locator('[data-testid="turn-indicator"]')).toContainText("Quinn's Turn");
        await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');
        
        // Verify hero token is visible
        await expect(page.locator('[data-testid="hero-token"]')).toBeVisible();
        
        // Verify 4 unexplored edges are visible
        const unexploredEdges = page.locator('[data-testid="unexplored-edge"]');
        await expect(unexploredEdges).toHaveCount(INITIAL_UNEXPLORED_EDGE_COUNT);
        
        // Verify tile deck shows initial count
        await expect(page.locator('[data-testid="tile-deck-count"]')).toHaveText(String(INITIAL_TILE_DECK_SIZE));
        
        // Verify Redux store state
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.heroTokens[0].position).toEqual(startPosition);
        expect(storeState.game.dungeon.tiles).toHaveLength(1);
        expect(storeState.game.dungeon.tileDeck).toHaveLength(INITIAL_TILE_DECK_SIZE);
      }
    });

    // STEP 2: Click on the board to show movement options
    await page.locator('[data-testid="start-tile"]').click();
    await page.locator('[data-testid="movement-overlay"]').waitFor({ state: 'visible' });

    // Target the north edge for exploration
    const targetEdge = EDGE_POSITIONS.NORTH;

    await screenshots.capture(page, 'movement-options-shown', {
      programmaticCheck: async () => {
        // Verify movement overlay is visible
        await expect(page.locator('[data-testid="movement-overlay"]')).toBeVisible();
        
        // Verify valid movement squares are displayed
        const moveSquares = page.locator('[data-testid="move-square"]');
        const squareCount = await moveSquares.count();
        expect(squareCount).toBeGreaterThan(0);
        
        // Verify north edge position is a valid move square
        // Quinn has speed 5, and from center (2,2) to north edge (2,0) is 2 squares, so it should be reachable
        const edgeSquare = page.locator(`[data-testid="move-square"][data-position-x="${targetEdge.x}"][data-position-y="${targetEdge.y}"]`);
        await expect(edgeSquare).toBeVisible();
        
        // Verify Redux state shows movement
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.showingMovement).toBe(true);
        expect(storeState.game.validMoveSquares.length).toBeGreaterThan(0);
      }
    });

    // STEP 3: Click on the north edge square to move hero to edge
    const edgeSquare = page.locator(`[data-testid="move-square"][data-position-x="${targetEdge.x}"][data-position-y="${targetEdge.y}"]`);
    await edgeSquare.click();

    // Wait for movement to complete (overlay should disappear)
    await expect(page.locator('[data-testid="movement-overlay"]')).not.toBeVisible();

    await screenshots.capture(page, 'hero-moved-to-edge', {
      programmaticCheck: async () => {
        // Verify movement overlay is gone
        await expect(page.locator('[data-testid="movement-overlay"]')).not.toBeVisible();
        
        // Verify hero token is still visible
        await expect(page.locator('[data-testid="hero-token"]')).toBeVisible();
        
        // Verify Redux state shows new position at edge
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.heroTokens[0].position).toEqual(targetEdge);
        expect(storeState.game.showingMovement).toBe(false);
        
        // Verify still in hero phase, no exploration yet
        expect(storeState.game.turnState.currentPhase).toBe('hero-phase');
        expect(storeState.game.dungeon.tiles).toHaveLength(1);
        expect(storeState.game.dungeon.tileDeck).toHaveLength(INITIAL_TILE_DECK_SIZE);
      }
    });

    // STEP 4: End the hero phase to trigger exploration
    await page.locator('[data-testid="end-phase-button"]').click();

    // Wait for exploration phase
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');

    await screenshots.capture(page, 'exploration-triggered', {
      programmaticCheck: async () => {
        // Verify we're now in exploration phase
        await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');
        
        // Verify Redux store state - should have placed a new tile
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Should have 2 tiles now (start tile + new tile)
        expect(storeState.game.dungeon.tiles).toHaveLength(2);
        
        // Tile deck should decrease by 1
        expect(storeState.game.dungeon.tileDeck).toHaveLength(TILE_DECK_SIZE_AFTER_EXPLORATION);
        
        // The north edge of start tile should now be 'open'
        const startTile = storeState.game.dungeon.tiles.find(
          (t: any) => t.id === 'start-tile'
        );
        expect(startTile.edges.north).toBe('open');
        
        // The new tile should exist
        const newTile = storeState.game.dungeon.tiles.find(
          (t: any) => t.id !== 'start-tile'
        );
        expect(newTile).toBeDefined();
        expect(newTile.position.row).toBe(-1); // North of start tile
        
        // Verify tile deck counter shows decreased count
        await expect(page.locator('[data-testid="tile-deck-count"]')).toHaveText(String(TILE_DECK_SIZE_AFTER_EXPLORATION));
        
        // **VISUAL VERIFICATION: Verify the new tile is rendered on the page**
        // Should have 2 tiles visible: start-tile and dungeon-tile
        await expect(page.locator('[data-testid="start-tile"]')).toBeVisible();
        await expect(page.locator('[data-testid="dungeon-tile"]')).toBeVisible();
        
        // Verify there are exactly 2 placed tiles in the dungeon map
        const placedTiles = page.locator('.placed-tile');
        await expect(placedTiles).toHaveCount(2);
      }
    });

    // STEP 5: Verify the explored edge is no longer unexplored
    await screenshots.capture(page, 'edge-now-explored', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // North edge of start-tile should no longer be unexplored
        const northEdgeUnexplored = storeState.game.dungeon.unexploredEdges.some(
          (e: any) => e.tileId === 'start-tile' && e.direction === 'north'
        );
        expect(northEdgeUnexplored).toBe(false);
        
        // Should now have unexplored edges from the new tile (excluding the connecting edge)
        // New tile connects from south, so it should have north, east, west unexplored
        const newTile = storeState.game.dungeon.tiles.find(
          (t: any) => t.id !== 'start-tile'
        );
        const newTileUnexploredEdges = storeState.game.dungeon.unexploredEdges.filter(
          (e: any) => e.tileId === newTile.id
        );
        expect(newTileUnexploredEdges.length).toBe(3); // north, east, west
      }
    });
  });

  test('Hero moves to south edge using UI and triggers exploration', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Set deterministic position for Quinn at (2, 5) - closer to south edge
    // This position is NOT on an edge (x=2 is middle, y=5 is not 0 or 7)
    const startPosition = { x: 2, y: 5 };
    await page.evaluate((pos) => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: pos }
      });
    }, startPosition);

    // Wait for position to be applied
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual(startPosition);
    }).toPass();

    // Click on the board to show movement options
    await page.locator('[data-testid="start-tile"]').click();
    await page.locator('[data-testid="movement-overlay"]').waitFor({ state: 'visible' });

    // Target the south edge for exploration
    const targetEdge = EDGE_POSITIONS.SOUTH;

    // Click on the south edge square to move hero to edge
    const southEdgeSquare = page.locator(`[data-testid="move-square"][data-position-x="${targetEdge.x}"][data-position-y="${targetEdge.y}"]`);
    await expect(southEdgeSquare).toBeVisible();
    await southEdgeSquare.click();

    // Wait for movement to complete
    await expect(page.locator('[data-testid="movement-overlay"]')).not.toBeVisible();

    // Verify hero moved to edge
    const storeState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(storeState.game.heroTokens[0].position).toEqual(targetEdge);

    // End hero phase to trigger exploration
    await page.locator('[data-testid="end-phase-button"]').click();
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');

    // Verify exploration occurred
    const finalState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    
    // Should have 2 tiles
    expect(finalState.game.dungeon.tiles).toHaveLength(2);
    
    // Tile deck should decrease by 1
    expect(finalState.game.dungeon.tileDeck).toHaveLength(TILE_DECK_SIZE_AFTER_EXPLORATION);
    
    // The south edge of start tile should now be 'open'
    const startTile = finalState.game.dungeon.tiles.find(
      (t: any) => t.id === 'start-tile'
    );
    expect(startTile.edges.south).toBe('open');
    
    // The new tile should be placed south of start tile
    const newTile = finalState.game.dungeon.tiles.find(
      (t: any) => t.id !== 'start-tile'
    );
    expect(newTile).toBeDefined();
    expect(newTile.position.row).toBe(1); // South of start tile
  });

  test('Hero movement to non-edge square does not trigger exploration', async ({ page }) => {
    // Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Set deterministic position for Quinn at center
    const startPosition = NON_EDGE_POSITIONS.CENTER;
    await page.evaluate((pos) => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: pos }
      });
    }, startPosition);

    // Wait for position to be applied
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual(startPosition);
    }).toPass();

    // Click on the board to show movement options
    await page.locator('[data-testid="start-tile"]').click();
    await page.locator('[data-testid="movement-overlay"]').waitFor({ state: 'visible' });

    // Move to a non-edge position - this will NOT trigger exploration
    const targetNonEdge = NON_EDGE_POSITIONS.MID_NORTH;
    const nonEdgeSquare = page.locator(`[data-testid="move-square"][data-position-x="${targetNonEdge.x}"][data-position-y="${targetNonEdge.y}"]`);
    await expect(nonEdgeSquare).toBeVisible();
    await nonEdgeSquare.click();

    // Wait for movement to complete
    await expect(page.locator('[data-testid="movement-overlay"]')).not.toBeVisible();

    // Verify hero moved to non-edge position
    const storeStateAfterMove = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(storeStateAfterMove.game.heroTokens[0].position).toEqual(targetNonEdge);

    // End hero phase
    await page.locator('[data-testid="end-phase-button"]').click();
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');

    // Verify NO exploration occurred (hero was not on edge)
    const finalState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    
    // Should still have only 1 tile
    expect(finalState.game.dungeon.tiles).toHaveLength(1);
    
    // Tile deck should still have initial count
    expect(finalState.game.dungeon.tileDeck).toHaveLength(INITIAL_TILE_DECK_SIZE);
    
    // All 4 edges should still be unexplored
    expect(finalState.game.dungeon.unexploredEdges).toHaveLength(INITIAL_UNEXPLORED_EDGE_COUNT);
  });
});
