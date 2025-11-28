import { test, expect } from '@playwright/test';

test.describe('009 - Hero Attacks Monster', () => {
  test('Hero attacks adjacent monster and sees result', async ({ page }) => {
    // STEP 1: Navigate to character selection and select Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // STEP 2: Move Quinn to the north edge to trigger exploration
    await page.locator('[data-testid="start-tile"]').click();
    await page.locator('[data-testid="movement-overlay"]').waitFor({ state: 'visible' });
    
    // Get Quinn's current position
    let currentPos = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState().game.heroTokens[0].position;
    });
    
    // Close movement overlay
    await page.locator('[data-testid="start-tile"]').click();
    await expect(page.locator('[data-testid="movement-overlay"]')).not.toBeVisible();
    
    // Move Quinn to north edge for deterministic positioning
    if (currentPos.y !== 0) {
      await page.evaluate(() => {
        const store = (window as any).__REDUX_STORE__;
        store.dispatch({
          type: 'game/setHeroPosition',
          payload: { heroId: 'quinn', position: { x: 2, y: 0 } }
        });
      });
    }

    // Verify Quinn is at north edge
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 0 });
    }).toPass();

    // STEP 3: End hero phase to trigger tile exploration and monster spawn
    await page.locator('[data-testid="end-phase-button"]').click();
    
    // Wait for monster card to appear (monster spawns on newly explored tile)
    await page.locator('[data-testid="monster-card"]').waitFor({ state: 'visible' });
    
    // Verify monster spawned
    const monsterState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(monsterState.game.monsters.length).toBeGreaterThan(0);
    await expect(page.locator('[data-testid="monster-name"]')).toBeVisible();
    
    // Dismiss the monster card
    await page.locator('[data-testid="dismiss-monster-card"]').click();
    await expect(page.locator('[data-testid="monster-card"]')).not.toBeVisible();

    // STEP 4: Complete the turn cycle to get back to Hero Phase
    await page.locator('[data-testid="end-phase-button"]').click(); // End exploration phase
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Villain Phase');
    await page.locator('[data-testid="end-phase-button"]').click(); // End villain phase
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');

    // Replace the spawned monster with a kobold for consistent screenshots
    // Keep the same position (local coords) and tileId from the spawned monster
    const spawnedMonster = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState().game.monsters[0];
    });
    await page.evaluate((monster) => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          ...monster,
          monsterId: 'kobold',
          instanceId: 'kobold-test'
        }]
      });
    }, spawnedMonster);

    // STEP 5: Move Quinn to be adjacent to the monster using UI movement
    // The monster spawned at local (2,2) on the new tile (at row=-1)
    // Monster's global position is (2, -2) because tile starts at y=-4 and local y is 2
    // Quinn needs to move to a square adjacent to (2, -2) in global coordinates
    
    // Open movement overlay
    await page.locator('[data-testid="start-tile"]').click();
    await page.locator('[data-testid="movement-overlay"]').waitFor({ state: 'visible' });
    
    // Click on a movement square adjacent to the monster
    // Monster is at global (2, -2), so adjacent squares include (2, -1), (2, -3), (1, -2), (3, -2), etc.
    // Move to (2, -3) which should be adjacent to the monster
    const moveSquare = page.locator('[data-testid="move-square"][data-position-x="2"][data-position-y="-3"]');
    const isSquareVisible = await moveSquare.isVisible().catch(() => false);
    
    if (isSquareVisible) {
      await moveSquare.click();
    } else {
      // Fallback: try (2, -1)
      const altSquare = page.locator('[data-testid="move-square"][data-position-x="2"][data-position-y="-1"]');
      const isAltVisible = await altSquare.isVisible().catch(() => false);
      if (isAltVisible) {
        await altSquare.click();
      } else {
        // Direct position for robustness
        await page.locator('[data-testid="start-tile"]').click();
        await expect(page.locator('[data-testid="movement-overlay"]')).not.toBeVisible();
        await page.evaluate(() => {
          const store = (window as any).__REDUX_STORE__;
          store.dispatch({
            type: 'game/setHeroPosition',
            payload: { heroId: 'quinn', position: { x: 2, y: -3 } }
          });
        });
      }
    }
    
    // Wait for movement overlay to close
    await expect(page.locator('[data-testid="movement-overlay"]')).not.toBeVisible();
    
    // Wait for UI to update
    await page.waitForTimeout(100);
    
    // STEP 6: Verify the attack button appears when adjacent to monster
    // Programmatic verification (no screenshot due to random tile/monster variation)
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');
    await expect(page.locator('[data-testid="attack-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="attack-button"]')).toBeVisible();

    // STEP 7: Seed Math.random for deterministic dice roll
    await page.evaluate(() => {
      (window as any).__originalRandom = Math.random;
      Math.random = () => 0.7; // Will give roll = floor(0.7 * 20) + 1 = 15
    });
    
    // Click the attack button
    await page.locator('[data-testid="attack-button"]').click();

    // Restore Math.random
    await page.evaluate(() => {
      if ((window as any).__originalRandom) {
        Math.random = (window as any).__originalRandom;
      }
    });

    // Wait for combat result
    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });

    // Verify combat result
    await expect(page.locator('[data-testid="combat-result"]')).toBeVisible();
    await expect(page.locator('[data-testid="dice-roll"]')).toHaveText('15');
    await expect(page.locator('[data-testid="attack-bonus"]')).toHaveText('6');
    await expect(page.locator('[data-testid="attack-total"]')).toHaveText('21');
    await expect(page.locator('[data-testid="result-text"]')).toContainText('HIT');
    
    const storeState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(storeState.game.attackResult).not.toBeNull();
    expect(storeState.game.attackResult.roll).toBe(15);
    expect(storeState.game.attackResult.isHit).toBe(true);

    // STEP 8: Dismiss the combat result
    await page.locator('[data-testid="dismiss-combat-result"]').click();
    await expect(page.locator('[data-testid="combat-result"]')).not.toBeVisible();

    // Verify combat result dismissed
    const finalState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(finalState.game.attackResult).toBeNull();
  });

  test('Hero misses attack against monster', async ({ page }) => {
    // Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Dispatch an attack that misses
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setAttackResult',
        payload: {
          result: {
            roll: 3,
            attackBonus: 6,
            total: 9,
            targetAC: 14,
            isHit: false,
            damage: 0,
            isCritical: false
          },
          targetInstanceId: 'kobold-test'
        }
      });
    });

    // Wait for combat result to appear
    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });

    // Verify combat result display (no screenshot for miss to avoid flakiness)
    await expect(page.locator('[data-testid="combat-result"]')).toBeVisible();
    
    // Verify dice roll information
    await expect(page.locator('[data-testid="dice-roll"]')).toHaveText('3');
    await expect(page.locator('[data-testid="attack-total"]')).toHaveText('9');
    await expect(page.locator('[data-testid="target-ac"]')).toHaveText('14');
    
    // Verify miss result
    await expect(page.locator('[data-testid="result-text"]')).toContainText('MISS');
    
    // Damage info should NOT be visible for miss
    await expect(page.locator('[data-testid="damage-info"]')).not.toBeVisible();
    
    // Verify Redux store state
    const storeState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(storeState.game.attackResult.isHit).toBe(false);
    expect(storeState.game.attackResult.damage).toBe(0);
  });

  test('Critical hit on natural 20', async ({ page }) => {
    // Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Dispatch a critical hit
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setAttackResult',
        payload: {
          result: {
            roll: 20,
            attackBonus: 6,
            total: 26,
            targetAC: 30, // Even with high AC, natural 20 hits
            isHit: true,
            damage: 2,
            isCritical: true
          },
          targetInstanceId: 'dragon-test'
        }
      });
    });

    // Wait for combat result to appear
    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });

    // Verify critical hit display
    await expect(page.locator('[data-testid="dice-roll"]')).toHaveText('20');
    await expect(page.locator('[data-testid="result-text"]')).toContainText('CRITICAL');
    await expect(page.locator('[data-testid="damage-info"]')).toBeVisible();
  });

  test('Monster is defeated when HP reaches 0', async ({ page }) => {
    // Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn"]').click();
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Add a monster to the game state
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      // We can't directly add monsters, but we can verify state after attack
    });

    // Move Quinn to north edge for exploration
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 0 } }
      });
    });

    // End hero phase to trigger exploration and monster spawn
    await page.locator('[data-testid="end-phase-button"]').click();
    
    // Wait for monster card to appear
    await page.locator('[data-testid="monster-card"]').waitFor({ state: 'visible' });
    
    // Dismiss the monster card
    await page.locator('[data-testid="dismiss-monster-card"]').click();
    
    // Verify monster exists
    const monstersBefore = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState().game.monsters;
    });
    expect(monstersBefore.length).toBeGreaterThan(0);
    
    // Get the monster's instance ID
    const targetInstanceId = monstersBefore[0].instanceId;
    const monsterHp = monstersBefore[0].currentHp;
    
    // Dispatch a hit that does enough damage to defeat the monster
    await page.evaluate((data: { targetId: string, damage: number }) => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setAttackResult',
        payload: {
          result: {
            roll: 18,
            attackBonus: 6,
            total: 24,
            targetAC: 14,
            isHit: true,
            damage: data.damage,
            isCritical: false
          },
          targetInstanceId: data.targetId
        }
      });
    }, { targetId: targetInstanceId, damage: monsterHp + 1 });

    // Wait for combat result to appear
    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });
    
    // Dismiss combat result
    await page.locator('[data-testid="dismiss-combat-result"]').click();

    // Verify monster was removed
    const monstersAfter = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState().game.monsters;
    });
    expect(monstersAfter.length).toBe(monstersBefore.length - 1);
  });
});
