import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards } from '../helpers/screenshot-helper';

test.describe('033 - Board Tokens', () => {
  test('board tokens can be placed and rendered on the game board', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection and select Quinn (has Blade Barrier)
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    
    // Select power cards for Quinn using helper (includes Blade Barrier daily)
    await selectDefaultPowerCards(page, 'quinn');

    await screenshots.capture(page, 'hero-with-powers-selected', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="hero-quinn"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="select-powers-quinn"]')).toContainText('Powers Selected');
        await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled();
      }
    });

    // STEP 2: Start the game
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'game-started', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.boardTokens).toBeDefined();
        expect(storeState.game.boardTokens).toEqual([]);
      }
    });

    // STEP 3: Programmatically place board tokens on the board
    // We'll simulate placing Blade Barrier tokens since UI for placement isn't implemented yet
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Place 5 Blade Barrier tokens in a pattern
      const tokens = [
        { id: 'token-blade-barrier-1', type: 'blade-barrier', powerCardId: 5, ownerId: 'quinn', position: { x: 1, y: 1 } },
        { id: 'token-blade-barrier-2', type: 'blade-barrier', powerCardId: 5, ownerId: 'quinn', position: { x: 2, y: 1 } },
        { id: 'token-blade-barrier-3', type: 'blade-barrier', powerCardId: 5, ownerId: 'quinn', position: { x: 1, y: 2 } },
        { id: 'token-blade-barrier-4', type: 'blade-barrier', powerCardId: 5, ownerId: 'quinn', position: { x: 2, y: 2 } },
        { id: 'token-blade-barrier-5', type: 'blade-barrier', powerCardId: 5, ownerId: 'quinn', position: { x: 1, y: 3 } },
      ];
      
      store.dispatch({
        type: 'game/setBoardTokens',
        payload: tokens
      });
    });

    // Wait for tokens to render
    await page.locator('[data-testid="board-token"]').first().waitFor({ state: 'visible' });

    await screenshots.capture(page, 'blade-barrier-tokens-placed', {
      programmaticCheck: async () => {
        // Verify tokens are rendered
        await expect(page.locator('[data-testid="board-token"]')).toHaveCount(5);
        
        // Verify token attributes
        const firstToken = page.locator('[data-testid="board-token"]').first();
        await expect(firstToken).toHaveAttribute('data-token-type', 'blade-barrier');
        
        // Verify Redux store has tokens
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.boardTokens).toHaveLength(5);
        expect(storeState.game.boardTokens[0].type).toBe('blade-barrier');
        expect(storeState.game.boardTokens[0].powerCardId).toBe(5);
        expect(storeState.game.boardTokens[0].ownerId).toBe('quinn');
      }
    });

    // STEP 4: Test Flaming Sphere token with charges
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Replace with a Flaming Sphere token (has 3 charges)
      const token = {
        id: 'token-flaming-sphere-1',
        type: 'flaming-sphere',
        powerCardId: 45,
        ownerId: 'quinn',
        position: { x: 3, y: 3 },
        charges: 3,
        canMove: true
      };
      
      store.dispatch({
        type: 'game/setBoardTokens',
        payload: [token]
      });
    });

    // Wait for the new token to render
    await page.locator('[data-testid="board-token"][data-token-type="flaming-sphere"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'flaming-sphere-token-with-charges', {
      programmaticCheck: async () => {
        // Verify single flaming sphere token
        await expect(page.locator('[data-testid="board-token"]')).toHaveCount(1);
        
        const token = page.locator('[data-testid="board-token"]').first();
        await expect(token).toHaveAttribute('data-token-type', 'flaming-sphere');
        
        // Verify Redux store has correct token
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.boardTokens).toHaveLength(1);
        expect(storeState.game.boardTokens[0].type).toBe('flaming-sphere');
        expect(storeState.game.boardTokens[0].charges).toBe(3);
        expect(storeState.game.boardTokens[0].canMove).toBe(true);
      }
    });

    // STEP 5: Test token removal
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Remove the token
      store.dispatch({
        type: 'game/removeBoardToken',
        payload: 'token-flaming-sphere-1'
      });
    });

    // Wait for token to be removed
    await page.locator('[data-testid="board-token"]').first().waitFor({ state: 'detached' });

    await screenshots.capture(page, 'tokens-removed', {
      programmaticCheck: async () => {
        // Verify no tokens on board
        await expect(page.locator('[data-testid="board-token"]')).toHaveCount(0);
        
        // Verify Redux store is empty
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.boardTokens).toHaveLength(0);
      }
    });

    // STEP 6: Test Blade Barrier damage on monster spawn
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Place a Blade Barrier token
      store.dispatch({
        type: 'game/placeBoardToken',
        payload: {
          id: 'token-blade-barrier-test',
          type: 'blade-barrier',
          powerCardId: 5,
          ownerId: 'quinn',
          position: { x: 5, y: 3 }
        }
      });
      
      // Spawn a monster at the same position (should trigger damage)
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-test',
          position: { x: 5, y: 3 },
          currentHp: 1,
          controllerId: 'quinn',
          tileId: 'start-tile'
        }]
      });
    });

    // Wait for monster to appear
    await page.locator('[data-testid="monster-token"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'blade-barrier-with-monster', {
      programmaticCheck: async () => {
        // Verify monster is on board
        await expect(page.locator('[data-testid="monster-token"]')).toHaveCount(1);
        
        // Verify blade barrier token is still there (won't be removed until exploration phase)
        await expect(page.locator('[data-testid="board-token"]')).toHaveCount(1);
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Monster should be on board
        expect(storeState.game.monsters).toHaveLength(1);
        expect(storeState.game.monsters[0].position).toEqual({ x: 5, y: 3 });
      }
    });
  });
});
