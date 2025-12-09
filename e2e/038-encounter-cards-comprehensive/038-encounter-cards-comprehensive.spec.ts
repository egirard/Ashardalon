import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards } from '../helpers/screenshot-helper';

test.describe('038 - Encounter Cards Comprehensive System Test', () => {
  test('demonstrates all encounter card types with proper drawing, presentation, and resolution', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Character Selection
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'character-select-screen', {
      programmaticCheck: async () => {
        // Verify character select screen is visible with heroes on edges
        const heroCards = page.locator('button.hero-card');
        await expect(heroCards).toHaveCount(20); // 5 heroes x 4 edges
        await expect(page.locator('[data-testid="start-game-button"]')).toBeDisabled();
      }
    });

    // Select Quinn from bottom edge (unrotated view)
    await page.locator('[data-testid="hero-quinn"]').click();
    await selectDefaultPowerCards(page, 'quinn');

    // Start game
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });

    // Position hero
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 4 } }
      });
    });

    await screenshots.capture(page, 'game-started', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.encounterDeck.drawPile.length).toBeGreaterThan(0);
      }
    });

    // STEP 2: Test Damage Effect (Active Hero)
    // Draw "Frenzied Leap" (deals 2 damage to active hero)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'frenzied-leap'
      });
    });

    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'frenzied-leap-damage-card', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-name"]')).toContainText('Frenzied Leap');
        await expect(page.locator('[data-testid="encounter-type"]')).toContainText('EVENT');
        await expect(page.locator('[data-testid="encounter-effect"]')).toContainText('Active hero takes 2 damage');
      }
    });

    // Accept the encounter
    const quinnHpBefore = await page.evaluate(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.heroHp.find((h: any) => h.heroId === 'quinn')?.currentHp;
    });

    await page.locator('[data-testid="encounter-continue"]').click();
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });

    await screenshots.capture(page, 'damage-applied', {
      programmaticCheck: async () => {
        const quinnHpAfter = await page.evaluate(() => {
          const state = (window as any).__REDUX_STORE__.getState();
          return state.game.heroHp.find((h: any) => h.heroId === 'quinn')?.currentHp;
        });
        expect(quinnHpAfter).toBe(quinnHpBefore - 2);
      }
    });

    // STEP 3: Test Attack Effect
    // Draw "Bull's Eye!" (Attack +10 vs active hero, 1 damage)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'bulls-eye'
      });
    });

    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'bulls-eye-attack-card', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-name"]')).toContainText("Bull's Eye!");
        await expect(page.locator('[data-testid="encounter-effect"]')).toContainText('Attack +10');
        await expect(page.locator('[data-testid="encounter-effect"]')).toContainText('Active hero');
      }
    });

    await page.locator('[data-testid="encounter-continue"]').click();
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });

    await screenshots.capture(page, 'attack-resolved', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        // Verify encounter was discarded
        expect(state.game.encounterDeck.discardPile).toContain('bulls-eye');
      }
    });

    // STEP 4: Test Curse Card
    // Draw "A Gap in the Armor" (curse: AC -4)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'gap-in-armor'
      });
    });

    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'gap-in-armor-curse-card', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-name"]')).toContainText('A Gap in the Armor');
        await expect(page.locator('[data-testid="encounter-type"]')).toContainText('CURSE');
        await expect(page.locator('[data-testid="encounter-description"]')).toContainText('cursed');
      }
    });

    await page.locator('[data-testid="encounter-continue"]').click();
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });

    await screenshots.capture(page, 'curse-applied', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        // Verify curse was applied to Quinn
        const quinnStatus = state.game.heroHp.find((h: any) => h.heroId === 'quinn')?.statuses || [];
        const hasCurse = quinnStatus.some((s: any) => s.type === 'curse-gap-in-armor');
        expect(hasCurse).toBe(true);
      }
    });

    // STEP 5: Test Environment Card
    // Draw "Hidden Snipers" (environment: damage when alone)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'hidden-snipers'
      });
    });

    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'hidden-snipers-environment-card', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-name"]')).toContainText('Hidden Snipers');
        await expect(page.locator('[data-testid="encounter-type"]')).toContainText('ENVIRONMENT');
        await expect(page.locator('[data-testid="encounter-description"]')).toContainText('Environment');
      }
    });

    await page.locator('[data-testid="encounter-continue"]').click();
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });

    await screenshots.capture(page, 'environment-active', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        // Verify environment is now active
        expect(state.game.activeEnvironmentId).toBe('hidden-snipers');
      }
    });

    // STEP 6: Test Trap Card (display only)
    // Draw "Poisoned Dart Trap"
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'poisoned-dart-trap'
      });
    });

    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'poisoned-dart-trap-card', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-name"]')).toContainText('Poisoned Dart Trap');
        await expect(page.locator('[data-testid="encounter-type"]')).toContainText('TRAP');
        await expect(page.locator('[data-testid="encounter-effect"]')).toContainText('DC 10');
      }
    });

    await page.locator('[data-testid="encounter-continue"]').click();
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });

    await screenshots.capture(page, 'trap-acknowledged', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-card"]')).not.toBeVisible();
      }
    });

    // STEP 7: Test Hazard Card (display only)
    // Draw "Cave In"
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'cave-in-hazard'
      });
    });

    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'cave-in-hazard-card', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-name"]')).toContainText('Cave In');
        await expect(page.locator('[data-testid="encounter-type"]')).toContainText('HAZARD');
      }
    });

    await page.locator('[data-testid="encounter-continue"]').click();
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });

    await screenshots.capture(page, 'hazard-acknowledged', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-card"]')).not.toBeVisible();
      }
    });

    // STEP 8: Test Special Effect Card
    // Draw "Lost" (shuffles tile deck)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'lost'
      });
    });

    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'lost-special-effect-card', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-name"]')).toContainText('Lost');
        await expect(page.locator('[data-testid="encounter-type"]')).toContainText('EVENT');
        await expect(page.locator('[data-testid="encounter-effect"]')).toContainText('Special');
      }
    });

    await page.locator('[data-testid="encounter-continue"]').click();
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });

    await screenshots.capture(page, 'special-effect-resolved', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-card"]')).not.toBeVisible();
      }
    });

    // STEP 9: Test Cancel Mechanism (requires XP)
    // First, give party enough XP, THEN draw encounter
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      
      // Set XP first
      store.dispatch({
        type: 'game/setPartyResources',
        payload: {
          ...state.game.partyResources,
          xp: 10 // Enough to cancel one encounter (costs 5 XP)
        }
      });
      
      // Then draw encounter so component sees the XP
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'unbearable-heat'
      });
    });

    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'encounter-with-cancel-option', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-cancel"]')).toBeEnabled();
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(state.game.partyResources.xp).toBe(10);
      }
    });

    // Cancel the encounter
    await page.locator('[data-testid="encounter-cancel"]').click();
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });

    await screenshots.capture(page, 'encounter-cancelled', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        // XP reduced by 5
        expect(state.game.partyResources.xp).toBe(5);
        await expect(page.locator('[data-testid="encounter-card"]')).not.toBeVisible();
      }
    });
  });
});
