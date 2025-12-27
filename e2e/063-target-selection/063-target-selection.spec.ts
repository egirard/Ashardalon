import { test, expect } from '@playwright/test';
import { selectDefaultPowerCards } from '../helpers/screenshot-helper';

test.describe('063 - Target Selection on Map', () => {
  test('Player can select targets by tapping on the map', async ({ page }) => {
    // STEP 1: Navigate to character selection and select Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // STEP 2: Set up Quinn at north edge for exploration
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 0 } }
      });
    });

    // Verify Quinn is at north edge
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 0 });
    }).toPass();

    // STEP 3: End hero phase to trigger exploration and spawn a monster
    await page.locator('[data-testid="end-phase-button"]').click();
    
    // Wait for monster card and dismiss it
    await page.locator('[data-testid="monster-card"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="dismiss-monster-card"]').click();
    await expect(page.locator('[data-testid="monster-card"]')).not.toBeVisible();

    // Complete turn cycle to get back to Hero Phase
    await page.locator('[data-testid="end-phase-button"]').click(); // End exploration
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Villain Phase');
    
    // Skip villain phase complications by directly setting the turn phase
    // and clearing any modal dialogs
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // Clear any lingering combat results or notifications
      store.dispatch({ type: 'game/dismissAttackResult' });
      store.dispatch({ type: 'game/dismissMonsterAttackResult' });
      store.dispatch({ type: 'game/dismissMonsterMoveAction' });
      store.dispatch({ type: 'game/dismissEncounterCard' });
      store.dispatch({ type: 'game/dismissEncounterResult' });
      // Set phase to hero-phase and reset hero actions
      store.dispatch({
        type: 'game/setTurnPhase',
        payload: 'hero-phase'
      });
      store.dispatch({
        type: 'game/setHeroTurnActions',
        payload: { actionsTaken: [], canMove: true, canAttack: true }
      });
    });
    
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');

    // Replace spawned monster with kobold for consistency
    const spawnedMonster = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState().game.monsters[0];
    });
    await page.evaluate((monster) => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          ...monster,
          monsterId: 'kobold',
          instanceId: 'kobold-test'
        }]
      });
    }, spawnedMonster);

    // STEP 4: Move Quinn adjacent to the monster
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: -3 } }
      });
    });
    
    // Wait for UI to update
    await page.waitForTimeout(100);
    
    // STEP 5: Verify monster is targetable (has highlight)
    // Programmatic check: monster token should have data-targetable="true"
    const monsterToken = page.locator('[data-testid="monster-token"][data-monster-id="kobold-test"]');
    await expect(monsterToken).toBeVisible();
    await expect(monsterToken).toHaveAttribute('data-targetable', 'true');
    
    // Verify monster is not selected initially
    await expect(monsterToken).toHaveAttribute('data-selected', 'false');
    
    // Verify no target is selected in store
    const initialState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState().game;
    });
    expect(initialState.selectedTargetId).toBeNull();
    expect(initialState.selectedTargetType).toBeNull();

    // STEP 6: Click on the monster to select it
    await monsterToken.click({ force: true }); // Use force to bypass any overlapping elements
    
    // Wait for selection to update
    await page.waitForTimeout(50);
    
    // Verify monster is now selected
    await expect(monsterToken).toHaveAttribute('data-selected', 'true');
    
    // Verify selection is reflected in store
    const selectedState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState().game;
    });
    expect(selectedState.selectedTargetId).toBe('kobold-test');
    expect(selectedState.selectedTargetType).toBe('monster');

    // STEP 7: Click on the monster again to deselect it  
    await monsterToken.click({ force: true }); // Use force to bypass any overlapping elements
    
    // Wait for deselection to update
    await page.waitForTimeout(50);
    
    // Verify monster is no longer selected
    await expect(monsterToken).toHaveAttribute('data-selected', 'false');
    
    // Verify deselection is reflected in store
    const deselectedState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState().game;
    });
    expect(deselectedState.selectedTargetId).toBeNull();
    expect(deselectedState.selectedTargetType).toBeNull();

    // STEP 8: Verify final state - target should be deselected after step 7
    const finalState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState().game;
    });
    expect(finalState.selectedTargetId).toBeNull();
    expect(finalState.selectedTargetType).toBeNull();
  });
});
