import { test, expect } from '@playwright/test';
import { selectDefaultPowerCards, createScreenshotHelper, dismissScenarioIntroduction } from '../helpers/screenshot-helper';

test.describe('034 - Status Effects', () => {
  test('Apply and display hero status effects', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Capture initial state screenshot
    await screenshots.capture(page, 'initial-no-status', {
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

    // Capture poisoned status screenshot
    await screenshots.capture(page, 'poisoned-status-applied', {
      programmaticCheck: async () => {
        const stateAfterPoison = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(stateAfterPoison.game.heroHp[0].statuses).toHaveLength(1);
        expect(stateAfterPoison.game.heroHp[0].statuses[0].type).toBe('poisoned');
        
        await expect(page.locator('[data-testid="player-card-conditions"]')).toBeVisible();
        await expect(page.locator('[data-testid="condition-poisoned"]')).toBeVisible();
        await expect(page.locator('[data-testid="condition-poisoned"]')).toContainText('🤢');
      }
    });

    // STEP 3: Apply multiple status effects
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      const heroId = state.game.heroHp[0].heroId;
      
      // Add dazed status
      store.dispatch({
        type: 'game/applyHeroStatus',
        payload: {
          heroId: heroId,
          statusType: 'dazed',
          source: 'encounter-1',
          duration: 2
        }
      });
      
      // Add slowed status
      store.dispatch({
        type: 'game/applyHeroStatus',
        payload: {
          heroId: heroId,
          statusType: 'slowed',
          source: 'spell-1'
        }
      });
    });

    // Capture multiple status effects screenshot
    await screenshots.capture(page, 'multiple-status-effects', {
      programmaticCheck: async () => {
        const stateWithMultiple = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(stateWithMultiple.game.heroHp[0].statuses).toHaveLength(3);

        await expect(page.locator('[data-testid="condition-poisoned"]')).toBeVisible();
        await expect(page.locator('[data-testid="condition-dazed"]')).toBeVisible();
        await expect(page.locator('[data-testid="condition-slowed"]')).toBeVisible();
        
        await expect(page.locator('[data-testid="condition-dazed"]')).toContainText('😵');
        await expect(page.locator('[data-testid="condition-slowed"]')).toContainText('🐌');
      }
    });

    // STEP 4: Remove one status
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      const heroId = state.game.heroHp[0].heroId;
      
      store.dispatch({
        type: 'game/removeHeroStatus',
        payload: {
          heroId: heroId,
          statusType: 'poisoned'
        }
      });
    });

    // Capture status after removal screenshot
    await screenshots.capture(page, 'poisoned-removed-others-remain', {
      programmaticCheck: async () => {
        const stateAfterRemoval = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(stateAfterRemoval.game.heroHp[0].statuses).toHaveLength(2);
        expect(stateAfterRemoval.game.heroHp[0].statuses.find((s: any) => s.type === 'poisoned')).toBeUndefined();

        await expect(page.locator('[data-testid="condition-poisoned"]')).not.toBeVisible();
        await expect(page.locator('[data-testid="condition-dazed"]')).toBeVisible();
        await expect(page.locator('[data-testid="condition-slowed"]')).toBeVisible();
      }
    });
  });

  test('Process status effects with processHeroStatusEffects action', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Capture initial HP screenshot
    await screenshots.capture(page, 'initial-hp-full', {
      programmaticCheck: async () => {
        const initialState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        const initialHp = initialState.game.heroHp[0].currentHp;
        expect(initialHp).toBe(8);
        await expect(page.locator('[data-testid="hero-hp"]')).toContainText('HP: 8/8');
      }
    });

    // STEP 2: Apply ongoing damage status
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      const heroId = state.game.heroHp[0].heroId;
      
      store.dispatch({
        type: 'game/applyHeroStatus',
        payload: {
          heroId: heroId,
          statusType: 'ongoing-damage',
          source: 'fire-trap',
          data: { damage: 2 }
        }
      });
    });

    // Capture ongoing damage status applied screenshot
    await screenshots.capture(page, 'ongoing-damage-applied-before-process', {
      programmaticCheck: async () => {
        const stateWithStatus = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(stateWithStatus.game.heroHp[0].statuses).toHaveLength(1);
        expect(stateWithStatus.game.heroHp[0].currentHp).toBe(8); // HP not yet reduced
        
        await expect(page.locator('[data-testid="player-card-conditions"]')).toBeVisible();
        await expect(page.locator('[data-testid="condition-ongoing-damage"]')).toBeVisible();
        await expect(page.locator('[data-testid="hero-hp"]')).toContainText('HP: 8/8');
      }
    });

    // STEP 3: Manually call processHeroStatusEffects
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      const heroId = state.game.heroHp[0].heroId;
      
      store.dispatch({
        type: 'game/processHeroStatusEffects',
        payload: heroId
      });
    });

    // Capture HP after processing ongoing damage screenshot
    await screenshots.capture(page, 'hp-reduced-after-processing', {
      programmaticCheck: async () => {
        const stateAfterProcess = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // HP should be reduced by 2
        expect(stateAfterProcess.game.heroHp[0].currentHp).toBe(6);
        
        // Status should still be present (no duration limit)
        expect(stateAfterProcess.game.heroHp[0].statuses).toHaveLength(1);
        
        await expect(page.locator('[data-testid="hero-hp"]')).toContainText('HP: 6/8');
      }
    });
  });

  test('Monster status effects display on monster token', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // STEP 2: Spawn a monster and apply status
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Spawn a kobold
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-1',
          position: { x: 1, y: 1 },
          currentHp: 1,
          controllerId: 'quinn',
          tileId: 'start-tile',
          statuses: []
        }]
      });
      
      // Apply slowed status to the monster
      store.dispatch({
        type: 'game/applyMonsterStatus',
        payload: {
          monsterInstanceId: 'kobold-1',
          statusType: 'slowed',
          source: 'test-spell'
        }
      });
    });

    // Capture monster with slowed status screenshot
    await screenshots.capture(page, 'monster-with-slowed-status', {
      programmaticCheck: async () => {
        const stateWithMonsterStatus = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(stateWithMonsterStatus.game.monsters).toHaveLength(1);
        expect(stateWithMonsterStatus.game.monsters[0].statuses).toHaveLength(1);
        expect(stateWithMonsterStatus.game.monsters[0].statuses[0].type).toBe('slowed');

        await expect(page.locator('[data-testid="monster-token"]')).toBeVisible();
        await expect(page.locator('[data-testid="monster-status-badges"]')).toBeVisible();
        await expect(page.locator('[data-testid="monster-status-slowed"]')).toBeVisible();
        await expect(page.locator('[data-testid="monster-status-slowed"]')).toContainText('🐌');
      }
    });

    // STEP 3: Remove status and verify badge disappears
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/removeMonsterStatus',
        payload: {
          monsterInstanceId: 'kobold-1',
          statusType: 'slowed'
        }
      });
    });

    // Capture monster after status removal screenshot
    await screenshots.capture(page, 'monster-status-removed', {
      programmaticCheck: async () => {
        const stateAfterRemoval = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(stateAfterRemoval.game.monsters[0].statuses).toHaveLength(0);

        await expect(page.locator('[data-testid="monster-status-badges"]')).not.toBeVisible();
      }
    });
  });
});
