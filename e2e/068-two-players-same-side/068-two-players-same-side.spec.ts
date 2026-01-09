import { test, expect } from '@playwright/test';
import { createScreenshotHelper, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('068 - Two Players on Same Side', () => {
  test('two players can select from the same edge and swap their side preferences', async ({ page }) => {
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

    // STEP 2: Select Quinn from bottom edge
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await page.locator('[data-testid="select-powers-quinn"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'quinn-selected-bottom-no-indicator', {
      programmaticCheck: async () => {
        // Verify Quinn is selected
        await expect(page.locator('[data-testid="hero-quinn-bottom"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="selected-count"]')).toContainText('1 heroes selected');
        
        // Verify no side indicator is shown (only 1 hero on this edge)
        const sideIndicators = await page.locator('[data-testid="side-indicator"]').count();
        expect(sideIndicators).toBe(0);
      }
    });

    // STEP 3: Select Vistra from bottom edge (second hero on same edge)
    await page.locator('[data-testid="hero-vistra-bottom"]').click();
    await page.locator('[data-testid="select-powers-vistra"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'two-heroes-bottom-side-indicators-appear', {
      programmaticCheck: async () => {
        // Verify both heroes are selected
        await expect(page.locator('[data-testid="hero-quinn-bottom"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="hero-vistra-bottom"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="selected-count"]')).toContainText('2 heroes selected');
        
        // Verify side indicators are now shown for both heroes
        const sideIndicators = await page.locator('[data-testid="side-indicator"]').count();
        expect(sideIndicators).toBe(2);
        
        // Verify side preference squares are visible
        const leftSquares = await page.locator('[data-testid="side-square-left"]').count();
        const rightSquares = await page.locator('[data-testid="side-square-right"]').count();
        expect(leftSquares).toBe(2);
        expect(rightSquares).toBe(2);
        
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

    // STEP 4: Click the swap button to swap sides
    await page.locator('[data-testid="side-square-right"]').first().click();

    await screenshots.capture(page, 'sides-swapped', {
      programmaticCheck: async () => {
        // Verify sides are swapped in Redux store
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        expect(storeState.heroes.heroSidePreferences['quinn']).toBe('right');
        expect(storeState.heroes.heroSidePreferences['vistra']).toBe('left');
      }
    });

    // STEP 5: Start the game
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    
    // Wait for scenario introduction and dismiss it
    await dismissScenarioIntroduction(page);

    await screenshots.capture(page, 'game-board-side-by-side', {
      fullPage: true,
      programmaticCheck: async () => {
        // Verify both player panels are visible
        const playerPanels = await page.locator('[data-testid^="player-panel-bottom"]').count();
        expect(playerPanels).toBe(2);
        
        // Verify they have different side preferences applied
        const quinnPanel = page.locator('[data-testid="player-panel-bottom"][data-hero-id="quinn"]');
        const vistraPanel = page.locator('[data-testid="player-panel-bottom"][data-hero-id="vistra"]');
        
        await expect(quinnPanel).toBeVisible();
        await expect(vistraPanel).toBeVisible();
        
        // Verify side preference data attributes
        const quinnSide = await quinnPanel.getAttribute('data-side-preference');
        const vistraSide = await vistraPanel.getAttribute('data-side-preference');
        
        expect(quinnSide).toBe('right');
        expect(vistraSide).toBe('left');
        
        // Verify panels are positioned side-by-side (not overlapping)
        const quinnBox = await quinnPanel.boundingBox();
        const vistraBox = await vistraPanel.boundingBox();
        
        expect(quinnBox).not.toBeNull();
        expect(vistraBox).not.toBeNull();
        
        if (quinnBox && vistraBox) {
          // Quinn (right side) should be further right than Vistra (left side)
          expect(quinnBox.x).toBeGreaterThan(vistraBox.x + vistraBox.width);
        }
      }
    });
  });
});
