import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

/**
 * Test 125 - Kobold Dragonshield Explore Behavior
 *
 * User Story:
 * After a hero explores and a Kobold Dragonshield spawns on the new tile,
 * the player sees:
 *  1. The monster card with 3 numbered activation instructions.
 *  2. During the villain phase, the Kobold explores the tile's unexplored edge
 *     (because no heroes are on its tile), not move toward reachable heroes.
 *  3. The monster-exploration notification appears showing the Kobold explored.
 *
 * This validates the fix for the bug where the Kobold would move toward heroes
 * even when it should explore per card rule #2.
 */

test.describe('125 - Kobold Dragonshield Explore Behavior', () => {
  test('Kobold explores when on tile with unexplored edge and no heroes present', async ({ page }) => {
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

    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.turnState.currentPhase === 'hero-phase';
    });

    // STEP 2: Set up a second tile south of the start tile (simulating hero exploration)
    // Quinn stays on start tile; Kobold is on the newly revealed south tile with unexplored edges
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;

      const southTile = {
        id: 'tile-south',
        tileType: 'tile-white-2exit-d',
        position: { col: 0, row: 1 },
        rotation: 0,
        edges: {
          north: 'open',
          south: 'unexplored',
          east: 'wall',
          west: 'wall'
        }
      };

      // Keep start tile's south edge connected; add south tile's unexplored edges
      const state = store.getState();
      const existingEdges = state.game.dungeon.unexploredEdges.filter(
        (e: any) => !(e.tileId === 'start-tile' && e.direction === 'south')
      );
      existingEdges.push({ tileId: 'tile-south', direction: 'south' });

      store.dispatch({
        type: 'game/addDungeonTiles',
        payload: {
          tiles: [southTile],
          unexploredEdges: existingEdges
        }
      });

      // Move Quinn to start tile (not on the kobold's tile)
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 2 } }
      });

      // Place Kobold on the south tile (just spawned, no heroes on its tile)
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-explorer',
          position: { x: 2, y: 5 },
          currentHp: 1,
          controllerId: 'quinn',
          tileId: 'tile-south'
        }]
      });

      store.dispatch({ type: 'game/hideMovement' });
    });

    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return (
        state.game.dungeon.tiles.length >= 2 &&
        state.game.monsters.some((m: any) => m.monsterId === 'kobold')
      );
    });

    // STEP 3: Open the monster mini-card to see the full monster card overlay
    await page.locator('[data-testid="monster-card-mini"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="monster-card-mini"]').click();
    await page.locator('[data-testid="monster-card-overlay"]').waitFor({ state: 'visible' });

    // SCREENSHOT 000: Monster card showing 3 numbered activation instructions
    await screenshots.capture(page, 'kobold-card-3-instructions', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="monster-card-overlay"]')).toBeVisible();
        await expect(page.locator('[data-testid="monster-name"]')).toContainText('Kobold');

        // Kobold should show 3 numbered activation instructions
        const instructions = page.locator('[data-testid="card-instructions"] li');
        await expect(instructions).toHaveCount(3);

        // Verify instruction text matches the official card rules
        await expect(instructions.nth(0)).toContainText('adjacent');
        await expect(instructions.nth(1)).toContainText('unexplored');
        await expect(instructions.nth(2)).toContainText('closest Hero');
      }
    });

    // Dismiss the monster card overlay
    await page.locator('[data-testid="dismiss-monster-card"]').click();
    await page.locator('[data-testid="monster-card-overlay"]').waitFor({ state: 'hidden' });

    // SCREENSHOT 001: Board state before villain phase - Kobold on south tile, Quinn on start tile
    await screenshots.capture(page, 'board-kobold-on-south-tile', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.dungeon.tiles.length).toBeGreaterThanOrEqual(2);
        expect(state.game.monsters.length).toBe(1);
        expect(state.game.monsters[0].monsterId).toBe('kobold');
        expect(state.game.monsters[0].tileId).toBe('tile-south');

        // Unexplored edge on the south tile
        const southEdges = state.game.dungeon.unexploredEdges.filter(
          (e: any) => e.tileId === 'tile-south'
        );
        expect(southEdges.length).toBeGreaterThan(0);
      }
    });

    // STEP 4: Enable test mode to prevent auto-dismiss of notifications
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/setTestMode', payload: true });
    });

    // Transition to villain phase
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/endHeroPhase' });
      store.dispatch({ type: 'game/endExplorationPhase' });
    });

    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.turnState.currentPhase === 'villain-phase';
    });

    // Dismiss encounter card if drawn
    const encounterButton = page.locator('[data-testid="dismiss-encounter-card"]');
    if (await encounterButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await encounterButton.click();
      await encounterButton.waitFor({ state: 'hidden' });
    }

    // STEP 5: Activate the Kobold - it should EXPLORE (not move toward Quinn)
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/activateNextMonster', payload: {} });
    });

    // Wait for the exploration event to be set in state
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return (
        state.game.monsterExplorationEvent !== null ||
        state.game.villainPhaseMonsterIndex > 0
      );
    }, { timeout: 5000 });

    // SCREENSHOT 002: Monster exploration notification - Kobold explored the south edge.
    // The tile is highlighted as newly placed. A monster is spawned on the new tile.
    await screenshots.capture(page, 'kobold-explores-south-edge', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());

        // Kobold should have explored (monsterExplorationEvent set), not moved
        expect(state.game.monsterExplorationEvent).not.toBeNull();
        expect(state.game.monsterMoveActionId).toBeNull();

        // The exploration notification is visible
        await expect(page.locator('[data-testid="monster-exploration-notification"]')).toBeVisible();
        await expect(page.locator('[data-testid="monster-exploration-notification"]')).toContainText('Kobold');

        // A new tile should have been placed (dungeon expanded) and highlighted
        expect(state.game.dungeon.tiles.length).toBeGreaterThan(2);
        expect(state.game.recentlyPlacedTileId).not.toBeNull();

        // A new monster should have spawned on the new tile
        expect(state.game.monsters.length).toBeGreaterThan(1);
        // The spawned monster instance ID is stored in the event (not shown as modal yet)
        expect(state.game.monsterExplorationEvent.spawnedMonsterInstanceId).not.toBeUndefined();
        expect(state.game.recentlySpawnedMonsterId).toBeNull(); // modal not shown yet

        // Log entry confirms a monster spawned (and appeared, not just spawned)
        const spawnLogs = state.game.logEntries.filter(
          (e: any) => e.message && e.message.toLowerCase().includes('appeared')
        );
        expect(spawnLogs.length).toBeGreaterThan(0);
      }
    });

    // Dismiss the exploration notification — this triggers the "monster appears" modal
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/dismissMonsterExplorationEvent' });
    });

    // Wait for the monster card modal to appear
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.recentlySpawnedMonsterId !== null;
    }, { timeout: 3000 });

    // SCREENSHOT 003: "Monster appears" interstitial - monster card shown after tile exploration
    await screenshots.capture(page, 'monster-appears-after-kobold-explored', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());

        // Monster card modal is now displayed
        expect(state.game.recentlySpawnedMonsterId).not.toBeNull();
        expect(state.game.monsterExplorationEvent).toBeNull(); // exploration notification gone

        // The monster card overlay should be visible
        await expect(page.locator('[data-testid="monster-card-overlay"]')).toBeVisible();

        // Spawned monster still present
        const spawnedMonster = state.game.monsters.find(
          (m: any) => m.instanceId === state.game.recentlySpawnedMonsterId
        );
        expect(spawnedMonster).toBeDefined();
      }
    });

    // Dismiss the monster card
    await page.locator('[data-testid="dismiss-monster-card"]').click();
    await page.locator('[data-testid="monster-card-overlay"]').waitFor({ state: 'hidden' });

    // SCREENSHOT 004: Expanded dungeon after both interstitials dismissed
    await screenshots.capture(page, 'expanded-dungeon-with-spawned-monster', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());

        // Dungeon has grown: new tile placed
        expect(state.game.dungeon.tiles.length).toBeGreaterThan(2);

        // Kobold still present on the south tile
        const kobold = state.game.monsters.find((m: any) => m.instanceId === 'kobold-explorer');
        expect(kobold).toBeDefined();

        // New monster was spawned on the explored tile (e.g. Gibbering Mouther)
        const spawnedMonster = state.game.monsters.find((m: any) => m.instanceId !== 'kobold-explorer');
        expect(spawnedMonster).toBeDefined();

        // Both exploration and spawn log entries exist
        const exploreLogs = state.game.logEntries.filter(
          (e: any) => e.message && e.message.toLowerCase().includes('kobold') && e.message.toLowerCase().includes('explor')
        );
        expect(exploreLogs.length).toBeGreaterThan(0);

        const spawnLogs = state.game.logEntries.filter(
          (e: any) => e.message && e.message.toLowerCase().includes('appeared')
        );
        expect(spawnLogs.length).toBeGreaterThan(0);
      }
    });
  });
});
