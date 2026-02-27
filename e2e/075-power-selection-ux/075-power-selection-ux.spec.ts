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

    // STEP 2: Select hero Vistra (Dwarf Fighter with 3 at-will powers) from the bottom edge
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

    // STEP 3: Open power card selection panel for Vistra
    await page.locator('[data-testid="select-powers-vistra"]').click();
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'power-panel-opened', {
      programmaticCheck: async () => {
        // Verify panel is visible
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

    // STEP 4: Click an at-will card to open the detail panel
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

    // Click to open detail panel
    if (unselectedCard) {
      await unselectedCard.click();
    }

    await screenshots.capture(page, 'detail-panel-opened', {
      programmaticCheck: async () => {
        // Verify detail panel is visible
        await expect(page.locator('[data-testid="power-detail-panel"]')).toBeVisible();
        await expect(page.locator('[data-testid="detail-card-name"]')).toBeVisible();
        await expect(page.locator('[data-testid="detail-card-description"]')).toBeVisible();
        await expect(page.locator('[data-testid="detail-card-rule"]')).toBeVisible();
        
        // Select button is visible and says "Select Power" (card is not yet selected)
        await expect(page.locator('[data-testid="detail-select-button"]')).toBeVisible();
        await expect(page.locator('[data-testid="detail-select-button"]')).toContainText('Select Power');
      }
    });

    // STEP 5: Select the card from the detail panel (auto-swaps since at 2/2 capacity)
    const firstSelectedAtWills = await page.locator('[data-testid^="atwill-card-"].selected').all();
    const firstSelectedId = await firstSelectedAtWills[0].getAttribute('data-testid');

    await page.locator('[data-testid="detail-select-button"]').click();

    await screenshots.capture(page, 'power-swapped', {
      programmaticCheck: async () => {
        // Verify the first selected card is no longer selected (auto-swap occurred)
        if (firstSelectedId) {
          const firstCard = page.locator(`[data-testid="${firstSelectedId}"]`);
          await expect(firstCard).not.toHaveClass(/selected/);
        }
        
        // Verify still exactly 2 at-will cards are selected
        await expect(page.locator('[data-testid^="atwill-card-"].selected')).toHaveCount(2);
        
        // The detail panel select button now shows "Deselect Power"
        await expect(page.locator('[data-testid="detail-select-button"]')).toContainText('Deselect Power');
      }
    });

    // STEP 6: Verify Done button is NOT present (removed as per requirement)
    await screenshots.capture(page, 'no-done-button', {
      programmaticCheck: async () => {
        // Verify Done button does not exist
        await expect(page.locator('[data-testid="done-power-selection"]')).not.toBeVisible();
        
        // Verify close button (X) is present in panel header
        await expect(page.locator('[data-testid="close-power-selection"]')).toBeVisible();
      }
    });

    // STEP 7: Close panel using X button
    await page.locator('[data-testid="close-power-selection"]').click();
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'hidden' });

    await screenshots.capture(page, 'panel-closed', {
      programmaticCheck: async () => {
        // Verify panel is closed
        await expect(page.locator('[data-testid="power-card-selection"]')).not.toBeVisible();
        
        // Verify the power count still shows "5 of 5 Powers"
        await expect(page.locator('[data-testid="select-powers-vistra"]')).toContainText('5 of 5 Powers');
        
        // Verify start button is still enabled
        await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled();
      }
    });
  });
});
