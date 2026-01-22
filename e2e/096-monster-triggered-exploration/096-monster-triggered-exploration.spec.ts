import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('096 - Monster-Triggered Tile Exploration', () => {
  test('Kobold Dragonshield explores unexplored edge when no heroes on tile', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection and select Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    await screenshots.capture(page, 'initial-game-board', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
      }
    });

    // STEP 2: Set up test scenario - place Kobold on a newly placed tile with unexplored edge, hero stays on start tile
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      
      // First, manually add a second tile to the north of the start tile by directly modifying state
      const newTile = {
        id: 'tile-north',
        tileType: 'tile-black-2exit-a',
        position: { col: 0, row: -1 },
        rotation: 0,
        edges: {
          north: 'unexplored',
          south: 'open',  // Connected to start tile
          east: 'unexplored',
          west: 'wall'
        }
      };
      
      // Add the new tile
      state.game.dungeon.tiles.push(newTile);
      
      // Remove the north edge from start tile unexploredEdges and add new edges for the new tile
      state.game.dungeon.unexploredEdges = state.game.dungeon.unexploredEdges.filter((e: any) => 
        !(e.tileId === 'start-tile' && e.direction === 'north')
      );
      state.game.dungeon.unexploredEdges.push(
        { tileId: 'tile-north', direction: 'north' },
        { tileId: 'tile-north', direction: 'east' }
      );
      
      // Keep Quinn on the start tile
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 5 } }
      });
      
      // Place Kobold on the new northern tile at position (2, 3)
      // This tile has unexplored edges and no heroes
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-explorer',
          position: { x: 2, y: 3 },  // Local position on new tile
          currentHp: 1,
          controllerId: 'quinn',
          tileId: 'tile-north'  // On the new tile, not start tile
        }]
      });
    });
    
    // Wait for UI to update
    await page.waitForTimeout(100);
    
    await screenshots.capture(page, 'kobold-positioned-near-unexplored-edge', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.monsters.length).toBe(1);
        expect(state.game.monsters[0].monsterId).toBe('kobold');
        expect(state.game.monsters[0].tileId).toBe('tile-north');
        
        // Verify there's an unexplored north edge on tile-north
        const unexploredEdges = state.game.dungeon.unexploredEdges;
        const northEdge = unexploredEdges.find((e: any) => 
          e.tileId === 'tile-north' && e.direction === 'north'
        );
        expect(northEdge).toBeDefined();
        
        // Verify we have 2 tiles now
        expect(state.game.dungeon.tiles.length).toBe(2);
      }
    });

    // STEP 3: Transition to villain phase and activate the Kobold
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Transition to villain phase
      store.dispatch({ type: 'game/endHeroPhase' });
      store.dispatch({ type: 'game/endExplorationPhase' });
    });
    
    // Wait for encounter card if drawn
    await page.waitForTimeout(200);
    
    // Dismiss any encounter card
    const encounterDismissButton = page.locator('[data-testid="dismiss-encounter-card"]');
    if (await encounterDismissButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await encounterDismissButton.click();
      await page.waitForTimeout(100);
    }
    
    // Activate the Kobold monster
    const result = await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Manually trigger monster activation
      store.dispatch({ type: 'game/activateNextMonster', payload: {} });
      
      // Return the state for verification
      return store.getState();
    });
    
    // VERIFICATION: Kobold should have explored the north edge
    const dungeon = result.game.dungeon;
    const unexploredEdges = dungeon.unexploredEdges;
    
    // North edge of tile-north should now be explored (removed from unexploredEdges)
    const northEdgeStillExists = unexploredEdges.some((e: any) => 
      e.tileId === 'tile-north' && e.direction === 'north'
    );
    expect(northEdgeStillExists).toBe(false);
    
    // A new tile should have been placed (we started with 2: start-tile + tile-north, so should now have 3)
    expect(dungeon.tiles.length).toBeGreaterThan(2);
    
    // A new monster should have spawned on the new tile
    expect(result.game.monsters.length).toBeGreaterThan(1);
    
    // Wait for the monster exploration notification to appear
    await page.waitForTimeout(200);
    
    await screenshots.capture(page, 'kobold-explored-notification', {
      programmaticCheck: async () => {
        // Verify the notification is visible
        await expect(page.locator('[data-testid="monster-exploration-notification"]')).toBeVisible();
        
        // Verify the state has monsterExplorationEvent
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.monsterExplorationEvent).not.toBeNull();
        expect(state.game.monsterExplorationEvent.monsterName).toBe('Kobold Dragonshield');
        expect(state.game.monsterExplorationEvent.direction).toBe('north');
      }
    });
    
    // Wait for notification to auto-dismiss
    await page.waitForTimeout(3500);
    
    await screenshots.capture(page, 'new-tile-revealed-with-monster', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        
        // Notification should be dismissed
        expect(state.game.monsterExplorationEvent).toBeNull();
        
        // Verify new tile and monster are on the board
        expect(state.game.dungeon.tiles.length).toBeGreaterThan(1);
        expect(state.game.monsters.length).toBeGreaterThan(1);
      }
    });
  });

  test('Duergar Guard explores unexplored edge when no heroes on tile', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection and select Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    await screenshots.capture(page, 'duergar-initial-board', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
      }
    });

    // STEP 2: Set up test scenario - place Duergar Guard on a new tile with unexplored edge
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      
      // Add a tile to the south
      const newTile = {
        id: 'tile-south',
        tileType: 'tile-black-2exit-b',
        position: { col: 0, row: 1 },
        rotation: 0,
        edges: {
          north: 'open',  // Connected to start tile
          south: 'unexplored',
          east: 'unexplored',
          west: 'wall'
        }
      };
      
      state.game.dungeon.tiles.push(newTile);
      state.game.dungeon.unexploredEdges = state.game.dungeon.unexploredEdges.filter((e: any) => 
        !(e.tileId === 'start-tile' && e.direction === 'south')
      );
      state.game.dungeon.unexploredEdges.push(
        { tileId: 'tile-south', direction: 'south' },
        { tileId: 'tile-south', direction: 'east' }
      );
      
      // Move Quinn to start tile
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 2 } }
      });
      
      // Add a Duergar Guard on the southern tile
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'duergar-guard',
          instanceId: 'duergar-explorer',
          position: { x: 2, y: 3 },  // Position on southern tile
          currentHp: 2,
          controllerId: 'quinn',
          tileId: 'tile-south'
        }]
      });
    });
    
    await page.waitForTimeout(100);
    
    await screenshots.capture(page, 'duergar-positioned-near-edge', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.monsters.length).toBe(1);
        expect(state.game.monsters[0].monsterId).toBe('duergar-guard');
      }
    });

    // STEP 3: Activate Duergar Guard
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/endHeroPhase' });
      store.dispatch({ type: 'game/endExplorationPhase' });
    });
    
    await page.waitForTimeout(200);
    
    // Dismiss encounter card if any
    const encounterDismissButton = page.locator('[data-testid="dismiss-encounter-card"]');
    if (await encounterDismissButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await encounterDismissButton.click();
      await page.waitForTimeout(100);
    }
    
    // Activate the monster
    const result = await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/activateNextMonster', payload: {} });
      return store.getState();
    });
    
    // VERIFICATION: Duergar should have explored an edge
    expect(result.game.dungeon.tiles.length).toBeGreaterThan(2); // start-tile + tile-south + new tile
    expect(result.game.monsters.length).toBeGreaterThan(1);
    
    await page.waitForTimeout(200);
    
    await screenshots.capture(page, 'duergar-explored-notification', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="monster-exploration-notification"]')).toBeVisible();
        
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.monsterExplorationEvent).not.toBeNull();
        expect(state.game.monsterExplorationEvent.monsterName).toBe('Duergar Guard');
      }
    });
  });

  test('Monster does NOT explore when hero is present on same tile', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    await screenshots.capture(page, 'hero-and-kobold-same-tile-initial', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
      }
    });

    // STEP 2: Place Kobold on same tile as hero (hero at 2,5, kobold at 2,3)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Hero stays on start tile at position (2, 5)
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 5 } }
      });
      
      // Add Kobold on same tile but at different position
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-blocked',
          position: { x: 2, y: 3 },  // On same tile as hero
          currentHp: 1,
          controllerId: 'quinn',
          tileId: 'start-tile'
        }]
      });
    });
    
    await page.waitForTimeout(100);
    
    await screenshots.capture(page, 'kobold-with-hero-on-tile', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.monsters.length).toBe(1);
        
        // Both on start tile
        const hero = state.game.heroTokens[0];
        const monster = state.game.monsters[0];
        expect(monster.tileId).toBe('start-tile');
      }
    });

    // STEP 3: Activate monster - should NOT explore because hero is on same tile
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/endHeroPhase' });
      store.dispatch({ type: 'game/endExplorationPhase' });
    });
    
    await page.waitForTimeout(200);
    
    const encounterDismissButton = page.locator('[data-testid="dismiss-encounter-card"]');
    if (await encounterDismissButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await encounterDismissButton.click();
      await page.waitForTimeout(100);
    }
    
    const result = await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/activateNextMonster', payload: {} });
      return store.getState();
    });
    
    // VERIFICATION: No exploration should have occurred
    // Number of tiles should still be 1 (start tile only)
    expect(result.game.dungeon.tiles.length).toBe(1);
    
    // No exploration event should be present
    expect(result.game.monsterExplorationEvent).toBeNull();
    
    await screenshots.capture(page, 'kobold-moved-but-did-not-explore', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        
        // Verify no new tiles
        expect(state.game.dungeon.tiles.length).toBe(1);
        
        // Verify no exploration notification
        const notification = page.locator('[data-testid="monster-exploration-notification"]');
        await expect(notification).not.toBeVisible();
      }
    });
  });
});
