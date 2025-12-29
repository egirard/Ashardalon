import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction } from '../helpers/screenshot-helper';

test.describe('061 - Turn Progress Indicator', () => {
  test('turn progress card displays and updates through all phases', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Navigate to character selection and start game
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    // Select Quinn from bottom edge
    await page.locator('[data-testid="hero-quinn"]').click();
    
    // Select power cards for Quinn
    await selectDefaultPowerCards(page, 'quinn');
    
    await page.locator('[data-testid="start-game-button"]').click();
    
    // Wait for game board to appear
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);
    
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
        
        // Verify phase detail shows "Ready to act"
        await expect(page.locator('[data-testid="phase-detail-hero-phase"]')).toContainText('Ready to act');
        
        // Verify other phases are not active
        await expect(page.locator('[data-testid="phase-exploration-phase"]')).not.toHaveClass(/active/);
        await expect(page.locator('[data-testid="phase-villain-phase"]')).not.toHaveClass(/active/);
        
        // Verify turn number is displayed
        const turnProgressCard = page.locator('[data-testid="turn-progress-card"]');
        await expect(turnProgressCard).toContainText('Turn 1');
      }
    });
    
    // STEP 3: Move hero and verify phase detail updates
    // Wait for movement options to be visible
    const moveButton = page.locator('button:has-text("Move to")').first();
    await moveButton.waitFor({ state: 'visible' });
    await moveButton.click();
    
    // Complete the movement
    await page.locator('[data-testid="complete-move-button"]').click();
    
    await screenshots.capture(page, 'hero-phase-after-move', {
      programmaticCheck: async () => {
        // Verify still in hero phase
        await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');
        
        // Verify hero phase is still active
        await expect(page.locator('[data-testid="phase-hero-phase"]')).toHaveClass(/active/);
        
        // Verify phase detail now shows "Moved"
        await expect(page.locator('[data-testid="phase-detail-hero-phase"]')).toContainText('Moved');
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
        
        // Verify phase detail shows exploration message
        await expect(page.locator('[data-testid="phase-detail-exploration-phase"]')).toContainText('Check for unexplored edges');
        
        // Verify hero phase is no longer active
        await expect(page.locator('[data-testid="phase-hero-phase"]')).not.toHaveClass(/active/);
      }
    });
    
    // STEP 5: End exploration phase and verify villain phase is highlighted
    await page.locator('[data-testid="end-phase-button"]').click();
    
    // Wait for villain phase
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Villain Phase');
    
    await screenshots.capture(page, 'villain-phase-active', {
      programmaticCheck: async () => {
        // Verify we're in villain phase
        await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Villain Phase');
        
        // Verify villain phase is active/highlighted
        const villainPhase = page.locator('[data-testid="phase-villain-phase"]');
        await expect(villainPhase).toHaveClass(/active/);
        await expect(villainPhase.locator('[data-testid="active-phase-indicator"]')).toBeVisible();
        
        // Check if monsters were spawned and verify phase detail if present
        const phaseDetail = page.locator('[data-testid="phase-detail-villain-phase"]');
        const isDetailVisible = await phaseDetail.isVisible();
        if (isDetailVisible) {
          // If detail is visible, it should show monster count
          await expect(phaseDetail).toContainText('monsters');
        }
        
        // Verify exploration phase is no longer active
        await expect(page.locator('[data-testid="phase-exploration-phase"]')).not.toHaveClass(/active/);
        
        // Verify turn progress card shows all three phases
        const turnProgressCard = page.locator('[data-testid="turn-progress-card"]');
        await expect(turnProgressCard).toContainText('Hero Phase');
        await expect(turnProgressCard).toContainText('Exploration');
        await expect(turnProgressCard).toContainText('Villain Phase');
      }
    });
  });
});
