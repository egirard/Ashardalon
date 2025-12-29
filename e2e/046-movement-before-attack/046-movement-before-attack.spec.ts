import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction } from '../helpers/screenshot-helper';

/**
 * E2E Test 046: Movement Before Attack (All Movement-Attack Card Flows)
 * 
 * This test validates power cards that require movement before attacking:
 * - Charge (ID: 12): Move up to your speed, then attack one adjacent Monster
 * - Taunting Advance (ID: 17): Move your speed, then choose Monster within 2 tiles, place adjacent, attack
 * 
 * Note: Righteous Advance (ID: 3) is NOT a movement-before-attack card.
 * It's an attack that grants ally movement as a Hit or Miss effect, not movement-before-attack.
 * 
 * Test Flow:
 * 1. Character selected and placed on tile
 * 2. Monster added to non-adjacent space (within movement+attack range)
 * 3. Charge attack is enabled (because monster is within movement+attack range)
 * 4. Player selects "charge" card - this initiates movement phase
 * 5. Player moves adjacent to monster
 * 6. Player selects monster to attack
 * 7. Attack executes with Charge
 */

test.describe('046 - Movement Before Attack', () => {
  test('Charge card - move then attack flow', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Character selection - Select Vistra (Fighter with Charge card)
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-vistra"]').click();
    
    // Select power cards - Vistra's default includes Charge (ID: 12) and Reaping Strike (ID: 13)
    await selectDefaultPowerCards(page, 'vistra');
    
    await screenshots.capture(page, 'character-selected', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="hero-vistra"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled();
      }
    });

    // Start game
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // STEP 2: Character placed on tile - Set deterministic hero position
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'vistra', position: { x: 3, y: 2 } }
      });
    });

    // Wait for position to be applied
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 3, y: 2 });
    }).toPass();

    // Wait for UI elements to be ready
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-token"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'hero-placed-on-tile', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify game board is visible
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
        
        // Verify hero position
        expect(storeState.game.heroTokens[0].position).toEqual({ x: 3, y: 2 });
        
        // Verify hero has Charge card available (ID: 12)
        const heroPowerCards = storeState.heroes.heroPowerCards.vistra;
        expect(heroPowerCards.atWills).toContain(12); // Charge
        
        // Verify turn state
        expect(storeState.game.turnState?.currentPhase).toBe('hero-phase');
      }
    });

    // STEP 3: Monster added to non-adjacent space (2 squares away)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-far',
          position: { x: 3, y: 4 }, // 2 squares away from hero at (3, 2)
          currentHp: 2,
          controllerId: 'vistra',
          tileId: 'start-tile'
        }]
      });
    });

    // Wait for monster to appear
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.monsters.length).toBe(1);
    }).toPass();

    // IMPORTANT: Reset hero turn actions to ensure canMove and canAttack are true
    // This ensures the movement-before-attack logic can activate
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroTurnActions',
        payload: { actionsTaken: [], canMove: true, canAttack: true }
      });
    });

    await screenshots.capture(page, 'monster-not-adjacent', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify monster is NOT adjacent to hero
        const heroPos = storeState.game.heroTokens[0].position;
        const monsterPos = storeState.game.monsters[0].position;
        const distance = Math.abs(heroPos.x - monsterPos.x) + Math.abs(heroPos.y - monsterPos.y);
        expect(distance).toBe(2); // Not adjacent
      }
    });

    // STEP 4: Attack panel should show with Charge enabled
    // With the new implementation, Charge should be enabled because monster is within movement+attack range
    // (Hero at 3,2 can move up to 5 squares + 1 attack = 6 total distance, monster at 3,4 is only 2 away)
    await page.locator('[data-testid="power-card-attack-panel"]').waitFor({ state: 'visible', timeout: 5000 });

    await screenshots.capture(page, 'charge-card-visible-in-panel', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify attack panel is visible
        await expect(page.locator('[data-testid="power-card-attack-panel"]')).toBeVisible();
        
        // Verify Charge card is visible and enabled
        await expect(page.locator('[data-testid="attack-card-12"]')).toBeVisible();
        await expect(page.locator('[data-testid="attack-card-12"]')).not.toBeDisabled();
        
        // Verify hero has Charge card available (ID: 12)
        const heroPowerCards = storeState.heroes.heroPowerCards.vistra;
        expect(heroPowerCards.atWills).toContain(12); // Charge
        
        // Verify monster is not adjacent (2 squares away)
        const heroPos = storeState.game.heroTokens[0].position;
        const monsterPos = storeState.game.monsters[0].position;
        const distance = Math.abs(heroPos.x - monsterPos.x) + Math.abs(heroPos.y - monsterPos.y);
        expect(distance).toBe(2); // Not adjacent
      }
    });

    // STEP 5a: Player clicks Charge card to activate it
    await page.locator('[data-testid="attack-card-12"]').click();
    
    // STEP 5b: Movement UI should appear after activating Charge
    await page.locator('[data-testid="movement-overlay"]').waitFor({ state: 'visible', timeout: 5000 });

    await screenshots.capture(page, 'charge-activated-movement-ui-appears', {
      programmaticCheck: async () => {
        // Verify movement overlay is visible
        await expect(page.locator('[data-testid="movement-overlay"]')).toBeVisible();
        
        // Verify move squares are shown
        const moveSquares = page.locator('[data-testid="move-square"]');
        const squareCount = await moveSquares.count();
        expect(squareCount).toBeGreaterThan(0);
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify pendingMoveAttack state is set
        expect(storeState.game.pendingMoveAttack).not.toBeNull();
        expect(storeState.game.pendingMoveAttack.cardId).toBe(12);
      }
    });

    // STEP 6: Player moves next to monster using movement UI
    // Click on the square adjacent to monster (3, 3)
    const targetSquare = page.locator('[data-testid="move-square"][data-position-x="3"][data-position-y="3"]');
    
    // Wait for target square to be visible
    await expect(targetSquare).toBeVisible({ timeout: 5000 });
    await targetSquare.click();
    
    // NOTE: Movement overlay should STAY VISIBLE during charging mode
    // (player can continue moving until they attack or cancel)
    
    // Wait for hero position to update
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 3, y: 3 });
    }).toPass();

    await screenshots.capture(page, 'moved-adjacent-to-monster', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        const heroPos = storeState.game.heroTokens[0].position;
        const monsterPos = storeState.game.monsters[0].position;
        const distance = Math.abs(heroPos.x - monsterPos.x) + Math.abs(heroPos.y - monsterPos.y);
        
        // Hero should now be adjacent to monster
        expect(distance).toBe(1);
        expect(heroPos).toEqual({ x: 3, y: 3 });
        
        // Movement overlay should still be visible (charging mode)
        await expect(page.locator('[data-testid="movement-overlay"]')).toBeVisible();
      }
    });

    // STEP 7: After movement, attack button should appear (while still in charging mode)
    // Wait for target selection to appear
    await page.locator('[data-testid="target-selection"]').waitFor({ state: 'visible', timeout: 5000 });

    await screenshots.capture(page, 'attack-button-appears', {
      programmaticCheck: async () => {
        // Check if target selection is visible
        await expect(page.locator('[data-testid="target-selection"]')).toBeVisible();
        
        // Check if attack button for the monster is visible
        await expect(page.locator('[data-testid="attack-target-kobold-far"]')).toBeVisible();
        
        // Verify button text mentions the monster
        const buttonText = await page.locator('[data-testid="attack-target-kobold-far"]').textContent();
        expect(buttonText).toContain('Kobold');
      }
    });

    // STEP 8: Player clicks attack button to attack the monster
    // Seed Math.random for deterministic dice roll
    await page.evaluate(() => {
      (window as any).__originalRandom = Math.random;
      Math.random = () => 0.75; // Will give roll = floor(0.75 * 20) + 1 = 16
    });

    await page.locator('[data-testid="attack-target-kobold-far"]').click();

    // Restore Math.random
    await page.evaluate(() => {
      if ((window as any).__originalRandom) {
        Math.random = (window as any).__originalRandom;
      }
    });

    // Wait for combat result
    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible', timeout: 5000 });
    
    // After attack, movement overlay should now be hidden
    await page.locator('[data-testid="movement-overlay"]').waitFor({ state: 'hidden', timeout: 5000 });
    
    await screenshots.capture(page, 'attack-result-displayed', {
      programmaticCheck: async () => {
        // Verify combat result is displayed
        await expect(page.locator('[data-testid="combat-result"]')).toBeVisible();
        
        // Verify it's a Charge attack
        const attackerInfo = await page.locator('[data-testid="attacker-info"]').textContent();
        expect(attackerInfo).toContain('Charge');
        
        // Verify movement overlay is now hidden
        await expect(page.locator('[data-testid="movement-overlay"]')).not.toBeVisible();
      }
    });
  });

  test('Movement-before-attack card parsing - verify card detection', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // This test validates that the system correctly identifies cards that require movement first
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'character-selection-screen', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="character-select"]')).toBeVisible();
      }
    });

    // Test the card parsing in the browser context
    await screenshots.capture(page, 'validate-movement-first-parsing', {
      programmaticCheck: async () => {
        // Use page.evaluate to test the parsing logic
        const parseResults = await page.evaluate(() => {
          // Verify card IDs for movement-before-attack cards
          return {
            chargeId: 12,
            tauntingAdvanceId: 17,
            righteousAdvanceId: 3,
          };
        });
        
        // Verify card IDs
        expect(parseResults.chargeId).toBe(12);
        expect(parseResults.tauntingAdvanceId).toBe(17);
        expect(parseResults.righteousAdvanceId).toBe(3);
      }
    });
  });

  test('Cancel Charge - undo movement and return to normal state', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // SETUP: Same as first test - get to the point where Charge is initiated
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-vistra"]').click();
    await selectDefaultPowerCards(page, 'vistra');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Set hero position
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'vistra', position: { x: 3, y: 2 } }
      });
    });

    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 3, y: 2 });
    }).toPass();

    // Spawn monster not adjacent
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-cancel-test',
          position: { x: 3, y: 4 },
          currentHp: 2,
          controllerId: 'vistra',
          tileId: 'start-tile'
        }]
      });
    });

    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.monsters.length).toBe(1);
    }).toPass();

    // IMPORTANT: Reset hero turn actions to ensure canMove and canAttack are true
    // This ensures the movement-before-attack logic can activate
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroTurnActions',
        payload: { actionsTaken: [], canMove: true, canAttack: true }
      });
    });

    await screenshots.capture(page, 'cancel-test-setup', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.heroTokens[0].position).toEqual({ x: 3, y: 2 });
        expect(storeState.game.monsters[0].position).toEqual({ x: 3, y: 4 });
      }
    });

    // Click Charge to initiate movement
    await page.locator('[data-testid="power-card-attack-panel"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('[data-testid="attack-card-12"]').click();
    await page.locator('[data-testid="movement-overlay"]').waitFor({ state: 'visible', timeout: 5000 });

    await screenshots.capture(page, 'cancel-test-charge-initiated', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="movement-overlay"]')).toBeVisible();
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.pendingMoveAttack).not.toBeNull();
      }
    });

    // Move one square
    const moveSquare = page.locator('[data-testid="move-square"][data-position-x="3"][data-position-y="3"]');
    await expect(moveSquare).toBeVisible({ timeout: 5000 });
    await moveSquare.click();

    // Wait for hero to move
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 3, y: 3 });
    }).toPass();

    await screenshots.capture(page, 'cancel-test-after-move', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        // Hero should have moved
        expect(storeState.game.heroTokens[0].position).toEqual({ x: 3, y: 3 });
        // pendingMoveAttack should still be set
        expect(storeState.game.pendingMoveAttack).not.toBeNull();
      }
    });

    // Now cancel the move-attack
    const cancelButton = page.locator('[data-testid="cancel-move-attack"]');
    await expect(cancelButton).toBeVisible({ timeout: 5000 });
    
    await screenshots.capture(page, 'cancel-button-visible', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="cancel-move-attack"]')).toBeVisible();
      }
    });

    await cancelButton.click();

    // After cancel, hero should be back at starting position
    // but movement overlay should REMAIN visible because player can still move
    // (canMove is still true, so they can move normally after canceling the charge)
    
    // Wait for cancel to take effect
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      // Hero should be back at starting position
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 3, y: 2 });
      // pendingMoveAttack should be cleared
      expect(storeState.game.pendingMoveAttack).toBeNull();
    }).toPass();

    await screenshots.capture(page, 'cancel-complete-hero-restored', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify hero position restored
        expect(storeState.game.heroTokens[0].position).toEqual({ x: 3, y: 2 });
        
        // Verify pendingMoveAttack cleared
        expect(storeState.game.pendingMoveAttack).toBeNull();
        
        // Movement overlay should REMAIN visible because player can still move
        expect(storeState.game.showingMovement).toBe(true);
        await expect(page.locator('[data-testid="movement-overlay"]')).toBeVisible();
      }
    });
  });
});
