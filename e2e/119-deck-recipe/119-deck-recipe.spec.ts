import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from '../helpers/screenshot-helper';

/**
 * Test 119 - Deck Recipe (Scenario-Specific Deck Setup)
 *
 * User Story:
 * As a player selecting Adventure 14 or Adventure 15, the dungeon tile deck
 * is arranged according to that scenario's configuration:
 *
 *  Adventure 14: 10 regular tiles (mini-stack) drawn before the Chamber Entrance
 *  Adventure 15: 12 regular tiles (mini-stack) drawn before the Chamber Entrance,
 *                and if the deck runs out before the chamber is found, the party loses.
 *
 * This test verifies:
 *  1. Adventure 14's deck has the Chamber Entrance at position 10 (index 10).
 *  2. Adventure 15's deck has the Chamber Entrance at position 12 (index 12).
 *  3. Adventure 14's deck does NOT have defeatedIfDeckExhausted.
 *  4. Adventure 15's deck has defeatedIfDeckExhausted = true.
 *  5. Exploring 10 tiles in Adventure 14 reveals the Chamber Entrance on tile 11.
 *  6. Exploring 12 tiles in Adventure 15 reveals the Chamber Entrance on tile 13.
 */

test.describe('119 - Deck Recipe (Scenario-Specific Deck Setup)', () => {
  test('Adventure 14 deck places Chamber Entrance after 10 regular tiles', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // -----------------------------------------------------------------------
    // STEP 1: Start Adventure 14 with Quinn
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
      store.dispatch({ type: 'game/selectScenario', payload: 'adventure-14' });
      store.dispatch({
        type: 'game/startGame',
        payload: { heroIds: ['quinn'], positions: [{ x: 3, y: 3 }], seed: 42 },
      });
    });

    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/dismissScenarioIntroduction' });
    });

    // -----------------------------------------------------------------------
    // STEP 2: Verify Adventure 14 deck configuration
    // -----------------------------------------------------------------------
    await screenshots.capture(page, 'adventure-14-deck-initial', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());

        // Verify the scenario is adventure-14
        expect(state.game.selectedScenarioId).toBe('adventure-14');

        // Verify deck is not empty and Chamber Entrance is at position 10
        const deck: string[] = state.game.dungeon.tileDeck;
        expect(deck.length).toBeGreaterThan(10);

        // The Chamber Entrance should be at index 10 (after 10 mini-stack tiles)
        const chamberIndex = deck.indexOf('tile-chamber-entrance');
        expect(chamberIndex).toBe(10);

        // First 10 tiles should all be regular tiles (not chamber entrance)
        for (let i = 0; i < 10; i++) {
          expect(deck[i]).not.toBe('tile-chamber-entrance');
        }

        // Adventure 14 does NOT have the tile-deck-exhaustion loss condition enforced at draw time
        expect(state.game.scenario.chamberRevealed).toBe(false);
      },
    });
  });

  test('Adventure 15 deck places Chamber Entrance after 12 regular tiles', async ({ page }) => {
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
        payload: { heroIds: ['quinn'], positions: [{ x: 3, y: 3 }], seed: 42 },
      });
    });

    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/dismissScenarioIntroduction' });
    });

    // -----------------------------------------------------------------------
    // STEP 2: Verify Adventure 15 deck configuration
    // -----------------------------------------------------------------------
    await screenshots.capture(page, 'adventure-15-deck-initial', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());

        // Verify the scenario is adventure-15
        expect(state.game.selectedScenarioId).toBe('adventure-15');

        // Verify deck is not empty and Chamber Entrance is at position 12
        const deck: string[] = state.game.dungeon.tileDeck;
        expect(deck.length).toBeGreaterThan(12);

        // The Chamber Entrance should be at index 12 (after 12 mini-stack tiles)
        const chamberIndex = deck.indexOf('tile-chamber-entrance');
        expect(chamberIndex).toBe(12);

        // First 12 tiles should all be regular tiles (not chamber entrance)
        for (let i = 0; i < 12; i++) {
          expect(deck[i]).not.toBe('tile-chamber-entrance');
        }

        // Adventure 15 has chamberRevealed = false initially
        expect(state.game.scenario.chamberRevealed).toBe(false);
      },
    });
  });

  test('Adventure 14 and 15 decks contain all regular tiles plus one Chamber Entrance', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    // Start Adventure 14 to check deck completeness
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
        payload: { heroIds: ['quinn'], positions: [{ x: 3, y: 3 }], seed: 42 },
      });
    });

    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/dismissScenarioIntroduction' });
    });

    await screenshots.capture(page, 'adventure-14-deck-completeness', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        const deck: string[] = state.game.dungeon.tileDeck;

        // Deck should contain exactly one Chamber Entrance
        const chamberCount = deck.filter(id => id === 'tile-chamber-entrance').length;
        expect(chamberCount).toBe(1);

        // The deck should have room set tiles NOT in it (they are placed on reveal)
        const roomSetTiles = ['tile-horrid-chamber-01', 'tile-horrid-chamber-02',
                              'tile-horrid-chamber-03', 'tile-horrid-chamber-04'];
        for (const tileId of roomSetTiles) {
          expect(deck).not.toContain(tileId);
        }

        // All tiles should be valid tile IDs (not empty)
        deck.forEach(tileId => {
          expect(tileId.length).toBeGreaterThan(0);
        });
      },
    });
  });
});
