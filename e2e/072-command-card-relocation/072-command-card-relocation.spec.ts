import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from '../helpers/screenshot-helper';

test.describe('072 - Command Card Monster Relocation', () => {
  test('User can relocate a monster using the Command power card', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Navigate to game and select Quinn (Cleric) with Command card
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    // Select Quinn
    await page.locator('[data-testid="hero-quinn"]').click();
    await page.locator('[data-testid="hero-quinn"]').waitFor({ state: 'visible' });
    
    // Select Command as utility power
    await page.locator('text=Command').click();
    
    await screenshots.capture(page, 'quinn-selected-command', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="hero-quinn"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled();
      }
    });
    
    // Start the game
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'game-started', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
        await expect(page.locator('[data-testid="player-power-cards"]')).toBeVisible();
      }
    });
    
    // STEP 2: Use game state injection to set up test scenario
    // Place a monster on the same tile as the hero
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      
      // Place hero at position (1, 1)
      store.dispatch({
        type: 'game/setHeroTokens',
        payload: [{ heroId: 'quinn', position: { x: 1, y: 1 } }]
      });
      
      // Add a monster on the same tile (position 1, 2)
      const monsterInstance = {
        monsterId: 'kobold',
        instanceId: 'test-monster-1',
        position: { x: 1, y: 2 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'start-tile'
      };
      
      store.dispatch({
        type: 'game/setMonsters',
        payload: [monsterInstance]
      });
      
      // Make sure we have tiles to relocate to
      // The start tile should already be placed, ensure we have adjacent tiles
      const dungeon = state.game.dungeon;
      if (dungeon.tiles.length === 1) {
        // Add a tile to the north
        const newTile = {
          id: 'tile-north',
          definition: { id: 'chamber', name: 'Chamber' },
          position: { row: -1, col: 0 },
          rotation: 0,
          tileType: 'dungeon' as const
        };
        
        store.dispatch({
          type: 'game/setDungeon',
          payload: {
            ...dungeon,
            tiles: [...dungeon.tiles, newTile]
          }
        });
      }
    });
    
    await page.waitForTimeout(500); // Wait for state to update
    
    await screenshots.capture(page, 'monster-and-hero-on-tile', {
      programmaticCheck: async () => {
        const gameState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState().game;
        });
        
        expect(gameState.monsters.length).toBe(1);
        expect(gameState.heroTokens[0].position).toEqual({ x: 1, y: 1 });
        expect(gameState.monsters[0].position).toEqual({ x: 1, y: 2 });
      }
    });
    
    // STEP 3: Click on the Command card
    await page.locator('[data-testid="power-card-9"]').click();
    await page.locator('[data-testid="power-card-details-panel"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'command-card-details-shown', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="power-card-details-panel"]')).toBeVisible();
        await expect(page.locator('[data-testid="card-description"]')).toContainText('You utter a single word');
        await expect(page.locator('[data-testid="activate-power-button"]')).toBeVisible();
      }
    });
    
    // STEP 4: Click Activate button
    await page.locator('[data-testid="activate-power-button"]').click();
    await page.locator('[data-testid="monster-relocation-selection"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'monster-selection-prompt', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="monster-relocation-selection"]')).toBeVisible();
        await expect(page.locator('text=Select Monster')).toBeVisible();
        await expect(page.locator('text=Click a monster on your tile')).toBeVisible();
        await expect(page.locator('[data-testid="cancel-monster-relocation-button"]')).toBeVisible();
      }
    });
    
    // STEP 5: Click on the monster to select it
    // Find and click the monster token
    await page.locator('[data-monster-id="test-monster-1"]').first().click();
    await page.waitForTimeout(300);
    
    await screenshots.capture(page, 'monster-selected-tile-prompt', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="monster-relocation-selection"]')).toBeVisible();
        await expect(page.locator('text=Select Destination')).toBeVisible();
        await expect(page.locator('text=Click a tile within 2 tiles of your position')).toBeVisible();
      }
    });
    
    // STEP 6: Click on a destination tile (should be highlighted)
    // Click on the north tile
    await page.locator('[data-tile-id="tile-north"]').click();
    await page.waitForTimeout(500);
    
    await screenshots.capture(page, 'monster-relocated', {
      programmaticCheck: async () => {
        const gameState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState().game;
        });
        
        // Monster should have been moved to the new tile
        expect(gameState.monsters.length).toBe(1);
        expect(gameState.monsters[0].tileId).toBe('tile-north');
        
        // Power card should be flipped (used)
        const heroPowerCards = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState().heroes.heroPowerCards['quinn'];
        });
        const commandCardState = heroPowerCards.cardStates.find((s: any) => s.cardId === 9);
        expect(commandCardState.isFlipped).toBe(true);
      }
    });
  });
  
  test('User can cancel monster relocation at monster selection step', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // Similar setup as above
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    await page.locator('[data-testid="hero-quinn"]').click();
    await page.locator('text=Command').click();
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    
    // Set up test scenario with monster on same tile
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroTokens',
        payload: [{ heroId: 'quinn', position: { x: 1, y: 1 } }]
      });
      
      const monsterInstance = {
        monsterId: 'kobold',
        instanceId: 'test-monster-1',
        position: { x: 1, y: 2 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'start-tile'
      };
      
      store.dispatch({
        type: 'game/setMonsters',
        payload: [monsterInstance]
      });
    });
    
    await page.waitForTimeout(500);
    
    // Click on Command card and activate
    await page.locator('[data-testid="power-card-9"]').click();
    await page.locator('[data-testid="activate-power-button"]').click();
    await page.locator('[data-testid="monster-relocation-selection"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'cancel-at-monster-selection', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="monster-relocation-selection"]')).toBeVisible();
        await expect(page.locator('[data-testid="cancel-monster-relocation-button"]')).toBeVisible();
      }
    });
    
    // Click cancel button
    await page.locator('[data-testid="cancel-monster-relocation-button"]').click();
    await page.waitForTimeout(300);
    
    await screenshots.capture(page, 'cancelled-selection-ui-closed', {
      programmaticCheck: async () => {
        // Selection UI should be hidden
        await expect(page.locator('[data-testid="monster-relocation-selection"]')).not.toBeVisible();
        
        // Power card should NOT be flipped (not used)
        const heroPowerCards = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState().heroes.heroPowerCards['quinn'];
        });
        const commandCardState = heroPowerCards.cardStates.find((s: any) => s.cardId === 9);
        expect(commandCardState.isFlipped).toBe(false);
      }
    });
  });
});
