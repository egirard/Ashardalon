import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from '../helpers/screenshot-helper';
import { TILE_DEFINITIONS } from '../../src/store/types';
import type { Direction } from '../../src/store/types';

/**
 * Test 114 - Long Hallway Special Rule
 *
 * User Story:
 * As a player, when I explore and draw the Long Hallway tile, the game
 * automatically draws and places a second tile on the hallway's open end.
 * An encounter card is drawn during the Villain Phase unless both the Long
 * Hallway and the second tile have white arrows.
 *
 * Seeds used:
 * - Seed 51: long-hallway-black is first tile → encounter drawn (black tile)
 * - Seed 16: long-hallway-white is first, white tile is second → no encounter
 */

const SEED_LONG_HALLWAY_BLACK = 51;  // First tile is tile-long-hallway-black
const SEED_LONG_HALLWAY_WHITE = 16;  // First tile is tile-long-hallway-white, second is white

const SCORCH_MARK_TO_DIRECTION: Record<string, Direction> = {
  '2,1': 'north',
  '1,1': 'west',
  '2,2': 'east',
};

type DungeonTileSnapshot = {
  id: string;
  tileType: string;
  rotation: number;
  position: { col: number; row: number };
};

function canonicalArrowDirection(tileType: string): Direction {
  const tileDef = TILE_DEFINITIONS.find(t => t.tileType === tileType);
  if (!tileDef) {
    throw new Error(`Tile definition not found for ${tileType}`);
  }
  const { x, y } = tileDef.scorchMarkPosition;
  return SCORCH_MARK_TO_DIRECTION[`${x},${y}`] ?? 'south';
}

function rotateDirectionClockwise(direction: Direction, rotation: number): Direction {
  const normalized = ((rotation % 360) + 360) % 360;
  const order: Direction[] = ['north', 'east', 'south', 'west'];
  const index = order.indexOf(direction);
  const steps = normalized / 90;
  return order[(index + steps) % 4];
}

function getArrowDirection(tileType: string, rotation: number): Direction {
  return rotateDirectionClockwise(canonicalArrowDirection(tileType), rotation);
}

function directionFromTileToTile(fromTile: DungeonTileSnapshot, toTile: DungeonTileSnapshot): Direction {
  const colDiff = toTile.position.col - fromTile.position.col;
  const rowDiff = toTile.position.row - fromTile.position.row;
  if (colDiff === 1 && rowDiff === 0) return 'east';
  if (colDiff === -1 && rowDiff === 0) return 'west';
  if (colDiff === 0 && rowDiff === 1) return 'south';
  if (colDiff === 0 && rowDiff === -1) return 'north';
  throw new Error(`Tiles are not adjacent: ${fromTile.id} -> ${toTile.id}`);
}

function startGameWithSeed(seed: number) {
  return async (page: import('@playwright/test').Page) => {
    await page.evaluate((s) => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'heroes/toggleHeroSelection', payload: 'quinn' });
      store.dispatch({ type: 'heroes/selectUtilityCard', payload: { heroId: 'quinn', cardId: 8 } });
      store.dispatch({ type: 'heroes/toggleAtWillCard', payload: { heroId: 'quinn', cardId: 2 } });
      store.dispatch({ type: 'heroes/toggleAtWillCard', payload: { heroId: 'quinn', cardId: 3 } });
      store.dispatch({ type: 'heroes/selectDailyCard', payload: { heroId: 'quinn', cardId: 5 } });
      store.dispatch({ type: 'heroes/finalizePowerCardSelections' });
      store.dispatch({
        type: 'game/startGame',
        payload: {
          heroIds: ['quinn'],
          positions: [{ x: 2, y: 2 }],
          seed: s,
        },
      });
    }, seed);
  };
}

test.describe('114 - Long Hallway Special Rule', () => {
  test('Long Hallway (black) draws a second tile and triggers an encounter', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate and start game with seed 51 (long-hallway-black is first tile)
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await startGameWithSeed(SEED_LONG_HALLWAY_BLACK)(page);
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Dismiss scenario introduction programmatically
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/dismissScenarioIntroduction' });
    });

    // STEP 2: Move Quinn to north edge of start tile
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 0 } },
      });
    });

    await expect(async () => {
      const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
      expect(state.game.heroTokens[0].position).toEqual({ x: 2, y: 0 });
    }).toPass();

    await screenshots.capture(page, 'hero-at-north-edge-black-hallway', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.turnState.currentPhase).toBe('hero-phase');
        // First tile in deck should be the black long hallway
        expect(state.game.dungeon.tileDeck[0]).toBe('tile-long-hallway-black');
        // Start with 18 tiles
        expect(state.game.dungeon.tileDeck).toHaveLength(18);
      },
    });

    // STEP 3: End hero phase — Long Hallway is drawn and second tile placed automatically
    await page.locator('[data-testid="end-phase-button"]').click();
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');

    // Wait for the dungeon tiles to appear (long hallway + second tile)
    await expect(async () => {
      const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
      expect(state.game.dungeon.tiles.length).toBeGreaterThanOrEqual(3);
    }).toPass({ timeout: 5000 });

    // Ensure monster spawn step runs before validating monster placement
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/addExplorationMonster' });
    });

    await screenshots.capture(page, 'long-hallway-black-and-second-tile-placed', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());

        // Should have 3 tiles: start tile + long hallway (black) + second tile
        expect(state.game.dungeon.tiles).toHaveLength(3);

        // The long hallway (black) should be present
        const longHallway = state.game.dungeon.tiles.find(
          (t: any) => t.tileType === 'tile-long-hallway-black'
        );
        expect(longHallway).toBeDefined();

        // Second tile should also be present
        const secondTile = state.game.dungeon.tiles.find(
          (t: any) => t.id !== 'start-tile' && t.tileType !== 'tile-long-hallway-black'
        );
        expect(secondTile).toBeDefined();

        const startTile = state.game.dungeon.tiles.find((t: any) => t.id === 'start-tile');
        expect(startTile).toBeDefined();

        // Long hallway arrow should face back toward the tile it connected to
        const longHallwayArrowDirection = getArrowDirection(longHallway.tileType, longHallway.rotation);
        const longHallwayToStartDirection = directionFromTileToTile(longHallway, startTile);
        expect(longHallwayArrowDirection).toBe(longHallwayToStartDirection);

        // Second tile arrow should face back toward the hallway tile
        const secondTileArrowDirection = getArrowDirection(secondTile.tileType, secondTile.rotation);
        const secondTileToHallwayDirection = directionFromTileToTile(secondTile, longHallway);
        expect(secondTileArrowDirection).toBe(secondTileToHallwayDirection);

        // Long Hallway special rule: one monster on each revealed tile
        const monstersOnHallway = state.game.monsters.filter((m: any) => m.tileId === longHallway.id);
        const monstersOnSecondTile = state.game.monsters.filter((m: any) => m.tileId === secondTile.id);
        expect(monstersOnHallway.length).toBeGreaterThan(0);
        expect(monstersOnSecondTile.length).toBeGreaterThan(0);

        // Tile deck should have decreased by 2 (long hallway + second tile)
        expect(state.game.dungeon.tileDeck).toHaveLength(16);

        // Log should mention Long Hallway second tile
        const logEntries = state.game.logEntries as Array<{ message: string }>;
        const hallwayLog = logEntries.find((e) => e.message.includes('Long Hallway'));
        expect(hallwayLog).toBeDefined();

        // Since the long hallway has a black arrow, drewOnlyWhiteTilesThisTurn = false
        expect(state.game.turnState.drewOnlyWhiteTilesThisTurn).toBe(false);
      },
    });

    // STEP 4: Complete exploration, verify encounter was drawn, skip villain phase atomically
    const villainCheck1 = await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/dismissMonsterCard' });
      store.dispatch({ type: 'game/endExplorationPhase' });
      // Read state immediately (synchronous Redux update) — before UI can auto-activate monsters
      const state = store.getState();
      const drawnEncounter = state.game.drawnEncounter;
      const currentPhase = state.game.turnState.currentPhase;
      // Skip villain phase directly (endVillainPhase clears drawnEncounter and all combat results)
      store.dispatch({ type: 'game/endVillainPhase' });
      return { drawnEncounterId: drawnEncounter?.id ?? null, currentPhase };
    });

    // Black long hallway → encounter MUST be drawn
    expect(villainCheck1.currentPhase).toBe('villain-phase');
    expect(villainCheck1.drawnEncounterId).not.toBeNull();

    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');

    await screenshots.capture(page, 'hero-phase-after-black-hallway', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        // The 3-tile dungeon (start + hallway + second tile) should persist
        expect(state.game.dungeon.tiles).toHaveLength(3);
        expect(state.game.dungeon.tiles.find((t: any) => t.tileType === 'tile-long-hallway-black')).toBeDefined();
      },
    });
  });

  test('Long Hallway (white) + white second tile skips encounter', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate and start game with seed 16 (long-hallway-white first, white tile second)
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await startGameWithSeed(SEED_LONG_HALLWAY_WHITE)(page);
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Dismiss scenario introduction programmatically
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/dismissScenarioIntroduction' });
    });

    // STEP 2: Move Quinn to north edge
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 0 } },
      });
    });

    await expect(async () => {
      const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
      expect(state.game.heroTokens[0].position).toEqual({ x: 2, y: 0 });
    }).toPass();

    await screenshots.capture(page, 'hero-at-north-edge-white-hallway', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.turnState.currentPhase).toBe('hero-phase');
        // First tile in deck should be the white long hallway
        expect(state.game.dungeon.tileDeck[0]).toBe('tile-long-hallway-white');
        // Second tile in deck should be a white tile
        expect(state.game.dungeon.tileDeck[1]).toMatch(/^tile-white/);
      },
    });

    // STEP 3: End hero phase — Long Hallway (white) is drawn, then a white second tile
    await page.locator('[data-testid="end-phase-button"]').click();
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');

    await expect(async () => {
      const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
      expect(state.game.dungeon.tiles.length).toBeGreaterThanOrEqual(3);
    }).toPass({ timeout: 5000 });

    // Ensure monster spawn step runs before validating monster placement
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/addExplorationMonster' });
    });

    await screenshots.capture(page, 'white-long-hallway-and-white-second-tile', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());

        // 3 tiles: start + long hallway (white) + second tile (white)
        expect(state.game.dungeon.tiles).toHaveLength(3);

        const longHallway = state.game.dungeon.tiles.find(
          (t: any) => t.tileType === 'tile-long-hallway-white'
        );
        expect(longHallway).toBeDefined();

        const secondTile = state.game.dungeon.tiles.find(
          (t: any) => t.id !== 'start-tile' && t.tileType !== 'tile-long-hallway-white'
        );
        expect(secondTile).toBeDefined();

        const startTile = state.game.dungeon.tiles.find((t: any) => t.id === 'start-tile');
        expect(startTile).toBeDefined();

        // Long hallway arrow should face back toward the tile it connected to
        const longHallwayArrowDirection = getArrowDirection(longHallway.tileType, longHallway.rotation);
        const longHallwayToStartDirection = directionFromTileToTile(longHallway, startTile);
        expect(longHallwayArrowDirection).toBe(longHallwayToStartDirection);

        // Second tile arrow should face back toward the hallway tile
        const secondTileArrowDirection = getArrowDirection(secondTile.tileType, secondTile.rotation);
        const secondTileToHallwayDirection = directionFromTileToTile(secondTile, longHallway);
        expect(secondTileArrowDirection).toBe(secondTileToHallwayDirection);

        // Long Hallway special rule: one monster on each revealed tile
        const monstersOnHallway = state.game.monsters.filter((m: any) => m.tileId === longHallway.id);
        const monstersOnSecondTile = state.game.monsters.filter((m: any) => m.tileId === secondTile.id);
        expect(monstersOnHallway.length).toBeGreaterThan(0);
        expect(monstersOnSecondTile.length).toBeGreaterThan(0);

        // Both tiles are white → drewOnlyWhiteTilesThisTurn should be true
        expect(state.game.turnState.drewOnlyWhiteTilesThisTurn).toBe(true);

        // Deck decreased by 2
        expect(state.game.dungeon.tileDeck).toHaveLength(16);
      },
    });

    // STEP 4: Complete exploration, verify NO encounter was drawn, skip villain phase atomically
    const villainCheck2 = await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/dismissMonsterCard' });
      store.dispatch({ type: 'game/endExplorationPhase' });
      // Read state immediately (synchronous Redux update) — before UI can auto-activate monsters
      const state = store.getState();
      const drawnEncounter = state.game.drawnEncounter;
      const currentPhase = state.game.turnState.currentPhase;
      // Skip villain phase before monster auto-activation can render
      store.dispatch({ type: 'game/endVillainPhase' });
      return { drawnEncounter, currentPhase };
    });

    // Both tiles were white → NO encounter drawn
    expect(villainCheck2.currentPhase).toBe('villain-phase');
    expect(villainCheck2.drawnEncounter).toBeNull();

    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');

    await screenshots.capture(page, 'hero-phase-after-white-hallway-no-encounter', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        // The 3-tile dungeon (start + white hallway + white second tile) should persist
        expect(state.game.dungeon.tiles).toHaveLength(3);
        expect(state.game.dungeon.tiles.find((t: any) => t.tileType === 'tile-long-hallway-white')).toBeDefined();
      },
    });
  });
});
