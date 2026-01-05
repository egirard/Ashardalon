import { test, expect } from '@playwright/test';
import { createScreenshotHelper, dismissScenarioIntroduction } from '../helpers/screenshot-helper';

test.describe('070 - Flaming Sphere Movement UI', () => {
  test('User can move Flaming Sphere token during hero phase', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Setup - Select Haskan with Flaming Sphere and start game
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-haskan-bottom"]').click();

    await page.locator('[data-testid="select-powers-haskan"]').click();
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="daily-card-45"]').click();
    await page.locator('[data-testid="expanded-card"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="select-expanded-card"]').click();
    await page.locator('[data-testid="done-power-selection"]').click();
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'hidden' });

    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Set deterministic hero position
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'haskan', position: { x: 2, y: 3 } }
      });
    });

    // Disable animations
    await page.addStyleTag({
      content: `
        * {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    });

    // STEP 2: Place Flaming Sphere token programmatically
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const token = {
        id: 'token-flaming-sphere-test',
        type: 'flaming-sphere',
        powerCardId: 45,
        ownerId: 'haskan',
        position: { x: 2, y: 2 },
        charges: 3,
        canMove: true
      };
      
      store.dispatch({
        type: 'game/setBoardTokens',
        payload: [token]
      });
      
      // Mark card as used
      store.dispatch({
        type: 'heroes/usePowerCard',
        payload: { heroId: 'haskan', cardId: 45 }
      });
    });

    await page.locator('[data-testid="board-token"]').first().waitFor({ state: 'visible' });

    await screenshots.capture(page, 'flaming-sphere-placed', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        expect(storeState.game.boardTokens).toHaveLength(1);
        expect(storeState.game.boardTokens[0].type).toBe('flaming-sphere');
        expect(storeState.game.boardTokens[0].charges).toBe(3);
        expect(storeState.game.boardTokens[0].canMove).toBe(true);
        expect(storeState.game.boardTokens[0].position).toEqual({ x: 2, y: 2 });
        
        // Verify token is visible
        await expect(page.locator('[data-testid="board-token"]')).toHaveCount(1);
        await expect(page.locator('[data-testid="board-token"]')).toHaveAttribute('data-token-type', 'flaming-sphere');
      }
    });

    // STEP 3: Click Flaming Sphere card to open details panel with action buttons
    await page.locator('[data-testid="power-card-45"]').click();
    await page.waitForTimeout(300);
    
    // Wait for actions panel to appear
    await page.locator('[data-testid="flaming-sphere-actions"]').waitFor({ state: 'visible', timeout: 5000 });

    await screenshots.capture(page, 'control-panel-visible', {
      programmaticCheck: async () => {
        // Flaming Sphere card details panel should be open
        await expect(page.locator('[data-testid="power-card-details-panel"]')).toBeVisible();
        await expect(page.locator('[data-testid="flaming-sphere-actions"]')).toBeVisible();
        await expect(page.locator('[data-testid="move-flaming-sphere-button"]')).toBeVisible();
        await expect(page.locator('[data-testid="move-flaming-sphere-button"]')).toBeEnabled();
        
        // Button should show it's available
        const moveButton = page.locator('[data-testid="move-flaming-sphere-button"]');
        await expect(moveButton).not.toBeDisabled();
      }
    });

    // STEP 4: Click Move Sphere button
    await page.locator('[data-testid="move-flaming-sphere-button"]').click();
    await page.waitForTimeout(300);

    await screenshots.capture(page, 'movement-selection-started', {
      programmaticCheck: async () => {
        // Selectable squares should appear on the map
        const squares = page.locator('[data-testid^="selectable-square-"]');
        const count = await squares.count();
        expect(count).toBeGreaterThan(0);
        
        // Squares should have flaming-sphere styling
        const firstSquare = squares.first();
        const classList = await firstSquare.getAttribute('class');
        expect(classList).toContain('flaming-sphere-square');
      }
    });

    // STEP 5: Select a new square (different from current position) - it will auto-confirm
    const selectableSquares = page.locator('[data-testid^="selectable-square-"]');
    // Find a square that's not the current position (2, 2)
    let targetSquare = selectableSquares.first();
    const squareCount = await selectableSquares.count();
    
    for (let i = 0; i < squareCount; i++) {
      const square = selectableSquares.nth(i);
      const testId = await square.getAttribute('data-testid');
      if (testId && !testId.includes('2-2')) {
        targetSquare = square;
        break;
      }
    }
    
    await targetSquare.click();
    // Movement auto-confirms, wait for it to complete
    await page.waitForTimeout(500);

    await screenshots.capture(page, 'token-moved', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Token should still exist
        expect(storeState.game.boardTokens).toHaveLength(1);
        expect(storeState.game.boardTokens[0].type).toBe('flaming-sphere');
        
        // Position should have changed
        const newPosition = storeState.game.boardTokens[0].position;
        expect(newPosition).not.toEqual({ x: 2, y: 2 });
        
        // Charges should remain the same
        expect(storeState.game.boardTokens[0].charges).toBe(3);
        
        // Hero should have recorded a move action
        const heroActions = storeState.game.heroTurnActions;
        expect(heroActions.actionsTaken).toContain('move');
        
        // Token should still be visible
        await expect(page.locator('[data-testid="board-token"]')).toHaveCount(1);
      }
    });

    // STEP 6: Verify Move button is now disabled (hero already moved)
    await screenshots.capture(page, 'move-button-disabled', {
      programmaticCheck: async () => {
        // Actions panel should still be visible
        await expect(page.locator('[data-testid="flaming-sphere-actions"]')).toBeVisible();
        
        // Move button should now be disabled
        const moveButton = page.locator('[data-testid="move-flaming-sphere-button"]');
        await expect(moveButton).toBeDisabled();
      }
    });
  });
});
