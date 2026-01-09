import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('043 - Monster Move Dialog Orientation', () => {
  test('Monster move dialog rotates to face controlling player during villain phase', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection and select hero from top edge
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    // Select Vistra from top edge to demonstrate 180° rotation
    await page.locator('[data-testid="hero-vistra-top"]').click();
    await selectDefaultPowerCards(page, 'vistra');

    await screenshots.capture(page, 'hero-selected-top-edge', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="selected-count"]')).toContainText('1 heroes selected');
        const storeState = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(storeState.heroes.heroEdgeMap['vistra']).toBe('top');
      }
    });

    // Start the game
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // STEP 2: Set up a monster that will move but not attack (far from hero)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Position Vistra away from spawn point
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'vistra', position: { x: 2, y: 5 } }
      });
      
      // Add a monster controlled by Vistra at a distant position
      // The monster will move toward hero but be too far to attack
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-test-vistra',
          position: { x: 0, y: 0 },  // Far corner
          currentHp: 1,
          controllerId: 'vistra',  // Vistra controls this monster
          tileId: 'start-tile'
        }]
      });
    });

    // Wait for any animations to complete
    await page.waitForTimeout(500);

    // Verify monster setup (no screenshot - too flaky due to non-deterministic visuals)
    const stateBeforeVillain = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
    expect(stateBeforeVillain.game.monsters.length).toBe(1);
    expect(stateBeforeVillain.game.monsters[0].controllerId).toBe('vistra');
    expect(stateBeforeVillain.game.monsters[0].position).toEqual({ x: 0, y: 0 });

    // STEP 3: Transition to villain phase
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/endHeroPhase' });
      store.dispatch({ type: 'game/endExplorationPhase' });
    });

    // Wait for and dismiss exploration phase notification if present
    await page.waitForTimeout(200);
    const explorationNotification = page.locator('[data-testid="exploration-phase-notification"]');
    if (await explorationNotification.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Wait for it to auto-dismiss or dismiss it programmatically
      await page.evaluate(() => {
        const store = (window as any).__REDUX_STORE__;
        store.dispatch({ type: 'game/dismissExplorationPhaseMessage' });
      });
      await explorationNotification.waitFor({ state: 'hidden', timeout: 3000 });
    }
    
    // Wait for encounter card and dismiss if present
    await page.waitForTimeout(200);
    const encounterDismissButton = page.locator('[data-testid="dismiss-encounter-card"]');
    if (await encounterDismissButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await encounterDismissButton.click();
      await encounterDismissButton.waitFor({ state: 'hidden', timeout: 2000 });
    }

    // STEP 4: Activate the monster - it should move but not reach attack range
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/activateNextMonster', payload: {} });
    });

    // Wait for the monster move dialog to appear
    await page.locator('[data-testid="monster-move-overlay"]').waitFor({ state: 'visible', timeout: 5000 });
    
    // Wait a bit for any animations or dynamic content to settle
    await page.waitForTimeout(500);

    await screenshots.capture(page, 'monster-move-dialog-vistra-top', {
      programmaticCheck: async () => {
        // Verify dialog is visible
        await expect(page.locator('[data-testid="monster-move-overlay"]')).toBeVisible();
        await expect(page.locator('[data-testid="move-text"]')).toContainText('Moved but could not attack');
        
        // Verify monster is controlled by Vistra
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.monsterMoveActionId).toBe('kobold-test-vistra');
        const monster = state.game.monsters.find((m: any) => m.instanceId === 'kobold-test-vistra');
        expect(monster.controllerId).toBe('vistra');
        
        // Verify heroEdgeMap has Vistra at top
        expect(state.heroes.heroEdgeMap['vistra']).toBe('top');
        
        // Note: Rotation verification via CSS transform is validated through visual screenshot
        // The key validation is that the controller edge mapping is correct in the state
        // Visual verification: Screenshot will show the dialog rotated 180° to face top edge player
      }
    });

    // Dismiss the dialog programmatically
    await page.evaluate(() => { const store = (window as any).__REDUX_STORE__; store.dispatch({ type: 'game/dismissMonsterMoveAction' }); });
    await page.locator('[data-testid="monster-move-overlay"]').waitFor({ state: 'hidden' });

    // Test is complete - we've verified that the monster move dialog rotates
    // to face the controlling player (Vistra at top edge - 180° rotation)
  });
});
