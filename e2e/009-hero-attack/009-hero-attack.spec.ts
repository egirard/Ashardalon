import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from '../helpers/screenshot-helper';

test.describe('009 - Hero Attacks Monster', () => {
  test('Hero attacks adjacent monster and sees result', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection and select Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // STEP 2: Set up the scenario - place Quinn and add a monster adjacent to hero on start-tile
    // Position Quinn and add a monster adjacent to them
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // Move Quinn to position (2, 3)
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 3 } }
      });
    });

    // Add a monster adjacent to Quinn on the start-tile (position 2, 4 is adjacent to 2, 3)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      // Directly add a monster to the monsters array by dispatching a custom action
      // We need to modify the state to include a monster on the start-tile
      const newMonsters = [
        ...state.game.monsters,
        {
          monsterId: 'kobold',
          instanceId: 'kobold-adjacent',
          position: { x: 2, y: 4 },
          currentHp: 1,
          controllerId: 'quinn',
          tileId: 'start-tile'
        }
      ];
      // Use internal Redux action to update state
      store.dispatch({
        type: 'game/setMonsters',
        payload: newMonsters
      });
    });

    // Wait a moment for UI to update and verify attack panel is visible
    await page.waitForTimeout(100);
    
    // STEP 3: Capture screenshot showing the attack button is available
    await screenshots.capture(page, 'attack-button-visible', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 3 });
        await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');
        // Verify the attack panel is visible
        await expect(page.locator('[data-testid="attack-panel"]')).toBeVisible();
        await expect(page.locator('[data-testid="attack-button"]')).toBeVisible();
      }
    });

    // STEP 4: Seed Math.random before clicking attack for deterministic result
    // This ensures the dice roll is always the same for screenshot comparison
    await page.evaluate(() => {
      // Override Math.random to return a fixed value that will result in a roll of 15
      // rollD20 uses: Math.floor(Math.random() * 20) + 1
      // To get 15: Math.floor(x * 20) + 1 = 15, so x = 14/20 = 0.7
      (window as any).__originalRandom = Math.random;
      Math.random = () => 0.7; // This will give roll = floor(0.7 * 20) + 1 = 15
    });
    
    // Click the attack button to initiate attack
    await page.locator('[data-testid="attack-button"]').click();

    // Restore Math.random after attack
    await page.evaluate(() => {
      if ((window as any).__originalRandom) {
        Math.random = (window as any).__originalRandom;
      }
    });

    // Wait for combat result to appear
    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'attack-result', {
      programmaticCheck: async () => {
        // Verify combat result display is visible
        await expect(page.locator('[data-testid="combat-result"]')).toBeVisible();
        
        // Verify dice roll information is displayed (roll should be 15 due to seeding)
        await expect(page.locator('[data-testid="dice-roll"]')).toHaveText('15');
        await expect(page.locator('[data-testid="attack-bonus"]')).toHaveText('6'); // Quinn's mace bonus
        await expect(page.locator('[data-testid="attack-total"]')).toHaveText('21'); // 15 + 6
        await expect(page.locator('[data-testid="target-ac"]')).toHaveText('14'); // Kobold AC
        
        // Verify hit result (21 >= 14)
        await expect(page.locator('[data-testid="result-text"]')).toContainText('HIT');
        
        // Verify Redux store state
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.attackResult).not.toBeNull();
        expect(storeState.game.attackResult.roll).toBe(15);
        expect(storeState.game.attackResult.isHit).toBe(true);
      }
    });

    // STEP 5: Dismiss the combat result
    await page.locator('[data-testid="dismiss-combat-result"]').click();
    await expect(page.locator('[data-testid="combat-result"]')).not.toBeVisible();

    await screenshots.capture(page, 'result-dismissed', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="combat-result"]')).not.toBeVisible();
        
        // Verify Redux store - attack result should be cleared
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.attackResult).toBeNull();
      }
    });
  });

  test('Hero misses attack against monster', async ({ page }) => {
    // Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Dispatch an attack that misses
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setAttackResult',
        payload: {
          result: {
            roll: 3,
            attackBonus: 6,
            total: 9,
            targetAC: 14,
            isHit: false,
            damage: 0,
            isCritical: false
          },
          targetInstanceId: 'kobold-test'
        }
      });
    });

    // Wait for combat result to appear
    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });

    // Verify combat result display (no screenshot for miss to avoid flakiness)
    await expect(page.locator('[data-testid="combat-result"]')).toBeVisible();
    
    // Verify dice roll information
    await expect(page.locator('[data-testid="dice-roll"]')).toHaveText('3');
    await expect(page.locator('[data-testid="attack-total"]')).toHaveText('9');
    await expect(page.locator('[data-testid="target-ac"]')).toHaveText('14');
    
    // Verify miss result
    await expect(page.locator('[data-testid="result-text"]')).toContainText('MISS');
    
    // Damage info should NOT be visible for miss
    await expect(page.locator('[data-testid="damage-info"]')).not.toBeVisible();
    
    // Verify Redux store state
    const storeState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(storeState.game.attackResult.isHit).toBe(false);
    expect(storeState.game.attackResult.damage).toBe(0);
  });

  test('Critical hit on natural 20', async ({ page }) => {
    // Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Dispatch a critical hit
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setAttackResult',
        payload: {
          result: {
            roll: 20,
            attackBonus: 6,
            total: 26,
            targetAC: 30, // Even with high AC, natural 20 hits
            isHit: true,
            damage: 2,
            isCritical: true
          },
          targetInstanceId: 'dragon-test'
        }
      });
    });

    // Wait for combat result to appear
    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });

    // Verify critical hit display
    await expect(page.locator('[data-testid="dice-roll"]')).toHaveText('20');
    await expect(page.locator('[data-testid="result-text"]')).toContainText('CRITICAL');
    await expect(page.locator('[data-testid="damage-info"]')).toBeVisible();
  });

  test('Monster is defeated when HP reaches 0', async ({ page }) => {
    // Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Add a monster to the game state
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      // We can't directly add monsters, but we can verify state after attack
    });

    // Move Quinn to north edge for exploration
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 0 } }
      });
    });

    // End hero phase to trigger exploration and monster spawn
    await page.locator('[data-testid="end-phase-button"]').click();
    
    // Wait for monster card to appear
    await page.locator('[data-testid="monster-card"]').waitFor({ state: 'visible' });
    
    // Dismiss the monster card
    await page.locator('[data-testid="dismiss-monster-card"]').click();
    
    // Verify monster exists
    const monstersBefore = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState().game.monsters;
    });
    expect(monstersBefore.length).toBeGreaterThan(0);
    
    // Get the monster's instance ID
    const targetInstanceId = monstersBefore[0].instanceId;
    const monsterHp = monstersBefore[0].currentHp;
    
    // Dispatch a hit that does enough damage to defeat the monster
    await page.evaluate((data: { targetId: string, damage: number }) => {
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
            damage: data.damage,
            isCritical: false
          },
          targetInstanceId: data.targetId
        }
      });
    }, { targetId: targetInstanceId, damage: monsterHp + 1 });

    // Wait for combat result to appear
    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });
    
    // Dismiss combat result
    await page.locator('[data-testid="dismiss-combat-result"]').click();

    // Verify monster was removed
    const monstersAfter = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState().game.monsters;
    });
    expect(monstersAfter.length).toBe(monstersBefore.length - 1);
  });
});
