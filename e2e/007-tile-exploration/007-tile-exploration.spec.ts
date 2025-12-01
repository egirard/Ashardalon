import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards } from '../helpers/screenshot-helper';

// Test constants for better readability
const INITIAL_TILE_DECK_SIZE = 8;
const TILE_DECK_SIZE_AFTER_EXPLORATION = 7;
// Start tile has 6 unexplored edges: north, south, 2 east (per sub-tile), 2 west (per sub-tile)
const INITIAL_UNEXPLORED_EDGE_COUNT = 6;
const NORTH_TILE_ROW_POSITION = -1;

test.describe('007 - Explore and Place New Tile', () => {
  test('Hero explores and reveals new tile', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection and select Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    // Select power cards for Quinn
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Set deterministic position for Quinn at (2, 2) for predictable initial screenshot
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

    // Verify initial state with unexplored edges
    await screenshots.capture(page, 'unexplored-edges', {
      programmaticCheck: async () => {
        // Verify 4 unexplored edges are visible
        const unexploredEdges = page.locator('[data-testid="unexplored-edge"]');
        await expect(unexploredEdges).toHaveCount(INITIAL_UNEXPLORED_EDGE_COUNT);
        
        // Verify tile deck shows initial count
        await expect(page.locator('[data-testid="tile-deck-count"]')).toHaveText(String(INITIAL_TILE_DECK_SIZE));
        
        // Verify we're in hero phase
        await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');
        
        // Verify Redux store state
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.dungeon.unexploredEdges).toHaveLength(INITIAL_UNEXPLORED_EDGE_COUNT);
        expect(storeState.game.dungeon.tileDeck).toHaveLength(INITIAL_TILE_DECK_SIZE);
        expect(storeState.game.dungeon.tiles).toHaveLength(1);
      }
    });

    // STEP 2: Move Quinn to an edge position (north edge at y=0)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 0 } }
      });
    });

    // Wait for position to be applied
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 0 });
    }).toPass();

    await screenshots.capture(page, 'hero-at-edge', {
      programmaticCheck: async () => {
        // Verify Quinn is at position (2, 0) - north edge
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 0 });
        
        // Hero should be visible
        await expect(page.locator('[data-testid="hero-token"]')).toBeVisible();
      }
    });

    // STEP 3: End the hero phase to trigger exploration
    await page.locator('[data-testid="end-phase-button"]').click();

    // Wait for exploration phase to complete
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');

    await screenshots.capture(page, 'new-tile-placed', {
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
        expect(newTile.position.row).toBe(NORTH_TILE_ROW_POSITION);
        
        // **VISUAL VERIFICATION: Verify the new tile is rendered on the page**
        // Should have 2 tiles visible: start-tile and dungeon-tile
        await expect(page.locator('[data-testid="start-tile"]')).toBeVisible();
        await expect(page.locator('[data-testid="dungeon-tile"]')).toBeVisible();
        
        // Verify there are exactly 2 placed tiles in the dungeon map
        const placedTiles = page.locator('.placed-tile');
        await expect(placedTiles).toHaveCount(2);
      }
    });

    // STEP 4: Verify the unexplored edge is now explored
    await screenshots.capture(page, 'edge-explored', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // North edge of start-tile should no longer be unexplored
        const northEdgeUnexplored = storeState.game.dungeon.unexploredEdges.some(
          (e: any) => e.tileId === 'start-tile' && e.direction === 'north'
        );
        expect(northEdgeUnexplored).toBe(false);
        
        // Tile deck count should show the count after exploration
        await expect(page.locator('[data-testid="tile-deck-count"]')).toHaveText(String(TILE_DECK_SIZE_AFTER_EXPLORATION));
      }
    });
  });

  test('Exploration does not trigger when hero is not on edge', async ({ page }) => {
    // Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    // Select power cards for Quinn
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Move Quinn to center position (not on edge)
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

    // End hero phase
    await page.locator('[data-testid="end-phase-button"]').click();
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');

    // Verify no new tile was placed
    const storeState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    
    // Should still have only 1 tile (start tile)
    expect(storeState.game.dungeon.tiles).toHaveLength(1);
    
    // Tile deck should still have initial count
    expect(storeState.game.dungeon.tileDeck).toHaveLength(INITIAL_TILE_DECK_SIZE);
    
    // All 4 edges should still be unexplored
    expect(storeState.game.dungeon.unexploredEdges).toHaveLength(INITIAL_UNEXPLORED_EDGE_COUNT);
  });

  test('Tile deck counter decreases after exploration', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    // Select power cards for Quinn
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Verify initial tile count
    await expect(page.locator('[data-testid="tile-deck-count"]')).toHaveText(String(INITIAL_TILE_DECK_SIZE));

    // Move Quinn to south edge
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 7 } }
      });
    });

    // End hero phase to trigger exploration
    await page.locator('[data-testid="end-phase-button"]').click();
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');

    // Verify tile deck count decreased
    await expect(page.locator('[data-testid="tile-deck-count"]')).toHaveText(String(TILE_DECK_SIZE_AFTER_EXPLORATION));
  });
});
