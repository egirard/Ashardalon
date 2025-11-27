import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from '../helpers/screenshot-helper';

test.describe('001 - Character Selection to Game Board (Tabletop Layout)', () => {
  test('player selects hero from bottom edge and starts game', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection screen with tabletop layout
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'initial-screen', {
      programmaticCheck: async () => {
        // Verify all four edge zones are visible
        await expect(page.locator('[data-testid="edge-top"]')).toBeVisible();
        await expect(page.locator('[data-testid="edge-bottom"]')).toBeVisible();
        await expect(page.locator('[data-testid="edge-left"]')).toBeVisible();
        await expect(page.locator('[data-testid="edge-right"]')).toBeVisible();
        
        // Verify center zone is visible with instructions
        await expect(page.locator('[data-testid="center-zone"]')).toBeVisible();
        
        // Verify heroes are displayed on each edge (5 heroes x 4 edges = 20 hero cards)
        const heroCards = page.locator('button.hero-card');
        await expect(heroCards).toHaveCount(20);
        
        // Verify start button is disabled (no heroes selected)
        await expect(page.locator('[data-testid="start-game-button"]')).toBeDisabled();
        
        // Verify selected count shows 0
        await expect(page.locator('[data-testid="selected-count"]')).toContainText('0 heroes selected');
      }
    });

    // STEP 2: Select hero Quinn from the bottom edge (player sitting at bottom)
    await page.locator('[data-testid="hero-quinn"]').click();

    await screenshots.capture(page, 'hero-selected', {
      programmaticCheck: async () => {
        // Verify Quinn is selected on bottom edge (has 'selected' class)
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
    
    // Wait for the position to be applied by checking Redux state
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 3, y: 2 });
    }).toPass();

    await screenshots.capture(page, 'game-board', {
      programmaticCheck: async () => {
        // Verify game board is visible with tabletop layout
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
        
        // Verify all four player edge zones exist
        await expect(page.locator('[data-testid="player-zone-top"]')).toBeVisible();
        await expect(page.locator('[data-testid="player-zone-bottom"]')).toBeVisible();
        await expect(page.locator('[data-testid="player-zone-left"]')).toBeVisible();
        await expect(page.locator('[data-testid="player-zone-right"]')).toBeVisible();
        
        // Verify start tile is displayed in center
        await expect(page.locator('[data-testid="start-tile"]')).toBeVisible();
        
        // Verify hero token is visible on the board
        await expect(page.locator('[data-testid="hero-token"]')).toBeVisible();
        
        // Verify turn indicator shows first player in the bottom edge zone (player 0 -> bottom edge)
        await expect(page.locator('[data-testid="player-zone-bottom"] [data-testid="turn-indicator"]')).toBeVisible();
        await expect(page.locator('[data-testid="turn-indicator"]')).toContainText("Quinn's Turn");
        
        // Verify phase display shows Hero Phase
        await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');
        
        // Verify active hero token has the 'active' class
        await expect(page.locator('[data-testid="hero-token"].active')).toBeVisible();
        
        // Verify reset button is accessible
        await expect(page.locator('[data-testid="reset-button"]')).toBeVisible();
        
        // Verify Redux store state
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.currentScreen).toBe('game-board');
        expect(storeState.game.heroTokens).toHaveLength(1);
        expect(storeState.game.heroTokens[0].heroId).toBe('quinn');
        // Verify the position was set deterministically
        expect(storeState.game.heroTokens[0].position).toEqual({ x: 3, y: 2 });
        // Verify turn state
        expect(storeState.game.turnState.currentHeroIndex).toBe(0);
        expect(storeState.game.turnState.currentPhase).toBe('hero-phase');
        expect(storeState.game.turnState.turnNumber).toBe(1);
      }
    });
  });
});
