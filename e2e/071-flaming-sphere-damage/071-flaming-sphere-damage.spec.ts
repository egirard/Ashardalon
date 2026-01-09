import { test, expect } from '@playwright/test';
import { createScreenshotHelper, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('071 - Flaming Sphere Damage Activation', () => {
  test('User can activate Flaming Sphere damage to hurt monsters and consume charges', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Setup - Select Haskan with Flaming Sphere and start game
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-haskan-bottom"]').click();

    await page.locator('[data-testid="select-powers-haskan"]').click();
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="daily-card-45"]').click();
    await page.locator('[data-testid="expanded-card"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="select-expanded-card"]').click();
    await page.locator('[data-testid="done-power-selection"]').click();
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'hidden' });

    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Set deterministic hero position
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'haskan', position: { x: 2, y: 3 } }
      });
    });

    // Disable animations
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

    // STEP 2: Place Flaming Sphere token and monsters on same tile
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Place Flaming Sphere token at position (2, 2)
      const token = {
        id: 'token-flaming-sphere-test',
        type: 'flaming-sphere',
        powerCardId: 45,
        ownerId: 'haskan',
        position: { x: 2, y: 2 },
        charges: 3,
        canMove: true
      };
      
      // Place two monsters on the same tile as the sphere
      // Tile boundaries: Start tile is rows 0-7 (y: 0-7), so position (2, 2) is on start tile
      const monsters = [
        {
          instanceId: 'monster-test-1',
          monsterId: 'kobold',
          position: { x: 2, y: 1 }, // Same tile as token
          currentHp: 3,
          maxHp: 3,
          ac: 15,
          hasActivated: false
        },
        {
          instanceId: 'monster-test-2',
          monsterId: 'goblin',
          position: { x: 3, y: 2 }, // Same tile as token
          currentHp: 4,
          maxHp: 4,
          ac: 15,
          hasActivated: false
        }
      ];
      
      store.dispatch({
        type: 'game/setBoardTokens',
        payload: [token]
      });
      
      store.dispatch({
        type: 'game/setMonsters',
        payload: monsters
      });
      
      // Mark card as used
      store.dispatch({
        type: 'heroes/usePowerCard',
        payload: { heroId: 'haskan', cardId: 45 }
      });
    });

    await page.locator('[data-testid="board-token"]').first().waitFor({ state: 'visible' });

    await screenshots.capture(page, 'sphere-and-monsters-placed', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify token
        expect(storeState.game.boardTokens).toHaveLength(1);
        expect(storeState.game.boardTokens[0].charges).toBe(3);
        
        // Verify monsters
        expect(storeState.game.monsters).toHaveLength(2);
        expect(storeState.game.monsters[0].currentHp).toBe(3);
        expect(storeState.game.monsters[1].currentHp).toBe(4);
      }
    });

    // STEP 3: Click Flaming Sphere card to open details panel with damage button
    await page.locator('[data-testid="power-card-45"]').click();
    await page.waitForTimeout(300);
    
    // Wait for actions panel to appear
    await page.locator('[data-testid="flaming-sphere-actions"]').waitFor({ state: 'visible', timeout: 5000 });

    await screenshots.capture(page, 'damage-button-available', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="power-card-details-panel"]')).toBeVisible();
        await expect(page.locator('[data-testid="flaming-sphere-actions"]')).toBeVisible();
        await expect(page.locator('[data-testid="activate-flaming-sphere-damage-button"]')).toBeVisible();
        await expect(page.locator('[data-testid="activate-flaming-sphere-damage-button"]')).toBeEnabled();
        
        // Button should be visible
        const damageButton = page.locator('[data-testid="activate-flaming-sphere-damage-button"]');
        const buttonText = await damageButton.textContent();
        expect(buttonText).toContain('Activate Damage');
      }
    });

    // STEP 4: Click Activate Damage button
    await page.locator('[data-testid="activate-flaming-sphere-damage-button"]').click();
    await page.waitForTimeout(500);

    await screenshots.capture(page, 'damage-applied-charge-decremented', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Token should still exist but with 2 charges
        expect(storeState.game.boardTokens).toHaveLength(1);
        expect(storeState.game.boardTokens[0].charges).toBe(2);
        
        // Both monsters should have taken 1 damage
        expect(storeState.game.monsters[0].currentHp).toBe(2); // Was 3, now 2
        expect(storeState.game.monsters[1].currentHp).toBe(3); // Was 4, now 3
      }
    });

    // STEP 5: Activate damage again
    await page.locator('[data-testid="activate-flaming-sphere-damage-button"]').click();
    await page.waitForTimeout(500);

    await screenshots.capture(page, 'second-activation', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Token should have 1 charge left
        expect(storeState.game.boardTokens).toHaveLength(1);
        expect(storeState.game.boardTokens[0].charges).toBe(1);
        
        // Monsters should have taken more damage
        expect(storeState.game.monsters[0].currentHp).toBe(1); // Was 2, now 1
        expect(storeState.game.monsters[1].currentHp).toBe(2); // Was 3, now 2
      }
    });

    // STEP 6: Activate damage one more time (final charge)
    await page.locator('[data-testid="activate-flaming-sphere-damage-button"]').click();
    await page.waitForTimeout(500);

    await screenshots.capture(page, 'token-removed-after-final-charge', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Token should be removed (0 charges means removal)
        expect(storeState.game.boardTokens).toHaveLength(0);
        
        // One monster should be defeated and removed
        expect(storeState.game.monsters).toHaveLength(1);
        // The surviving monster should have 1 HP left
        expect(storeState.game.monsters[0].currentHp).toBe(1); // Was 2, now 1
        
        // Token should not be visible anymore
        await expect(page.locator('[data-testid="board-token"]')).toHaveCount(0);
        
        // Actions panel should not be visible (no token, so card details panel will show "Already Used")
        await expect(page.locator('[data-testid="flaming-sphere-actions"]')).not.toBeVisible();
      }
    });
  });
});
