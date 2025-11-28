import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from '../helpers/screenshot-helper';

test.describe('012 - MVP Scenario: Defeat Two Monsters', () => {
  test('Objective display shows current progress', async ({ page }) => {
    // STEP 1: Navigate to character selection and select Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // STEP 2: Verify objective display is visible with initial state (no screenshot due to random movement overlay)
    // Verify objective display elements
    await expect(page.locator('[data-testid="objective-display"]')).toBeVisible();
    await expect(page.locator('[data-testid="objective-progress"]')).toContainText('0 / 2 defeated');
    
    // Verify Redux store scenario state
    const storeState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(storeState.game.scenario.monstersDefeated).toBe(0);
    expect(storeState.game.scenario.monstersToDefeat).toBe(2);
    expect(storeState.game.scenario.objective).toBe('Defeat 2 monsters');
  });

  test('Victory screen appears after defeating 2 monsters', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Verify we're in hero phase
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');

    // STEP 2: Simulate defeating 2 monsters by directly setting scenario state and screen
    // This bypasses the combat flow to test the victory screen itself
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      
      // Manually update scenario state to simulate 2 monsters defeated
      // and transition to victory screen
      store.dispatch({
        type: 'game/setMonsters',
        payload: [
          { monsterId: 'kobold', instanceId: 'kobold-0', position: { x: 2, y: 2 }, currentHp: 1, controllerId: 'quinn', tileId: 'start-tile' }
        ]
      });
    });

    // Defeat first monster (in hero phase, can attack)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setAttackResult',
        payload: {
          result: {
            roll: 18,
            attackBonus: 6,
            total: 24,
            targetAC: 14,
            isHit: true,
            damage: 5,
            isCritical: false
          },
          targetInstanceId: 'kobold-0'
        }
      });
    });

    // Verify 1 monster defeated
    let storeState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(storeState.game.scenario.monstersDefeated).toBe(1);
    
    // Dismiss combat result if visible
    const combatResult = page.locator('[data-testid="combat-result"]');
    if (await combatResult.isVisible()) {
      await page.locator('[data-testid="dismiss-combat-result"]').click();
    }

    // Reset hero turn actions for next attack (simulate new turn)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // End the current turn cycle to reset actions
      store.dispatch({ type: 'game/endHeroPhase' });
      store.dispatch({ type: 'game/endExplorationPhase' });
      store.dispatch({ type: 'game/endVillainPhase' });
      
      // Add second monster
      store.dispatch({
        type: 'game/setMonsters',
        payload: [
          { monsterId: 'kobold', instanceId: 'kobold-1', position: { x: 3, y: 2 }, currentHp: 1, controllerId: 'quinn', tileId: 'start-tile' }
        ]
      });
    });

    // Defeat second monster (this should trigger victory)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setAttackResult',
        payload: {
          result: {
            roll: 20,
            attackBonus: 6,
            total: 26,
            targetAC: 14,
            isHit: true,
            damage: 5,
            isCritical: true
          },
          targetInstanceId: 'kobold-1'
        }
      });
    });

    // Wait for victory screen to appear
    await page.locator('[data-testid="victory-screen"]').waitFor({ state: 'visible' });

    // STEP 3: Capture victory screen
    await screenshots.capture(page, 'victory-screen', {
      programmaticCheck: async () => {
        // Verify victory screen elements
        await expect(page.locator('[data-testid="victory-screen"]')).toBeVisible();
        await expect(page.locator('[data-testid="return-to-menu-button"]')).toBeVisible();
        
        // Verify Redux store state
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.currentScreen).toBe('victory');
        expect(storeState.game.scenario.monstersDefeated).toBe(2);
      }
    });

    // STEP 4: Verify return to character select works
    await page.locator('[data-testid="return-to-menu-button"]').click();
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'return-to-character-select', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="character-select"]')).toBeVisible();
        
        // Verify Redux store was reset
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.currentScreen).toBe('character-select');
        expect(storeState.game.scenario.monstersDefeated).toBe(0);
      }
    });
  });

  test('Defeat screen appears when all heroes are eliminated', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Start game with a single hero (Quinn)
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // STEP 2: Directly set hero HP to 0 and transition to defeat screen
    // This bypasses the complex monster attack flow and tests the defeat screen directly
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Set hero HP to 0 directly
      store.dispatch({
        type: 'game/setHeroHp',
        payload: { heroId: 'quinn', hp: 0 }
      });
      
      // Manually trigger the defeat screen by setting currentScreen
      // This simulates what happens when the last hero is defeated
      const state = store.getState();
      // Check if all heroes are at 0 HP (they should be after setHeroHp)
      const allDefeated = state.game.heroHp.every((h: any) => h.currentHp <= 0);
      if (allDefeated) {
        // Dispatch a custom action or modify state directly
        // Since we can't easily dispatch to change screen, we use Immer's approach
      }
    });

    // The issue is that setHeroHp alone doesn't trigger defeat screen
    // The defeat check only happens in activateNextMonster when monster attacks
    // So we need to trigger that check differently
    
    // Let's use a workaround: directly dispatch to reset game with defeat screen
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // Get current state
      const state = store.getState();
      
      // We need to simulate being in villain phase and triggering monster attack
      // First, add a monster and set proper state
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-0',
          position: { x: 2, y: 4 }, // Near starting position
          currentHp: 1,
          controllerId: 'quinn',
          tileId: 'start-tile'
        }]
      });

      // Set hero position adjacent to monster for attack
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 3 } }
      });

      // Set hero HP to 1
      store.dispatch({
        type: 'game/setHeroHp',
        payload: { heroId: 'quinn', hp: 1 }
      });

      // Hide movement overlay
      store.dispatch({ type: 'game/hideMovement' });
    });

    // Now transition through phases to villain phase
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/endHeroPhase' });
    });

    // Wait a moment for any UI updates
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // If we're stuck in exploration phase, end it
      if (store.getState().game.turnState.currentPhase === 'exploration-phase') {
        store.dispatch({ type: 'game/endExplorationPhase' });
      }
    });

    // Wait for villain phase
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.turnState.currentPhase).toBe('villain-phase');
    }).toPass({ timeout: 10000 });

    // Activate monster to attack hero
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/activateNextMonster',
        payload: { randomFn: () => 0.95 } // High roll ensures hit
      });
    });

    // Wait for defeat screen to appear
    await page.locator('[data-testid="defeat-screen"]').waitFor({ state: 'visible', timeout: 10000 });

    // STEP 3: Capture defeat screen
    await screenshots.capture(page, 'defeat-screen', {
      programmaticCheck: async () => {
        // Verify defeat screen elements
        await expect(page.locator('[data-testid="defeat-screen"]')).toBeVisible();
        await expect(page.locator('[data-testid="return-to-menu-button"]')).toBeVisible();
        
        // Verify Redux store state
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.currentScreen).toBe('defeat');
      }
    });

    // STEP 4: Verify return to character select works from defeat screen
    await page.locator('[data-testid="return-to-menu-button"]').click();
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'return-from-defeat', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="character-select"]')).toBeVisible();
        
        // Verify Redux store was reset
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.currentScreen).toBe('character-select');
        expect(storeState.game.scenario.monstersDefeated).toBe(0);
      }
    });
  });

  test('Monster defeat counter increments correctly', async ({ page }) => {
    // Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Verify initial state
    let storeState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(storeState.game.scenario.monstersDefeated).toBe(0);

    // Add a monster
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-0',
          position: { x: 2, y: 2 },
          currentHp: 1,
          controllerId: 'quinn',
          tileId: 'start-tile'
        }]
      });
    });

    // Defeat the monster
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setAttackResult',
        payload: {
          result: {
            roll: 15,
            attackBonus: 6,
            total: 21,
            targetAC: 14,
            isHit: true,
            damage: 2,
            isCritical: false
          },
          targetInstanceId: 'kobold-0'
        }
      });
    });

    // Verify counter incremented
    storeState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(storeState.game.scenario.monstersDefeated).toBe(1);
    
    // Verify objective progress display updated
    await expect(page.locator('[data-testid="objective-progress"]')).toContainText('1 / 2 defeated');
  });
});
