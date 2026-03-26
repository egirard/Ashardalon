import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('096 - Monster-Triggered Tile Exploration', () => {
  test('Complete monster exploration flow - Duergar Guard reveals new tile with monster that activates', async ({ page }) => {
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

    // STEP 2: Setup a scenario with a second tile and Duergar Guard on it.
    // The guard will be alone on a tile with unexplored edges.
    // NOTE: We use a tile ID of 'guard-tile' (not 'tile-2') to avoid a collision with
    // the auto-generated tile ID 'tile-2' that placeTile() creates when dungeon has 2 tiles.
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Add a second tile north of start tile.
      // Use a stable custom ID that won't conflict with auto-generated tile IDs
      // (placeTile generates IDs as `tile-${dungeon.tiles.length}`, so with 2 tiles
      // it would generate 'tile-2' — which is why we use 'guard-tile' here).
      const guardTile = {
        id: 'guard-tile',
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
      
      // Get current unexplored edges and replace start-tile's north with guard-tile's exits
      const state = store.getState();
      const newUnexploredEdges = state.game.dungeon.unexploredEdges.filter(
        (e: any) => !(e.tileId === 'start-tile' && e.direction === 'north')
      );
      newUnexploredEdges.push(
        { tileId: 'guard-tile', direction: 'north' },
        { tileId: 'guard-tile', direction: 'east' }
      );
      
      store.dispatch({
        type: 'game/addDungeonTiles',
        payload: {
          tiles: [guardTile],
          unexploredEdges: newUnexploredEdges
        }
      });
      
      // Move Quinn to the start tile (away from the guard's tile)
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 5 } }
      });
      
      // Place Duergar Guard on the guard tile (alone, with unexplored edges)
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'duergar-guard',
          instanceId: 'duergar-explorer',
          position: { x: 2, y: 3 },
          currentHp: 2,
          controllerId: 'quinn',
          tileId: 'guard-tile'
        }]
      });
    });
    
    await screenshots.capture(page, 'duergar-guard-on-tile-with-unexplored-edges', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.dungeon.tiles.length).toBe(2);
        
        const duergar = state.game.monsters.find((m: any) => m.monsterId === 'duergar-guard');
        expect(duergar).toBeDefined();
        expect(duergar.tileId).toBe('guard-tile');
        
        // Verify unexplored edges exist on the guard's tile
        const guardTileEdges = state.game.dungeon.unexploredEdges.filter((e: any) => e.tileId === 'guard-tile');
        expect(guardTileEdges.length).toBeGreaterThan(0);
      }
    });

    // Record tile count before exploration so we can verify it increased
    const tileCountBefore = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState().game.dungeon.tiles.length;
    });

    // Enable test mode to prevent auto-dismiss of notifications
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/setTestMode', payload: true });
    });

    // STEP 3: Transition to villain phase.
    // Dispatch endHeroPhase then endExplorationPhase in the same synchronous evaluate block
    // so the exploration auto-advance timer cannot fire between them.
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/endHeroPhase' });
      store.dispatch({ type: 'game/endExplorationPhase' });
    });
    
    await page.waitForFunction(() => {
      const s = (window as any).__REDUX_STORE__.getState();
      return s.game.turnState.currentPhase === 'villain-phase';
    });

    // Wait for either an encounter card OR the guard's exploration to happen.
    // The auto-activation $effect will activate the Duergar Guard once any encounter card
    // is dismissed. We wait for whichever comes first.
    await page.waitForFunction(() => {
      const s = (window as any).__REDUX_STORE__.getState();
      return s.game.drawnEncounter !== null || s.game.monsterExplorationEvent !== null;
    }, { timeout: 10000 });
    
    // Dismiss encounter card if present (encounter card blocks monster activation)
    const encounterButton = page.locator('[data-testid="dismiss-encounter-card"]');
    if (await encounterButton.isVisible({ timeout: 500 }).catch(() => false)) {
      await encounterButton.click();
      await encounterButton.waitFor({ state: 'hidden' });
    }
    
    // Now wait for the guard's exploration event.
    // The auto-activation $effect activates the guard as soon as no blockers remain,
    // and the guard explores because it has no heroes nearby but has unexplored edges.
    await page.waitForFunction(() => {
      const s = (window as any).__REDUX_STORE__.getState();
      return s.game.monsterExplorationEvent !== null;
    }, { timeout: 10000 });

    // STEP 5: Capture the exploration notification showing the Duergar Guard explored
    await screenshots.capture(page, 'monster-exploration-notification', {
      programmaticCheck: async () => {
        const notification = page.locator('[data-testid="monster-exploration-notification"]');
        await expect(notification).toBeVisible();
        await expect(notification).toContainText('Duergar Guard');
        
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.monsterExplorationEvent).not.toBeNull();
        // A new tile was placed by the guard's exploration
        expect(state.game.dungeon.tiles.length).toBeGreaterThan(tileCountBefore);
        // A new monster was spawned on the new tile
        expect(state.game.monsters.length).toBe(2);
      }
    });

    // STEP 6: Dismiss the exploration notification.
    // This triggers: monsterExplorationEvent = null, recentlySpawnedMonsterId = <new monster id>
    // The auto-activation effect is blocked by recentlySpawnedMonsterId (the fix for this bug).
    await page.evaluate(() => {
      const notification = document.querySelector('[data-testid="monster-exploration-notification"]');
      if (notification) {
        const store = (window as any).__REDUX_STORE__;
        store.dispatch({ type: 'game/dismissMonsterExplorationEvent' });
        // Hide the notification element (CSS workaround for Svelte reactivity in test mode)
        (notification as HTMLElement).style.display = 'none';
      }
    });
    
    await page.waitForFunction(() => (window as any).__REDUX_STORE__.getState().game.monsterExplorationEvent === null);

    // STEP 7: The spawned monster's card should now appear.
    // Verify the fix: recentlySpawnedMonsterId is set (blocking auto-activation until card is dismissed)
    await page.locator('[data-testid="monster-card"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'spawned-monster-card-appears', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        // Monster card is showing the newly spawned monster
        expect(state.game.recentlySpawnedMonsterId).not.toBeNull();
        // The spawned monster exists in state
        const spawnedMonster = state.game.monsters.find(
          (m: any) => m.instanceId === state.game.recentlySpawnedMonsterId
        );
        expect(spawnedMonster).toBeDefined();
        // Villain phase has NOT advanced past the spawned monster yet
        // (it's blocked waiting for the monster card to be dismissed)
        expect(state.game.villainPhaseMonsterIndex).toBe(1);
      }
    });

    // STEP 8: Dismiss the monster card.
    // This allows the auto-activation effect to fire and activate the newly spawned monster.
    await page.locator('[data-testid="dismiss-monster-card"]').click();
    await page.locator('[data-testid="monster-card"]').waitFor({ state: 'hidden' });

    // The spawned monster auto-activates. It may:
    //   (a) Show a move action notification (monsterMoveActionId set), or
    //   (b) Complete with no action and end the villain phase immediately
    await page.waitForFunction(() => {
      const s = (window as any).__REDUX_STORE__.getState();
      return (
        s.game.monsterMoveActionId !== null ||
        s.game.monsterAttackResult !== null ||
        s.game.turnState.currentPhase !== 'villain-phase'
      );
    }, { timeout: 5000 });

    // Dismiss the move action notification if shown, then wait for villain phase to end
    const moveButton = page.locator('[data-testid="dismiss-monster-move"]');
    if (await moveButton.isVisible({ timeout: 500 }).catch(() => false)) {
      await moveButton.click();
      await moveButton.waitFor({ state: 'hidden' });
    }

    // Wait for villain phase to fully complete
    await page.waitForFunction(() => {
      const s = (window as any).__REDUX_STORE__.getState();
      return s.game.turnState.currentPhase !== 'villain-phase';
    }, { timeout: 5000 });

    // STEP 9: Capture the final board state.
    // The spawned monster activated and the villain phase completed with both monsters active.
    // This confirms the fix: the mouther got its turn in the same villain phase as the guard.
    await screenshots.capture(page, 'spawned-monster-activates', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        // Villain phase ended normally (hero phase or exploration phase next)
        expect(state.game.turnState.currentPhase).not.toBe('villain-phase');
        // Both monsters are still in the game (guard + spawned mouther)
        expect(state.game.monsters.length).toBeGreaterThanOrEqual(2);
        // A new tile was placed by the guard's exploration
        expect(state.game.dungeon.tiles.length).toBeGreaterThan(tileCountBefore);
        // The spawned monster exists on the board
        const spawnedMonster = state.game.monsters.find(
          (m: any) => m.monsterId !== 'duergar-guard'
        );
        expect(spawnedMonster).toBeDefined();
      }
    });
  });
});
