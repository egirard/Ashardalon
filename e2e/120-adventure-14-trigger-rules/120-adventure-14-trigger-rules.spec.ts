import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from '../helpers/screenshot-helper';

/**
 * Test 120 - Adventure 14 Trigger Rules
 *
 * User Story:
 * Adventure 14 has two special rules that activate during play:
 *
 * 1. **The Creeping Void**: At the start of each Villain Phase, if no hero is
 *    adjacent to another hero, an additional Encounter Card is drawn.
 *    Tested here: Verifies the game log shows the Creeping Void message and
 *    that the encounter card flag is set.
 *
 * 2. **Daze All Heroes (Chamber Reveal)**: When the Obsidian Sanctum is revealed,
 *    all heroes are Dazed for 1 turn. Tested by injecting the chamber reveal
 *    dispatch and verifying hero status effects.
 *
 * 3. **Reflect Natural One**: After the Obsidian Sanctum chamber is revealed,
 *    if a hero rolls a natural 1 on an attack, the void reflects the strike and
 *    deals 1 damage to that hero. Tested by injecting a natural-1 attack miss
 *    after the chamber is revealed.
 */

test.describe('120 - Adventure 14 Trigger Rules', () => {
  test('The Creeping Void draws extra encounter when heroes are isolated', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // -----------------------------------------------------------------------
    // STEP 1: Start Adventure 14 with 2 heroes (Quinn and Vistra)
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
      store.dispatch({ type: 'heroes/toggleHeroSelection', payload: 'vistra' });
      store.dispatch({ type: 'heroes/selectUtilityCard', payload: { heroId: 'vistra', cardId: 18 } });
      store.dispatch({ type: 'heroes/toggleAtWillCard', payload: { heroId: 'vistra', cardId: 12 } });
      store.dispatch({ type: 'heroes/toggleAtWillCard', payload: { heroId: 'vistra', cardId: 13 } });
      store.dispatch({ type: 'heroes/selectDailyCard', payload: { heroId: 'vistra', cardId: 15 } });
      store.dispatch({ type: 'heroes/finalizePowerCardSelections' });
      store.dispatch({ type: 'game/selectScenario', payload: 'adventure-14' });
      store.dispatch({
        type: 'game/startGame',
        payload: {
          heroIds: ['quinn', 'vistra'],
          positions: [{ x: 3, y: 3 }, { x: 3, y: 4 }],
          seed: 42,
        },
      });
    });

    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/dismissScenarioIntroduction' });
    });

    // -----------------------------------------------------------------------
    // STEP 2: Separate the heroes so no two are adjacent
    // Quinn at (2,2), Vistra at (3,6) — well separated
    // -----------------------------------------------------------------------
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/setHeroPosition', payload: { heroId: 'quinn', position: { x: 2, y: 2 } } });
      store.dispatch({ type: 'game/setHeroPosition', payload: { heroId: 'vistra', position: { x: 3, y: 5 } } });
      store.dispatch({ type: 'game/hideMovement' });
    });

    await expect(async () => {
      const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
      expect(state.game.heroTokens[0].position).toEqual({ x: 2, y: 2 });
      expect(state.game.heroTokens[1].position).toEqual({ x: 3, y: 5 });
    }).toPass();

    const logCountBefore = await page.evaluate(() =>
      (window as any).__REDUX_STORE__.getState().game.logEntries.length
    );

    await screenshots.capture(page, 'heroes-isolated-before-villain-phase', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.turnState.currentPhase).toBe('hero-phase');
        // Heroes are on different tiles (non-adjacent)
        expect(state.game.heroTokens[0].position).toEqual({ x: 2, y: 2 });
        expect(state.game.heroTokens[1].position).toEqual({ x: 3, y: 5 });
      },
    });

    // -----------------------------------------------------------------------
    // STEP 3: Trigger villain phase — Creeping Void should fire
    // -----------------------------------------------------------------------
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/setCurrentPhase', payload: 'villain-phase' });
    });

    // -----------------------------------------------------------------------
    // STEP 4: Verify Creeping Void fired (check game log)
    // -----------------------------------------------------------------------
    await screenshots.capture(page, 'villain-phase-creeping-void-triggered', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.turnState.currentPhase).toBe('villain-phase');

        // New log entries should exist
        const log = state.game.logEntries as Array<{ message: string }>;
        const newEntries = log.slice(logCountBefore);
        const creepingVoidLog = newEntries.find((e) =>
          e.message.includes('Creeping Void')
        );
        expect(creepingVoidLog).toBeDefined();
        expect(creepingVoidLog?.message).toContain('Creeping Void');

        // The extra encounter flag should have been set
        expect(state.game.badLuckExtraEncounterPending).toBe(true);
      },
    });
  });

  test('The Creeping Void does NOT fire when heroes are adjacent', async ({ page }) => {
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
      store.dispatch({ type: 'heroes/toggleHeroSelection', payload: 'vistra' });
      store.dispatch({ type: 'heroes/selectUtilityCard', payload: { heroId: 'vistra', cardId: 18 } });
      store.dispatch({ type: 'heroes/toggleAtWillCard', payload: { heroId: 'vistra', cardId: 12 } });
      store.dispatch({ type: 'heroes/toggleAtWillCard', payload: { heroId: 'vistra', cardId: 13 } });
      store.dispatch({ type: 'heroes/selectDailyCard', payload: { heroId: 'vistra', cardId: 15 } });
      store.dispatch({ type: 'heroes/finalizePowerCardSelections' });
      store.dispatch({ type: 'game/selectScenario', payload: 'adventure-14' });
      store.dispatch({
        type: 'game/startGame',
        payload: {
          heroIds: ['quinn', 'vistra'],
          positions: [{ x: 3, y: 3 }, { x: 3, y: 4 }],
          seed: 42,
        },
      });
    });

    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/dismissScenarioIntroduction' });
    });

    // Place heroes adjacent to each other
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/setHeroPosition', payload: { heroId: 'quinn', position: { x: 3, y: 3 } } });
      store.dispatch({ type: 'game/setHeroPosition', payload: { heroId: 'vistra', position: { x: 3, y: 4 } } }); // adjacent
      store.dispatch({ type: 'game/hideMovement' });
    });

    const logCountBefore = await page.evaluate(() =>
      (window as any).__REDUX_STORE__.getState().game.logEntries.length
    );

    // Trigger villain phase — Creeping Void should NOT fire
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/setCurrentPhase', payload: 'villain-phase' });
    });

    await screenshots.capture(page, 'villain-phase-no-creeping-void-when-adjacent', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());

        // No Creeping Void log entry should exist
        const log = state.game.logEntries as Array<{ message: string }>;
        const newEntries = log.slice(logCountBefore);
        const creepingVoidLog = newEntries.find((e) =>
          e.message.includes('Creeping Void')
        );
        expect(creepingVoidLog).toBeUndefined();

        // The extra encounter flag should NOT be set by Creeping Void
        // (it may still be set by bad luck curse, but that's separate)
      },
    });
  });

  test('Daze all heroes when Chamber Entrance (Obsidian Sanctum) is revealed', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // -----------------------------------------------------------------------
    // STEP 1: Start Adventure 14 with Quinn and Vistra
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
      store.dispatch({ type: 'heroes/toggleHeroSelection', payload: 'vistra' });
      store.dispatch({ type: 'heroes/selectUtilityCard', payload: { heroId: 'vistra', cardId: 18 } });
      store.dispatch({ type: 'heroes/toggleAtWillCard', payload: { heroId: 'vistra', cardId: 12 } });
      store.dispatch({ type: 'heroes/toggleAtWillCard', payload: { heroId: 'vistra', cardId: 13 } });
      store.dispatch({ type: 'heroes/selectDailyCard', payload: { heroId: 'vistra', cardId: 15 } });
      store.dispatch({ type: 'heroes/finalizePowerCardSelections' });
      store.dispatch({ type: 'game/selectScenario', payload: 'adventure-14' });
      store.dispatch({
        type: 'game/startGame',
        payload: {
          heroIds: ['quinn', 'vistra'],
          positions: [{ x: 2, y: 2 }, { x: 3, y: 2 }],
          seed: 42,
        },
      });
    });

    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/dismissScenarioIntroduction' });
    });

    // -----------------------------------------------------------------------
    // STEP 2: Inject the Chamber Entrance as the next tile in the deck
    // -----------------------------------------------------------------------
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/setHeroPosition', payload: { heroId: 'quinn', position: { x: 2, y: 0 } } });
      store.dispatch({ type: 'game/setTileDeck', payload: ['tile-chamber-entrance'] });
    });

    await screenshots.capture(page, 'before-chamber-reveal', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.scenario.chamberRevealed).toBe(false);
        expect(state.game.dungeon.tileDeck[0]).toBe('tile-chamber-entrance');
        // Heroes should not be dazed yet
        const quinnHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
        const vistraHp = state.game.heroHp.find((h: any) => h.heroId === 'vistra');
        const quinnDazed = quinnHp?.statuses?.some((s: any) => s.type === 'dazed');
        const vistraDazed = vistraHp?.statuses?.some((s: any) => s.type === 'dazed');
        expect(quinnDazed).toBeFalsy();
        expect(vistraDazed).toBeFalsy();
      },
    });

    // -----------------------------------------------------------------------
    // STEP 3: End hero phase to trigger exploration → Chamber Entrance revealed
    // -----------------------------------------------------------------------
    await page.locator('[data-testid="end-phase-button"]').click();
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');

    // Wait for room set to be placed
    await expect(async () => {
      const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
      expect(state.game.scenario.chamberRevealed).toBe(true);
    }).toPass({ timeout: 5000 });

    // -----------------------------------------------------------------------
    // STEP 4: Verify both heroes are Dazed
    // -----------------------------------------------------------------------
    await screenshots.capture(page, 'after-chamber-reveal-heroes-dazed', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());

        // Chamber should now be revealed
        expect(state.game.scenario.chamberRevealed).toBe(true);

        // Both heroes should be dazed (Daze All Heroes chamber reveal effect)
        const quinnHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
        const vistraHp = state.game.heroHp.find((h: any) => h.heroId === 'vistra');
        const quinnDazed = quinnHp?.statuses?.some((s: any) => s.type === 'dazed');
        const vistraDazed = vistraHp?.statuses?.some((s: any) => s.type === 'dazed');
        expect(quinnDazed).toBe(true);
        expect(vistraDazed).toBe(true);

        // Log should mention the daze effect
        const log = state.game.logEntries as Array<{ message: string }>;
        const dazeLog = log.find((e) => e.message.includes('dazed'));
        expect(dazeLog).toBeDefined();
      },
    });
  });

  test('Reflect Natural One deals 1 damage after Obsidian Sanctum is revealed', async ({ page }) => {
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
        payload: { heroIds: ['quinn'], positions: [{ x: 2, y: 2 }], seed: 42 },
      });
    });

    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/dismissScenarioIntroduction' });
    });

    // -----------------------------------------------------------------------
    // STEP 2: Reveal the chamber (which registers the reflect-natural-one hook)
    // -----------------------------------------------------------------------
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/setHeroPosition', payload: { heroId: 'quinn', position: { x: 2, y: 0 } } });
      store.dispatch({ type: 'game/setTileDeck', payload: ['tile-chamber-entrance'] });
    });

    await page.locator('[data-testid="end-phase-button"]').click();
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');
    await expect(async () => {
      const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
      expect(state.game.scenario.chamberRevealed).toBe(true);
    }).toPass({ timeout: 5000 });

    // Skip through to hero phase
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/dismissMonsterCard' });
      store.dispatch({ type: 'game/endExplorationPhase' });
      store.dispatch({ type: 'game/endVillainPhase' });
    });

    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');

    // -----------------------------------------------------------------------
    // STEP 3: Inject a monster adjacent to Quinn
    // -----------------------------------------------------------------------
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      // Quinn moved during exploration, find her current position
      const quinnToken = state.game.heroTokens.find((t: any) => t.heroId === 'quinn');
      const quinnPos = quinnToken?.position ?? { x: 2, y: 2 };
      store.dispatch({ type: 'game/setHeroPosition', payload: { heroId: 'quinn', position: { x: 3, y: 3 } } });
      store.dispatch({ type: 'game/hideMovement' });
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-target',
          position: { x: 3, y: 4 },
          currentHp: 5,
          controllerId: 'quinn',
          tileId: 'start-tile',
        }],
      });
    });

    // Get Quinn's HP before the natural-1 attack
    const hpBefore = await page.evaluate(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.heroHp.find((h: any) => h.heroId === 'quinn')?.currentHp ?? 0;
    });

    // -----------------------------------------------------------------------
    // STEP 4: Simulate a natural-1 miss (attack roll result with roll=1)
    // -----------------------------------------------------------------------
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // Fix Math.random to produce roll=1 (natural 1)
      Math.random = () => 0.001; // 0.001 * 20 ≈ 0.02 + 1 = 1 on d20
      store.dispatch({
        type: 'game/setAttackResult',
        payload: {
          result: {
            roll: 1,       // Natural 1
            attackBonus: 6,
            total: 7,      // 7 vs any AC = miss
            targetAC: 15,
            isHit: false,
            damage: 0,
            isCritical: false,
          },
          targetInstanceId: 'kobold-target',
        },
      });
    });

    // -----------------------------------------------------------------------
    // STEP 5: Verify Quinn took 1 damage from Reflect Natural One
    // -----------------------------------------------------------------------
    await screenshots.capture(page, 'natural-1-reflect-damages-hero', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());

        // Quinn's HP should have decreased by 1
        const quinnHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
        expect(quinnHp?.currentHp).toBe(hpBefore - 1);

        // Log should reference the void reflecting the attack
        const log = state.game.logEntries as Array<{ message: string }>;
        const reflectLog = log.find((e) =>
          e.message.includes('void') || e.message.includes('reflect') || e.message.includes('💫')
        );
        expect(reflectLog).toBeDefined();
      },
    });
  });
});
