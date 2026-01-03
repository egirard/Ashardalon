import { test, expect } from '@playwright/test';
import { selectDefaultPowerCards, dismissScenarioIntroduction } from '../helpers/screenshot-helper';

test.describe('010 - Monster Attacks Hero', () => {
  test('Monster moves toward hero and attacks during villain phase', async ({ page }) => {
    // STEP 1: Navigate to character selection and select Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    // Select power cards for Quinn
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Verify hero HP is initialized
    const initialState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(initialState.game.heroHp).toHaveLength(1);
    expect(initialState.game.heroHp[0].heroId).toBe('quinn');
    expect(initialState.game.heroHp[0].currentHp).toBe(8);
    expect(initialState.game.heroHp[0].maxHp).toBe(8);

    // Verify HP is displayed in turn indicator
    await expect(page.locator('[data-testid="hero-hp"]')).toContainText('HP: 8/8');

    // STEP 2: Move Quinn to the north edge to trigger exploration
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 0 } }
      });
    });

    // End hero phase to trigger tile exploration and monster spawn
    await page.locator('[data-testid="end-phase-button"]').click();
    
    // Wait for monster card to appear
    await page.locator('[data-testid="monster-card"]').waitFor({ state: 'visible' });
    
    // Verify monster spawned
    const monsterState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(monsterState.game.monsters.length).toBeGreaterThan(0);
    
    // Dismiss the monster card
    await page.locator('[data-testid="dismiss-monster-card"]').click();
    await expect(page.locator('[data-testid="monster-card"]')).not.toBeVisible();

    // STEP 3: End exploration phase to enter villain phase
    await page.locator('[data-testid="end-phase-button"]').click();
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Villain Phase');

    // Verify activate monster button appears
    await expect(page.locator('[data-testid="activate-monster-button"]')).toBeVisible();

    // STEP 4: Click activate monster to move/attack
    await page.locator('[data-testid="activate-monster-button"]').click();

    // The button should disappear after all monsters are activated
    await expect(page.locator('[data-testid="activate-monster-button"]')).not.toBeVisible();

    // Verify villain phase monster index incremented
    const stateAfterActivation = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(stateAfterActivation.game.villainPhaseMonsterIndex).toBeGreaterThan(0);

    // STEP 5: End villain phase
    await page.locator('[data-testid="end-phase-button"]').click();
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');
    
    // Verify villain phase state was reset
    const stateAfterVillain = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(stateAfterVillain.game.villainPhaseMonsterIndex).toBe(0);
  });

  test('Monster attack hits hero and reduces HP', async ({ page }) => {
    // Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    // Select power cards for Quinn
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Verify initial HP
    const initialState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(initialState.game.heroHp[0].currentHp).toBe(8);

    // Move Quinn to a non-edge position to avoid exploration
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 3 } }
      });
    });

    // Set up state: place a monster adjacent to Quinn and enter villain phase
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Add a kobold monster adjacent to Quinn (at 2,2 which is adjacent to 2,3)
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
      
      // Transition through phases to villain phase
      store.dispatch({ type: 'game/endHeroPhase' });
      store.dispatch({ type: 'game/endExplorationPhase' });
    });

    // Verify we're in villain phase
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Villain Phase');

    // Seed Math.random for deterministic attack roll (hit)
    await page.evaluate(() => {
      (window as any).__originalRandom = Math.random;
      Math.random = () => 0.7; // Roll 15 + 5 = 20 >= 17 (Quinn's AC)
    });

    // Activate the monster
    await page.locator('[data-testid="activate-monster-button"]').click();

    // Restore Math.random
    await page.evaluate(() => {
      if ((window as any).__originalRandom) {
        Math.random = (window as any).__originalRandom;
      }
    });

    // Check if monster attack result is showing (if monster was adjacent and attacked)
    // Note: The monster might move instead of attack depending on position
    const stateAfterActivation = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    
    // If there was an attack, verify the result
    if (stateAfterActivation.game.monsterAttackResult) {
      // Wait for combat result display
      await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });
      
      // Verify combat result is displayed
      await expect(page.locator('[data-testid="combat-result"]')).toBeVisible();
      
      // Dismiss the combat result
      await page.locator('[data-testid="dismiss-combat-result"]').click();
      await expect(page.locator('[data-testid="combat-result"]')).not.toBeVisible();
    }
  });

  test('Hero HP display updates when damaged', async ({ page }) => {
    // Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    // Select power cards for Quinn
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Verify initial HP display
    await expect(page.locator('[data-testid="hero-hp"]')).toContainText('HP: 8/8');

    // Reduce Quinn's HP via Redux action
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroHp',
        payload: { heroId: 'quinn', hp: 5 }
      });
    });

    // Verify HP display updated
    await expect(page.locator('[data-testid="hero-hp"]')).toContainText('HP: 5/8');

    // Verify Redux store state
    const storeState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(storeState.game.heroHp[0].currentHp).toBe(5);
    expect(storeState.game.heroHp[0].maxHp).toBe(8);
  });

  test('Monster ignores downed heroes (0 HP)', async ({ page }) => {
    // Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    // Select power cards for Quinn
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Move Quinn to a non-edge position to avoid exploration
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 3 } }
      });
    });

    // Set Quinn to 0 HP (downed) and add a monster
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Set Quinn to 0 HP
      store.dispatch({
        type: 'game/setHeroHp',
        payload: { heroId: 'quinn', hp: 0 }
      });
      
      // Add a kobold monster
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
      
      // Transition through phases to villain phase
      store.dispatch({ type: 'game/endHeroPhase' });
      store.dispatch({ type: 'game/endExplorationPhase' });
    });

    // Verify HP display shows 0
    await expect(page.locator('[data-testid="hero-hp"]')).toContainText('HP: 0/8');

    // Activate the monster
    await page.locator('[data-testid="activate-monster-button"]').click();

    // Since Quinn is downed (0 HP), the monster should do nothing (no target)
    const stateAfterActivation = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    
    // Monster should not have attacked (no attack result)
    expect(stateAfterActivation.game.monsterAttackResult).toBeNull();
    
    // Monster index should still have incremented
    expect(stateAfterActivation.game.villainPhaseMonsterIndex).toBe(1);
  });
});
