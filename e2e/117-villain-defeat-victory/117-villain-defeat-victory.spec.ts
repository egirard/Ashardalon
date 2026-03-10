import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from '../helpers/screenshot-helper';

/**
 * Test 117 - Villain Defeat Victory
 *
 * User Story:
 * As a player in Adventure 14 (Malphas), when the villain is defeated:
 *
 *  1. The villain appears on the board with HP displayed.
 *  2. Quinn attacks Malphas, dealing enough damage to reduce HP to 0.
 *  3. The game transitions to the Victory screen.
 *  4. The Victory screen shows a villain-specific message ("You have defeated Malphas").
 *  5. Clicking "Return to Character Select" resets all scenario state.
 *
 * This test also covers Adventure 15 (Vraxos) defeat as a secondary assertion.
 */

test.describe('117 - Villain Defeat Victory', () => {
  test('Victory screen appears when villain is defeated in Adventure 14', async ({ page }) => {
    const screenshots = createScreenshotHelper({ defaultMaxDiffPixels: 1500 });

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
        payload: {
          heroIds: ['quinn'],
          positions: [{ x: 3, y: 3 }],
          seed: 42,
        },
      });
    });

    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/dismissScenarioIntroduction' });
    });

    // -----------------------------------------------------------------------
    // STEP 2: Inject villain (Malphas) adjacent to Quinn with 1 HP remaining
    // -----------------------------------------------------------------------
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/setHeroPosition', payload: { heroId: 'quinn', position: { x: 3, y: 3 } } });
      store.dispatch({ type: 'game/hideMovement' });
      // Place Malphas adjacent to Quinn with only 1 HP remaining
      store.dispatch({
        type: 'game/setVillain',
        payload: {
          villainId: 'malphas',
          instanceId: 'villain-malphas',
          position: { x: 3, y: 4 },
          tileId: 'start-tile',
          currentHp: 1,
          maxHp: 20,
          statuses: [],
        },
      });
    });

    // Verify villain is on board with 1 HP
    await expect(page.locator('[data-testid="villain-token"]')).toBeVisible();

    await screenshots.capture(page, 'villain-low-hp-before-defeat', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.villain).not.toBeNull();
        expect(state.game.villain.currentHp).toBe(1);
        expect(state.game.currentScreen).toBe('game-board');
        await expect(page.locator('[data-testid="villain-token"]')).toBeVisible();
        await expect(page.locator('[data-testid="villain-status-card"]')).toBeVisible();
        await expect(page.locator('[data-testid="villain-status-hp"]')).toContainText('1/20 HP');
      },
    });

    // -----------------------------------------------------------------------
    // STEP 3: Quinn attacks Malphas — defeat the villain
    // -----------------------------------------------------------------------
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setAttackResult',
        payload: {
          result: {
            roll: 18,
            attackBonus: 6,
            total: 24,
            targetAC: 16,
            isHit: true,
            damage: 5,
            isCritical: false,
          },
          targetInstanceId: 'villain-malphas',
        },
      });
    });

    // Wait for victory screen
    await page.locator('[data-testid="victory-screen"]').waitFor({ state: 'visible', timeout: 5000 });

    // -----------------------------------------------------------------------
    // STEP 4: Verify Victory screen with villain-specific message
    // -----------------------------------------------------------------------
    await screenshots.capture(page, 'victory-screen-villain-defeated', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.currentScreen).toBe('victory');
        expect(state.game.victoryReason).toContain('Malphas');
        expect(state.game.victoryReason).toContain('defeated');

        await expect(page.locator('[data-testid="victory-screen"]')).toBeVisible();
        await expect(page.locator('[data-testid="victory-message"]')).toContainText('Malphas');
        await expect(page.locator('[data-testid="victory-screen"]')).toContainText('Victory!');
        await expect(page.locator('[data-testid="return-to-menu-button"]')).toBeVisible();
      },
    });

    // -----------------------------------------------------------------------
    // STEP 5: Return to character select — verify scenario is fully reset
    // -----------------------------------------------------------------------
    await page.locator('[data-testid="return-to-menu-button"]').click();
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'character-select-after-victory', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.currentScreen).toBe('character-select');
        expect(state.game.victoryReason).toBeNull();
        expect(state.game.villain).toBeNull();
        expect(state.game.scenario.chamberRevealed).toBe(false);
        expect(state.game.scenario.villainInstanceId).toBeNull();
        await expect(page.locator('[data-testid="character-select"]')).toBeVisible();
      },
    });
  });

  test('Victory screen shows villain-specific message for Adventure 15 (Vraxos)', async ({ page }) => {
    const screenshots = createScreenshotHelper({ defaultMaxDiffPixels: 1500 });

    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'heroes/toggleHeroSelection', payload: 'vistra' });
      store.dispatch({ type: 'heroes/selectUtilityCard', payload: { heroId: 'vistra', cardId: 18 } });
      store.dispatch({ type: 'heroes/toggleAtWillCard', payload: { heroId: 'vistra', cardId: 12 } });
      store.dispatch({ type: 'heroes/toggleAtWillCard', payload: { heroId: 'vistra', cardId: 13 } });
      store.dispatch({ type: 'heroes/selectDailyCard', payload: { heroId: 'vistra', cardId: 15 } });
      store.dispatch({ type: 'heroes/finalizePowerCardSelections' });
      store.dispatch({ type: 'game/selectScenario', payload: 'adventure-15' });
      store.dispatch({
        type: 'game/startGame',
        payload: {
          heroIds: ['vistra'],
          positions: [{ x: 3, y: 3 }],
          seed: 42,
        },
      });
    });

    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/dismissScenarioIntroduction' });
    });

    // Inject Vraxos with 1 HP adjacent to Vistra
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/setHeroPosition', payload: { heroId: 'vistra', position: { x: 3, y: 3 } } });
      store.dispatch({ type: 'game/hideMovement' });
      store.dispatch({
        type: 'game/setVillain',
        payload: {
          villainId: 'vraxos',
          instanceId: 'villain-vraxos',
          position: { x: 3, y: 4 },
          tileId: 'start-tile',
          currentHp: 1,
          maxHp: 15,
          statuses: [],
        },
      });
    });

    // Defeat Vraxos
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setAttackResult',
        payload: {
          result: {
            roll: 19,
            attackBonus: 8,
            total: 27,
            targetAC: 18,
            isHit: true,
            damage: 5,
            isCritical: false,
          },
          targetInstanceId: 'villain-vraxos',
        },
      });
    });

    await page.locator('[data-testid="victory-screen"]').waitFor({ state: 'visible', timeout: 5000 });

    await screenshots.capture(page, 'victory-screen-vraxos-defeated', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.currentScreen).toBe('victory');
        expect(state.game.victoryReason).toContain('Vraxos');
        await expect(page.locator('[data-testid="victory-message"]')).toContainText('Vraxos');
        await expect(page.locator('[data-testid="victory-screen"]')).toContainText('Victory!');
      },
    });
  });
});
