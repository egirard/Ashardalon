import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards } from '../helpers/screenshot-helper';

test.describe('062 - Card Detail View', () => {
  test('player can tap cards to see enlarged detail view with contextual information', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate and select hero
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-vistra"]').click();
    await selectDefaultPowerCards(page, 'vistra');

    await screenshots.capture(page, '001-hero-selected', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="hero-vistra"]')).toHaveClass(/selected/);
      }
    });

    // STEP 2: Start game
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Set deterministic position
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'vistra', position: { x: 2, y: 3 } }
      });
      store.dispatch({ type: 'game/hideMovement' });
    });

    // Wait for updates
    await expect(async () => {
      const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
      expect(state.game.heroTokens[0].position).toEqual({ x: 2, y: 3 });
    }).toPass();

    // Disable animations
    await page.addStyleTag({
      content: '* { animation-duration: 0s !important; transition-duration: 0s !important; }'
    });

    await screenshots.capture(page, '002-game-started', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="player-power-cards"]')).toBeVisible();
      }
    });

    // STEP 3: Click on a power card to show detail view
    const powerCard = page.locator('[data-testid="power-card-11"]'); // Dwarven Resilience
    await expect(powerCard).toBeVisible();
    await powerCard.click();

    // Wait for detail view to appear
    await page.locator('[data-testid="card-detail-view"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, '003-power-card-detail-shown', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="card-detail-view"]')).toBeVisible();
        await expect(page.locator('[data-testid="card-type"]')).toContainText('Power');
        await expect(page.locator('[data-testid="card-description"]')).toBeVisible();
        await expect(page.locator('[data-testid="clickability-info"]')).toBeVisible();
      }
    });

    // STEP 4: Click different card to replace detail view
    const differentCard = page.locator('[data-testid="power-card-12"]'); // Charge
    await differentCard.click();

    await screenshots.capture(page, '004-different-card-detail-shown', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="card-detail-view"]')).toBeVisible();
        const heading = page.locator('[data-testid="card-detail-view"] h3');
        await expect(heading).toContainText('Charge');
      }
    });

    // STEP 5: Click same card again to dismiss
    await differentCard.click();

    await screenshots.capture(page, '005-detail-view-dismissed', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="card-detail-view"]')).not.toBeVisible();
      }
    });

    // STEP 6: Add treasure item and test treasure card detail view
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroInventories',
        payload: {
          vistra: {
            heroId: 'vistra',
            items: [{ cardId: 134, isFlipped: false }]
          }
        }
      });
    });

    // Wait for treasure item to appear
    await page.locator('[data-testid="treasure-item-134"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, '006-treasure-item-added', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="treasure-item-134"]')).toBeVisible();
      }
    });

    // STEP 7: Click treasure item to show detail
    await page.locator('[data-testid="treasure-item-134"]').click();
    await page.locator('[data-testid="card-detail-view"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, '007-treasure-card-detail-shown', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="card-detail-view"]')).toBeVisible();
        await expect(page.locator('[data-testid="card-type"]')).toContainText('Treasure');
        const heading = page.locator('[data-testid="card-detail-view"] h3');
        await expect(heading).toContainText('Magic Sword');
      }
    });

    // STEP 8: Close detail view using close button
    await page.locator('[data-testid="card-detail-view"] button[aria-label="Close details"]').click();

    await screenshots.capture(page, '008-detail-closed-via-button', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="card-detail-view"]')).not.toBeVisible();
      }
    });
  });
});
