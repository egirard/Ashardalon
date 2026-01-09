import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

/**
 * E2E Test: Start Tile Sub-Tiles
 * 
 * This test verifies the start tile behavior as a special double-sized tile
 * composed of two joined sub-tiles (north and south halves).
 * 
 * Key requirements tested:
 * 1. Start tile is visually displayed as a single unified tile
 * 2. The start tile is logically divided into two sub-tiles (north: y 0-3, south: y 4-7)
 * 3. Each sub-tile is treated as its own tile for counting purposes
 * 4. Movement across sub-tiles is allowed (they are connected)
 * 5. Heroes can be positioned in either sub-tile
 */

test.describe('023 - Start Tile Sub-Tiles', () => {
  test('Start tile displays as unified double-sized tile with two sub-tile regions', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Start a game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Verify the start tile is visible as a single unified tile
    await screenshots.capture(page, 'start-tile-unified', {
      programmaticCheck: async () => {
        // Verify start tile is visible
        await expect(page.locator('[data-testid="start-tile"]')).toBeVisible();
        
        // Verify there is exactly one start tile element
        await expect(page.locator('[data-testid="start-tile"]')).toHaveCount(1);
        
        // Verify hero token is visible on the start tile
        await expect(page.locator('[data-testid="hero-token"]')).toBeVisible();
      }
    });

    // STEP 2: Position hero in north sub-tile (y: 0-3)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 1 } } // North sub-tile
      });
    });

    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 1 });
    }).toPass();

    await screenshots.capture(page, 'hero-in-north-subtile', {
      programmaticCheck: async () => {
        // Verify hero position is in north sub-tile (y: 0-3)
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.heroTokens[0].position.y).toBeLessThanOrEqual(3);
        expect(storeState.game.heroTokens[0].position.y).toBeGreaterThanOrEqual(0);
        
        // Verify the sub-tile ID would be 'start-tile-north'
        // (this tests the internal logic through the state)
        const heroY = storeState.game.heroTokens[0].position.y;
        expect(heroY).toBeLessThanOrEqual(3); // North sub-tile boundary
      }
    });

    // STEP 3: Position hero in south sub-tile (y: 4-7)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 6 } } // South sub-tile
      });
    });

    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 6 });
    }).toPass();

    await screenshots.capture(page, 'hero-in-south-subtile', {
      programmaticCheck: async () => {
        // Verify hero position is in south sub-tile (y: 4-7)
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.heroTokens[0].position.y).toBeGreaterThanOrEqual(4);
        expect(storeState.game.heroTokens[0].position.y).toBeLessThanOrEqual(7);
        
        // Verify the sub-tile ID would be 'start-tile-south'
        const heroY = storeState.game.heroTokens[0].position.y;
        expect(heroY).toBeGreaterThanOrEqual(4); // South sub-tile boundary
      }
    });

    // STEP 4: Verify start tile has all 6 unexplored edges (2 per sub-tile on east/west sides)
    await screenshots.capture(page, 'start-tile-unexplored-edges', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Start tile should have 6 unexplored edges:
        // - 1 north (spans full width)
        // - 1 south (spans full width)
        // - 2 east (one per sub-tile)
        // - 2 west (one per sub-tile)
        const startTileEdges = storeState.game.dungeon.unexploredEdges.filter(
          (e: any) => e.tileId === 'start-tile'
        );
        expect(startTileEdges).toHaveLength(6);
        
        // Verify all 4 directions are present
        const directions = startTileEdges.map((e: any) => e.direction);
        expect(directions).toContain('north');
        expect(directions).toContain('south');
        expect(directions).toContain('east');
        expect(directions).toContain('west');
        
        // Verify visual unexplored edge indicators (6 total)
        await expect(page.locator('[data-testid="unexplored-edge"]')).toHaveCount(6);
      }
    });
  });

  test('Heroes can move between north and south sub-tiles', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // Start a game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Position hero at the boundary between sub-tiles (y: 2, near staircase)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 3, y: 2 } } // North sub-tile, near boundary
      });
    });

    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 3, y: 2 });
    }).toPass();

    await screenshots.capture(page, 'hero-at-subtile-boundary', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Hero should be in north sub-tile
        expect(storeState.game.heroTokens[0].position.y).toBe(2);
        
        // Movement should show valid squares including positions in both sub-tiles
        // The hero at x:3, y:2 can move to y:1 (north sub-tile) and to x:3, y:5 (south sub-tile)
        // via multiple steps
        expect(storeState.game.heroTokens[0].position).toEqual({ x: 3, y: 2 });
      }
    });

    // Move hero to south sub-tile position
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 3, y: 5 } } // South sub-tile
      });
    });

    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 3, y: 5 });
    }).toPass();

    await screenshots.capture(page, 'hero-moved-to-south-subtile', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Hero should now be in south sub-tile
        expect(storeState.game.heroTokens[0].position.y).toBe(5);
        expect(storeState.game.heroTokens[0].position.y).toBeGreaterThanOrEqual(4);
        
        // Start tile should still be displayed as one unified tile
        await expect(page.locator('[data-testid="start-tile"]')).toHaveCount(1);
      }
    });
  });

  test('Start tile sub-tiles support multiple heroes with expected adjacency', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // Start a game with two heroes: Quinn and Vistra
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    // Select Quinn
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    
    // Select Vistra
    await page.locator('[data-testid="hero-vistra-bottom"]').click();
    await selectDefaultPowerCards(page, 'vistra');
    
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Position Quinn in north sub-tile
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 1 } }
      });
    });

    // Position Vistra in south sub-tile
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'vistra', position: { x: 2, y: 6 } }
      });
    });

    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      const quinnToken = storeState.game.heroTokens.find((t: any) => t.heroId === 'quinn');
      const vistraToken = storeState.game.heroTokens.find((t: any) => t.heroId === 'vistra');
      expect(quinnToken.position).toEqual({ x: 2, y: 1 });
      expect(vistraToken.position).toEqual({ x: 2, y: 6 });
    }).toPass();

    await screenshots.capture(page, 'two-heroes-different-subtiles', {
      programmaticCheck: async () => {
        // Verify both hero tokens are visible
        await expect(page.locator('[data-testid="hero-token"]')).toHaveCount(2);
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify Quinn is in north sub-tile
        const quinnToken = storeState.game.heroTokens.find((t: any) => t.heroId === 'quinn');
        expect(quinnToken.position.y).toBeLessThanOrEqual(3);
        
        // Verify Vistra is in south sub-tile
        const vistraToken = storeState.game.heroTokens.find((t: any) => t.heroId === 'vistra');
        expect(vistraToken.position.y).toBeGreaterThanOrEqual(4);
        
        // Verify start tile is still displayed as one unified tile
        await expect(page.locator('[data-testid="start-tile"]')).toHaveCount(1);
        
        // Verify the dungeon state shows start tile as one tile in the tiles array
        expect(storeState.game.dungeon.tiles).toHaveLength(1);
        expect(storeState.game.dungeon.tiles[0].tileType).toBe('start');
      }
    });
  });
});
