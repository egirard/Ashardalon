import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('057 - Power Card Dashboard Activation', () => {
  test('player can activate utility power cards from player dashboard with visual states', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection and select Quinn (Cleric)
    // Quinn has "Healing Hymn" and "Command" as utility cards that can be activated from dashboard
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();

    // Select power cards for Quinn
    await selectDefaultPowerCards(page, 'quinn');

    await screenshots.capture(page, 'hero-selected', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="hero-quinn-bottom"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled();
      }
    });

    // STEP 2: Start the game
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Set deterministic hero position to avoid movement overlay randomness
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 3 } }
      });
    });

    // Wait for game to be ready and position applied
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.turnState.currentPhase).toBe('hero-phase');
      expect(storeState.heroes.heroPowerCards.quinn).toBeDefined();
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

    await screenshots.capture(page, 'game-started-hero-phase', {
      programmaticCheck: async () => {
        // Verify game board is visible
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
        
        // Verify player power cards are visible
        await expect(page.locator('[data-testid="player-power-cards"]')).toBeVisible();
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify it's Quinn's turn and hero phase
        expect(storeState.game.turnState.currentPhase).toBe('hero-phase');
        expect(storeState.game.heroTokens[0].heroId).toBe('quinn');
        
        // Verify power cards are initialized and unflipped
        expect(storeState.heroes.heroPowerCards.quinn).toBeDefined();
        const cardStates = storeState.heroes.heroPowerCards.quinn.cardStates;
        expect(cardStates.every((s: { isFlipped: boolean }) => !s.isFlipped)).toBe(true);
      }
    });

    // STEP 3: Verify eligible power cards are highlighted
    // During hero phase, utility cards like "Healing Hymn" (ID 1) and "Command" (ID 9) should be eligible
    await screenshots.capture(page, 'eligible-cards-highlighted', {
      programmaticCheck: async () => {
        // Check that Healing Hymn card is present and eligible (not disabled)
        const healingHymnCard = page.locator('[data-testid="power-card-1"]');
        await expect(healingHymnCard).toBeVisible();
        await expect(healingHymnCard).toBeEnabled();
        await expect(healingHymnCard).toHaveClass(/eligible/);
        
        // Command card should also be eligible
        const commandCard = page.locator('[data-testid="power-card-9"]');
        await expect(commandCard).toBeVisible();
        await expect(commandCard).toBeEnabled();
        await expect(commandCard).toHaveClass(/eligible/);
        
        // Attack cards should be ineligible/disabled (they use attack panel)
        const attackCards = page.locator('[data-testid="player-power-cards"] button:has-text("AW")');
        const attackCardCount = await attackCards.count();
        for (let i = 0; i < attackCardCount; i++) {
          const attackCard = attackCards.nth(i);
          await expect(attackCard).toBeDisabled();
        }
      }
    });

    // STEP 4: Click on "Healing Hymn" to activate it
    await page.locator('[data-testid="power-card-1"]').click();

    // Wait for the card to be marked as used
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      const cardStates = storeState.heroes.heroPowerCards.quinn.cardStates;
      const healingHymnState = cardStates.find((s: { cardId: number }) => s.cardId === 1);
      expect(healingHymnState?.isFlipped).toBe(true);
    }).toPass();

    await screenshots.capture(page, 'healing-hymn-used', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify Healing Hymn is now flipped (used)
        const cardStates = storeState.heroes.heroPowerCards.quinn.cardStates;
        const healingHymnState = cardStates.find((s: { cardId: number }) => s.cardId === 1);
        expect(healingHymnState?.isFlipped).toBe(true);
        
        // Verify the card now shows as disabled with X icon
        const healingHymnCard = page.locator('[data-testid="power-card-1"]');
        await expect(healingHymnCard).toBeVisible();
        await expect(healingHymnCard).toBeDisabled();
        await expect(healingHymnCard).toHaveClass(/disabled/);
        
        // Verify X icon is visible
        await expect(healingHymnCard.locator('[aria-label="Used"]')).toBeVisible();
        
        // Command should still be eligible
        const commandCard = page.locator('[data-testid="power-card-9"]');
        await expect(commandCard).toBeEnabled();
        await expect(commandCard).toHaveClass(/eligible/);
      }
    });

    // STEP 5: End hero phase to show cards become ineligible when not player's turn
    await page.locator('[data-testid="end-phase-button"]').click();

    // Wait for exploration phase
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.turnState.currentPhase).toBe('exploration-phase');
    }).toPass();

    await screenshots.capture(page, 'exploration-phase-cards-ineligible', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify we're in exploration phase
        expect(storeState.game.turnState.currentPhase).toBe('exploration-phase');
        
        // All unused cards should now be ineligible (grayed out) because it's not hero phase
        const commandCard = page.locator('[data-testid="power-card-9"]');
        await expect(commandCard).toBeDisabled(); // Disabled because not hero phase
        await expect(commandCard).toHaveClass(/ineligible/);
        
        // Used card should still be disabled
        const healingHymnCard = page.locator('[data-testid="power-card-1"]');
        await expect(healingHymnCard).toBeDisabled();
        await expect(healingHymnCard).toHaveClass(/disabled/);
      }
    });

    // STEP 6: Complete turn and verify cards remain in their state
    // End exploration phase
    await page.locator('[data-testid="end-phase-button"]').click();

    // Wait for villain phase
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.turnState.currentPhase).toBe('villain-phase');
    }).toPass();

    await screenshots.capture(page, 'villain-phase-cards-remain-ineligible', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify we're in villain phase
        expect(storeState.game.turnState.currentPhase).toBe('villain-phase');
        
        // Card states should persist
        const cardStates = storeState.heroes.heroPowerCards.quinn.cardStates;
        const healingHymnState = cardStates.find((s: { cardId: number }) => s.cardId === 1);
        expect(healingHymnState?.isFlipped).toBe(true);
        
        const commandState = cardStates.find((s: { cardId: number }) => s.cardId === 9);
        expect(commandState?.isFlipped).toBe(false);
        
        // All cards should be disabled during villain phase
        await expect(page.locator('[data-testid="power-card-1"]')).toBeDisabled();
        await expect(page.locator('[data-testid="power-card-9"]')).toBeDisabled();
      }
    });
  });

  test('different heroes show different eligible power cards', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // Test with Vistra (Fighter) who has "Dwarven Resilience" as a custom ability
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-vistra-bottom"]').click();

    await selectDefaultPowerCards(page, 'vistra');
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Set deterministic hero position to avoid movement overlay randomness
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'vistra', position: { x: 2, y: 3 } }
      });
    });

    // Wait for game to be ready and position applied
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.turnState.currentPhase).toBe('hero-phase');
      expect(storeState.heroes.heroPowerCards.vistra).toBeDefined();
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

    await screenshots.capture(page, 'vistra-power-cards', {
      programmaticCheck: async () => {
        // Verify Vistra's custom ability (Dwarven Resilience, ID 11) is present and eligible
        const dwarvenResilienceCard = page.locator('[data-testid="power-card-11"]');
        await expect(dwarvenResilienceCard).toBeVisible();
        await expect(dwarvenResilienceCard).toBeEnabled();
        await expect(dwarvenResilienceCard).toHaveClass(/eligible/);
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify Vistra's power cards are initialized
        expect(storeState.heroes.heroPowerCards.vistra.customAbility).toBe(11);
      }
    });

    // Activate Dwarven Resilience
    await page.locator('[data-testid="power-card-11"]').click();

    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      const cardStates = storeState.heroes.heroPowerCards.vistra.cardStates;
      const resilState = cardStates.find((s: { cardId: number }) => s.cardId === 11);
      expect(resilState?.isFlipped).toBe(true);
    }).toPass();

    await screenshots.capture(page, 'dwarven-resilience-used', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify card is flipped
        const cardStates = storeState.heroes.heroPowerCards.vistra.cardStates;
        const resilState = cardStates.find((s: { cardId: number }) => s.cardId === 11);
        expect(resilState?.isFlipped).toBe(true);
        
        // Verify card shows as disabled with X icon
        const dwarvenResilienceCard = page.locator('[data-testid="power-card-11"]');
        await expect(dwarvenResilienceCard).toBeDisabled();
        await expect(dwarvenResilienceCard).toHaveClass(/disabled/);
        await expect(dwarvenResilienceCard.locator('[aria-label="Used"]')).toBeVisible();
      }
    });
  });
});
