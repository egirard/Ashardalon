import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from '../helpers/screenshot-helper';

test.describe('067 - Blade Barrier UI Activation with On-Map Selection', () => {
  test('User can activate Blade Barrier through UI clicks and place tokens on-map', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection and select Quinn (Cleric)
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();

    // Select power cards for Quinn, explicitly choosing Blade Barrier (ID 5)
    await page.locator('[data-testid="select-powers-quinn"]').click();
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'visible' });
    
    // Select Blade Barrier (ID 5) as daily
    await page.locator('[data-testid="daily-card-5"]').click();
    await page.locator('[data-testid="expanded-card"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="select-expanded-card"]').click();
    
    // Close power selection modal
    await page.locator('[data-testid="done-power-selection"]').click();
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'hidden' });

    await screenshots.capture(page, 'hero-selected-with-blade-barrier', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="hero-quinn-bottom"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled();
      }
    });

    // STEP 2: Start the game
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    
    // Dismiss scenario introduction
    await page.locator('[data-testid="start-scenario-button"]').click();
    await page.locator('[data-testid="scenario-introduction"]').waitFor({ state: 'hidden' });

    // Set deterministic hero position for consistent screenshots
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 3 } }
      });
    });

    // Disable animations for stable screenshots
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

    await screenshots.capture(page, 'game-started', {
      programmaticCheck: async () => {
        // Verify power cards are visible
        await expect(page.locator('[data-testid="player-power-cards"]')).toBeVisible();
        // Verify Blade Barrier card exists
        await expect(page.locator('[data-testid="power-card-5"]')).toBeVisible();
      }
    });

    // STEP 3: Click the Blade Barrier card to show Power Card Details Panel
    await page.locator('[data-testid="power-card-5"]').click();
    
    // Wait for details panel to appear
    await page.waitForTimeout(300);
    
    // Verify Power Card Details Panel is shown
    await expect(page.locator('[data-testid="power-card-details-panel"]')).toBeVisible();

    await screenshots.capture(page, 'blade-barrier-control-panel', {
      programmaticCheck: async () => {
        // Verify details panel shows the card information and activate button
        await expect(page.locator('[data-testid="power-card-details-panel"]')).toBeVisible();
        
        // Verify activate button is visible in the details panel
        await expect(page.locator('[data-testid="activate-blade-barrier-button"]')).toBeVisible();
        
        // Verify the card remains selected in the Power Card Panel
        await expect(page.locator('[data-testid="power-card-5"]')).toHaveClass(/selected/);
      }
    });
    
    // STEP 4: Click the "Activate" button to start blade barrier selection
    await page.locator('[data-testid="activate-blade-barrier-button"]').click();
    
    // Wait for tile to become selectable (purple overlay appears)
    await page.waitForTimeout(300);
    
    // Verify the start tile has the selectable-tile class
    await expect(page.locator('[data-testid="start-tile"]')).toHaveClass(/selectable-tile/);

    await screenshots.capture(page, 'tile-selection-on-map', {
      programmaticCheck: async () => {
        // Verify blade barrier selection UI is displayed in the details panel
        await expect(page.locator('[data-testid="blade-barrier-selection"]')).toBeVisible();
        const instructions = page.locator('text=Select Tile');
        await expect(instructions).toBeVisible();
        
        // Verify start tile is selectable
        await expect(page.locator('[data-testid="start-tile"]')).toHaveClass(/selectable-tile/);
        
        // Verify cancel button exists
        await expect(page.locator('[data-testid="cancel-selection-button"]')).toBeVisible();
      }
    });

    // STEP 5: Click directly on the start tile on the map
    await page.locator('[data-testid="start-tile"]').click();
    
    // Wait for square selection mode to appear
    await page.waitForTimeout(300);
    
    // Verify selectable squares appear
    const selectableSquares = page.locator('[data-testid^="selectable-square-"]');
    await expect(selectableSquares.first()).toBeVisible();

    await screenshots.capture(page, 'square-selection-on-map', {
      programmaticCheck: async () => {
        // Verify blade barrier selection UI shows square selection in the details panel
        await expect(page.locator('[data-testid="blade-barrier-selection"]')).toBeVisible();
        const instructions = page.locator('text=Select Squares');
        await expect(instructions).toBeVisible();
        
        // Verify selectable squares exist
        const squares = page.locator('[data-testid^="selectable-square-"]');
        const count = await squares.count();
        expect(count).toBeGreaterThan(0);
        
        // Verify progress shows 0/5 in expanded card using data-testid
        const progressCounter = page.locator('[data-testid="progress-counter"]');
        await expect(progressCounter).toBeVisible();
        await expect(progressCounter).toContainText('0');
        await expect(progressCounter).toContainText('5');
      }
    });

    // STEP 6: Click 5 different squares on the map
    // Get all selectable squares
    const squares = page.locator('[data-testid^="selectable-square-"]');
    const squareCount = await squares.count();
    
    // Click first 5 squares
    for (let i = 0; i < Math.min(5, squareCount); i++) {
      await squares.nth(i).click();
      await page.waitForTimeout(150); // Brief wait for UI to update
    }

    await screenshots.capture(page, 'five-squares-selected-on-map', {
      programmaticCheck: async () => {
        // Verify progress shows 5/5 in expanded card using data-testid
        const progressCounter = page.locator('[data-testid="progress-counter"]');
        await expect(progressCounter).toBeVisible();
        await expect(progressCounter).toContainText('5 / 5');
        
        // Verify confirm button is visible in expanded card
        await expect(page.locator('[data-testid="confirm-placement-button"]')).toBeVisible();
        
        // Verify selected squares show numbers 1-5
        const selectedSquares = page.locator('.selectable-square.selected .selection-number');
        await expect(selectedSquares).toHaveCount(5);
      }
    });

    // STEP 7: Click confirm button to place tokens
    const confirmButton = page.locator('[data-testid="confirm-placement-button"]');
    await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
    
    // Verify button is visible and enabled
    await expect(confirmButton).toBeVisible();
    await expect(confirmButton).toBeEnabled();
    
    // Click the button - this should now work after fixing the Svelte state descriptor issue
    await confirmButton.click();
    
    // Wait for tokens to be placed
    await page.waitForTimeout(500);
    
    // Verify tokens were placed
    const tokensPlaced = await page.evaluate(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.boardTokens.length;
    });
    
    expect(tokensPlaced).toBe(5);
    
    // Wait for UI to update
    await page.waitForTimeout(500);

    await screenshots.capture(page, 'tokens-placed-card-used', {
      programmaticCheck: async () => {
        // First, verify tokens were added to the store
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.boardTokens).toHaveLength(5);
        
        // Wait a bit for rendering
        await page.waitForTimeout(500);
        
        // Verify tokens are rendered on the board
        const boardTokens = page.locator('[data-testid="board-token"]');
        await expect(boardTokens).toHaveCount(5);
        
        // Verify Blade Barrier card is marked as used (should have flipped/disabled indicator)
        const bladeBarrierCard = page.locator('[data-testid="power-card-5"]');
        await expect(bladeBarrierCard).toHaveClass(/disabled|flipped/);
      }
    });
  });
});
