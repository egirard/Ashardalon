import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction } from '../helpers/screenshot-helper';

test.describe('066 - Blade Barrier Token Placement', () => {
  test('Blade Barrier card is eligible and programmatic token placement works', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection and select Quinn (Cleric with Blade Barrier)
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();

    // Select power cards for Quinn, explicitly choosing Blade Barrier (ID 5)
    await page.locator('[data-testid="select-powers-quinn"]').click();
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'visible' });
    
    // Select Blade Barrier (ID 5) as daily - need to expand and select
    await page.locator('[data-testid="daily-card-5"]').click();
    await page.locator('[data-testid="expanded-card"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="select-expanded-card"]').click();
    
    // Close power selection modal
    await page.locator('[data-testid="done-power-selection"]').click();
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'hidden' });

    await screenshots.capture(page, 'hero-selected', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="hero-quinn-bottom"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled();
        
        // Verify power cards are pre-selected (stored in powerCardSelections, not heroPowerCards yet)
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.heroes.powerCardSelections.quinn.daily).toBe(5); // Blade Barrier
      }
    });

    // STEP 2: Start the game
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Set deterministic hero position for consistent screenshots
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 3 } }
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
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
        await expect(page.locator('[data-testid="player-power-cards"]')).toBeVisible();
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.turnState.currentPhase).toBe('hero-phase');
        expect(storeState.game.boardTokens).toEqual([]);
      }
    });

    // STEP 3: Verify Blade Barrier card is eligible and visible
    await screenshots.capture(page, 'blade-barrier-eligible', {
      programmaticCheck: async () => {
        const bladeBarrierCard = page.locator('[data-testid="power-card-5"]');
        await expect(bladeBarrierCard).toBeVisible();
        await expect(bladeBarrierCard).toBeEnabled();
        await expect(bladeBarrierCard).toHaveClass(/eligible/);
        
        // Verify it's marked as daily (D)
        await expect(bladeBarrierCard.locator('.power-type')).toContainText('D');
      }
    });

    // STEP 4: Programmatically place tokens (UI interaction will be tested manually)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Create 5 Blade Barrier tokens
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
      
      // Mark card as used
      store.dispatch({
        type: 'heroes/usePowerCard',
        payload: { heroId: 'quinn', cardId: 5 }
      });
    });

    // Wait for tokens to render
    await page.locator('[data-testid="board-token"]').first().waitFor({ state: 'visible' });

    await screenshots.capture(page, 'tokens-placed-on-board', {
      programmaticCheck: async () => {
        // Verify 5 board tokens are rendered
        await expect(page.locator('[data-testid="board-token"]')).toHaveCount(5);
        
        // Verify tokens are blade-barrier type
        const firstToken = page.locator('[data-testid="board-token"]').first();
        await expect(firstToken).toHaveAttribute('data-token-type', 'blade-barrier');
        
        // Verify Blade Barrier card is now marked as used
        const bladeBarrierCard = page.locator('[data-testid="power-card-5"]');
        await expect(bladeBarrierCard).toHaveClass(/disabled/);
        await expect(bladeBarrierCard.locator('[aria-label="Used"]')).toBeVisible();
        
        // Verify Redux store
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        expect(storeState.game.boardTokens).toHaveLength(5);
        expect(storeState.game.boardTokens[0].type).toBe('blade-barrier');
        expect(storeState.game.boardTokens[0].powerCardId).toBe(5);
        expect(storeState.game.boardTokens[0].ownerId).toBe('quinn');
        
        // Verify card is flipped
        const cardStates = storeState.heroes.heroPowerCards.quinn.cardStates;
        const bladeBarrierState = cardStates.find((s: { cardId: number }) => s.cardId === 5);
        expect(bladeBarrierState?.isFlipped).toBe(true);
      }
    });
  });
});
