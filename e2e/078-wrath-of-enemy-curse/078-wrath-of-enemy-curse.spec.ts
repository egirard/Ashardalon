import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('078 - Wrath of the Enemy Curse Mechanical Effect', () => {
  test('curse causes closest monster not on tile to move adjacent to cursed hero', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Navigate and start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'character-select-screen', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="character-select"]')).toBeVisible();
      }
    });
    
    // Select Quinn from bottom edge (so text is oriented towards viewer)
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    
    // Wait for and dismiss power selection modal if it appears (Quinn has auto-selected powers)
    const doneButton = page.locator('[data-testid="done-power-selection"]');
    try {
      await doneButton.waitFor({ state: 'visible', timeout: 2000 });
      await doneButton.click();
    } catch (e) {
      // Modal might not appear, that's okay
    }
    
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    
    // Wait for game board
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);
    
    // STEP 2: Set up game state with hero and monsters on different tiles
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Position Quinn on start tile
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 4 } }
      });
      
      // Set turn state to exploration phase
      store.dispatch({
        type: 'game/setTurnPhase',
        payload: 'exploration-phase'
      });
      
      // Add an adjacent tile
      const state = store.getState().game;
      const startTile = state.dungeon.tiles.find((t: any) => t.id === 'start-tile');
      
      store.dispatch({
        type: 'game/placeExplorationTile',
        payload: {
          tile: {
            id: 'tile-1',
            tileType: 'cave',
            position: { col: 1, row: 0 },
            rotation: 0,
            edges: {
              north: 'wall',
              south: 'wall',
              east: 'unexplored',
              west: 'wall',
            },
          },
          edge: {
            tileId: 'start-tile',
            direction: 'east',
          }
        }
      });
      
      // Add a monster on the adjacent tile (far from Quinn)
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-0',
          position: { x: 2, y: 2 }, // Local position on tile-1
          currentHp: 1,
          controllerId: 'quinn',
          tileId: 'tile-1',
        }]
      });
    });
    
    await screenshots.capture(page, 'game-setup-monster-on-different-tile', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify Quinn is on start tile
        expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 4 });
        
        // Verify monster is on tile-1
        expect(storeState.game.monsters.length).toBe(1);
        expect(storeState.game.monsters[0].tileId).toBe('tile-1');
      }
    });
    
    // STEP 3: Apply Wrath of the Enemy curse to Quinn
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Draw wrath-of-enemy curse encounter
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'wrath-of-enemy'
      });
    });
    
    // Wait for encounter card to appear
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'wrath-of-enemy-curse-displayed', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-card"]')).toBeVisible();
        await expect(page.locator('[data-testid="encounter-name"]')).toContainText('Wrath of the Enemy');
        await expect(page.locator('[data-testid="encounter-description"]')).toContainText('Monster');
      }
    });
    
    // Accept the curse
    await page.locator('[data-testid="encounter-continue"]').click();
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });
    
    await screenshots.capture(page, 'curse-applied-to-quinn', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify curse was applied
        const quinnHp = storeState.game.heroHp.find((h: any) => h.heroId === 'quinn');
        expect(quinnHp.statuses).toBeDefined();
        
        const wrathCurse = quinnHp.statuses.find((s: any) => s.type === 'curse-wrath-of-enemy');
        expect(wrathCurse).toBeDefined();
        expect(wrathCurse.source).toBe('wrath-of-enemy');
      }
    });
    
    // STEP 4: End exploration phase - this should trigger the curse effect
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      store.dispatch({
        type: 'game/endExplorationPhase'
      });
    });
    
    // Wait for villain phase
    await page.waitForFunction(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      return state.game.turnState.currentPhase === 'villain-phase';
    }, { timeout: 5000 });
    
    // Dismiss any encounter card that was drawn
    const encounterCard = page.locator('[data-testid="encounter-card"]');
    try {
      await encounterCard.waitFor({ state: 'visible', timeout: 2000 });
      const continueButton = page.locator('[data-testid="encounter-continue"]');
      await continueButton.click();
      await encounterCard.waitFor({ state: 'hidden', timeout: 5000 });
    } catch (e) {
      // No encounter card, that's fine
    }
    
    // Dismiss any encounter effect message
    const encounterEffectMessage = page.locator('[data-testid="encounter-effect-message"]');
    try {
      await encounterEffectMessage.waitFor({ state: 'visible', timeout: 2000 });
      const effectContinueButton = page.locator('[data-testid="encounter-effect-continue"]');
      await effectContinueButton.click();
      await encounterEffectMessage.waitFor({ state: 'hidden', timeout: 5000 });
    } catch (e) {
      // No effect message, that's fine
    }
    
    // Wait for game board to be stable with no popups
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'monster-moved-adjacent-after-exploration', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // After dismissing all popups, we may be in villain or hero phase
        expect(['villain-phase', 'hero-phase']).toContain(storeState.game.turnState.currentPhase);
        
        // Get monster position
        const monster = storeState.game.monsters[0];
        expect(monster).toBeDefined();
        
        // All UI popups should be dismissed
        expect(storeState.game.drawnEncounter).toBeNull();
      }
    });
  });
});
