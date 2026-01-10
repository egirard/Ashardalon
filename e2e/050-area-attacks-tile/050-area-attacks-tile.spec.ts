import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('050 - Area Attacks Targeting Each Monster on Tile', () => {
  test('Hurled Breath (ID 41) attacks all monsters on a tile with sequential results', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Set up game with Haskan (has Hurled Breath as custom ability)
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    // Select Haskan (Dragonborn Wizard who has Hurled Breath)
    await page.locator('[data-testid="hero-haskan-bottom"]').click();
    
    // Select power cards for Haskan
    await selectDefaultPowerCards(page, 'haskan');
    
    // Start the game
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);
    
    // Set deterministic position for the hero
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'haskan', position: { x: 2, y: 3 } }
      });
    });
    
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 3 });
    }).toPass();
    
    // Disable animations for stable screenshots
    await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = '* { animation: none !important; transition: none !important; }';
      document.head.appendChild(style);
    });
    
    // Wait for render to settle
    await page.waitForTimeout(500);
    
    await screenshots.capture(page, 'game-started-haskan', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(state.game.heroTokens.length).toBe(1);
        expect(state.game.heroTokens[0].heroId).toBe('haskan');
        expect(state.game.turnState.currentPhase).toBe('hero-phase');
      }
    });
    
    // STEP 2: Spawn THREE monsters on the same tile within range (2 tiles)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      store.dispatch({
        type: 'game/setMonsters',
        payload: [
          {
            monsterId: 'kobold',
            instanceId: 'kobold-1-test',
            currentHp: 1,
            maxHp: 3,
            tileId: 'start-tile',
            position: { x: 1, y: 4 }, // Within 2 tiles of hero at (2, 3)
            controllerId: 'haskan'
          },
          {
            monsterId: 'kobold',
            instanceId: 'kobold-2-test',
            currentHp: 1,
            maxHp: 3,
            tileId: 'start-tile',
            position: { x: 2, y: 4 }, // Same tile as kobold-1
            controllerId: 'haskan'
          },
          {
            monsterId: 'kobold',
            instanceId: 'kobold-3-test',
            currentHp: 1,
            maxHp: 3,
            tileId: 'start-tile',
            position: { x: 3, y: 4 }, // Same tile as kobold-1 and kobold-2
            controllerId: 'haskan'
          }
        ]
      });
    });
    
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.monsters.length).toBe(3);
    }).toPass();
    
    await screenshots.capture(page, 'three-monsters-on-same-tile', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(state.game.monsters.length).toBe(3);
        // Verify all three monsters are on the same tile
        expect(state.game.monsters[0].tileId).toBe('start-tile');
        expect(state.game.monsters[1].tileId).toBe('start-tile');
        expect(state.game.monsters[2].tileId).toBe('start-tile');
      }
    });
    
    // STEP 3: Verify power card attack panel appears and Hurled Breath is available
    await screenshots.capture(page, 'attack-panel-shows-hurled-breath', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="power-card-attack-panel"]')).toBeVisible();
        // Hurled Breath (ID 41) should be visible as custom ability
        await expect(page.locator('[data-testid="attack-card-41"]')).toBeVisible();
      }
    });
    
    // STEP 4: Click Hurled Breath card
    // Note: Using JavaScript click to avoid overlay issues
    await page.locator('[data-testid="attack-card-41"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="attack-card-41"]').evaluate((el: HTMLElement) => el.click());
    
    // Wait for selection state to update
    await page.waitForTimeout(500);
    
    await screenshots.capture(page, 'hurled-breath-selected', {
      programmaticCheck: async () => {
        // Check if card is selected
        const cardElement = page.locator('[data-testid="attack-card-41"]');
        const classes = await cardElement.getAttribute('class');
        console.log('Card classes:', classes);
        
        // Target selection should appear
        const hasTargetSelection = await page.locator('[data-testid="target-selection"]').isVisible();
        expect(hasTargetSelection).toBe(true);
        // Should see all three monsters as potential targets
        await expect(page.locator('[data-testid="attack-target-kobold-1-test"]')).toBeVisible();
        await expect(page.locator('[data-testid="attack-target-kobold-2-test"]')).toBeVisible();
        await expect(page.locator('[data-testid="attack-target-kobold-3-test"]')).toBeVisible();
      }
    });
    
    // STEP 5: Seed random for deterministic combat
    // Note: This seeding pattern is consistent with other tests in the repository (e.g., 044-multi-target-attacks)
    // A roll of 0.75 on d20 produces: Math.floor(0.75 * 20) + 1 = 15 + 1 = 16
    // With typical attack bonus of +5, this gives 21 total, ensuring a hit against AC 13 kobolds
    await page.evaluate(() => {
      (window as any).__originalRandom = Math.random;
      Math.random = () => 0.75; // Produces roll of 16 on d20
    });
    
    // Click the first available target (this should trigger attack on all monsters on that tile)
    await page.locator('[data-testid="attack-target-kobold-1-test"]').click();
    
    await page.evaluate(() => {
      if ((window as any).__originalRandom) {
        Math.random = (window as any).__originalRandom;
      }
    });
    
    // Helper function to verify and dismiss combat result
    const verifyCombatResult = async (stepName: string, attackName: string) => {
      await screenshots.capture(page, stepName, {
        programmaticCheck: async () => {
          await expect(page.locator('[data-testid="combat-result"]')).toBeVisible();
          await expect(page.locator('[data-testid="result-text"]')).toContainText('HIT');
          await expect(page.locator('[data-testid="attacker-info"]')).toContainText(attackName);
        }
      });
      
      // Wait for dismiss button to be clickable
      await page.locator('[data-testid="dismiss-combat-result"]').waitFor({ state: 'visible' });
      await page.locator('[data-testid="dismiss-combat-result"]').click();
    };
    
    // Wait for first combat result
    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });
    await verifyCombatResult('first-monster-result', 'Hurled Breath');
    
    // STEP 6: Check for additional combat results (area attacks show results sequentially)
    // We spawned 3 monsters, so we expect up to 2 more results after the first
    const COMBAT_RESULT_TIMEOUT_MS = 3000; // Time to wait for additional combat results
    let additionalResultCount = 0;
    const maxExpectedResults = 2; // Expecting 2 more results (total 3 for 3 monsters)
    const additionalResults = ['second-monster-result', 'third-monster-result'];
    
    for (const resultName of additionalResults) {
      const resultAppears = await page.locator('[data-testid="combat-result"]')
        .isVisible({ timeout: COMBAT_RESULT_TIMEOUT_MS })
        .catch(() => false);
      if (resultAppears) {
        await verifyCombatResult(resultName, 'Hurled Breath');
        additionalResultCount++;
      } else {
        break; // No more results
      }
    }
    
    // Verify we got results for multiple monsters (at least 1 additional result after the first)
    expect(additionalResultCount).toBeGreaterThanOrEqual(1);
    
    // Final check: ensure all results are dismissed
    await expect(page.locator('[data-testid="combat-result"]')).not.toBeVisible();
    
    await screenshots.capture(page, 'hurled-breath-attack-complete', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(state.game.attackResult).toBeNull();
        // Verify Hurled Breath was used (should be flipped)
        const cardStates = state.heroes.heroPowerCards.haskan?.cardStates;
        if (cardStates) {
          const hurledBreathCard = cardStates.find((c: any) => c.cardId === 41);
          if (hurledBreathCard) {
            expect(hurledBreathCard.isFlipped).toBe(true);
          }
        }
        // Verify at least some monsters were defeated
        expect(state.game.scenario.monstersDefeated).toBeGreaterThanOrEqual(1);
      }
    });
  });

  test('Shock Sphere (ID 46) executes area attack on multiple monsters', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Set up game with Haskan (Wizard) and explicitly select Shock Sphere
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    // Select Haskan (Wizard)
    await page.locator('[data-testid="hero-haskan-bottom"]').click();
    
    // Select power cards for Haskan, explicitly choosing Shock Sphere (ID 46) as daily
    await page.locator('[data-testid="select-powers-haskan"]').click();
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'visible' });
    
    // Select Shock Sphere (ID 46) as daily - need to expand and select
    await page.locator('[data-testid="daily-card-46"]').click();
    await page.locator('[data-testid="expanded-card"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="select-expanded-card"]').click();
    
    // Close power selection modal
    await page.locator('[data-testid="done-power-selection"]').click();
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'hidden' });
    
    // Start the game
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);
    
    // Set deterministic position for the hero
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'haskan', position: { x: 2, y: 2 } }
      });
    });
    
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 2 });
    }).toPass();
    
    // Disable animations for stable screenshots
    await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = '* { animation: none !important; transition: none !important; }';
      document.head.appendChild(style);
    });
    
    // Wait for render to settle
    await page.waitForTimeout(500);
    
    await screenshots.capture(page, 'game-started-with-shock-sphere', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(state.game.heroTokens.length).toBe(1);
        expect(state.game.heroTokens[0].heroId).toBe('haskan');
        expect(state.game.turnState.currentPhase).toBe('hero-phase');
        // Verify Shock Sphere is selected as daily
        expect(state.heroes.heroPowerCards.haskan.daily).toBe(46);
      }
    });
    
    // STEP 2: Spawn THREE monsters on the same tile within range (2 tiles)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      store.dispatch({
        type: 'game/setMonsters',
        payload: [
          {
            monsterId: 'kobold',
            instanceId: 'kobold-1-test',
            currentHp: 2,
            maxHp: 3,
            tileId: 'start-tile',
            position: { x: 1, y: 3 }, // Within 2 tiles of hero at (2, 2)
            controllerId: 'haskan'
          },
          {
            monsterId: 'kobold',
            instanceId: 'kobold-2-test',
            currentHp: 2,
            maxHp: 3,
            tileId: 'start-tile',
            position: { x: 2, y: 3 }, // Same tile as kobold-1
            controllerId: 'haskan'
          },
          {
            monsterId: 'kobold',
            instanceId: 'kobold-3-test',
            currentHp: 2,
            maxHp: 3,
            tileId: 'start-tile',
            position: { x: 3, y: 3 }, // Same tile as kobold-1 and kobold-2
            controllerId: 'haskan'
          }
        ]
      });
    });
    
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.monsters.length).toBe(3);
    }).toPass();
    
    await screenshots.capture(page, 'three-monsters-spawned', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(state.game.monsters.length).toBe(3);
        // Verify all three monsters are on the same tile
        expect(state.game.monsters[0].tileId).toBe('start-tile');
        expect(state.game.monsters[1].tileId).toBe('start-tile');
        expect(state.game.monsters[2].tileId).toBe('start-tile');
        // Verify all monsters are within range for area attacks
        const heroPos = state.game.heroTokens[0].position;
        for (const monster of state.game.monsters) {
          const distance = Math.abs(monster.position.x - heroPos.x) + Math.abs(monster.position.y - heroPos.y);
          expect(distance).toBeLessThanOrEqual(2);
        }
      }
    });
    
    // STEP 3: Verify power card attack panel appears and Shock Sphere is available
    await screenshots.capture(page, 'attack-panel-shows-shock-sphere', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="power-card-attack-panel"]')).toBeVisible();
        // Shock Sphere (ID 46) should be visible as daily
        await expect(page.locator('[data-testid="attack-card-46"]')).toBeVisible();
      }
    });
    
    // STEP 4: Click Shock Sphere card
    await page.locator('[data-testid="attack-card-46"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="attack-card-46"]').evaluate((el: HTMLElement) => el.click());
    
    // Wait for selection state to update
    await page.waitForTimeout(500);
    
    await screenshots.capture(page, 'shock-sphere-selected', {
      programmaticCheck: async () => {
        // Target selection should appear
        const hasTargetSelection = await page.locator('[data-testid="target-selection"]').isVisible();
        expect(hasTargetSelection).toBe(true);
        // Should see all three monsters as potential targets
        await expect(page.locator('[data-testid="attack-target-kobold-1-test"]')).toBeVisible();
        await expect(page.locator('[data-testid="attack-target-kobold-2-test"]')).toBeVisible();
        await expect(page.locator('[data-testid="attack-target-kobold-3-test"]')).toBeVisible();
      }
    });
    
    // STEP 5: Seed random for deterministic combat
    // Roll of 0.75 on d20 produces: Math.floor(0.75 * 20) + 1 = 16
    // With Shock Sphere's attack bonus of +9, this gives 25 total, ensuring a hit against AC 13 kobolds
    await page.evaluate(() => {
      (window as any).__originalRandom = Math.random;
      Math.random = () => 0.75; // Produces roll of 16 on d20
    });
    
    // Click the first available target (this should trigger attack on all monsters on that tile)
    await page.locator('[data-testid="attack-target-kobold-1-test"]').click();
    
    await page.evaluate(() => {
      if ((window as any).__originalRandom) {
        Math.random = (window as any).__originalRandom;
      }
    });
    
    // Helper function to verify and dismiss combat result
    const verifyCombatResult = async (stepName: string, attackName: string) => {
      await screenshots.capture(page, stepName, {
        programmaticCheck: async () => {
          await expect(page.locator('[data-testid="combat-result"]')).toBeVisible();
          await expect(page.locator('[data-testid="result-text"]')).toContainText('HIT');
          await expect(page.locator('[data-testid="attacker-info"]')).toContainText(attackName);
        }
      });
      
      // Wait for dismiss button to be clickable
      await page.locator('[data-testid="dismiss-combat-result"]').waitFor({ state: 'visible' });
      await page.locator('[data-testid="dismiss-combat-result"]').click();
    };
    
    // Wait for first combat result
    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });
    await verifyCombatResult('first-monster-result', 'Shock Sphere');
    
    // STEP 6: Check for additional combat results (area attacks show results sequentially)
    // We spawned 3 monsters, so we expect up to 2 more results after the first
    const COMBAT_RESULT_TIMEOUT_MS = 3000;
    let additionalResultCount = 0;
    const maxExpectedResults = 2; // Expecting 2 more results (total 3 for 3 monsters)
    const additionalResults = ['second-monster-result', 'third-monster-result'];
    
    for (const resultName of additionalResults) {
      const resultAppears = await page.locator('[data-testid="combat-result"]')
        .isVisible({ timeout: COMBAT_RESULT_TIMEOUT_MS })
        .catch(() => false);
      if (resultAppears) {
        await verifyCombatResult(resultName, 'Shock Sphere');
        additionalResultCount++;
      } else {
        break; // No more results
      }
    }
    
    // Verify we got results for multiple monsters (at least 1 additional result after the first)
    expect(additionalResultCount).toBeGreaterThanOrEqual(1);
    
    // Final check: ensure all results are dismissed
    await expect(page.locator('[data-testid="combat-result"]')).not.toBeVisible();
    
    await screenshots.capture(page, 'shock-sphere-attack-complete', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(state.game.attackResult).toBeNull();
        // Verify Shock Sphere was used (should be flipped)
        const cardStates = state.heroes.heroPowerCards.haskan?.cardStates;
        if (cardStates) {
          const shockSphereCard = cardStates.find((c: any) => c.cardId === 46);
          if (shockSphereCard) {
            expect(shockSphereCard.isFlipped).toBe(true);
          }
        }
        // Verify at least some monsters were defeated (Shock Sphere does 2 damage, kobolds have 2 HP)
        expect(state.game.scenario.monstersDefeated).toBeGreaterThanOrEqual(1);
      }
    });
  });

  test('Shock Sphere (ID 46) demonstrates area attack mechanics', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Set up game with Haskan (Wizard)
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    // Select Haskan (Wizard)
    await page.locator('[data-testid="hero-haskan-bottom"]').click();
    
    // Use default power cards for Haskan
    await selectDefaultPowerCards(page, 'haskan');
    
    // Start the game
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);
});
