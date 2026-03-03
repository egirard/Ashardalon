import { test, expect } from '@playwright/test';
import { createScreenshotHelper, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('122 - Monster Mini-Card Details', () => {
  test('clicking a monster mini-card opens the full monster card overlay', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection and select Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();

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

    // STEP 2: Inject a monster directly into the Redux store (controlled by Quinn)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-mini-test',
          position: { x: 2, y: 2 },
          currentHp: 3,
          controllerId: 'quinn',
          tileId: 'start-tile'
        }]
      });
      // Hide movement overlay for stable screenshot
      store.dispatch({ type: 'game/hideMovement' });
    });

    // Wait for monster mini-card to appear in player panel
    await page.locator('[data-testid="monster-card-mini"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'monster-mini-card-visible', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="monster-card-mini"]')).toBeVisible();
        await expect(page.locator('[data-testid="monster-mini-name"]')).toContainText('Kobold');
        // Full monster card overlay should NOT be visible yet
        await expect(page.locator('[data-testid="monster-card-overlay"]')).not.toBeVisible();
      }
    });

    // STEP 3: Click the monster mini-card to open the full monster card overlay
    await page.locator('[data-testid="monster-card-mini"]').click();

    // Wait for the full monster card overlay to appear
    await page.locator('[data-testid="monster-card-overlay"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'full-monster-card-overlay-open', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="monster-card-overlay"]')).toBeVisible();
        await expect(page.locator('[data-testid="monster-card"]')).toBeVisible();
        await expect(page.locator('[data-testid="monster-name"]')).toContainText('Kobold');
        // Mini-card should still be in the DOM (just hidden behind overlay)
        await expect(page.locator('[data-testid="monster-card-mini"]')).toBeAttached();
      }
    });

    // STEP 4: Dismiss the overlay by clicking the dismiss button
    await page.locator('[data-testid="dismiss-monster-card"]').click();

    // Wait for overlay to disappear
    await page.locator('[data-testid="monster-card-overlay"]').waitFor({ state: 'hidden' });

    await screenshots.capture(page, 'monster-card-overlay-dismissed', {
      programmaticCheck: async () => {
        // Overlay should be gone
        await expect(page.locator('[data-testid="monster-card-overlay"]')).not.toBeVisible();
        // Mini-card should still be visible
        await expect(page.locator('[data-testid="monster-card-mini"]')).toBeVisible();
        await expect(page.locator('[data-testid="monster-mini-name"]')).toContainText('Kobold');
      }
    });
  });
});
