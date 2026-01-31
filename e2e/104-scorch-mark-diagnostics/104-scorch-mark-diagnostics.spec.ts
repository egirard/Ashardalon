import { test, expect } from '@playwright/test';
import {
  createScreenshotHelper,
  selectDefaultPowerCards,
  dismissScenarioIntroduction,
  setupDeterministicGame,
} from '../helpers/screenshot-helper';

test.describe('104 - Scorch Mark Diagnostics Toggle', () => {
  test('Player can toggle scorch mark overlays on placed tiles', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Start a deterministic game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    await setupDeterministicGame(page);

    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Hide movement overlay for stable screenshots
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/hideMovement' });
    });

    // STEP 2: Move Quinn to the north edge to enable exploration
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 0 } },
      });
    });

    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 0 });
    }).toPass();

    // STEP 3: End hero phase and place a new tile during exploration
    await page.locator('[data-testid="end-phase-button"]').click();
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');

    await page.locator('[data-testid="exploration-step-place-tile"]').click();

    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.dungeon.tiles).toHaveLength(2);
    }).toPass();

    await expect(page.locator('[data-testid="dungeon-tile"]')).toBeVisible();

    // STEP 4: Capture tile placement with scorch mark diagnostics disabled
    await screenshots.capture(page, 'tile-placed-no-scorch', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="corner-controls-se"] [data-testid="corner-scorch-toggle-button"]')).toBeVisible();
        await expect(page.locator('[data-testid="scorch-mark-overlay"]')).toHaveCount(0);

        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.ui.showScorchMarks).toBe(false);
      },
    });

    // STEP 5: Toggle diagnostics on and verify scorch mark overlay appears
    await page.locator('[data-testid="corner-controls-se"] [data-testid="corner-scorch-toggle-button"]').click();

    await screenshots.capture(page, 'scorch-toggle-enabled', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="corner-controls-se"] [data-testid="corner-scorch-toggle-button"]')).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('[data-testid="scorch-mark-overlay"]')).toHaveCount(1);

        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.ui.showScorchMarks).toBe(true);
      },
    });
  });
});
