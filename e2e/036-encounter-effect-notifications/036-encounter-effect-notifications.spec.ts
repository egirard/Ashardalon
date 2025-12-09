import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards } from '../helpers/screenshot-helper';

test.describe('036 - Encounter Effect Notifications', () => {
  test('special encounter cards display effect notifications with details', async ({ page }) => {
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
    
    // STEP 2: Set up game state to trigger special encounter
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Position Quinn
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 4 } }
      });
      
      // Set up monster deck with specific monsters for testing deck manipulation
      store.dispatch({
        type: 'game/setMonsterDeck',
        payload: {
          drawPile: ['kobold', 'kobold', 'cultist', 'snake', 'kobold', 'cultist', 'snake'],
          discardPile: []
        }
      });
    });
    
    await screenshots.capture(page, 'game-state-ready-for-encounter', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 4 });
        expect(storeState.game.monsterDeck.drawPile).toHaveLength(7);
      }
    });
    
    // STEP 3: Manually trigger "Hall of the Orcs" encounter (filters for Orcs)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Draw "Hall of the Orcs" encounter card
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'hall-of-orcs'
      });
    });
    
    // Wait for encounter card to appear
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'hall-of-orcs-encounter-card-displayed', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-card"]')).toBeVisible();
        await expect(page.locator('[data-testid="encounter-name"]')).toContainText('Hall of the Orcs');
        await expect(page.locator('[data-testid="encounter-description"]')).toBeVisible();
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.drawnEncounter).not.toBeNull();
        expect(storeState.game.drawnEncounter.id).toBe('hall-of-orcs');
      }
    });
    
    // STEP 4: Accept the encounter (this triggers deck manipulation)
    await page.locator('[data-testid="encounter-continue"]').click();
    
    // Wait for encounter card to disappear
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });
    
    // Wait for effect notification to appear
    await page.locator('[data-testid="encounter-effect-notification"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'encounter-effect-notification-displayed', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-effect-notification"]')).toBeVisible();
        await expect(page.locator('[data-testid="notification-title"]')).toContainText('Encounter Effect');
        
        // Verify the effect message shows deck manipulation details
        const messageElement = page.locator('[data-testid="effect-message"]');
        await expect(messageElement).toBeVisible();
        const messageText = await messageElement.textContent();
        
        // Message should contain details about cards drawn and placed
        expect(messageText).toContain('Drew 5 monster cards');
        expect(messageText).toMatch(/\d+ (Orc|Orcs) placed on top/);
        expect(messageText).toMatch(/\d+ discarded/);
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.encounterEffectMessage).not.toBeNull();
        expect(storeState.game.encounterEffectMessage).toContain('Drew 5 monster cards');
      }
    });
    
    // STEP 5: Dismiss the notification
    await page.locator('[data-testid="dismiss-effect-notification"]').click();
    
    // Wait for notification to disappear
    await page.locator('[data-testid="encounter-effect-notification"]').waitFor({ state: 'hidden' });
    
    await screenshots.capture(page, 'notification-dismissed', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-effect-notification"]')).not.toBeVisible();
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.encounterEffectMessage).toBeNull();
        
        // Verify monster deck was actually manipulated
        // Since we filtered for Orcs and had no Orcs in the original deck,
        // all 5 cards should have been discarded
        const originalDrawPileLength = 7;
        const cardsDrawn = 5;
        expect(storeState.game.monsterDeck.drawPile.length).toBe(originalDrawPileLength - cardsDrawn);
      }
    });
    
    // STEP 6: Test another encounter - "Revel in Destruction" (heals monster)
    // First, spawn a monster and damage it
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Add a damaged monster (Cultist with 2 max HP, currently at 1 HP)
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'cultist',
          instanceId: 'cultist-0',
          position: { x: 2, y: 5 },
          currentHp: 1,
          controllerId: 'quinn',
          tileId: 'start-tile',
          statuses: []
        }]
      });
      
      // Draw "Revel in Destruction" encounter
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'revel-in-destruction'
      });
    });
    
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'revel-in-destruction-encounter-card', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-name"]')).toContainText('Revel in Destruction');
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.monsters).toHaveLength(1);
        expect(storeState.game.monsters[0].currentHp).toBe(1);
      }
    });
    
    // Accept the encounter (heals the monster)
    await page.locator('[data-testid="encounter-continue"]').click();
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });
    await page.locator('[data-testid="encounter-effect-notification"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'revel-in-destruction-effect-notification', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-effect-notification"]')).toBeVisible();
        
        const messageElement = page.locator('[data-testid="effect-message"]');
        await expect(messageElement).toBeVisible();
        const messageText = await messageElement.textContent();
        
        // Message should show monster healing with HP values
        expect(messageText).toContain('healed');
        expect(messageText).toContain('1 → 2 HP');
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        // Verify monster was actually healed
        expect(storeState.game.monsters[0].currentHp).toBe(2);
      }
    });
    
    // Dismiss and verify
    await page.locator('[data-testid="dismiss-effect-notification"]').click();
    await page.locator('[data-testid="encounter-effect-notification"]').waitFor({ state: 'hidden' });
    
    await screenshots.capture(page, 'monster-healed-notification-dismissed', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-effect-notification"]')).not.toBeVisible();
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.encounterEffectMessage).toBeNull();
        expect(storeState.game.monsters[0].currentHp).toBe(2);
      }
    });
  });
});
