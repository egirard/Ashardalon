import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('074 - Tiles Counter Popup', () => {
  test('Tiles counter displays as icon with popup showing tile information', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection and select Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    
    // Select power cards for Quinn
    await selectDefaultPowerCards(page, 'quinn');
    
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // STEP 2: Verify tiles counter displays as icon with badge
    await screenshots.capture(page, 'tiles-counter-icon-displayed', {
      programmaticCheck: async () => {
        // Verify tile counter button is visible
        await expect(page.locator('[data-testid="tile-deck-counter"]')).toBeVisible();
        
        // Verify tile count badge shows 16
        await expect(page.locator('[data-testid="tile-deck-count"]')).toHaveText('16');
        
        // Verify counter is in party resources container with XP and Healing Surges
        const partyResources = page.locator('.party-resources');
        await expect(partyResources).toBeVisible();
        await expect(partyResources.locator('[data-testid="xp-counter"]')).toBeVisible();
        await expect(partyResources.locator('[data-testid="healing-surge-counter"]')).toBeVisible();
        await expect(partyResources.locator('[data-testid="tile-deck-counter"]')).toBeVisible();
        
        // Verify Redux store state
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.dungeon.tileDeck).toHaveLength(16);
      }
    });

    // STEP 3: Click tiles counter to open popup
    await page.locator('[data-testid="tile-deck-counter"]').click();
    
    // Wait for popup to be visible
    await page.locator('[data-testid="tile-popover"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'tiles-popup-displayed', {
      programmaticCheck: async () => {
        // Verify popup is displayed
        await expect(page.locator('[data-testid="tile-popover"]')).toBeVisible();
        
        // Verify popup header shows "Tiles Remaining"
        await expect(page.locator('[data-testid="tile-popover"]')).toContainText('Tiles Remaining');
        
        // Verify popup shows current tile count
        await expect(page.locator('[data-testid="tile-popover"]')).toContainText('Tiles in Deck: 16');
        
        // Verify popup explains how tiles work
        await expect(page.locator('[data-testid="tile-popover"]')).toContainText('How Tiles Work');
        await expect(page.locator('[data-testid="tile-popover"]')).toContainText('The dungeon is built as you explore');
        await expect(page.locator('[data-testid="tile-popover"]')).toContainText('unexplored edge');
        
        // Verify popup has tips section
        await expect(page.locator('[data-testid="tile-popover"]')).toContainText('Tips');
        await expect(page.locator('[data-testid="tile-popover"]')).toContainText('Keep track of tiles remaining');
      }
    });

    // STEP 4: Close popup by clicking close button
    await page.locator('[data-testid="tile-popover"]').getByRole('button', { name: 'Close' }).click();
    
    // Wait for popup to close
    await page.locator('[data-testid="tile-popover"]').waitFor({ state: 'hidden' });
    
    await screenshots.capture(page, 'tiles-popup-closed', {
      programmaticCheck: async () => {
        // Verify popup is no longer visible
        await expect(page.locator('[data-testid="tile-popover"]')).not.toBeVisible();
        
        // Verify counter is still visible
        await expect(page.locator('[data-testid="tile-deck-counter"]')).toBeVisible();
      }
    });
  });
});
