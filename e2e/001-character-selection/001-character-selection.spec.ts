import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from '../helpers/screenshot-helper';

test.describe('001 - Character Selection to Game Board', () => {
  test('player selects hero and starts game', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection screen
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'initial-screen', {
      programmaticCheck: async () => {
        // Verify all 5 heroes are displayed
        await expect(page.locator('[data-testid="hero-grid"]')).toBeVisible();
        // Use button.hero-card selector to count only the hero card buttons
        const heroCards = page.locator('button.hero-card');
        await expect(heroCards).toHaveCount(5);
        
        // Verify start button is disabled (no heroes selected)
        await expect(page.locator('[data-testid="start-game-button"]')).toBeDisabled();
        
        // Verify selected count shows 0
        await expect(page.locator('[data-testid="selected-count"]')).toContainText('0 heroes selected');
      }
    });

    // STEP 2: Select hero Quinn
    await page.locator('[data-testid="hero-quinn"]').click();

    await screenshots.capture(page, 'hero-selected', {
      programmaticCheck: async () => {
        // Verify Quinn is selected (has 'selected' class)
        await expect(page.locator('[data-testid="hero-quinn"]')).toHaveClass(/selected/);
        
        // Verify start button is now enabled
        await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled();
        
        // Verify selected count shows 1
        await expect(page.locator('[data-testid="selected-count"]')).toContainText('1 heroes selected');
        
        // Verify Redux store state
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.heroes.selectedHeroes).toHaveLength(1);
        expect(storeState.heroes.selectedHeroes[0].id).toBe('quinn');
      }
    });

    // STEP 3: Start the game
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Set deterministic position for the screenshot
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 3, y: 2 } }
      });
    });
    
    // Wait for the UI to update
    await page.waitForTimeout(100);

    await screenshots.capture(page, 'game-board', {
      programmaticCheck: async () => {
        // Verify game board is visible
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
        
        // Verify start tile is displayed
        await expect(page.locator('[data-testid="start-tile"]')).toBeVisible();
        
        // Verify hero token is visible on the board
        await expect(page.locator('[data-testid="hero-token"]')).toBeVisible();
        
        // Verify turn indicator shows first player
        await expect(page.locator('[data-testid="turn-indicator"]')).toContainText('Quinn');
        
        // Verify Redux store state
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.currentScreen).toBe('game-board');
        expect(storeState.game.heroTokens).toHaveLength(1);
        expect(storeState.game.heroTokens[0].heroId).toBe('quinn');
        // Verify the position was set deterministically
        expect(storeState.game.heroTokens[0].position).toEqual({ x: 3, y: 2 });
      }
    });
  });
});
