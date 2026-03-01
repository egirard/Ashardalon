import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from '../helpers/screenshot-helper';

/**
 * Test 118 - Tile Deck Exhaustion Defeat (Adventure 15)
 *
 * User Story:
 * As a player in Adventure 15, the tile deck can run out before the Chamber
 * Entrance is found. When the last tile is drawn without the Chamber Entrance
 * being revealed, the party is defeated.
 *
 *  1. Start Adventure 15 with Quinn.
 *  2. The tile deck counter shows tiles remaining.
 *  3. Reduce the tile deck to 0 tiles (simulating exhaustion).
 *  4. Trigger exploration to attempt to draw a tile with no tiles remaining.
 *  5. The Defeat screen appears with a tile-deck-exhaustion message.
 *  6. Clicking "New Game" resets all scenario state.
 */

test.describe('118 - Tile Deck Exhaustion Defeat', () => {
  test('Defeat screen appears when tile deck runs out before chamber is found', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // -----------------------------------------------------------------------
    // STEP 1: Start Adventure 15 with Quinn
    // -----------------------------------------------------------------------
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
      store.dispatch({ type: 'game/selectScenario', payload: 'adventure-15' });
      store.dispatch({
        type: 'game/startGame',
        payload: {
          heroIds: ['quinn'],
          positions: [{ x: 3, y: 3 }],
          seed: 42,
        },
      });
    });

    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/dismissScenarioIntroduction' });
    });

    // -----------------------------------------------------------------------
    // STEP 2: Verify tile deck counter is visible and tiles remain
    // -----------------------------------------------------------------------
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // Start in a neutral position, not on an edge
      store.dispatch({ type: 'game/setHeroPosition', payload: { heroId: 'quinn', position: { x: 2, y: 3 } } });
      store.dispatch({ type: 'game/hideMovement' });
    });

    await screenshots.capture(page, 'tile-deck-counter-visible', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.dungeon.tileDeck.length).toBeGreaterThan(0);
        expect(state.game.scenario.chamberRevealed).toBe(false);
        expect(state.game.currentScreen).toBe('game-board');
        // The tile deck counter should be visible
        await expect(page.locator('[data-testid="tile-deck-counter"]')).toBeVisible();
      },
    });

    // -----------------------------------------------------------------------
    // STEP 3: Exhaust the tile deck (remove all tiles), keep chamber unrevealed
    // -----------------------------------------------------------------------
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // Position Quinn on the north edge of the start tile (y=0 triggers north edge exploration)
      store.dispatch({ type: 'game/setHeroPosition', payload: { heroId: 'quinn', position: { x: 2, y: 0 } } });
      // Remove all tiles from the deck — deck exhausted before chamber found
      store.dispatch({ type: 'game/setTileDeck', payload: [] });
    });

    await screenshots.capture(page, 'tile-deck-empty', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.dungeon.tileDeck.length).toBe(0);
        expect(state.game.scenario.chamberRevealed).toBe(false);
        // Should still be in game (defeat not yet triggered)
        expect(state.game.currentScreen).toBe('game-board');
        await expect(page.locator('[data-testid="tile-deck-counter"]')).toBeVisible();
      },
    });

    // -----------------------------------------------------------------------
    // STEP 4: Trigger exploration - hero is on edge with empty deck, defeat triggers
    // -----------------------------------------------------------------------
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // End hero phase — hero on north edge + empty deck → defeat (Adventure 15)
      store.dispatch({ type: 'game/endHeroPhase' });
    });

    // Wait for defeat screen (deck exhaustion triggers during exploration attempt)
    await page.locator('[data-testid="defeat-screen"]').waitFor({ state: 'visible', timeout: 10000 });

    // -----------------------------------------------------------------------
    // STEP 5: Verify Defeat screen with tile-deck-exhaustion message
    // -----------------------------------------------------------------------
    await screenshots.capture(page, 'defeat-screen-deck-exhausted', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.currentScreen).toBe('defeat');
        // Defeat reason should mention tile deck exhaustion
        expect(state.game.defeatReason).toBeTruthy();
        expect(state.game.defeatReason).toContain('exhausted');

        await expect(page.locator('[data-testid="defeat-screen"]')).toBeVisible();
        await expect(page.locator('[data-testid="defeat-message"]')).toContainText('exhausted');
        await expect(page.locator('[data-testid="defeat-screen"]')).toContainText('Defeat');
        await expect(page.locator('[data-testid="new-game-button"]')).toBeVisible();
      },
    });

    // -----------------------------------------------------------------------
    // STEP 6: Click New Game - verify all scenario state is reset
    // -----------------------------------------------------------------------
    await page.locator('[data-testid="new-game-button"]').click();
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'character-select-after-defeat', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.currentScreen).toBe('character-select');
        expect(state.game.defeatReason).toBeNull();
        expect(state.game.scenario.chamberRevealed).toBe(false);
        expect(state.game.dungeon.tileDeck.length).toBe(0); // deck is reset when game restarts
        await expect(page.locator('[data-testid="character-select"]')).toBeVisible();
      },
    });
  });

  test('Defeat screen shows correct reason when healing surges run out (Adventure 15)', async ({ page }) => {
    const screenshots = createScreenshotHelper();

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
      store.dispatch({ type: 'game/selectScenario', payload: 'adventure-15' });
      store.dispatch({
        type: 'game/startGame',
        payload: {
          heroIds: ['quinn'],
          positions: [{ x: 3, y: 3 }],
          seed: 42,
        },
      });
    });

    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/dismissScenarioIntroduction' });
    });

    // Set Quinn to 0 HP and 0 healing surges
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/setHeroPosition', payload: { heroId: 'quinn', position: { x: 3, y: 3 } } });
      store.dispatch({ type: 'game/hideMovement' });
      store.dispatch({ type: 'game/setHeroHp', payload: { heroId: 'quinn', hp: 0 } });
      store.dispatch({ type: 'game/setPartyResources', payload: { healingSurges: 0 } });
    });

    await screenshots.capture(page, 'hero-at-zero-hp-no-surges', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        const quinnHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn')?.currentHp;
        expect(quinnHp).toBe(0);
        expect(state.game.partyResources.healingSurges).toBe(0);
        expect(state.game.currentScreen).toBe('game-board');
      },
    });

    // End hero phase and villain phase — defeat triggers at start of next turn
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/endHeroPhase' });
      store.dispatch({ type: 'game/endExplorationPhase' });
      store.dispatch({ type: 'game/endVillainPhase' }); // Cycles back to Quinn — defeat triggers
    });

    await page.locator('[data-testid="defeat-screen"]').waitFor({ state: 'visible', timeout: 10000 });

    await screenshots.capture(page, 'defeat-screen-no-healing-surges', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.currentScreen).toBe('defeat');
        expect(state.game.defeatReason).toBeTruthy();
        expect(state.game.defeatReason).toContain('Quinn');

        await expect(page.locator('[data-testid="defeat-screen"]')).toBeVisible();
        await expect(page.locator('[data-testid="defeat-message"]')).toContainText('Quinn');
        await expect(page.locator('[data-testid="defeat-screen"]')).toContainText('Defeat');
      },
    });
  });
});
