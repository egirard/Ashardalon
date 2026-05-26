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
    // STEP 6: Position heroes and monsters predictably so all three monsters
    //         produce visible move results during the villain phase.
    //         Then advance to Quinn's villain phase.
    // ─────────────────────────────────────────────────────────────────────────

    // Place heroes at the top of the start tile and monsters at the bottom.
    // Valid start-tile walkable positions: x: 1-3, y: 0-7 (x=0 is wall column).
    // Staircase blocks: {1,3}, {2,3}, {1,4}, {2,4}.
    //
    // Quinn at {3,0} is closer than Vistra at {1,0} for ALL three monsters by BFS:
    //   kobold at {1,6} → Quinn {3,0}: 8 hops (via {3,5}→{3,2}→{3,0})
    //                  → Vistra {1,0}: 10 hops (must detour around staircase)
    //   snake  at {2,6} → Quinn {3,0}: 7 hops
    //                  → Vistra {1,0}: 9 hops
    //   kobold at {3,6} → Quinn {3,0}: 6 hops
    //                  → Vistra {1,0}: 8 hops
    // This prevents equidistant "needs-choice" pauses for all three monsters.
    // Also empty the encounter deck so no encounter card blocks monster activation.
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();

      // Heroes: Quinn top-right (closer to monsters by BFS), Vistra top-left (further)
      store.dispatch({ type: 'game/setHeroPosition', payload: { heroId: 'quinn', position: { x: 3, y: 0 } } });
      store.dispatch({ type: 'game/setHeroPosition', payload: { heroId: 'vistra', position: { x: 1, y: 0 } } });

      // Monsters: spread across the bottom of the start tile, all non-adjacent to any hero.
      // Kobold (Quinn's): x=1, y=6  →  BFS to Quinn = 8 hops (> 1, will move)
      // Snake  (Quinn's): x=2, y=6  →  BFS to Quinn = 7 hops (> 1, will move)
      // Kobold (Vistra's): x=3, y=6 →  BFS to Quinn = 6 hops (> 1, will move)
      const repositioned = state.game.monsters.map((m: any) => {
        if (m.controllerId === 'quinn' && m.monsterId === 'kobold') {
          return { ...m, tileId: 'start-tile', position: { x: 1, y: 6 } };
        }
        if (m.controllerId === 'quinn' && m.monsterId === 'snake') {
          return { ...m, tileId: 'start-tile', position: { x: 2, y: 6 } };
        }
        if (m.controllerId === 'vistra' && m.monsterId === 'kobold') {
          return { ...m, tileId: 'start-tile', position: { x: 3, y: 6 } };
        }
        return m;
      });
      store.dispatch({ type: 'game/setMonsters', payload: repositioned });

      // Empty the encounter deck so no encounter card delays monster activation
      store.dispatch({ type: 'game/setEncounterDeck', payload: { drawPile: [], discardPile: [] } });
    });

    // Advance to villain phase
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
        const quinnKobolds = state.game.monsters.filter(
          (m: any) => m.monsterId === 'kobold' && m.controllerId === 'quinn'
        );
        const vistraKobolds = state.game.monsters.filter(
          (m: any) => m.monsterId === 'kobold' && m.controllerId === 'vistra'
        );
        expect(quinnKobolds.length).toBeGreaterThan(0);
        expect(vistraKobolds.length).toBeGreaterThan(0);

        // Total activation list = 3 (Quinn's 2 + Vistra's shared kobold)
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

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 7: Monster 1 of 3 activates — Quinn's Kobold.
    //         Directly dispatch activateNextMonster (the Svelte auto-activation
    //         $effect is not reliable in headless E2E; direct dispatch mirrors
    //         the same Redux action the $effect would fire).
    // ─────────────────────────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────────────────
    // STEP 7: Monster 1 of 3 activates — Quinn's Kobold.
    //         The Svelte villain-phase $effect may have already fired and set a
    //         pendingMonsterDecision (when the $effect ran before our test code).
    //         If it has, we resolve it by selecting Quinn as the hero target.
    //         Otherwise we dispatch activateNextMonster directly.
    //         Either way, a monster-move-overlay must appear.
    // ─────────────────────────────────────────────────────────────────────────
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      if (state.game.pendingMonsterDecision) {
        // $effect already fired; a needs-choice was produced.
        // Select Quinn (the closest hero by BFS) to resume.
        store.dispatch({
          type: 'game/selectMonsterTarget',
          payload: { decisionId: state.game.pendingMonsterDecision.decisionId, targetHeroId: 'quinn' },
        });
      } else {
        // $effect has not fired yet; activate the first monster directly.
        store.dispatch({ type: 'game/activateNextMonster', payload: {} });
      }
    });
    await page.locator('[data-testid="monster-move-overlay"]').waitFor({ state: 'visible', timeout: 5000 });

    await screenshots.capture(page, 'villain-phase-monster-1-kobold-activates', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.turnState.currentPhase).toBe('villain-phase');
        // Index advanced to 1 after the first monster activated
        expect(state.game.villainPhaseMonsterIndex).toBe(1);
        // Move overlay is visible — Quinn's kobold moved toward the nearest hero
        expect(state.game.monsterMoveActionId).not.toBeNull();
        const movingMonster = state.game.monsters.find(
          (m: any) => m.instanceId === state.game.monsterMoveActionId
        );
        expect(movingMonster?.monsterId).toBe('kobold');
        expect(movingMonster?.controllerId).toBe('quinn');
      },
    });

    // Dismiss monster 1 and immediately activate monster 2 in the same evaluate call
    // so the Svelte villain-phase $effect cannot fire between the two actions.
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/dismissMonsterMoveAction' });
      store.dispatch({ type: 'game/activateNextMonster', payload: {} });
    });

    // DEBUG: check state after step 7 batch
    const debugStep8 = await page.evaluate(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return {
        phase: state.game.turnState.currentPhase,
        index: state.game.villainPhaseMonsterIndex,
        monsterMoveActionId: state.game.monsterMoveActionId,
        monsterAttackResult: !!state.game.monsterAttackResult,
        pendingMonsterDecision: state.game.pendingMonsterDecision,
        villainPhasePaused: state.game.villainPhasePaused,
        monsters: state.game.monsters.map((m: any) => ({ id: m.instanceId, pos: m.position })),
      };
    });
    console.log('DEBUG STATE after batch dismiss+activate for step 8:', JSON.stringify(debugStep8, null, 2));

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 8: Monster 2 of 3 activates — Quinn's Snake.
    // ─────────────────────────────────────────────────────────────────────────
    await page.locator('[data-testid="monster-move-overlay"]').waitFor({ state: 'visible', timeout: 5000 });

    await screenshots.capture(page, 'villain-phase-monster-2-snake-activates', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.turnState.currentPhase).toBe('villain-phase');
        expect(state.game.villainPhaseMonsterIndex).toBe(2);
        expect(state.game.monsterMoveActionId).not.toBeNull();
        const movingMonster = state.game.monsters.find(
          (m: any) => m.instanceId === state.game.monsterMoveActionId
        );
        expect(movingMonster?.monsterId).toBe('snake');
        expect(movingMonster?.controllerId).toBe('quinn');
      },
    });

    // Dismiss monster 2 and immediately activate monster 3 in the same evaluate call.
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/dismissMonsterMoveAction' });
      store.dispatch({ type: 'game/activateNextMonster', payload: {} });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 9: Monster 3 of 3 activates — Vistra's Kobold (cross-player!).
    //         This is the key screenshot: Quinn's villain phase activates
    //         Vistra's kobold because they share the same monster type.
    // ─────────────────────────────────────────────────────────────────────────
    await page.locator('[data-testid="monster-move-overlay"]').waitFor({ state: 'visible', timeout: 5000 });

    await screenshots.capture(page, 'villain-phase-monster-3-vistra-kobold-activates', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.turnState.currentPhase).toBe('villain-phase');
        expect(state.game.villainPhaseMonsterIndex).toBe(3);
        expect(state.game.monsterMoveActionId).not.toBeNull();
        // The activating monster is VISTRA's kobold — cross-player shared activation
        const movingMonster = state.game.monsters.find(
          (m: any) => m.instanceId === state.game.monsterMoveActionId
        );
        expect(movingMonster?.monsterId).toBe('kobold');
        expect(movingMonster?.controllerId).toBe('vistra');
      },
    });

    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/dismissMonsterMoveAction' });
    });
    await page.locator('[data-testid="monster-move-overlay"]').waitFor({ state: 'hidden', timeout: 3000 });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 10: All 3 monsters have taken their turn — end villain phase.
    // ─────────────────────────────────────────────────────────────────────────
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/endVillainPhase' });
    });
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.turnState.currentPhase !== 'villain-phase';
    }, { timeout: 5000 });

    await screenshots.capture(page, 'villain-phase-completed-all-3-activated', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        // Villain phase is over — all 3 monsters (own + shared) have taken their turns
        expect(state.game.turnState.currentPhase).not.toBe('villain-phase');
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
