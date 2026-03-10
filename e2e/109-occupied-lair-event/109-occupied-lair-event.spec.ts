import { test, expect } from '@playwright/test';
import { createScreenshotHelper, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('109 - Occupied Lair Encounter Card', () => {
  test('occupied lair places tile, spawns monster, and places treasure token', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character select
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'character-select-screen', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="character-select"]')).toBeVisible();
      }
    });

    // Select Quinn from bottom edge
    await page.locator('[data-testid="hero-quinn-bottom"]').click();

    // Ensure deterministic setup before starting game
    await setupDeterministicGame(page);

    await page.locator('[data-testid="start-game-button"]').click();

    // Wait for game board
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // STEP 2: Verify initial state
    await screenshots.capture(page, 'game-started', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.turnState.currentPhase).toBe('hero-phase');
        expect(state.game.dungeon.tiles.length).toBeGreaterThan(0);
        expect(state.game.dungeon.unexploredEdges.length).toBeGreaterThan(0);
      }
    });

    // Record initial state before card activation
    const initialState = await page.evaluate(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return {
        tileCount: state.game.dungeon.tiles.length,
        tileIds: state.game.dungeon.tiles.map((t: any) => t.id),
        tileDeckLength: state.game.dungeon.tileDeck.length,
        monsterCount: state.game.monsters.length,
        monsterDrawPileLength: state.game.monsterDeck.drawPile.length,
        treasureTokenCount: state.game.treasureTokens.length,
        unexploredEdgesCount: state.game.dungeon.unexploredEdges.length,
      };
    });

    // STEP 3: Force draw Occupied Lair encounter card
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/setDrawnEncounter', payload: 'occupied-lair' });
    });

    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'occupied-lair-drawn', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(storeState.game.drawnEncounter).not.toBeNull();
        expect(storeState.game.drawnEncounter.id).toBe('occupied-lair');

        await expect(page.locator('[data-testid="encounter-card"]')).toContainText('Occupied Lair');
      }
    });

    // STEP 4: Dismiss encounter card to apply effect
    await page.locator('[data-testid="dismiss-encounter-card"]').click();

    // Wait for Redux state to confirm the effect was applied (treasure token placed)
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.encounterEffectMessage &&
             state.game.encounterEffectMessage.includes('treasure token placed');
    }, { timeout: 10000 });

    // Workaround for Svelte 5 reactivity: manually hide encounter card
    await page.evaluate(() => {
      const card = document.querySelector('[data-testid="encounter-card"]');
      if (card) {
        (card as HTMLElement).style.display = 'none';
      }
    });

    await screenshots.capture(page, 'effect-applied-tile-monster-treasure', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());

        // Card should be discarded
        expect(storeState.game.drawnEncounter).toBeNull();

        // Verify effect message contains expected parts
        expect(storeState.game.encounterEffectMessage).toContain('treasure token placed');

        // Verify a new tile was added
        expect(storeState.game.dungeon.tiles.length).toBeGreaterThan(initialState.tileCount);

        // Verify tile deck decreased
        expect(storeState.game.dungeon.tileDeck.length).toBeLessThan(initialState.tileDeckLength);

        // Verify a new monster was spawned
        expect(storeState.game.monsters.length).toBeGreaterThan(initialState.monsterCount);

        // Verify monster deck decreased
        expect(storeState.game.monsterDeck.drawPile.length).toBeLessThan(initialState.monsterDrawPileLength);

        // Verify a treasure token was placed
        expect(storeState.game.treasureTokens.length).toBeGreaterThan(initialState.treasureTokenCount);

        // Verify the treasure token belongs to this encounter
        const lair_token = storeState.game.treasureTokens.find((t: { encounterId: string }) => t.encounterId === 'occupied-lair');
        expect(lair_token).toBeDefined();

        // Verify Bug Fix: Treasure token is placed on the NEW tile, not the start tile.
        // The start tile occupies global positions x: 0-3, y: 0-7.
        // With the old code (col * 4 + 1, row * 4 + 1), tiles in the start column
        // at row > 0 would get y positions inside the start tile (e.g. row=1 → y=5).
        // With the fix (getTileBounds()), the position is correctly computed.
        //
        // Note: The tile bounds calculation below mirrors src/store/movement.ts:getTileBounds().
        // It cannot be imported directly since E2E tests run in the browser context.
        const newTile = storeState.game.dungeon.tiles.find((t: any) =>
          !initialState.tileIds.includes(t.id)
        );
        if (newTile) {
          const col = newTile.position.col;
          const row = newTile.position.row;
          const TILE_WIDTH = 4;
          const NORMAL_TILE_HEIGHT = 4;
          const START_TILE_HEIGHT = 8;
          // Compute expected minX using getTileBounds logic
          let expectedMinX: number;
          if (col > 0) {
            expectedMinX = TILE_WIDTH + (col - 1) * TILE_WIDTH;
          } else if (col < 0) {
            expectedMinX = col * TILE_WIDTH;
          } else {
            expectedMinX = 0;
          }
          // Compute expected minY using getTileBounds logic
          let expectedMinY: number;
          if (row > 0) {
            if (col !== 0) {
              expectedMinY = row * NORMAL_TILE_HEIGHT;
            } else {
              // col === 0 south tiles: offset past the full start tile height
              expectedMinY = START_TILE_HEIGHT + (row - 1) * NORMAL_TILE_HEIGHT;
            }
          } else if (row < 0) {
            expectedMinY = row * NORMAL_TILE_HEIGHT;
          } else {
            expectedMinY = 0;
          }
          // Treasure token must be at (minX+1, minY+1) — within the new tile's bounds
          expect(lair_token.position.x).toBe(expectedMinX + 1);
          expect(lair_token.position.y).toBe(expectedMinY + 1);
        }
      }
    });

    // STEP 5: Verify the encounter card was discarded
    const finalState = await page.evaluate(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return {
        drawnEncounter: state.game.drawnEncounter,
        encounterDiscardPile: state.game.encounterDeck.discardPile,
        treasureTokens: state.game.treasureTokens,
      };
    });

    expect(finalState.drawnEncounter).toBeNull();
    expect(finalState.encounterDiscardPile).toContain('occupied-lair');
    expect(finalState.treasureTokens.some((t: { encounterId: string }) => t.encounterId === 'occupied-lair')).toBe(true);

    await screenshots.capture(page, 'card-discarded-and-state-verified', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(storeState.game.encounterDeck.discardPile).toContain('occupied-lair');
      }
    });
  });
});
