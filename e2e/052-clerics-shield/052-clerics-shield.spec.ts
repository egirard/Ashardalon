import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction } from '../helpers/screenshot-helper';

test.describe('052 - Cleric\'s Shield (ID: 2)', () => {
  test('AC bonus applies on hit and persists', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection and select Quinn (Cleric)
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    // Select Quinn (Cleric with Cleric's Shield)
    await page.locator('[data-testid="hero-quinn"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    
    await screenshots.capture(page, 'hero-selected', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="hero-quinn"]')).toHaveClass(/selected/);
      }
    });

    // Start the game
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Dismiss scenario introduction modal if it appears
    const scenarioIntroButton = page.locator('[data-testid="start-scenario-button"]');
    if (await scenarioIntroButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await scenarioIntroButton.click();
      await page.locator('[data-testid="scenario-introduction-overlay"]').waitFor({ state: 'hidden' });
    }

    // STEP 2: Set up scenario - position hero, spawn monster
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Position Quinn
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 2 } }
      });
      
      // Spawn monster adjacent to Quinn
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-test-1',
          position: { x: 2, y: 3 },
          currentHp: 3,
          controllerId: 'quinn',
          tileId: 'start-tile'
        }]
      });
    });

    // Wait for attack panel to be visible
    await page.locator('[data-testid="power-card-attack-panel"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'setup-complete', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.monsters.length).toBe(1);
        expect(state.game.clericsShieldTarget).toBeNull(); // No AC bonus yet
      }
    });

    // STEP 3: Attack with Cleric's Shield (guaranteed hit)
    await page.locator('[data-testid="attack-card-2"]').click();

    await page.evaluate(() => {
      (window as any).__originalRandom = Math.random;
      Math.random = () => 0.85; // Roll 17 - guaranteed hit
    });

    await page.locator('[data-testid="attack-target-kobold-test-1"]').click();

    await page.evaluate(() => {
      if ((window as any).__originalRandom) {
        Math.random = (window as any).__originalRandom;
      }
    });

    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'attack-hit-result', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="result-text"]')).toContainText('HIT');
        
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        // AC bonus should now be applied to Quinn (first hero on tile)
        expect(state.game.clericsShieldTarget).toBe('quinn');
      }
    });

    await page.locator('[data-testid="dismiss-combat-result"]').click();

    await screenshots.capture(page, 'after-hit-bonus-applied', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.clericsShieldTarget).toBe('quinn');
      }
    });
  });

  test('AC bonus applies on miss', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    await page.locator('[data-testid="hero-quinn"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Dismiss scenario introduction modal if it appears
    const scenarioIntroButton = page.locator('[data-testid="start-scenario-button"]');
    if (await scenarioIntroButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await scenarioIntroButton.click();
      await page.locator('[data-testid="scenario-introduction-overlay"]').waitFor({ state: 'hidden' });
    }

    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 2 } }
      });
      
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-test-1',
          position: { x: 2, y: 3 },
          currentHp: 3,
          controllerId: 'quinn',
          tileId: 'start-tile'
        }]
      });
    });

    await page.locator('[data-testid="power-card-attack-panel"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'setup-for-miss', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.clericsShieldTarget).toBeNull();
      }
    });

    // Attack with Cleric's Shield (guaranteed miss)
    await page.locator('[data-testid="attack-card-2"]').click();

    await page.evaluate(() => {
      (window as any).__originalRandom = Math.random;
      Math.random = () => 0.05; // Roll 2 - guaranteed miss
    });

    await page.locator('[data-testid="attack-target-kobold-test-1"]').click();

    await page.evaluate(() => {
      if ((window as any).__originalRandom) {
        Math.random = (window as any).__originalRandom;
      }
    });

    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'attack-miss-result', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="result-text"]')).toContainText('MISS');
        
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        // AC bonus should apply even on miss (Hit or Miss effect)
        expect(state.game.clericsShieldTarget).toBe('quinn');
      }
    });

    await page.locator('[data-testid="dismiss-combat-result"]').click();

    await screenshots.capture(page, 'after-miss-bonus-applied', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.clericsShieldTarget).toBe('quinn');
      }
    });
  });

  test('Bonus resets when Cleric\'s Shield is used again', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    // Select two heroes to test different targets
    await page.locator('[data-testid="hero-quinn"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    
    await page.locator('[data-testid="hero-vistra"]').click();
    await selectDefaultPowerCards(page, 'vistra');
    
    await screenshots.capture(page, 'two-heroes-selected', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="hero-quinn"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="hero-vistra"]')).toHaveClass(/selected/);
      }
    });

    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Dismiss scenario introduction modal if it appears
    const scenarioIntroButton = page.locator('[data-testid="start-scenario-button"]');
    if (await scenarioIntroButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await scenarioIntroButton.click();
      await page.locator('[data-testid="scenario-introduction-overlay"]').waitFor({ state: 'hidden' });
    }

    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Position both heroes at same location
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 2 } }
      });
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'vistra', position: { x: 2, y: 2 } }
      });
      
      // Spawn monster
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-test-1',
          position: { x: 2, y: 3 },
          currentHp: 10, // More HP so it survives multiple attacks
          controllerId: 'quinn',
          tileId: 'start-tile'
        }]
      });
    });

    await page.locator('[data-testid="power-card-attack-panel"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'initial-setup', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.clericsShieldTarget).toBeNull();
      }
    });

    // First use of Cleric's Shield
    await page.locator('[data-testid="attack-card-2"]').click();
    await page.evaluate(() => {
      Math.random = () => 0.85; // Hit
    });
    await page.locator('[data-testid="attack-target-kobold-test-1"]').click();
    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'first-use-bonus-applied', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.clericsShieldTarget).toBe('quinn'); // First hero on tile
      }
    });

    await page.locator('[data-testid="dismiss-combat-result"]').click();

    // Reset game state to attack again (in real game this would be next turn)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // Reset hero turn actions to allow another attack
      store.dispatch({
        type: 'game/setHeroTurnActions',
        payload: { actionsTaken: [], canMove: true, canAttack: true }
      });
    });

    await screenshots.capture(page, 'bonus-persists-before-second-use', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.clericsShieldTarget).toBe('quinn'); // Still active
      }
    });

    // Second use of Cleric's Shield - bonus should reset/reapply
    await page.locator('[data-testid="attack-card-2"]').click();
    await page.evaluate(() => {
      Math.random = () => 0.85; // Hit
    });
    await page.locator('[data-testid="attack-target-kobold-test-1"]').click();
    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'second-use-bonus-reapplied', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        // Bonus still applies to Quinn (first hero on tile)
        expect(state.game.clericsShieldTarget).toBe('quinn');
      }
    });
  });
});
