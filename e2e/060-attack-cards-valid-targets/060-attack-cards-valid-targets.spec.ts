import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards } from '../helpers/screenshot-helper';

/**
 * Test 060: Attack Cards Valid Targets
 * 
 * This test demonstrates that attack cards on the player dashboard are only enabled
 * when there are valid targets in range, matching the behavior of the attack panel.
 * 
 * User Story:
 * As a player, when I look at my attack cards in the dashboard, I should only see them
 * highlighted/enabled when there are actually monsters I can attack, so I don't waste
 * time clicking on cards that can't be used.
 */
test.describe('060 - Attack Cards Valid Targets', () => {
  test('attack cards are only enabled when monsters are in range', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection and select Vistra (Fighter)
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-vistra"]').click();

    // Select power cards for Vistra
    await selectDefaultPowerCards(page, 'vistra');

    await screenshots.capture(page, '001-hero-selected', {
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

    await screenshots.capture(page, '002-game-started-no-monsters', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify no monsters exist yet
        expect(storeState.game.monsters.length).toBe(0);
        
        // Verify attack cards are NOT eligible (no targets)
        const eligibleAttackCards = await page.locator('.power-card-mini.eligible').count();
        // Should have 0 eligible attack cards when no monsters are present
        // (utility cards might be eligible, but attack cards should not be)
        const attackCardIds = [2, 3, 4, 12]; // Vistra's attack cards
        let eligibleAttacks = 0;
        for (const cardId of attackCardIds) {
          const card = page.locator(`[data-testid="power-card-${cardId}"]`);
          if (await card.isVisible()) {
            const isEligible = await card.evaluate((el) => el.classList.contains('eligible'));
            if (isEligible) eligibleAttacks++;
          }
        }
        expect(eligibleAttacks).toBe(0);
      }
    });

    // STEP 3: Add a monster far away (not in range)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          instanceId: 'test-kobold-far',
          monsterId: 'kobold',
          tileId: 'start',
          position: { x: 5, y: 7 }, // Far from Vistra at (2, 3)
          hp: 3,
          isDowned: false
        }]
      });
    });

    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.monsters.length).toBe(1);
    }).toPass();

    await screenshots.capture(page, '003-monster-far-attacks-disabled', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify monster exists but is far away
        expect(storeState.game.monsters.length).toBe(1);
        expect(storeState.game.monsters[0].position).toEqual({ x: 5, y: 7 });
        
        // Verify attack cards are still NOT eligible (monster out of range)
        const attackCardIds = [2, 3, 4, 12]; // Vistra's attack cards
        let eligibleAttacks = 0;
        for (const cardId of attackCardIds) {
          const card = page.locator(`[data-testid="power-card-${cardId}"]`);
          if (await card.isVisible()) {
            const isEligible = await card.evaluate((el) => el.classList.contains('eligible'));
            if (isEligible) eligibleAttacks++;
          }
        }
        // Regular melee attacks should not be eligible with no adjacent monsters
        // Charge might be eligible if hero can still move, but let's verify melee attacks are not
        const bashCard = page.locator('[data-testid="power-card-2"]'); // Bash (melee)
        if (await bashCard.isVisible()) {
          const isBashEligible = await bashCard.evaluate((el) => el.classList.contains('eligible'));
          expect(isBashEligible).toBe(false);
        }
      }
    });

    // STEP 4: Move monster adjacent to hero
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          instanceId: 'test-kobold-adjacent',
          monsterId: 'kobold',
          tileId: 'start',
          position: { x: 2, y: 2 }, // Adjacent to Vistra at (2, 3)
          hp: 3,
          isDowned: false
        }]
      });
    });

    // Wait for update to propagate
    await page.waitForTimeout(500);

    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.monsters[0].position).toEqual({ x: 2, y: 2 });
    }).toPass();

    await screenshots.capture(page, '004-monster-adjacent-attacks-enabled', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify monster is now adjacent
        expect(storeState.game.monsters.length).toBe(1);
        expect(storeState.game.monsters[0].position).toEqual({ x: 2, y: 2 });
        
        // Log power cards state for debugging
        console.log('[TEST] Checking power cards eligibility...');
        const attackCardIds = [2, 3, 4]; // Vistra's melee attack cards: Bash, Steel Serpent Strike, Comeback Strike
        
        for (const cardId of attackCardIds) {
          const card = page.locator(`[data-testid="power-card-${cardId}"]`);
          if (await card.isVisible()) {
            const classes = await card.evaluate((el) => el.className);
            const title = await card.evaluate((el) => el.getAttribute('title'));
            console.log(`[TEST] Card ${cardId}: classes="${classes}", title="${title}"`);
          }
        }
        
        // Verify attack cards ARE now eligible (monster in range)
        let eligibleAttacks = 0;
        for (const cardId of attackCardIds) {
          const card = page.locator(`[data-testid="power-card-${cardId}"]`);
          if (await card.isVisible()) {
            const isEligible = await card.evaluate((el) => el.classList.contains('eligible'));
            if (isEligible) eligibleAttacks++;
          }
        }
        
        console.log(`[TEST] Eligible attacks: ${eligibleAttacks}`);
        
        // At least one melee attack card should now be eligible
        expect(eligibleAttacks).toBeGreaterThan(0);
        
        // Specifically check Bash is eligible
        const bashCard = page.locator('[data-testid="power-card-2"]');
        if (await bashCard.isVisible()) {
          const isBashEligible = await bashCard.evaluate((el) => el.classList.contains('eligible'));
          expect(isBashEligible).toBe(true);
        }
      }
    });

    // STEP 5: Expand an attack card to verify it shows the monster
    const bashCard = page.locator('[data-testid="power-card-2"]');
    if (await bashCard.isVisible()) {
      await bashCard.click();
      
      // Wait for expansion
      await page.waitForTimeout(300);

      await screenshots.capture(page, '005-attack-card-expanded-with-target', {
        programmaticCheck: async () => {
          // Verify card is expanded
          await expect(bashCard).toHaveClass(/expanded/);
          
          // Verify expanded view shows attack stats
          const expandedView = page.locator('[data-testid="attack-card-expanded-2"]');
          await expect(expandedView).toBeVisible();
          
          // Verify monster target is listed
          const targetButton = page.locator('[data-testid="attack-target-test-kobold-adjacent"]');
          await expect(targetButton).toBeVisible();
        }
      });
    }

    // STEP 6: Remove monster and verify attacks are disabled again
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setMonsters',
        payload: [] // Remove all monsters
      });
    });

    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.monsters.length).toBe(0);
    }).toPass();

    // Close expanded card if still open
    if (await bashCard.isVisible()) {
      const isExpanded = await bashCard.evaluate((el) => el.classList.contains('expanded'));
      if (isExpanded) {
        await bashCard.click();
        await page.waitForTimeout(200);
      }
    }

    await screenshots.capture(page, '006-monsters-removed-attacks-disabled', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify no monsters exist
        expect(storeState.game.monsters.length).toBe(0);
        
        // Verify attack cards are NOT eligible again (no targets)
        const attackCardIds = [2, 3, 4];
        let eligibleAttacks = 0;
        for (const cardId of attackCardIds) {
          const card = page.locator(`[data-testid="power-card-${cardId}"]`);
          if (await card.isVisible()) {
            const isEligible = await card.evaluate((el) => el.classList.contains('eligible'));
            if (isEligible) eligibleAttacks++;
          }
        }
        expect(eligibleAttacks).toBe(0);
      }
    });
  });
});
