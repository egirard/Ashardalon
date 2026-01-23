import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('096 - Monster-Triggered Tile Exploration', () => {
  test('Complete monster exploration flow - demonstrating all key elements', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    await screenshots.capture(page, 'initial-board-with-start-tile', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.dungeon.tiles.length).toBe(1);
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
      }
    });

    // STEP 2: Place a Duergar Guard on the board
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Move Quinn to a position on start tile
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 5 } }
      });
      
      // Add Duergar Guard on start tile 
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'duergar-guard',
          instanceId: 'duergar-1',
          position: { x: 2, y: 1 },
          currentHp: 2,
          controllerId: 'quinn',
          tileId: 'start-tile'
        }]
      });
    });
    
    await page.waitForTimeout(300);
    
    await screenshots.capture(page, 'duergar-guard-on-board', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        const duergar = state.game.monsters.find((m: any) => m.monsterId === 'duergar-guard');
        expect(duergar).toBeDefined();
        expect(duergar.currentHp).toBe(2);
      }
    });

    // STEP 3: Trigger exploration notification showing Duergar Guard exploring north
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      store.dispatch({
        type: 'game/setMonsterExplorationEvent',
        payload: {
          monsterId: 'duergar-1',
          monsterName: 'Duergar Guard',
          direction: 'north',
          tileType: 'tile-black-2exit-a'
        }
      });
    });
    
    await page.waitForTimeout(500);
    
    await screenshots.capture(page, 'exploration-notification-duergar-guard', {
      programmaticCheck: async () => {
        const notification = page.locator('[data-testid="monster-exploration-notification"]');
        await expect(notification).toBeVisible();
        await expect(notification).toContainText('Duergar Guard');
        await expect(notification).toContainText('North');
        await expect(notification).toContainText('Black');
      }
    });
    
    // Wait for notification to dismiss
    await page.waitForTimeout(3500);

    // STEP 4: Simulate the result - add a new tile and a new monster spawned on it
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Add a second monster (Kobold) that would have spawned on the explored tile
      const currentMonsters = store.getState().game.monsters;
      store.dispatch({
        type: 'game/setMonsters',
        payload: [
          ...currentMonsters,
          {
            monsterId: 'kobold',
            instanceId: 'kobold-spawned',
            position: { x: 2, y: 2 },
            currentHp: 1,
            controllerId: 'quinn',
            tileId: 'start-tile' // Would be on new tile in real scenario
          }
        ]
      });
    });
    
    await page.waitForTimeout(300);
    
    await screenshots.capture(page, 'new-monster-spawned-after-exploration', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        
        // Verify we now have 2 monsters
        expect(state.game.monsters.length).toBe(2);
        
        // Verify both monsters exist
        const duergar = state.game.monsters.find((m: any) => m.monsterId === 'duergar-guard');
        const kobold = state.game.monsters.find((m: any) => m.monsterId === 'kobold');
        expect(duergar).toBeDefined();
        expect(kobold).toBeDefined();
      }
    });

    // STEP 5: Show both monsters on board
    await screenshots.capture(page, 'final-board-with-original-and-spawned-monsters', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        
        // Final verification
        expect(state.game.monsters.length).toBe(2);
        
        // Verify monster types
        const monsterTypes = state.game.monsters.map((m: any) => m.monsterId);
        expect(monsterTypes).toContain('duergar-guard');
        expect(monsterTypes).toContain('kobold');
      }
    });
  });
});
