import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction } from '../helpers/screenshot-helper';

test.describe('051 - Righteous Smite (ID: 27)', () => {
  test('All heroes on tile regain 1 HP on both hit and miss', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection and select two heroes
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    // Select Keyleth (Paladin with Righteous Smite)
    await page.locator('[data-testid="hero-keyleth-bottom"]').click();
    await selectDefaultPowerCards(page, 'keyleth');
    
    // Select Quinn as second hero
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    
    await screenshots.capture(page, 'two-heroes-selected', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="hero-keyleth-bottom"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="hero-quinn-bottom"]')).toHaveClass(/selected/);
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

    // STEP 2: Set up scenario - place heroes together, damage them, spawn monster
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Override power cards for Keyleth to include Righteous Smite (ID 27)
      store.dispatch({
        type: 'heroes/setHeroPowerCards',
        payload: {
          heroId: 'keyleth',
          powerCards: {
            utility: 28,
            atWills: [22, 23],
            daily: 27  // Righteous Smite
          }
        }
      });
      
      // Position both heroes at same location
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'keyleth', position: { x: 2, y: 2 } }
      });
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 2 } }
      });
      
      // Damage both heroes
      store.dispatch({
        type: 'game/setHeroHp',
        payload: { heroId: 'keyleth', currentHp: 6 }
      });
      store.dispatch({
        type: 'game/setHeroHp',
        payload: { heroId: 'quinn', currentHp: 7 }
      });
      
      // Spawn monster adjacent to heroes
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-test-1',
          position: { x: 2, y: 3 },
          currentHp: 3,
          controllerId: 'keyleth',
          tileId: 'start-tile'
        }]
      });
    });

    // Wait for setup to complete and attack panel to be visible
    await page.locator('[data-testid="power-card-attack-panel"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'setup-complete', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.heroHp[0].currentHp).toBe(6); // Keyleth damaged
        expect(state.game.heroHp[1].currentHp).toBe(7); // Quinn damaged
        expect(state.game.monsters.length).toBe(1);
      }
    });

    // STEP 3: Attack with Righteous Smite (guaranteed hit)
    await page.locator('[data-testid="attack-card-27"]').click();

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
        // Both heroes should be healed by 1 HP (hit or miss effect)
        expect(state.game.heroHp[0].currentHp).toBe(7); // Keyleth: 6 + 1
        expect(state.game.heroHp[1].currentHp).toBe(8); // Quinn: 7 + 1
      }
    });

    await page.locator('[data-testid="dismiss-combat-result"]').click();

    await screenshots.capture(page, 'after-hit-heroes-healed', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.heroHp[0].currentHp).toBe(7);
        expect(state.game.heroHp[1].currentHp).toBe(8);
      }
    });
  });

  test('All heroes on tile regain 1 HP on miss', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    await page.locator('[data-testid="hero-keyleth-bottom"]').click();
    await selectDefaultPowerCards(page, 'keyleth');
    
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
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
        type: 'heroes/setHeroPowerCards',
        payload: {
          heroId: 'keyleth',
          powerCards: { utility: 28, atWills: [22, 23], daily: 27 }
        }
      });
      
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'keyleth', position: { x: 2, y: 2 } }
      });
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 2 } }
      });
      
      store.dispatch({
        type: 'game/setHeroHp',
        payload: { heroId: 'keyleth', currentHp: 5 }
      });
      store.dispatch({
        type: 'game/setHeroHp',
        payload: { heroId: 'quinn', currentHp: 6 }
      });
      
      // Spawn kobold (we'll force a miss with low roll)
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-test-2',
          position: { x: 2, y: 3 },
          currentHp: 3,
          controllerId: 'keyleth',
          tileId: 'start-tile'
        }]
      });
    });

    await page.locator('[data-testid="power-card-attack-panel"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'setup-for-miss', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.heroHp[0].currentHp).toBe(5);
        expect(state.game.heroHp[1].currentHp).toBe(6);
      }
    });

    await page.locator('[data-testid="attack-card-27"]').click();

    await page.evaluate(() => {
      (window as any).__originalRandom = Math.random;
      Math.random = () => 0.05; // Roll 2 - guaranteed miss
    });

    await page.locator('[data-testid="attack-target-kobold-test-2"]').click();

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
        // Both heroes should STILL be healed despite miss
        expect(state.game.heroHp[0].currentHp).toBe(6); // Keyleth: 5 + 1
        expect(state.game.heroHp[1].currentHp).toBe(7); // Quinn: 6 + 1
      }
    });

    await page.locator('[data-testid="dismiss-combat-result"]').click();

    await screenshots.capture(page, 'after-miss-heroes-healed', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.heroHp[0].currentHp).toBe(6);
        expect(state.game.heroHp[1].currentHp).toBe(7);
      }
    });
  });

  test('Only heroes on same tile receive healing', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    await page.locator('[data-testid="hero-keyleth-bottom"]').click();
    await selectDefaultPowerCards(page, 'keyleth');
    
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    
    await page.locator('[data-testid="hero-vistra-bottom"]').click();
    await selectDefaultPowerCards(page, 'vistra');
    
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
        type: 'heroes/setHeroPowerCards',
        payload: {
          heroId: 'keyleth',
          powerCards: { utility: 28, atWills: [22, 23], daily: 27 }
        }
      });
      
      // Keyleth and Quinn together
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'keyleth', position: { x: 2, y: 2 } }
      });
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 2 } }
      });
      
      // Vistra separate
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'vistra', position: { x: 3, y: 4 } }
      });
      
      store.dispatch({
        type: 'game/setHeroHp',
        payload: { heroId: 'keyleth', currentHp: 5 }
      });
      store.dispatch({
        type: 'game/setHeroHp',
        payload: { heroId: 'quinn', currentHp: 6 }
      });
      store.dispatch({
        type: 'game/setHeroHp',
        payload: { heroId: 'vistra', currentHp: 8 }
      });
      
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-test-1',
          position: { x: 2, y: 3 },
          currentHp: 3,
          controllerId: 'keyleth',
          tileId: 'start-tile'
        }]
      });
    });

    await page.locator('[data-testid="power-card-attack-panel"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'three-heroes-setup', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.heroHp[0].currentHp).toBe(5);
        expect(state.game.heroHp[1].currentHp).toBe(6);
        expect(state.game.heroHp[2].currentHp).toBe(8);
      }
    });

    await page.locator('[data-testid="attack-card-27"]').click();

    await page.evaluate(() => {
      (window as any).__originalRandom = Math.random;
      Math.random = () => 0.7;
    });

    await page.locator('[data-testid="attack-target-kobold-test-1"]').click();

    await page.evaluate(() => {
      if ((window as any).__originalRandom) {
        Math.random = (window as any).__originalRandom;
      }
    });

    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'only-same-tile-healed', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        
        // Keyleth and Quinn healed (on same tile)
        expect(state.game.heroHp[0].currentHp).toBe(6); // 5 + 1
        expect(state.game.heroHp[1].currentHp).toBe(7); // 6 + 1
        
        // Vistra NOT healed (different tile)
        expect(state.game.heroHp[2].currentHp).toBe(8); // Unchanged
      }
    });
  });
});
