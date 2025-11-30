import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards } from '../helpers/screenshot-helper';

test.describe('020 - Power Card Use', () => {
  test('player can use daily, at-will, and utility power cards during gameplay', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection and select Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();

    // Select power cards for Quinn
    await selectDefaultPowerCards(page, 'quinn');

    await screenshots.capture(page, 'hero-with-powers-selected', {
      programmaticCheck: async () => {
        // Verify Quinn is selected with powers
        await expect(page.locator('[data-testid="hero-quinn"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="select-powers-quinn"]')).toContainText('Powers Selected');
        await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled();
      }
    });

    // STEP 2: Start the game
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Set deterministic position for the hero (same as 019 test for consistency)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 3, y: 2 } }
      });
    });

    // Wait for the position to be applied by checking Redux state
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 3, y: 2 });
    }).toPass();

    await screenshots.capture(page, 'game-started', {
      programmaticCheck: async () => {
        // Verify game board is visible and power cards are finalized
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify power cards are finalized for Quinn
        expect(storeState.heroes.heroPowerCards.quinn).toBeDefined();
        expect(storeState.heroes.heroPowerCards.quinn.customAbility).toBe(1); // Healing Hymn
        expect(storeState.heroes.heroPowerCards.quinn.utility).toBe(8); // Astral Refuge
        expect(storeState.heroes.heroPowerCards.quinn.atWills).toEqual([2, 3]); // Cleric's Shield, Righteous Advance
        expect(storeState.heroes.heroPowerCards.quinn.daily).toBe(5); // Blade Barrier
        
        // Verify all cards start unflipped
        const cardStates = storeState.heroes.heroPowerCards.quinn.cardStates;
        expect(cardStates.every((s: { isFlipped: boolean }) => s.isFlipped === false)).toBe(true);
      }
    });

    // STEP 3: Test using an at-will power card (Cleric's Shield - card ID 2)
    // At-will powers can be used repeatedly
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // Use at-will power (Cleric's Shield)
      store.dispatch({
        type: 'heroes/usePowerCard',
        payload: { heroId: 'quinn', cardId: 2 }
      });
    });

    await screenshots.capture(page, 'atwill-power-used', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify the at-will card is now flipped
        const cardStates = storeState.heroes.heroPowerCards.quinn.cardStates;
        const atWillCard = cardStates.find((s: { cardId: number }) => s.cardId === 2);
        expect(atWillCard?.isFlipped).toBe(true);
        
        // Other cards should still be unflipped
        const otherCards = cardStates.filter((s: { cardId: number }) => s.cardId !== 2);
        expect(otherCards.every((s: { isFlipped: boolean }) => s.isFlipped === false)).toBe(true);
      }
    });

    // STEP 4: Test using a utility power card (Astral Refuge - card ID 8)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // Use utility power (Astral Refuge)
      store.dispatch({
        type: 'heroes/usePowerCard',
        payload: { heroId: 'quinn', cardId: 8 }
      });
    });

    await screenshots.capture(page, 'utility-power-used', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify the utility card is now flipped
        const cardStates = storeState.heroes.heroPowerCards.quinn.cardStates;
        const utilityCard = cardStates.find((s: { cardId: number }) => s.cardId === 8);
        expect(utilityCard?.isFlipped).toBe(true);
        
        // At-will card should also still be flipped
        const atWillCard = cardStates.find((s: { cardId: number }) => s.cardId === 2);
        expect(atWillCard?.isFlipped).toBe(true);
      }
    });

    // STEP 5: Test using a daily power card (Blade Barrier - card ID 5)
    // Daily powers can only be used once per adventure
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // Use daily power (Blade Barrier)
      store.dispatch({
        type: 'heroes/usePowerCard',
        payload: { heroId: 'quinn', cardId: 5 }
      });
    });

    await screenshots.capture(page, 'daily-power-used', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify the daily card is now flipped
        const cardStates = storeState.heroes.heroPowerCards.quinn.cardStates;
        const dailyCard = cardStates.find((s: { cardId: number }) => s.cardId === 5);
        expect(dailyCard?.isFlipped).toBe(true);
        
        // Count flipped cards - should be 3 (at-will, utility, daily)
        const flippedCount = cardStates.filter((s: { isFlipped: boolean }) => s.isFlipped).length;
        expect(flippedCount).toBe(3);
      }
    });

    // STEP 6: Use the custom ability (Healing Hymn - card ID 1)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // Use custom ability (Healing Hymn)
      store.dispatch({
        type: 'heroes/usePowerCard',
        payload: { heroId: 'quinn', cardId: 1 }
      });
    });

    await screenshots.capture(page, 'custom-ability-used', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify the custom ability card is now flipped
        const cardStates = storeState.heroes.heroPowerCards.quinn.cardStates;
        const customCard = cardStates.find((s: { cardId: number }) => s.cardId === 1);
        expect(customCard?.isFlipped).toBe(true);
        
        // Count flipped cards - should be 4 (custom, at-will, utility, daily)
        const flippedCount = cardStates.filter((s: { isFlipped: boolean }) => s.isFlipped).length;
        expect(flippedCount).toBe(4);
      }
    });

    // STEP 7: Verify second at-will is still available
    await screenshots.capture(page, 'second-atwill-available', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify the second at-will card (Righteous Advance, ID 3) is still unflipped
        const cardStates = storeState.heroes.heroPowerCards.quinn.cardStates;
        const secondAtWill = cardStates.find((s: { cardId: number }) => s.cardId === 3);
        expect(secondAtWill?.isFlipped).toBe(false);
        
        // Total: 4 flipped, 1 unflipped (second at-will)
        const flippedCount = cardStates.filter((s: { isFlipped: boolean }) => s.isFlipped).length;
        const unflippedCount = cardStates.filter((s: { isFlipped: boolean }) => !s.isFlipped).length;
        expect(flippedCount).toBe(4);
        expect(unflippedCount).toBe(1);
      }
    });

    // STEP 8: Use the second at-will (Righteous Advance - card ID 3)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // Use second at-will power (Righteous Advance)
      store.dispatch({
        type: 'heroes/usePowerCard',
        payload: { heroId: 'quinn', cardId: 3 }
      });
    });

    await screenshots.capture(page, 'all-powers-used', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify all cards are now flipped
        const cardStates = storeState.heroes.heroPowerCards.quinn.cardStates;
        const allFlipped = cardStates.every((s: { isFlipped: boolean }) => s.isFlipped);
        expect(allFlipped).toBe(true);
        expect(cardStates.length).toBe(5); // custom, utility, 2 at-wills, daily
      }
    });
  });

  test('power card state persists across turn phases', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // Setup: Start game with Quinn and select power cards
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Set deterministic position (same as 019 test for consistency)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 3, y: 2 } }
      });
    });

    // Wait for the position to be applied by checking Redux state
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 3, y: 2 });
    }).toPass();

    // Use a daily power
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'heroes/usePowerCard',
        payload: { heroId: 'quinn', cardId: 5 } // Blade Barrier
      });
    });

    await screenshots.capture(page, 'daily-used-hero-phase', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify daily is flipped and we're in hero phase
        expect(storeState.game.turnState.currentPhase).toBe('hero-phase');
        const cardStates = storeState.heroes.heroPowerCards.quinn.cardStates;
        const dailyCard = cardStates.find((s: { cardId: number }) => s.cardId === 5);
        expect(dailyCard?.isFlipped).toBe(true);
      }
    });

    // Progress through turn phases
    await page.locator('[data-testid="end-phase-button"]').click(); // End hero phase
    
    // Wait for exploration phase
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.turnState.currentPhase).toBe('exploration-phase');
    }).toPass();

    // If monster card appears, dismiss it
    const monsterCard = page.locator('[data-testid="monster-card"]');
    if (await monsterCard.isVisible().catch(() => false)) {
      await page.locator('[data-testid="dismiss-monster-card"]').click();
    }

    await screenshots.capture(page, 'daily-persists-exploration-phase', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify daily is still flipped in exploration phase
        expect(storeState.game.turnState.currentPhase).toBe('exploration-phase');
        const cardStates = storeState.heroes.heroPowerCards.quinn.cardStates;
        const dailyCard = cardStates.find((s: { cardId: number }) => s.cardId === 5);
        expect(dailyCard?.isFlipped).toBe(true);
      }
    });

    // End exploration phase
    await page.locator('[data-testid="end-phase-button"]').click();

    // Wait for villain phase
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      // Could be villain phase or could have auto-advanced to hero phase if no monsters
      expect(['villain-phase', 'hero-phase']).toContain(storeState.game.turnState.currentPhase);
    }).toPass();

    await screenshots.capture(page, 'daily-persists-through-phases', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify daily is still flipped after phase transitions
        const cardStates = storeState.heroes.heroPowerCards.quinn.cardStates;
        const dailyCard = cardStates.find((s: { cardId: number }) => s.cardId === 5);
        expect(dailyCard?.isFlipped).toBe(true);
        
        // Other cards should still be unflipped
        const otherCards = cardStates.filter((s: { cardId: number }) => s.cardId !== 5);
        expect(otherCards.every((s: { isFlipped: boolean }) => !s.isFlipped)).toBe(true);
      }
    });
  });
});
