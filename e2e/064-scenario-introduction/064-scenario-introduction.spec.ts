import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards } from '../helpers/screenshot-helper';

test.describe('064 - Scenario Introduction Modal', () => {
  test('scenario introduction is shown when map loads and can be rotated and dismissed', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection screen
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    // STEP 2: Select hero Quinn
    await page.locator('[data-testid="hero-quinn"]').click();
    await selectDefaultPowerCards(page, 'quinn');

    // STEP 3: Start the game
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Wait for scenario introduction to appear
    await page.locator('[data-testid="scenario-introduction-overlay"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'scenario-introduction-shown', {
      programmaticCheck: async () => {
        // Verify the scenario introduction modal is visible
        await expect(page.locator('[data-testid="scenario-introduction-overlay"]')).toBeVisible();
        await expect(page.locator('[data-testid="scenario-introduction-modal"]')).toBeVisible();
        
        // Verify scenario content is displayed
        await expect(page.locator('[data-testid="scenario-title"]')).toBeVisible();
        await expect(page.locator('[data-testid="scenario-title"]')).toContainText('Into the Mountain');
        
        await expect(page.locator('[data-testid="scenario-description"]')).toBeVisible();
        await expect(page.locator('[data-testid="scenario-description"]')).toContainText('Ashardalon');
        
        await expect(page.locator('[data-testid="scenario-objective"]')).toBeVisible();
        await expect(page.locator('[data-testid="scenario-objective"]')).toContainText('Defeat 12 monsters');
        
        await expect(page.locator('[data-testid="scenario-instructions"]')).toBeVisible();
        await expect(page.locator('[data-testid="scenario-instructions"]')).toContainText('Work together');
        
        // Verify dismiss button is visible
        await expect(page.locator('[data-testid="start-scenario-button"]')).toBeVisible();
        await expect(page.locator('[data-testid="start-scenario-button"]')).toContainText('Begin Adventure');
        
        // Verify rotation controls are visible
        await expect(page.locator('[data-testid="rotation-controls"]')).toBeVisible();
        await expect(page.locator('[data-testid="rotate-to-top"]')).toBeVisible();
        await expect(page.locator('[data-testid="rotate-to-bottom"]')).toBeVisible();
        await expect(page.locator('[data-testid="rotate-to-left"]')).toBeVisible();
        await expect(page.locator('[data-testid="rotate-to-right"]')).toBeVisible();
        
        // Verify bottom is active by default (rotation 0)
        await expect(page.locator('[data-testid="rotate-to-bottom"]')).toHaveClass(/active/);

        // Verify Redux store state - introduction not yet shown
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.scenario.introductionShown).toBe(false);
        expect(storeState.game.scenario.title).toBe('Into the Mountain');
        expect(storeState.game.scenario.objective).toBe('Defeat 12 monsters');
      }
    });

    // STEP 4: Test rotation - rotate to top (180 degrees)
    await page.locator('[data-testid="rotate-to-top"]').click();
    
    // Wait for rotation animation to complete
    await page.waitForTimeout(350);

    await screenshots.capture(page, 'scenario-rotated-to-top', {
      programmaticCheck: async () => {
        // Verify the modal is rotated
        const transform = await page.locator('[data-testid="scenario-introduction-modal"]').evaluate(el => 
          window.getComputedStyle(el).transform
        );
        // Rotation 180 degrees should result in a specific transform matrix
        expect(transform).not.toBe('none');
        
        // Verify top arrow is now active
        await expect(page.locator('[data-testid="rotate-to-top"]')).toHaveClass(/active/);
        await expect(page.locator('[data-testid="rotate-to-bottom"]')).not.toHaveClass(/active/);
      }
    });

    // STEP 5: Test rotation - rotate to left (90 degrees)
    await page.locator('[data-testid="rotate-to-left"]').click();
    
    // Wait for rotation animation to complete
    await page.waitForTimeout(350);

    await screenshots.capture(page, 'scenario-rotated-to-left', {
      programmaticCheck: async () => {
        // Verify left arrow is now active
        await expect(page.locator('[data-testid="rotate-to-left"]')).toHaveClass(/active/);
        await expect(page.locator('[data-testid="rotate-to-top"]')).not.toHaveClass(/active/);
      }
    });

    // STEP 6: Rotate back to bottom
    await page.locator('[data-testid="rotate-to-bottom"]').click();
    
    // Wait for rotation animation to complete
    await page.waitForTimeout(350);

    await screenshots.capture(page, 'scenario-rotated-back-to-bottom', {
      programmaticCheck: async () => {
        // Verify bottom arrow is now active again
        await expect(page.locator('[data-testid="rotate-to-bottom"]')).toHaveClass(/active/);
        await expect(page.locator('[data-testid="rotate-to-left"]')).not.toHaveClass(/active/);
      }
    });

    // STEP 7: Dismiss the scenario introduction by clicking the button
    await page.locator('[data-testid="start-scenario-button"]').click();
    await page.locator('[data-testid="scenario-introduction-overlay"]').waitFor({ state: 'hidden' });

    // Verify modal dismissed (programmatic check only, no screenshot due to randomness in game board)
    await expect(page.locator('[data-testid="scenario-introduction-overlay"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
    await expect(page.locator('[data-testid="start-tile"]')).toBeVisible();

    const storeState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(storeState.game.scenario.introductionShown).toBe(true);
    expect(storeState.game.turnState.currentPhase).toBe('hero-phase');
    expect(storeState.game.turnState.turnNumber).toBe(1);
  });

  test('scenario introduction can be dismissed with keyboard', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // Navigate through character selection and start game
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-vistra"]').click();
    await selectDefaultPowerCards(page, 'vistra');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="scenario-introduction-overlay"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'keyboard-dismiss-ready', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="scenario-introduction-overlay"]')).toBeVisible();
      }
    });

    // Dismiss with Enter key
    await page.keyboard.press('Enter');
    await page.locator('[data-testid="scenario-introduction-overlay"]').waitFor({ state: 'hidden' });

    // Verify modal dismissed (programmatic check only)
    await expect(page.locator('[data-testid="scenario-introduction-overlay"]')).not.toBeVisible();
    
    const storeState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(storeState.game.scenario.introductionShown).toBe(true);
  });
});
