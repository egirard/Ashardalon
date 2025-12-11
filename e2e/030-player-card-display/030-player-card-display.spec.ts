import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from '../helpers/screenshot-helper';

test.describe('030 - Player Card Display', () => {
  test('player card displays all hero stats, power cards, and updates during gameplay', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    // STEP 2: Select Vistra from bottom edge and set up power cards via Redux
    await page.locator('[data-testid="hero-vistra"]').click();
    
    // Bypass power card selection UI (has pre-existing issues) by setting state directly
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'heroes/setHeroPowerCards',
        payload: {
          heroId: 'vistra',
          powerCards: {
            heroId: 'vistra',
            customAbility: 11, // Dwarven Resilience
            utility: 18, // Inspiring Advice
            atWills: [12, 13], // Charge, Reaping Strike
            daily: 15, // Comeback Strike
            cardStates: [
              { cardId: 11, isFlipped: false },
              { cardId: 18, isFlipped: false },
              { cardId: 12, isFlipped: false },
              { cardId: 13, isFlipped: false },
              { cardId: 15, isFlipped: false },
            ]
          }
        }
      });
    });

    // STEP 3: Start the game
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Set deterministic position for reproducible screenshots
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'vistra', position: { x: 2, y: 3 } }
      });
    });

    // Wait for position changes to be applied
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens.find((t: any) => t.heroId === 'vistra')?.position).toEqual({ x: 2, y: 3 });
    }).toPass();

    // Hide the movement overlay for a stable screenshot
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/hideMovement' });
    });

    // Wait for movement overlay to be hidden
    await page.waitForFunction(() => {
      const buttons = document.querySelectorAll('[data-testid^="move-to-"]');
      return buttons.length === 0;
    });

    await screenshots.capture(page, 'player-card-initial-state', {
      programmaticCheck: async () => {
        // Verify player card is visible with correct name
        await expect(page.locator('[data-testid="player-card-name"]')).toContainText('Vistra');
        
        // Verify HP display
        await expect(page.locator('[data-testid="hero-hp"]')).toContainText('HP: 10/10');
        
        // Verify AC display
        await expect(page.locator('[data-testid="player-card-ac"]')).toContainText('18');
        
        // Verify Surge display
        await expect(page.locator('[data-testid="player-card-surge"]')).toContainText('5');
        
        // Verify Speed display
        await expect(page.locator('[data-testid="player-card-speed"]')).toContainText('5');
        
        // Note: Attack info (stub attack) removed from player card per UX refactor
        // Attack power cards are shown via PowerCardAttackPanel instead
        
        // Verify power cards section is visible
        await expect(page.locator('[data-testid="player-card-powers"]')).toBeVisible();
        
        // Verify store state
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.heroes.selectedHeroes.length).toBe(1);
        expect(storeState.game.heroHp[0].currentHp).toBe(10);
        expect(storeState.game.heroHp[0].maxHp).toBe(10);
      }
    });

    // STEP 4: Simulate damage to hero by updating state using setHeroHp
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // Update HP to show damage (10 -> 7 means took 3 damage)
      store.dispatch({
        type: 'game/setHeroHp',
        payload: { heroId: 'vistra', hp: 7 }
      });
    });

    await screenshots.capture(page, 'player-card-after-damage', {
      programmaticCheck: async () => {
        // Verify HP updated to show damage
        await expect(page.locator('[data-testid="hero-hp"]')).toContainText('HP: 7/10');
        
        // Verify store state shows updated HP
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.heroHp[0].currentHp).toBe(7);
      }
    });

    // STEP 5: Give hero a treasure item to verify items display
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // Add +1 Magic Sword (ID 134) to hero's inventory using setHeroInventories
      store.dispatch({
        type: 'game/setHeroInventories',
        payload: {
          vistra: {
            heroId: 'vistra',
            items: [{ cardId: 134, isFlipped: false }]
          }
        }
      });
    });

    await screenshots.capture(page, 'player-card-with-treasure', {
      programmaticCheck: async () => {
        // Verify treasure items section is visible
        await expect(page.locator('[data-testid="player-card-items"]')).toBeVisible();
        
        // Verify the treasure item is displayed
        await expect(page.locator('[data-testid="player-card-items"]')).toContainText('+1 Magic Sword');
        
        // Verify store state has the item
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.heroInventories['vistra']?.items?.length).toBe(1);
        expect(storeState.game.heroInventories['vistra']?.items[0].cardId).toBe(134);
      }
    });

    // STEP 6: Verify power card flip state by dispatching a flip action
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      const vistraPowerCards = state.heroes.heroPowerCards['vistra'];
      if (vistraPowerCards) {
        // Flip the daily power card (card 15 - Comeback Strike)
        store.dispatch({
          type: 'heroes/usePowerCard',
          payload: { heroId: 'vistra', cardId: 15 }
        });
      }
    });

    await screenshots.capture(page, 'player-card-with-flipped-power', {
      programmaticCheck: async () => {
        // Verify power cards section still visible
        await expect(page.locator('[data-testid="player-card-powers"]')).toBeVisible();
        
        // Verify store state shows flipped card
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        const vistraPowerCards = storeState.heroes.heroPowerCards['vistra'];
        const dailyState = vistraPowerCards?.cardStates?.find((s: any) => s.cardId === 15);
        expect(dailyState?.isFlipped).toBe(true);
      }
    });

    // STEP 7: Verify party surge counter - now displayed in game field UI, not player card
    // Party surges removed from player card per UX refactor
    await screenshots.capture(page, 'player-card-with-party-surges', {
      programmaticCheck: async () => {
        // Note: Party surge section removed from player card
        // Surges are now displayed via HealingSurgeCounter in game field UI instead
        
        // Verify store state has correct surge count
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.partyResources.healingSurges).toBe(2);
      }
    });

    // STEP 8: Set hero HP to 0 to test KO state display
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroHp',
        payload: { heroId: 'vistra', hp: 0 }
      });
    });

    await screenshots.capture(page, 'player-card-ko-state', {
      programmaticCheck: async () => {
        // Verify KO overlay is visible
        await expect(page.locator('[data-testid="ko-overlay"]')).toBeVisible();
        
        // Verify KO text is displayed
        await expect(page.locator('[data-testid="ko-overlay"]')).toContainText('DOWNED');
        
        // Verify HP shows 0
        await expect(page.locator('[data-testid="hero-hp"]')).toContainText('HP: 0/10');
        
        // Verify store state shows 0 HP
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.heroHp[0].currentHp).toBe(0);
      }
    });

    // STEP 9: Set party surges to 0 - verify state, warning now shown in game field UI
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setPartyResources',
        payload: { healingSurges: 0 }
      });
    });

    await screenshots.capture(page, 'player-card-no-surges-warning', {
      programmaticCheck: async () => {
        // Note: Party surge section and warning removed from player card
        // Warning is now displayed via HealingSurgeCounter in game field UI instead
        
        // Verify store state has 0 surges
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.partyResources.healingSurges).toBe(0);
      }
    });
  });
});
