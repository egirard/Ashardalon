import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction } from '../helpers/screenshot-helper';

test.describe('008 - Spawn Monster on Exploration', () => {
  test('Monster appears on newly placed tile at black spot position', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection and select Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    // Select power cards for Quinn
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Move Quinn to north edge for exploration
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 0 } }
      });
    });

    // Wait for position to be applied
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 0 });
    }).toPass();

    await screenshots.capture(page, 'tile-placed-ready', {
      programmaticCheck: async () => {
        // Verify hero is at north edge
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 0 });
        
        // Verify we're in hero phase
        await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');
        
        // Verify no monsters yet
        expect(storeState.game.monsters).toHaveLength(0);
      }
    });

    // STEP 2: End hero phase to trigger exploration and monster spawn
    await page.locator('[data-testid="end-phase-button"]').click();

    // Wait for monster card to appear
    await page.locator('[data-testid="monster-card"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'monster-spawns-at-black-spot', {
      programmaticCheck: async () => {
        // Verify monster card is displayed
        await expect(page.locator('[data-testid="monster-card"]')).toBeVisible();
        
        // Verify monster name is shown
        await expect(page.locator('[data-testid="monster-name"]')).toBeVisible();
        
        // Verify monster stats (AC, HP) are shown
        await expect(page.locator('[data-testid="monster-ac"]')).toBeVisible();
        await expect(page.locator('[data-testid="monster-hp"]')).toBeVisible();
        
        // Verify Redux store state - monster should be spawned
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Should have 1 monster
        expect(storeState.game.monsters).toHaveLength(1);
        
        // Monster should be controlled by Quinn
        expect(storeState.game.monsters[0].controllerId).toBe('quinn');
        
        // Should have a recently spawned monster ID
        expect(storeState.game.recentlySpawnedMonsterId).not.toBeNull();
        
        // IMPORTANT: Verify monster spawns at black spot position
        // When exploring north (placing tile north), tile has 0° rotation (arrow points south)
        // Black spot is at local position (2, 1) - the dark circular marking on the tile
        const monster = storeState.game.monsters[0];
        expect(monster.position).toEqual({ x: 2, y: 1 });
      }
    });

    // STEP 3: Dismiss the monster card and verify token is visible
    await page.locator('[data-testid="dismiss-monster-card"]').click();
    
    // Wait for card to be dismissed
    await expect(page.locator('[data-testid="monster-card"]')).not.toBeVisible();

    await screenshots.capture(page, 'monster-at-black-spot-dismissed', {
      programmaticCheck: async () => {
        // Verify monster card is no longer visible
        await expect(page.locator('[data-testid="monster-card"]')).not.toBeVisible();
        
        // Verify monster token is visible on the board
        await expect(page.locator('[data-testid="monster-token"]')).toBeVisible();
        
        // Verify Redux store - recently spawned ID should be cleared
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.recentlySpawnedMonsterId).toBeNull();
        
        // Monster should still exist in state
        expect(storeState.game.monsters).toHaveLength(1);
        
        // Verify monster is still at black spot position
        expect(storeState.game.monsters[0].position).toEqual({ x: 2, y: 1 });
        
        // Verify we're in exploration phase
        await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');
      }
    });
  });

  test('Monster card shows correct stats', async ({ page }) => {
    // Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    // Select power cards for Quinn
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Move Quinn to south edge
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 7 } }
      });
    });

    // End hero phase to trigger exploration
    await page.locator('[data-testid="end-phase-button"]').click();
    
    // Wait for monster card
    await page.locator('[data-testid="monster-card"]').waitFor({ state: 'visible' });

    // Verify the monster card has all required elements
    await expect(page.locator('[data-testid="monster-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="monster-ac"]')).toBeVisible();
    await expect(page.locator('[data-testid="monster-hp"]')).toBeVisible();
    await expect(page.locator('[data-testid="monster-xp"]')).toBeVisible();

    // Get monster stats from the card
    const monsterName = await page.locator('[data-testid="monster-name"]').textContent();
    const monsterAC = await page.locator('[data-testid="monster-ac"]').textContent();
    const monsterHP = await page.locator('[data-testid="monster-hp"]').textContent();

    // Verify stats are numbers (not empty)
    expect(monsterName).toBeTruthy();
    expect(monsterAC).toMatch(/^\d+$/);
    expect(monsterHP).toMatch(/^\d+$/);
  });

  test('No monster spawns when hero is not on edge', async ({ page }) => {
    // Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    // Select power cards for Quinn
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Move Quinn to center (not on edge)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 3 } }
      });
    });

    // End hero phase
    await page.locator('[data-testid="end-phase-button"]').click();
    
    // Wait for phase change
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');

    // Verify no monster card is shown
    await expect(page.locator('[data-testid="monster-card"]')).not.toBeVisible();

    // Verify no monsters in state
    const storeState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(storeState.game.monsters).toHaveLength(0);
  });
});
