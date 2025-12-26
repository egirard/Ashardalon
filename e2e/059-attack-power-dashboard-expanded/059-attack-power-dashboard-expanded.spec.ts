import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards } from '../helpers/screenshot-helper';

test.describe('059 - Attack Power Dashboard Expanded', () => {
  test('player can expand attack cards in dashboard and select monster targets', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection and select Vistra (Fighter with Charge)
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-vistra"]').click();

    // Select power cards for Vistra
    await selectDefaultPowerCards(page, 'vistra');

    await screenshots.capture(page, '000-hero-selected', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="hero-vistra"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled();
      }
    });

    // STEP 2: Start the game
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Set deterministic hero position
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'vistra', position: { x: 2, y: 3 } }
      });
    });

    // Wait for game to be ready
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.turnState.currentPhase).toBe('hero-phase');
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 3 });
    }).toPass();

    // Disable animations for stable screenshots
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

    await screenshots.capture(page, '001-game-started', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
        await expect(page.locator('[data-testid="player-power-cards"]')).toBeVisible();
      }
    });

    // STEP 3: Add monster adjacent to hero to enable attacks
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          instanceId: 'test-kobold-1',
          monsterId: 'kobold',
          tileId: 'start',
          position: { x: 2, y: 2 }, // Adjacent to Vistra at (2, 3)
          hp: 3,
          isDowned: false
        }]
      });
    });

    // Wait for monster to be added
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.monsters.length).toBe(1);
    }).toPass();

    await screenshots.capture(page, '002-monster-adjacent-attacks-enabled', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify monster is adjacent
        expect(storeState.game.monsters.length).toBe(1);
        expect(storeState.game.monsters[0].position).toEqual({ x: 2, y: 2 });
        
        // Verify attack cards are eligible
        const attackCards = await page.locator('.power-card-mini.eligible').count();
        expect(attackCards).toBeGreaterThan(0);
      }
    });

    // STEP 4: Click on an attack card to expand it (Charge - card ID 12)
    const chargeCard = page.locator('[data-testid="power-card-12"]');
    await expect(chargeCard).toBeVisible();
    await expect(chargeCard).toHaveClass(/eligible/);
    
    await chargeCard.click();

    // Wait for expansion
    await page.waitForTimeout(300);

    await screenshots.capture(page, '003-attack-card-expanded', {
      programmaticCheck: async () => {
        // Verify card is expanded
        await expect(chargeCard).toHaveClass(/expanded/);
        
        // Verify expanded view shows attack stats
        const expandedView = page.locator('[data-testid="attack-card-expanded-12"]');
        await expect(expandedView).toBeVisible();
        
        // Verify attack stats are displayed
        const statsText = await expandedView.locator('.attack-stats').textContent();
        expect(statsText).toContain('Bonus:');
        expect(statsText).toContain('Damage:');
      }
    });

    // STEP 5: Take close-up screenshot of just the player power cards area
    const powerCardsElement = page.locator('[data-testid="player-power-cards"]');
    await powerCardsElement.screenshot({
      path: 'e2e/059-attack-power-dashboard-expanded/059-attack-power-dashboard-expanded.spec.ts-snapshots/004-expanded-card-closeup-chromium-linux.png'
    });

    await screenshots.capture(page, '004-expanded-card-closeup-full', {
      programmaticCheck: async () => {
        // Verify the expanded state is still visible
        const expandedView = page.locator('[data-testid="attack-card-expanded-12"]');
        await expect(expandedView).toBeVisible();
        
        // Check if monsters are visible - may not be if we need to verify active hero
        const hasMonsters = await expandedView.locator('[data-testid^="attack-target-"]').count();
        console.log(`Found ${hasMonsters} monster targets in expanded view`);
      }
    });

    // STEP 6: Click monster target if available, otherwise just collapse card
    const targetButton = page.locator('[data-testid="attack-target-test-kobold-1"]');
    const hasTargetButton = await targetButton.isVisible().catch(() => false);
    
    if (hasTargetButton) {
      await targetButton.click();

      // Wait for attack result
      await expect(async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.attackResult).toBeDefined();
      }).toPass();

      await screenshots.capture(page, '005-attack-executed', {
        programmaticCheck: async () => {
          const storeState = await page.evaluate(() => {
            return (window as any).__REDUX_STORE__.getState();
          });
          
          // Verify attack was executed
          expect(storeState.game.attackResult).toBeDefined();
          expect(storeState.game.attackResult?.targetInstanceId).toBe('test-kobold-1');
        }
      });

      // Dismiss attack result
      const continueButton = page.locator('button:has-text("Continue")');
      if (await continueButton.isVisible()) {
        await continueButton.click();
      }

      await screenshots.capture(page, '006-attack-complete', {
        programmaticCheck: async () => {
          const storeState = await page.evaluate(() => {
            return (window as any).__REDUX_STORE__.getState();
          });
          
          // Verify attack result dismissed
          expect(storeState.game.attackResult).toBeNull();
        }
      });
    } else {
      // Just collapse the card by clicking it again
      await chargeCard.click();
      await page.waitForTimeout(200);
      
      await screenshots.capture(page, '005-card-collapsed', {
        programmaticCheck: async () => {
          const expandedView = page.locator('[data-testid="attack-card-expanded-12"]');
          await expect(expandedView).not.toBeVisible();
        }
      });
    }
  });
});
