import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

/**
 * Dismiss all notification overlays that might block UI interactions.
 * Retries until no known notification overlays are present.
 */
async function clearAllNotifications(page: import('@playwright/test').Page): Promise<void> {
  const dismissPairs: Array<{ triggerSelector: string; overlaySelector: string }> = [
    { triggerSelector: '[data-testid="dismiss-effect-notification"]', overlaySelector: '[data-testid="encounter-effect-notification"]' },
    { triggerSelector: '[data-testid="dismiss-poisoned-notification"]', overlaySelector: '[data-testid="poisoned-damage-notification"]' },
    { triggerSelector: '[data-testid="dismiss-recovery-notification"]', overlaySelector: '[data-testid="poison-recovery-notification"]' },
    { triggerSelector: '[data-testid="dismiss-monster-card"]', overlaySelector: '[data-testid="monster-card-overlay"]' },
  ];

  // Click-dismiss any visible overlays
  for (let attempt = 0; attempt < 15; attempt++) {
    let dismissed = false;
    for (const { triggerSelector, overlaySelector } of dismissPairs) {
      const el = page.locator(overlaySelector);
      if (await el.isVisible({ timeout: 200 }).catch(() => false)) {
        await page.locator(triggerSelector).click({ timeout: 2000 }).catch(() => {});
        await el.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {});
        dismissed = true;
      }
    }
    if (!dismissed) break;
  }

  // Also clear state via Redux dispatch
  await page.evaluate(() => {
    const store = (window as any).__REDUX_STORE__;
    const state = store.getState();
    if (state.game.monsterAttackResult) store.dispatch({ type: 'game/dismissMonsterAttackResult' });
    if (state.game.monsterMoveActionId) store.dispatch({ type: 'game/dismissMonsterMoveAction' });
    if (state.game.encounterEffectMessage) store.dispatch({ type: 'game/dismissEncounterEffectMessage' });
    if (state.game.drawnEncounter) store.dispatch({ type: 'game/dismissEncounterCard' });
    if (state.game.poisonedDamageNotification) store.dispatch({ type: 'game/dismissPoisonedDamageNotification' });
    if (state.game.monsterExplorationEvent) store.dispatch({ type: 'game/dismissMonsterExplorationEvent' });
    if (state.game.recentlySpawnedMonsterId) store.dispatch({ type: 'game/dismissMonsterCard' });
  });
}

test.describe('124 - Monster Full Details', () => {
  test('Monster card shows full activation instructions and decision log appears in expanded log entry', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection and select Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');

    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);

    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Wait for hero phase
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.turnState.currentPhase === 'hero-phase';
    });

    // STEP 2: Inject a kobold monster (explore-or-attack type, no status effects)
    // Hero at (2, 5), kobold at (2, 2) — within 1-tile range but not adjacent
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 5 } }
      });
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-full-details-test',
          position: { x: 2, y: 2 },
          currentHp: 1,
          controllerId: 'quinn',
          tileId: 'start-tile'
        }]
      });
      store.dispatch({ type: 'game/hideMovement' });
    });

    // Wait for positions to settle
    await expect(async () => {
      const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
      expect(state.game.monsters.length).toBeGreaterThan(0);
      expect(state.game.heroTokens[0].position).toEqual({ x: 2, y: 5 });
    }).toPass();

    await page.waitForFunction(() => {
      return document.querySelectorAll('[data-testid^="move-to-"]').length === 0;
    });

    // STEP 3: Open full monster card overlay to see numbered activation instructions
    await page.locator('[data-testid="monster-card-mini"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="monster-card-mini"]').click();
    await page.locator('[data-testid="monster-card-overlay"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'monster-card-instructions-shown', {
      programmaticCheck: async () => {
        // Card overlay is visible
        await expect(page.locator('[data-testid="monster-card-overlay"]')).toBeVisible();
        await expect(page.locator('[data-testid="monster-card"]')).toBeVisible();
        await expect(page.locator('[data-testid="monster-name"]')).toContainText('Kobold');

        // Numbered activation instructions are shown (new feature)
        await expect(page.locator('[data-testid="card-instructions"]')).toBeVisible();

        // Kobold has 3 numbered instructions (explore-or-attack type)
        const items = page.locator('[data-testid="card-instructions"] li');
        await expect(items).toHaveCount(3);

        // Verify instruction content matches official card rules
        await expect(items.nth(0)).toContainText('adjacent');
        await expect(items.nth(1)).toContainText('unexplored');
        await expect(items.nth(2)).toContainText('closest Hero');
      }
    });

    // Dismiss the monster card overlay
    await page.locator('[data-testid="dismiss-monster-card"]').click();
    await page.locator('[data-testid="monster-card-overlay"]').waitFor({ state: 'hidden' });

    // STEP 4: Advance to villain phase and activate the kobold monster
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/endHeroPhase' });
      store.dispatch({ type: 'game/endExplorationPhase' });
    });

    // Dismiss any encounter card that may have appeared when entering villain phase
    const encounterDismissButton = page.locator('[data-testid="dismiss-encounter-card"]');
    if (await encounterDismissButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await encounterDismissButton.click();
      await encounterDismissButton.waitFor({ state: 'hidden' });
    }

    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.turnState.currentPhase === 'villain-phase';
    });

    // Activate the kobold — it will move toward the hero (not adjacent, heroes reachable)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/activateNextMonster', payload: {} });
    });

    // Wait for the monster activation to complete
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return (
        state.game.monsterAttackResult !== null ||
        state.game.monsterMoveActionId !== null ||
        state.game.villainPhaseMonsterIndex > 0
      );
    });

    await screenshots.capture(page, 'monster-activated', {
      programmaticCheck: async () => {
        // Verify that a log entry with a decision log was created
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        const entriesWithLog = state.game.logEntries.filter((e: any) => e.extendedDetails && e.extendedDetails.includes('Decision Log'));
        expect(entriesWithLog.length).toBeGreaterThan(0);
      }
    });

    // STEP 5: Clear all notifications and open the log viewer to see the decision log
    await clearAllNotifications(page);

    // Open the log viewer
    await page.locator('[data-testid="view-log-button"]').click();
    await page.locator('[data-testid="log-entries"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'log-viewer-open', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="log-entries"]')).toBeVisible();
        const entries = page.locator('[data-testid="log-entry"]');
        expect(await entries.count()).toBeGreaterThan(0);
      }
    });

    // Expand the first expandable log entry to see the decision log
    const expandableEntry = page.locator('[data-testid="log-entry"] button.expandable').first();
    await expandableEntry.click();

    // Wait for extended details to appear
    await page.locator('[data-testid="log-extended-details"]').first().waitFor({ state: 'visible' });

    await screenshots.capture(page, 'decision-log-visible', {
      programmaticCheck: async () => {
        const extendedDetails = page.locator('[data-testid="log-extended-details"]').first();
        await expect(extendedDetails).toBeVisible();

        // The extended details must contain the numbered decision log
        const detailsText = await extendedDetails.textContent();
        expect(detailsText).toContain('Decision Log');
        expect(detailsText).toMatch(/\d\./);
      }
    });
  });
});
