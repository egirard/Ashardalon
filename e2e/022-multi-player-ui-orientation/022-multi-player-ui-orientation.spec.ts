import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards } from '../helpers/screenshot-helper';

test.describe('022 - Multi-Player UI Orientation', () => {
  test('players from different edges see their dashboards at their edges', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    // STEP 2: Select Quinn from bottom edge (standard orientation)
    await page.locator('[data-testid="hero-quinn"]').click();
    await selectDefaultPowerCards(page, 'quinn');

    // STEP 3: Select Vistra from top edge (180° rotation)
    await page.locator('[data-testid="hero-vistra-top"]').click();
    await selectDefaultPowerCards(page, 'vistra');

    // STEP 4: Select Keyleth from left edge (90° rotation)
    await page.locator('[data-testid="hero-keyleth-left"]').click();
    await selectDefaultPowerCards(page, 'keyleth');

    await screenshots.capture(page, 'character-selection-complete', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="selected-count"]')).toContainText('3 heroes selected');
        await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled();
        
        // Verify heroes are selected from different edges
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.heroes.heroEdgeMap['quinn']).toBe('bottom');
        expect(storeState.heroes.heroEdgeMap['vistra']).toBe('top');
        expect(storeState.heroes.heroEdgeMap['keyleth']).toBe('left');
      }
    });

    // STEP 5: Start the game
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Set deterministic positions for reproducible screenshots
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 3 } }
      });
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'vistra', position: { x: 2, y: 4 } }
      });
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'keyleth', position: { x: 3, y: 4 } }
      });
    });

    // Wait for position changes to be applied
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens.find((t: any) => t.heroId === 'quinn')?.position).toEqual({ x: 2, y: 3 });
    }).toPass();

    // Hide the movement overlay for a stable screenshot
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/hideMovement' });
    });

    // Wait for movement overlay to be hidden
    await page.waitForFunction(() => {
      const buttons = document.querySelectorAll('[data-testid^="move-to-"]');
      return buttons.length === 0;
    });

    await screenshots.capture(page, 'game-board-multi-player', {
      programmaticCheck: async () => {
        // Verify all three player zones have content
        // Quinn is active (bottom edge) - should show turn indicator
        await expect(page.locator('[data-testid="player-zone-bottom"] [data-testid="turn-indicator"]')).toBeVisible();
        await expect(page.locator('[data-testid="turn-indicator"]')).toContainText("Quinn's Turn");
        await expect(page.locator('[data-testid="player-zone-bottom"]')).toContainText('Hero Phase');
        await expect(page.locator('[data-testid="player-zone-bottom"]')).toContainText('HP: 8/8');
        
        // Vistra (top edge) - should show dashboard with name and HP (not active, no turn info)
        await expect(page.locator('[data-testid="player-zone-top"]')).toContainText('Vistra');
        await expect(page.locator('[data-testid="player-zone-top"]')).toContainText('HP: 10/10');
        // Should NOT show turn info since Vistra is not the active player
        await expect(page.locator('[data-testid="player-zone-top"]')).not.toContainText('Hero Phase');
        
        // Keyleth (left edge) - should show dashboard with name and HP (not active, no turn info)
        await expect(page.locator('[data-testid="player-zone-left"]')).toContainText('Keyleth');
        await expect(page.locator('[data-testid="player-zone-left"]')).toContainText('HP: 10/10');
        // Should NOT show turn info since Keyleth is not the active player
        await expect(page.locator('[data-testid="player-zone-left"]')).not.toContainText('Hero Phase');
        
        // Right edge should be empty (no player joined from there)
        await expect(page.locator('[data-testid="player-zone-right"]')).toBeEmpty();
        
        // Verify store state confirms edge mappings persist into game
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.heroes.heroEdgeMap['quinn']).toBe('bottom');
        expect(storeState.heroes.heroEdgeMap['vistra']).toBe('top');
        expect(storeState.heroes.heroEdgeMap['keyleth']).toBe('left');
      }
    });
  });
});

