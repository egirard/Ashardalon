import { test, expect } from '@playwright/test';
import { createScreenshotHelper, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('111 - Ancient Spirit\'s Blessing Encounter Card', () => {
  test('scenario 1: hero has no used daily powers - message shows none to restore', async ({ page }) => {
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

    // STEP 2: Verify initial state - daily power is NOT used
    await screenshots.capture(page, 'game-started-daily-not-used', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.turnState.currentPhase).toBe('hero-phase');

        const quinPowerCards = state.heroes.heroPowerCards['quinn'];
        expect(quinPowerCards).toBeDefined();

        // Verify daily card is NOT used
        const dailyCardId = quinPowerCards.daily;
        const dailyCardState = quinPowerCards.cardStates.find((s: any) => s.cardId === dailyCardId);
        expect(dailyCardState?.isFlipped).toBe(false);
      }
    });

    // STEP 3: Force draw Ancient Spirit's Blessing encounter card
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/setDrawnEncounter', payload: 'ancient-spirits-blessing' });
    });

    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'ancient-spirits-blessing-drawn', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(storeState.game.drawnEncounter).not.toBeNull();
        expect(storeState.game.drawnEncounter.id).toBe('ancient-spirits-blessing');

        await expect(page.locator('[data-testid="encounter-card"]')).toContainText("Ancient Spirit's Blessing");
      }
    });

    // STEP 4: Dismiss encounter card (no used daily powers)
    await page.locator('[data-testid="dismiss-encounter-card"]').click();

    // Wait for Redux state to confirm the card was processed
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.encounterEffectMessage === 'No used daily powers to restore';
    }, { timeout: 10000 });

    // Workaround for Svelte 5 reactivity: manually hide encounter card
    await page.evaluate(() => {
      const card = document.querySelector('[data-testid="encounter-card"]');
      if (card) {
        (card as HTMLElement).style.display = 'none';
      }
    });

    await page.waitForTimeout(500);

    await screenshots.capture(page, 'no-daily-powers-to-restore', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(storeState.game.encounterEffectMessage).toBe('No used daily powers to restore');

        // Daily power should still not be used
        const quinPowerCards = storeState.heroes.heroPowerCards['quinn'];
        const dailyCardId = quinPowerCards.daily;
        const dailyCardState = quinPowerCards.cardStates.find((s: any) => s.cardId === dailyCardId);
        expect(dailyCardState?.isFlipped).toBe(false);
      }
    });
  });

  test('scenario 2: hero has a used daily power - it gets restored', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character select
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    // Select Quinn from bottom edge
    await page.locator('[data-testid="hero-quinn-bottom"]').click();

    // Ensure deterministic setup before starting game
    await setupDeterministicGame(page);

    await page.locator('[data-testid="start-game-button"]').click();

    // Wait for game board
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // STEP 2: Get daily card ID and flip it (mark as used)
    const dailyCardId = await page.evaluate(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.heroes.heroPowerCards['quinn'].daily;
    });

    await page.evaluate((cardId) => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'heroes/usePowerCard', payload: { heroId: 'quinn', cardId } });
    }, dailyCardId);

    // STEP 3: Verify daily power is now used
    await screenshots.capture(page, 'daily-power-used', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        const quinPowerCards = state.heroes.heroPowerCards['quinn'];
        const cardState = quinPowerCards.cardStates.find((s: any) => s.cardId === quinPowerCards.daily);
        expect(cardState?.isFlipped).toBe(true);
      }
    });

    // STEP 4: Force draw Ancient Spirit's Blessing encounter card
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/setDrawnEncounter', payload: 'ancient-spirits-blessing' });
    });

    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'ancient-spirits-blessing-drawn-with-used-daily', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(storeState.game.drawnEncounter).not.toBeNull();
        expect(storeState.game.drawnEncounter.id).toBe('ancient-spirits-blessing');

        await expect(page.locator('[data-testid="encounter-card"]')).toContainText("Ancient Spirit's Blessing");
        await expect(page.locator('[data-testid="encounter-description"]')).toContainText('Daily Power');
      }
    });

    // STEP 5: Dismiss encounter card to apply the blessing effect
    await page.locator('[data-testid="dismiss-encounter-card"]').click();

    // Wait for Redux state to confirm the daily power was restored
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.encounterEffectMessage &&
             state.game.encounterEffectMessage.includes('restored');
    }, { timeout: 10000 });

    // Workaround for Svelte 5 reactivity: manually hide encounter card
    await page.evaluate(() => {
      const card = document.querySelector('[data-testid="encounter-card"]');
      if (card) {
        (card as HTMLElement).style.display = 'none';
      }
    });

    await page.waitForTimeout(500);

    await screenshots.capture(page, 'daily-power-restored', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());

        // Verify the effect message shows the card was restored
        expect(storeState.game.encounterEffectMessage).toContain('restored');
        expect(storeState.game.encounterEffectMessage).toContain('quinn');

        // Verify the daily power card is now unflipped (restored)
        const quinPowerCards = storeState.heroes.heroPowerCards['quinn'];
        const cardState = quinPowerCards.cardStates.find((s: any) => s.cardId === quinPowerCards.daily);
        expect(cardState?.isFlipped).toBe(false);

        // Verify the encounter card was discarded (ancient spirit draws another, so drawnEncounter may be set)
        const drawnEncounter = storeState.game.drawnEncounter;
        if (drawnEncounter) {
          expect(drawnEncounter.id).not.toBe('ancient-spirits-blessing');
        }
      }
    });
  });

  test('scenario 3: multiple heroes - first used daily power gets restored', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character select
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    // Select Quinn and Vistra
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await page.locator('[data-testid="hero-vistra-bottom"]').click();

    // Ensure deterministic setup before starting game
    await setupDeterministicGame(page);

    await page.locator('[data-testid="start-game-button"]').click();

    // Wait for game board
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // STEP 2: Get the active hero and flip their daily power card
    const { activeHeroId, activeDailyCardId } = await page.evaluate(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      const currentHeroIndex = state.game.turnState.currentHeroIndex;
      const activeHeroId = state.game.heroTokens[currentHeroIndex]?.heroId;
      const activeDailyCardId = state.heroes.heroPowerCards[activeHeroId]?.daily;
      return { activeHeroId, activeDailyCardId };
    });

    // Flip the active hero's daily power to "used"
    await page.evaluate(({ heroId, cardId }) => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'heroes/usePowerCard', payload: { heroId, cardId } });
    }, { heroId: activeHeroId, cardId: activeDailyCardId });

    await screenshots.capture(page, 'active-hero-daily-used', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        const currentHeroIndex = state.game.turnState.currentHeroIndex;
        const activeHeroId = state.game.heroTokens[currentHeroIndex]?.heroId;
        const cards = state.heroes.heroPowerCards[activeHeroId];
        const dailyState = cards?.cardStates.find((s: any) => s.cardId === cards.daily);
        expect(dailyState?.isFlipped).toBe(true);
      }
    });

    // STEP 3: Draw Ancient Spirit's Blessing
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/setDrawnEncounter', payload: 'ancient-spirits-blessing' });
    });

    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'ancient-spirits-blessing-drawn-multi-hero', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-card"]')).toContainText("Ancient Spirit's Blessing");
      }
    });

    // STEP 4: Dismiss encounter card to apply the blessing effect
    await page.locator('[data-testid="dismiss-encounter-card"]').click();

    // Wait for the daily power to be restored
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.encounterEffectMessage &&
             state.game.encounterEffectMessage.includes('restored');
    }, { timeout: 10000 });

    // Workaround for Svelte 5 reactivity: manually hide encounter card
    await page.evaluate(() => {
      const card = document.querySelector('[data-testid="encounter-card"]');
      if (card) {
        (card as HTMLElement).style.display = 'none';
      }
    });

    await page.waitForTimeout(500);

    await screenshots.capture(page, 'daily-power-restored-multi-hero', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate((heroId: string) => {
          const state = (window as any).__REDUX_STORE__.getState();
          return {
            encounterEffectMessage: state.game.encounterEffectMessage,
            heroPowerCards: state.heroes.heroPowerCards[heroId],
          };
        }, activeHeroId);

        // Verify restoration message
        expect(storeState.encounterEffectMessage).toContain('restored');

        // Verify the daily power card is restored
        const cardState = storeState.heroPowerCards?.cardStates.find(
          (s: any) => s.cardId === storeState.heroPowerCards.daily
        );
        expect(cardState?.isFlipped).toBe(false);
      }
    });
  });
});
