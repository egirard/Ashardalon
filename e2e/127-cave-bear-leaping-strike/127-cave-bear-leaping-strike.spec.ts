import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame, dismissPendingEncounterCards } from '../helpers/screenshot-helper';

/**
 * Test 127 - Cave Bear Leaping Strike Behavior
 *
 * User Story:
 * When a Cave Bear activates and there are heroes within 1 tile (but NOT on the same tile),
 * the Cave Bear should move adjacent to the closest Hero and attack with a Leaping Strike
 * (+8 attack, 2 damage, Dazed). This is the second condition on the official cave bear card.
 *
 * This validates the fix for the bug where the Cave Bear had only 2 conditions:
 *   1. Same tile → Frenzy of Claws (all heroes on tile)
 *   2. Otherwise → Move
 *
 * After the fix, the Cave Bear correctly has 3 conditions:
 *   1. Same tile → Frenzy of Claws (+6, 2 dmg, all heroes)
 *   2. Within 1 tile → Move adjacent + Leaping Strike (+8, 2 dmg, Dazed)
 *   3. Otherwise → Move toward closest Hero
 */

test.describe('127 - Cave Bear Leaping Strike Behavior', () => {
  test('Cave Bear moves adjacent and uses Leaping Strike when hero is within 1 tile', async ({ page }) => {
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

    // STEP 2: Set up the dungeon with an east tile and place cave bear on it
    // Cave bear on east tile (within 1 tile of Quinn on start tile) → triggers Leaping Strike
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;

      // Add an east tile adjacent to the start tile
      const eastTile = {
        id: 'tile-east',
        tileType: 'tile-white-2exit-c',
        position: { col: 1, row: 0 },
        rotation: 0,
        edges: {
          north: 'wall',
          south: 'wall',
          east: 'unexplored',
          west: 'open'
        }
      };

      // Build the updated start tile with east edge open (for tile crossing to work)
      const state = store.getState();
      const startTile = state.game.dungeon.tiles.find((t: any) => t.id === 'start-tile');
      const updatedStartTile = {
        ...startTile,
        edges: {
          ...startTile.edges,
          east: 'open'
        }
      };

      // Remove start tile east from unexplored (it's now connected to east tile)
      const existingEdges = state.game.dungeon.unexploredEdges.filter(
        (e: any) => !(e.tileId === 'start-tile' && e.direction === 'east')
      );
      existingEdges.push({ tileId: 'tile-east', direction: 'east' });

      // addDungeonTiles now replaces existing tiles with same ID,
      // so passing updatedStartTile will correctly update the start tile's east edge.
      store.dispatch({
        type: 'game/addDungeonTiles',
        payload: { tiles: [updatedStartTile, eastTile], unexploredEdges: existingEdges }
      });

      // Position Quinn at (1, 1) on start tile — not on the east tile
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 1, y: 1 } }
      });

      // Place Cave Bear at local (0, 1) on east tile = global (4, 1)
      // Distance from (4,1) to (1,1) = 3 squares — within 1 tile (4 squares)
      // Different tile from Quinn → Frenzy of Claws does NOT trigger
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'cave-bear',
          instanceId: 'cave-bear-leaping',
          position: { x: 0, y: 1 },   // local position on east tile
          currentHp: 3,
          controllerId: 'quinn',
          tileId: 'tile-east'
        }]
      });

      store.dispatch({ type: 'game/hideMovement' });
    });

    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return (
        state.game.dungeon.tiles.length >= 2 &&
        state.game.monsters.some((m: any) => m.monsterId === 'cave-bear')
      );
    });

    // STEP 3: Open the Cave Bear monster card to verify it shows 3 instructions
    await page.locator('[data-testid="monster-card-mini"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="monster-card-mini"]').click();
    await page.locator('[data-testid="monster-card-overlay"]').waitFor({ state: 'visible' });

    // SCREENSHOT 000: Cave Bear card showing 3 numbered activation instructions
    await screenshots.capture(page, 'cave-bear-card-3-instructions', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="monster-card-overlay"]')).toBeVisible();
        await expect(page.locator('[data-testid="monster-name"]')).toContainText('Cave Bear');

        // Cave Bear should show 3 numbered activation instructions
        const instructions = page.locator('[data-testid="card-instructions"] li');
        await expect(instructions).toHaveCount(3);

        // Verify instruction text matches the official card rules
        await expect(instructions.nth(0)).toContainText('same tile');
        await expect(instructions.nth(0)).toContainText('Frenzy of Claws');
        await expect(instructions.nth(1)).toContainText('within 1 tile');
        await expect(instructions.nth(1)).toContainText('Leaping Strike');
        await expect(instructions.nth(2)).toContainText('closest Hero');

        // Verify "Hits all heroes on same tile" note appears ONLY after the adjacent attack (Frenzy of Claws),
        // NOT after the move-attack row (Leaping Strike)
        await expect(page.locator('[data-testid="attack-note-all-on-tile"]')).toBeVisible();

        // Verify DOM order: note must appear after adjacent-attack row but BEFORE move-attack row.
        // compareDocumentPosition bit 4 (0x4) means "follows" (the argument precedes the node).
        const noteBeforeMoveAttack = await page.evaluate(() => {
          const note = document.querySelector('[data-testid="attack-note-all-on-tile"]');
          const moveAttack = document.querySelector('[data-testid="monster-move-attack"]');
          if (!note || !moveAttack) return false;
          // note.compareDocumentPosition(moveAttack) returns DOCUMENT_POSITION_FOLLOWING (4)
          // if moveAttack comes after note in the DOM
          return !!(note.compareDocumentPosition(moveAttack) & Node.DOCUMENT_POSITION_FOLLOWING);
        });
        expect(noteBeforeMoveAttack).toBe(true);

        // The note should appear between the two attack rows — verify the move-attack label
        // shows "⚔ Move+Atk" (not a ranged attack icon "🏹 Range 1")
        const moveAttackRow = page.locator('[data-testid="monster-move-attack"]');
        await expect(moveAttackRow).toBeVisible();
        await expect(moveAttackRow).toContainText('Move+Atk');
        await expect(moveAttackRow).not.toContainText('Range');
        await expect(moveAttackRow).toContainText('Leaping Strike');
      }
    });

    // Dismiss the monster card overlay
    await page.locator('[data-testid="dismiss-monster-card"]').click();
    await page.locator('[data-testid="monster-card-overlay"]').waitFor({ state: 'hidden' });

    // SCREENSHOT 001: Board state — Cave Bear on east tile, Quinn on start tile
    await screenshots.capture(page, 'board-cave-bear-on-east-tile', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.dungeon.tiles.length).toBeGreaterThanOrEqual(2);
        expect(state.game.monsters.length).toBe(1);
        expect(state.game.monsters[0].monsterId).toBe('cave-bear');
        expect(state.game.monsters[0].tileId).toBe('tile-east');

        // Quinn is on start tile, NOT east tile — so Frenzy of Claws won't fire
        const quinn = state.game.heroTokens.find((t: any) => t.heroId === 'quinn');
        expect(quinn.position).toEqual({ x: 1, y: 1 });
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

    // Dismiss any encounter cards
    await dismissPendingEncounterCards(page);

    // STEP 5: Activate the Cave Bear — it should do Leaping Strike (not Frenzy of Claws)
    await page.evaluate(() => {
      // Seed Math.random so the attack roll is deterministic (0.95 → roll = 20, critical hit)
      Math.random = () => 0.95;
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/activateNextMonster', payload: {} });
    });

    // Wait for the Leaping Strike combat result (move-and-attack sets monsterAttackResult)
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.monsterAttackResult !== null || state.game.villainPhaseMonsterIndex > 0;
    }, { timeout: 5000 });

    // SCREENSHOT 002: Leaping Strike combat result shown
    await screenshots.capture(page, 'leaping-strike-combat-result', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());

        // The attack name should be 'Leaping Strike' — NOT 'Frenzy of Claws'
        expect(state.game.monsterAttackName).toBe('Leaping Strike');
        expect(state.game.monsterAttackResult).not.toBeNull();
        expect(state.game.monsterAttackTargetId).toBe('quinn');

        // Leaping Strike has attack bonus +8
        expect(state.game.monsterAttackResult.attackBonus).toBe(8);
        expect(state.game.monsterAttackResult.damage).toBeGreaterThan(0); // Critical hit: roll=20

        // Combat result UI should be visible
        await expect(page.locator('[data-testid="combat-result"]')).toBeVisible();
        await expect(page.locator('[data-testid="attacker-info"]')).toContainText('Cave Bear');
      }
    });

    // SCREENSHOT 003: Dismiss the combat result and verify Quinn took damage from Leaping Strike
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/dismissMonsterAttackResult' });
    });

    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.monsterAttackResult === null;
    }, { timeout: 3000 });

    await screenshots.capture(page, 'leaping-strike-complete', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());

        // Quinn should have taken damage from the Leaping Strike (attack bonus +8 with roll=20 critical)
        const quinnHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
        expect(quinnHp).toBeDefined();
        // With critical hit (roll=20), damage should be dealt
        expect(quinnHp.currentHp).toBeLessThan(quinnHp.maxHp);

        // Verify the combat log mentions the Cave Bear attacking Quinn
        const combatLogs = state.game.logEntries.filter(
          (e: any) => e.type === 'combat' && e.message && e.message.toLowerCase().includes('cave bear')
        );
        expect(combatLogs.length).toBeGreaterThan(0);

        // The last combat log should be a move-and-attack (moves and attacks)
        const lastLog = combatLogs[combatLogs.length - 1];
        expect(lastLog.message).toContain('Cave Bear');
      }
    });
  });
});
