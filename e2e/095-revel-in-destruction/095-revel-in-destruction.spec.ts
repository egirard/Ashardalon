import { test, expect } from '@playwright/test';
import { createScreenshotHelper, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('095 - Revel in Destruction Encounter Card', () => {
  test('encounter card heals a damaged monster by 1 HP', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Navigate and start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'character-select-screen', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="character-select"]')).toBeVisible();
      }
    });
    
    // Select Quinn from bottom edge
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    
    // Wait for game board
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);
    
    // STEP 2: Set up game state with damaged monster
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Position Quinn
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 4 } }
      });
      
      // Add a damaged Cultist monster (max HP 2, current HP 1)
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
    });
    
    await screenshots.capture(page, 'game-state-with-damaged-monster', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify game state
        expect(storeState.game.monsters).toHaveLength(1);
        expect(storeState.game.monsters[0].monsterId).toBe('cultist');
        expect(storeState.game.monsters[0].currentHp).toBe(1);
        expect(storeState.game.turnState.currentPhase).toBe('hero-phase');
      }
    });
    
    // STEP 3: Draw Revel in Destruction encounter card
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Force draw the Revel in Destruction encounter using the encounter ID
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'revel-in-destruction'
      });
    });
    
    // Wait for encounter card to appear
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'revel-in-destruction-encounter-displayed', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        expect(storeState.game.drawnEncounter).not.toBeNull();
        expect(storeState.game.drawnEncounter.id).toBe('revel-in-destruction');
        
        // Verify encounter card is visible
        await expect(page.locator('[data-testid="encounter-card"]')).toBeVisible();
        await expect(page.locator('[data-testid="encounter-name"]')).toContainText('Revel in Destruction');
        await expect(page.locator('[data-testid="encounter-description"]')).toContainText('Choose a damaged Monster');
      }
    });
    
    // STEP 4: Accept the encounter card - this should heal the monster
    await page.locator('[data-testid="encounter-continue"]').click();
    
    // Wait for encounter card to disappear
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });
    
    // Wait for effect notification to appear
    await page.locator('[data-testid="encounter-effect-notification"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'healing-effect-notification', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-effect-notification"]')).toBeVisible();
        await expect(page.locator('[data-testid="notification-title"]')).toContainText('Encounter Effect');
        
        // Verify the effect message shows healing details
        const messageElement = page.locator('[data-testid="effect-message"]');
        await expect(messageElement).toBeVisible();
        const messageText = await messageElement.textContent();
        
        // Message should contain healing information with HP change
        expect(messageText).toContain('healed');
        expect(messageText).toContain('1 → 2 HP');
        expect(messageText).toContain('Cultist');
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify the monster was actually healed
        expect(storeState.game.monsters[0].currentHp).toBe(2);
        expect(storeState.game.encounterEffectMessage).toContain('healed');
        expect(storeState.game.encounterEffectMessage).toContain('1 → 2 HP');
      }
    });
    
    // STEP 5: Dismiss the notification
    await page.locator('[data-testid="dismiss-effect-notification"]').click();
    
    // Wait for notification to disappear
    await page.locator('[data-testid="encounter-effect-notification"]').waitFor({ state: 'hidden' });
    
    await screenshots.capture(page, 'notification-dismissed-monster-healed', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-effect-notification"]')).not.toBeVisible();
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify encounter is dismissed
        expect(storeState.game.drawnEncounter).toBeNull();
        expect(storeState.game.encounterEffectMessage).toBeNull();
        
        // Verify monster HP remains at 2 (healed)
        expect(storeState.game.monsters[0].currentHp).toBe(2);
        
        // Verify encounter card was discarded
        expect(storeState.game.encounterDeck.discardPile).toContain('revel-in-destruction');
      }
    });
    
    // STEP 6: Test the "no damaged monsters" case
    // Draw the card again when monster is at full HP
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Draw "Revel in Destruction" encounter again
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'revel-in-destruction'
      });
    });
    
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'second-encounter-full-hp-monster', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-card"]')).toBeVisible();
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Monster should still be at full HP
        expect(storeState.game.monsters[0].currentHp).toBe(2);
      }
    });
    
    // Accept the encounter
    await page.locator('[data-testid="encounter-continue"]').click();
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });
    await page.locator('[data-testid="encounter-effect-notification"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'no-damaged-monsters-notification', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-effect-notification"]')).toBeVisible();
        
        const messageElement = page.locator('[data-testid="effect-message"]');
        await expect(messageElement).toBeVisible();
        const messageText = await messageElement.textContent();
        
        // Message should indicate no damaged monsters
        expect(messageText).toBe('No damaged monsters to heal');
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Monster HP should remain unchanged at max
        expect(storeState.game.monsters[0].currentHp).toBe(2);
      }
    });
    
    // Dismiss final notification
    await page.locator('[data-testid="dismiss-effect-notification"]').click();
    await page.locator('[data-testid="encounter-effect-notification"]').waitFor({ state: 'hidden' });
    
    await screenshots.capture(page, 'test-complete', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-effect-notification"]')).not.toBeVisible();
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        expect(storeState.game.drawnEncounter).toBeNull();
        expect(storeState.game.monsters[0].currentHp).toBe(2);
      }
    });
  });
});
