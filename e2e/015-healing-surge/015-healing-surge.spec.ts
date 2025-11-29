import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from '../helpers/screenshot-helper';

test.describe('015 - Healing Surge', () => {
  test('Hero automatically healed at turn start when at 0 HP', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Start the game with Quinn and Vistra
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    await page.locator('[data-testid="hero-vistra"]').click();
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

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

    // STEP 2: Verify party starts with 2 healing surges
    await screenshots.capture(page, 'party-has-2-surges', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.partyResources.healingSurges).toBe(2);
        await expect(page.locator('[data-testid="surge-value"]')).toHaveText('2');
      }
    });

    // STEP 3: Set Quinn to 0 HP (simulating being knocked down by monster)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroHp',
        payload: { heroId: 'quinn', hp: 0 }
      });
    });

    await screenshots.capture(page, 'quinn-at-zero-hp', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.heroHp.find((h: any) => h.heroId === 'quinn')?.currentHp).toBe(0);
        expect(storeState.game.turnState.currentHeroIndex).toBe(0); // Quinn's turn
      }
    });

    // STEP 4: End Quinn's turn through all phases
    // Quinn is at 0 HP during his turn - nothing happens yet
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // End hero phase
      store.dispatch({ type: 'game/endHeroPhase' });
      // End exploration phase
      store.dispatch({ type: 'game/endExplorationPhase' });
      // End villain phase - this transitions to Vistra's turn
      store.dispatch({ type: 'game/endVillainPhase' });
    });

    // Now it's Vistra's turn - no surge triggered since Vistra has full HP
    await screenshots.capture(page, 'vistra-turn-no-surge', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        // Vistra's turn (index 1)
        expect(storeState.game.turnState.currentHeroIndex).toBe(1);
        // No surge notification since Vistra has HP > 0
        expect(storeState.game.healingSurgeUsedHeroId).toBeNull();
        // Surges still at 2
        expect(storeState.game.partyResources.healingSurges).toBe(2);
      }
    });

    // STEP 5: End Vistra's turn - this will wrap back to Quinn who is at 0 HP
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // End hero phase
      store.dispatch({ type: 'game/endHeroPhase' });
      // End exploration phase
      store.dispatch({ type: 'game/endExplorationPhase' });
      // End villain phase - this transitions back to Quinn
      // Quinn is at 0 HP, so healing surge should trigger!
      store.dispatch({ type: 'game/endVillainPhase' });
    });

    // STEP 6: Verify healing surge notification appears
    await page.locator('[data-testid="healing-surge-notification"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'healing-surge-notification', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        // Quinn should have received a healing surge
        expect(storeState.game.healingSurgeUsedHeroId).toBe('quinn');
        expect(storeState.game.healingSurgeHpRestored).toBe(4); // Quinn's surge value
        // Quinn's HP should be restored
        expect(storeState.game.heroHp.find((h: any) => h.heroId === 'quinn')?.currentHp).toBe(4);
        // Surge count should decrease by 1
        expect(storeState.game.partyResources.healingSurges).toBe(1);
        
        // Check UI notification content
        await expect(page.locator('[data-testid="healing-title"]')).toContainText('Healing Surge');
        await expect(page.locator('[data-testid="healed-hero-name"]')).toContainText('Quinn');
        await expect(page.locator('[data-testid="hp-restored-section"]')).toContainText('+4');
      }
    });

    // STEP 7: Dismiss notification and verify final state
    await page.locator('[data-testid="dismiss-healing-surge"]').click();
    await expect(page.locator('[data-testid="healing-surge-notification"]')).not.toBeVisible();

    await screenshots.capture(page, 'surge-used-counter-updated', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        // Notification cleared
        expect(storeState.game.healingSurgeUsedHeroId).toBeNull();
        // Quinn should have 4 HP now
        expect(storeState.game.heroHp.find((h: any) => h.heroId === 'quinn')?.currentHp).toBe(4);
        // Surge counter shows 1
        await expect(page.locator('[data-testid="surge-value"]')).toHaveText('1');
      }
    });
  });

  test('No surge used when HP is greater than 0', async ({ page }) => {
    // Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Set position and hide movement
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 3 } }
      });
      store.dispatch({ type: 'game/hideMovement' });
    });

    // Set Quinn to 1 HP (low but not 0)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroHp',
        payload: { heroId: 'quinn', hp: 1 }
      });
    });

    // Go through a full turn cycle
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/endHeroPhase' });
      store.dispatch({ type: 'game/endExplorationPhase' });
      store.dispatch({ type: 'game/endVillainPhase' });
    });

    // Verify no surge was used
    const storeState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    
    expect(storeState.game.healingSurgeUsedHeroId).toBeNull();
    expect(storeState.game.heroHp.find((h: any) => h.heroId === 'quinn')?.currentHp).toBe(1);
    expect(storeState.game.partyResources.healingSurges).toBe(2);
    
    // Notification should NOT appear
    await expect(page.locator('[data-testid="healing-surge-notification"]')).not.toBeVisible();
  });

  test('No surge used when no surges available', async ({ page }) => {
    // Start game with two heroes
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    await page.locator('[data-testid="hero-vistra"]').click();
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Set up state - Quinn at 0 HP, Vistra at full HP, but 0 surges
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
      // Deplete all surges
      store.dispatch({
        type: 'game/setPartyResources',
        payload: { healingSurges: 0 }
      });
    });

    // Verify 0 surges shown
    await expect(page.locator('[data-testid="surge-value"]')).toHaveText('0');

    // End Quinn's turn
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/endHeroPhase' });
      store.dispatch({ type: 'game/endExplorationPhase' });
      store.dispatch({ type: 'game/endVillainPhase' });
    });

    // End Vistra's turn - back to Quinn (at 0 HP)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/endHeroPhase' });
      store.dispatch({ type: 'game/endExplorationPhase' });
      store.dispatch({ type: 'game/endVillainPhase' });
    });

    // Verify no surge was used (none available)
    const storeState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    
    expect(storeState.game.healingSurgeUsedHeroId).toBeNull();
    expect(storeState.game.heroHp.find((h: any) => h.heroId === 'quinn')?.currentHp).toBe(0);
    expect(storeState.game.partyResources.healingSurges).toBe(0);
    
    // Notification should NOT appear
    await expect(page.locator('[data-testid="healing-surge-notification"]')).not.toBeVisible();
  });
});
