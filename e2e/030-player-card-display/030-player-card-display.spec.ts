import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from '../helpers/screenshot-helper';

test.describe('030 - Player Card Display', () => {
  test('player card displays all hero stats, power cards, and updates during gameplay', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    // STEP 2: Select Vistra from bottom edge
    await page.locator('[data-testid="hero-vistra"]').click();
    
    // Open power card selection for Vistra
    await page.locator('[data-testid="select-powers-vistra"]').click();
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'visible' });
    
    // Select Vistra's power cards
    await page.locator('[data-testid="utility-card-18"]').click();
    await page.locator('[data-testid="atwill-card-12"]').click();
    await page.locator('[data-testid="atwill-card-13"]').click();
    await page.locator('[data-testid="daily-card-15"]').click();
    await page.locator('[data-testid="done-power-selection"]').click();
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'hidden' });

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
        
        // Verify Attack info display
        await expect(page.locator('[data-testid="player-card-attack"]')).toContainText('Warhammer');
        await expect(page.locator('[data-testid="player-card-attack"]')).toContainText('+8');
        
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

    // STEP 7: Verify party surge counter is displayed on player card
    await screenshots.capture(page, 'player-card-with-party-surges', {
      programmaticCheck: async () => {
        // Verify party surge section is visible
        await expect(page.locator('[data-testid="player-card-surges"]')).toBeVisible();
        
        // Verify initial surge count (2 surges at game start)
        await expect(page.locator('[data-testid="player-card-surges"]')).toContainText('2');
        
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

    // STEP 9: Set party surges to 0 to verify warning display
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setPartyResources',
        payload: { healingSurges: 0 }
      });
    });

    await screenshots.capture(page, 'player-card-no-surges-warning', {
      programmaticCheck: async () => {
        // Verify party surge section shows 0 with warning
        await expect(page.locator('[data-testid="player-card-surges"]')).toContainText('0');
        
        // Verify the warning indicator is visible (⚠️)
        await expect(page.locator('[data-testid="player-card-surges"]')).toContainText('⚠️');
        
        // Verify store state has 0 surges
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.partyResources.healingSurges).toBe(0);
      }
    });
  });
});
