import { test, expect } from '@playwright/test';
import { createScreenshotHelper, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('094 - Hall of the Orcs Encounter Card', () => {
  test('hall of orcs filters monster deck for orcs and updates effect messaging', async ({ page }) => {
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
        expect(state.game.monsterDeck.drawPile.length).toBeGreaterThan(0);
      }
    });

    // Record initial deck state
    const initialDeckState = await page.evaluate(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return {
        drawPileLength: state.game.monsterDeck.drawPile.length,
        discardPileLength: state.game.monsterDeck.discardPile.length,
      };
    });

    // STEP 3: Force draw Hall of the Orcs encounter card
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/setDrawnEncounter', payload: 'hall-of-orcs' });
    });

    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'hall-of-orcs-encounter-drawn', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(storeState.game.drawnEncounter).not.toBeNull();
        expect(storeState.game.drawnEncounter.id).toBe('hall-of-orcs');

        await expect(page.locator('[data-testid="encounter-card"]')).toContainText('Hall of the Orcs');
        await expect(page.locator('[data-testid="encounter-card"]')).toContainText('Orc');
      }
    });

    // STEP 4: Dismiss encounter card to apply effect
    await page.locator('[data-testid="dismiss-encounter-card"]').click();
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });

    await screenshots.capture(page, 'hall-of-orcs-effect-applied', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(storeState.game.drawnEncounter).toBeNull();

        expect(storeState.game.encounterEffectMessage).toBeTruthy();
        expect(storeState.game.encounterEffectMessage).toContain('Drew 5 monster cards');
        
        // With orcs now in the deck, some drawn cards may be orcs
        // The message format is: "Drew 5 monster cards. X Orcs placed on top, Y discarded."
        const message = storeState.game.encounterEffectMessage;
        const orcMatch = message.match(/(\d+) Orcs? placed on top, (\d+) discarded/);
        expect(orcMatch).toBeTruthy();
        
        if (!orcMatch) {
          throw new Error('Failed to parse encounter effect message');
        }
        
        const orcsKept = parseInt(orcMatch[1], 10);
        const orcsDiscarded = parseInt(orcMatch[2], 10);
        
        // Total should equal 5 (cards drawn)
        expect(orcsKept + orcsDiscarded).toBe(5);
        
        const currentDeck = storeState.game.monsterDeck;
        
        // Verify 5 cards were drawn from the draw pile
        expect(currentDeck.drawPile.length).toBe(initialDeckState.drawPileLength - 5 + orcsKept);
        
        // Verify non-orcs were added to the discard pile
        expect(currentDeck.discardPile.length).toBe(initialDeckState.discardPileLength + orcsDiscarded);
      }
    });

    // STEP 5: Verify encounter effect notification is visible
    await page.locator('[data-testid="encounter-effect-notification"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'encounter-effect-notification', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-effect-notification"]')).toBeVisible();
        await expect(page.locator('[data-testid="effect-message"]')).toContainText('Drew 5 monster cards');
        // The message should show orcs placed on top (exact count depends on deterministic draw)
        await expect(page.locator('[data-testid="effect-message"]')).toContainText('placed on top');
      }
    });

    await page.locator('[data-testid="dismiss-effect-notification"]').click();
    await page.locator('[data-testid="encounter-effect-notification"]').waitFor({ state: 'hidden' });

    // STEP 6: Ensure game continues normally
    await screenshots.capture(page, 'effect-complete', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(storeState.game.drawnEncounter).toBeNull();
        expect(storeState.game.turnState.currentPhase).toBe('hero-phase');
      }
    });
  });
});
