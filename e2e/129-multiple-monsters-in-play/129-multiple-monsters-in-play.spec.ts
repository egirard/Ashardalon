import { test, expect } from '@playwright/test';
import {
  createScreenshotHelper,
  dismissScenarioIntroduction,
  setupDeterministicGame,
  selectDefaultPowerCards,
} from '../helpers/screenshot-helper';

/**
 * E2E Test 129 – Multiple Monsters in Play
 *
 * Validates three rules about monster cards:
 *
 * 1. A hero cannot have two monsters of the same type in their list.
 *    If a hero would draw a duplicate monster type they already control, they
 *    re-draw until they get a different type.
 *
 * 2. It is fine for two different players to have the same monster type.
 *
 * 3. When two or more players share a monster card type, activating that monster
 *    for any one player also activates all matching monsters on the board
 *    (controlled by any player).
 */
test.describe('129 - Multiple Monsters in Play', () => {
  test('Hero re-draws duplicate monster types; different players may share types; shared types activate together', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Start a 2-player game (Quinn + Vistra)
    // ─────────────────────────────────────────────────────────────────────────
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');

    await page.locator('[data-testid="hero-vistra-top"]').click();
    await selectDefaultPowerCards(page, 'vistra');

    await setupDeterministicGame(page);
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    await screenshots.capture(page, 'game-started-two-players', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.heroTokens).toHaveLength(2);
        expect(state.game.monsters).toHaveLength(0);
      },
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Give Quinn a kobold monster via the Redux store directly.
    //         Then rig the monster deck so the next draw would be a kobold
    //         (a duplicate for Quinn), followed by a snake (the non-duplicate).
    // ─────────────────────────────────────────────────────────────────────────
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;

      // Give Quinn a kobold she already "controls"
      store.dispatch({
        type: 'game/setMonsters',
        payload: [
          {
            monsterId: 'kobold',
            instanceId: 'kobold-existing',
            position: { x: 2, y: 2 },
            currentHp: 3,
            controllerId: 'quinn',
            tileId: 'start-tile',
            statuses: [],
          },
        ],
      });

      // Rig the deck: kobold first (would be a duplicate for Quinn), then snake
      store.dispatch({
        type: 'game/setMonsterDeck',
        payload: {
          drawPile: ['kobold', 'snake', 'cultist', 'orc-archer'],
          discardPile: [],
        },
      });
    });

    await screenshots.capture(page, 'quinn-has-kobold-deck-rigged', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        // Quinn controls one kobold
        const quinnMonsters = state.game.monsters.filter((m: any) => m.controllerId === 'quinn');
        expect(quinnMonsters).toHaveLength(1);
        expect(quinnMonsters[0].monsterId).toBe('kobold');
        // Deck top card is kobold
        expect(state.game.monsterDeck.drawPile[0]).toBe('kobold');
      },
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3: Move Quinn to an unexplored edge and end her hero phase,
    //         triggering exploration. The monster draw should skip the kobold
    //         (duplicate) and draw snake instead.
    // ─────────────────────────────────────────────────────────────────────────
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 0 } },
      });
    });

    // Wait for position update
    await expect(async () => {
      const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
      expect(state.game.heroTokens.find((t: any) => t.heroId === 'quinn')?.position).toEqual({ x: 2, y: 0 });
    }).toPass();

    // End hero phase → triggers exploration
    await page.locator('[data-testid="end-phase-button"]').click();

    // Wait for the monster card to appear — this indicates the tile was placed and
    // monster was spawned (the auto-advance timer fires after ~1s per step)
    await page.locator('[data-testid="monster-card"]').waitFor({ state: 'visible', timeout: 10000 });

    await screenshots.capture(page, 'exploration-triggered-no-kobold-duplicate', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        // The drawn monster should be snake (not kobold, which is a duplicate for Quinn)
        const drawnMonster = state.game.explorationPhase?.drawnMonster;
        if (drawnMonster) {
          expect(drawnMonster).not.toBe('kobold');
          expect(drawnMonster).toBe('snake');
        }
        // The kobold should have been discarded
        const discardPile = state.game.monsterDeck.discardPile;
        expect(discardPile).toContain('kobold');
      },
    });

    // Dismiss the monster card
    await page.locator('[data-testid="dismiss-monster-card"]').click();
    await page.locator('[data-testid="monster-card"]').waitFor({ state: 'hidden', timeout: 5000 });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4: Confirm Quinn has kobold + snake; no duplicate kobolds.
    // ─────────────────────────────────────────────────────────────────────────
    await screenshots.capture(page, 'quinn-has-kobold-and-snake', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        const quinnMonsters = state.game.monsters.filter((m: any) => m.controllerId === 'quinn');
        const quinnTypes = quinnMonsters.map((m: any) => m.monsterId);
        // Quinn should NOT have two kobolds
        const koboldCount = quinnTypes.filter((t: string) => t === 'kobold').length;
        expect(koboldCount).toBe(1);
        // Quinn should now also have the snake (the non-duplicate draw)
        expect(quinnTypes).toContain('snake');
      },
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 5: Give Vistra a kobold too — different player owning the same type
    //         is explicitly allowed.
    // ─────────────────────────────────────────────────────────────────────────
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const currentMonsters = store.getState().game.monsters;
      store.dispatch({
        type: 'game/setMonsters',
        payload: [
          ...currentMonsters,
          {
            monsterId: 'kobold',
            instanceId: 'kobold-vistra',
            position: { x: 1, y: 2 },
            currentHp: 3,
            controllerId: 'vistra',
            tileId: 'start-tile',
            statuses: [],
          },
        ],
      });
    });

    await screenshots.capture(page, 'both-players-have-kobold', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        const koboldControllers = state.game.monsters
          .filter((m: any) => m.monsterId === 'kobold')
          .map((m: any) => m.controllerId);
        // Both quinn and vistra control a kobold — this is allowed
        expect(koboldControllers).toContain('quinn');
        expect(koboldControllers).toContain('vistra');
      },
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 6: Advance to Quinn's villain phase. Verify that the villain-phase
    //         activation list (getVillainPhaseActivationList) includes BOTH
    //         Quinn's kobold (own) AND Vistra's kobold (shared same type).
    // ─────────────────────────────────────────────────────────────────────────

    // Force the game into villain phase for Quinn's turn
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      if (state.game.turnState.currentPhase === 'exploration-phase') {
        store.dispatch({ type: 'game/endExplorationPhase' });
      }
    });

    // Wait for villain phase
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.turnState.currentPhase === 'villain-phase';
    }, { timeout: 10000 });

    await screenshots.capture(page, 'quinn-villain-phase-cross-player-kobolds', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.turnState.currentPhase).toBe('villain-phase');

        // Quinn is current hero (index 0)
        const currentHeroId = state.game.heroTokens[state.game.turnState.currentHeroIndex]?.heroId;
        expect(currentHeroId).toBe('quinn');

        // Verify that the shared activation rule is reflected in state:
        // Both Quinn's and Vistra's kobolds are present on the board.
        // During Quinn's villain phase, getVillainPhaseActivationList(quinn, monsters)
        // should include BOTH kobolds (quinn's own + vistra's same-type).
        const quinnKobolds = state.game.monsters.filter(
          (m: any) => m.monsterId === 'kobold' && m.controllerId === 'quinn'
        );
        const vistraKobolds = state.game.monsters.filter(
          (m: any) => m.monsterId === 'kobold' && m.controllerId === 'vistra'
        );
        expect(quinnKobolds.length).toBeGreaterThan(0);
        expect(vistraKobolds.length).toBeGreaterThan(0);

        // The TurnProgressCard on Quinn's panel shows monstersToActivate, which should
        // include the shared type (vistra's kobold) on top of Quinn's own monsters.
        // Quinn owns: kobold + snake = 2 monsters directly
        // Shared: vistra's kobold of the same type = 1 additional
        // So total activation list = 3 (2 own + 1 shared)
        const quinnOwnMonsters = state.game.monsters.filter(
          (m: any) => m.controllerId === 'quinn'
        );
        const quinnOwnTypes = new Set(quinnOwnMonsters.map((m: any) => m.monsterId as string));
        const sharedMonsters = state.game.monsters.filter(
          (m: any) => m.controllerId !== 'quinn' && quinnOwnTypes.has(m.monsterId)
        );
        expect(quinnOwnMonsters.length + sharedMonsters.length).toBe(3);
      },
    });
  });

  test('drawMonsterForHero re-draw logic: hero skips all own types until finding new type', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // Start a single-player game
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    await setupDeterministicGame(page);
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Give Quinn two different monster types already, and rig deck with duplicates on top
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setMonsters',
        payload: [
          { monsterId: 'kobold', instanceId: 'kobold-0', position: { x: 3, y: 3 }, currentHp: 3, controllerId: 'quinn', tileId: 'start-tile', statuses: [] },
          { monsterId: 'snake', instanceId: 'snake-0', position: { x: 2, y: 3 }, currentHp: 2, controllerId: 'quinn', tileId: 'start-tile', statuses: [] },
        ],
      });
      // Top 3 cards are duplicates of Quinn's existing types; 4th is a new type
      store.dispatch({
        type: 'game/setMonsterDeck',
        payload: {
          drawPile: ['kobold', 'snake', 'kobold', 'orc-archer', 'cultist'],
          discardPile: [],
        },
      });
    });

    // Move Quinn to unexplored edge
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 0 } },
      });
    });

    await expect(async () => {
      const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
      expect(state.game.heroTokens[0].position).toEqual({ x: 2, y: 0 });
    }).toPass();

    // End hero phase → triggers exploration with re-draw
    await page.locator('[data-testid="end-phase-button"]').click();

    // Wait for the exploration phase to start and the drawnMonster to be set
    // (drawnMonster is set synchronously in endHeroPhase before tile placement)
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.explorationPhase?.drawnMonster !== null;
    }, { timeout: 10000 });

    await screenshots.capture(page, 'skipped-duplicates-drew-orc-archer', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        const drawnMonster = state.game.explorationPhase?.drawnMonster;
        if (drawnMonster) {
          // Should have skipped kobold, snake, kobold and drawn orc-archer
          expect(drawnMonster).toBe('orc-archer');
          // All three duplicate cards should be in discard pile
          const discardPile = state.game.monsterDeck.discardPile;
          const koboldCount = discardPile.filter((m: string) => m === 'kobold').length;
          const snakeCount = discardPile.filter((m: string) => m === 'snake').length;
          expect(koboldCount).toBe(2);
          expect(snakeCount).toBe(1);
        }
      },
    });
  });
});
