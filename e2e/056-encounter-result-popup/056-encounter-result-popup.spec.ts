import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards } from '../helpers/screenshot-helper';

test.describe('056 - Encounter Result Popup', () => {
  test('displays popup showing encounter effects on players with damage and attack results', async ({ page }) => {
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
    
    // STEP 2: Set up game state - trigger a damage encounter
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Position Quinn
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 4 } }
      });
      
      // Set hero HP to full
      store.dispatch({
        type: 'game/setHeroHp',
        payload: { heroId: 'quinn', currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 }
      });
      
      // Draw "Frenzied Leap" damage encounter
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'frenzied-leap'
      });
    });
    
    // Wait for encounter card to appear
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'damage-encounter-card-displayed', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-card"]')).toBeVisible();
        await expect(page.locator('[data-testid="encounter-name"]')).toContainText('Frenzied Leap');
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.drawnEncounter).not.toBeNull();
        expect(storeState.game.drawnEncounter.id).toBe('frenzied-leap');
      }
    });
    
    // STEP 3: Accept the encounter (applies effect)
    await page.locator('[data-testid="encounter-continue"]').click();
    
    // Wait for encounter card to disappear
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });
    
    // STEP 4: Result popup should appear showing the damage taken
    await page.locator('[data-testid="encounter-result-popup"]').waitFor({ state: 'visible', timeout: 2000 });
    
    await screenshots.capture(page, 'encounter-result-popup-showing-damage', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-result-popup"]')).toBeVisible();
        await expect(page.locator('[data-testid="encounter-result-title"]')).toContainText('Frenzied Leap');
        await expect(page.locator('[data-testid="result-hero-name"]')).toContainText('Quinn');
        await expect(page.locator('[data-testid="result-damage"]')).toContainText('2');
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.encounterResult).not.toBeNull();
        expect(storeState.game.encounterResult.targets).toHaveLength(1);
        expect(storeState.game.encounterResult.targets[0].damageTaken).toBe(2);
        
        // Verify HP was reduced
        const quinnHp = storeState.game.heroHp.find((h: any) => h.heroId === 'quinn');
        expect(quinnHp.currentHp).toBe(6); // 8 - 2 = 6
      }
    });
    
    // STEP 5: Dismiss the result popup
    await page.locator('[data-testid="continue-button"]').click();
    
    // Wait for result popup to disappear
    await page.locator('[data-testid="encounter-result-popup"]').waitFor({ state: 'hidden' });
    
    await screenshots.capture(page, 'result-popup-dismissed', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-result-popup"]')).not.toBeVisible();
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.encounterResult).toBeNull();
        
        // HP should still be reduced
        const quinnHp = storeState.game.heroHp.find((h: any) => h.heroId === 'quinn');
        expect(quinnHp.currentHp).toBe(6);
      }
    });
    
    // STEP 6: Test attack encounter with hit/miss display
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Draw "Bull's Eye!" attack encounter
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'bulls-eye'
      });
    });
    
    // Wait for encounter card
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'attack-encounter-card-displayed', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-name"]')).toContainText("Bull's Eye");
      }
    });
    
    // Accept the attack encounter
    await page.locator('[data-testid="encounter-continue"]').click();
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });
    
    // Result popup should show attack outcome
    await page.locator('[data-testid="encounter-result-popup"]').waitFor({ state: 'visible', timeout: 2000 });
    
    await screenshots.capture(page, 'attack-result-popup-with-roll', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-result-popup"]')).toBeVisible();
        await expect(page.locator('[data-testid="result-attack-outcome"]')).toBeVisible();
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.encounterResult).not.toBeNull();
        const result = storeState.game.encounterResult.targets[0];
        expect(result.wasHit).toBeDefined();
        expect(result.attackRoll).toBeDefined();
        expect(result.attackTotal).toBeDefined();
        expect(result.targetAC).toBe(17);
      }
    });
    
    // Dismiss the attack result popup
    await page.locator('[data-testid="continue-button"]').click();
    await page.locator('[data-testid="encounter-result-popup"]').waitFor({ state: 'hidden' });
    
    await screenshots.capture(page, 'attack-result-dismissed', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-result-popup"]')).not.toBeVisible();
      }
    });
  });
});
