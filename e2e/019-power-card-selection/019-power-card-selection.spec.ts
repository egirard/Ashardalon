import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from '../helpers/screenshot-helper';

test.describe('019 - Power Card Selection', () => {
  test('player selects hero and chooses power cards before starting game', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection screen
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'initial-screen', {
      programmaticCheck: async () => {
        // Verify character select screen is visible
        await expect(page.locator('[data-testid="character-select"]')).toBeVisible();
        
        // Verify start button is disabled (no heroes selected)
        await expect(page.locator('[data-testid="start-game-button"]')).toBeDisabled();
      }
    });

    // STEP 2: Select hero Quinn from the bottom edge
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    
    await screenshots.capture(page, 'hero-selected', {
      programmaticCheck: async () => {
        // Verify Quinn is selected
        await expect(page.locator('[data-testid="hero-quinn-bottom"]')).toHaveClass(/selected/);
        
        // Verify selected heroes list appears
        await expect(page.locator('[data-testid="selected-heroes-list"]')).toBeVisible();
        
        // Verify the "Select Powers" button is visible for Quinn and shows powers are selected
        await expect(page.locator('[data-testid="select-powers-quinn"]')).toBeVisible();
        await expect(page.locator('[data-testid="select-powers-quinn"]')).toContainText('Powers Selected');
        
        // Verify start button is now enabled (powers auto-selected)
        await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled();
        
        // Verify Redux store has auto-selected powers
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.heroes.powerCardSelections.quinn).toBeDefined();
        expect(storeState.heroes.powerCardSelections.quinn.utility).not.toBeNull();
        expect(storeState.heroes.powerCardSelections.quinn.atWills).toHaveLength(2);
        expect(storeState.heroes.powerCardSelections.quinn.daily).not.toBeNull();
      }
    });

    // STEP 3: Open power card selection modal for Quinn (to customize auto-selected powers)
    await page.locator('[data-testid="select-powers-quinn"]').click();
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'power-card-modal', {
      programmaticCheck: async () => {
        // Verify modal is visible
        await expect(page.locator('[data-testid="power-card-selection"]')).toBeVisible();
        
        // Verify custom ability card is displayed (Healing Hymn for Quinn)
        await expect(page.locator('[data-testid="custom-ability-card"]')).toBeVisible();
        
        // Verify utility cards section exists
        await expect(page.locator('[data-testid="utility-cards"]')).toBeVisible();
        
        // Verify at-will cards section exists
        await expect(page.locator('[data-testid="atwill-cards"]')).toBeVisible();
        
        // Verify daily cards section exists
        await expect(page.locator('[data-testid="daily-cards"]')).toBeVisible();
        
        // Verify selection status shows complete (auto-selected)
        await expect(page.locator('[data-testid="selection-status"]')).toContainText('Selection Complete');
        
        // Verify done button is enabled
        await expect(page.locator('[data-testid="done-power-selection"]')).toBeEnabled();
      }
    });

    // STEP 4: Powers are already auto-selected, verify they are shown as complete
    await screenshots.capture(page, 'auto-selected-powers', {
      programmaticCheck: async () => {
        // Verify selection status shows complete
        await expect(page.locator('[data-testid="selection-status"]')).toContainText('Selection Complete');
        
        // Verify done button is enabled
        await expect(page.locator('[data-testid="done-power-selection"]')).toBeEnabled();
        
        // Verify at least one utility, two at-wills, and one daily are selected
        await expect(page.locator('[data-testid^="utility-card-"].selected')).toHaveCount(1);
        await expect(page.locator('[data-testid^="atwill-card-"].selected')).toHaveCount(2);
        await expect(page.locator('[data-testid^="daily-card-"].selected')).toHaveCount(1);
      }
    });

    // STEP 5: Close the modal by clicking Done
    await page.locator('[data-testid="done-power-selection"]').click();
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'hidden' });

    await screenshots.capture(page, 'modal-closed', {
      programmaticCheck: async () => {
        // Verify modal is closed
        await expect(page.locator('[data-testid="power-card-selection"]')).not.toBeVisible();
        
        // Verify the power status shows complete for Quinn
        await expect(page.locator('[data-testid="select-powers-quinn"]')).toContainText('Powers Selected');
        
        // Verify start button is enabled (powers auto-selected)
        await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled();
        
        // Verify Redux store state has auto-selected powers
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.heroes.selectedHeroes).toHaveLength(1);
        expect(storeState.heroes.powerCardSelections.quinn).toBeDefined();
        expect(storeState.heroes.powerCardSelections.quinn.utility).not.toBeNull();
        expect(storeState.heroes.powerCardSelections.quinn.atWills).toHaveLength(2);
        expect(storeState.heroes.powerCardSelections.quinn.daily).not.toBeNull();
      }
    });

    // STEP 6: Start the game
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

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

    await screenshots.capture(page, 'game-started', {
      programmaticCheck: async () => {
        // Verify game board is visible
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
        
        // Verify hero token is visible
        await expect(page.locator('[data-testid="hero-token"]')).toBeVisible();
        
        // Verify Redux store has finalized power cards with auto-selected powers
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.heroes.heroPowerCards.quinn).toBeDefined();
        expect(storeState.heroes.heroPowerCards.quinn.customAbility).toBe(1); // Healing Hymn
        expect(storeState.heroes.heroPowerCards.quinn.utility).not.toBeNull();
        expect(storeState.heroes.heroPowerCards.quinn.atWills).toHaveLength(2);
        expect(storeState.heroes.heroPowerCards.quinn.daily).not.toBeNull();
      }
    });
  });
});
