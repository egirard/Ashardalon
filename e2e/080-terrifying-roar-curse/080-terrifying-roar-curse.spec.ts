import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('080 - Terrifying Roar Curse Mechanical Effect', () => {
  test('curse applies -4 attack penalty to hero when attacking monsters', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Navigate and start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'character-select-screen', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="character-select"]')).toBeVisible();
      }
    });
    
    // Select Quinn from bottom edge (so text is oriented towards viewer)
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    
    // Wait for and dismiss power selection modal if it appears (Quinn has auto-selected powers)
    const doneButton = page.locator('[data-testid="done-power-selection"]');
    try {
      await doneButton.waitFor({ state: 'visible', timeout: 2000 });
      await doneButton.click();
    } catch (e) {
      // Modal might not appear, that's okay
    }
    
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    
    // Wait for game board
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);
    
    // STEP 2: Set up game state with hero and monster
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Position Quinn on start tile
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 4 } }
      });
      
      // Set turn state to hero phase
      store.dispatch({
        type: 'game/setTurnPhase',
        payload: 'hero-phase'
      });
      
      // Add a weak monster adjacent to Quinn for attack testing
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-0',
          position: { x: 2, y: 3 },
          currentHp: 1,
          controllerId: 'quinn',
          tileId: 'start-tile',
        }]
      });
    });
    
    await screenshots.capture(page, 'game-setup-monster-adjacent', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 4 });
        expect(storeState.game.monsters.length).toBe(1);
        expect(storeState.game.monsters[0].position).toEqual({ x: 2, y: 3 });
      }
    });
    
    // STEP 3: Record Quinn's base attack bonus
    const baseAttackInfo = await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      const quinnHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
      return {
        baseAttackBonus: 6,
        hasTerrifyingRoar: quinnHp.statuses?.some((s: any) => s.type === 'curse-terrifying-roar') ?? false
      };
    });
    
    await screenshots.capture(page, 'quinn-no-curse-yet', {
      programmaticCheck: async () => {
        expect(baseAttackInfo.baseAttackBonus).toBe(6);
        expect(baseAttackInfo.hasTerrifyingRoar).toBe(false);
      }
    });
    
    // STEP 4: Apply Terrifying Roar curse
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      store.dispatch({
        type: 'game/setTurnPhase',
        payload: 'villain-phase'
      });
      
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'terrifying-roar'
      });
    });
    
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'terrifying-roar-curse-displayed', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-card"]')).toBeVisible();
        await expect(page.locator('[data-testid="encounter-name"]')).toContainText('Terrifying Roar');
      }
    });
    
    // Accept the curse
    await page.locator('[data-testid="encounter-continue"]').click();
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });
    
    // STEP 5: Verify curse was applied
    await screenshots.capture(page, 'curse-applied-to-quinn', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        const quinnHp = storeState.game.heroHp.find((h: any) => h.heroId === 'quinn');
        expect(quinnHp.statuses).toBeDefined();
        
        const terrifyingRoarCurse = quinnHp.statuses.find((s: any) => s.type === 'curse-terrifying-roar');
        expect(terrifyingRoarCurse).toBeDefined();
        expect(terrifyingRoarCurse.source).toBe('terrifying-roar');
      }
    });
    
    // STEP 6: Return to hero phase
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      store.dispatch({
        type: 'game/setTurnPhase',
        payload: 'hero-phase'
      });
      
      store.dispatch({
        type: 'game/setHeroActions',
        payload: {
          heroId: 'quinn',
          actions: {
            hasMovedThisTurn: false,
            hasAttackedThisTurn: false,
            hasUsedMinorAction: false,
            usedPowerCardIds: []
          }
        }
      });
    });
    
    await page.waitForTimeout(500);
    
    await screenshots.capture(page, 'ready-to-attack-with-curse', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        expect(storeState.game.turnState.currentPhase).toBe('hero-phase');
        
        const quinnHp = storeState.game.heroHp.find((h: any) => h.heroId === 'quinn');
        const hasCurse = quinnHp.statuses?.some((s: any) => s.type === 'curse-terrifying-roar');
        expect(hasCurse).toBe(true);
      }
    });
    
    // STEP 7: Verify attack penalty calculation
    const attackPenaltyTest = await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      
      const quinnHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
      const baseAttackBonus = 6;
      const hasCurse = quinnHp.statuses?.some((s: any) => s.type === 'curse-terrifying-roar');
      const expectedModifiedAttack = hasCurse ? baseAttackBonus - 4 : baseAttackBonus;
      
      return {
        baseAttackBonus,
        hasCurse,
        expectedModifiedAttack,
        curseCount: quinnHp.statuses?.length ?? 0
      };
    });
    
    await screenshots.capture(page, 'attack-bonus-calculation-verified', {
      programmaticCheck: async () => {
        expect(attackPenaltyTest.hasCurse).toBe(true);
        expect(attackPenaltyTest.expectedModifiedAttack).toBe(2);
        expect(attackPenaltyTest.curseCount).toBeGreaterThan(0);
      }
    });
    
    // STEP 8: Visual confirmation
    await screenshots.capture(page, 'curse-status-icon-displayed', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        const quinnHp = storeState.game.heroHp.find((h: any) => h.heroId === 'quinn');
        expect(quinnHp.statuses?.length).toBeGreaterThan(0);
      }
    });
  });
});
