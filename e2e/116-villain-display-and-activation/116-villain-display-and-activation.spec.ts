import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from '../helpers/screenshot-helper';

/**
 * Test 116 - Villain Display and Per-Turn Activation
 *
 * User Story:
 * As a player in Adventure 14 (Malphas), once the chamber is revealed
 * the villain token appears on the board showing HP and status badges.
 * During every hero's villain phase, Malphas activates once — meaning
 * in a 2-hero game he activates twice per round (once per hero).
 * This test verifies:
 *   1. The villain token renders on the board (HP bar, name label).
 *   2. Malphas activates (logs an entry) during Hero 1's villain phase.
 *   3. Malphas activates again during Hero 2's villain phase.
 */

test.describe('116 - Villain Display and Per-Turn Activation', () => {
  test('Villain token appears and activates each player turn', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // -----------------------------------------------------------------------
    // STEP 1: Start Adventure 14 with 2 heroes (Quinn + Vistra)
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
          positions: [{ x: 3, y: 2 }, { x: 3, y: 5 }],
          seed: 42,
        },
      });
    });

    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/dismissScenarioIntroduction' });
    });

    // -----------------------------------------------------------------------
    // STEP 2: Inject Malphas during hero-phase so we can screenshot the token
    //         Note: villain token renders whenever villain != null (any phase)
    //         Heroes placed at valid non-staircase positions (staircase is 1-2, 3-4)
    // -----------------------------------------------------------------------
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // Heroes at non-staircase positions
      store.dispatch({ type: 'game/setHeroPosition', payload: { heroId: 'quinn', position: { x: 3, y: 2 } } });
      store.dispatch({ type: 'game/setHeroPosition', payload: { heroId: 'vistra', position: { x: 3, y: 5 } } });
      // Place Malphas at a valid non-staircase position reachable by BFS from heroes
      store.dispatch({
        type: 'game/setVillain',
        payload: {
          villainId: 'malphas',
          instanceId: 'villain-malphas',
          position: { x: 1, y: 5 },
          tileId: 'start-tile',
          currentHp: 20, maxHp: 20, statuses: [],
        },
      });
    });

    // Wait for villain token to appear on board (in hero-phase)
    await expect(page.locator('[data-testid="villain-token"]')).toBeVisible();

    // -----------------------------------------------------------------------
    // STEP 3: Screenshot — villain token visible on board during hero-phase
    // -----------------------------------------------------------------------
    await screenshots.capture(page, 'villain-token-visible-hero-phase', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        // Villain is set
        expect(state.game.villain).not.toBeNull();
        expect(state.game.villain.villainId).toBe('malphas');
        expect(state.game.villain.currentHp).toBe(20);
        // Still in hero-phase (villain was injected without phase change)
        expect(state.game.turnState.currentPhase).toBe('hero-phase');
        // Villain token visible
        await expect(page.locator('[data-testid="villain-token"]')).toBeVisible();
        await expect(page.locator('[data-testid="villain-hp-bar"]')).toBeVisible();
        // HP bar shows correct values
        await expect(page.locator('[data-testid="villain-hp-bar"]')).toContainText('20/20');
      },
    });

    // -----------------------------------------------------------------------
    // STEP 4: Enter Quinn's villain phase and wait for auto-advance to complete
    //         The $effect will: dispatch activateVillain → log entry → endVillainPhase
    // -----------------------------------------------------------------------
    // Fix Math.random to make villain attack rolls deterministic for stable screenshots
    await page.evaluate(() => {
      (window as any).__fixedRandom = Math.random;
      Math.random = () => 0.5; // Fixed roll: deterministic attack outcomes
    });

    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/setCurrentPhase', payload: 'villain-phase' });
    });

    // The villain phase auto-advances through Svelte's $effect:
    // villain → activateVillain → villainActivatedThisTurn=true → endVillainPhase
    await expect(async () => {
      const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
      expect(state.game.turnState.currentPhase).toBe('hero-phase');
    }).toPass({ timeout: 5000 });

    // Villain activation was logged during Quinn's villain phase
    const stateAfterQuinnVP = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
    expect(stateAfterQuinnVP.game.turnState.currentHeroIndex).toBe(1); // Vistra is now active

    const logAfterQuinnVP = stateAfterQuinnVP.game.logEntries as Array<{ message: string }>;
    const quinnVillainLog = logAfterQuinnVP.some(
      (e) => e.message.includes('Malphas') && e.message !== '⚔️ Malphas, the Void-Caller appears!'
    );
    expect(quinnVillainLog).toBe(true);

    await screenshots.capture(page, 'after-villain-activates-quinn-villain-phase', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        // Moved to Vistra's hero-phase
        expect(state.game.turnState.currentPhase).toBe('hero-phase');
        expect(state.game.turnState.currentHeroIndex).toBe(1); // Vistra
        // Villain still present
        expect(state.game.villain).not.toBeNull();
        // villainActivatedThisTurn reset to false after phase ended
        expect(state.game.villainActivatedThisTurn).toBe(false);
        // Villain token still visible
        await expect(page.locator('[data-testid="villain-token"]')).toBeVisible();
      },
    });

    // -----------------------------------------------------------------------
    // STEP 5: Enter Vistra's villain phase and verify villain activates again
    // -----------------------------------------------------------------------
    const logCountBeforeVistraVP = await page.evaluate(() =>
      (window as any).__REDUX_STORE__.getState().game.logEntries.length
    );

    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/setCurrentPhase', payload: 'villain-phase' });
    });

    // Wait for villain phase to auto-complete again
    await expect(async () => {
      const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
      expect(state.game.turnState.currentPhase).toBe('hero-phase');
    }).toPass({ timeout: 5000 });

    // Verify villain logged something new during Vistra's villain phase
    const logAfterVistraVP = await page.evaluate(() =>
      (window as any).__REDUX_STORE__.getState().game.logEntries as Array<{ message: string }>
    );
    const newVillainLogs = logAfterVistraVP.slice(logCountBeforeVistraVP).filter(
      (e) => e.message.includes('Malphas')
    );
    expect(newVillainLogs.length).toBeGreaterThan(0);

    await screenshots.capture(page, 'villain-activated-both-villain-phases', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.turnState.currentPhase).toBe('hero-phase');
        // Villain activated at least twice (once per hero's villain phase)
        const log = state.game.logEntries as Array<{ message: string }>;
        const activationLogs = log.filter(
          (e) =>
            e.message.includes('Malphas') &&
            e.message !== '⚔️ Malphas, the Void-Caller appears!'
        );
        expect(activationLogs.length).toBeGreaterThanOrEqual(2);
        // Villain token still visible
        await expect(page.locator('[data-testid="villain-token"]')).toBeVisible();
      },
    });
  });

  test('Villain token shows HP bar and shield badge when guards adjacent (Malphas)', async ({ page }) => {
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
        payload: { heroIds: ['quinn'], positions: [{ x: 3, y: 2 }], seed: 42 },
      });
    });

    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/dismissScenarioIntroduction' });
    });

    // -----------------------------------------------------------------------
    // STEP 2: Inject villain + guard monster
    // -----------------------------------------------------------------------
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setVillain',
        payload: {
          villainId: 'malphas',
          instanceId: 'villain-malphas',
          position: { x: 2, y: 2 },
          tileId: 'start-tile',
          currentHp: 12, maxHp: 16, statuses: [],
        },
      });
      // Kobold guard adjacent to Malphas at (3,2)
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-guard-0',
          position: { x: 3, y: 2 },
          currentHp: 1,
          controllerId: 'quinn',
          tileId: 'start-tile',
        }],
      });
    });

    await expect(page.locator('[data-testid="villain-token"]')).toBeVisible();

    // -----------------------------------------------------------------------
    // STEP 3: Screenshot — villain token with HP bar
    // -----------------------------------------------------------------------
    await screenshots.capture(page, 'villain-token-with-hp-bar', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.villain.currentHp).toBe(12);
        await expect(page.locator('[data-testid="villain-hp-bar"]')).toContainText('12/16');
        await expect(page.locator('[data-testid="villain-token"]')).toBeVisible();
      },
    });

    // -----------------------------------------------------------------------
    // STEP 4: Screenshot — shield badge visible when guard is adjacent
    // -----------------------------------------------------------------------
    await screenshots.capture(page, 'villain-shield-badge-when-guard-adjacent', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="villain-shield-badge"]')).toBeVisible();
      },
    });

    // -----------------------------------------------------------------------
    // STEP 5: Remove guard — shield badge should disappear
    // -----------------------------------------------------------------------
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/setMonsters', payload: [] });
    });

    await screenshots.capture(page, 'villain-no-shield-when-no-guards', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="villain-shield-badge"]')).not.toBeVisible();
      },
    });
  });
});
