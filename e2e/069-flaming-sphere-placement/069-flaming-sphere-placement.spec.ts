import { test, expect } from '@playwright/test';
import { createScreenshotHelper, dismissScenarioIntroduction } from '../helpers/screenshot-helper';

test.describe('069 - Flaming Sphere Token Placement UI', () => {
  test('User can activate Flaming Sphere and place it via UI', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection and select Haskan (Wizard with Flaming Sphere)
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-haskan-bottom"]').click();

    // Select power cards for Haskan, explicitly choosing Flaming Sphere (ID 45)
    await page.locator('[data-testid="select-powers-haskan"]').click();
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'visible' });
    
    // Select Flaming Sphere (ID 45) as daily - need to expand and select
    await page.locator('[data-testid="daily-card-45"]').click();
    await page.locator('[data-testid="expanded-card"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="select-expanded-card"]').click();
    
    // Close power selection modal
    await page.locator('[data-testid="done-power-selection"]').click();
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'hidden' });

    await screenshots.capture(page, 'hero-selected', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="hero-haskan-bottom"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled();
        
        // Verify power cards are pre-selected
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.heroes.powerCardSelections.haskan.daily).toBe(45); // Flaming Sphere
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
        payload: { heroId: 'haskan', position: { x: 2, y: 3 } }
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

    // STEP 3: Click the Flaming Sphere card to show Power Card Details Panel
    await page.locator('[data-testid="power-card-45"]').click();
    
    // Wait for details panel to appear
    await page.waitForTimeout(300);
    
    // Verify Power Card Details Panel is shown
    await expect(page.locator('[data-testid="power-card-details-panel"]')).toBeVisible();

    await screenshots.capture(page, 'flaming-sphere-card-selected', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="power-card-details-panel"]')).toBeVisible();
        await expect(page.locator('[data-testid="activate-flaming-sphere-button"]')).toBeVisible();
        await expect(page.locator('[data-testid="power-card-45"]')).toHaveClass(/selected/);
      }
    });
    
    // STEP 4: Click the "Activate" button to start flaming sphere placement
    await page.locator('[data-testid="activate-flaming-sphere-button"]').click();
    
    // Wait for square selection mode
    await page.waitForTimeout(300);
    
    // Verify selectable squares appear
    const selectableSquares = page.locator('[data-testid^="selectable-square-"]');
    await expect(selectableSquares.first()).toBeVisible();

    await screenshots.capture(page, 'square-selection-ui', {
      programmaticCheck: async () => {
        // Verify flaming sphere selection UI shows
        await expect(page.locator('[data-testid="flaming-sphere-selection"]')).toBeVisible();
        
        // Verify selectable squares exist
        const squares = page.locator('[data-testid^="selectable-square-"]');
        const count = await squares.count();
        expect(count).toBeGreaterThan(0);
        
        // Verify cancel button exists
        await expect(page.locator('[data-testid="cancel-selection-button"]')).toBeVisible();
      }
    });

    // STEP 5: Click a square on the map
    await selectableSquares.first().click();
    await page.waitForTimeout(150);

    await screenshots.capture(page, 'square-selected', {
      programmaticCheck: async () => {
        // Verify confirm button is visible after selection
        await expect(page.locator('[data-testid="confirm-placement-button"]')).toBeVisible();
        
        // Verify selected square visual
        const selectedSquare = page.locator('.selectable-square.selected');
        await expect(selectedSquare).toBeVisible();
      }
    });

    // STEP 6: Click confirm button to place token
    const confirmButton = page.locator('[data-testid="confirm-placement-button"]');
    await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
    await expect(confirmButton).toBeVisible();
    await expect(confirmButton).toBeEnabled();
    
    await confirmButton.click();
    
    // Wait for token to be placed
    await page.waitForTimeout(500);
    
    // Verify token was placed
    const tokensPlaced = await page.evaluate(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.boardTokens.length;
    });
    
    expect(tokensPlaced).toBe(1);
    
    // Wait for UI to update
    await page.waitForTimeout(500);

    await screenshots.capture(page, 'token-placed-on-board', {
      programmaticCheck: async () => {
        // Verify token was added to the store
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.boardTokens).toHaveLength(1);
        expect(storeState.game.boardTokens[0].type).toBe('flaming-sphere');
        expect(storeState.game.boardTokens[0].powerCardId).toBe(45);
        expect(storeState.game.boardTokens[0].ownerId).toBe('haskan');
        expect(storeState.game.boardTokens[0].charges).toBe(3);
        expect(storeState.game.boardTokens[0].canMove).toBe(true);
        
        // Wait for rendering
        await page.waitForTimeout(500);
        
        // Verify token is rendered on the board
        const boardTokens = page.locator('[data-testid="board-token"]');
        await expect(boardTokens).toHaveCount(1);
        
        // Verify correct token type
        const token = boardTokens.first();
        await expect(token).toHaveAttribute('data-token-type', 'flaming-sphere');
        
        // Verify Flaming Sphere card is marked as used
        const flamingSphereCard = page.locator('[data-testid="power-card-45"]');
        await expect(flamingSphereCard).toHaveClass(/disabled|flipped/);
        
        // Verify card is flipped in store
        const cardStates = storeState.heroes.heroPowerCards.haskan.cardStates;
        const flamingSphereState = cardStates.find((s: { cardId: number }) => s.cardId === 45);
        expect(flamingSphereState?.isFlipped).toBe(true);
      }
    });
  });
});
