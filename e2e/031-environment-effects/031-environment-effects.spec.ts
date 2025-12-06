import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards } from '../helpers/screenshot-helper';

test.describe('031 - Environment Effects', () => {
  test('environment cards activate and apply persistent effects', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Navigate and start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'character-select-screen', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="character-select"]')).toBeVisible();
      }
    });
    
    // Select Quinn from top edge
    await page.locator('[data-testid="hero-quinn-top"]').click();
    
    // Select power cards
    await selectDefaultPowerCards(page, 'quinn');
    
    await page.locator('[data-testid="start-game-button"]').click();
    
    // Wait for game board
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    
    // STEP 2: Position Quinn and verify initial state
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 4 } }
      });
    });
    
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 4 });
    }).toPass();
    
    await screenshots.capture(page, 'game-started-no-environment', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.activeEnvironmentId).toBeNull();
        await expect(page.locator('[data-testid="environment-indicator"]')).not.toBeVisible();
      }
    });
    
    // STEP 3: Manually activate Hidden Snipers environment
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // Set Quinn's HP to 8 for tracking damage
      store.dispatch({
        type: 'game/setHeroHp',
        payload: { heroId: 'quinn', currentHp: 8, maxHp: 8 }
      });
      // Activate Hidden Snipers environment
      store.dispatch({
        type: 'game/setActiveEnvironment',
        payload: 'hidden-snipers'
      });
    });
    
    // Wait for environment indicator to appear
    await page.locator('[data-testid="environment-indicator"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'hidden-snipers-activated', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.activeEnvironmentId).toBe('hidden-snipers');
        await expect(page.locator('[data-testid="environment-indicator"]')).toBeVisible();
        await expect(page.locator('[data-testid="environment-indicator"]')).toContainText('Hidden Snipers');
      }
    });
    
    // STEP 4: End hero phase while Quinn is alone on tile (should take 1 damage)
    const hpBefore = await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      return store.getState().game.heroHp.find((h: any) => h.heroId === 'quinn')?.currentHp;
    });
    
    // Dismiss any monster cards that may be shown
    const monsterCard = page.locator('[data-testid="monster-card"]');
    if (await monsterCard.isVisible()) {
      await page.locator('[data-testid="dismiss-monster-card"]').click();
      await monsterCard.waitFor({ state: 'hidden' });
    }
    
    // End hero phase (this should trigger Hidden Snipers effect)
    await page.locator('[data-testid="end-phase-button"]').click();
    
    // Wait for phase transition
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');
    
    await screenshots.capture(page, 'after-hero-phase-damage-applied', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        const quinnHp = storeState.game.heroHp.find((h: any) => h.heroId === 'quinn');
        // Should have taken 1 damage from Hidden Snipers (alone on tile)
        expect(quinnHp.currentHp).toBe(hpBefore - 1);
        expect(storeState.game.activeEnvironmentId).toBe('hidden-snipers');
      }
    });
    
    // STEP 5: Switch to Walls of Magma environment
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // End exploration phase to get back to hero phase
      store.dispatch({ type: 'game/endExplorationPhase' });
      // Skip villain phase
      store.dispatch({ type: 'game/endVillainPhase' });
      // Reset HP for next test
      store.dispatch({
        type: 'game/setHeroHp',
        payload: { heroId: 'quinn', currentHp: 8, maxHp: 8 }
      });
      // Switch to Walls of Magma
      store.dispatch({
        type: 'game/setActiveEnvironment',
        payload: 'walls-of-magma'
      });
    });
    
    await screenshots.capture(page, 'walls-of-magma-activated', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.activeEnvironmentId).toBe('walls-of-magma');
        await expect(page.locator('[data-testid="environment-indicator"]')).toContainText('Walls of Magma');
      }
    });
    
    // STEP 6: Position Quinn adjacent to a wall and end phase
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // Position Quinn at edge of tile (adjacent to wall)
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 1, y: 0 } }
      });
    });
    
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 1, y: 0 });
    }).toPass();
    
    const hpBeforeWall = await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      return store.getState().game.heroHp.find((h: any) => h.heroId === 'quinn')?.currentHp;
    });
    
    await screenshots.capture(page, 'hero-adjacent-to-wall', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.heroTokens[0].position).toEqual({ x: 1, y: 0 });
      }
    });
    
    // Dismiss any monster cards that may be shown
    const monsterCard2 = page.locator('[data-testid="monster-card"]');
    if (await monsterCard2.isVisible()) {
      await page.locator('[data-testid="dismiss-monster-card"]').click();
      await monsterCard2.waitFor({ state: 'hidden' });
    }
    
    // End hero phase (should trigger Walls of Magma effect)
    await page.locator('[data-testid="end-phase-button"]').click();
    
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');
    
    await screenshots.capture(page, 'walls-of-magma-damage-applied', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        const quinnHp = storeState.game.heroHp.find((h: any) => h.heroId === 'quinn');
        // Should have taken 1 damage from Walls of Magma (adjacent to wall)
        expect(quinnHp.currentHp).toBe(hpBeforeWall - 1);
        expect(storeState.game.activeEnvironmentId).toBe('walls-of-magma');
      }
    });
    
    // STEP 7: Deactivate environment and verify no damage
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // End exploration and villain phases
      store.dispatch({ type: 'game/endExplorationPhase' });
      store.dispatch({ type: 'game/endVillainPhase' });
      // Reset HP
      store.dispatch({
        type: 'game/setHeroHp',
        payload: { heroId: 'quinn', currentHp: 8, maxHp: 8 }
      });
      // Deactivate environment
      store.dispatch({
        type: 'game/setActiveEnvironment',
        payload: null
      });
    });
    
    await screenshots.capture(page, 'environment-deactivated', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.activeEnvironmentId).toBeNull();
        await expect(page.locator('[data-testid="environment-indicator"]')).not.toBeVisible();
      }
    });
    
    // End hero phase without environment (should not take damage)
    const hpBeforeNoEnv = await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      return store.getState().game.heroHp.find((h: any) => h.heroId === 'quinn')?.currentHp;
    });
    
    // Dismiss any monster cards that may be shown
    const monsterCard3 = page.locator('[data-testid="monster-card"]');
    if (await monsterCard3.isVisible()) {
      await page.locator('[data-testid="dismiss-monster-card"]').click();
      await monsterCard3.waitFor({ state: 'hidden' });
    }
    
    await page.locator('[data-testid="end-phase-button"]').click();
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');
    
    await screenshots.capture(page, 'no-damage-without-environment', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        const quinnHp = storeState.game.heroHp.find((h: any) => h.heroId === 'quinn');
        // Should NOT have taken damage (no environment active)
        expect(quinnHp.currentHp).toBe(hpBeforeNoEnv);
        expect(storeState.game.activeEnvironmentId).toBeNull();
      }
    });
  });
});
