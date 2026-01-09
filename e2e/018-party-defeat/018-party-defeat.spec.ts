import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('018 - Party Defeat', () => {
  test('Game ends when hero dies with no surges', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Start the game with Quinn and Vistra (need 2 heroes to test turn cycle properly)
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await page.locator('[data-testid="hero-vistra-bottom"]').click();
    // Select power cards for heroes
    await selectDefaultPowerCards(page, 'quinn');
    await selectDefaultPowerCards(page, 'vistra');
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Set deterministic positions and hide movement overlay
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 3 } }
      });
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'vistra', position: { x: 3, y: 3 } }
      });
      store.dispatch({ type: 'game/hideMovement' });
    });

    // STEP 2: Set party to 0 healing surges
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setPartyResources',
        payload: { healingSurges: 0 }
      });
    });

    await screenshots.capture(page, 'no-surges', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.partyResources.healingSurges).toBe(0);
        await expect(page.locator('[data-testid="surge-value"]')).toHaveText('0');
      }
    });

    // STEP 3: Set Quinn to 0 HP
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroHp',
        payload: { heroId: 'quinn', hp: 0 }
      });
    });

    await screenshots.capture(page, 'quinn-at-zero', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.heroHp.find((h: any) => h.heroId === 'quinn')?.currentHp).toBe(0);
      }
    });

    // STEP 4: End Quinn's turn to get to Vistra
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // End hero phase
      store.dispatch({ type: 'game/endHeroPhase' });
      // End exploration phase
      store.dispatch({ type: 'game/endExplorationPhase' });
      // End villain phase - now Vistra's turn
      store.dispatch({ type: 'game/endVillainPhase' });
    });

    await screenshots.capture(page, 'vistra-turn', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.turnState.currentHeroIndex).toBe(1); // Vistra's turn
        expect(storeState.game.currentScreen).toBe('game-board'); // Still in game
      }
    });

    // STEP 5: End Vistra's turn - This cycles back to Quinn
    // Since Quinn is at 0 HP and 0 surges, game should end in defeat
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // End hero phase
      store.dispatch({ type: 'game/endHeroPhase' });
      // End exploration phase
      store.dispatch({ type: 'game/endExplorationPhase' });
      // End villain phase - back to Quinn
      store.dispatch({ type: 'game/endVillainPhase' });
    });

    // Wait for defeat screen
    await page.locator('[data-testid="defeat-screen"]').waitFor({ state: 'visible' });

    // STEP 6: Verify defeat screen
    await screenshots.capture(page, 'defeat-screen', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.currentScreen).toBe('defeat');
        expect(storeState.game.defeatReason).toBe('Quinn fell with no healing surges remaining.');
        
        // Check UI elements
        await expect(page.locator('[data-testid="defeat-screen"]')).toBeVisible();
        await expect(page.locator('[data-testid="defeat-message"]')).toContainText('Quinn fell with no healing surges remaining');
      }
    });

    // STEP 7: Verify New Game button is available
    await screenshots.capture(page, 'new-game-button', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="new-game-button"]')).toBeVisible();
        await expect(page.locator('[data-testid="new-game-button"]')).toHaveText('New Game');
      }
    });

    // STEP 8: Click New Game button and verify return to character select
    await page.locator('[data-testid="new-game-button"]').click();
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'new-game-started', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.currentScreen).toBe('character-select');
        expect(storeState.game.defeatReason).toBeNull();
        await expect(page.locator('[data-testid="character-select"]')).toBeVisible();
      }
    });
  });

  test('Game does not end if healing surge is available', async ({ page }) => {
    // Start game with two heroes
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await page.locator('[data-testid="hero-vistra-bottom"]').click();
    // Select power cards for heroes
    await selectDefaultPowerCards(page, 'quinn');
    await selectDefaultPowerCards(page, 'vistra');
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Set up state - Quinn at 0 HP, but 1 surge available
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 3 } }
      });
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'vistra', position: { x: 3, y: 3 } }
      });
      store.dispatch({ type: 'game/hideMovement' });
      // Set Quinn to 0 HP
      store.dispatch({
        type: 'game/setHeroHp',
        payload: { heroId: 'quinn', hp: 0 }
      });
      // Keep 1 surge available
      store.dispatch({
        type: 'game/setPartyResources',
        payload: { healingSurges: 1 }
      });
    });

    // End Quinn's turn to get to Vistra
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/endHeroPhase' });
      store.dispatch({ type: 'game/endExplorationPhase' });
      store.dispatch({ type: 'game/endVillainPhase' }); // Now Vistra's turn
    });

    // End Vistra's turn - this should cycle back to Quinn who is at 0 HP
    // BUT there's a surge available, so healing surge should trigger instead of defeat
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/endHeroPhase' });
      store.dispatch({ type: 'game/endExplorationPhase' });
      store.dispatch({ type: 'game/endVillainPhase' }); // Back to Quinn
    });

    // Verify healing surge notification appears (not defeat)
    await page.locator('[data-testid="healing-surge-notification"]').waitFor({ state: 'visible' });

    // Verify we're still on game board (not defeat screen)
    const storeState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    
    expect(storeState.game.currentScreen).toBe('game-board');
    expect(storeState.game.defeatReason).toBeNull();
    expect(storeState.game.healingSurgeUsedHeroId).toBe('quinn');
    // Quinn should be healed
    expect(storeState.game.heroHp.find((h: any) => h.heroId === 'quinn')?.currentHp).toBe(4);
  });
});
