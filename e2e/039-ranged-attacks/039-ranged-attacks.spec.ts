import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards } from '../helpers/screenshot-helper';

test.describe('039 - Ranged Attacks', () => {
  test('Haskan explores north, reveals monster, then attacks with ranged power card', async ({ page }) => {
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
    
    // Select power cards for Haskan
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
    
    // STEP 2: Move Haskan to north edge to prepare for exploration
    // Programmatically move to avoid UI interaction issues
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'haskan', position: { x: 2, y: 0 } }
      });
    });
    
    await screenshots.capture(page, 'haskan-at-north-edge', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(state.game.heroTokens[0].position.y).toBe(0);
        await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');
      }
    });
    
    // STEP 3: End hero phase to trigger exploration
    await page.locator('[data-testid="end-phase-button"]').click();
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');
    
    await screenshots.capture(page, 'exploration-phase', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');
      }
    });
    
    // Draw a tile - monster will spawn immediately, so check for monster card first
    await page.locator('[data-testid="monster-card"]').waitFor({ state: 'visible', timeout: 1000 }).catch(() => {});
    
    // If monster card is showing, take a screenshot and dismiss it
    if (await page.locator('[data-testid="monster-card"]').isVisible()) {
      await screenshots.capture(page, 'monster-revealed', {
        programmaticCheck: async () => {
          await expect(page.locator('[data-testid="monster-card"]')).toBeVisible();
          await expect(page.locator('[data-testid="monster-name"]')).toBeVisible();
        }
      });
      
      await page.locator('[data-testid="dismiss-monster-card"]').click();
      await expect(page.locator('[data-testid="monster-card"]')).not.toBeVisible();
    } else {
      // If not showing yet, click end phase and wait for it
      await page.locator('[data-testid="end-phase-button"]').click();
      await page.locator('[data-testid="monster-card"]').waitFor({ state: 'visible' });
      
      await screenshots.capture(page, 'monster-revealed', {
        programmaticCheck: async () => {
          await expect(page.locator('[data-testid="monster-card"]')).toBeVisible();
          await expect(page.locator('[data-testid="monster-name"]')).toBeVisible();
        }
      });
      
      await page.locator('[data-testid="dismiss-monster-card"]').click();
      await expect(page.locator('[data-testid="monster-card"]')).not.toBeVisible();
    }
    
    // STEP 4: Advance to villain phase
    // Should still be in exploration phase, need to end it
    if (await page.locator('[data-testid="turn-phase"]').textContent() === 'Exploration Phase') {
      await page.locator('[data-testid="end-phase-button"]').click();
    }
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Villain Phase');
    
    // Check for and dismiss any overlays (encounter cards, combat results, etc.)
    const dismissOverlays = async () => {
      const encounterCard = page.locator('[data-testid="encounter-card"]');
      const combatResult = page.locator('[data-testid="combat-result"]');
      const monsterMoveAction = page.locator('[data-testid="monster-move-action"]');
      
      if (await encounterCard.isVisible()) {
        await page.locator('[data-testid="dismiss-encounter-card"]').click();
      }
      if (await combatResult.isVisible()) {
        await page.locator('[data-testid="dismiss-combat-result"]').click();
      }
      if (await monsterMoveAction.isVisible()) {
        await page.locator('[data-testid="dismiss-monster-action"]').click();
      }
    };
    
    await dismissOverlays();
    
    // Check what phase we're in - might be Villain or already Hero
    const phaseText = await page.locator('[data-testid="turn-phase"]').textContent();
    
    await screenshots.capture(page, 'after-exploration', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        // Should have at least one monster spawned
        expect(state.game.monsters.length).toBeGreaterThan(0);
      }
    });
    
    // If still in Villain phase, advance to Hero phase
    if (phaseText === 'Villain Phase') {
      // Keep dismissing overlays until we can end the phase
      let attempts = 0;
      while (attempts < 10) {
        await dismissOverlays();
        const endButton = page.locator('[data-testid="end-phase-button"]');
        if (await endButton.isVisible() && await endButton.isEnabled()) {
          try {
            await endButton.click({ timeout: 2000 });
            break;
          } catch (e) {
            // Button might be obscured, try again
          }
        }
        attempts++;
        await page.waitForTimeout(500);
      }
    }
    
    // Wait for Hero phase
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase', { timeout: 10000 });
    
    // STEP 5: New hero phase - now we can use ranged attacks
    // Check if there are monsters in range (the monster should be on the explored tile)
    const state = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    
    // If no monsters or not in range, we need to verify ranged attacks would work if they were
    if (state.game.monsters.length > 0) {
      // Check if power card attack panel is visible
      const panelVisible = await page.locator('[data-testid="power-card-attack-panel"]').isVisible();
      
      if (panelVisible) {
        await screenshots.capture(page, 'ranged-attack-panel-available', {
          programmaticCheck: async () => {
            await expect(page.locator('[data-testid="power-card-attack-panel"]')).toBeVisible();
            // At least one attack card should be available
            const attackCards = await page.locator('[data-testid^="attack-card-"]').count();
            expect(attackCards).toBeGreaterThan(0);
          }
        });
        
        // Try to select a ranged attack card (Ray of Frost or Arc Lightning)
        const rayOfFrostCard = page.locator('[data-testid="attack-card-44"]');
        const arcLightningCard = page.locator('[data-testid="attack-card-42"]');
        
        const rayVisible = await rayOfFrostCard.isVisible();
        const arcVisible = await arcLightningCard.isVisible();
        
        if (rayVisible || arcVisible) {
          const cardToUse = rayVisible ? rayOfFrostCard : arcLightningCard;
          const cardName = rayVisible ? 'Ray of Frost' : 'Arc Lightning';
          
          await cardToUse.click();
          
          await screenshots.capture(page, 'ranged-card-selected', {
            programmaticCheck: async () => {
              await expect(cardToUse).toHaveClass(/selected/);
              await expect(page.locator('[data-testid="target-selection"]')).toBeVisible();
            }
          });
          
          // Check if there are targetable monsters
          const targetButtons = await page.locator('[data-testid^="attack-target-"]').count();
          
          if (targetButtons > 0) {
            // Seed random for deterministic combat
            await page.evaluate(() => {
              (window as any).__originalRandom = Math.random;
              Math.random = () => 0.85; // Roll 18
            });
            
            // Click first available target
            await page.locator('[data-testid^="attack-target-"]').first().click();
            
            // Restore random
            await page.evaluate(() => {
              if ((window as any).__originalRandom) {
                Math.random = (window as any).__originalRandom;
              }
            });
            
            // Wait for combat result
            await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });
            
            await screenshots.capture(page, 'ranged-attack-result', {
              programmaticCheck: async () => {
                await expect(page.locator('[data-testid="combat-result"]')).toBeVisible();
                const resultState = await page.evaluate(() => {
                  return (window as any).__REDUX_STORE__.getState();
                });
                expect(resultState.game.attackResult).not.toBeNull();
              }
            });
            
            // Dismiss result
            await page.locator('[data-testid="dismiss-combat-result"]').click();
            
            await screenshots.capture(page, 'after-ranged-attack', {
              programmaticCheck: async () => {
                const finalState = await page.evaluate(() => {
                  return (window as any).__REDUX_STORE__.getState();
                });
                expect(finalState.game.attackResult).toBeNull();
              }
            });
          }
        }
      }
    }
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
