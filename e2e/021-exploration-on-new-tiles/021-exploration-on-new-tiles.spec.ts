import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from '../helpers/screenshot-helper';

// Test constants for better readability
const INITIAL_TILE_DECK_SIZE = 16;
const TILE_DECK_SIZE_AFTER_FIRST_EXPLORATION = 15;
const TILE_DECK_SIZE_AFTER_SECOND_EXPLORATION = 14;
const FIXED_SEED = 12345; // Fixed seed for reproducible tile draws

test.describe('021 - Exploration on Newly Placed Tiles', () => {
  test('Hero explores edge on a newly placed tile, triggering second exploration', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to the app and start game programmatically with fixed seed
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    // Start the game programmatically with a fixed seed for deterministic behavior
    // Need to also update heroes slice to select Quinn
    await page.evaluate((seed) => {
      const store = (window as any).__REDUX_STORE__;
      // First, select Quinn in heroes slice
      store.dispatch({ type: 'heroes/toggleHeroSelection', payload: 'quinn' });
      // Set up minimal power card selection for Quinn
      store.dispatch({ type: 'heroes/selectUtilityCard', payload: { heroId: 'quinn', cardId: 8 } });
      store.dispatch({ type: 'heroes/toggleAtWillCard', payload: { heroId: 'quinn', cardId: 2 } });
      store.dispatch({ type: 'heroes/toggleAtWillCard', payload: { heroId: 'quinn', cardId: 3 } });
      store.dispatch({ type: 'heroes/selectDailyCard', payload: { heroId: 'quinn', cardId: 5 } });
      store.dispatch({ type: 'heroes/finalizePowerCardSelections' });
      // Then start the game with fixed seed
      store.dispatch({ 
        type: 'game/startGame', 
        payload: { 
          heroIds: ['quinn'],
          positions: [{ x: 2, y: 2 }], // Deterministic starting position
          seed: seed
        } 
      });
    }, FIXED_SEED);
    
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Set deterministic starting position for Quinn at the north edge
    const startPosition = { x: 2, y: 0 };
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

    await screenshots.capture(page, 'initial-hero-at-edge', {
      programmaticCheck: async () => {
        // Verify it's Quinn's turn in Hero Phase
        await expect(page.locator('[data-testid="turn-indicator"]')).toContainText("Quinn's Turn");
        await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');
        
        // Verify hero token is visible
        await expect(page.locator('[data-testid="hero-token"]')).toBeVisible();
        
        // Verify 6 unexplored edges on start tile (north, south, 2 east per sub-tile, 2 west per sub-tile)
        const unexploredEdges = page.locator('[data-testid="unexplored-edge"]');
        await expect(unexploredEdges).toHaveCount(6);
        
        // Verify tile deck shows initial count
        await expect(page.locator('[data-testid="tile-deck-count"]')).toHaveText(String(INITIAL_TILE_DECK_SIZE));
        
        // Verify Redux store state
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.heroTokens[0].position).toEqual(startPosition);
        expect(storeState.game.dungeon.tiles).toHaveLength(1);
      }
    });

    // STEP 2: End hero phase to trigger FIRST exploration (place new tile north of start)
    await page.locator('[data-testid="end-phase-button"]').click();
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');

    await screenshots.capture(page, 'first-exploration-triggered', {
      programmaticCheck: async () => {
        // Verify we're in exploration phase
        await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');
        
        // Verify Redux store state - should have placed a new tile
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Should have 2 tiles now (start tile + new tile)
        expect(storeState.game.dungeon.tiles).toHaveLength(2);
        
        // Tile deck should decrease by 1
        expect(storeState.game.dungeon.tileDeck).toHaveLength(TILE_DECK_SIZE_AFTER_FIRST_EXPLORATION);
        
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
        await expect(page.locator('[data-testid="tile-deck-count"]')).toHaveText(String(TILE_DECK_SIZE_AFTER_FIRST_EXPLORATION));
        
        // Verify the new tile is rendered
        await expect(page.locator('[data-testid="start-tile"]')).toBeVisible();
        await expect(page.locator('[data-testid="dungeon-tile"]')).toBeVisible();
      }
    });

    // STEP 3: Complete the turn cycle programmatically (exploration -> villain -> back to hero phase)
    // Use programmatic dispatch to avoid UI blocking issues from monster cards/encounter cards
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/dismissMonsterCard' });
      store.dispatch({ type: 'game/endExplorationPhase' });
      store.dispatch({ type: 'game/dismissEncounterCard' });
      store.dispatch({ type: 'game/endVillainPhase' });
    });
    
    // Wait for hero phase
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');

    // STEP 4: Move hero to the NEW tile's north edge to test exploration on a newly placed tile
    // The new tile is at (col: 0, row: -1), so its bounds are x: 0-3, y: -4 to -1
    // The north edge of the new tile is y = -4
    const newTileNorthEdge = { x: 1, y: -4 };
    
    await page.evaluate((pos) => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: pos }
      });
    }, newTileNorthEdge);

    // Wait for position to be applied
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual(newTileNorthEdge);
    }).toPass();

    await screenshots.capture(page, 'hero-on-new-tile-edge', {
      programmaticCheck: async () => {
        // Verify hero is on the new tile's north edge
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.heroTokens[0].position).toEqual(newTileNorthEdge);
        
        // Verify still only 2 tiles before second exploration
        expect(storeState.game.dungeon.tiles).toHaveLength(2);
        
        // The first placed tile (tile-1) should have an unexplored north edge
        const newTile = storeState.game.dungeon.tiles.find(
          (t: any) => t.id !== 'start-tile'
        );
        expect(newTile.edges.north).toBe('unexplored');
        
        // Verify the north edge is in unexploredEdges
        const northEdgeUnexplored = storeState.game.dungeon.unexploredEdges.some(
          (e: any) => e.tileId !== 'start-tile' && e.direction === 'north'
        );
        expect(northEdgeUnexplored).toBe(true);
      }
    });

    // STEP 5: End hero phase to trigger SECOND exploration from the new tile's edge
    await page.locator('[data-testid="end-phase-button"]').click();
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');

    await screenshots.capture(page, 'second-exploration-triggered', {
      programmaticCheck: async () => {
        // Verify exploration phase
        await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');
        
        // Verify Redux store state - should now have 3 tiles
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Should have 3 tiles now (start tile + 2 new tiles)
        expect(storeState.game.dungeon.tiles).toHaveLength(3);
        
        // Tile deck should decrease by 1 again
        expect(storeState.game.dungeon.tileDeck).toHaveLength(TILE_DECK_SIZE_AFTER_SECOND_EXPLORATION);
        
        // Verify tile deck counter shows correct count
        await expect(page.locator('[data-testid="tile-deck-count"]')).toHaveText(String(TILE_DECK_SIZE_AFTER_SECOND_EXPLORATION));
        
        // There should now be 3 tiles visible on the board
        const placedTiles = page.locator('.placed-tile');
        await expect(placedTiles).toHaveCount(3);
      }
    });

    // STEP 6: Verify the dungeon now has 3 connected tiles
    await screenshots.capture(page, 'three-tiles-connected', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify 3 tiles exist
        expect(storeState.game.dungeon.tiles).toHaveLength(3);
        
        // Find the tiles
        const startTile = storeState.game.dungeon.tiles.find((t: any) => t.id === 'start-tile');
        const tile1 = storeState.game.dungeon.tiles.find((t: any) => t.position.row === -1);
        const tile2 = storeState.game.dungeon.tiles.find((t: any) => t.position.row === -2);
        
        // Verify tiles exist
        expect(startTile).toBeDefined();
        expect(tile1).toBeDefined();
        expect(tile2).toBeDefined();
        
        // Verify connections:
        // - Start tile's north edge is 'open' (connects to tile1)
        expect(startTile.edges.north).toBe('open');
        // - Tile1's south edge is 'open' (connects to start tile)
        expect(tile1.edges.south).toBe('open');
        // - Tile1's north edge is 'open' (connects to tile2)
        expect(tile1.edges.north).toBe('open');
        // - Tile2's south edge is 'open' (connects to tile1)
        expect(tile2.edges.south).toBe('open');
      }
    });
  });
});
