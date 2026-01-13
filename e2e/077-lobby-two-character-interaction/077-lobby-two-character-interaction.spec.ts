import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from '../helpers/screenshot-helper';

test.describe('077 - Lobby Two Character Interaction', () => {
  test('power button opens modal, character click deselects, third hero disabled', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'character-selection-initial', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="character-select"]')).toBeVisible();
        await expect(page.locator('h1')).toContainText('Select Your Heroes');
      }
    });

    // STEP 2: Select two heroes from bottom edge (Quinn and Vistra)
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await page.locator('[data-testid="select-powers-quinn"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-vistra-bottom"]').click();
    await page.locator('[data-testid="duplicate-panel-vistra-right"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'two-heroes-selected', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="selected-count"]')).toContainText('2 heroes selected');
        
        // Verify duplicate panels exist
        await expect(page.locator('[data-testid="duplicate-panel-quinn-left"]')).toBeVisible();
        await expect(page.locator('[data-testid="duplicate-panel-vistra-right"]')).toBeVisible();
        
        // Verify power buttons exist in panels
        await expect(page.locator('[data-testid="power-button-quinn-left"]')).toBeVisible();
        await expect(page.locator('[data-testid="power-button-vistra-right"]')).toBeVisible();
        
        // Verify deselect buttons exist in panels
        await expect(page.locator('[data-testid="deselect-quinn-left"]')).toBeVisible();
        await expect(page.locator('[data-testid="deselect-vistra-right"]')).toBeVisible();
        
        // Verify third hero (Keyleth) is disabled
        await expect(page.locator('[data-testid="hero-keyleth-bottom"]')).toBeDisabled();
        await expect(page.locator('[data-testid="hero-tarak-bottom"]')).toBeDisabled();
        await expect(page.locator('[data-testid="hero-haskan-bottom"]')).toBeDisabled();
      }
    });

    // STEP 3: Click power button to open power selection modal
    await page.locator('[data-testid="power-button-quinn-left"]').click();
    await page.locator('text=Select Power Cards for Quinn').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'power-modal-opened', {
      programmaticCheck: async () => {
        // Verify power selection modal is open
        await expect(page.locator('h2')).toContainText('Select Power Cards for Quinn');
        
        // Verify close button exists
        await expect(page.locator('[data-testid="close-power-selection"]')).toBeVisible();
      }
    });

    // STEP 4: Close power modal
    await page.locator('[data-testid="close-power-selection"]').click();
    await page.locator('text=Select Power Cards for Quinn').waitFor({ state: 'hidden' });

    await screenshots.capture(page, 'power-modal-closed', {
      programmaticCheck: async () => {
        // Verify modal is closed
        const modalCount = await page.locator('h2:has-text("Select Power Cards for Quinn")').count();
        expect(modalCount).toBe(0);
        
        // Verify panels still visible
        await expect(page.locator('[data-testid="duplicate-panel-quinn-left"]')).toBeVisible();
      }
    });

    // STEP 5: Click on Quinn's character image to deselect
    await page.locator('[data-testid="deselect-quinn-left"]').click();
    // Wait for duplicate panels to disappear
    await page.locator('[data-testid="duplicate-panel-vistra-right"]').waitFor({ state: 'hidden' });

    await screenshots.capture(page, 'hero-deselected', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="selected-count"]')).toContainText('1 heroes selected');
        
        // Verify duplicate panels are gone
        const duplicatePanels = await page.locator('[data-testid^="duplicate-panel-"]').count();
        expect(duplicatePanels).toBe(0);
        
        // Verify Quinn is now available again
        await expect(page.locator('[data-testid="hero-quinn-bottom"]')).toBeEnabled();
        
        // Verify other heroes are now enabled (since only 1 hero on edge)
        await expect(page.locator('[data-testid="hero-keyleth-bottom"]')).toBeEnabled();
        await expect(page.locator('[data-testid="hero-tarak-bottom"]')).toBeEnabled();
        await expect(page.locator('[data-testid="hero-haskan-bottom"]')).toBeEnabled();
        
        // Verify Vistra still has power button
        await expect(page.locator('[data-testid="select-powers-vistra"]')).toBeVisible();
      }
    });

    // STEP 6: Re-select Quinn to test third hero disabled
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    // Wait for either left or right duplicate panel (side preference may vary)
    await page.locator('[data-testid^="duplicate-panel-quinn-"]').first().waitFor({ state: 'visible' });

    await screenshots.capture(page, 'third-hero-disabled', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="selected-count"]')).toContainText('2 heroes selected');
        
        // Verify third hero cannot be selected
        await expect(page.locator('[data-testid="hero-keyleth-bottom"]')).toBeDisabled();
        await expect(page.locator('[data-testid="hero-tarak-bottom"]')).toBeDisabled();
        await expect(page.locator('[data-testid="hero-haskan-bottom"]')).toBeDisabled();
        
        // Verify Redux store
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        expect(storeState.heroes.selectedHeroes.length).toBe(2);
        const heroesOnBottom = storeState.heroes.selectedHeroes.filter(
          (h: any) => storeState.heroes.heroEdgeMap[h.id] === 'bottom'
        );
        expect(heroesOnBottom.length).toBe(2);
      }
    });
  });
});
