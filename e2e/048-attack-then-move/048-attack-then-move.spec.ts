import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction } from '../helpers/screenshot-helper';

/**
 * E2E Test 048: Attack Then Move (Righteous Advance Card Flow)
 * 
 * This test validates power cards that allow movement AFTER attacking:
 * - Righteous Advance (ID: 3): Attack one adjacent Monster. Hit or Miss: One Hero on your tile moves 2 squares.
 * 
 * Note: This is the opposite of Charge (ID: 12) which requires movement BEFORE attacking.
 * The key difference is that the attack happens first, and THEN the ally can move.
 * 
 * Test Flow:
 * 1. Character selected and placed on tile
 * 2. Monster added adjacent to hero
 * 3. Hero attacks with Righteous Advance
 * 4. Attack resolves (hit or miss)
 * 5. After dismissing attack result, movement UI appears for ally
 * 6. Player moves the ally (or cancels)
 * 7. Game continues based on whether this was first or second action
 */

test.describe('048 - Attack Then Move (Righteous Advance)', () => {
  test('Righteous Advance - attack then move ally flow', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Character selection - Select Quinn (Cleric with Righteous Advance card)
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    
    // Select power cards - Quinn's default includes Righteous Advance (ID: 3)
    await selectDefaultPowerCards(page, 'quinn');
    
    await screenshots.capture(page, 'character-selected', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="hero-quinn-bottom"]')).toHaveClass(/selected/);
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
        payload: { heroId: 'quinn', position: { x: 3, y: 2 } }
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
        
        // Verify hero has Righteous Advance card available (ID: 3)
        const heroPowerCards = storeState.heroes.heroPowerCards.quinn;
        expect(heroPowerCards.atWills).toContain(3); // Righteous Advance
        
        // Verify turn state
        expect(storeState.game.turnState?.currentPhase).toBe('hero-phase');
      }
    });

    // STEP 3: Monster added adjacent to hero
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-adjacent',
          position: { x: 3, y: 3 }, // Adjacent to hero at (3, 2)
          currentHp: 2,
          controllerId: 'quinn',
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
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroTurnActions',
        payload: { actionsTaken: [], canMove: true, canAttack: true }
      });
    });

    await screenshots.capture(page, 'monster-adjacent', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify monster is adjacent to hero
        const heroPos = storeState.game.heroTokens[0].position;
        const monsterPos = storeState.game.monsters[0].position;
        const distance = Math.abs(heroPos.x - monsterPos.x) + Math.abs(heroPos.y - monsterPos.y);
        expect(distance).toBe(1); // Adjacent
      }
    });

    // STEP 4: Attack panel should show with Righteous Advance enabled
    await page.locator('[data-testid="power-card-attack-panel"]').waitFor({ state: 'visible', timeout: 5000 });

    await screenshots.capture(page, 'righteous-advance-in-panel', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify attack panel is visible
        await expect(page.locator('[data-testid="power-card-attack-panel"]')).toBeVisible();
        
        // Verify Righteous Advance card is visible and enabled
        await expect(page.locator('[data-testid="attack-card-3"]')).toBeVisible();
        await expect(page.locator('[data-testid="attack-card-3"]')).not.toBeDisabled();
        
        // Verify hero has Righteous Advance card available (ID: 3)
        const heroPowerCards = storeState.heroes.heroPowerCards.quinn;
        expect(heroPowerCards.atWills).toContain(3); // Righteous Advance
      }
    });

    // STEP 5: Player clicks Righteous Advance card to select it
    await page.locator('[data-testid="attack-card-3"]').click();
    
    // Wait for target selection to appear
    await page.locator('[data-testid="target-selection"]').waitFor({ state: 'visible', timeout: 5000 });

    await screenshots.capture(page, 'target-selection-appears', {
      programmaticCheck: async () => {
        // Check if target selection is visible
        await expect(page.locator('[data-testid="target-selection"]')).toBeVisible();
        
        // Check if attack button for the monster is visible
        await expect(page.locator('[data-testid="attack-target-kobold-adjacent"]')).toBeVisible();
      }
    });

    // STEP 6: Player attacks the monster
    // Seed Math.random for deterministic dice roll
    await page.evaluate(() => {
      (window as any).__originalRandom = Math.random;
      Math.random = () => 0.75; // Will give roll = floor(0.75 * 20) + 1 = 16
    });

    await page.locator('[data-testid="attack-target-kobold-adjacent"]').click();

    // Restore Math.random
    await page.evaluate(() => {
      if ((window as any).__originalRandom) {
        Math.random = (window as any).__originalRandom;
      }
    });

    // Wait for combat result
    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible', timeout: 5000 });
    
    await screenshots.capture(page, 'attack-result-displayed', {
      programmaticCheck: async () => {
        // Verify combat result is displayed
        await expect(page.locator('[data-testid="combat-result"]')).toBeVisible();
        
        // Verify it's a Righteous Advance attack
        const attackerInfo = await page.locator('[data-testid="attacker-info"]').textContent();
        expect(attackerInfo).toContain('Righteous Advance');
      }
    });

    // STEP 7: Dismiss attack result - this should trigger movement UI for ally
    await page.locator('[data-testid="dismiss-combat-result"]').click();
    
    // Movement overlay should appear after dismissing attack result
    await page.locator('[data-testid="movement-overlay"]').waitFor({ state: 'visible', timeout: 5000 });

    await screenshots.capture(page, 'movement-ui-after-attack', {
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
        
        // Verify pendingMoveAfterAttack state is set
        expect(storeState.game.pendingMoveAfterAttack).not.toBeNull();
        expect(storeState.game.pendingMoveAfterAttack.cardId).toBe(3);
        expect(storeState.game.pendingMoveAfterAttack.moveDistance).toBe(2);
      }
    });

    // STEP 8: Player moves the ally 2 squares
    // Move to position (3, 4)
    const targetSquare = page.locator('[data-testid="move-square"][data-position-x="3"][data-position-y="4"]');
    
    // Wait for target square to be visible
    await expect(targetSquare).toBeVisible({ timeout: 5000 });
    await targetSquare.click();
    
    // Wait for hero position to update
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 3, y: 4 });
    }).toPass();

    await screenshots.capture(page, 'ally-moved-after-attack', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify hero moved to new position
        expect(storeState.game.heroTokens[0].position).toEqual({ x: 3, y: 4 });
        
        // Movement overlay should still be visible (can continue moving within 2 squares)
        await expect(page.locator('[data-testid="movement-overlay"]')).toBeVisible();
      }
    });

    // STEP 9: Complete the movement (click "Complete Move" button or move is auto-completed)
    // For now, let's assume the movement completes when the player clicks away or finalizes
    // This would trigger completeMoveAfterAttack
  });

  test('Cancel move after attack - skip movement portion', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // SETUP: Same as first test - get to the point where movement UI appears after attack
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Set hero position
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 3, y: 2 } }
      });
    });

    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 3, y: 2 });
    }).toPass();

    // Spawn monster adjacent
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-cancel-test',
          position: { x: 3, y: 3 },
          currentHp: 2,
          controllerId: 'quinn',
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

    // Reset hero turn actions
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
        expect(storeState.game.monsters[0].position).toEqual({ x: 3, y: 3 });
      }
    });

    // Attack with Righteous Advance
    await page.locator('[data-testid="power-card-attack-panel"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('[data-testid="attack-card-3"]').click();
    await page.locator('[data-testid="target-selection"]').waitFor({ state: 'visible', timeout: 5000 });
    
    // Seed random for attack
    await page.evaluate(() => {
      (window as any).__originalRandom = Math.random;
      Math.random = () => 0.75;
    });
    
    await page.locator('[data-testid="attack-target-kobold-cancel-test"]').click();
    
    await page.evaluate(() => {
      if ((window as any).__originalRandom) {
        Math.random = (window as any).__originalRandom;
      }
    });

    // Wait for attack result and dismiss it
    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('[data-testid="dismiss-combat-result"]').click();
    
    // Movement UI should appear
    await page.locator('[data-testid="movement-overlay"]').waitFor({ state: 'visible', timeout: 5000 });

    await screenshots.capture(page, 'cancel-test-movement-ui', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="movement-overlay"]')).toBeVisible();
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.pendingMoveAfterAttack).not.toBeNull();
      }
    });

    // Now cancel the move-after-attack
    const cancelButton = page.locator('[data-testid="cancel-move-after-attack"]');
    await expect(cancelButton).toBeVisible({ timeout: 5000 });
    
    await screenshots.capture(page, 'cancel-button-visible', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="cancel-move-after-attack"]')).toBeVisible();
      }
    });

    await cancelButton.click();

    // After cancel, the pendingMoveAfterAttack state should be cleared
    // Note: The movement grid may remain visible because the player can still move normally
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      // pendingMoveAfterAttack should be cleared (this is what we're testing)
      expect(storeState.game.pendingMoveAfterAttack).toBeNull();
    }).toPass();

    await screenshots.capture(page, 'cancel-complete-no-movement', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify hero position unchanged (no movement happened during move-after-attack)
        expect(storeState.game.heroTokens[0].position).toEqual({ x: 3, y: 2 });
        
        // Verify pendingMoveAfterAttack cleared
        expect(storeState.game.pendingMoveAfterAttack).toBeNull();
        
        // Note: Movement overlay may still be visible - that's OK, player can still move normally
      }
    });
  });

  test('Multiple heroes on tile - select which hero to move', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // SETUP: Start with two heroes - Quinn and Vistra
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    // Select Quinn
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    
    // Select Vistra as well
    await page.locator('[data-testid="hero-vistra-bottom"]').click();
    await selectDefaultPowerCards(page, 'vistra');
    
    await screenshots.capture(page, 'two-heroes-selected', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="hero-quinn-bottom"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="hero-vistra-bottom"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled();
      }
    });

    // Start game
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Place both heroes on the same tile at the same position
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 3, y: 2 } }
      });
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'vistra', position: { x: 3, y: 3 } }
      });
    });

    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      const quinnToken = storeState.game.heroTokens.find((t: any) => t.heroId === 'quinn');
      const vistraToken = storeState.game.heroTokens.find((t: any) => t.heroId === 'vistra');
      expect(quinnToken.position).toEqual({ x: 3, y: 2 });
      expect(vistraToken.position).toEqual({ x: 3, y: 3 });
    }).toPass();

    await screenshots.capture(page, 'both-heroes-on-tile', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify both heroes are placed
        expect(storeState.game.heroTokens.length).toBe(2);
        
        // It's Quinn's turn
        expect(storeState.game.turnState.currentHeroIndex).toBe(0);
      }
    });

    // Spawn monster adjacent to Quinn
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-multi-hero',
          position: { x: 3, y: 1 }, // Adjacent to Quinn at (3, 2)
          currentHp: 2,
          controllerId: 'quinn',
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

    // Reset hero turn actions
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroTurnActions',
        payload: { actionsTaken: [], canMove: true, canAttack: true }
      });
    });

    await screenshots.capture(page, 'monster-adjacent-multi-hero', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.monsters[0].position).toEqual({ x: 3, y: 1 });
      }
    });

    // Attack with Righteous Advance
    await page.locator('[data-testid="power-card-attack-panel"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('[data-testid="attack-card-3"]').click();
    await page.locator('[data-testid="target-selection"]').waitFor({ state: 'visible', timeout: 5000 });
    
    // Seed random for attack
    await page.evaluate(() => {
      (window as any).__originalRandom = Math.random;
      Math.random = () => 0.75;
    });
    
    await page.locator('[data-testid="attack-target-kobold-multi-hero"]').click();
    
    await page.evaluate(() => {
      if ((window as any).__originalRandom) {
        Math.random = (window as any).__originalRandom;
      }
    });

    // Wait for attack result and dismiss it
    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible', timeout: 5000 });
    
    await screenshots.capture(page, 'attack-result-multi-hero', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="combat-result"]')).toBeVisible();
      }
    });
    
    await page.locator('[data-testid="dismiss-combat-result"]').click();
    
    // Hero selection dialog should appear since there are 2 heroes on the tile
    await page.locator('[data-testid="hero-selection-overlay"]').waitFor({ state: 'visible', timeout: 5000 });

    await screenshots.capture(page, 'hero-selection-dialog', {
      programmaticCheck: async () => {
        // Verify hero selection overlay is visible
        await expect(page.locator('[data-testid="hero-selection-overlay"]')).toBeVisible();
        
        // Verify both hero buttons are present
        await expect(page.locator('[data-testid="select-hero-quinn"]')).toBeVisible();
        await expect(page.locator('[data-testid="select-hero-vistra"]')).toBeVisible();
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify pendingMoveAfterAttack has both heroes available
        expect(storeState.game.pendingMoveAfterAttack).not.toBeNull();
        expect(storeState.game.pendingMoveAfterAttack.availableHeroes).toContain('quinn');
        expect(storeState.game.pendingMoveAfterAttack.availableHeroes).toContain('vistra');
        expect(storeState.game.pendingMoveAfterAttack.selectedHeroId).toBeNull();
      }
    });

    // Select Vistra to move
    await page.locator('[data-testid="select-hero-vistra"]').click();
    
    // Movement UI should appear for Vistra
    await page.locator('[data-testid="movement-overlay"]').waitFor({ state: 'visible', timeout: 5000 });

    await screenshots.capture(page, 'vistra-selected-movement-ui', {
      programmaticCheck: async () => {
        // Verify movement overlay is visible
        await expect(page.locator('[data-testid="movement-overlay"]')).toBeVisible();
        
        // Verify hero selection dialog is gone
        await expect(page.locator('[data-testid="hero-selection-overlay"]')).not.toBeVisible();
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify Vistra was selected
        expect(storeState.game.pendingMoveAfterAttack.selectedHeroId).toBe('vistra');
      }
    });

    // Move Vistra - try a closer square first
    const targetSquare = page.locator('[data-testid="move-square"][data-position-x="3"][data-position-y="4"]');
    await expect(targetSquare).toBeVisible({ timeout: 5000 });
    await targetSquare.click();
    
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      const vistraToken = storeState.game.heroTokens.find((t: any) => t.heroId === 'vistra');
      expect(vistraToken.position).toEqual({ x: 3, y: 4 });
    }).toPass();

    await screenshots.capture(page, 'vistra-moved-after-attack', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify Vistra moved
        const vistraToken = storeState.game.heroTokens.find((t: any) => t.heroId === 'vistra');
        expect(vistraToken.position).toEqual({ x: 3, y: 4 });
        
        // Verify Quinn didn't move
        const quinnToken = storeState.game.heroTokens.find((t: any) => t.heroId === 'quinn');
        expect(quinnToken.position).toEqual({ x: 3, y: 2 });
      }
    });
  });
});
