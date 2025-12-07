import { test, expect } from '@playwright/test';
import { selectDefaultPowerCards } from '../helpers/screenshot-helper';

test.describe('034 - Status Effects', () => {
  test('Apply and display hero status effects', async ({ page }) => {
    // STEP 1: Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Verify initial state - no status effects
    const initialState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(initialState.game.heroHp[0].statuses).toEqual([]);
    
    // Verify no condition badges displayed initially
    await expect(page.locator('[data-testid="player-card-conditions"]')).not.toBeVisible();

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

    // Verify poisoned status was applied
    const stateAfterPoison = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(stateAfterPoison.game.heroHp[0].statuses).toHaveLength(1);
    expect(stateAfterPoison.game.heroHp[0].statuses[0].type).toBe('poisoned');

    // STEP 3: Verify status effect is displayed in UI
    await expect(page.locator('[data-testid="player-card-conditions"]')).toBeVisible();
    await expect(page.locator('[data-testid="condition-poisoned"]')).toBeVisible();
    await expect(page.locator('[data-testid="condition-poisoned"]')).toContainText('🤢');

    // STEP 4: Apply multiple status effects
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

    // Verify all three statuses are applied
    const stateWithMultiple = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(stateWithMultiple.game.heroHp[0].statuses).toHaveLength(3);

    // Verify all badges are displayed
    await expect(page.locator('[data-testid="condition-poisoned"]')).toBeVisible();
    await expect(page.locator('[data-testid="condition-dazed"]')).toBeVisible();
    await expect(page.locator('[data-testid="condition-slowed"]')).toBeVisible();
    
    // Verify correct icons
    await expect(page.locator('[data-testid="condition-dazed"]')).toContainText('😵');
    await expect(page.locator('[data-testid="condition-slowed"]')).toContainText('🐌');

    // STEP 5: Remove one status
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

    // Verify poisoned was removed but others remain
    const stateAfterRemoval = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(stateAfterRemoval.game.heroHp[0].statuses).toHaveLength(2);
    expect(stateAfterRemoval.game.heroHp[0].statuses.find((s: any) => s.type === 'poisoned')).toBeUndefined();

    // Verify poisoned badge is gone but others remain
    await expect(page.locator('[data-testid="condition-poisoned"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="condition-dazed"]')).toBeVisible();
    await expect(page.locator('[data-testid="condition-slowed"]')).toBeVisible();
  });

  test('Process status effects with processHeroStatusEffects action', async ({ page }) => {
    // STEP 1: Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Get initial HP
    const initialState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    const initialHp = initialState.game.heroHp[0].currentHp;
    expect(initialHp).toBe(8);

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

    // Verify status was applied
    const stateWithStatus = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(stateWithStatus.game.heroHp[0].statuses).toHaveLength(1);
    expect(stateWithStatus.game.heroHp[0].currentHp).toBe(8); // HP not yet reduced

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

    // STEP 4: Verify ongoing damage was applied
    const stateAfterProcess = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    
    // HP should be reduced by 2
    expect(stateAfterProcess.game.heroHp[0].currentHp).toBe(6);
    
    // Status should still be present (no duration limit)
    expect(stateAfterProcess.game.heroHp[0].statuses).toHaveLength(1);
    
    // Verify HP is displayed correctly
    await expect(page.locator('[data-testid="hero-hp"]')).toContainText('HP: 6/8');
  });

  test('Monster status effects display on monster token', async ({ page }) => {
    // STEP 1: Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

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

    // Verify monster has status
    const stateWithMonsterStatus = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(stateWithMonsterStatus.game.monsters).toHaveLength(1);
    expect(stateWithMonsterStatus.game.monsters[0].statuses).toHaveLength(1);
    expect(stateWithMonsterStatus.game.monsters[0].statuses[0].type).toBe('slowed');

    // STEP 3: Verify status badge is displayed on monster token
    await expect(page.locator('[data-testid="monster-token"]')).toBeVisible();
    await expect(page.locator('[data-testid="monster-status-badges"]')).toBeVisible();
    await expect(page.locator('[data-testid="monster-status-slowed"]')).toBeVisible();
    await expect(page.locator('[data-testid="monster-status-slowed"]')).toContainText('🐌');

    // STEP 4: Remove status and verify badge disappears
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

    // Verify status was removed
    const stateAfterRemoval = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(stateAfterRemoval.game.monsters[0].statuses).toHaveLength(0);

    // Verify status badge is no longer displayed
    await expect(page.locator('[data-testid="monster-status-badges"]')).not.toBeVisible();
  });
});
