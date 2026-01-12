import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from '../helpers/screenshot-helper';

test.describe('076 - Duplicate Character Panels', () => {
  test('duplicate panels appear when two heroes selected on same edge with swap functionality', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'character-selection-initial', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="character-select"]')).toBeVisible();
        await expect(page.locator('h1')).toContainText('Select Your Heroes');
        
        // No duplicate panels initially
        const duplicatePanels = await page.locator('[data-testid^="duplicate-panel-"]').count();
        expect(duplicatePanels).toBe(0);
      }
    });

    // STEP 2: Select first hero (Quinn) from bottom edge
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await page.locator('[data-testid="select-powers-quinn"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'one-hero-selected-no-panels', {
      programmaticCheck: async () => {
        // Verify Quinn is selected
        await expect(page.locator('[data-testid="hero-quinn-bottom"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="selected-count"]')).toContainText('1 heroes selected');
        
        // No duplicate panels yet (only 1 hero on this edge)
        const duplicatePanels = await page.locator('[data-testid^="duplicate-panel-"]').count();
        expect(duplicatePanels).toBe(0);
        
        // Verify Redux store
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.heroes.selectedHeroes.length).toBe(1);
        expect(storeState.heroes.heroEdgeMap['quinn']).toBe('bottom');
      }
    });

    // STEP 3: Select second hero (Vistra) from bottom edge
    await page.locator('[data-testid="hero-vistra-bottom"]').click();
    await page.locator('[data-testid="select-powers-vistra"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'two-heroes-duplicate-panels-appear', {
      programmaticCheck: async () => {
        // Verify both heroes are selected
        await expect(page.locator('[data-testid="hero-quinn-bottom"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="hero-vistra-bottom"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="selected-count"]')).toContainText('2 heroes selected');
        
        // Verify duplicate panels are now shown (2 panels total)
        const duplicatePanels = await page.locator('[data-testid^="duplicate-panel-"]').count();
        expect(duplicatePanels).toBe(2);
        
        // Verify specific panels exist
        await expect(page.locator('[data-testid="duplicate-panel-quinn-left"]')).toBeVisible();
        await expect(page.locator('[data-testid="duplicate-panel-vistra-right"]')).toBeVisible();
        
        // Verify swap arrows are present
        await expect(page.locator('[data-testid="swap-arrow-quinn-left"]')).toBeVisible();
        await expect(page.locator('[data-testid="swap-arrow-vistra-right"]')).toBeVisible();
        
        // Verify Redux store state
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        expect(storeState.heroes.selectedHeroes.length).toBe(2);
        expect(storeState.heroes.heroEdgeMap['quinn']).toBe('bottom');
        expect(storeState.heroes.heroEdgeMap['vistra']).toBe('bottom');
        expect(storeState.heroes.heroSidePreferences['quinn']).toBe('left');
        expect(storeState.heroes.heroSidePreferences['vistra']).toBe('right');
      }
    });

    // STEP 4: Click swap arrow to swap positions
    await page.locator('[data-testid="swap-arrow-quinn-left"]').click();

    await screenshots.capture(page, 'positions-swapped', {
      programmaticCheck: async () => {
        // Verify panels swapped positions
        await expect(page.locator('[data-testid="duplicate-panel-quinn-right"]')).toBeVisible();
        await expect(page.locator('[data-testid="duplicate-panel-vistra-left"]')).toBeVisible();
        
        // Verify arrows updated
        await expect(page.locator('[data-testid="swap-arrow-quinn-right"]')).toBeVisible();
        await expect(page.locator('[data-testid="swap-arrow-vistra-left"]')).toBeVisible();
        
        // Verify sides are swapped in Redux store
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        expect(storeState.heroes.heroSidePreferences['quinn']).toBe('right');
        expect(storeState.heroes.heroSidePreferences['vistra']).toBe('left');
      }
    });

    // STEP 5: Deselect one hero - panels should disappear
    await page.locator('[data-testid="hero-vistra-bottom"]').click();
    
    await screenshots.capture(page, 'one-hero-panels-disappear', {
      programmaticCheck: async () => {
        // Verify only Quinn is selected
        await expect(page.locator('[data-testid="hero-quinn-bottom"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="selected-count"]')).toContainText('1 heroes selected');
        
        // Verify duplicate panels disappeared
        const duplicatePanels = await page.locator('[data-testid^="duplicate-panel-"]').count();
        expect(duplicatePanels).toBe(0);
        
        // Verify Redux store
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.heroes.selectedHeroes.length).toBe(1);
      }
    });
  });
});
