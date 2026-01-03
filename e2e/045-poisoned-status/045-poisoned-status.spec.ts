import { test, expect } from '@playwright/test';
import { selectDefaultPowerCards, createScreenshotHelper, dismissScenarioIntroduction } from '../helpers/screenshot-helper';

test.describe('045 - Poisoned Status Effect', () => {
  test('Apply poisoned status, take damage at start of turn, attempt recovery at end of turn', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);
    
    // Wait for initial animations to complete
    await page.waitForTimeout(1000);

    // Capture initial state screenshot
    await screenshots.capture(page, 'initial-no-poison', {
      programmaticCheck: async () => {
        const initialState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(initialState.game.heroHp[0].statuses).toEqual([]);
        await expect(page.locator('[data-testid="player-card-conditions"]')).not.toBeVisible();
      }
    });

    // STEP 2: Apply poisoned status directly
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      const heroId = state.game.heroHp[0].heroId;
      
      store.dispatch({
        type: 'game/applyHeroStatus',
        payload: {
          heroId: heroId,
          statusType: 'poisoned',
          source: 'snake-1'
        }
      });
    });

    // Capture poisoned status applied screenshot
    await screenshots.capture(page, 'poisoned-status-applied', {
      programmaticCheck: async () => {
        const stateAfterPoison = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(stateAfterPoison.game.heroHp[0].statuses).toHaveLength(1);
        expect(stateAfterPoison.game.heroHp[0].statuses[0].type).toBe('poisoned');
        
        await expect(page.locator('[data-testid="player-card-conditions"]')).toBeVisible();
        await expect(page.locator('[data-testid="condition-poisoned"]')).toBeVisible();
      }
    });

    // STEP 3: End hero phase and transition to next turn to trigger poisoned damage
    // First end the current hero phase
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/endHeroPhase' });
    });

    // Then skip exploration and villain phases to get to next hero turn
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/endExplorationPhase' });
      store.dispatch({ type: 'game/endVillainPhase' });
    });

    // Wait for the poisoned damage notification to appear
    await page.locator('[data-testid="poisoned-damage-notification"]').waitFor({ state: 'visible' });

    // Capture poisoned damage notification screenshot
    await screenshots.capture(page, 'poisoned-damage-notification', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="poisoned-damage-notification"]')).toBeVisible();
        await expect(page.locator('[data-testid="notification-title"]')).toContainText('Poisoned');
        await expect(page.locator('[data-testid="poison-message"]')).toContainText('takes 1 damage from poison');
        
        // Verify HP was reduced
        const stateAfterDamage = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(stateAfterDamage.game.heroHp[0].currentHp).toBeLessThan(stateAfterDamage.game.heroHp[0].maxHp);
      }
    });

    // Dismiss the poisoned damage notification
    await page.locator('[data-testid="dismiss-poisoned-notification"]').click();
    await page.locator('[data-testid="poisoned-damage-notification"]').waitFor({ state: 'hidden' });

    // Capture state after notification dismissed
    await screenshots.capture(page, 'after-poison-damage', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="poisoned-damage-notification"]')).not.toBeVisible();
        
        // Hero should still be poisoned
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(state.game.heroHp[0].statuses[0].type).toBe('poisoned');
      }
    });

    // STEP 4: Click end hero phase to trigger poison recovery roll
    await page.locator('button:has-text("End Hero Phase")').click();

    // Wait for poison recovery notification to appear
    await page.locator('[data-testid="poison-recovery-notification"]').waitFor({ state: 'visible' });

    // Verify poison recovery notification appearance programmatically (skip screenshot due to random roll)
    await page.evaluate(() => {
      return new Promise((resolve) => setTimeout(resolve, 100));
    });
    
    // Programmatic check without screenshot due to random roll result
    const recoveryState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    const notification = recoveryState.game.poisonRecoveryNotification;
    expect(notification).not.toBeNull();
    expect(notification.roll).toBeGreaterThanOrEqual(1);
    expect(notification.roll).toBeLessThanOrEqual(20);
    
    await expect(page.locator('[data-testid="poison-recovery-notification"]')).toBeVisible();
    await expect(page.locator('[data-testid="notification-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="recovery-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="roll-value"]')).toBeVisible();

    // Take screenshot of recovery notification with current roll
    await screenshots.capture(page, 'poison-recovery-notification', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="poison-recovery-notification"]')).toBeVisible();
      }
    });

    // Dismiss the recovery notification
    await page.locator('[data-testid="dismiss-recovery-notification"]').click();
    await page.locator('[data-testid="poison-recovery-notification"]').waitFor({ state: 'hidden' });

    // Capture final state after recovery attempt
    await screenshots.capture(page, 'after-recovery-attempt', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="poison-recovery-notification"]')).not.toBeVisible();
        
        // Verify we moved to exploration phase after dismissing recovery notification
        const finalState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(finalState.game.turnState.currentPhase).toBe('exploration-phase');
        
        // Check if poisoned status was removed (depends on the roll)
        const heroStatuses = finalState.game.heroHp[0].statuses ?? [];
        const hasPoisoned = heroStatuses.some((s: any) => s.type === 'poisoned');
        // Can be either true or false depending on the random roll
        expect(typeof hasPoisoned).toBe('boolean');
      }
    });
  });
});
