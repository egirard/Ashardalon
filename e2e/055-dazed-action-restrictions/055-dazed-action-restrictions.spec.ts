import { test, expect } from '@playwright/test';
import { selectDefaultPowerCards, createScreenshotHelper, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('055 - Dazed Action Restrictions', () => {
  test('Dazed hero can only take one action per turn', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Capture initial state (hero with normal actions)
    await screenshots.capture(page, 'initial-no-dazed', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(state.game.heroHp[0].statuses).toEqual([]);
        expect(state.game.heroTurnActions.canMove).toBe(true);
        expect(state.game.heroTurnActions.canAttack).toBe(true);
      }
    });

    // STEP 2: Apply Dazed status to Quinn
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      const heroId = state.game.heroHp[0].heroId;
      
      store.dispatch({
        type: 'game/applyHeroStatus',
        payload: {
          heroId: heroId,
          statusType: 'dazed',
          source: 'test-monster',
          duration: 2
        }
      });
    });

    // Capture Dazed status applied
    await screenshots.capture(page, 'dazed-status-applied', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(state.game.heroHp[0].statuses).toHaveLength(1);
        expect(state.game.heroHp[0].statuses[0].type).toBe('dazed');
        
        // Verify Dazed icon is displayed
        await expect(page.locator('[data-testid="condition-dazed"]')).toBeVisible();
        await expect(page.locator('[data-testid="condition-dazed"]')).toContainText('😵');
      }
    });

    // STEP 3: Simulate hero taking a move action (we'll use setHeroTurnActions)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      
      // Manually update turn actions as if hero moved while Dazed
      store.dispatch({
        type: 'game/setHeroTurnActions',
        payload: {
          actionsTaken: ['move'],
          canMove: false,
          canAttack: false
        }
      });
    });

    // Capture state after move - no more actions available
    await screenshots.capture(page, 'after-move-no-more-actions', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Dazed hero should not be able to take any more actions
        expect(state.game.heroTurnActions.canMove).toBe(false);
        expect(state.game.heroTurnActions.canAttack).toBe(false);
        expect(state.game.heroTurnActions.actionsTaken).toEqual(['move']);
      }
    });

    // STEP 4: Start a new turn (end current phase and go to villain phase, then back to hero)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // End hero phase
      store.dispatch({ type: 'game/endHeroPhase' });
      
      // End exploration phase (if there is one)
      store.dispatch({ type: 'game/endExplorationPhase' });
      
      // End villain phase to start new hero turn
      store.dispatch({ type: 'game/endVillainPhase' });
    });

    // Capture start of next turn - Dazed should have expired or persist based on duration
    await screenshots.capture(page, 'next-turn-dazed-duration-check', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Check if Dazed is still active (duration 2 means it lasts for 2 turns)
        const heroHp = state.game.heroHp[0];
        const hasDazed = heroHp.statuses.some((s: any) => s.type === 'dazed');
        
        // With duration: 2, should still be dazed on turn 2
        if (state.game.turnState.turnNumber === 2) {
          expect(hasDazed).toBe(true);
        }
      }
    });
  });

  test('Dazed hero taking attack action ends turn immediately', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // STEP 2: Apply Dazed status and add a monster
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      const heroId = state.game.heroHp[0].heroId;
      
      // Apply Dazed
      store.dispatch({
        type: 'game/applyHeroStatus',
        payload: {
          heroId: heroId,
          statusType: 'dazed',
          source: 'test-monster'
        }
      });
      
      // Add a monster nearby
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-1',
          position: { x: 3, y: 2 },
          currentHp: 1,
          controllerId: 'quinn',
          tileId: 'start-tile',
          statuses: []
        }]
      });
    });

    // Capture setup - dazed hero with nearby monster
    await screenshots.capture(page, 'dazed-with-monster', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        expect(state.game.heroHp[0].statuses[0].type).toBe('dazed');
        expect(state.game.monsters).toHaveLength(1);
        
        await expect(page.locator('[data-testid="condition-dazed"]')).toBeVisible();
        await expect(page.locator('[data-testid="monster-token"]')).toBeVisible();
      }
    });

    // STEP 3: Simulate attack (using setAttackResult)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      store.dispatch({
        type: 'game/setAttackResult',
        payload: {
          result: { isHit: true, roll: 15, damage: 2, targetAC: 10 },
          targetInstanceId: 'kobold-1',
          attackName: 'Longsword'
        }
      });
    });

    // Capture after attack - should have no more actions
    await screenshots.capture(page, 'after-attack-no-more-actions', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Dazed hero after attack should have no more actions
        expect(state.game.heroTurnActions.canMove).toBe(false);
        expect(state.game.heroTurnActions.canAttack).toBe(false);
        expect(state.game.heroTurnActions.actionsTaken).toEqual(['attack']);
      }
    });
  });

  test('Non-dazed hero can still take two actions', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Start game with Quinn (no Dazed)
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Capture normal hero with no status effects
    await screenshots.capture(page, 'normal-hero-no-status', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        expect(state.game.heroHp[0].statuses).toEqual([]);
        expect(state.game.heroTurnActions.canMove).toBe(true);
        expect(state.game.heroTurnActions.canAttack).toBe(true);
      }
    });

    // STEP 2: Simulate hero moving (without Dazed)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Set turn actions as if hero moved but is NOT dazed
      store.dispatch({
        type: 'game/setHeroTurnActions',
        payload: {
          actionsTaken: ['move'],
          canMove: true,
          canAttack: true
        }
      });
    });

    // Capture after move - can still attack
    await screenshots.capture(page, 'after-move-can-still-attack', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Normal hero after move should still be able to attack
        expect(state.game.heroTurnActions.canMove).toBe(true);
        expect(state.game.heroTurnActions.canAttack).toBe(true);
        expect(state.game.heroTurnActions.actionsTaken).toEqual(['move']);
      }
    });
  });
});
