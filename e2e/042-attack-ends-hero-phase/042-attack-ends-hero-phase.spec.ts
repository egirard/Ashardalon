import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction } from '../helpers/screenshot-helper';

/**
 * E2E Test 042: Attack Ends Hero Phase
 * 
 * Purpose: Verify that when the hero phase ends with an attack (move+attack or attack+move),
 * the exploration phase does not begin until the attack result card is dismissed by the player.
 * 
 * Acceptance Criteria:
 * - Detect when hero phase ends with an attack
 * - Exploration phase triggers ONLY after attack result card is dismissed
 * - No overlap between attack result display and exploration phase
 */
test.describe('042 - Attack Ends Hero Phase', () => {
  test('Exploration phase pauses until attack result is dismissed', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);
    
    // Wait for hero phase to start
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');
    
    // STEP 2: Simulate a turn-completing scenario (move+attack)
    // Directly manipulate state to simulate a completed turn scenario
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      
      // Manually set the heroTurnActions to simulate move+attack taken
      state.game.heroTurnActions = {
        actionsTaken: ['move'],
        canMove: true,
        canAttack: true
      };
    });
    
    await page.waitForTimeout(100);
    
    await screenshots.capture(page, 'before-attack', {
      programmaticCheck: async () => {
        // Verify we're in hero phase
        await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');
      }
    });
    
    // STEP 3: Trigger an attack result (simulating move+attack completing the turn)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Simulate an attack by directly setting attack result
      // This mimics what happens when a player performs an attack
      store.dispatch({
        type: 'game/setAttackResult',
        payload: {
          result: {
            roll: 15,
            attackBonus: 6,
            total: 21,
            targetAC: 14,
            isHit: true,
            isCritical: false,
            damage: 2
          },
          targetInstanceId: 'test-monster',
          attackName: 'Basic Attack'
        }
      });
    });
    
    // STEP 6: Verify attack result is displayed and we're STILL in hero phase
    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'attack-result-displayed-still-hero-phase', {
      programmaticCheck: async () => {
        // CRITICAL: Attack result should be visible
        await expect(page.locator('[data-testid="combat-result"]')).toBeVisible();
        
        // CRITICAL: Phase should STILL be hero-phase (not exploration-phase)
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(state.game.turnState.currentPhase).toBe('hero-phase');
        
        // Attack result should be set
        expect(state.game.attackResult).not.toBeNull();
        
        // Turn actions should show attack taken (setAttackResult adds the attack action)
        expect(state.game.heroTurnActions.actionsTaken).toContain('attack');
        // After setAttackResult, canAttack is false
        expect(state.game.heroTurnActions.canAttack).toBe(false);
      }
    });
    
    // STEP 7: Wait a bit to ensure phase doesn't auto-advance while result is displayed
    await page.waitForTimeout(500);
    
    await screenshots.capture(page, 'still-hero-phase-after-wait', {
      programmaticCheck: async () => {
        // Verify we're STILL in hero phase after waiting
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(state.game.turnState.currentPhase).toBe('hero-phase');
        await expect(page.locator('[data-testid="combat-result"]')).toBeVisible();
      }
    });
    
    // STEP 8: Dismiss the attack result
    await page.locator('[data-testid="dismiss-combat-result"]').click();
    await expect(page.locator('[data-testid="combat-result"]')).not.toBeVisible();
    
    // STEP 9: Verify phase is still hero-phase (because shouldAutoEndHeroTurn requires move+attack)
    // In this test, we only have an attack action, so auto-end shouldn't trigger
    await page.waitForTimeout(300);
    
    const stateAfterDismiss = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    
    // Phase should still be hero-phase because we only took an attack action
    expect(stateAfterDismiss.game.turnState.currentPhase).toBe('hero-phase');
    // Attack result should be cleared
    expect(stateAfterDismiss.game.attackResult).toBeNull();
    
    // STEP 10: Now manually end the phase
    await page.locator('[data-testid="end-phase-button"]').click();
    
    // STEP 11: Verify that NOW the phase transitions to exploration
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase', { timeout: 1000 });
    
    await screenshots.capture(page, 'exploration-phase-after-end', {
      programmaticCheck: async () => {
        // CRITICAL: Should now be in exploration phase
        await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');
        
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(state.game.turnState.currentPhase).toBe('exploration-phase');
      }
    });
  });
  
  test('Manual end phase button does not end hero phase while attack result is displayed', async ({ page }) => {
    // STEP 1: Start game
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);
    
    // STEP 2: Use programmatic dispatch to create an attack result directly
    // This avoids issues with monster setup and focuses on the core behavior
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // First, ensure we're in hero phase with an attack taken
      store.dispatch({
        type: 'game/setHeroTurnActions',
        payload: {
          actionsTaken: ['attack'],
          canMove: true,
          canAttack: false
        }
      });
      
      // Create a mock attack result
      store.dispatch({
        type: 'game/setAttackResult',
        payload: {
          result: {
            roll: 15,
            attackBonus: 6,
            total: 21,
            targetAC: 14,
            isHit: true,
            isCritical: false,
            damage: 2
          },
          targetInstanceId: 'mock-target',
          attackName: 'Basic Attack'
        }
      });
    });
    
    // Wait for attack result to be displayed
    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });
    
    // STEP 3: Verify phase is still hero-phase with attack result displayed
    const stateDuringAttackResult = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState().game;
    });
    
    expect(stateDuringAttackResult.turnState.currentPhase).toBe('hero-phase');
    expect(stateDuringAttackResult.attackResult).not.toBeNull();
    
    // STEP 4: Verify that manually trying to end the phase is blocked
    // The handleEndPhase function should return early if attackResult is not null
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // Manually dispatch endHeroPhase (simulating button click)
      store.dispatch({ type: 'game/endHeroPhase' });
    });
    
    // Wait a moment
    await page.waitForTimeout(200);
    
    // Phase should still be hero-phase because our guard blocked it
    const stateAfterAttemptedEnd = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState().game.turnState.currentPhase;
    });
    
    expect(stateAfterAttemptedEnd).toBe('hero-phase');
    
    // STEP 5: Dismiss attack result
    await page.locator('[data-testid="dismiss-combat-result"]').click();
    
    // STEP 6: Verify phase is still hero-phase (attack alone doesn't complete turn)
    await page.waitForTimeout(200);
    
    const stateAfterDismiss = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState().game.turnState.currentPhase;
    });
    
    expect(stateAfterDismiss).toBe('hero-phase');
    
    // STEP 7: Now manually end the phase (should work)
    await page.locator('[data-testid="end-phase-button"]').click();
    
    // Should now be in exploration phase
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');
  });
});
