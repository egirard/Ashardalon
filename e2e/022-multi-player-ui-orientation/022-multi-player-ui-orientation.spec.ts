import { test, expect } from '@playwright/test';
import { createScreenshotHelper, dismissScenarioIntroduction } from '../helpers/screenshot-helper';

test.describe('022 - Multi-Player UI Orientation', () => {
  test('players from different edges see their dashboards at their edges', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    // STEP 2: Select Quinn from bottom edge (standard orientation)
    await page.locator('[data-testid="hero-quinn"]').click();
    
    // Open power card selection for Quinn and take screenshot
    await page.locator('[data-testid="select-powers-quinn"]').click();
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'power-selection-quinn-bottom', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="power-card-selection"]')).toBeVisible();
        await expect(page.locator('.modal-header h2')).toContainText('Quinn');
        // Verify done button is enabled (shows completion via button state)
        await expect(page.locator('[data-testid="done-power-selection"]')).toBeEnabled();
        // Verify mini-cards are displayed in column layout
        await expect(page.locator('.mini-cards-columns')).toBeVisible();
      }
    });
    
    // Accept pre-selected power cards
    // Note: Power cards are pre-selected by default (utility + 2 at-wills + daily).
    // Manual selection would trigger toggle behavior, deselecting pre-selected cards.
    // Use evaluate to click since rotated elements may be outside viewport bounds
    await page.evaluate(() => {
      const button = document.querySelector('[data-testid="done-power-selection"]') as HTMLButtonElement;
      if (button) button.click();
    });
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'hidden' });

    // STEP 3: Select Vistra from top edge (180° rotation)
    await page.locator('[data-testid="hero-vistra-top"]').click();
    
    // Open power card selection for Vistra and take screenshot
    await page.locator('[data-testid="select-powers-vistra"]').click();
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'power-selection-vistra-top', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="power-card-selection"]')).toBeVisible();
        await expect(page.locator('.modal-header h2')).toContainText('Vistra');
        // Verify done button is enabled (shows completion via button state)
        await expect(page.locator('[data-testid="done-power-selection"]')).toBeEnabled();
        // Verify mini-cards are displayed in column layout
        await expect(page.locator('.mini-cards-columns')).toBeVisible();
      }
    });
    
    // Accept pre-selected power cards (same approach for all heroes)
    // Use evaluate to click since rotated elements may be outside viewport bounds
    await page.evaluate(() => {
      const button = document.querySelector('[data-testid="done-power-selection"]') as HTMLButtonElement;
      if (button) button.click();
    });
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'hidden' });

    // STEP 4: Select Keyleth from left edge (90° rotation)
    await page.locator('[data-testid="hero-keyleth-left"]').click();
    
    // Open power card selection for Keyleth and take screenshot
    await page.locator('[data-testid="select-powers-keyleth"]').click();
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'power-selection-keyleth-left', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="power-card-selection"]')).toBeVisible();
        await expect(page.locator('.modal-header h2')).toContainText('Keyleth');
        // Verify done button is enabled (shows completion via button state)
        await expect(page.locator('[data-testid="done-power-selection"]')).toBeEnabled();
        // Verify mini-cards are displayed in column layout
        await expect(page.locator('.mini-cards-columns')).toBeVisible();
      }
    });
    
    // Accept pre-selected power cards (same approach for all heroes)
    // Use evaluate to click since rotated elements may be outside viewport bounds
    await page.evaluate(() => {
      const button = document.querySelector('[data-testid="done-power-selection"]') as HTMLButtonElement;
      if (button) button.click();
    });
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'hidden' });

    await screenshots.capture(page, 'character-selection-complete', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="selected-count"]')).toContainText('3 heroes selected');
        await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled();
        
        // Verify heroes are selected from different edges
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.heroes.heroEdgeMap['quinn']).toBe('bottom');
        expect(storeState.heroes.heroEdgeMap['vistra']).toBe('top');
        expect(storeState.heroes.heroEdgeMap['keyleth']).toBe('left');
      }
    });

    // STEP 5: Start the game
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Set deterministic positions for reproducible screenshots
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 3 } }
      });
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'vistra', position: { x: 2, y: 4 } }
      });
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'keyleth', position: { x: 3, y: 4 } }
      });
    });

    // Wait for position changes to be applied
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens.find((t: any) => t.heroId === 'quinn')?.position).toEqual({ x: 2, y: 3 });
    }).toPass();

    // Hide the movement overlay for a stable screenshot
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/hideMovement' });
    });

    // Wait for movement overlay to be hidden
    await page.waitForFunction(() => {
      const buttons = document.querySelectorAll('[data-testid^="move-to-"]');
      return buttons.length === 0;
    });

    await screenshots.capture(page, 'game-board-quinn-turn-bottom', {
      programmaticCheck: async () => {
        // Verify Quinn is active (bottom edge) - should show turn indicator
        await expect(page.locator('[data-testid="player-panel-bottom"] [data-testid="turn-indicator"]')).toBeVisible();
        await expect(page.locator('[data-testid="turn-indicator"]')).toContainText("Quinn's Turn");
        await expect(page.locator('[data-testid="player-panel-bottom"]')).toContainText('Hero Phase');
        await expect(page.locator('[data-testid="player-panel-bottom"]')).toContainText('HP: 8/8');
        
        // Vistra (top edge) - should show dashboard with name and HP (not active)
        await expect(page.locator('[data-testid="player-panel-top"]')).toContainText('Vistra');
        await expect(page.locator('[data-testid="player-panel-top"]')).toContainText('HP: 10/10');
        
        // Keyleth (left edge) - should show dashboard with name and HP (not active)
        await expect(page.locator('[data-testid="player-panel-left"]')).toContainText('Keyleth');
        await expect(page.locator('[data-testid="player-panel-left"]')).toContainText('HP: 10/10');
      }
    });

    // STEP 6: Advance to Vistra's turn to show 180° rotated turn indicator at top
    // End Quinn's hero phase
    await page.locator('[data-testid="end-phase-button"]').click();
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');
    
    // End exploration phase  
    await page.locator('[data-testid="end-phase-button"]').click();
    
    // Wait for villain phase
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Villain Phase');
    
    // Dismiss encounter card overlay if shown
    await page.waitForTimeout(500);
    const encounterOverlay = page.locator('[data-testid="encounter-card-overlay"]');
    try {
      if (await encounterOverlay.isVisible({ timeout: 2000 })) {
        // Click dismiss button on the encounter card
        const dismissButton = page.locator('[data-testid="dismiss-encounter-card"]');
        if (await dismissButton.isVisible({ timeout: 1000 })) {
          await dismissButton.click();
          await encounterOverlay.waitFor({ state: 'hidden', timeout: 5000 });
        }
      }
    } catch {
      // Encounter card not visible, continue
    }
    
    // End villain phase to advance to next player
    await page.locator('[data-testid="end-phase-button"]').click();
    
    // Wait for Vistra's turn (player at top edge)
    await expect(async () => {
      const turnIndicator = page.locator('[data-testid="turn-indicator"]');
      await expect(turnIndicator).toContainText("Vistra's Turn");
    }).toPass({ timeout: 10000 });

    // Hide movement overlay for stable screenshot
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/hideMovement' });
    });
    await page.waitForFunction(() => {
      const buttons = document.querySelectorAll('[data-testid^="move-to-"]');
      return buttons.length === 0;
    });

    await screenshots.capture(page, 'game-board-vistra-turn-top-rotated', {
      programmaticCheck: async () => {
        // Vistra is now active (top edge) - turn indicator should be at top, rotated 180°
        await expect(page.locator('[data-testid="player-panel-top"] [data-testid="turn-indicator"]')).toBeVisible();
        await expect(page.locator('[data-testid="turn-indicator"]')).toContainText("Vistra's Turn");
        
        // Quinn (bottom edge) - should now show inactive dashboard
        await expect(page.locator('[data-testid="player-panel-bottom"]')).toContainText('Quinn');
        
        // Keyleth (left edge) - still inactive
        await expect(page.locator('[data-testid="player-panel-left"]')).toContainText('Keyleth');
      }
    });

    // STEP 7: Advance to Keyleth's turn to show 90° rotated turn indicator at left
    // End current phase (might be hero phase or exploration)
    await page.locator('[data-testid="end-phase-button"]').click();
    
    // Keep clicking end phase until we see villain phase
    const turnPhaseLocator = page.locator('[data-testid="turn-phase"]');
    let currentPhase = await turnPhaseLocator.textContent();
    while (currentPhase && !currentPhase.includes('Villain Phase')) {
      await page.locator('[data-testid="end-phase-button"]').click();
      await page.waitForTimeout(200);
      currentPhase = await turnPhaseLocator.textContent();
    }
    
    // Wait for villain phase
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Villain Phase');
    
    // Dismiss encounter card overlay if shown
    await page.waitForTimeout(500);
    const encounterOverlay2 = page.locator('[data-testid="encounter-card-overlay"]');
    try {
      if (await encounterOverlay2.isVisible({ timeout: 2000 })) {
        const dismissButton = page.locator('[data-testid="dismiss-encounter-card"]');
        if (await dismissButton.isVisible({ timeout: 1000 })) {
          await dismissButton.click();
          await encounterOverlay2.waitFor({ state: 'hidden', timeout: 5000 });
        }
      }
    } catch {
      // Encounter card not visible, continue
    }
    
    // End villain phase to advance to next player
    await page.locator('[data-testid="end-phase-button"]').click();
    
    // Wait for Keyleth's turn (player at left edge)
    await expect(async () => {
      const turnIndicator = page.locator('[data-testid="turn-indicator"]');
      await expect(turnIndicator).toContainText("Keyleth's Turn");
    }).toPass({ timeout: 10000 });

    // Hide movement overlay for stable screenshot
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/hideMovement' });
    });
    await page.waitForFunction(() => {
      const buttons = document.querySelectorAll('[data-testid^="move-to-"]');
      return buttons.length === 0;
    });

    await screenshots.capture(page, 'game-board-keyleth-turn-left-rotated', {
      programmaticCheck: async () => {
        // Keyleth is now active (left edge) - turn indicator should be at left, rotated 90°
        await expect(page.locator('[data-testid="player-panel-left"] [data-testid="turn-indicator"]')).toBeVisible();
        await expect(page.locator('[data-testid="turn-indicator"]')).toContainText("Keyleth's Turn");
        
        // Quinn (bottom edge) - inactive dashboard
        await expect(page.locator('[data-testid="player-panel-bottom"]')).toContainText('Quinn');
        
        // Vistra (top edge) - now inactive dashboard
        await expect(page.locator('[data-testid="player-panel-top"]')).toContainText('Vistra');
      }
    });
  });
});

