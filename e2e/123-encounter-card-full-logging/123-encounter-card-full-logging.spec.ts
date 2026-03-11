import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('123 - Encounter Card Full Logging', () => {
  test('encounter cards show full card description and effect details in the game log', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Character Selection
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'character-select-screen', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="character-select"]')).toBeVisible();
        await expect(page.locator('[data-testid="start-game-button"]')).toBeDisabled();
      }
    });

    // Select Quinn from bottom edge
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');

    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);

    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Position hero deterministically
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 4 } }
      });
      store.dispatch({ type: 'game/hideMovement' });
    });

    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 4 });
    }).toPass();

    await page.waitForFunction(() => {
      return document.querySelectorAll('[data-testid^="move-to-"]').length === 0;
    });

    await screenshots.capture(page, 'game-started', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.logEntries.length).toBeGreaterThan(0);
      }
    });

    // STEP 2: Draw a damage-type encounter card (Frenzied Leap - deals 2 damage)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'frenzied-leap'
      });
    });

    // Wait for encounter card to appear
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'encounter-card-drawn', {
      programmaticCheck: async () => {
        // Verify encounter card popup is shown
        await expect(page.locator('[data-testid="encounter-card"]')).toBeVisible();
        await expect(page.locator('[data-testid="encounter-name"]')).toContainText('Frenzied Leap');
        // Verify the encounter card is set in the store
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.drawnEncounter).toBeTruthy();
        expect(storeState.game.drawnEncounter.name).toContain('Frenzied Leap');
      }
    });

    // STEP 3: Dismiss the encounter card (apply effects)
    const quinnHpBefore = await page.evaluate(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.heroHp.find((h: any) => h.heroId === 'quinn')?.currentHp;
    });

    await page.locator('[data-testid="encounter-continue"]').click();
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });

    // Dismiss the encounter result popup if it appears
    const resultPopup = page.locator('[data-testid="encounter-result-popup"]');
    if (await resultPopup.isVisible()) {
      await page.locator('[data-testid="continue-button"]').click();
      await resultPopup.waitFor({ state: 'hidden' });
    }

    await screenshots.capture(page, 'encounter-dismissed', {
      programmaticCheck: async () => {
        // Verify HP decreased by 2 (Frenzied Leap does 2 damage to active hero)
        const quinnHpAfter = await page.evaluate(() => {
          const state = (window as any).__REDUX_STORE__.getState();
          return state.game.heroHp.find((h: any) => h.heroId === 'quinn')?.currentHp;
        });
        expect(quinnHpAfter).toBe(quinnHpBefore - 2);
        // Verify a resolution log entry was added with full card details
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        const encounterEntries = storeState.game.logEntries.filter((e: any) => e.type === 'encounter');
        expect(encounterEntries.length).toBeGreaterThan(0);
        const lastEntry = encounterEntries[encounterEntries.length - 1];
        // Resolution entry should contain card name and damage info
        expect(lastEntry.message).toContain('Frenzied Leap');
        // The details should have the full card description (not undefined/null/flavorText)
        expect(lastEntry.details).toBeTruthy();
        expect(typeof lastEntry.details).toBe('string');
        // The extendedDetails should contain Effect: info plus target/damage details
        expect(lastEntry.extendedDetails).toBeTruthy();
        expect(lastEntry.extendedDetails).toContain('Effect:');
      }
    });

    // STEP 4: Open the log viewer and expand the encounter entry to verify full details
    await page.locator('[data-testid="view-log-button"]').first().click();
    await page.locator('[data-testid="log-entries"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'log-viewer-opened', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="log-entries"]')).toBeVisible();
        // Find encounter log entries for Frenzied Leap
        const encounterEntries = page.locator('[data-testid="log-entry"]').filter({ hasText: 'Frenzied Leap' });
        await expect(encounterEntries).toHaveCount(1);
      }
    });

    // Click on the encounter entry to expand it
    await page.locator('button[aria-label="Show details"]').first().click();

    await screenshots.capture(page, 'encounter-log-entry-expanded', {
      programmaticCheck: async () => {
        // Verify the expanded entry shows full card description in details
        const expandedEntry = page.locator('[data-testid="log-entry"]').first();
        // The log-details div should be visible showing the card description
        await expect(expandedEntry.locator('.log-details')).toBeVisible();
        // The extended details (effect description) should be visible
        const extendedDetails = expandedEntry.locator('.log-extended-details');
        await expect(extendedDetails).toBeVisible();
        await expect(extendedDetails).toContainText('Effect:');
        // The expanded state shows damage/hero info
        const extendedText = await extendedDetails.textContent();
        expect(extendedText).toBeTruthy();
      }
    });

    // Close log viewer
    await page.locator('button[aria-label="Close log"]').click();
    await page.locator('[data-testid="log-entries"]').waitFor({ state: 'hidden' });

    // STEP 5: Activate an environment card and verify it logs with full details
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setActiveEnvironment',
        payload: 'hidden-snipers'
      });
    });

    // Wait for environment indicator to appear
    await page.locator('[data-testid="environment-indicator"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'environment-activated', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="environment-indicator"]')).toBeVisible();
        await expect(page.locator('[data-testid="environment-indicator"]')).toContainText('Hidden Snipers');
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.activeEnvironmentId).toBe('hidden-snipers');
      }
    });

    // STEP 6: Click the environment indicator to see the environment card details
    await page.locator('[data-testid="environment-indicator"]').click();

    // Wait for the environment card popup to appear
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'environment-card-detail', {
      programmaticCheck: async () => {
        // Verify the environment card detail popup is shown
        await expect(page.locator('[data-testid="encounter-card"]')).toBeVisible();
        await expect(page.locator('[data-testid="encounter-name"]')).toContainText('Hidden Snipers');
        await expect(page.locator('[data-testid="encounter-effect"]')).toBeVisible();
      }
    });

    // Dismiss the environment card detail
    await page.locator('[data-testid="dismiss-encounter-card"]').click();
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });

    // STEP 7: Trigger the environment effect (end hero phase while Quinn is alone on tile)
    // Set Quinn's HP to maximum for tracking
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroHp',
        payload: { heroId: 'quinn', currentHp: 8, maxHp: 8 }
      });
    });

    const hpBeforeEnv = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState().game.heroHp.find((h: any) => h.heroId === 'quinn')?.currentHp;
    });

    // End hero phase - Hidden Snipers should deal 1 damage since Quinn is alone on tile
    await page.locator('[data-testid="end-phase-button"]').click();

    // Wait for phase transition
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Exploration Phase');

    await screenshots.capture(page, 'environment-effect-triggered', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        const quinnHp = storeState.game.heroHp.find((h: any) => h.heroId === 'quinn');
        // Quinn should have taken 1 damage from Hidden Snipers
        expect(quinnHp.currentHp).toBe(hpBeforeEnv - 1);

        // Verify an environment effect log entry was created with full details
        const encounterEntries = storeState.game.logEntries.filter((e: any) => e.type === 'encounter');
        const envEffectEntry = encounterEntries.find((e: any) =>
          e.message.includes('Environment effect:') && e.message.includes('Hidden Snipers')
        );
        expect(envEffectEntry).toBeDefined();
        // Full card description should be in details
        expect(envEffectEntry.details).toBeTruthy();
        // Effect description should be in extendedDetails
        expect(envEffectEntry.extendedDetails).toContain('Effect:');
      }
    });

    // STEP 8: Open log viewer and verify environment effect entry has full card reference
    await page.locator('[data-testid="view-log-button"]').first().click();
    await page.locator('[data-testid="log-entries"]').waitFor({ state: 'visible' });

    // Find and expand the environment effect entry
    const envEffectEntryBtn = page.locator('button[aria-label="Show details"]').filter({ hasText: 'Environment effect: Hidden Snipers' });
    await envEffectEntryBtn.click();

    await screenshots.capture(page, 'environment-effect-log-expanded', {
      programmaticCheck: async () => {
        // Verify the environment effect entry is expanded with full card details
        const expandedEntry = page.locator('[data-testid="log-entry"]').filter({ hasText: 'Environment effect: Hidden Snipers' });
        await expect(expandedEntry.locator('.log-details')).toBeVisible();
        const detailsText = await expandedEntry.locator('.log-details').textContent();
        expect(detailsText).toBeTruthy();

        const extendedDetails = expandedEntry.locator('.log-extended-details');
        await expect(extendedDetails).toBeVisible();
        await expect(extendedDetails).toContainText('Effect:');
      }
    });

    // Close log viewer
    await page.locator('button[aria-label="Close log"]').click();
    await page.locator('[data-testid="log-entries"]').waitFor({ state: 'hidden' });

    await screenshots.capture(page, 'final-state', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
        await expect(page.locator('[data-testid="environment-indicator"]')).toBeVisible();
        await expect(page.locator('[data-testid="environment-indicator"]')).toContainText('Hidden Snipers');
      }
    });
  });
});
