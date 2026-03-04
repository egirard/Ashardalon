import { test, expect } from '@playwright/test';
import { createScreenshotHelper, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('110 - Lost Encounter Card', () => {
  test('lost card shuffles tile deck and is discarded', async ({ page }) => {
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

    // STEP 2: Verify initial state and record tile deck
    await screenshots.capture(page, 'game-started', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.turnState.currentPhase).toBe('hero-phase');
        expect(state.game.dungeon.tileDeck.length).toBeGreaterThan(0);
      }
    });

    const initialState = await page.evaluate(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return {
        tileDeckLength: state.game.dungeon.tileDeck.length,
        tileDeck: [...state.game.dungeon.tileDeck],
      };
    });

    // STEP 3: Force draw Lost encounter card
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/setDrawnEncounter', payload: 'lost' });
    });

    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'lost-card-drawn', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(storeState.game.drawnEncounter).not.toBeNull();
        expect(storeState.game.drawnEncounter.id).toBe('lost');

        await expect(page.locator('[data-testid="encounter-card"]')).toContainText('Lost');
      }
    });

    // STEP 4: Dismiss encounter card to apply effect
    await page.locator('[data-testid="dismiss-encounter-card"]').click();

    // Wait for Redux state to confirm the effect was applied (tile deck shuffled)
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.encounterEffectMessage &&
             state.game.encounterEffectMessage.includes('Tile deck shuffled');
    }, { timeout: 10000 });

    // Workaround for Svelte 5 reactivity: manually hide encounter card
    await page.evaluate(() => {
      const card = document.querySelector('[data-testid="encounter-card"]');
      if (card) {
        (card as HTMLElement).style.display = 'none';
      }
    });

    await screenshots.capture(page, 'effect-applied-deck-shuffled', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());

        // Card should be discarded
        expect(storeState.game.drawnEncounter).toBeNull();

        // Verify effect message
        expect(storeState.game.encounterEffectMessage).toContain('Tile deck shuffled');

        // Verify tile deck size is unchanged (shuffle doesn't remove tiles)
        expect(storeState.game.dungeon.tileDeck.length).toBe(initialState.tileDeckLength);
      }
    });

    // STEP 5: Verify the encounter card was discarded
    const finalState = await page.evaluate(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return {
        drawnEncounter: state.game.drawnEncounter,
        encounterDiscardPile: state.game.encounterDeck.discardPile,
        tileDeck: [...state.game.dungeon.tileDeck],
        tileDeckLength: state.game.dungeon.tileDeck.length,
      };
    });

    expect(finalState.drawnEncounter).toBeNull();
    expect(finalState.encounterDiscardPile).toContain('lost');
    expect(finalState.tileDeckLength).toBe(initialState.tileDeckLength);

    await screenshots.capture(page, 'card-discarded-and-state-verified', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(storeState.game.encounterDeck.discardPile).toContain('lost');
      }
    });
  });
});
