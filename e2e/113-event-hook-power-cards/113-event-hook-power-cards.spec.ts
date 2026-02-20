import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

/**
 * 113 - Event Hook Power Cards
 *
 * Demonstrates the integrated event hook system for power cards:
 * - Event hooks are registered in game state after game start (eventHooks in Redux state)
 * - The EncounterCard UI reads encounter cancel cost from Redux state (not hardcoded)
 * - Furious Assault (Tarak's custom ability, ID 31) registers an attack-hit-by-hero hook
 *
 * This tests the integration added in gameSlice.ts that wires the event hook
 * foundation (gameEvents, powerCardHooks, powerCardIntegration) into live gameplay.
 */

test.describe('113 - Event Hook Power Cards', () => {
  test('Event hooks are registered in game state after starting the game with Tarak', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Character Selection - Select Tarak (Rogue / Half-Orc)
    // Tarak has "Furious Assault" (ID 31) as custom ability - auto-registers attack-hit-by-hero hook
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-tarak-bottom"]').click();
    await selectDefaultPowerCards(page, 'tarak');

    await screenshots.capture(page, 'tarak-selected-with-powers', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="hero-tarak-bottom"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled();

        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.heroes.selectedHeroes.some((h: any) => h.id === 'tarak')).toBe(true);
      }
    });

    // STEP 2: Start the game with deterministic seed
    await setupDeterministicGame(page);
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Set deterministic hero position
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'tarak', position: { x: 2, y: 3 } }
      });
    });

    await expect(async () => {
      const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
      expect(state.game.heroTokens[0].position).toEqual({ x: 2, y: 3 });
    }).toPass();

    // STEP 3: Verify event hooks are registered in game state after game start
    await screenshots.capture(page, 'game-board-with-event-hooks-registered', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();

        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());

        // Verify event hooks state is initialized and has entries
        expect(state.game.eventHooks).toBeDefined();
        expect(state.game.eventHooks.hooks).toBeDefined();

        // Furious Assault (card 31) registered an attack-hit-by-hero hook
        const hookKeys = Object.keys(state.game.eventHooks.hooks);
        expect(hookKeys.length).toBeGreaterThan(0);

        // Verify there's at least one hook for the attack-hit-by-hero event type
        const hookValues = Object.values(state.game.eventHooks.hooks) as Array<{eventType: string}>;
        const attackHooks = hookValues.filter((h) => h.eventType === 'attack-hit-by-hero');
        expect(attackHooks.length).toBeGreaterThan(0);

        // Verify encounter cancel cost is initialized to default (5 XP)
        expect(state.game.encounterCancelCost).toBe(5);

        // Verify pending power card flips queue starts empty
        expect(state.game.pendingPowerCardFlips).toHaveLength(0);

        // Verify Furious Assault (ID 31) is available and unflipped (ready to fire)
        const cardStates = state.heroes.heroPowerCards.tarak.cardStates;
        const furiousAssault = cardStates.find((s: {cardId: number}) => s.cardId === 31);
        expect(furiousAssault).toBeDefined();
        expect(furiousAssault?.isFlipped).toBe(false);
      }
    });

    // STEP 4: Spawn an adjacent monster and verify game state is ready for event-triggered attack
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-target-1',
          position: { x: 2, y: 4 }, // Adjacent to Tarak at (2, 3)
          currentHp: 5,
          maxHp: 5,
          controllerId: 'tarak',
          tileId: 'start-tile'
        }]
      });
    });

    await expect(async () => {
      const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
      expect(state.game.monsters.length).toBe(1);
    }).toPass();

    await screenshots.capture(page, 'monster-spawned-adjacent-to-tarak', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());

        expect(state.game.monsters[0].instanceId).toBe('kobold-target-1');
        expect(state.game.monsters[0].currentHp).toBe(5);

        // Event hooks still registered and ready to fire on next attack hit
        const hookValues = Object.values(state.game.eventHooks.hooks) as Array<{eventType: string}>;
        const attackHooks = hookValues.filter((h) => h.eventType === 'attack-hit-by-hero');
        expect(attackHooks.length).toBeGreaterThan(0);

        // Furious Assault still unflipped (hasn't fired yet)
        const cardStates = state.heroes.heroPowerCards.tarak.cardStates;
        const furiousAssault = cardStates.find((s: {cardId: number}) => s.cardId === 31);
        expect(furiousAssault?.isFlipped).toBe(false);
      }
    });
  });

  test('Encounter cancel button displays cost dynamically from Redux state', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Select Quinn (Cleric) - standard setup
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');

    // STEP 2: Start the game
    await setupDeterministicGame(page);
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Give Quinn enough XP to enable the cancel button and draw an encounter
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      store.dispatch({
        type: 'game/setPartyResources',
        payload: { ...state.game.partyResources, xp: 10 }
      });
      store.dispatch({ type: 'game/setDrawnEncounter', payload: 'frenzied-leap' });
    });

    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });

    // STEP 3: Verify encounter cancel button displays the dynamic cost from Redux state
    await screenshots.capture(page, 'encounter-cancel-shows-dynamic-cost', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-card"]')).toBeVisible();

        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());

        // encounterCancelCost is managed in Redux state (new integration - was previously hardcoded)
        expect(state.game.encounterCancelCost).toBe(5);

        // The EncounterCard UI reads from the dynamic cancelCost prop sourced from Redux state
        await expect(page.locator('[data-testid="encounter-cancel"]')).toContainText('Cancel (5 XP)');
        await expect(page.locator('[data-testid="encounter-cancel"]')).toBeEnabled();
      }
    });

    // STEP 4: Dismiss the encounter
    await page.locator('[data-testid="encounter-continue"]').click();
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });

    // STEP 5: Register Perseverance hooks (simulate what would happen if Quinn had Perseverance)
    // Perseverance (ID 10) adds an encounter-draw hook that modifies cancel cost
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/registerEventHooks', payload: [{
        heroId: 'quinn',
        customAbility: 1,    // Healing Hymn (Quinn's custom ability)
        utility: 10,         // Perseverance
        atWills: [2, 3],
        daily: 5,
        cardStates: [
          { cardId: 1, isFlipped: false },
          { cardId: 10, isFlipped: false }, // Perseverance active and unflipped
          { cardId: 2, isFlipped: false },
          { cardId: 3, isFlipped: false },
          { cardId: 5, isFlipped: false },
        ],
        powerCards: [],
      }]});
    });

    // Draw another encounter
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      store.dispatch({
        type: 'game/setPartyResources',
        payload: { ...state.game.partyResources, xp: 10 }
      });
      store.dispatch({ type: 'game/setDrawnEncounter', payload: 'unbearable-heat' });
    });

    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });

    // STEP 6: Verify Perseverance hook is registered for encounter-draw events
    await screenshots.capture(page, 'encounter-with-perseverance-hooks-active', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-card"]')).toBeVisible();

        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());

        // Verify Perseverance (ID 10) hook is now registered for encounter-draw events
        const hookValues = Object.values(state.game.eventHooks.hooks) as Array<{eventType: string}>;
        const encounterHooks = hookValues.filter((h) => h.eventType === 'encounter-draw');
        expect(encounterHooks.length).toBeGreaterThan(0);

        // Cancel button shows the current encounterCancelCost from state
        await expect(page.locator('[data-testid="encounter-cancel"]')).toContainText('Cancel (5 XP)');
        await expect(page.locator('[data-testid="encounter-cancel"]')).toBeEnabled();
      }
    });
  });
});
