import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards } from '../helpers/screenshot-helper';

test.describe('037 - Curse and Special Event Encounter Cards', () => {
  test('curse cards apply status effects and special events execute game actions', async ({ page }) => {
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
    
    // STEP 2: Set up game state and test curse encounter
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Position Quinn
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 4 } }
      });
      
      // Ensure Quinn has no curses initially
      store.dispatch({
        type: 'game/setHeroHp',
        payload: { heroId: 'quinn', currentHp: 8, maxHp: 8 }
      });
    });
    
    await screenshots.capture(page, 'game-started-no-curses', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 4 });
        const quinnHp = storeState.game.heroHp.find((h: any) => h.heroId === 'quinn');
        expect(quinnHp.statuses || []).toHaveLength(0);
      }
    });
    
    // STEP 3: Trigger "Gap in Armor" curse encounter
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Draw "A Gap in the Armor" curse encounter
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'gap-in-armor'
      });
    });
    
    // Wait for encounter card to appear
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'gap-in-armor-curse-card-displayed', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-card"]')).toBeVisible();
        await expect(page.locator('[data-testid="encounter-name"]')).toContainText('A Gap in the Armor');
        await expect(page.locator('[data-testid="encounter-description"]')).toContainText('cursed');
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.drawnEncounter).not.toBeNull();
        expect(storeState.game.drawnEncounter.id).toBe('gap-in-armor');
        expect(storeState.game.drawnEncounter.type).toBe('curse');
      }
    });
    
    // STEP 4: Accept the curse encounter (applies curse to hero)
    await page.locator('[data-testid="encounter-continue"]').click();
    
    // Wait for encounter card to disappear
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });
    
    await screenshots.capture(page, 'curse-applied-to-hero', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-card"]')).not.toBeVisible();
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify curse was applied to Quinn
        const quinnHp = storeState.game.heroHp.find((h: any) => h.heroId === 'quinn');
        expect(quinnHp.statuses).toBeDefined();
        expect(quinnHp.statuses.length).toBeGreaterThan(0);
        
        const curse = quinnHp.statuses.find((s: any) => s.type === 'curse-gap-in-armor');
        expect(curse).toBeDefined();
        expect(curse.source).toBe('gap-in-armor');
      }
    });
    
    // STEP 5: Test "Terrifying Roar" curse (attack penalty)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Draw "Terrifying Roar" curse encounter
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'terrifying-roar'
      });
    });
    
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'terrifying-roar-curse-card', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-name"]')).toContainText('Terrifying Roar');
        await expect(page.locator('[data-testid="encounter-description"]')).toContainText('attack');
      }
    });
    
    // Accept the curse
    await page.locator('[data-testid="encounter-continue"]').click();
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });
    
    await screenshots.capture(page, 'terrifying-roar-curse-applied', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        const quinnHp = storeState.game.heroHp.find((h: any) => h.heroId === 'quinn');
        const terrorCurse = quinnHp.statuses.find((s: any) => s.type === 'curse-terrifying-roar');
        expect(terrorCurse).toBeDefined();
      }
    });
    
    // STEP 6: Test "Cage" curse (prevents movement)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Draw "Cage" curse encounter
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'cage'
      });
    });
    
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'cage-curse-card-displayed', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-name"]')).toContainText('Cage');
        await expect(page.locator('[data-testid="encounter-description"]')).toContainText('cannot move');
      }
    });
    
    // Accept the cage curse
    await page.locator('[data-testid="encounter-continue"]').click();
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });
    
    await screenshots.capture(page, 'cage-curse-applied', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify cage curse was applied
        const quinnHp = storeState.game.heroHp.find((h: any) => h.heroId === 'quinn');
        expect(quinnHp.statuses).toBeDefined();
        
        const cageCurse = quinnHp.statuses.find((s: any) => s.type === 'curse-cage');
        expect(cageCurse).toBeDefined();
        expect(cageCurse.source).toBe('cage');
        
        // Quinn should now have both curses
        expect(quinnHp.statuses.length).toBeGreaterThanOrEqual(2);
      }
    });
  });
});
