import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction } from '../helpers/screenshot-helper';

test.describe('026 - Monster Card Tactics', () => {
  test('Snake monster moves adjacent and attacks in one turn (move-and-attack)', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection and select Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    await screenshots.capture(page, 'initial-game-board', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
      }
    });

    // STEP 2: Set up the snake monster within range of the hero
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Move Quinn to (2, 5)
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 5 } }
      });
      
      // Add a snake monster at (2, 2) - within 1 tile range of hero
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'snake',
          instanceId: 'snake-test',
          position: { x: 2, y: 2 },  // Local tile position
          currentHp: 1,
          controllerId: 'quinn',
          tileId: 'start-tile'
        }]
      });
    });
    
    // Wait for UI to update and capture screenshot showing snake positioned
    await page.waitForTimeout(100);
    
    await screenshots.capture(page, 'snake-positioned', {
      programmaticCheck: async () => {
        // Verify snake is on the board
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.monsters.length).toBe(1);
        expect(state.game.monsters[0].monsterId).toBe('snake');
      }
    });

    // STEP 3: Transition to villain phase
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Transition to villain phase
      store.dispatch({ type: 'game/endHeroPhase' });
      store.dispatch({ type: 'game/endExplorationPhase' });
    });
    
    // Wait a moment for encounter card to appear (if any)
    await page.waitForTimeout(200);
    
    // Dismiss any encounter card that may have appeared (drawn at start of villain phase)
    const encounterDismissButton = page.locator('[data-testid="dismiss-encounter-card"]');
    if (await encounterDismissButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await encounterDismissButton.click();
      await page.waitForTimeout(100);
    }
    
    // Now trigger monster activation
    const result = await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Manually trigger monster activation
      store.dispatch({ type: 'game/activateNextMonster', payload: {} });
      
      // Return the state for verification
      return store.getState();
    });

    // Snake should have attacked because it has move-and-attack tactic
    expect(result.game.monsterAttackResult).not.toBeNull();
    expect(result.game.monsterAttackTargetId).toBe('quinn');

    // Monster should be on a position adjacent to the hero
    const monster = result.game.monsters[0];
    const heroPos = result.game.heroTokens[0].position;
    
    // Check adjacency (should be within 1 square orthogonally or diagonally)
    const dx = Math.abs(monster.position.x - heroPos.x);
    const dy = Math.abs(monster.position.y - heroPos.y);
    expect(dx <= 1 && dy <= 1).toBe(true);

    // Wait for the monster attack result UI to be visible
    await page.waitForTimeout(100);

    await screenshots.capture(page, 'snake-moved-and-attacked', {
      programmaticCheck: async () => {
        // Verify the attack result is displayed
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.monsterAttackResult).not.toBeNull();
      }
    });
  });

  test('Kobold monster only moves when not adjacent (attack-only tactic)', async ({ page }) => {
    // STEP 1: Navigate to character selection and select Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // STEP 2: Set up test scenario and verify state using Redux directly
    const result = await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Move Quinn to (2, 5)
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 5 } }
      });
      
      // Add a kobold monster at (2, 2) - within range but NOT adjacent
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-test',
          position: { x: 2, y: 2 },
          currentHp: 1,
          controllerId: 'quinn',
          tileId: 'start-tile'
        }]
      });
      
      // Transition to villain phase
      store.dispatch({ type: 'game/endHeroPhase' });
      store.dispatch({ type: 'game/endExplorationPhase' });
      
      // Manually trigger monster activation
      store.dispatch({ type: 'game/activateNextMonster', payload: {} });
      
      // Return the state for verification
      return store.getState();
    });

    // Kobold should NOT have attacked (it just moved)
    // It has attack-only tactic, so it doesn't do move-and-attack
    expect(result.game.monsterAttackResult).toBeNull();
    
    // Monster should have moved closer to the hero
    const monster = result.game.monsters[0];
    // Original position was (2, 2), should have moved toward (2, 5)
    expect(monster.position.y).toBeGreaterThan(2);
  });

  test('Monster attacks use updated stats from monster cards', async ({ page }) => {
    // STEP 1: Navigate to character selection and select Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // STEP 2: Set up test scenario and verify attack stats
    const result = await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Seed Math.random for deterministic attack roll
      const originalRandom = Math.random;
      Math.random = () => 0.5; // Roll 11
      
      // Move Quinn to (2, 5)
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 5 } }
      });
      
      // Add a kobold monster adjacent to Quinn (2, 6)
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-test',
          position: { x: 2, y: 6 },
          currentHp: 1,
          controllerId: 'quinn',
          tileId: 'start-tile'
        }]
      });
      
      // Transition to villain phase
      store.dispatch({ type: 'game/endHeroPhase' });
      store.dispatch({ type: 'game/endExplorationPhase' });
      
      // Manually trigger monster activation
      store.dispatch({ type: 'game/activateNextMonster', payload: {} });
      
      // Restore Math.random
      Math.random = originalRandom;
      
      // Return the state for verification
      return store.getState();
    });

    expect(result.game.monsterAttackResult).not.toBeNull();
    
    // Kobold has +7 attack bonus per monster card (updated from old +5)
    const attackResult = result.game.monsterAttackResult;
    expect(attackResult.attackBonus).toBe(7);
    // Roll 11 + 7 = 18 total
    expect(attackResult.total).toBe(18);
    // 18 >= Quinn's AC of 17, so should hit
    expect(attackResult.isHit).toBe(true);
    expect(attackResult.damage).toBe(1);
  });
});
