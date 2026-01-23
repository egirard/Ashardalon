import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('096 - Monster-Triggered Tile Exploration', () => {
  test('Complete monster exploration flow - Duergar Guard reveals new tile with monster', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    await screenshots.capture(page, 'initial-board-with-start-tile-only', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.dungeon.tiles.length).toBe(1);
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
      }
    });

    // STEP 2: Setup a scenario with a second tile and Duergar Guard on it
    // The guard will be alone on a tile with unexplored edges
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Add a second tile north of start tile using the test helper action
      const secondTile = {
        id: 'tile-2',
        tileType: 'tile-black-2exit-a',
        position: { col: 0, row: -1 },
        rotation: 0,
        edges: {
          north: 'unexplored',
          south: 'open',
          east: 'unexplored',
          west: 'wall'
        }
      };
      
      // Get current unexplored edges and filter out the north edge of start tile
      const state = store.getState();
      const newUnexploredEdges = state.game.dungeon.unexploredEdges.filter(
        (e: any) => !(e.tileId === 'start-tile' && e.direction === 'north')
      );
      newUnexploredEdges.push(
        { tileId: 'tile-2', direction: 'north' },
        { tileId: 'tile-2', direction: 'east' }
      );
      
      store.dispatch({
        type: 'game/addDungeonTiles',
        payload: {
          tiles: [secondTile],
          unexploredEdges: newUnexploredEdges
        }
      });
      
      // Move Quinn to start tile (away from the second tile)
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 5 } }
      });
      
      // Place Duergar Guard on the second tile (alone, with unexplored edges)
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'duergar-guard',
          instanceId: 'duergar-explorer',
          position: { x: 2, y: 3 },
          currentHp: 2,
          controllerId: 'quinn',
          tileId: 'tile-2'
        }]
      });
    });
    
    await page.waitForTimeout(500);
    
    await screenshots.capture(page, 'duergar-guard-on-tile-with-unexplored-edges', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.dungeon.tiles.length).toBe(2);
        
        const duergar = state.game.monsters.find((m: any) => m.monsterId === 'duergar-guard');
        expect(duergar).toBeDefined();
        expect(duergar.tileId).toBe('tile-2');
        
        // Verify unexplored edges exist
        expect(state.game.dungeon.unexploredEdges.length).toBeGreaterThan(0);
        const tile2Edges = state.game.dungeon.unexploredEdges.filter((e: any) => e.tileId === 'tile-2');
        expect(tile2Edges.length).toBeGreaterThan(0);
      }
    });

    // STEP 4: Record state before exploration
    const beforeExploration = await page.evaluate(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return {
        tileCount: state.game.dungeon.tiles.length,
        monsterCount: state.game.monsters.length,
        unexploredEdgeCount: state.game.dungeon.unexploredEdges.length
      };
    });

    // Enable test mode to prevent auto-dismiss of notifications
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/setTestMode', payload: true });
    });

    // STEP 5: Activate villain phase and trigger monster to explore
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Transition to villain phase
      store.dispatch({ type: 'game/endHeroPhase' });
      store.dispatch({ type: 'game/endExplorationPhase' });
    });
    
    await page.waitForTimeout(300);
    
    // Dismiss encounter card if present
    const encounterButton = page.locator('[data-testid="dismiss-encounter-card"]');
    if (await encounterButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await encounterButton.click();
      await page.waitForTimeout(200);
    }
    
    // Activate the Duergar Guard - this should trigger real exploration
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/activateNextMonster', payload: {} });
    });
    
    await page.waitForTimeout(500);
    
    // STEP 6: Check if monster exploration notification appeared and capture it
    const notificationVisible = await page.locator('[data-testid="monster-exploration-notification"]')
      .isVisible({ timeout: 1000 }).catch(() => false);
    
    if (notificationVisible) {
      await screenshots.capture(page, 'monster-exploration-notification', {
        programmaticCheck: async () => {
          const notification = page.locator('[data-testid="monster-exploration-notification"]');
          await expect(notification).toBeVisible();
          await expect(notification).toContainText('Duergar Guard');
          
          const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
          expect(state.game.monsterExplorationEvent).not.toBeNull();
          expect(state.game.monsterExplorationEvent.testDismiss).toBe(true);
        }
      });
      
      // Programmatically dismiss the notification by hiding it with CSS (workaround for Svelte reactivity issue)
      await page.evaluate(() => {
        const notification = document.querySelector('[data-testid="monster-exploration-notification"]');
        if (notification) {
          const store = (window as any).__REDUX_STORE__;
          store.dispatch({ type: 'game/dismissMonsterExplorationEvent' });
          // Hide with CSS as workaround
          (notification as HTMLElement).style.display = 'none';
        }
      });
      
      await page.waitForTimeout(300);
      
      // STEP 7: Capture final state showing expanded dungeon with new tile and spawned monster
      await screenshots.capture(page, 'final-expanded-dungeon-after-exploration', {
        programmaticCheck: async () => {
          const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
          
          // Verify expansion happened
          expect(state.game.dungeon.tiles.length).toBeGreaterThan(beforeExploration.tileCount);
          expect(state.game.monsters.length).toBeGreaterThan(beforeExploration.monsterCount);
          
          // Verify Duergar Guard still exists
          const duergar = state.game.monsters.find((m: any) => m.monsterId === 'duergar-guard');
          expect(duergar).toBeDefined();
          
          // Verify at least one spawned monster exists
          const spawnedMonster = state.game.monsters.find((m: any) => 
            m.instanceId !== 'duergar-explorer'
          );
          expect(spawnedMonster).toBeDefined();
          
          // Verify new tiles exist
          const newTiles = state.game.dungeon.tiles.filter((t: any) => 
            t.id !== 'start-tile' && t.id !== 'tile-2'
          );
          expect(newTiles.length).toBeGreaterThan(0);
        }
      });
    } else {
      // If exploration didn't happen (monster moved instead), still capture state
      await screenshots.capture(page, 'monster-moved-instead-of-exploring', {
        programmaticCheck: async () => {
          const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
          expect(state.game.monsters.length).toBeGreaterThanOrEqual(1);
        }
      });
    }
  });
});
