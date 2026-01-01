import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from '../helpers/screenshot-helper';

test.describe('067 - Blade Barrier UI Activation', () => {
  test('User can activate Blade Barrier through UI clicks and place tokens via modals', async ({ page }) => {
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

    await screenshots.capture(page, 'game-started', {
      programmaticCheck: async () => {
        // Verify power cards are visible
        await expect(page.locator('[data-testid="player-power-cards"]')).toBeVisible();
        // Verify Blade Barrier card exists
        await expect(page.locator('[data-testid="power-card-5"]')).toBeVisible();
      }
    });

    // STEP 3: Click the Blade Barrier card to see detail view
    await page.locator('[data-testid="power-card-5"]').click();
    await page.locator('[data-testid="card-detail-view"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'blade-barrier-detail-view', {
      programmaticCheck: async () => {
        // Verify detail view shows card information
        await expect(page.locator('[data-testid="card-detail-view"]')).toBeVisible();
        await expect(page.locator('[data-testid="card-rule"]')).toContainText('Blade Barrier');
        // Verify activate button is present
        await expect(page.locator('[data-testid="activate-power-button"]')).toBeVisible();
        await expect(page.locator('[data-testid="activate-power-button"]')).toBeEnabled();
      }
    });

    // STEP 4: Click the "Activate Power" button
    await page.locator('[data-testid="activate-power-button"]').click();
    
    // Wait for tile selection modal to appear
    await page.locator('[data-testid="tile-selection-modal"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'tile-selection-modal-open', {
      programmaticCheck: async () => {
        // Verify tile selection modal is displayed
        await expect(page.locator('[data-testid="tile-selection-modal"]')).toBeVisible();
        // Verify there are selectable tiles
        const tiles = page.locator('[data-testid^="tile-option-"]');
        await expect(tiles).toHaveCount(1); // Only start tile should be in range initially
      }
    });

    // STEP 5: Select a tile (the start tile should be available)
    await page.locator('[data-testid="tile-option-start-tile"]').click();
    
    // Click confirm button
    await page.locator('[data-testid="confirm-tile-selection"]').click();
    
    // Wait for token placement modal to appear
    await page.locator('[data-testid="token-placement-modal"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'token-placement-modal-open', {
      programmaticCheck: async () => {
        // Verify token placement modal is displayed
        await expect(page.locator('[data-testid="token-placement-modal"]')).toBeVisible();
        // Verify progress counter shows 0/5
        await expect(page.locator('[data-testid="token-placement-progress"]')).toContainText('0 / 5');
      }
    });

    // STEP 6: Select 5 squares on the tile
    // Find all selectable squares
    const selectableSquares = page.locator('[data-testid^="square-option-"]');
    const squareCount = await selectableSquares.count();
    
    // Click 5 different squares
    for (let i = 0; i < Math.min(5, squareCount); i++) {
      await selectableSquares.nth(i).click();
      // Wait a moment for UI to update
      await page.waitForTimeout(100);
    }

    await screenshots.capture(page, 'five-squares-selected', {
      programmaticCheck: async () => {
        // Verify 5 squares are selected
        await expect(page.locator('[data-testid="token-placement-progress"]')).toContainText('5 / 5');
        // Verify confirm button is enabled
        await expect(page.locator('[data-testid="confirm-token-placement"]')).toBeEnabled();
      }
    });

    // STEP 7: Confirm token placement
    await page.locator('[data-testid="confirm-token-placement"]').click();
    
    // Wait a moment for the action to process
    await page.waitForTimeout(500);
    
    // Verify modal is no longer visible (checking count instead of waitFor)
    await expect(page.locator('[data-testid="token-placement-modal"]')).toHaveCount(0);

    await screenshots.capture(page, 'tokens-placed-card-used', {
      programmaticCheck: async () => {
        // Verify modal is closed
        await expect(page.locator('[data-testid="token-placement-modal"]')).toHaveCount(0);
        
        // Verify tokens are on the board
        const boardTokens = page.locator('[data-testid="board-token"]');
        await expect(boardTokens).toHaveCount(5);
        
        // Verify Blade Barrier card is marked as used (should have flipped indicator)
        const bladeBarrierCard = page.locator('[data-testid="power-card-5"]');
        await expect(bladeBarrierCard).toHaveClass(/disabled/);
      }
    });
  });
});
