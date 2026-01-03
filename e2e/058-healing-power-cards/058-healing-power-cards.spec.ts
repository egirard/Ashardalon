import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction } from '../helpers/screenshot-helper';

test.describe('058 - Healing Power Cards (Healing Hymn, Dwarven Resilience, Lay On Hands)', () => {
  test('player can use healing power cards to restore HP', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection and select heroes
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    // Select Quinn (Cleric with Healing Hymn)
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    
    // Select Vistra (Dwarf with Dwarven Resilience)
    await page.locator('[data-testid="hero-vistra-bottom"]').click();
    await selectDefaultPowerCards(page, 'vistra');
    
    // Select Keyleth (Paladin with Lay On Hands)
    await page.locator('[data-testid="hero-keyleth-bottom"]').click();
    await selectDefaultPowerCards(page, 'keyleth');
    
    await screenshots.capture(page, 'three-heroes-selected', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="hero-quinn-bottom"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="hero-vistra-bottom"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="hero-keyleth-bottom"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled();
      }
    });

    // Start the game
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // STEP 2: Setup scenario - position heroes, damage them, and override power cards
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Override Quinn's power cards to include Healing Hymn (ID 1)
      store.dispatch({
        type: 'heroes/setHeroPowerCards',
        payload: {
          heroId: 'quinn',
          powerCards: {
            utility: 1,  // Healing Hymn
            atWills: [2, 3],
            daily: 5
          }
        }
      });
      
      // Override Vistra's power cards to include Dwarven Resilience (ID 11)
      store.dispatch({
        type: 'heroes/setHeroPowerCards',
        payload: {
          heroId: 'vistra',
          powerCards: {
            utility: 11,  // Dwarven Resilience
            atWills: [12, 13],
            daily: 15
          }
        }
      });
      
      // Override Keyleth's power cards to include Lay On Hands (ID 21)
      store.dispatch({
        type: 'heroes/setHeroPowerCards',
        payload: {
          heroId: 'keyleth',
          powerCards: {
            utility: 21,  // Lay On Hands
            atWills: [22, 23],
            daily: 25
          }
        }
      });
      
      // Position Quinn and Vistra on same tile, Keyleth adjacent
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 2 } }
      });
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'vistra', position: { x: 2, y: 2 } }  // Same tile as Quinn
      });
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'keyleth', position: { x: 2, y: 3 } }  // Adjacent to Quinn/Vistra
      });
      
      // Damage all heroes
      store.dispatch({
        type: 'game/setHeroHp',
        payload: { heroId: 'quinn', currentHp: 4 }  // Damaged, can be healed
      });
      store.dispatch({
        type: 'game/setHeroHp',
        payload: { heroId: 'vistra', currentHp: 5 }  // Damaged, can be healed
      });
      store.dispatch({
        type: 'game/setHeroHp',
        payload: { heroId: 'keyleth', currentHp: 6 }  // Damaged, can be healed
      });
    });

    // Wait for setup to complete
    await expect(async () => {
      const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
      expect(state.game.heroHp[0].currentHp).toBe(4); // Quinn damaged
      expect(state.game.heroHp[1].currentHp).toBe(5); // Vistra damaged
      expect(state.game.heroHp[2].currentHp).toBe(6); // Keyleth damaged
      expect(state.game.heroTokens[0].position).toEqual({ x: 2, y: 2 });
      expect(state.game.heroTokens[1].position).toEqual({ x: 2, y: 2 });
      expect(state.game.heroTokens[2].position).toEqual({ x: 2, y: 3 });
    }).toPass();

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

    await screenshots.capture(page, 'setup-heroes-damaged', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.heroHp[0].currentHp).toBe(4); // Quinn at 4 HP
        expect(state.game.heroHp[1].currentHp).toBe(5); // Vistra at 5 HP
        expect(state.game.heroHp[2].currentHp).toBe(6); // Keyleth at 6 HP
        
        // Verify Healing Hymn is eligible (Quinn's turn, hero phase)
        await expect(page.locator('[data-testid="power-card-1"]')).toBeVisible();
        await expect(page.locator('[data-testid="power-card-1"]')).toBeEnabled();
      }
    });

    // STEP 3: Use Healing Hymn (Quinn) - Heals Quinn and all heroes on tile (Vistra) 2 HP
    await page.locator('[data-testid="power-card-1"]').click();
    
    // Wait for healing to be applied and card to be flipped
    await expect(async () => {
      const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
      const quinnCards = state.heroes.heroPowerCards.quinn.cardStates;
      const healingHymnState = quinnCards.find((c: any) => c.cardId === 1);
      expect(healingHymnState?.isFlipped).toBe(true);
      
      // Verify HP was increased (healing applied)
      expect(state.game.heroHp[0].currentHp).toBeGreaterThan(4);
      expect(state.game.heroHp[1].currentHp).toBeGreaterThan(5);
    }).toPass();

    await screenshots.capture(page, 'healing-hymn-used', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        // Quinn should be healed 4 -> 6
        expect(state.game.heroHp[0].currentHp).toBe(6);
        // Vistra should be healed 5 -> 7
        expect(state.game.heroHp[1].currentHp).toBe(7);
        // Keyleth should also be healed 6 -> 8 because all positions on start tile are considered same tile
        expect(state.game.heroHp[2].currentHp).toBe(8);
        
        // Card should be disabled now
        await expect(page.locator('[data-testid="power-card-1"]')).toHaveClass(/disabled/);
      }
    });

    // STEP 4: End Quinn's turn and switch to Vistra
    await page.locator('[data-testid="end-phase-button"]').click();
    
    // Wait for exploration phase
    await expect(async () => {
      const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
      expect(['exploration-phase', 'villain-phase']).toContain(state.game.turnState.currentPhase);
    }).toPass();
    
    // End exploration phase if present
    const state1 = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
    if (state1.game.turnState.currentPhase === 'exploration-phase') {
      await page.locator('[data-testid="end-phase-button"]').click();
      
      await expect(async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.turnState.currentPhase).toBe('villain-phase');
      }).toPass();
    }
    
    // Dismiss encounter card if present
    const encounterCard = page.locator('[data-testid="encounter-card-overlay"]');
    if (await encounterCard.isVisible().catch(() => false)) {
      await page.locator('[data-testid="encounter-continue"]').click();
      await encounterCard.waitFor({ state: 'hidden' });
    }
    
    // Dismiss encounter effect notification if present
    const encounterNotification = page.locator('[data-testid="encounter-effect-notification"]');
    if (await encounterNotification.isVisible().catch(() => false)) {
      await page.keyboard.press('Enter');
      await encounterNotification.waitFor({ state: 'hidden' });
    }
    
    // End villain phase
    await page.locator('[data-testid="end-phase-button"]').click();
    
    await expect(async () => {
      const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
      expect(state.game.turnState.currentPhase).toBe('hero-phase');
      expect(state.game.heroTokens[state.game.turnState.currentHeroIndex].heroId).toBe('vistra');
    }).toPass();

    await screenshots.capture(page, 'vistra-turn', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.turnState.currentPhase).toBe('hero-phase');
        expect(state.game.heroTokens[state.game.turnState.currentHeroIndex].heroId).toBe('vistra');
        expect(state.game.heroHp[1].currentHp).toBe(7); // Vistra still at 7 HP
        
        // Verify Dwarven Resilience is eligible
        await expect(page.locator('[data-testid="power-card-11"]')).toBeVisible();
        await expect(page.locator('[data-testid="power-card-11"]')).toBeEnabled();
      }
    });

    // STEP 5: Use Dwarven Resilience (Vistra) - Heals self 4 HP
    await page.locator('[data-testid="power-card-11"]').click();
    
    await expect(async () => {
      const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
      expect(state.game.heroHp[1].currentHp).toBe(10); // Vistra healed 7 -> 10 (max HP)
      
      // Verify card is flipped
      const vistraCards = state.heroes.heroPowerCards.vistra.cardStates;
      const dwarvenResilienceState = vistraCards.find((c: any) => c.cardId === 11);
      expect(dwarvenResilienceState?.isFlipped).toBe(true);
    }).toPass();

    await screenshots.capture(page, 'dwarven-resilience-used', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.heroHp[1].currentHp).toBe(10); // Vistra at max HP
        
        // Card should be disabled now
        await expect(page.locator('[data-testid="power-card-11"]')).toHaveClass(/disabled/);
      }
    });

    // STEP 6: End Vistra's turn and switch to Keyleth
    await page.locator('[data-testid="end-phase-button"]').click();
    
    // Wait for exploration phase
    await expect(async () => {
      const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
      expect(['exploration-phase', 'villain-phase']).toContain(state.game.turnState.currentPhase);
    }).toPass();
    
    // End exploration phase if present
    const state2 = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
    if (state2.game.turnState.currentPhase === 'exploration-phase') {
      await page.locator('[data-testid="end-phase-button"]').click();
      
      await expect(async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.turnState.currentPhase).toBe('villain-phase');
      }).toPass();
    }
    
    // Dismiss encounter card if present
    const encounterCard2 = page.locator('[data-testid="encounter-card-overlay"]');
    if (await encounterCard2.isVisible().catch(() => false)) {
      await page.locator('[data-testid="encounter-continue"]').click();
      await encounterCard2.waitFor({ state: 'hidden' });
    }
    
    // Dismiss encounter effect notification if present
    const encounterNotification2 = page.locator('[data-testid="encounter-effect-notification"]');
    if (await encounterNotification2.isVisible().catch(() => false)) {
      await page.keyboard.press('Enter');
      await encounterNotification2.waitFor({ state: 'hidden' });
    }
    
    await page.locator('[data-testid="end-phase-button"]').click();
    
    await expect(async () => {
      const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
      expect(state.game.turnState.currentPhase).toBe('hero-phase');
      expect(state.game.heroTokens[state.game.turnState.currentHeroIndex].heroId).toBe('keyleth');
    }).toPass();

    await screenshots.capture(page, 'keyleth-turn', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.turnState.currentPhase).toBe('hero-phase');
        expect(state.game.heroTokens[state.game.turnState.currentHeroIndex].heroId).toBe('keyleth');
        // Keyleth was healed by Healing Hymn since she's on the start tile
        expect(state.game.heroHp[2].currentHp).toBe(8);
        
        // Verify Lay On Hands is eligible
        await expect(page.locator('[data-testid="power-card-21"]')).toBeVisible();
        await expect(page.locator('[data-testid="power-card-21"]')).toBeEnabled();
      }
    });

    // STEP 7: Use Lay On Hands (Keyleth) - Heals adjacent ally (Quinn or Vistra) 2 HP
    await page.locator('[data-testid="power-card-21"]').click();
    
    // Wait for healing to be applied and card to be flipped
    await expect(async () => {
      const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
      const keylethCards = state.heroes.heroPowerCards.keyleth.cardStates;
      const layOnHandsState = keylethCards.find((c: any) => c.cardId === 21);
      expect(layOnHandsState?.isFlipped).toBe(true);
    }).toPass();

    await screenshots.capture(page, 'lay-on-hands-used', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        // One of the adjacent heroes should be healed 2 HP
        // Quinn was at 6, healed to 8 (max)
        expect(state.game.heroHp[0].currentHp).toBe(8);
        // Vistra stays at 7 (not the target)
        expect(state.game.heroHp[1].currentHp).toBe(7);
        
        // Card should be disabled now
        await expect(page.locator('[data-testid="power-card-21"]')).toHaveClass(/disabled/);
      }
    });

    // STEP 8: Verify final HP states
    await screenshots.capture(page, 'all-healing-complete', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.heroHp[0].currentHp).toBe(8); // Quinn at max HP
        expect(state.game.heroHp[1].currentHp).toBe(7); // Vistra partially healed
        expect(state.game.heroHp[2].currentHp).toBe(8); // Keyleth healed by Healing Hymn
        
        // All healing cards should be disabled
        await expect(page.locator('[data-testid="power-card-1"]')).toHaveClass(/disabled/);
        await expect(page.locator('[data-testid="power-card-11"]')).toHaveClass(/disabled/);
        await expect(page.locator('[data-testid="power-card-21"]')).toHaveClass(/disabled/);
      }
    });
  });
});
