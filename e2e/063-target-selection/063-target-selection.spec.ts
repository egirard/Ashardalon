import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('063 - Target Selection on Map', () => {
  test('Player can select targets by tapping on the map', async ({ page }) => {
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

    // STEP 2: Set up Quinn and create a deterministic monster for consistent screenshots
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Position Quinn at the center of the start tile
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 2 } }
      });
      
      // Create a deterministic monster on the start tile, adjacent to Quinn
      // Place it at (2, 3) which is directly south of Quinn at (2, 2)
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          instanceId: 'kobold-test',
          monsterId: 'kobold',
          tileId: 'start-tile',
          position: { x: 2, y: 3 },
          hp: 3,
          maxHp: 3,
          isDowned: false,
          statuses: []
        }]
      });
      
      // Ensure we're in hero phase with full actions
      store.dispatch({
        type: 'game/setTurnPhase',
        payload: 'hero-phase'
      });
      
      store.dispatch({
        type: 'game/setHeroTurnActions',
        payload: { actionsTaken: [], canMove: true, canAttack: true }
      });
    });
    
    // Wait for state to be fully set up
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 2 });
      expect(storeState.game.monsters.length).toBe(1);
      expect(storeState.game.turnState.currentPhase).toBe('hero-phase');
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
    
    // STEP 3: Capture screenshot showing targetable monster with golden glow
    const monsterToken = page.locator('[data-testid="monster-token"][data-monster-id="kobold-test"]');
    await expect(monsterToken).toBeVisible();
    
    await screenshots.capture(page, '001-targetable-monster-highlighted', {
      programmaticCheck: async () => {
        // Verify monster is targetable (has highlight)
        await expect(monsterToken).toHaveAttribute('data-targetable', 'true');
        
        // Verify monster is not selected initially
        await expect(monsterToken).toHaveAttribute('data-selected', 'false');
        
        // Verify no target is selected in store
        const initialState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState().game;
        });
        expect(initialState.selectedTargetId).toBeNull();
        expect(initialState.selectedTargetType).toBeNull();
        
        // Verify hero is adjacent to monster
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(state.game.heroTokens[0].position).toEqual({ x: 2, y: 2 });
        expect(state.game.monsters.length).toBeGreaterThan(0);
        expect(state.game.monsters[0].position).toEqual({ x: 2, y: 3 });
      }
    });

    // STEP 4: Click on the monster to select it
    // Use JavaScript click since CSS animations are disabled
    await page.evaluate(() => {
      const button = document.querySelector('[data-testid="monster-token"][data-monster-id="kobold-test"]') as HTMLButtonElement;
      if (button) {
        button.click();
      }
    });
    
    // Wait for selection to be applied
    await expect(monsterToken).toHaveAttribute('data-selected', 'true');
    
    // Capture screenshot showing selected monster with green ring
    await screenshots.capture(page, '002-monster-selected-green-ring', {
      programmaticCheck: async () => {
        // Verify monster is now selected
        await expect(monsterToken).toHaveAttribute('data-selected', 'true');
        
        // Verify selection is reflected in store
        const selectedState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState().game;
        });
        expect(selectedState.selectedTargetId).toBe('kobold-test');
        expect(selectedState.selectedTargetType).toBe('monster');
      }
    });

    // STEP 5: Click on the monster again to deselect it  
    await page.evaluate(() => {
      const button = document.querySelector('[data-testid="monster-token"][data-monster-id="kobold-test"]') as HTMLButtonElement;
      if (button) {
        button.click();
      }
    });
    
    // Wait for deselection to update
    await expect(monsterToken).toHaveAttribute('data-selected', 'false');
    
    // Verify deselection is reflected in store
    const deselectedState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState().game;
    });
    expect(deselectedState.selectedTargetId).toBeNull();
    expect(deselectedState.selectedTargetType).toBeNull();

    // STEP 6: Expand an at-will attack card in the side panel
    // Quinn's default power cards include Cleric's Shield (card ID 2), an adjacent at-will attack
    // This simulates the player activating an attack, then tapping the monster on the map
    const clericsShieldCard = page.locator('[data-testid="power-card-2"]');
    await expect(clericsShieldCard).toBeVisible();
    await expect(clericsShieldCard).toHaveClass(/eligible/);
    // Verify this is Cleric's Shield (Quinn's at-will attack card)
    await expect(clericsShieldCard).toHaveAttribute('aria-label', /Cleric's Shield/);
    await expect(clericsShieldCard).toBeVisible();
    await expect(clericsShieldCard).toHaveClass(/eligible/);
    
    await clericsShieldCard.click();

    // Wait for the card to expand (shows inline target selection)
    await expect(page.locator('[data-testid="attack-card-expanded-2"]')).toBeVisible();

    await screenshots.capture(page, '003-attack-card-expanded-select-target', {
      programmaticCheck: async () => {
        // Verify the attack card is expanded and shows the monster as a target
        await expect(page.locator('[data-testid="attack-card-expanded-2"]')).toBeVisible();
        await expect(page.locator('[data-testid="attack-target-kobold-test"]')).toBeVisible();
        // Monster on the map is still targetable
        await expect(monsterToken).toHaveAttribute('data-targetable', 'true');
        // No attack triggered yet
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState().game;
        });
        expect(storeState.attackResult).toBeNull();
      }
    });

    // STEP 7: Click the monster token on the MAP (not the button in the side panel)
    // This is the key feature being tested: tapping the on-screen monster triggers the attack
    await page.evaluate(() => {
      const button = document.querySelector('[data-testid="monster-token"][data-monster-id="kobold-test"]') as HTMLButtonElement;
      if (button) {
        button.click();
      }
    });

    // Wait for the attack result to appear
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.attackResult).not.toBeNull();
    }).toPass();

    await screenshots.capture(page, '004-attack-triggered-by-map-click', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState().game;
        });
        // Verify attack was triggered by the on-map click
        expect(storeState.attackResult).not.toBeNull();
        expect(storeState.attackTargetId).toBe('kobold-test');
      }
    });
  });
});
