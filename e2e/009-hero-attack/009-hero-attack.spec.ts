import { test, expect } from '@playwright/test';
import { selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame, dismissPendingEncounterCards } from '../helpers/screenshot-helper';

test.describe('009 - Hero Attacks Monster', () => {
  test('Hero attacks adjacent monster and sees result', async ({ page }) => {
    // STEP 1: Navigate to character selection and select Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    // Select power cards for Quinn
    await selectDefaultPowerCards(page, 'quinn');
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // STEP 2: Move Quinn to the north edge for deterministic positioning
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 0 } }
      });
    });

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

    // STEP 4: Wait for the game to return to Hero Phase
    // Exploration phase auto-advances when complete; villain phase auto-ends after processing monsters.
    // Dismiss any encounter cards that appear during villain phase processing.
    await expect(async () => {
      await dismissPendingEncounterCards(page);
      await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');
    }).toPass({ timeout: 15000 });

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

    // STEP 5: Move Quinn adjacent to the monster programmatically
    // The monster's position is LOCAL within its tile; compute global position to place Quinn adjacent
    const adjacentPositionForQuinn = await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      const monster = state.game.monsters[0];
      if (!monster) return null;
      
      const dungeon = state.game.dungeon;
      const tile = dungeon.tiles.find((t: any) => t.id === monster.tileId);
      if (!tile) return null;
      
      // Compute tile bounds based on tile position (col, row)
      // Start tile at col=0, row=0: minX=0, minY=0
      // Other tiles: each unit is 4 squares
      const NORMAL_TILE_SIZE = 4;
      const START_TILE_WIDTH = 4;
      const START_TILE_HEIGHT = 8;
      
      let minX = 0, minY = 0;
      const { col, row } = tile.position;
      
      if (tile.tileType === 'start') {
        minX = 0;
        minY = 0;
      } else {
        if (col > 0) {
          minX = START_TILE_WIDTH + (col - 1) * NORMAL_TILE_SIZE;
        } else if (col < 0) {
          minX = col * NORMAL_TILE_SIZE;
        } else {
          minX = 0;
        }
        
        if (row > 0) {
          minY = START_TILE_HEIGHT + (row - 1) * NORMAL_TILE_SIZE;
        } else if (row < 0) {
          minY = row * NORMAL_TILE_SIZE;
        } else {
          minY = 0;
        }
      }
      
      const globalMonsterX = minX + monster.position.x;
      const globalMonsterY = minY + monster.position.y;
      
      // Place Quinn one square south of monster (adjacent)
      return { x: globalMonsterX, y: globalMonsterY + 1 };
    });

    if (adjacentPositionForQuinn) {
      await page.evaluate((pos) => {
        const store = (window as any).__REDUX_STORE__;
        store.dispatch({
          type: 'game/setHeroPosition',
          payload: { heroId: 'quinn', position: pos }
        });
        // Hide movement overlay so it doesn't interfere with attack UI
        store.dispatch({ type: 'game/hideMovement' });
      }, adjacentPositionForQuinn);
    }

    // STEP 6: Verify Quinn is in hero phase and power cards are visible
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');
    await expect(page.locator('[data-testid="player-power-cards"]')).toBeVisible();

    // STEP 7: Seed Math.random for deterministic dice roll and attack via power card
    await page.evaluate(() => {
      (window as any).__originalRandom = Math.random;
      Math.random = () => 0.7; // Will give roll = floor(0.7 * 20) + 1 = 15
    });

    // Click Quinn's first at-will attack card (card ID 2) to expand it
    await page.locator('[data-testid="power-card-2"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="power-card-2"]').click();
    await page.locator('[data-testid="attack-card-expanded-2"]').waitFor({ state: 'visible' });

    // Click the kobold-test as the attack target
    await page.locator('[data-testid="attack-target-kobold-test"]').click();

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
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    // Select power cards for Quinn
    await selectDefaultPowerCards(page, 'quinn');
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

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
          targetInstanceId: 'kobold-test',
          attackName: 'Radiant Lance'
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
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    // Select power cards for Quinn
    await selectDefaultPowerCards(page, 'quinn');
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

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
          targetInstanceId: 'dragon-test',
          attackName: 'Radiant Lance'
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
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    // Select power cards for Quinn
    await selectDefaultPowerCards(page, 'quinn');
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Add a kobold monster directly to the game state (avoids exploration phase complexity)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/addMonstersForTesting',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-defeat-test',
          position: { x: 3, y: 1 },
          currentHp: 5,
          controllerId: 'quinn',
          tileId: 'start-tile',
        }]
      });
    });

    // Verify monster was added
    const monstersBefore = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState().game.monsters;
    });
    expect(monstersBefore.length).toBeGreaterThan(0);
    
    // Get the monster's instance ID and HP
    const targetInstanceId = monstersBefore[0].instanceId;
    const monsterHp = monstersBefore[0].currentHp;
    
    // Wait for the game to return to Hero Phase
    // Exploration phase auto-advances when complete; villain phase auto-ends after processing monsters.
    // Dismiss any encounter cards that appear during villain phase processing.
    await expect(async () => {
      await dismissPendingEncounterCards(page);
      await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');
    }).toPass({ timeout: 15000 });
    
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
          targetInstanceId: data.targetId,
          attackName: 'Radiant Lance'
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
