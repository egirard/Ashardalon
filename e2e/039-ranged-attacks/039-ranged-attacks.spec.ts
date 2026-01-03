import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction } from '../helpers/screenshot-helper';

test.describe('039 - Ranged Attacks', () => {
  test('Haskan explores north, reveals monster, then attacks with ranged power card', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Navigate to character selection and select Haskan (Wizard) from bottom
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'character-select-screen', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="hero-haskan-bottom"]')).toBeVisible();
        await expect(page.locator('[data-testid="start-game-button"]')).toBeDisabled();
      }
    });
    
    // Select Haskan (Wizard) - he has ranged attacks like Ray of Frost (2 tiles) and Arc Lightning (1 tile)
    await page.locator('[data-testid="hero-haskan-bottom"]').click();
    
    // Select power cards for Haskan
    // Haskan will have Ray of Frost (id: 44, within 2 tiles) and Arc Lightning (id: 42, within 1 tile)
    await selectDefaultPowerCards(page, 'haskan');
    
    // Wait for power card selection to be confirmed
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'hidden' });
    
    await screenshots.capture(page, 'haskan-selected', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="hero-haskan-bottom"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled();
      }
    });
    
    // Start the game
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);
    
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
    
    // STEP 4: Complete villain phase and return to hero phase
    // Helper to dismiss any overlays
    const dismissOverlays = async () => {
      const overlays = [
        { selector: '[data-testid="encounter-card"]', dismiss: '[data-testid="dismiss-encounter-card"]' },
        { selector: '[data-testid="combat-result"]', dismiss: '[data-testid="dismiss-combat-result"]' },
        { selector: '[data-testid="monster-move-action"]', dismiss: '[data-testid="dismiss-monster-action"]' },
      ];
      
      for (const overlay of overlays) {
        if (await page.locator(overlay.selector).isVisible()) {
          await page.locator(overlay.dismiss).click();
          await page.locator(overlay.selector).waitFor({ state: 'hidden' });
        }
      }
    };
    
    // Dismiss any immediate overlays
    await dismissOverlays();
    
    // Advance through phases to get back to Hero phase
    let currentPhase = await page.locator('[data-testid="turn-phase"]').textContent();
    
    // If in Exploration, end it
    if (currentPhase === 'Exploration Phase') {
      await page.locator('[data-testid="end-phase-button"]').click();
      await dismissOverlays();
      currentPhase = await page.locator('[data-testid="turn-phase"]').textContent();
    }
    
    // If in Villain phase, complete it
    if (currentPhase === 'Villain Phase') {
      await screenshots.capture(page, 'villain-phase-with-monster', {
        programmaticCheck: async () => {
          const state = await page.evaluate(() => {
            return (window as any).__REDUX_STORE__.getState();
          });
          expect(state.game.monsters.length).toBeGreaterThan(0);
          await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Villain Phase');
        }
      });
      
      // Dismiss all overlays and end villain phase
      for (let i = 0; i < 20; i++) {
        await dismissOverlays();
        const endButton = page.locator('[data-testid="end-phase-button"]');
        try {
          if (await endButton.isVisible({ timeout: 1000 })) {
            await endButton.click({ timeout: 2000 });
            break;
          }
        } catch (e) {
          // Continue trying
        }
        await page.waitForTimeout(200);
      }
    }
    
    // Wait for Hero phase
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase', { timeout: 15000 });
    await dismissOverlays();
    
    // STEP 5: Execute ranged attack
    const state = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    
    await screenshots.capture(page, 'hero-phase-ready-to-attack', {
      programmaticCheck: async () => {
        const currentState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(currentState.game.monsters.length).toBeGreaterThan(0);
        await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Hero Phase');
      }
    });
    
    // Wait for and verify power card attack panel is visible
    await page.locator('[data-testid="power-card-attack-panel"]').waitFor({ state: 'visible', timeout: 5000 });
    
    await screenshots.capture(page, 'ranged-attack-panel-available', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="power-card-attack-panel"]')).toBeVisible();
        const attackCards = await page.locator('[data-testid^="attack-card-"]').count();
        expect(attackCards).toBeGreaterThan(0);
      }
    });
    
    // Select Ray of Frost or Arc Lightning for ranged attack
    const rayOfFrostCard = page.locator('[data-testid="attack-card-44"]');
    const arcLightningCard = page.locator('[data-testid="attack-card-42"]');
    
    let cardToUse = rayOfFrostCard;
    let cardName = 'Ray of Frost';
    
    if (await arcLightningCard.isVisible()) {
      cardToUse = arcLightningCard;
      cardName = 'Arc Lightning';
    }
    
    await cardToUse.click();
    
    await screenshots.capture(page, 'ranged-card-selected', {
      programmaticCheck: async () => {
        await expect(cardToUse).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="target-selection"]')).toBeVisible();
      }
    });
    
    // Verify we have targetable monsters and attack the cultist
    const targetButtons = await page.locator('[data-testid^="attack-target-"]').count();
    expect(targetButtons).toBeGreaterThan(0);
    
    // Seed random for deterministic combat result
    await page.evaluate(() => {
      (window as any).__originalRandom = Math.random;
      Math.random = () => 0.85; // Will roll 18
    });
    
    // Click the first available target (cultist)
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
        expect(resultState.game.attackResult.isHit).toBe(true);
      }
    });
    
    // Dismiss combat result
    await page.locator('[data-testid="dismiss-combat-result"]').click();
    await expect(page.locator('[data-testid="combat-result"]')).not.toBeVisible();
    
    await screenshots.capture(page, 'after-ranged-attack', {
      programmaticCheck: async () => {
        const finalState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(finalState.game.attackResult).toBeNull();
        // Monster should be defeated if it had low HP
      }
    });
  });
  
  test('Verifies Haskan has ranged attack power cards', async ({ page }) => {
    // Simpler test that verifies Haskan has ranged power cards
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    // Select Haskan (Wizard) who has ranged attacks
    await page.locator('[data-testid="hero-haskan-bottom"]').click();
    await selectDefaultPowerCards(page, 'haskan');
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'hidden' });
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);
    
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
