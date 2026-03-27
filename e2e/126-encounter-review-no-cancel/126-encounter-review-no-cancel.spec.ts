import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('126 - Encounter Review Has No Cancel Option', () => {
  test('Cancel button appears for new encounter cards but not when reviewing active environment cards', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Character Selection
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'character-select-screen', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="character-select"]')).toBeVisible();
        await expect(page.locator('[data-testid="start-game-button"]')).toBeDisabled();
      }
    });

    // Select Quinn from bottom edge
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');

    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);

    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Position hero deterministically
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 4 } }
      });
      store.dispatch({ type: 'game/hideMovement' });
    });

    await page.waitForFunction(() => {
      return document.querySelectorAll('[data-testid^="move-to-"]').length === 0;
    });

    // STEP 2: Draw a new encounter card with enough XP to cancel
    // Give party XP first, then draw the encounter
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      store.dispatch({
        type: 'game/setPartyResources',
        payload: { ...state.game.partyResources, xp: 10 }
      });
    });

    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'frenzied-leap'
      });
    });

    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'new-encounter-has-cancel-button', {
      programmaticCheck: async () => {
        // When a new encounter is drawn, the cancel button IS visible
        await expect(page.locator('[data-testid="encounter-cancel"]')).toBeVisible();
        await expect(page.locator('[data-testid="encounter-cancel"]')).toBeEnabled();
        await expect(page.locator('[data-testid="encounter-continue"]')).toContainText('Accept');
      }
    });

    // Dismiss the new encounter
    await page.locator('[data-testid="encounter-continue"]').click();
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });

    // Dismiss the encounter result popup if it appears
    const resultPopup = page.locator('[data-testid="encounter-result-popup"]');
    if (await resultPopup.isVisible()) {
      await page.locator('[data-testid="continue-button"]').click();
      await resultPopup.waitFor({ state: 'hidden' });
    }

    // STEP 3: Activate an environment card (simulating the encounter card being accepted previously)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setActiveEnvironment',
        payload: 'hidden-snipers'
      });
    });

    // Wait for environment indicator to appear
    await page.locator('[data-testid="environment-indicator"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'environment-indicator-visible', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="environment-indicator"]')).toBeVisible();
        await expect(page.locator('[data-testid="environment-indicator"]')).toContainText('Hidden Snipers');
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.activeEnvironmentId).toBe('hidden-snipers');
      }
    });

    // STEP 4: Click environment indicator to review the active environment card
    await page.locator('[data-testid="environment-indicator"]').click();
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'reviewing-environment-card-no-cancel', {
      programmaticCheck: async () => {
        // When reviewing an already-active environment card, there is NO cancel button
        await expect(page.locator('[data-testid="encounter-card"]')).toBeVisible();
        await expect(page.locator('[data-testid="encounter-name"]')).toContainText('Hidden Snipers');
        await expect(page.locator('[data-testid="encounter-cancel"]')).not.toBeVisible();
        // The button says "Close" not "Accept" in review mode
        await expect(page.locator('[data-testid="encounter-continue"]')).toContainText('Close');
      }
    });

    // Dismiss the review
    await page.locator('[data-testid="encounter-continue"]').click();
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });

    await screenshots.capture(page, 'back-to-game-board', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-card"]')).not.toBeVisible();
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
        // Environment indicator is still showing (environment is still active)
        await expect(page.locator('[data-testid="environment-indicator"]')).toBeVisible();
      }
    });
  });
});
