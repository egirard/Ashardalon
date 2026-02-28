import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from '../helpers/screenshot-helper';

/**
 * Test 115 - Room Set Placement on Chamber Reveal
 *
 * User Story:
 * As a player in Adventure 14 or 15, when I explore and reveal the Chamber
 * Entrance tile, the game automatically places the scenario's room set tiles
 * (e.g., Obsidian Sanctum for Adventure 14) around the entrance. Each tile
 * fades in sequentially with staggered animation, making the chamber feel
 * like it is being assembled before the player's eyes.
 */

test.describe('115 - Room Set Placement on Chamber Reveal', () => {
  test('Adventure 14 chamber entrance reveals Obsidian Sanctum room set', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate and start game with Adventure 14 scenario
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'heroes/toggleHeroSelection', payload: 'quinn' });
      store.dispatch({ type: 'heroes/selectUtilityCard', payload: { heroId: 'quinn', cardId: 8 } });
      store.dispatch({ type: 'heroes/toggleAtWillCard', payload: { heroId: 'quinn', cardId: 2 } });
      store.dispatch({ type: 'heroes/toggleAtWillCard', payload: { heroId: 'quinn', cardId: 3 } });
      store.dispatch({ type: 'heroes/selectDailyCard', payload: { heroId: 'quinn', cardId: 5 } });
      store.dispatch({ type: 'heroes/finalizePowerCardSelections' });
      store.dispatch({ type: 'game/selectScenario', payload: 'adventure-14' });
      store.dispatch({
        type: 'game/startGame',
        payload: {
          heroIds: ['quinn'],
          positions: [{ x: 2, y: 2 }],
          seed: 42,
        },
      });
    });

    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Dismiss scenario introduction
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/dismissScenarioIntroduction' });
    });

    // STEP 2: Force the chamber entrance tile to be next in the deck
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setTileDeck',
        payload: ['tile-chamber-entrance'],
      });
    });

    // Move Quinn to north edge so exploration will go north
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

    await screenshots.capture(page, 'hero-at-north-edge-chamber-entrance-next', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.turnState.currentPhase).toBe('hero-phase');
        expect(state.game.dungeon.tileDeck[0]).toBe('tile-chamber-entrance');
        expect(state.game.selectedScenarioId).toBe('adventure-14');
      },
    });

    // STEP 3: End hero phase — chamber entrance is drawn, room set tiles placed
    await page.locator('[data-testid="end-phase-button"]').click();
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');

    // Wait for all room set tiles to appear (start + entrance + 4 room set tiles = 6)
    await expect(async () => {
      const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
      expect(state.game.dungeon.tiles.length).toBeGreaterThanOrEqual(6);
    }).toPass({ timeout: 5000 });

    await screenshots.capture(page, 'chamber-entrance-and-room-set-placed', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());

        // Start tile + chamber entrance + 4 room set tiles = 6 tiles
        expect(state.game.dungeon.tiles).toHaveLength(6);

        // The chamber entrance must be present
        const entranceTile = state.game.dungeon.tiles.find(
          (t: any) => t.tileType === 'tile-chamber-entrance'
        );
        expect(entranceTile).toBeDefined();

        // All 4 Horrid Chamber room set tiles must be present
        const roomSetTypes = [
          'tile-horrid-chamber-01',
          'tile-horrid-chamber-02',
          'tile-horrid-chamber-03',
          'tile-horrid-chamber-04',
        ];
        for (const tileType of roomSetTypes) {
          const tile = state.game.dungeon.tiles.find((t: any) => t.tileType === tileType);
          expect(tile, `Expected ${tileType} to be placed`).toBeDefined();
        }

        // Room set tiles must form a fully closed chamber — all exterior edges sealed as wall,
        // so there are zero unexplored edges on any room set tile.
        const roomSetTileIds = (state.game.recentlyPlacedRoomSetTileIds as string[]);
        const roomSetUnexploredEdges = state.game.dungeon.unexploredEdges.filter(
          (e: any) => roomSetTileIds.includes(e.tileId)
        );
        expect(roomSetUnexploredEdges).toHaveLength(0);

        // DOM check: confirm no unexplored-edge indicators are rendered on any room set tile.
        // This verifies the visual state, not just the Redux state.
        for (const tileId of roomSetTileIds) {
          const indicatorCount = await page.locator(`[data-tile-id="${tileId}"] [data-testid="unexplored-edge"]`).count();
          expect(indicatorCount, `Expected no unexplored edge indicators in DOM for tile ${tileId}`).toBe(0);
        }

        // Chamber entrance must not have unexplored edges on its wall side (east only,
        // since image analysis confirmed west is open on the entrance tile)
        const entranceUnexplored = state.game.dungeon.unexploredEdges.filter(
          (e: any) => e.tileId === entranceTile.id
        );
        const hasEastUnexplored = entranceUnexplored.some(
          (e: any) => e.direction === 'east'
        );
        expect(hasEastUnexplored).toBe(false);

        // Chamber should be revealed
        expect(state.game.scenario.chamberRevealed).toBe(true);

        // Room set tiles should be tracked for animation
        expect(state.game.recentlyPlacedRoomSetTileIds).toHaveLength(4);

        // Log should mention Chamber Entrance and room set tiles
        const logEntries = state.game.logEntries as Array<{ message: string }>;
        const chamberLog = logEntries.find((e) => e.message.includes('Chamber Entrance revealed'));
        expect(chamberLog).toBeDefined();
        const roomSetLog = logEntries.find((e) => e.message.includes('Obsidian Sanctum'));
        expect(roomSetLog).toBeDefined();
      },
    });

    // STEP 4: Verify room set tile positions are correct (north exploration → tiles placed north of entrance)
    const tilePositions = await page.evaluate(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      const entrance = state.game.dungeon.tiles.find((t: any) => t.tileType === 'tile-chamber-entrance');
      const roomTiles = state.game.dungeon.tiles.filter((t: any) =>
        t.tileType.startsWith('tile-horrid-chamber-')
      );
      return {
        entrancePosition: entrance?.position,
        roomTilePositions: roomTiles.map((t: any) => ({ tileType: t.tileType, position: t.position })),
      };
    });

    // Chamber entrance is at row -1 (north of start tile), room set tiles are further north
    expect(tilePositions.entrancePosition).toBeDefined();
    const entranceRow = tilePositions.entrancePosition.row;
    const entranceCol = tilePositions.entrancePosition.col;

    // Room set tiles should be north of the entrance (forward = north = decreasing row)
    // forward=1 → row-1, forward=2 → row-2
    // right=0 → col+0, right=1 → col+1
    const expectedPositions = [
      { col: entranceCol, row: entranceRow - 1 },     // horrid-01: forward=1, right=0
      { col: entranceCol + 1, row: entranceRow - 1 }, // horrid-02: forward=1, right=1
      { col: entranceCol, row: entranceRow - 2 },     // horrid-03: forward=2, right=0
      { col: entranceCol + 1, row: entranceRow - 2 }, // horrid-04: forward=2, right=1
    ];

    for (const expected of expectedPositions) {
      const found = tilePositions.roomTilePositions.some(
        (t: any) => t.position.col === expected.col && t.position.row === expected.row
      );
      expect(found, `Expected a room tile at col:${expected.col} row:${expected.row}`).toBe(true);
    }

    // STEP 5: Skip through exploration and verify board persists
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/dismissMonsterCard' });
      store.dispatch({ type: 'game/endExplorationPhase' });
      store.dispatch({ type: 'game/endVillainPhase' });
    });

    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');

    await screenshots.capture(page, 'hero-phase-after-chamber-reveal', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        // The 6 tiles should persist
        expect(state.game.dungeon.tiles).toHaveLength(6);
        // Animation tracking cleared after villain phase
        expect(state.game.recentlyPlacedRoomSetTileIds).toHaveLength(0);
      },
    });
  });
});
