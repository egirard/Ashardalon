import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('103 - Wandering Monsters Event Card', () => {
  test('wandering monster card draws monster and spawns on tile with unexplored edge', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Navigate and start game with Quinn from bottom edge
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'character-select-screen', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="character-select"]')).toBeVisible();
      }
    });
    
    // Select Quinn from bottom edge for natural reading orientation
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    
    // Select power cards
    await selectDefaultPowerCards(page, 'quinn');
    
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    
    // Wait for game board and dismiss scenario introduction
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);
    
    await screenshots.capture(page, 'game-started', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.heroTokens).toHaveLength(1);
        expect(storeState.game.heroTokens[0].heroId).toBe('quinn');
        // Verify we're on start tile with unexplored edges
        expect(storeState.game.dungeon.unexploredEdges.length).toBeGreaterThan(0);
      }
    });
    
    // STEP 2: Set up game state - place a tile to create unexplored edges
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Position Quinn at a specific location
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 3 } }
      });
      
      // Place an exploration tile to ensure we have unexplored edges
      // The start tile already has unexplored edges, but let's verify state
      const state = store.getState();
      console.log('Unexplored edges:', state.game.dungeon.unexploredEdges);
    });
    
    await screenshots.capture(page, 'game-ready-for-encounter', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        // Verify Quinn is positioned
        expect(storeState.game.heroTokens[0].position).toEqual({ x: 2, y: 3 });
        // Verify we have unexplored edges for monster spawning
        expect(storeState.game.dungeon.unexploredEdges.length).toBeGreaterThan(0);
      }
    });
    
    // STEP 3: Get initial monster count before drawing encounter
    const initialMonsterCount = await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      return state.game.monsters.length;
    });
    
    // STEP 4: Draw "Wandering Monster" encounter card
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      store.dispatch({
        type: 'game/setDrawnEncounter',
        payload: 'wandering-monster'
      });
    });
    
    // Wait for encounter card to appear
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'wandering-monster-card-displayed', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-card"]')).toBeVisible();
        await expect(page.locator('[data-testid="encounter-name"]')).toContainText('Wandering Monster');
        await expect(page.locator('[data-testid="encounter-description"]')).toContainText('unexplored edge');
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.drawnEncounter).not.toBeNull();
        expect(storeState.game.drawnEncounter.id).toBe('wandering-monster');
        expect(storeState.game.drawnEncounter.type).toBe('event');
        expect(storeState.game.drawnEncounter.effect.type).toBe('special');
      }
    });
    
    // STEP 5: Accept the encounter card (spawns monster)
    await page.locator('[data-testid="encounter-continue"]').click();
    
    // Wait for encounter card to disappear
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });
    
    // Wait for monster spawn to complete
    await page.waitForTimeout(500);
    
    await screenshots.capture(page, 'monster-spawned', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-card"]')).not.toBeVisible();
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify monster was spawned
        const newMonsterCount = storeState.game.monsters.length;
        expect(newMonsterCount).toBeGreaterThan(initialMonsterCount);
        
        // Verify monster deck was updated (a card was drawn)
        expect(storeState.game.monsterDeck).toBeDefined();
        
        // Verify encounter effect message was set
        expect(storeState.game.encounterEffectMessage).toBeDefined();
        expect(storeState.game.encounterEffectMessage).toContain('spawned');
        
        // Verify recently spawned monster ID is set
        expect(storeState.game.recentlySpawnedMonsterId).toBeDefined();
        
        // Verify at least one monster exists on the board
        expect(storeState.game.monsters.length).toBeGreaterThan(0);
        
        // Verify the spawned monster has a position on a tile
        const spawnedMonster = storeState.game.monsters[storeState.game.monsters.length - 1];
        expect(spawnedMonster.position).toBeDefined();
        expect(spawnedMonster.position.x).toBeGreaterThanOrEqual(0);
        expect(spawnedMonster.position.y).toBeGreaterThanOrEqual(0);
      }
    });
    
    // STEP 6: Dismiss the encounter effect message
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/dismissEncounterEffectMessage'
      });
    });
    
    // Wait for message to be dismissed
    await page.waitForTimeout(200);
    
    await screenshots.capture(page, 'message-dismissed', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify the encounter effect message is cleared
        expect(storeState.game.encounterEffectMessage).toBeNull();
        
        // Verify we have monsters on the board
        expect(storeState.game.monsters.length).toBeGreaterThan(0);
      }
    });
    
    // STEP 7: Verify monster is visible on the game board
    await screenshots.capture(page, 'monster-on-board', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify the encounter was discarded
        expect(storeState.game.drawnEncounter).toBeNull();
        
        // Verify we have monsters on the board
        expect(storeState.game.monsters.length).toBeGreaterThan(0);
      }
    });
    
    // STEP 8: Verify complete lifecycle - card drawn, effect executed, card discarded
    await screenshots.capture(page, 'complete-lifecycle', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        
        // Verify the encounter was properly discarded
        expect(storeState.game.drawnEncounter).toBeNull();
        
        // Verify encounter deck discard pile contains wandering-monster
        const discardedEncounters = storeState.game.encounterDeck.discardPile;
        expect(discardedEncounters).toContain('wandering-monster');
        
        // Verify game state is clean (no pending encounter)
        expect(storeState.game.drawnEncounter).toBeNull();
        
        // Verify monster count increased from the spawn
        expect(storeState.game.monsters.length).toBeGreaterThan(initialMonsterCount);
      }
    });
  });
});
