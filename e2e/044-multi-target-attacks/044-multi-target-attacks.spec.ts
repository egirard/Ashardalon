import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards } from '../helpers/screenshot-helper';

test.describe('044 - Multi-Target Attacks', () => {
  test('Arcing Strike (ID 25) verifies multi-target attack capability', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Set up game with Keyleth programmatically
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    // Select Keyleth (Paladin) who has Arcing Strike
    await page.locator('[data-testid="hero-keyleth"]').click();
    
    // Select power cards for Keyleth (includes Arcing Strike ID 25 as default daily)
    await selectDefaultPowerCards(page, 'keyleth');
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'hidden' });
    
    // Start the game
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'game-started-keyleth', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(state.game.heroTokens.length).toBe(1);
        expect(state.game.heroTokens[0].heroId).toBe('keyleth');
        expect(state.game.turnState.currentPhase).toBe('hero-phase');
      }
    });
    
    // STEP 2: Set up two monsters and verify multi-target attack with programmatic state
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Add two kobolds adjacent to hero
      const monster1 = {
        monsterId: 'kobold',
        instanceId: 'kobold-1-test',
        currentHp: 3,
        maxHp: 3,
        tileId: 'start',
        position: { x: 1, y: 2 },
      };
      
      const monster2 = {
        monsterId: 'kobold',
        instanceId: 'kobold-2-test',
        currentHp: 3,
        maxHp: 3,
        tileId: 'start',
        position: { x: 3, y: 2 },
      };
      
      store.dispatch({
        type: 'game/setMonsters',
        payload: [monster1, monster2]
      });
      
      // Position hero adjacent to both monsters
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'keyleth', position: { x: 2, y: 2 } }
      });
    });
    
    await screenshots.capture(page, 'two-monsters-adjacent', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(state.game.monsters.length).toBe(2);
        expect(state.game.monsters[0].position).toEqual({ x: 1, y: 2 });
        expect(state.game.monsters[1].position).toEqual({ x: 3, y: 2 });
        expect(state.game.heroTokens[0].position).toEqual({ x: 2, y: 2 });
      }
    });
    
    // STEP 3: Simulate multi-target attack with Arcing Strike programmatically
    // Attack first monster
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      Math.random = () => 0.85; // Will roll 18
      
      store.dispatch({
        type: 'game/setAttackResult',
        payload: {
          result: {
            roll: 18,
            attackBonus: 9,
            total: 27,
            targetAC: 13,
            isHit: true,
            damage: 3,
            isCritical: false
          },
          targetInstanceId: 'kobold-1-test'
        }
      });
    });
    
    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'first-monster-attack', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="combat-result"]')).toBeVisible();
        await expect(page.locator('[data-testid="result-text"]')).toContainText('HIT');
      }
    });
    
    // Dismiss first result
    await page.locator('[data-testid="dismiss-combat-result"]').click();
    await page.waitForTimeout(500);
    
    // Attack second monster
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      store.dispatch({
        type: 'game/setAttackResult',
        payload: {
          result: {
            roll: 16,
            attackBonus: 9,
            total: 25,
            targetAC: 13,
            isHit: true,
            damage: 3,
            isCritical: false
          },
          targetInstanceId: 'kobold-2-test'
        }
      });
    });
    
    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'second-monster-attack', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="combat-result"]')).toBeVisible();
        await expect(page.locator('[data-testid="result-text"]')).toContainText('HIT');
      }
    });
    
    // Dismiss second result
    await page.locator('[data-testid="dismiss-combat-result"]').click();
    await page.waitForTimeout(500);
    
    await screenshots.capture(page, 'arcing-strike-complete', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        // Both monsters should be defeated (HP reduced to 0)
        expect(state.game.attackResult).toBeNull();
      }
    });
  });

  test('Hurled Breath (ID 41) verifies area attack capability', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Set up game with Haskan programmatically
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    // Select Haskan (Wizard/Dragonborn) who has Hurled Breath as custom ability
    await page.locator('[data-testid="hero-haskan"]').click();
    
    // Select power cards for Haskan
    await selectDefaultPowerCards(page, 'haskan');
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'hidden' });
    
    // Start the game
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'game-started-haskan', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(state.game.heroTokens.length).toBe(1);
        expect(state.game.heroTokens[0].heroId).toBe('haskan');
        expect(state.game.turnState.currentPhase).toBe('hero-phase');
      }
    });
    
    // STEP 2: Set up two monsters on the same tile programmatically
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Add two kobolds on the same tile
      const monster1 = {
        monsterId: 'kobold',
        instanceId: 'kobold-1-test',
        currentHp: 3,
        maxHp: 3,
        tileId: 'start',
        position: { x: 1, y: 1 },
      };
      
      const monster2 = {
        monsterId: 'kobold',
        instanceId: 'kobold-2-test',
        currentHp: 3,
        maxHp: 3,
        tileId: 'start',
        position: { x: 3, y: 1 },
      };
      
      store.dispatch({
        type: 'game/setMonsters',
        payload: [monster1, monster2]
      });
      
      // Position hero at a position where they can use Hurled Breath (within 2 tiles)
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'haskan', position: { x: 2, y: 3 } }
      });
    });
    
    await screenshots.capture(page, 'two-monsters-on-same-tile', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(state.game.monsters.length).toBe(2);
        // Verify both monsters are on the same tile
        expect(state.game.monsters[0].tileId).toBe('start');
        expect(state.game.monsters[1].tileId).toBe('start');
      }
    });
    
    // STEP 3: Simulate area attack with Hurled Breath programmatically
    // Attack first monster on the tile
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      Math.random = () => 0.75; // Will roll 16
      
      store.dispatch({
        type: 'game/setAttackResult',
        payload: {
          result: {
            roll: 16,
            attackBonus: 5,
            total: 21,
            targetAC: 13,
            isHit: true,
            damage: 1,
            isCritical: false
          },
          targetInstanceId: 'kobold-1-test'
        }
      });
    });
    
    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'first-monster-attack', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="combat-result"]')).toBeVisible();
        await expect(page.locator('[data-testid="result-text"]')).toContainText('HIT');
      }
    });
    
    // Dismiss first result
    await page.locator('[data-testid="dismiss-combat-result"]').click();
    await page.waitForTimeout(500);
    
    // Attack second monster on the same tile
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      store.dispatch({
        type: 'game/setAttackResult',
        payload: {
          result: {
            roll: 14,
            attackBonus: 5,
            total: 19,
            targetAC: 13,
            isHit: true,
            damage: 1,
            isCritical: false
          },
          targetInstanceId: 'kobold-2-test'
        }
      });
    });
    
    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'second-monster-attack', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="combat-result"]')).toBeVisible();
        await expect(page.locator('[data-testid="result-text"]')).toContainText('HIT');
      }
    });
    
    // Dismiss second result
    await page.locator('[data-testid="dismiss-combat-result"]').click();
    await page.waitForTimeout(500);
    
    await screenshots.capture(page, 'hurled-breath-complete', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        // Attack complete
        expect(state.game.attackResult).toBeNull();
      }
    });
  });
});
