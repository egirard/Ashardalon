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
    // STEP 6: Reposition heroes and monsters for a fully deterministic villain
    //         phase where every activation produces a visible attack overlay.
    //
    //   Start-tile walkable: x: 1-3, y: 0-7.  Staircase blocks: {1,3},{2,3},{1,4},{2,4}.
    //
    //   Quinn  at {3,1} — unique closest hero for all three monsters.
    //   Vistra at {1,7} — far away (≥6 BFS hops) from all monsters.
    //
    //   kobold-existing  at {3,0}: 1 hop north of Quinn → adjacent → ATTACKS.
    //   snake            at {3,3}: 2 BFS hops from Quinn (≤ 4-hop move-and-attack
    //                              range) → teleports to {3,2}, ATTACKS Quinn.
    //   kobold-vistra    at {2,2}: diagonally adjacent to Quinn (dx=1, dy=1)
    //                              → ATTACKS Quinn directly (cross-player!).
    //
    //   All three activations produce a 'combat-result-overlay' (attack result).
    //   Math.random is patched to 0.7 before entering the villain phase so that
    //   attack rolls are deterministic:
    //     d20 = floor(0.7 × 20) + 1 = 15  →  15 + 7 = 22 vs Quinn AC 17 → HIT
    //   Quinn starts with 8 HP; 3 hits deal 3 damage → 5 HP remaining (survives).
    // ─────────────────────────────────────────────────────────────────────────
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();

      // Reposition heroes
      store.dispatch({ type: 'game/setHeroPosition', payload: { heroId: 'quinn',  position: { x: 3, y: 1 } } });
      store.dispatch({ type: 'game/setHeroPosition', payload: { heroId: 'vistra', position: { x: 1, y: 7 } } });

      // Reposition all three monsters on the start tile
      const repositioned = state.game.monsters.map((m: any) => {
        if (m.instanceId === 'kobold-existing') {
          // 1 hop north of Quinn {3,1} → adjacent → attacks immediately
          return { ...m, tileId: 'start-tile', position: { x: 3, y: 0 } };
        }
        if (m.controllerId === 'quinn' && m.monsterId === 'snake') {
          // Exactly 2 BFS hops from Quinn (within 4-hop move-and-attack range)
          // → teleports to {3,2} (the unique closest free square adjacent to Quinn)
          return { ...m, tileId: 'start-tile', position: { x: 3, y: 3 } };
        }
        if (m.instanceId === 'kobold-vistra') {
          // Diagonally adjacent to Quinn {3,1} (dx=1, dy=1) → attacks immediately
          return { ...m, tileId: 'start-tile', position: { x: 2, y: 2 } };
        }
        return m;
      });
      store.dispatch({ type: 'game/setMonsters', payload: repositioned });

      // Empty the encounter deck so no card interrupts villain-phase activation
      store.dispatch({ type: 'game/setEncounterDeck', payload: { drawPile: [], discardPile: [] } });

      // Patch Math.random for deterministic attack rolls throughout villain phase.
      // Math.random() = 0.7 → d20 = floor(0.7×20)+1 = 15 → 15+7 = 22 vs AC 17 → HIT.
      (window as any).__origMathRandom = Math.random;
      Math.random = () => 0.7;

      // Advance to villain phase; Svelte $effect auto-activates the first monster.
      if (state.game.turnState.currentPhase === 'exploration-phase') {
        store.dispatch({ type: 'game/endExplorationPhase' });
      }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 7: Monster 1 of 3 activates — Quinn's Kobold attacks Quinn.
    //         Kobold at {3,0} is adjacent to Quinn at {3,1}; it attacks immediately.
    //         The Svelte villain-phase $effect fires automatically.
    // ─────────────────────────────────────────────────────────────────────────
    await page.locator('[data-testid="combat-result-overlay"]').waitFor({ state: 'visible', timeout: 10000 });

    await screenshots.capture(page, 'villain-phase-kobold-1-attacks-quinn', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.turnState.currentPhase).toBe('villain-phase');
        // Quinn is the active hero
        const currentHeroId = state.game.heroTokens[state.game.turnState.currentHeroIndex]?.heroId;
        expect(currentHeroId).toBe('quinn');
        // villainPhaseMonsterIndex advances to 1 after the first monster activates
        expect(state.game.villainPhaseMonsterIndex).toBe(1);
        // Attack overlay is showing
        expect(state.game.monsterAttackResult).not.toBeNull();
        // The attacker is Quinn's kobold
        const attacker = state.game.monsters.find(
          (m: any) => m.instanceId === state.game.monsterAttackerId
        );
        expect(attacker?.monsterId).toBe('kobold');
        expect(attacker?.controllerId).toBe('quinn');
        // Deterministic roll: 15+7=22 vs AC 17 → hit
        expect(state.game.monsterAttackResult.isHit).toBe(true);
      },
    });

    // Dismiss the first attack result; $effect auto-activates the snake.
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/dismissMonsterAttackResult' });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 8: Monster 2 of 3 activates — Quinn's Snake (move-and-attack).
    //         Snake at {3,3} is within 4 BFS hops of Quinn → teleports to the
    //         closest free adjacent square {3,2} and attacks Quinn.
    // ─────────────────────────────────────────────────────────────────────────
    await page.locator('[data-testid="combat-result-overlay"]').waitFor({ state: 'visible', timeout: 10000 });

    await screenshots.capture(page, 'villain-phase-snake-attacks-quinn', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.turnState.currentPhase).toBe('villain-phase');
        expect(state.game.villainPhaseMonsterIndex).toBe(2);
        expect(state.game.monsterAttackResult).not.toBeNull();
        // The attacker is Quinn's snake
        const attacker = state.game.monsters.find(
          (m: any) => m.instanceId === state.game.monsterAttackerId
        );
        expect(attacker?.monsterId).toBe('snake');
        expect(attacker?.controllerId).toBe('quinn');
        // Snake has teleported adjacent to Quinn at {3,2}
        expect(attacker?.position).toEqual({ x: 3, y: 2 });
        expect(state.game.monsterAttackResult.isHit).toBe(true);
      },
    });

    // Dismiss the second attack result; $effect auto-activates Vistra's kobold.
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/dismissMonsterAttackResult' });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 9: Monster 3 of 3 activates — Vistra's Kobold attacks Quinn.
    //         This is the cross-player activation: because Vistra's kobold
    //         shares the 'kobold' type with Quinn's kobold, it activates
    //         during Quinn's villain phase even though Vistra is not active.
    // ─────────────────────────────────────────────────────────────────────────
    await page.locator('[data-testid="combat-result-overlay"]').waitFor({ state: 'visible', timeout: 10000 });

    await screenshots.capture(page, 'villain-phase-vistra-kobold-cross-player-attacks-quinn', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.turnState.currentPhase).toBe('villain-phase');
        // All three monsters have now activated
        expect(state.game.villainPhaseMonsterIndex).toBe(3);
        expect(state.game.monsterAttackResult).not.toBeNull();
        // CROSS-PLAYER: the attacker is VISTRA's kobold, not Quinn's
        const attacker = state.game.monsters.find(
          (m: any) => m.instanceId === state.game.monsterAttackerId
        );
        expect(attacker?.monsterId).toBe('kobold');
        expect(attacker?.controllerId).toBe('vistra');
        expect(state.game.monsterAttackResult.isHit).toBe(true);
        // Quinn should have taken 3 hits (from 8 HP → 5 HP)
        const quinnHp = state.game.heroHp.find((hp: any) => hp.heroId === 'quinn')?.currentHp;
        expect(quinnHp).toBe(5);
      },
    });

    // Dismiss the third attack result and restore Math.random.
    // $effect auto-ends villain phase (all 3 monsters activated, no villain).
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/dismissMonsterAttackResult' });
      Math.random = (window as any).__origMathRandom;
      delete (window as any).__origMathRandom;
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 10: All 3 monsters have taken their turn — villain phase ends.
    // ─────────────────────────────────────────────────────────────────────────
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.turnState.currentPhase !== 'villain-phase';
    }, { timeout: 5000 });

    await screenshots.capture(page, 'villain-phase-completed-all-3-activated', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        // Villain phase is over — all 3 monsters (own + shared) have taken their turns
        expect(state.game.turnState.currentPhase).not.toBe('villain-phase');
        // Verify all 3 monsters are still on the board
        expect(state.game.monsters).toHaveLength(3);
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
