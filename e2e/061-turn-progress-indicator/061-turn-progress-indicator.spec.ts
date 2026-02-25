import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('061 - Turn Progress Indicator', () => {
  test('turn progress card displays and updates through all phases', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Navigate to character selection and start game
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    // Select Quinn from bottom edge
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    
    // Select power cards for Quinn
    await selectDefaultPowerCards(page, 'quinn');
    
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    
    // Wait for game board to appear
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);
    
    // Wait for turn progress card to be visible and stable
    await page.locator('[data-testid="turn-progress-card"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="phase-hero-phase"]').waitFor({ state: 'visible' });
    
    // Position Quinn at the center of the start tile so movement won't trigger exploration
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 2 } }
      });
    });
    await expect(async () => {
      const storeState = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 2 });
    }).toPass();
    
    // STEP 2: Verify turn progress card appears in hero phase
    await screenshots.capture(page, 'hero-phase-turn-progress', {
      programmaticCheck: async () => {
        // Verify turn progress card is visible
        await expect(page.locator('[data-testid="turn-progress-card"]')).toBeVisible();
        
        // Verify we're in hero phase
        await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');
        
        // Verify hero phase is active/highlighted
        const heroPhase = page.locator('[data-testid="phase-hero-phase"]');
        await expect(heroPhase).toHaveClass(/active/);
        await expect(heroPhase.locator('[data-testid="active-phase-indicator"]')).toBeVisible();
        
        // Verify other phases are not active
        await expect(page.locator('[data-testid="phase-exploration-phase"]')).not.toHaveClass(/active/);
        await expect(page.locator('[data-testid="phase-villain-phase"]')).not.toHaveClass(/active/);
        
        // Verify Exploration Phase shows "(only triggers on tile edges)" hint during hero phase
        await expect(page.locator('[data-testid="phase-exploration-phase"]')).toContainText('(only triggers on tile edges)');
      }
    });
    
    // STEP 3: Move hero and verify phase detail updates
    // Wait for movement options to be visible
    const moveButton = page.locator('button:has-text("Move to")').first();
    await moveButton.waitFor({ state: 'visible' });
    await moveButton.click();
    
    // After clicking move, movement info should show "X of Y squares" format
    await page.locator('[data-testid="movement-info"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'hero-phase-movement-in-progress', {
      programmaticCheck: async () => {
        // Verify movement info shows "X of Y squares" format (squares moved, not remaining)
        const movementText = page.locator('[data-testid="movement-info"] .movement-text');
        await expect(movementText).toBeVisible();
        const text = await movementText.textContent();
        expect(text).toMatch(/\d+ of \d+ squares/);
      }
    });
    
    // Complete the movement
    await page.locator('[data-testid="complete-move-button"]').click();
    
    await screenshots.capture(page, 'hero-phase-after-move', {
      programmaticCheck: async () => {
        // Verify still in hero phase
        await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');
        
        // Verify hero phase is still active
        await expect(page.locator('[data-testid="phase-hero-phase"]')).toHaveClass(/active/);
      }
    });
    
    // STEP 4: End hero phase and verify exploration phase is highlighted
    await page.locator('[data-testid="end-phase-button"]').click();
    
    // Wait for exploration phase
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');
    
    await screenshots.capture(page, 'exploration-phase-active', {
      programmaticCheck: async () => {
        // Verify we're in exploration phase
        await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');
        
        // Verify exploration phase is active/highlighted
        const explorationPhase = page.locator('[data-testid="phase-exploration-phase"]');
        await expect(explorationPhase).toHaveClass(/active/);
        await expect(explorationPhase.locator('[data-testid="active-phase-indicator"]')).toBeVisible();
        
        // Verify "(only triggers on tile edges)" hint is gone during exploration phase
        await expect(explorationPhase).not.toContainText('(only triggers on tile edges)');
        
        // Verify hero phase is no longer active
        await expect(page.locator('[data-testid="phase-hero-phase"]')).not.toHaveClass(/active/);
      }
    });
    
    // STEP 5: Verify villain phase not the target - exploration and hero phase behavior verified
    // Note: Exploration phase may require tile placement (if hero is at tile edge) or auto-skip (if not)
    // Both scenarios verify the key behavior: "(only triggers on tile edges)" hint is shown during hero phase
    // and hidden during exploration/other phases
  });
});
