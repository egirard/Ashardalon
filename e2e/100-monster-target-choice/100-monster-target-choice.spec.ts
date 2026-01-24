import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('100 - Monster Target Choice', () => {
  test('Player can choose which hero a monster should target when multiple heroes are equidistant', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Navigate to character selection and select Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // STEP 2: Set up a scenario where a monster needs to choose between two equidistant heroes
    // We'll manually trigger a monster decision prompt for demonstration
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Position Quinn at (2, 2)
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 2 } }
      });
      
      // Add Vistra as a second hero at (2, 4) - equidistant from a monster at (4, 3)
      // First add Vistra to selected heroes
      const state = store.getState();
      if (!state.heroes.selectedHeroes.find((h: any) => h.id === 'vistra')) {
        store.dispatch({
          type: 'heroes/addSelectedHero',
          payload: {
            id: 'vistra',
            name: 'Vistra',
            heroClass: 'Fighter',
            imagePath: 'assets/Hero_Vistra.png',
            speed: 5,
            attack: { name: 'Heavy Flail', attackBonus: 8, damage: 2, range: 1 },
            hp: 10,
            maxHp: 10,
            ac: 18
          }
        });
      }
      
      // Add Vistra token to the board
      const heroTokens = store.getState().game.heroTokens;
      if (!heroTokens.find((t: any) => t.heroId === 'vistra')) {
        store.dispatch({
          type: 'game/addHeroToken',
          payload: { heroId: 'vistra', position: { x: 2, y: 4 } }
        });
      } else {
        store.dispatch({
          type: 'game/setHeroPosition',
          payload: { heroId: 'vistra', position: { x: 2, y: 4 } }
        });
      }
      
      // Add Vistra to hero HP tracking
      store.dispatch({
        type: 'game/initializeHeroHp',
        payload: {
          heroId: 'vistra',
          maxHp: 10,
          currentHp: 10,
          level: 1
        }
      });
      
      // Create a monster at (4, 3) - equidistant from both heroes (distance 2)
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          instanceId: 'kobold-test',
          monsterId: 'kobold',
          tileId: 'start',
          position: { x: 4, y: 3 },
          hp: 3,
          maxHp: 3,
          isDowned: false,
          statuses: []
        }]
      });
      
      // Manually trigger the monster decision prompt
      store.dispatch({
        type: 'game/promptMonsterDecision',
        payload: {
          decisionId: 'test-decision-001',
          type: 'choose-hero-target',
          monsterId: 'kobold-test',
          options: {
            heroIds: ['quinn', 'vistra']
          },
          context: 'movement'
        }
      });
    });
    
    // Wait for the prompt to appear
    await page.locator('[data-testid="monster-decision-prompt"]').waitFor({ state: 'visible' });
    
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
    
    // STEP 3: Capture screenshot showing the monster decision prompt
    await screenshots.capture(page, '001-monster-decision-prompt', {
      programmaticCheck: async () => {
        // Verify the prompt is visible
        await expect(page.locator('[data-testid="monster-decision-prompt"]')).toBeVisible();
        
        // Verify both hero buttons are present
        await expect(page.locator('[data-testid="monster-decision-hero-quinn"]')).toBeVisible();
        await expect(page.locator('[data-testid="monster-decision-hero-vistra"]')).toBeVisible();
        
        // Verify the prompt text mentions selecting a hero
        const promptText = await page.locator('.prompt-text').textContent();
        expect(promptText).toContain('Select which hero');
        
        // Verify the pending decision in store
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState().game;
        });
        expect(state.pendingMonsterDecision).not.toBeNull();
        expect(state.pendingMonsterDecision.type).toBe('choose-hero-target');
        expect(state.pendingMonsterDecision.options.heroIds).toEqual(['quinn', 'vistra']);
      }
    });

    // STEP 4: Click on Quinn to select that hero
    await page.locator('[data-testid="monster-decision-hero-quinn"]').click();
    
    // Wait for the prompt to disappear
    await page.locator('[data-testid="monster-decision-prompt"]').waitFor({ state: 'hidden' });
    
    // STEP 5: Verify the decision was cleared
    const finalState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState().game;
    });
    expect(finalState.pendingMonsterDecision).toBeNull();
    expect(finalState.villainPhasePaused).toBe(false);
  });
});
