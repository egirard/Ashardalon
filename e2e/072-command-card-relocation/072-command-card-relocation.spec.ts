import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from '../helpers/screenshot-helper';

test.describe('072 - Command Card Monster Relocation', () => {
  test('User can relocate a monster using the Command power card', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Navigate to character selection and select Quinn (Cleric)
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();

    // Quinn has pre-selected power cards - we'll programmatically assign Command (ID 9) after game starts
    await screenshots.capture(page, 'quinn-selected', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="hero-quinn-bottom"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled();
      }
    });

    // STEP 2: Start the game
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    
    // Dismiss scenario introduction
    await page.locator('[data-testid="start-scenario-button"]').click();
    await page.locator('[data-testid="scenario-introduction"]').waitFor({ state: 'hidden' });

    // Set deterministic hero position and assign Command card programmatically
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 3 } }
      });
      
      // Replace utility card with Command (ID 9)
      store.dispatch({
        type: 'heroes/selectUtilityCard',
        payload: { heroId: 'quinn', cardId: 9 }
      });
    });

    // Disable animations for stable screenshots
    await page.addStyleTag({
      content: `
        * {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    });

    await screenshots.capture(page, 'game-started', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="player-power-cards"]')).toBeVisible();
        await expect(page.locator('[data-testid="power-card-9"]')).toBeVisible();
      }
    });
    
    // STEP 3: Set up test scenario - add a monster on the same tile as the hero and adjacent tiles
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      
      // Add a monster on the same tile as hero (position 2, 4)
      const monsterInstance = {
        monsterId: 'kobold',
        instanceId: 'test-monster-1',
        position: { x: 2, y: 4 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'start-tile'
      };
      
      store.dispatch({
        type: 'game/setMonsters',
        payload: [monsterInstance]
      });
      
      // Make sure we have tiles to relocate to by adding a north tile
      const dungeon = state.game.dungeon;
      if (dungeon.tiles.length === 1) {
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
            tiles: [...dungeon.tiles, newTile],
            unexploredEdges: dungeon.unexploredEdges.filter(e => e.direction !== 'north')
          }
        });
      }
    });
    
    // Wait for state to update
    await page.locator('[data-testid="monster-token"]').first().waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'monster-and-hero-on-tile', {
      programmaticCheck: async () => {
        const gameState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState().game;
        });
        
        expect(gameState.monsters.length).toBe(1);
        expect(gameState.heroTokens[0].position).toEqual({ x: 2, y: 3 });
        expect(gameState.monsters[0].position).toEqual({ x: 2, y: 4 });
      }
    });
    
    // STEP 4: Click on the Command card to show details panel
    await page.locator('[data-testid="power-card-9"]').click();
    await page.locator('[data-testid="power-card-details-panel"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'command-card-details-shown', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="power-card-details-panel"]')).toBeVisible();
        await expect(page.locator('[data-testid="card-description"]')).toContainText('You utter a single word');
        await expect(page.locator('[data-testid="activate-power-button"]')).toBeVisible();
      }
    });
    
    // STEP 5: Click Activate button to start monster selection
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
    
    // STEP 6: Click on the monster to select it
    await page.locator('[data-testid="monster-token"]').first().click();
    await page.locator('text=Select Destination').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'monster-selected-tile-prompt', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="monster-relocation-selection"]')).toBeVisible();
        await expect(page.locator('text=Select Destination')).toBeVisible();
        await expect(page.locator('text=Click a tile within 2 tiles of your position')).toBeVisible();
      }
    });
    
    // STEP 7: Click on a destination tile (should be highlighted)
    await page.locator('[data-tile-id="tile-north"]').click();
    await page.locator('[data-testid="monster-relocation-selection"]').waitFor({ state: 'hidden' });
    
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
    
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    
    // Dismiss scenario introduction
    await page.locator('[data-testid="start-scenario-button"]').click();
    await page.locator('[data-testid="scenario-introduction"]').waitFor({ state: 'hidden' });
    
    // Set up test scenario with monster on same tile and assign Command card
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 3 } }
      });
      
      // Replace utility card with Command (ID 9)
      store.dispatch({
        type: 'heroes/selectUtilityCard',
        payload: { heroId: 'quinn', cardId: 9 }
      });
      
      const monsterInstance = {
        monsterId: 'kobold',
        instanceId: 'test-monster-1',
        position: { x: 2, y: 4 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'start-tile'
      };
      
      store.dispatch({
        type: 'game/setMonsters',
        payload: [monsterInstance]
      });
    });
    
    // Disable animations
    await page.addStyleTag({
      content: `
        * {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    });
    
    await page.locator('[data-testid="monster-token"]').first().waitFor({ state: 'visible' });
    
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
    await page.locator('[data-testid="monster-relocation-selection"]').waitFor({ state: 'hidden' });
    
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
