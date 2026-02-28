import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from '../helpers/screenshot-helper';

/**
 * Test 116 - Villain Display and Per-Turn Activation
 *
 * User Story:
 * As a player in Adventure 14 (Malphas), once the villain appears:
 *
 *  1. The villain token renders on the board with HP bar.
 *  2. A villain status card appears in the objective panel showing HP and shield status.
 *  3. During Quinn's villain phase, Malphas activates and a purple notification panel
 *     appears (like a monster attack result). The player must click to dismiss it.
 *  4. After Quinn's phase ends, Vistra becomes the active hero.
 *  5. During Vistra's villain phase, Malphas activates again — proving the villain
 *     activates once per hero's villain phase (twice per round in a 2-hero game).
 *
 * The second test verifies the shield badge on the villain token and the villain
 * status card's shield indicator when a guard is adjacent.
 */

test.describe('116 - Villain Display and Per-Turn Activation', () => {
  test('Villain token appears and activates with notification each player turn', async ({ page }) => {
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
    // STEP 2: Inject Malphas, set positions, stay in hero-phase for screenshot
    // -----------------------------------------------------------------------
    // Fix Math.random for deterministic attack rolls in screenshots
    await page.evaluate(() => {
      (window as any).__origRandom = Math.random;
      Math.random = () => 0.7; // deterministic: roll ~15 on d20, usually hits
    });

    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/setHeroPosition', payload: { heroId: 'quinn', position: { x: 3, y: 2 } } });
      store.dispatch({ type: 'game/setHeroPosition', payload: { heroId: 'vistra', position: { x: 3, y: 5 } } });
      // Malphas at valid non-staircase position (staircase: 1-2, 3-4)
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

    // Wait for villain token to render
    await expect(page.locator('[data-testid="villain-token"]')).toBeVisible();
    // Wait for villain status card to appear in objective panel
    await expect(page.locator('[data-testid="villain-status-card"]')).toBeVisible();

    // -----------------------------------------------------------------------
    // STEP 3: Screenshot — Quinn's hero-phase with villain token and status card
    //         Both Quinn's panel (active hero) and Vistra's panel visible
    // -----------------------------------------------------------------------
    await screenshots.capture(page, 'quinn-hero-phase-villain-token-and-status-card', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        // Villain present
        expect(state.game.villain).not.toBeNull();
        expect(state.game.villain.villainId).toBe('malphas');
        expect(state.game.turnState.currentPhase).toBe('hero-phase');
        expect(state.game.turnState.currentHeroIndex).toBe(0); // Quinn's turn
        // Villain token on board
        await expect(page.locator('[data-testid="villain-token"]')).toBeVisible();
        await expect(page.locator('[data-testid="villain-hp-bar"]')).toContainText('20/20');
        // Villain status card in objective panel
        await expect(page.locator('[data-testid="villain-status-card"]')).toBeVisible();
        await expect(page.locator('[data-testid="villain-status-hp"]')).toContainText('20/20 HP');
      },
    });

    // -----------------------------------------------------------------------
    // STEP 4: Enter Quinn's villain phase — villain activates and shows notification
    // -----------------------------------------------------------------------
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/setCurrentPhase', payload: 'villain-phase' });
    });

    // Wait for the villain activation notification to appear
    await expect(page.locator('[data-testid="villain-activation-overlay"]')).toBeVisible();

    // -----------------------------------------------------------------------
    // STEP 5: Screenshot — villain activation notification during Quinn's villain phase
    // -----------------------------------------------------------------------
    await screenshots.capture(page, 'quinn-villain-phase-activation-notification', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        // Still in villain phase — notification blocks auto-advance
        expect(state.game.turnState.currentPhase).toBe('villain-phase');
        expect(state.game.turnState.currentHeroIndex).toBe(0); // Quinn's villain phase
        expect(state.game.villainActivation).not.toBeNull();
        expect(state.game.villainActivation.villainName).toBe('Malphas, the Void-Caller');
        // Notification is visible
        await expect(page.locator('[data-testid="villain-activation-card"]')).toBeVisible();
        await expect(page.locator('[data-testid="villain-activation-name"]')).toContainText('Malphas');
      },
    });

    // -----------------------------------------------------------------------
    // STEP 6: Dismiss notification → villain phase ends → Vistra's hero-phase
    // -----------------------------------------------------------------------
    await page.locator('[data-testid="dismiss-villain-activation"]').click();

    // After dismissal: villain phase should end and move to Vistra's hero-phase
    await expect(async () => {
      const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
      expect(state.game.turnState.currentPhase).toBe('hero-phase');
      expect(state.game.turnState.currentHeroIndex).toBe(1); // Vistra
    }).toPass({ timeout: 5000 });

    // -----------------------------------------------------------------------
    // STEP 7: Enter Vistra's villain phase and verify villain activates again
    // -----------------------------------------------------------------------
    const logCountBeforeVistraVP = await page.evaluate(() =>
      (window as any).__REDUX_STORE__.getState().game.logEntries.length
    );

    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/setCurrentPhase', payload: 'villain-phase' });
    });

    // Wait for villain activation notification again
    await expect(page.locator('[data-testid="villain-activation-overlay"]')).toBeVisible();

    // -----------------------------------------------------------------------
    // STEP 8: Screenshot — Vistra's villain phase activation notification
    //         (proves activation occurs AGAIN during Vistra's villain phase)
    // -----------------------------------------------------------------------
    await screenshots.capture(page, 'vistra-villain-phase-activation-notification', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.turnState.currentPhase).toBe('villain-phase');
        expect(state.game.turnState.currentHeroIndex).toBe(1); // Vistra's villain phase
        expect(state.game.villainActivation).not.toBeNull();
        expect(state.game.villainActivatedThisTurn).toBe(true); // Villain just activated
        // Notification visible again (villain activated for Vistra's turn)
        await expect(page.locator('[data-testid="villain-activation-card"]')).toBeVisible();
        // New log entry added since Vistra's villain phase started
        expect(state.game.logEntries.length).toBeGreaterThan(logCountBeforeVistraVP);
        // Villain token and status card still visible in background
        await expect(page.locator('[data-testid="villain-status-card"]')).toBeVisible();
      },
    });

    // Dismiss and verify Vistra's villain phase ends
    await page.locator('[data-testid="dismiss-villain-activation"]').click();

    await expect(async () => {
      const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
      expect(state.game.turnState.currentPhase).toBe('hero-phase');
    }).toPass({ timeout: 5000 });

    // Final programmatic check — villain activated at least twice (once per hero turn)
    const finalState = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
    const log = finalState.game.logEntries as Array<{ message: string }>;
    const activationLogs = log.filter(
      (e) =>
        e.message.includes('Malphas') &&
        e.message !== '⚔️ Malphas, the Void-Caller appears!'
    );
    expect(activationLogs.length).toBeGreaterThanOrEqual(2);

    // Restore Math.random
    await page.evaluate(() => {
      Math.random = (window as any).__origRandom ?? Math.random;
    });
  });

  test('Villain status card shows HP bar and shield badge when guards adjacent (Malphas)', async ({ page }) => {
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
    // STEP 2: Inject villain with partial HP + guard monster adjacent
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
      // Kobold guard at (3,2) — adjacent to Malphas at (2,2)
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
    await expect(page.locator('[data-testid="villain-status-card"]')).toBeVisible();

    // -----------------------------------------------------------------------
    // STEP 3: Screenshot — villain token + status card (HP partial, guard adjacent)
    // -----------------------------------------------------------------------
    await screenshots.capture(page, 'villain-token-and-status-card-with-hp-bar', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.villain.currentHp).toBe(12);
        // Token HP bar
        await expect(page.locator('[data-testid="villain-hp-bar"]')).toContainText('12/16');
        // Status card HP
        await expect(page.locator('[data-testid="villain-status-hp"]')).toContainText('12/16 HP');
        await expect(page.locator('[data-testid="villain-token"]')).toBeVisible();
      },
    });

    // -----------------------------------------------------------------------
    // STEP 4: Screenshot — shield badge on token AND shield indicator on status card
    // -----------------------------------------------------------------------
    await screenshots.capture(page, 'villain-shield-badge-when-guard-adjacent', {
      programmaticCheck: async () => {
        // Shield badge on the board token
        await expect(page.locator('[data-testid="villain-shield-badge"]')).toBeVisible();
        // Shield indicator in the status card
        await expect(page.locator('[data-testid="villain-status-shield"]')).toBeVisible();
        await expect(page.locator('[data-testid="villain-status-shield"]')).toContainText('Shielded');
      },
    });

    // -----------------------------------------------------------------------
    // STEP 5: Remove guard — shield should disappear from both token and status card
    // -----------------------------------------------------------------------
    await page.evaluate(() => {
      (window as any).__REDUX_STORE__.dispatch({ type: 'game/setMonsters', payload: [] });
    });

    await screenshots.capture(page, 'villain-no-shield-when-no-guards', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="villain-shield-badge"]')).not.toBeVisible();
        await expect(page.locator('[data-testid="villain-status-shield"]')).not.toBeVisible();
      },
    });
  });
});
