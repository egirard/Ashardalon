import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction } from '../helpers/screenshot-helper';

/**
 * Test 065: Cross-Tile Adjacency
 * 
 * This test verifies that monsters on adjacent tiles but adjacent in global coordinates
 * are correctly identified as valid attack targets.
 * 
 * User Story:
 * As a player positioned at the edge of one tile, when a monster spawns on an adjacent
 * tile but is adjacent to my position in global coordinates, I should be able to target
 * and attack that monster, as it is adjacent to me for gameplay purposes.
 */
test.describe('065 - Cross-Tile Adjacency', () => {
  test('hero can target monsters on adjacent tile when adjacent in global coordinates', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection and select Vistra (Fighter)
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-vistra"]').click();

    // Select power cards for Vistra
    await selectDefaultPowerCards(page, 'vistra');

    await screenshots.capture(page, '001-hero-selected', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="hero-vistra"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled();
      }
    });

    // STEP 2: Start the game
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // STEP 3: Set hero at eastern edge of start tile (x=3, y=2)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'vistra', position: { x: 3, y: 2 } }
      });
    });

    // Wait for position update
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 3, y: 2 });
    }).toPass();

    // Disable animations for stable screenshots
    await page.addStyleTag({
      content: `
        * {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    });

    await screenshots.capture(page, '002-hero-at-edge', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        expect(storeState.game.heroTokens[0].position).toEqual({ x: 3, y: 2 });
        expect(storeState.game.monsters.length).toBe(0);
      }
    });

    // STEP 4: Place an east tile adjacent to the start tile
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Place a tile to the east (col=1, row=0)
      store.dispatch({
        type: 'game/placeTile',
        payload: {
          tile: {
            id: 'test-east-tile',
            tileType: 'black-1',
            position: { col: 1, row: 0 },
            rotation: 0
          }
        }
      });
    });

    // Wait for tile placement
    await page.waitForTimeout(500);

    await screenshots.capture(page, '003-east-tile-placed', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify east tile was placed
        const eastTile = storeState.game.dungeon.tiles.find(
          (t: any) => t.id === 'test-east-tile'
        );
        expect(eastTile).toBeDefined();
        expect(eastTile?.position).toEqual({ col: 1, row: 0 });
      }
    });

    // STEP 5: Spawn a monster on the east tile at local position (0, 2)
    // In global coordinates, this is (4, 2), which is adjacent to hero at (3, 2)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          instanceId: 'test-kobold-east',
          monsterId: 'kobold',
          tileId: 'test-east-tile',
          position: { x: 0, y: 2 }, // Local position on east tile
          currentHp: 3,
          controllerId: 'vistra'
        }]
      });
    });

    // Wait for monster spawn
    await page.waitForTimeout(500);

    await screenshots.capture(page, '004-monster-on-adjacent-tile', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify monster was spawned on east tile
        expect(storeState.game.monsters.length).toBe(1);
        expect(storeState.game.monsters[0].tileId).toBe('test-east-tile');
        expect(storeState.game.monsters[0].position).toEqual({ x: 0, y: 2 });
        
        // Verify hero position
        expect(storeState.game.heroTokens[0].position).toEqual({ x: 3, y: 2 });
      }
    });

    // STEP 6: Verify attack panel is visible (monster is a valid target)
    await screenshots.capture(page, '005-attack-panel-visible', {
      programmaticCheck: async () => {
        // The attack panel should be visible since monster is adjacent in global coords
        const attackPanel = page.locator('[data-testid="power-card-attack-panel"]');
        const panelVisible = await attackPanel.isVisible();
        
        expect(panelVisible).toBe(true);
        
        // Verify attack cards are shown
        const attackCardList = page.locator('[data-testid="attack-card-list"]');
        await expect(attackCardList).toBeVisible();
        
        const attackCards = await attackCardList.locator('button[data-testid^="attack-card-"]').count();
        expect(attackCards).toBeGreaterThan(0);
        
        // Verify the monster shows up in the targetable list
        const monsterTargets = await attackPanel.locator('[data-testid^="monster-target-"]').count();
        expect(monsterTargets).toBeGreaterThan(0);
      }
    });

    // STEP 7: Test with monster on north tile as well
    // First, move hero to northern edge of start tile
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'vistra', position: { x: 2, y: 0 } }
      });
    });

    // Place a north tile
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      store.dispatch({
        type: 'game/placeTile',
        payload: {
          tile: {
            id: 'test-north-tile',
            tileType: 'black-2',
            position: { col: 0, row: -1 },
            rotation: 0
          }
        }
      });
    });

    // Spawn monster on north tile at local (2, 3) = global (2, -1)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          instanceId: 'test-kobold-north',
          monsterId: 'kobold',
          tileId: 'test-north-tile',
          position: { x: 2, y: 3 }, // Local position on north tile
          currentHp: 3,
          controllerId: 'vistra'
        }]
      });
    });

    await page.waitForTimeout(500);

    await screenshots.capture(page, '006-monster-on-north-tile', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify monster on north tile
        expect(storeState.game.monsters.length).toBe(1);
        expect(storeState.game.monsters[0].tileId).toBe('test-north-tile');
        
        // Verify attack panel still visible
        const attackPanel = page.locator('[data-testid="power-card-attack-panel"]');
        await expect(attackPanel).toBeVisible();
      }
    });
  });
});
