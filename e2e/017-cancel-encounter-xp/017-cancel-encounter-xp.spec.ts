import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards } from '../helpers/screenshot-helper';

test.describe('017 - Cancel Encounter with XP', () => {
  test('Player cancels encounter by spending XP', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Start the game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    // Select power cards for Quinn
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Set deterministic position and hide movement overlay
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 3 } }
      });
      store.dispatch({ type: 'game/hideMovement' });
    });

    // STEP 2: Set party XP to 6 (enough to cancel with 1 left over)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setPartyResources',
        payload: { xp: 6 }
      });
    });

    await screenshots.capture(page, 'initial-6-xp', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.partyResources.xp).toBe(6);
        await expect(page.locator('[data-testid="xp-value"]')).toHaveText('6');
      }
    });

    // STEP 3: Draw an encounter card using the test helper
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'volcanic-spray'
      });
    });

    // Wait for encounter card overlay to appear
    await page.locator('[data-testid="encounter-card-overlay"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'encounter-drawn', {
      programmaticCheck: async () => {
        // Verify encounter card is displayed
        await expect(page.locator('[data-testid="encounter-card"]')).toBeVisible();
        await expect(page.locator('[data-testid="encounter-name"]')).toContainText('Volcanic Spray');
        
        // Verify Cancel button is enabled (party has 6 XP >= 5)
        const cancelButton = page.locator('[data-testid="cancel-encounter-button"]');
        await expect(cancelButton).toBeEnabled();
        await expect(cancelButton).toContainText('Cancel (5 XP)');
        
        // Verify Accept button is available
        await expect(page.locator('[data-testid="accept-encounter-button"]')).toBeVisible();
        
        // Verify Redux state
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.drawnEncounter).not.toBeNull();
        expect(storeState.game.drawnEncounter.id).toBe('volcanic-spray');
        expect(storeState.game.partyResources.xp).toBe(6);
      }
    });

    // STEP 4: Click the Cancel button
    await page.locator('[data-testid="cancel-encounter-button"]').click();

    // Encounter card overlay should be dismissed
    await expect(page.locator('[data-testid="encounter-card-overlay"]')).not.toBeVisible();

    await screenshots.capture(page, 'encounter-cancelled', {
      programmaticCheck: async () => {
        // Verify encounter card is gone
        await expect(page.locator('[data-testid="encounter-card"]')).not.toBeVisible();
        
        // Verify XP is deducted (6 - 5 = 1)
        await expect(page.locator('[data-testid="xp-value"]')).toHaveText('1');
        
        // Verify Redux state
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.drawnEncounter).toBeNull();
        expect(storeState.game.partyResources.xp).toBe(1);
        // Encounter should be in discard pile
        expect(storeState.game.encounterDeck.discardPile).toContain('volcanic-spray');
      }
    });
  });

  test('Cancel button is disabled when party has insufficient XP', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Hide movement overlay
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/hideMovement' });
    });

    // Set party XP to 4 (not enough to cancel)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setPartyResources',
        payload: { xp: 4 }
      });
    });

    // Draw an encounter
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'cave-in'
      });
    });

    await page.locator('[data-testid="encounter-card-overlay"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'cancel-disabled-low-xp', {
      programmaticCheck: async () => {
        // Verify Cancel button is disabled
        const cancelButton = page.locator('[data-testid="cancel-encounter-button"]');
        await expect(cancelButton).toBeDisabled();
        
        // Verify encounter is displayed
        await expect(page.locator('[data-testid="encounter-name"]')).toContainText('Cave-In');
        
        // Verify XP counter shows 4
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.partyResources.xp).toBe(4);
      }
    });

    // Accept the encounter instead
    await page.locator('[data-testid="accept-encounter-button"]').click();
    
    await expect(page.locator('[data-testid="encounter-card-overlay"]')).not.toBeVisible();

    // Verify XP unchanged (no cancel happened) - effect was applied
    const storeState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(storeState.game.partyResources.xp).toBe(4);
    expect(storeState.game.drawnEncounter).toBeNull();
  });

  test('Player accepts encounter without spending XP', async ({ page }) => {
    // Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Hide movement overlay and set XP
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/hideMovement' });
      store.dispatch({
        type: 'game/setPartyResources',
        payload: { xp: 10 }
      });
    });

    // Draw an encounter
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'goblin-ambush'
      });
    });

    await page.locator('[data-testid="encounter-card-overlay"]').waitFor({ state: 'visible' });

    // Click Accept
    await page.locator('[data-testid="accept-encounter-button"]').click();
    
    await expect(page.locator('[data-testid="encounter-card-overlay"]')).not.toBeVisible();

    // Verify XP unchanged (but damage was applied)
    const storeState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(storeState.game.partyResources.xp).toBe(10); // No XP spent
    expect(storeState.game.drawnEncounter).toBeNull();
    // Encounter should be in discard pile (resolved)
    expect(storeState.game.encounterDeck.discardPile).toContain('goblin-ambush');
  });
});
