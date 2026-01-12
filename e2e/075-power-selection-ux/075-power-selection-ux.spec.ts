import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from '../helpers/screenshot-helper';

test.describe('075 - Power Selection UX', () => {
  test('player can see power count and change powers with improved UX', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection screen
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'initial-screen', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="character-select"]')).toBeVisible();
        await expect(page.locator('[data-testid="start-game-button"]')).toBeDisabled();
      }
    });

    // STEP 2: Select hero Vistra (Fighter with 3 at-will powers) from the bottom edge
    await page.locator('[data-testid="hero-vistra-bottom"]').click();
    
    await screenshots.capture(page, 'hero-selected', {
      programmaticCheck: async () => {
        // Verify Vistra is selected
        await expect(page.locator('[data-testid="hero-vistra-bottom"]')).toHaveClass(/selected/);
        
        // Verify the power count is displayed (should be "5 of 5 Powers")
        const powerButton = page.locator('[data-testid="select-powers-vistra"]');
        await expect(powerButton).toBeVisible();
        await expect(powerButton).toContainText('5 of 5 Powers');
        
        // Verify tooltip is present
        await expect(powerButton).toHaveAttribute('title', 'Click to change powers');
        
        // Verify start button is enabled (powers auto-selected)
        await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled();
      }
    });

    // STEP 3: Open power card selection modal for Vistra
    await page.locator('[data-testid="select-powers-vistra"]').click();
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'power-modal-opened', {
      programmaticCheck: async () => {
        // Verify modal is visible
        await expect(page.locator('[data-testid="power-card-selection"]')).toBeVisible();
        
        // Verify custom ability card is displayed (Dwarven Resilience for Vistra)
        await expect(page.locator('[data-testid="custom-ability-card"]')).toBeVisible();
        
        // Verify at-will cards section shows 2/2 selected
        const atWillSection = page.locator('.section-label:has-text("At-Will")');
        await expect(atWillSection).toContainText('2/2');
        
        // Verify all at-will cards are clickable (no disabled state)
        const atWillCards = page.locator('[data-testid^="atwill-card-"]');
        const count = await atWillCards.count();
        expect(count).toBeGreaterThanOrEqual(3); // Vistra has at least 3 at-will powers
        
        // Check that no at-will cards are disabled
        for (let i = 0; i < count; i++) {
          const card = atWillCards.nth(i);
          await expect(card).not.toBeDisabled();
        }
      }
    });

    // STEP 4: Click on an unselected at-will card (should auto-swap)
    // First, get the current selections
    const selectedAtWills = await page.locator('[data-testid^="atwill-card-"].selected').all();
    const firstSelectedId = await selectedAtWills[0].getAttribute('data-testid');
    
    // Find an unselected at-will card
    const allAtWillCards = await page.locator('[data-testid^="atwill-card-"]').all();
    let unselectedCard = null;
    for (const card of allAtWillCards) {
      const isSelected = await card.evaluate((el) => el.classList.contains('selected'));
      if (!isSelected) {
        unselectedCard = card;
        break;
      }
    }
    
    // Click the unselected card
    if (unselectedCard) {
      await unselectedCard.click();
    }
    
    await screenshots.capture(page, 'power-swapped', {
      programmaticCheck: async () => {
        // Verify the first selected card is no longer selected
        if (firstSelectedId) {
          const firstCard = page.locator(`[data-testid="${firstSelectedId}"]`);
          await expect(firstCard).not.toHaveClass(/selected/);
        }
        
        // Verify still exactly 2 at-will cards are selected
        await expect(page.locator('[data-testid^="atwill-card-"].selected')).toHaveCount(2);
      }
    });

    // STEP 5: Verify Done button is NOT present (removed as per requirement 3)
    await screenshots.capture(page, 'no-done-button', {
      programmaticCheck: async () => {
        // Verify Done button does not exist
        await expect(page.locator('[data-testid="done-power-selection"]')).not.toBeVisible();
        
        // Verify close button (X) is present in modal header
        await expect(page.locator('[data-testid="close-power-selection"]')).toBeVisible();
      }
    });

    // STEP 6: Close modal using X button
    await page.locator('[data-testid="close-power-selection"]').click();
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'hidden' });

    await screenshots.capture(page, 'modal-closed', {
      programmaticCheck: async () => {
        // Verify modal is closed
        await expect(page.locator('[data-testid="power-card-selection"]')).not.toBeVisible();
        
        // Verify the power count still shows "5 of 5 Powers"
        await expect(page.locator('[data-testid="select-powers-vistra"]')).toContainText('5 of 5 Powers');
        
        // Verify start button is still enabled
        await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled();
      }
    });
  });
});
