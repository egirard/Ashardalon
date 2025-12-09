import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards } from '../helpers/screenshot-helper';

test.describe('039 - Ranged Attacks', () => {
  test('Hero uses ranged attack power card to attack monsters at distance', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Navigate to character selection and select Haskan (Wizard) from bottom
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'character-select-screen', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="hero-haskan"]')).toBeVisible();
        await expect(page.locator('[data-testid="start-game-button"]')).toBeDisabled();
      }
    });
    
    // Select Haskan (Wizard) - he has ranged attacks like Ray of Frost (2 tiles) and Arc Lightning (1 tile)
    await page.locator('[data-testid="hero-haskan"]').click();
    
    // Select power cards for Haskan before taking the haskan-selected screenshot
    // Haskan will have Ray of Frost (id: 44, within 2 tiles) and Arc Lightning (id: 42, within 1 tile)
    await selectDefaultPowerCards(page, 'haskan');
    
    // Wait for power card selection to be confirmed
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'hidden' });
    
    await screenshots.capture(page, 'haskan-selected', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="hero-haskan"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled();
      }
    });
    
    // Start the game
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'game-started', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(state.game.heroTokens.length).toBe(1);
        expect(state.game.heroTokens[0].heroId).toBe('haskan');
        expect(state.game.turnState.currentPhase).toBe('hero-phase');
      }
    });
    
    // STEP 2: Position Haskan and spawn monsters at various distances
    // Move Haskan to north edge to trigger exploration
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'haskan', position: { x: 2, y: 0 } }
      });
    });
    
    // End hero phase to trigger exploration
    await page.locator('[data-testid="end-phase-button"]').click();
    
    // Wait for monster card to appear
    await page.locator('[data-testid="monster-card"]').waitFor({ state: 'visible' });
    
    // Dismiss the monster card
    await page.locator('[data-testid="dismiss-monster-card"]').click();
    await expect(page.locator('[data-testid="monster-card"]')).not.toBeVisible();
    
    // Complete the turn cycle back to Hero Phase
    await page.locator('[data-testid="end-phase-button"]').click(); // End exploration
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Villain Phase');
    await page.locator('[data-testid="end-phase-button"]').click(); // End villain
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');
    
    // STEP 3: Place monsters at different ranges for testing
    // Place one monster within 1 tile (for Arc Lightning)
    // Place another monster within 2 tiles (for Ray of Frost)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      
      // Get the spawned monster's tileId
      const spawnedMonster = state.game.monsters[0];
      
      // Create two kobolds at different distances
      store.dispatch({
        type: 'game/setMonsters',
        payload: [
          {
            monsterId: 'kobold',
            instanceId: 'kobold-adjacent',
            position: { x: 2, y: 2 }, // Local position on north tile
            currentHp: 1,
            controllerId: 'haskan',
            tileId: spawnedMonster.tileId
          },
          {
            monsterId: 'snake',
            instanceId: 'snake-1tile',
            position: { x: 1, y: 2 }, // Another position within range
            currentHp: 1,
            controllerId: 'haskan',
            tileId: spawnedMonster.tileId
          }
        ]
      });
      
      // Position Haskan at y: -1 (just below the north tile edge)
      // This puts him within range of monsters on the north tile
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'haskan', position: { x: 2, y: -1 } }
      });
    });
    
    // Wait for UI to update
    await page.waitForTimeout(100);
    
    await screenshots.capture(page, 'monsters-in-range', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(state.game.monsters.length).toBe(2);
        await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');
      }
    });
    
    // STEP 4: Verify ranged attack panel appears with range indicators
    await expect(page.locator('[data-testid="power-card-attack-panel"]')).toBeVisible();
    
    await screenshots.capture(page, 'ranged-attack-panel-visible', {
      programmaticCheck: async () => {
        // Verify the power card panel is showing
        await expect(page.locator('[data-testid="power-card-attack-panel"]')).toBeVisible();
        
        // Verify Ray of Frost card (id: 44) is available with range indicator
        await expect(page.locator('[data-testid="attack-card-44"]')).toBeVisible();
        
        // Verify Arc Lightning card (id: 42) is available
        await expect(page.locator('[data-testid="attack-card-42"]')).toBeVisible();
      }
    });
    
    // STEP 5: Select Ray of Frost (ranged attack with 2 tile range)
    await page.locator('[data-testid="attack-card-44"]').click();
    
    await screenshots.capture(page, 'ray-of-frost-selected', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="attack-card-44"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="target-selection"]')).toBeVisible();
        
        // Verify both monsters are valid targets for this ranged attack
        await expect(page.locator('[data-testid="attack-target-kobold-adjacent"]')).toBeVisible();
        await expect(page.locator('[data-testid="attack-target-snake-1tile"]')).toBeVisible();
      }
    });
    
    // STEP 6: Execute ranged attack on a monster
    // Seed Math.random for deterministic dice roll
    await page.evaluate(() => {
      (window as any).__originalRandom = Math.random;
      Math.random = () => 0.85; // Will give roll = floor(0.85 * 20) + 1 = 18
    });
    
    await page.locator('[data-testid="attack-target-kobold-adjacent"]').click();
    
    // Restore Math.random
    await page.evaluate(() => {
      if ((window as any).__originalRandom) {
        Math.random = (window as any).__originalRandom;
      }
    });
    
    // Wait for combat result
    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'ranged-attack-hit', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="combat-result"]')).toBeVisible();
        await expect(page.locator('[data-testid="dice-roll"]')).toHaveText('18');
        await expect(page.locator('[data-testid="result-text"]')).toContainText('HIT');
        
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(state.game.attackResult).not.toBeNull();
        expect(state.game.attackResult.isHit).toBe(true);
        expect(state.game.attackName).toBe('Ray of Frost');
      }
    });
    
    // Dismiss the combat result
    await page.locator('[data-testid="dismiss-combat-result"]').click();
    await expect(page.locator('[data-testid="combat-result"]')).not.toBeVisible();
    
    await screenshots.capture(page, 'after-ranged-attack', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(state.game.attackResult).toBeNull();
        // Monster should be defeated (had 1 HP, took 1 damage)
        expect(state.game.monsters.length).toBe(1);
      }
    });
    
    // STEP 7: Select Arc Lightning (another ranged attack, 1 tile range)
    await page.locator('[data-testid="attack-card-42"]').click();
    
    await screenshots.capture(page, 'arc-lightning-selected', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="attack-card-42"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="target-selection"]')).toBeVisible();
        
        // Verify the remaining monster is targetable
        await expect(page.locator('[data-testid="attack-target-snake-1tile"]')).toBeVisible();
      }
    });
    
    // Execute attack with Arc Lightning
    await page.evaluate(() => {
      (window as any).__originalRandom = Math.random;
      Math.random = () => 0.75; // Will give roll = floor(0.75 * 20) + 1 = 16
    });
    
    await page.locator('[data-testid="attack-target-snake-1tile"]').click();
    
    await page.evaluate(() => {
      if ((window as any).__originalRandom) {
        Math.random = (window as any).__originalRandom;
      }
    });
    
    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'arc-lightning-hit', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="combat-result"]')).toBeVisible();
        await expect(page.locator('[data-testid="result-text"]')).toContainText('HIT');
        
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(state.game.attackName).toBe('Arc Lightning');
      }
    });
    
    await page.locator('[data-testid="dismiss-combat-result"]').click();
    
    await screenshots.capture(page, 'all-monsters-defeated', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        // All monsters should be defeated
        expect(state.game.monsters.length).toBe(0);
      }
    });
  });
  
  test('Verifies Haskan has ranged attack power cards', async ({ page }) => {
    // Simpler test that verifies Haskan has ranged power cards
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    // Select Haskan (Wizard) who has ranged attacks
    await page.locator('[data-testid="hero-haskan"]').click();
    await selectDefaultPowerCards(page, 'haskan');
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'hidden' });
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    
    // Verify Haskan started and has ranged power cards in state
    const state = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    
    expect(state.game.heroTokens.length).toBe(1);
    expect(state.game.heroTokens[0].heroId).toBe('haskan');
    
    // Verify Haskan has his ranged attack cards
    const haskanPowerCards = state.heroes.heroPowerCards['haskan'];
    expect(haskanPowerCards).toBeDefined();
    expect(haskanPowerCards.atWills).toContain(42); // Arc Lightning
    expect(haskanPowerCards.atWills).toContain(43); // Hypnotism (also ranged)
  });
});
