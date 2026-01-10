import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

// Helper function to seed dice roll for deterministic tests
async function seedDiceRoll(page: any, value: number) {
  await page.evaluate((val: number) => {
    (window as any).__originalRandom = Math.random;
    Math.random = () => val;
  }, value);
}

// Helper function to restore Math.random
async function restoreDiceRoll(page: any) {
  await page.evaluate(() => {
    if ((window as any).__originalRandom) {
      Math.random = (window as any).__originalRandom;
    }
  });
}

test.describe('054 - Tornado Strike Multi-Target Attack', () => {
  test('Tarak can use Tornado Strike to attack four times with selectable targets', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection and select Tarak (Rogue)
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-tarak-bottom"]').click();

    // Select power cards for Tarak - select Tornado Strike (daily #37) instead of default
    await page.locator('[data-testid="select-powers-tarak"]').click();
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'visible' });
    
    // The default selection has daily 35 (Acrobatic Onslaught) selected
    // We need to select daily 37 (Tornado Strike) instead
    // Click to expand daily 37, then click select button
    await page.locator('[data-testid="daily-card-37"]').click();
    await page.locator('[data-testid="expanded-card"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="select-expanded-card"]').click();
    
    // Verify the Done button is enabled (selection is complete)
    await expect(page.locator('[data-testid="done-power-selection"]')).toBeEnabled();
    
    // Close modal
    await page.locator('[data-testid="done-power-selection"]').click();
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'hidden' });

    await screenshots.capture(page, 'tarak-with-tornado-strike-selected', {
      programmaticCheck: async () => {
        // Verify Tarak is selected with powers
        await expect(page.locator('[data-testid="hero-tarak-bottom"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="select-powers-tarak"]')).toContainText('Powers Selected');
        await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled();
      }
    });

    // STEP 2: Start the game
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    
    // Dismiss scenario introduction by pressing Enter (which the modal listens for)
    await page.keyboard.press('Enter');
    
    // Wait a moment for the dismissal to process
    await page.waitForTimeout(1000);
    
    // If modal is still visible, try clicking the button
    const overlay = page.locator('[data-testid="scenario-introduction-overlay"]');
    if (await overlay.isVisible().catch(() => false)) {
      const scenarioButton = page.locator('[data-testid="start-scenario-button"]');
      await scenarioButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Continue with test even if modal persists (game should still function)
    // Wait for game to be fully initialized (hero phase should be active)
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.turnState.currentPhase).toBe('hero-phase');
    }).toPass({ timeout: 5000 });

    // Set deterministic position for the hero
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'tarak', position: { x: 3, y: 2 } }
      });
    });

    // Wait for the position to be applied
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 3, y: 2 });
    }).toPass();

    // STEP 3: Spawn 3 monsters on the same tile as the hero
    // Use monsters with different HP so we can track damage individually
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Set up deterministic treasure deck (no treasure for now to simplify)
      store.dispatch({
        type: 'game/setTreasureDeck',
        payload: {
          drawPile: [],
          discardPile: []
        }
      });
      
      store.dispatch({
        type: 'game/setMonsters',
        payload: [
          {
            monsterId: 'kobold', // Kobold has 1 HP
            instanceId: 'kobold-test-1',
            position: { x: 3, y: 2 }, // Same tile as hero
            currentHp: 1,
            controllerId: 'tarak',
            tileId: 'start-tile'
          },
          {
            monsterId: 'cultist', // Cultist has 2 HP
            instanceId: 'cultist-test-1',
            position: { x: 4, y: 2 }, // Same tile as hero
            currentHp: 2,
            controllerId: 'tarak',
            tileId: 'start-tile'
          },
          {
            monsterId: 'cultist', // Another Cultist with 2 HP
            instanceId: 'cultist-test-2',
            position: { x: 3, y: 3 }, // Same tile as hero
            currentHp: 2,
            controllerId: 'tarak',
            tileId: 'start-tile'
          }
        ]
      });
    });

    // Wait for monsters to appear in the store
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.monsters.length).toBe(3);
    }).toPass();

    // Ensure all monster tokens are visible before taking screenshot
    await expect(page.locator('[data-testid="monster-token"]')).toHaveCount(3);

    await screenshots.capture(page, 'game-with-three-monsters', {
      programmaticCheck: async () => {
        // Verify the power card attack panel is visible
        await expect(page.locator('[data-testid="power-card-attack-panel"]')).toBeVisible();
        
        // Verify Tornado Strike is shown (daily #37)
        await expect(page.locator('[data-testid="attack-card-37"]')).toBeVisible();
        
        // Verify Tornado Strike has the x4 badge indicating it attacks four times
        await expect(page.locator('[data-testid="special-badge-37"]')).toHaveText('x4');
      }
    });

    // STEP 4: Select Tornado Strike and verify the UI shows it attacks four times
    await page.locator('[data-testid="attack-card-37"]').click(); // Select Tornado Strike

    await screenshots.capture(page, 'tornado-strike-selected', {
      programmaticCheck: async () => {
        // Verify the card is selected
        await expect(page.locator('[data-testid="attack-card-37"]')).toHaveClass(/selected/);
        
        // Verify target selection appears
        await expect(page.locator('[data-testid="target-selection"]')).toBeVisible();
        
        // Verify attack targets are shown
        await expect(page.locator('[data-testid="attack-target-kobold-test-1"]')).toBeVisible();
        await expect(page.locator('[data-testid="attack-target-cultist-test-1"]')).toBeVisible();
        await expect(page.locator('[data-testid="attack-target-cultist-test-2"]')).toBeVisible();
      }
    });

    // STEP 5: First attack - attack Kobold
    await seedDiceRoll(page, 0.7); // Will give roll = floor(0.7 * 20) + 1 = 15
    
    // Click on the kobold monster token on the board directly
    // The test has set up kobold-test-1 at position (3, 2)
    const koboldToken = page.locator('[data-testid="monster-token"]').filter({ has: page.locator('[data-instance-id="kobold-test-1"]') }).first();
    
    // If the monster token approach doesn't work, try the attack button
    const useMonsterToken = await koboldToken.isVisible().catch(() => false);
    
    if (useMonsterToken) {
      console.log('Clicking monster token directly');
      await koboldToken.click();
    } else {
      console.log('Clicking attack target button');
      const attackButton = page.locator('[data-testid="attack-target-kobold-test-1"]');
      await attackButton.waitFor({ state: 'visible', timeout: 5000 });
      await attackButton.click();
    }
    
    await restoreDiceRoll(page);
    
    // Wait a moment for the attack to process
    await page.waitForTimeout(1000);

    // Wait for combat result (first attack) - give it more time
    try {
      await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible', timeout: 15000 });
    } catch (e) {
      console.log('Combat result did not appear, taking debug screenshot');
      await page.screenshot({ path: '/tmp/no-combat-result.png', fullPage: true });
      throw e;
    }

    await screenshots.capture(page, 'first-attack-kobold-result', {
      programmaticCheck: async () => {
        // Verify combat result shows correct stats from power card
        await expect(page.locator('[data-testid="combat-result"]')).toBeVisible();
        await expect(page.locator('[data-testid="dice-roll"]')).toHaveText('15');
        await expect(page.locator('[data-testid="attack-bonus"]')).toHaveText('7'); // Tornado Strike has +7
        
        // Verify the combat result shows Tornado Strike name
        await expect(page.locator('[data-testid="attacker-info"]')).toContainText('Tornado Strike');
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify multi-attack state was started
        expect(storeState.game.multiAttackState).toBeDefined();
        expect(storeState.game.multiAttackState?.totalAttacks).toBe(4);
        expect(storeState.game.multiAttackState?.attacksCompleted).toBe(0);
        expect(storeState.game.multiAttackState?.sameTarget).toBe(false); // Can select different targets
        
        // Daily card SHOULD be flipped after first attack (even in multi-attack)
        const cardStates = storeState.heroes.heroPowerCards.tarak.cardStates;
        const tornadoStrikeState = cardStates.find((s: { cardId: number }) => s.cardId === 37);
        expect(tornadoStrikeState?.isFlipped).toBe(true);
      }
    });

    // Dismiss first attack result
    await page.locator('[data-testid="dismiss-combat-result"]').click();
    
    // Wait for the multi-attack to progress
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.multiAttackState?.attacksCompleted).toBe(1);
    }).toPass();

    await screenshots.capture(page, 'after-first-attack-kobold-defeated', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Kobold should be defeated (1 HP - 1 damage = 0 HP)
        const kobold = storeState.game.monsters.find((m: any) => m.instanceId === 'kobold-test-1');
        expect(kobold).toBeUndefined(); // Defeated monsters are removed
        
        // Verify multi-attack continues (attacks 2-4 remain)
        expect(storeState.game.multiAttackState?.attacksCompleted).toBe(1);
        await expect(page.locator('[data-testid="multi-attack-info"]')).toBeVisible();
        await expect(page.locator('[data-testid="cancel-multi-attack"]')).toBeVisible();
        
        // Verify defeat notification is shown
        await expect(page.locator('[data-testid="defeat-notification-overlay"]')).toBeVisible();
      }
    });

    // Dismiss the defeat notification
    await page.locator('[data-testid="dismiss-defeat-notification"]').click();
    await page.locator('[data-testid="defeat-notification-overlay"]').waitFor({ state: 'hidden' });

    // STEP 6: Second attack - attack Cultist 1 (different target)
    await seedDiceRoll(page, 0.7);
    await page.locator('[data-testid="attack-target-cultist-test-1"]').click();
    await restoreDiceRoll(page);

    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'second-attack-cultist1-result', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="combat-result"]')).toBeVisible();
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify multi-attack state shows attack 1 completed (before recording this hit)
        expect(storeState.game.multiAttackState?.attacksCompleted).toBe(1);
        expect(storeState.game.multiAttackState?.totalAttacks).toBe(4);
      }
    });

    await page.locator('[data-testid="dismiss-combat-result"]').click();
    
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.multiAttackState?.attacksCompleted).toBe(2);
    }).toPass();

    await screenshots.capture(page, 'after-second-attack-cultist1-damaged', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Cultist 1 should have 1 HP remaining (2 HP - 1 damage = 1 HP)
        const cultist1 = storeState.game.monsters.find((m: any) => m.instanceId === 'cultist-test-1');
        expect(cultist1?.currentHp).toBe(1);
        
        // Verify multi-attack continues
        expect(storeState.game.multiAttackState?.attacksCompleted).toBe(2);
        await expect(page.locator('[data-testid="multi-attack-info"]')).toContainText('Attack 3 of 4');
      }
    });

    // STEP 7: Third attack - attack Cultist 1 again (same target as second attack)
    await seedDiceRoll(page, 0.7);
    await page.locator('[data-testid="attack-target-cultist-test-1"]').click();
    await restoreDiceRoll(page);

    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'third-attack-cultist1-again-result', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="combat-result"]')).toBeVisible();
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        expect(storeState.game.multiAttackState?.attacksCompleted).toBe(2);
      }
    });

    await page.locator('[data-testid="dismiss-combat-result"]').click();
    
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.multiAttackState?.attacksCompleted).toBe(3);
    }).toPass();

    await screenshots.capture(page, 'after-third-attack-cultist1-defeated', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Cultist 1 should be defeated (1 HP - 1 damage = 0 HP)
        const cultist1 = storeState.game.monsters.find((m: any) => m.instanceId === 'cultist-test-1');
        expect(cultist1).toBeUndefined();
        
        // Verify multi-attack continues (one more attack remaining)
        expect(storeState.game.multiAttackState?.attacksCompleted).toBe(3);
        await expect(page.locator('[data-testid="multi-attack-info"]')).toContainText('Attack 4 of 4');
        
        // Verify defeat notification is shown
        await expect(page.locator('[data-testid="defeat-notification-overlay"]')).toBeVisible();
      }
    });

    // Dismiss the defeat notification
    await page.locator('[data-testid="dismiss-defeat-notification"]').click();
    await page.locator('[data-testid="defeat-notification-overlay"]').waitFor({ state: 'hidden' });

    // STEP 8: Fourth attack - attack Cultist 2 (third different target)
    await seedDiceRoll(page, 0.7);
    await page.locator('[data-testid="attack-target-cultist-test-2"]').click();
    await restoreDiceRoll(page);

    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'fourth-attack-cultist2-result', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="combat-result"]')).toBeVisible();
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        expect(storeState.game.multiAttackState?.attacksCompleted).toBe(3);
      }
    });

    await page.locator('[data-testid="dismiss-combat-result"]').click();
    
    // Wait for multi-attack sequence to complete and hero placement to trigger
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      // Multi-attack should be cleared after 4th attack
      expect(storeState.game.multiAttackState).toBeNull();
      // Hero placement should be triggered for Tornado Strike
      expect(storeState.game.pendingHeroPlacement).toBeTruthy();
    }).toPass();

    await screenshots.capture(page, 'after-fourth-attack-placement-overlay', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Cultist 2 should have 1 HP remaining (2 HP - 1 damage = 1 HP)
        const cultist2 = storeState.game.monsters.find((m: any) => m.instanceId === 'cultist-test-2');
        expect(cultist2?.currentHp).toBe(1);
        
        // Multi-attack state should be cleared
        expect(storeState.game.multiAttackState).toBeNull();
        
        // Hero placement should be pending
        expect(storeState.game.pendingHeroPlacement).toBeTruthy();
        expect(storeState.game.pendingHeroPlacement?.cardId).toBe(37);
        expect(storeState.game.pendingHeroPlacement?.heroId).toBe('tarak');
        
        // Attack action should NOT be consumed yet (placement must complete first)
        expect(storeState.game.heroTurnActions.canAttack).toBe(true);
        
        // Daily card should be flipped (after first attack)
        const cardStates = storeState.heroes.heroPowerCards.tarak.cardStates;
        const tornadoStrikeState = cardStates.find((s: { cardId: number }) => s.cardId === 37);
        expect(tornadoStrikeState?.isFlipped).toBe(true);
        
        // Hero placement overlay should be visible (movement overlay showing placement squares)
        await expect(page.locator('.placement-overlay-container')).toBeVisible();
      }
    });

    // STEP 9: Click on a placement square to place the hero
    // Available squares on the start tile - let's click on position (2, 3)
    // Find the move-square with the correct data attributes
    const placementSquare = page.locator('.placement-overlay-container [data-position-x="2"][data-position-y="3"]');
    await placementSquare.waitFor({ state: 'visible' });
    await placementSquare.click();
    
    // Give it a moment to process
    await page.waitForTimeout(500);
    
    // Wait for placement to complete
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      // Hero placement should be cleared
      expect(storeState.game.pendingHeroPlacement).toBeNull();
    }).toPass();

    await screenshots.capture(page, 'after-hero-placement-complete', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Hero should have moved to the new position
        const tarakToken = storeState.game.heroTokens.find((t: any) => t.heroId === 'tarak');
        expect(tarakToken?.position).toEqual({ x: 2, y: 3 });
        
        // Hero placement should be cleared
        expect(storeState.game.pendingHeroPlacement).toBeNull();
        
        // Attack action should NOW be consumed (after placement completion)
        expect(storeState.game.heroTurnActions.canAttack).toBe(false);
        
        // Hero placement overlay should be hidden
        await expect(page.locator('.placement-overlay-container')).not.toBeVisible();
      }
    });
  });
});
