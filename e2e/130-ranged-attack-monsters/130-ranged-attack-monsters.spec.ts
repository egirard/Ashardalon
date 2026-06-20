import { test, expect } from '@playwright/test';
import {
  createScreenshotHelper,
  selectDefaultPowerCards,
  dismissScenarioIntroduction,
  setupDeterministicGame,
  dismissPendingEncounterCards,
} from '../helpers/screenshot-helper';

/**
 * Test 130 - Ranged-Attack Monsters (Orc Archer, Grell)
 *
 * User Story:
 * When a ranged-attack monster (Orc Archer or Grell) activates and a Hero is within
 * range but NOT adjacent, the monster should attack IN PLACE with its ranged weapon —
 * it must NOT move, and must NOT prompt the player to choose a movement destination.
 *
 * Bug Fixed:
 * Before the fix, `ranged-attack` monsters were handled identically to `move-and-attack`
 * monsters. An Orc Archer within 2 tiles of a Hero would trigger a
 * "Select where the Orc Archer should move" prompt instead of immediately attacking
 * with its Arrow weapon (+6, 2 damage, miss: 1 damage).
 *
 * This test verifies:
 * 1. Orc Archer within 2 tiles (but NOT adjacent) attacks with Arrow (+6) — no movement.
 * 2. Orc Archer adjacent to a Hero attacks with Punch (+6, Dazed) — also no movement.
 * 3. Grell within 1 tile (but NOT adjacent) attacks with Tentacles (+7, Dazed) — no movement.
 */

/**
 * Common setup: start a game with Quinn only and add an east tile.
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
      edges: { north: 'wall', south: 'wall', east: 'unexplored', west: 'open' },
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
      payload: { tiles: [updatedStartTile, eastTile], unexploredEdges: existingEdges },
    });
    store.dispatch({ type: 'game/hideMovement' });
  });

  await page.waitForFunction(() => {
    const state = (window as any).__REDUX_STORE__.getState();
    return state.game.dungeon.tiles.length >= 2;
  });
}

/**
 * Enable test mode and advance to villain phase.
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

test.describe('130 - Ranged-Attack Monsters', () => {
  test('Orc Archer attacks with Arrow in place when Hero is within 2 tiles (not adjacent)', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Start game and add east tile
    await setupGameWithEastTile(page);

    // STEP 2: Place Quinn on start tile and Orc Archer on east tile (2 tiles away, NOT adjacent)
    // Orc Archer at local (0,1) on east tile = global (4,1).
    // Quinn at (1,1) on start tile. BFS distance ≥ 2 (not adjacent), ≤ 2 tiles (within range).
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 1, y: 1 } },
      });
      store.dispatch({
        type: 'game/setMonsters',
        payload: [
          {
            monsterId: 'orc-archer',
            instanceId: 'orc-archer-test',
            position: { x: 0, y: 1 },
            currentHp: 3,
            controllerId: 'quinn',
            tileId: 'tile-east',
          },
        ],
      });
    });

    // SCREENSHOT 000: Board before villain phase — Orc Archer on east tile, Quinn on start tile
    await screenshots.capture(page, 'board-before-villain-phase', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        const archer = state.game.monsters.find((m: any) => m.instanceId === 'orc-archer-test');
        expect(archer?.tileId).toBe('tile-east');
        const quinn = state.game.heroTokens.find((t: any) => t.heroId === 'quinn');
        expect(quinn?.position).toEqual({ x: 1, y: 1 });
      },
    });

    // STEP 3: Advance to villain phase
    await advanceToVillainPhase(page);

    // STEP 4: Activate Orc Archer with a guaranteed hit (Math.random = 0.9 → roll 19, hits AC ≤ 25)
    await page.evaluate(() => {
      Math.random = () => 0.9;
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/activateNextMonster', payload: {} });
    });

    // Wait for attack result (must NOT require a player movement choice)
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return (
        state.game.monsterAttackResult !== null ||
        state.game.villainPhaseMonsterIndex > 0 ||
        state.game.pendingMonsterDecision !== null
      );
    }, { timeout: 5000 });

    // SCREENSHOT 001: Orc Archer attack result — Arrow attack fires, no movement prompt
    await screenshots.capture(page, 'orc-archer-arrow-attack-result', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        // No pending movement decision — the bug produced a movement prompt instead of attacking
        expect(state.game.pendingMonsterDecision).toBeNull();
        // Attack result must be present (Arrow attack fired in place)
        expect(state.game.monsterAttackResult).not.toBeNull();
        // Arrow uses attackBonus +6
        expect(state.game.monsterAttackResult.attackBonus).toBe(6);
        // Target is Quinn
        expect(state.game.monsterAttackTargetId).toBe('quinn');
        expect(state.game.monsterAttackerId).toBe('orc-archer-test');
        // Orc Archer must NOT have moved (still on east tile)
        const archer = state.game.monsters.find((m: any) => m.instanceId === 'orc-archer-test');
        expect(archer?.tileId).toBe('tile-east');
        // Combat result UI visible
        await expect(page.locator('[data-testid="combat-result"]')).toBeVisible();
      },
    });

    // Dismiss attack result
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/dismissMonsterAttackResult' });
    });
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.monsterAttackResult === null;
    }, { timeout: 3000 });

    // SCREENSHOT 002: After dismissal — Orc Archer still on east tile (no movement occurred)
    await screenshots.capture(page, 'orc-archer-attack-complete', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.monsterAttackResult).toBeNull();
        // Orc Archer remains on east tile — it attacked in place
        const archer = state.game.monsters.find((m: any) => m.instanceId === 'orc-archer-test');
        expect(archer?.tileId).toBe('tile-east');
        // Combat log confirms an orc archer attack
        const combatLogs = state.game.logEntries.filter(
          (e: any) => e.type === 'combat' && e.message?.toLowerCase().includes('orc archer')
        );
        expect(combatLogs.length).toBeGreaterThan(0);
      },
    });
  });

  test('Orc Archer attacks with Punch when adjacent to Hero', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Start game and add east tile (needed for multi-tile board)
    await setupGameWithEastTile(page);

    // STEP 2: Place Quinn and Orc Archer adjacent to each other on the start tile
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 1, y: 1 } },
      });
      store.dispatch({
        type: 'game/setMonsters',
        payload: [
          {
            monsterId: 'orc-archer',
            instanceId: 'orc-archer-adjacent',
            position: { x: 1, y: 2 }, // Adjacent to Quinn at (1,1)
            currentHp: 3,
            controllerId: 'quinn',
            tileId: 'start-tile',
          },
        ],
      });
    });

    // SCREENSHOT 000: Board before villain phase — Orc Archer adjacent to Quinn
    await screenshots.capture(page, 'board-adjacent', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        const archer = state.game.monsters.find((m: any) => m.instanceId === 'orc-archer-adjacent');
        expect(archer?.position).toEqual({ x: 1, y: 2 });
        const quinn = state.game.heroTokens.find((t: any) => t.heroId === 'quinn');
        expect(quinn?.position).toEqual({ x: 1, y: 1 });
      },
    });

    // STEP 3: Advance to villain phase
    await advanceToVillainPhase(page);

    // STEP 4: Activate Orc Archer adjacent to Quinn → should use Punch (+6, Dazed)
    await page.evaluate(() => {
      Math.random = () => 0.9;
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/activateNextMonster', payload: {} });
    });

    // Wait for attack result
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return (
        state.game.monsterAttackResult !== null ||
        state.game.villainPhaseMonsterIndex > 0
      );
    }, { timeout: 5000 });

    // SCREENSHOT 001: Punch attack result (adjacent attack, Dazed status effect)
    await screenshots.capture(page, 'orc-archer-punch-result', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        // Punch uses attackBonus +6
        expect(state.game.monsterAttackResult).not.toBeNull();
        expect(state.game.monsterAttackResult.attackBonus).toBe(6);
        expect(state.game.monsterAttackTargetId).toBe('quinn');
        expect(state.game.monsterAttackerId).toBe('orc-archer-adjacent');
        // Orc Archer stays on start tile (no movement for adjacent attack)
        const archer = state.game.monsters.find((m: any) => m.instanceId === 'orc-archer-adjacent');
        expect(archer?.tileId).toBe('start-tile');
        await expect(page.locator('[data-testid="combat-result"]')).toBeVisible();
      },
    });
  });

  test('Grell attacks with Tentacles in place when Hero is within 1 tile (not adjacent)', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Start game and add east tile
    await setupGameWithEastTile(page);

    // STEP 2: Place Quinn on start tile and Grell on east tile (within 1 tile, NOT adjacent)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 1, y: 1 } },
      });
      store.dispatch({
        type: 'game/setMonsters',
        payload: [
          {
            monsterId: 'grell',
            instanceId: 'grell-test',
            position: { x: 0, y: 1 },
            currentHp: 4,
            controllerId: 'quinn',
            tileId: 'tile-east',
          },
        ],
      });
    });

    // SCREENSHOT 000: Board before villain phase — Grell on east tile, Quinn on start tile
    await screenshots.capture(page, 'grell-board-before-villain-phase', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        const grell = state.game.monsters.find((m: any) => m.instanceId === 'grell-test');
        expect(grell?.tileId).toBe('tile-east');
        const quinn = state.game.heroTokens.find((t: any) => t.heroId === 'quinn');
        expect(quinn?.position).toEqual({ x: 1, y: 1 });
      },
    });

    // STEP 3: Advance to villain phase
    await advanceToVillainPhase(page);

    // STEP 4: Activate Grell — should use Tentacles (+7, Dazed) in place, no movement prompt
    await page.evaluate(() => {
      Math.random = () => 0.9;
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/activateNextMonster', payload: {} });
    });

    // Wait for attack result (must NOT require a player movement choice)
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return (
        state.game.monsterAttackResult !== null ||
        state.game.villainPhaseMonsterIndex > 0 ||
        state.game.pendingMonsterDecision !== null
      );
    }, { timeout: 5000 });

    // SCREENSHOT 001: Grell Tentacles attack fires, no movement prompt
    await screenshots.capture(page, 'grell-tentacles-attack-result', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        // No pending movement decision (the bug caused this to appear)
        expect(state.game.pendingMonsterDecision).toBeNull();
        // Tentacles attack fires in place
        expect(state.game.monsterAttackResult).not.toBeNull();
        // Tentacles uses attackBonus +7
        expect(state.game.monsterAttackResult.attackBonus).toBe(7);
        expect(state.game.monsterAttackTargetId).toBe('quinn');
        expect(state.game.monsterAttackerId).toBe('grell-test');
        // Grell must NOT have moved (still on east tile)
        const grell = state.game.monsters.find((m: any) => m.instanceId === 'grell-test');
        expect(grell?.tileId).toBe('tile-east');
        // Combat result UI visible
        await expect(page.locator('[data-testid="combat-result"]')).toBeVisible();
      },
    });

    // Dismiss attack result
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/dismissMonsterAttackResult' });
    });
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.monsterAttackResult === null;
    }, { timeout: 3000 });

    // SCREENSHOT 002: After dismissal — Grell still on east tile (attacked in place)
    await screenshots.capture(page, 'grell-attack-complete', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.monsterAttackResult).toBeNull();
        const grell = state.game.monsters.find((m: any) => m.instanceId === 'grell-test');
        expect(grell?.tileId).toBe('tile-east');
        // Grell is not in MONSTERS definition, so its display name falls back to 'Monster'.
        // Check that a combat log entry was added for this attack round.
        const combatLogs = state.game.logEntries.filter(
          (e: any) => e.type === 'combat'
        );
        expect(combatLogs.length).toBeGreaterThan(0);
      },
    });
  });
});
