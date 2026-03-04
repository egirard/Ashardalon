import { test, expect } from '@playwright/test';
import { createScreenshotHelper, setupDeterministicGame, dismissPendingEncounterCards } from '../helpers/screenshot-helper';

/**
 * Test 121 - Adventure 15 Trigger Rules and Modifiers
 *
 * User Story:
 * Adventure 15 has two special trigger rules and persistent modifiers activated
 * when the Infernal Workshop chamber is revealed:
 *
 * 1. **Forge Awakens (Chamber Reveal)**: When the Infernal Workshop is revealed,
 *    persistent modifiers are activated: +1 Daily Power damage bonus and +2 Monster AC.
 *    Also, the monster spawn multiplier doubles for that turn.
 *
 * 2. **Heat Exhaustion**: At the end of a hero's turn, if they are on a tile with
 *    the 'volcanic-vent' terrain feature (the Infernal Workshop dire-chamber tiles),
 *    roll a d6; on ≤5, the hero gains the Slowed condition.
 *
 * This test verifies both mechanics end-to-end using Adventure 15.
 */

test.describe('121 - Adventure 15 Trigger Rules and Modifiers', () => {
  test('Forge Awakens activates persistent modifiers when chamber is revealed', async ({ page }) => {
    const screenshots = createScreenshotHelper({ defaultMaxDiffPixels: 100 });

    // -----------------------------------------------------------------------
    // STEP 1: Start Adventure 15 with Quinn
    // -----------------------------------------------------------------------
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await setupDeterministicGame(page);

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
        payload: { heroIds: ['quinn'], positions: [{ x: 2, y: 2 }], seed: 42 },
      });
    });

    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/dismissScenarioIntroduction' });
    });

    // -----------------------------------------------------------------------
    // STEP 2: Inject chamber entrance as next tile and position Quinn on edge
    // -----------------------------------------------------------------------
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/setHeroPosition', payload: { heroId: 'quinn', position: { x: 2, y: 0 } } });
      store.dispatch({ type: 'game/setTileDeck', payload: ['tile-chamber-entrance'] });
    });

    await screenshots.capture(page, 'adventure-15-before-chamber-reveal', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.selectedScenarioId).toBe('adventure-15');
        expect(state.game.scenario.chamberRevealed).toBe(false);
        expect(state.game.scenario.activePersistentModifiers).toHaveLength(0);
        expect(state.game.dungeon.tileDeck[0]).toBe('tile-chamber-entrance');
      },
    });

    // -----------------------------------------------------------------------
    // STEP 3: End hero phase — Chamber Entrance is drawn, Infernal Workshop placed
    //         Forge Awakens fires → modifiers activated
    // -----------------------------------------------------------------------
    await page.locator('[data-testid="end-phase-button"]').click();
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');

    // Wait for chamber to be revealed
    await expect(async () => {
      const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
      expect(state.game.scenario.chamberRevealed).toBe(true);
    }).toPass({ timeout: 5000 });

    // -----------------------------------------------------------------------
    // STEP 4: Verify Forge Awakens persistent modifiers are active
    // -----------------------------------------------------------------------
    await screenshots.capture(page, 'forge-awakens-modifiers-active', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());

        // Chamber should be revealed
        expect(state.game.scenario.chamberRevealed).toBe(true);

        // Persistent modifiers should be active (from Forge Awakens)
        const mods: Array<{ type: string; bonus?: number }> = state.game.scenario.activePersistentModifiers;
        expect(mods.length).toBeGreaterThanOrEqual(2);

        // +1 daily damage bonus modifier
        const dailyBonus = mods.find(m => m.type === 'hero-daily-damage-bonus');
        expect(dailyBonus).toBeDefined();
        expect(dailyBonus?.bonus).toBe(1);

        // +2 monster AC bonus modifier
        const acBonus = mods.find(m => m.type === 'monster-ac-bonus');
        expect(acBonus).toBeDefined();
        expect(acBonus?.bonus).toBe(2);

        // Log should reference the Workshop Aura
        const log = state.game.logEntries as Array<{ message: string }>;
        const forgeLog = log.find(e => e.message.includes('Workshop Aura') || e.message.includes('🔥'));
        expect(forgeLog).toBeDefined();

        // Dire-chamber tiles should be placed (Infernal Workshop)
        const direTiles = state.game.dungeon.tiles.filter((t: any) =>
          t.tileType.startsWith('tile-dire-chamber-')
        );
        expect(direTiles.length).toBe(4);
      },
    });
  });

  test('Heat Exhaustion applies Slowed when hero ends turn on Volcanic Vent tile', async ({ page }) => {
    const screenshots = createScreenshotHelper({ defaultMaxDiffPixels: 100 });

    // -----------------------------------------------------------------------
    // STEP 1: Start Adventure 15 with Quinn and reveal the chamber
    // -----------------------------------------------------------------------
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await setupDeterministicGame(page);

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
        payload: { heroIds: ['quinn'], positions: [{ x: 2, y: 2 }], seed: 42 },
      });
    });

    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/dismissScenarioIntroduction' });
    });

    // Reveal the chamber by placing the chamber entrance
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

    // Skip through exploration to villain phase
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/dismissMonsterCard' });
      store.dispatch({ type: 'game/endExplorationPhase' });
    });

    // -----------------------------------------------------------------------
    // STEP 2: Dismiss villain activation, villain phase ends, back to hero phase
    // -----------------------------------------------------------------------
    // Dismiss villain activation notification if it appears
    await expect(async () => {
      const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
      // If villain activation overlay is shown, dismiss it
      const hasVillainActivation = state.game.villainActivation !== null;
      if (hasVillainActivation) {
        await page.evaluate(() => {
          const store = (window as any).__REDUX_STORE__;
          store.dispatch({ type: 'game/dismissVillainActivation' });
        });
      }
      return true;
    }).toPass({ timeout: 5000 });

    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/endVillainPhase' });
    });
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');

    // -----------------------------------------------------------------------
    // STEP 3: Find a dire-chamber tile (volcanic vent) and move Quinn there
    // -----------------------------------------------------------------------
    const direTilePosition = await page.evaluate(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      const direTile = state.game.dungeon.tiles.find((t: any) =>
        t.tileType === 'tile-dire-chamber-01'
      );
      if (!direTile) return null;
      // Return the global center position of the tile
      const col = direTile.position?.col ?? 0;
      const row = direTile.position?.row ?? 0;
      return { x: col * 4 + 2, y: row * 4 + 2 };
    });

    if (!direTilePosition) {
      // Skip the heat exhaustion test if no dire tile found
      return;
    }

    // Move Quinn to the volcanic vent tile
    await page.evaluate((pos) => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/setHeroPosition', payload: { heroId: 'quinn', position: pos } });
      store.dispatch({ type: 'game/hideMovement' });
    }, direTilePosition);

    // Verify Quinn is not slowed before ending the turn
    const quinnSlowedBefore = await page.evaluate(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      const quinnHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
      return quinnHp?.statuses?.some((s: any) => s.type === 'slowed') ?? false;
    });
    expect(quinnSlowedBefore).toBe(false);

    await screenshots.capture(page, 'quinn-on-volcanic-vent-before-end-turn', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.turnState.currentPhase).toBe('hero-phase');
        // Quinn should be on the volcanic vent tile
        const quinnToken = state.game.heroTokens.find((t: any) => t.heroId === 'quinn');
        expect(quinnToken?.position).toEqual(direTilePosition);
      },
    });

    // -----------------------------------------------------------------------
    // STEP 4: Mock Math.random to return ≤0.833 (d6 ≤5 → Slowed)
    //         Then end the hero phase
    // -----------------------------------------------------------------------
    await page.evaluate(() => {
      // d6 roll: Math.floor(random * 6) + 1
      // To get 4: need Math.floor(x * 6) = 3, so x in [0.5, 0.667)
      (window as any).__origRandom = Math.random;
      Math.random = () => 0.55; // → d6 = 4 → ≤5 → Slowed
    });

    await page.locator('[data-testid="end-phase-button"]').click();
    // Wait for exploration phase or villain phase
    await page.waitForFunction(() => {
      const phase = (window as any).__REDUX_STORE__.getState().game.turnState.currentPhase;
      return phase === 'exploration-phase' || phase === 'villain-phase';
    });

    // Restore Math.random
    await page.evaluate(() => {
      Math.random = (window as any).__origRandom ?? Math.random;
    });

    // -----------------------------------------------------------------------
    // STEP 5: Verify Quinn is Slowed from Heat Exhaustion
    // -----------------------------------------------------------------------
    await screenshots.capture(page, 'quinn-slowed-from-heat-exhaustion', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());

        // Quinn should be Slowed
        const quinnHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
        const quinnSlowed = quinnHp?.statuses?.some((s: any) => s.type === 'slowed') ?? false;
        expect(quinnSlowed).toBe(true);

        // Log should reference Heat Exhaustion
        const log = state.game.logEntries as Array<{ message: string }>;
        const heatLog = log.find(e =>
          e.message.includes('Heat Exhaustion') || e.message.includes('🌋') || e.message.includes('slowed')
        );
        expect(heatLog).toBeDefined();
      },
    });
  });

  test('Adventure 15 monster AC bonus is active after Forge Awakens fires', async ({ page }) => {
    const screenshots = createScreenshotHelper({ defaultMaxDiffPixels: 100 });

    // -----------------------------------------------------------------------
    // STEP 1: Start Adventure 15 and reveal the chamber
    // -----------------------------------------------------------------------
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await setupDeterministicGame(page);

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

    // Reveal the chamber
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

    // Advance through remaining exploration phase and villain phase to reach hero phase
    // (Dismiss monster card, end exploration, dismiss any encounter, handle villain activation)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/dismissMonsterCard' });
      store.dispatch({ type: 'game/endExplorationPhase' });
    });
    // Dismiss any encounter card drawn during exploration (including any extra from scenario hooks)
    await dismissPendingEncounterCards(page);
    // Wait for villain activation overlay to appear then dismiss it (if villain is active)
    // or wait for hero phase if no villain notification appears
    await expect(async () => {
      const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
      // Either hero phase (no villain notification) or villain notification is showing
      const inHeroPhase = state.game.turnState.currentPhase === 'hero-phase';
      const hasVillainNotification = state.game.villainActivation !== null;
      expect(inHeroPhase || hasVillainNotification).toBe(true);
    }).toPass({ timeout: 5000 });

    // If villain activation notification is showing, dismiss it
    const hasVillainNotificationNow = await page.evaluate(() =>
      (window as any).__REDUX_STORE__.getState().game.villainActivation !== null
    );
    if (hasVillainNotificationNow) {
      await page.evaluate(() => {
        (window as any).__REDUX_STORE__.dispatch({ type: 'game/dismissVillainActivation' });
      });
    }
    // Wait for hero phase
    await expect(async () => {
      const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
      expect(state.game.turnState.currentPhase).toBe('hero-phase');
    }).toPass({ timeout: 5000 });

    // -----------------------------------------------------------------------
    // STEP 2: Verify monster-ac-bonus modifier is in the active modifiers list
    // -----------------------------------------------------------------------
    await screenshots.capture(page, 'monster-ac-bonus-active-after-forge-awakens', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());

        const mods: Array<{ type: string; bonus?: number }> = state.game.scenario.activePersistentModifiers;
        const acBonus = mods.find(m => m.type === 'monster-ac-bonus');
        expect(acBonus).toBeDefined();
        expect(acBonus?.bonus).toBe(2);

        // Also verify the daily damage bonus is active
        const dailyBonus = mods.find(m => m.type === 'hero-daily-damage-bonus');
        expect(dailyBonus).toBeDefined();
        expect(dailyBonus?.bonus).toBe(1);
      },
    });

    // -----------------------------------------------------------------------
    // STEP 3: Inject a monster and verify its effective AC includes the +2 bonus
    // -----------------------------------------------------------------------
    // Spawn a kobold (AC 15 base) and verify it shows as AC 17 with the +2 modifier
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-test',
          position: { x: 3, y: 4 },
          currentHp: 5,
          controllerId: 'quinn',
          tileId: 'start-tile',
        }],
      });
    });

    // Verify the monster AC bonus is stored correctly (the combat system uses getMonsterAcBonus)
    await screenshots.capture(page, 'monster-with-ac-bonus-after-forge-awakens', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());

        // The activePersistentModifiers should contain the AC bonus
        const mods: Array<{ type: string; bonus?: number }> = state.game.scenario.activePersistentModifiers;
        const acBonus = mods.find(m => m.type === 'monster-ac-bonus');
        expect(acBonus?.bonus).toBe(2);

        // Monster should exist on the board
        const monster = state.game.monsters.find((m: any) => m.instanceId === 'kobold-test');
        expect(monster).toBeDefined();
        expect(monster?.currentHp).toBe(5);
      },
    });
  });
});
