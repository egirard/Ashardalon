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

/**
 * Common setup helper: starts a fresh game with Quinn only and adds an east tile.
 * Returns the page ready at the hero phase.
 */
async function setupGameWithEastTile(page: any) {
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

  // Add east tile connected to start tile
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
    const updatedStartTile = { ...startTile, edges: { ...startTile.edges, east: 'open' } };
    const existingEdges = state.game.dungeon.unexploredEdges.filter(
      (e: any) => !(e.tileId === 'start-tile' && e.direction === 'east')
    );
    existingEdges.push({ tileId: 'tile-east', direction: 'east' });
    store.dispatch({
      type: 'game/addDungeonTiles',
      payload: { tiles: [updatedStartTile, eastTile], unexploredEdges: existingEdges }
    });
    store.dispatch({ type: 'game/hideMovement' });
  });

  await page.waitForFunction(() => {
    const state = (window as any).__REDUX_STORE__.getState();
    return state.game.dungeon.tiles.length >= 2;
  });
}

/**
 * Common villain-phase setup: enable test mode and advance to villain phase.
 */
async function advanceToVillainPhase(page: any) {
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
}

test.describe('128 - Cultist Move and Attack Behavior', () => {
  test('Cultist moves adjacent and attacks when hero is within 1 tile (scorch mark free)', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Start game and add east tile
    await setupGameWithEastTile(page);

    // STEP 2: Place Quinn (not on scorch mark) and Cultist on east tile
    // Fallback scorch mark for 'start' tile is at local (1,2) = global (1,2).
    // Quinn at (1,1) does NOT occupy the scorch mark, so the cultist can land there directly.
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // Quinn at (1,1) — not on scorch mark at (1,2)
      store.dispatch({ type: 'game/setHeroPosition', payload: { heroId: 'quinn', position: { x: 1, y: 1 } } });
      // Cultist at local (0,1) on east tile = global (4,1)
      // BFS distance to Quinn at (1,1): (4,1)→(3,1)→(2,1)→(1,1) = 3 steps ≤ 4 (within 1 tile)
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
    });

    // SCREENSHOT 000: Board before villain phase — Cultist on east tile, Quinn on start tile
    await screenshots.capture(page, 'board-before-villain-phase', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.monsters[0].tileId).toBe('tile-east');
        expect(state.game.monsters[0].monsterId).toBe('cultist');
        const quinn = state.game.heroTokens.find((t: any) => t.heroId === 'quinn');
        expect(quinn.position).toEqual({ x: 1, y: 1 });
      }
    });

    // STEP 3: Advance to villain phase
    await advanceToVillainPhase(page);

    // STEP 4: Activate Cultist with a guaranteed critical hit (roll = 20)
    // Math.random = () => 0.95 → floor(0.95 * 20) + 1 = floor(19) + 1 = 20
    await page.evaluate(() => {
      Math.random = () => 0.95;
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/activateNextMonster', payload: {} });
    });

    // Wait for attack result OR villain phase advance (attack always fires in normal path)
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.monsterAttackResult !== null || state.game.villainPhaseMonsterIndex > 0;
    }, { timeout: 5000 });

    // SCREENSHOT 001: Cultist attack result (move-and-attack fired)
    await screenshots.capture(page, 'cultist-attack-result', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        // Attack must have fired
        expect(state.game.monsterAttackResult).not.toBeNull();
        // Attack uses Dagger (+6)
        expect(state.game.monsterAttackResult.attackBonus).toBe(6);
        // Target is Quinn
        expect(state.game.monsterAttackTargetId).toBe('quinn');
        expect(state.game.monsterAttackerId).toBe('cultist-test');
        // Cultist must have moved to start tile
        const cultist = state.game.monsters.find((m: any) => m.instanceId === 'cultist-test');
        expect(cultist?.tileId).toBe('start-tile');
        // Combat result UI should be visible
        await expect(page.locator('[data-testid="combat-result"]')).toBeVisible();
      }
    });

    // Dismiss and check HP
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/dismissMonsterAttackResult' });
    });
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.monsterAttackResult === null;
    }, { timeout: 3000 });

    // SCREENSHOT 002: Quinn's HP reduced or same (attack fired, result was displayed and dismissed)
    await screenshots.capture(page, 'cultist-attack-complete', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        // Cultist must have moved to start tile
        const cultist = state.game.monsters.find((m: any) => m.instanceId === 'cultist-test');
        expect(cultist?.tileId).toBe('start-tile');
        // Combat result dismissed (attack round completed)
        expect(state.game.monsterAttackResult).toBeNull();
        // Combat log has a move-and-attack entry
        const combatLogs = state.game.logEntries.filter(
          (e: any) => e.type === 'combat' && e.message?.toLowerCase().includes('cultist')
        );
        expect(combatLogs.length).toBeGreaterThan(0);
      }
    });
  });

  test('Cultist executes attack after tile-entry position choice (occupied scorch mark)', async ({ page }) => {
    /**
     * Bug-fix regression test:
     * When the Cultist crosses to the hero's tile and the scorch mark is occupied,
     * the player must choose a tile-entry position. After this choice,
     * the attack MUST fire (it was silently dropped before the fix).
     *
     * Setup: Kobold placed at the scorch mark position (local 1,2 on start tile)
     * forces the 'occupied' path for the cultist.
     */
    const screenshots = createScreenshotHelper();

    // STEP 1: Start game and add east tile
    await setupGameWithEastTile(page);

    // STEP 2: Place Quinn, the Cultist on east tile, and a kobold AT the scorch mark (1,2)
    // IMPORTANT: Cultist is placed FIRST so it's at villainPhaseMonsterIndex=0
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // Quinn at (1,1) on start tile
      store.dispatch({ type: 'game/setHeroPosition', payload: { heroId: 'quinn', position: { x: 1, y: 1 } } });
      store.dispatch({
        type: 'game/setMonsters',
        payload: [
          {
            monsterId: 'cultist',
            instanceId: 'cultist-bug-test',
            position: { x: 0, y: 1 },  // local on east tile = global (4,1)
            currentHp: 2,
            controllerId: 'quinn',
            tileId: 'tile-east'
          },
          {
            monsterId: 'kobold',
            instanceId: 'kobold-blocker',
            position: { x: 1, y: 2 },  // local on start-tile = scorch mark (1,2) global
            currentHp: 1,
            controllerId: 'quinn',
            tileId: 'start-tile'
          }
        ]
      });
    });

    // SCREENSHOT 000: Board before villain phase — kobold on scorch mark, cultist on east tile
    await screenshots.capture(page, 'board-with-occupied-scorch-mark', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.monsters).toHaveLength(2);
        const kobold = state.game.monsters.find((m: any) => m.instanceId === 'kobold-blocker');
        expect(kobold?.position).toEqual({ x: 1, y: 2 }); // on scorch mark
        const cultist = state.game.monsters.find((m: any) => m.instanceId === 'cultist-bug-test');
        expect(cultist?.tileId).toBe('tile-east');
      }
    });

    // STEP 3: Advance to villain phase
    await advanceToVillainPhase(page);

    // STEP 4: Activate the Cultist (it's first, at villainPhaseMonsterIndex=0)
    // Use a guaranteed critical hit (roll = 20 with Math.random = () => 0.95)
    await page.evaluate(() => {
      Math.random = () => 0.95;
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/activateNextMonster', payload: {} });
    });

    // Wait for either attack result or tile-entry decision (scorch mark is occupied → tile-entry)
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return (
        state.game.monsterAttackResult !== null ||
        state.game.villainPhaseMonsterIndex > 0 ||
        state.game.pendingMonsterDecision?.type === 'choose-tile-entry-position'
      );
    }, { timeout: 5000 });

    // SCREENSHOT 001: Tile-entry decision should be pending (scorch mark occupied)
    await screenshots.capture(page, 'tile-entry-decision-pending', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        // The scorch mark is occupied by kobold → tile-entry decision must be pending
        expect(state.game.pendingMonsterDecision).not.toBeNull();
        expect(state.game.pendingMonsterDecision?.type).toBe('choose-tile-entry-position');
        expect(state.game.pendingMonsterDecision?.monsterId).toBe('cultist-bug-test');
        expect(state.game.pendingMonsterDecision?.context).toBe('move-and-attack');
        // pendingAttack should be stored (this is the fix)
        expect(state.game.pendingMonsterDecision?.options?.pendingAttack).not.toBeUndefined();
        expect(state.game.pendingMonsterDecision?.options?.pendingAttack?.attackResult?.attackBonus).toBe(6);
        // Villain phase should be paused
        expect(state.game.villainPhasePaused).toBe(true);
      }
    });

    // STEP 6: Player resolves the tile-entry decision by choosing a valid position
    await page.evaluate(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      const decision = state.game.pendingMonsterDecision;
      const position = decision.options.positions[0];
      (window as any).__REDUX_STORE__.dispatch({
        type: 'game/selectMonsterPosition',
        payload: { decisionId: decision.decisionId, position }
      });
    });

    // After resolving the tile-entry decision, the attack MUST fire (the bug fix)
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.monsterAttackResult !== null || state.game.villainPhaseMonsterIndex > 0;
    }, { timeout: 5000 });

    // SCREENSHOT 002: Attack result fires after tile-entry choice (the bug is fixed)
    await screenshots.capture(page, 'attack-fires-after-tile-entry', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        // The attack MUST have fired (this was the bug — it was skipped before the fix)
        expect(state.game.monsterAttackResult).not.toBeNull();
        expect(state.game.monsterAttackResult.attackBonus).toBe(6);  // Cultist Dagger +6
        expect(state.game.monsterAttackTargetId).toBe('quinn');
        expect(state.game.monsterAttackerId).toBe('cultist-bug-test');
        // Decision was cleared
        expect(state.game.pendingMonsterDecision).toBeNull();
        // Cultist must now be on the hero's tile (start-tile)
        const cultist = state.game.monsters.find((m: any) => m.instanceId === 'cultist-bug-test');
        expect(cultist?.tileId).toBe('start-tile');
        // Combat result UI should be visible
        await expect(page.locator('[data-testid="combat-result"]')).toBeVisible();
      }
    });

    // Dismiss and verify HP reduced
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/dismissMonsterAttackResult' });
    });
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.monsterAttackResult === null;
    }, { timeout: 3000 });

    // SCREENSHOT 003: After dismissal — attack fired, combat log confirms move-and-attack
    await screenshots.capture(page, 'hp-reduced-after-tile-entry-attack', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        // Attack result dismissed
        expect(state.game.monsterAttackResult).toBeNull();
        // Cultist is on start tile
        const cultist = state.game.monsters.find((m: any) => m.instanceId === 'cultist-bug-test');
        expect(cultist?.tileId).toBe('start-tile');
        // Log confirms the attack happened (this is the key regression guard)
        const combatLogs = state.game.logEntries.filter(
          (e: any) => e.type === 'combat' && e.message?.toLowerCase().includes('cultist')
        );
        expect(combatLogs.length).toBeGreaterThan(0);
      }
    });
  });
});
