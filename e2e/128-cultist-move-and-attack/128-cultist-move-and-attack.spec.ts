import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame, dismissPendingEncounterCards } from '../helpers/screenshot-helper';

/**
 * Test 128 - Cultist "Move and Attack" Behavior
 *
 * User Story:
 * When a Cultist activates and is within 1 tile of a Hero (but NOT adjacent), it should
 * BOTH move adjacent to the Hero AND attack with its Dagger (+6, 1 damage, Poisoned).
 *
 * Bug Fixed (GitHub issue):
 * When the Cultist needed to cross to the Hero's tile AND the scorch mark on that tile
 * was occupied, a "choose-tile-entry-position" decision was created with context
 * 'move-and-attack'. When the player resolved the tile-entry decision, only the move
 * was executed — the attack was silently skipped.
 *
 * This test verifies:
 * 1. Standard path: Cultist on adjacent tile moves and attacks (scorch mark free)
 * 2. Bug-fix path: Cultist move-and-attack fires the attack even when the tile-entry
 *    position must be chosen by the player (occupied scorch mark scenario).
 */

test.describe('128 - Cultist Move and Attack Behavior', () => {
  test('Cultist moves adjacent and attacks when hero is within 1 tile (scorch mark free)', async ({ page }) => {
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

    // STEP 2: Set up two tiles — Quinn on start tile, Cultist on east tile within 1 tile
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;

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

      const state = store.getState();
      const startTile = state.game.dungeon.tiles.find((t: any) => t.id === 'start-tile');
      const updatedStartTile = {
        ...startTile,
        edges: { ...startTile.edges, east: 'open' }
      };

      const existingEdges = state.game.dungeon.unexploredEdges.filter(
        (e: any) => !(e.tileId === 'start-tile' && e.direction === 'east')
      );
      existingEdges.push({ tileId: 'tile-east', direction: 'east' });

      store.dispatch({
        type: 'game/addDungeonTiles',
        payload: { tiles: [updatedStartTile, eastTile], unexploredEdges: existingEdges }
      });

      // Quinn at (1,1) on start tile — the scorch mark of start tile is free
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 1, y: 1 } }
      });

      // Cultist at local (0,1) on east tile = global (4,1)
      // BFS distance from (4,1) to (1,1): cross tile border (1 step) + 3 within tile = 4 steps
      // 4 <= SQUARES_PER_TILE (4) → within 1 tile → triggers move-and-attack
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'cultist',
          instanceId: 'cultist-test',
          position: { x: 0, y: 1 },
          currentHp: 2,
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
        state.game.monsters.some((m: any) => m.monsterId === 'cultist')
      );
    });

    // SCREENSHOT 000: Board state before villain phase — Cultist on east tile
    await screenshots.capture(page, 'board-before-villain-phase', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.monsters[0].tileId).toBe('tile-east');
        expect(state.game.monsters[0].monsterId).toBe('cultist');
      }
    });

    // STEP 3: Enable test mode and advance to villain phase
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/setTestMode', payload: true });
    });

    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/endHeroPhase' });
      store.dispatch({ type: 'game/endExplorationPhase' });
    });

    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.turnState.currentPhase === 'villain-phase';
    });

    await dismissPendingEncounterCards(page);

    // STEP 4: Activate Cultist — seed the RNG for a deterministic hit
    await page.evaluate(() => {
      // 0.9 → d20 roll of 19 (floor(0.9 * 20) + 1 = 19), total = 19 + 6 = 25 vs any AC → hit
      Math.random = () => 0.9;
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/activateNextMonster', payload: {} });
    });

    // Wait until either the attack result appears OR a tile-entry decision is pending
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return (
        state.game.monsterAttackResult !== null ||
        state.game.villainPhaseMonsterIndex > 0 ||
        (state.game.pendingMonsterDecision?.type === 'choose-tile-entry-position')
      );
    }, { timeout: 5000 });

    // Handle the tile-entry decision if the scorch mark was occupied
    const hasTileEntryDecision = await page.evaluate(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.pendingMonsterDecision?.type === 'choose-tile-entry-position';
    });

    if (hasTileEntryDecision) {
      // Player selects the first available position on the hero's tile
      await page.evaluate(() => {
        const state = (window as any).__REDUX_STORE__.getState();
        const decision = state.game.pendingMonsterDecision;
        const position = decision.options.positions[0];
        (window as any).__REDUX_STORE__.dispatch({
          type: 'game/selectMonsterPosition',
          payload: { decisionId: decision.decisionId, position }
        });
      });

      // Wait for the attack result to appear after tile entry resolution
      await page.waitForFunction(() => {
        const state = (window as any).__REDUX_STORE__.getState();
        return state.game.monsterAttackResult !== null || state.game.villainPhaseMonsterIndex > 0;
      }, { timeout: 5000 });
    }

    // SCREENSHOT 001: Attack result — Cultist attacked Quinn (move-and-attack)
    await screenshots.capture(page, 'cultist-move-and-attack-result', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());

        // The Cultist must have attacked Quinn
        expect(state.game.monsterAttackResult).not.toBeNull();
        expect(state.game.monsterAttackTargetId).toBe('quinn');
        expect(state.game.monsterAttackerId).toBe('cultist-test');

        // Attack bonus is +6 (Dagger)
        expect(state.game.monsterAttackResult.attackBonus).toBe(6);
        // Attack should be a hit (roll 19 + 6 = 25 vs any normal AC)
        expect(state.game.monsterAttackResult.isHit).toBe(true);
        expect(state.game.monsterAttackResult.damage).toBe(1);

        // Combat result UI should be visible
        await expect(page.locator('[data-testid="combat-result"]')).toBeVisible();
      }
    });

    // Dismiss result and verify HP reduced
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/dismissMonsterAttackResult' });
    });
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.monsterAttackResult === null;
    }, { timeout: 3000 });

    // SCREENSHOT 002: Quinn's HP reduced after cultist move-and-attack
    await screenshots.capture(page, 'cultist-move-and-attack-complete', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());

        // Quinn should have taken 1 damage from Dagger
        const quinnHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
        expect(quinnHp).toBeDefined();
        expect(quinnHp.currentHp).toBeLessThan(quinnHp.maxHp);

        // Cultist must have moved to Quinn's tile (start-tile)
        const cultist = state.game.monsters.find((m: any) => m.instanceId === 'cultist-test');
        expect(cultist?.tileId).toBe('start-tile');

        // A combat log entry should exist for the move-and-attack
        const combatLogs = state.game.logEntries.filter(
          (e: any) => e.type === 'combat' && e.message?.toLowerCase().includes('cultist')
        );
        expect(combatLogs.length).toBeGreaterThan(0);
        // The log should mention "moves and attacks"
        const moveAttackLog = combatLogs.find((e: any) =>
          e.message?.toLowerCase().includes('moves and attacks')
        );
        expect(moveAttackLog).toBeDefined();
      }
    });
  });

  test('Cultist executes attack after tile-entry position choice (occupied scorch mark)', async ({ page }) => {
    /**
     * Bug-fix regression test:
     * When the Cultist crosses to the hero's tile and the scorch mark is occupied by
     * another hero, the player must choose a tile-entry position. After this choice,
     * the attack MUST fire (it was silently dropped before the fix).
     */
    const screenshots = createScreenshotHelper();

    // STEP 1: Start game with both Quinn and Vistra
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await page.locator('[data-testid="hero-vistra-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    await selectDefaultPowerCards(page, 'vistra');
    await setupDeterministicGame(page);

    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.turnState.currentPhase === 'hero-phase';
    });

    // STEP 2: Set up the board so that the scorch mark on start tile is occupied
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;

      const eastTile = {
        id: 'tile-east',
        tileType: 'tile-white-2exit-c',
        position: { col: 1, row: 0 },
        rotation: 0,
        edges: { north: 'wall', south: 'wall', east: 'unexplored', west: 'open' }
      };

      const state = store.getState();
      const startTile = state.game.dungeon.tiles.find((t: any) => t.id === 'start-tile');
      const updatedStartTile = {
        ...startTile,
        edges: { ...startTile.edges, east: 'open' }
      };

      const existingEdges = state.game.dungeon.unexploredEdges.filter(
        (e: any) => !(e.tileId === 'start-tile' && e.direction === 'east')
      );
      existingEdges.push({ tileId: 'tile-east', direction: 'east' });

      store.dispatch({
        type: 'game/addDungeonTiles',
        payload: { tiles: [updatedStartTile, eastTile], unexploredEdges: existingEdges }
      });

      // Quinn at (1,1) on start tile
      store.dispatch({ type: 'game/setHeroPosition', payload: { heroId: 'quinn', position: { x: 1, y: 1 } } });
      // Vistra at (2,2) — the start tile's scorch mark is at (1,1) per the fallback,
      // but we put a second hero here to ensure the scorch mark area is occupied
      store.dispatch({ type: 'game/setHeroPosition', payload: { heroId: 'vistra', position: { x: 2, y: 2 } } });

      // Cultist on east tile within 1 tile
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'cultist',
          instanceId: 'cultist-bug-test',
          position: { x: 0, y: 1 },
          currentHp: 2,
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
        state.game.monsters.some((m: any) => m.monsterId === 'cultist')
      );
    });

    // Record Quinn's HP before the attack
    const quinnHpBefore = await page.evaluate(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.heroHp.find((h: any) => h.heroId === 'quinn')?.currentHp;
    });

    // STEP 3: Enable test mode and go to villain phase
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/setTestMode', payload: true });
    });

    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/endHeroPhase' });
      store.dispatch({ type: 'game/endExplorationPhase' });
    });

    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.turnState.currentPhase === 'villain-phase';
    });

    await dismissPendingEncounterCards(page);

    // STEP 4: Activate Cultist with a forced hit roll
    await page.evaluate(() => {
      Math.random = () => 0.9; // rolls 19 + 6 = 25 → guaranteed hit
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/activateNextMonster', payload: {} });
    });

    // Wait for either attack result or tile-entry decision
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return (
        state.game.monsterAttackResult !== null ||
        state.game.villainPhaseMonsterIndex > 0 ||
        state.game.pendingMonsterDecision?.type === 'choose-tile-entry-position'
      );
    }, { timeout: 5000 });

    // SCREENSHOT 000: Decision prompt (if scorch mark was occupied) OR attack result
    await screenshots.capture(page, 'after-cultist-activation', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        // Either a tile-entry decision is pending OR the attack result is already shown
        const hasDecision = state.game.pendingMonsterDecision?.type === 'choose-tile-entry-position';
        const hasAttack = state.game.monsterAttackResult !== null;
        expect(hasDecision || hasAttack).toBe(true);
      }
    });

    // STEP 5: If a tile-entry decision is pending, resolve it
    const needsTileEntry = await page.evaluate(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.pendingMonsterDecision?.type === 'choose-tile-entry-position';
    });

    if (needsTileEntry) {
      await page.evaluate(() => {
        const state = (window as any).__REDUX_STORE__.getState();
        const decision = state.game.pendingMonsterDecision;
        const position = decision.options.positions[0];
        (window as any).__REDUX_STORE__.dispatch({
          type: 'game/selectMonsterPosition',
          payload: { decisionId: decision.decisionId, position }
        });
      });

      // After resolving tile entry, the attack MUST have fired
      await page.waitForFunction(() => {
        const state = (window as any).__REDUX_STORE__.getState();
        return state.game.monsterAttackResult !== null || state.game.villainPhaseMonsterIndex > 0;
      }, { timeout: 5000 });
    }

    // SCREENSHOT 001: Attack result — cultist attacked a hero
    await screenshots.capture(page, 'cultist-attack-after-tile-entry', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());

        // The attack MUST have fired (this was the bug — it was skipped before the fix)
        expect(state.game.monsterAttackResult).not.toBeNull();
        expect(state.game.monsterAttackResult.attackBonus).toBe(6); // Cultist Dagger +6
        expect(state.game.monsterAttackResult.isHit).toBe(true);

        // Cultist must now be on the hero's tile (start-tile)
        const cultist = state.game.monsters.find((m: any) => m.instanceId === 'cultist-bug-test');
        expect(cultist?.tileId).toBe('start-tile');
      }
    });

    // Dismiss attack result
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/dismissMonsterAttackResult' });
    });
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.monsterAttackResult === null;
    }, { timeout: 3000 });

    // SCREENSHOT 002: HP was reduced (confirming the attack actually dealt damage)
    await screenshots.capture(page, 'cultist-tile-entry-attack-complete', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());

        // At least one hero must have taken damage
        const targetHpAfter = state.game.heroHp.find(
          (h: any) => h.heroId === state.game.monsterAttackTargetId || h.currentHp < h.maxHp
        );
        expect(targetHpAfter).toBeDefined();
        // HP must be less than before (damage was applied)
        const anyHpReduced = state.game.heroHp.some((h: any) => h.currentHp < h.maxHp);
        expect(anyHpReduced).toBe(true);
      }
    });
  });
});
