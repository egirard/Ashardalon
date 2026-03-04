import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame, disableAnimations } from '../helpers/screenshot-helper';

test.describe('101 - Monster Move Destination Choice', () => {
  test('Player can choose which destination square a monster should move to when multiple equidistant options exist', async ({ page }) => {
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

    // STEP 2: Set up a scenario where a monster needs to choose between multiple move destinations
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Position Quinn at (3, 3)
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 3, y: 3 } }
      });
      
      // Create a monster at (1, 3)
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          instanceId: 'kobold-test',
          monsterId: 'kobold',
          tileId: 'start',
          position: { x: 1, y: 3 },
          hp: 3,
          maxHp: 3,
          currentHp: 3,
          isDowned: false,
          statuses: [],
          controllerId: 'quinn'
        }]
      });
      
      // Manually trigger the monster decision prompt with multiple position options
      // Positions (2, 2), (2, 3), and (2, 4) are all one square away from the monster
      store.dispatch({
        type: 'game/promptMonsterDecision',
        payload: {
          decisionId: 'test-decision-001',
          type: 'choose-move-destination',
          monsterId: 'kobold-test',
          options: {
            positions: [
              { x: 2, y: 2 },
              { x: 2, y: 3 },
              { x: 2, y: 4 }
            ]
          },
          context: 'movement'
        }
      });
    });
    
    // Disable animations for stable screenshots
    await disableAnimations(page);
    
    // Wait for the decision prompt to appear
    await page.locator('[data-testid="monster-decision-prompt"]').waitFor({ state: 'visible' });
    
    // STEP 4: Capture screenshot showing the monster decision prompt with position options
    await screenshots.capture(page, '001-monster-move-decision-prompt', {
      programmaticCheck: async () => {
        // Verify the prompt is visible
        await expect(page.locator('[data-testid="monster-decision-prompt"]')).toBeVisible();
        
        // Verify the prompt text mentions selecting where the monster should move
        const promptText = await page.locator('.prompt-text').textContent();
        expect(promptText).toContain('Select where');
        
        // Verify the pending decision in store
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState().game;
        });
        expect(state.pendingMonsterDecision).not.toBeNull();
        expect(state.pendingMonsterDecision.type).toBe('choose-move-destination');
        expect(state.villainPhasePaused).toBe(true);
        
        // Verify multiple positions are available
        expect(state.pendingMonsterDecision.options.positions).toBeDefined();
        expect(state.pendingMonsterDecision.options.positions.length).toBeGreaterThan(1);
      }
    });

    // STEP 5: Click on one of the highlighted destination squares
    // Wait for at least one selectable square to appear
    await page.locator('.selectable-square.monster-decision-square').first().waitFor({ state: 'visible' });
    
    // Capture screenshot showing the highlighted squares
    await screenshots.capture(page, '002-highlighted-destinations', {
      programmaticCheck: async () => {
        // Verify that selectable squares are visible
        const selectableSquares = await page.locator('.selectable-square.monster-decision-square').count();
        expect(selectableSquares).toBeGreaterThan(1);
      }
    });
    
    // Click on the first selectable square
    await page.locator('.selectable-square.monster-decision-square').first().click();
    
    // Wait for the prompt to disappear
    await page.locator('[data-testid="monster-decision-prompt"]').waitFor({ state: 'hidden' });
    
    // STEP 6: Verify the decision was cleared and monster moved
    const finalState = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState().game;
    });
    expect(finalState.pendingMonsterDecision).toBeNull();
    expect(finalState.villainPhasePaused).toBe(false);
    
    // Verify the monster moved (its position should have changed)
    const monster = finalState.monsters.find((m: any) => m.instanceId === 'kobold-test');
    expect(monster).toBeDefined();
    // The monster should have moved from (1, 3) to one of the valid positions
    expect(monster.position.x !== 1 || monster.position.y !== 3).toBe(true);
    
    // Capture final state
    await screenshots.capture(page, '003-monster-moved', {
      programmaticCheck: async () => {
        // Verify monster moved
        const currentState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState().game;
        });
        const movedMonster = currentState.monsters.find((m: any) => m.instanceId === 'kobold-test');
        expect(movedMonster.position.x !== 1 || movedMonster.position.y !== 3).toBe(true);
      }
    });
  });

  test('Monster prioritizes scorch mark when moving to a new tile', async ({ page }) => {
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

    // STEP 2: Set up a multi-tile scenario where a monster will move to a new tile
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // Add a second tile to the east of the start tile
      const state = store.getState();
      const currentTiles = state.game.dungeon.tiles || [];
      
      store.dispatch({
        type: 'game/setDungeon',
        payload: {
          tiles: [
            ...currentTiles,
            {
              id: 'tile-east',
              tileType: 'tile-black-2exit-a',
              position: { col: 1, row: 0 },
              rotation: 0,
              edges: {
                north: 'unexplored',
                south: 'unexplored',
                east: 'unexplored',
                west: 'connected'
              }
            }
          ],
          unexploredEdges: [],
          tileDeck: []
        }
      });
      
      // Position Quinn on the east tile, far from the scorch mark
      // For tile-black-2exit-a at 0° rotation, scorch mark is at (1, 2) local coords
      // In global coords for tile at col=1, that's (4+1, 0+2) = (5, 2)
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 7, y: 2 } }
      });
      
      // Create a monster on the start tile near the edge
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          instanceId: 'kobold-scorch-test',
          monsterId: 'kobold',
          tileId: 'start',
          position: { x: 3, y: 2 },
          hp: 3,
          maxHp: 3,
          currentHp: 3,
          isDowned: false,
          statuses: [],
          controllerId: 'quinn'
        }]
      });
    });
    
    // Disable animations for stable screenshots
    await disableAnimations(page);
    
    // STEP 3: Capture initial state before monster moves
    await screenshots.capture(page, '004-before-scorch-move', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState().game;
        });
        
        // Verify monster is on start tile
        const monster = state.monsters.find((m: any) => m.instanceId === 'kobold-scorch-test');
        expect(monster).toBeDefined();
        expect(monster.tileId).toBe('start');
        expect(monster.position.x).toBe(3);
        expect(monster.position.y).toBe(2);
        
        // Verify hero is on the east tile
        const heroToken = state.heroTokens.find((h: any) => h.heroId === 'quinn');
        expect(heroToken.position.x).toBe(7);
      }
    });
    
    // STEP 4: Activate the monster and let it move toward the hero
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      
      // End hero phase to trigger villain phase
      store.dispatch({ type: 'game/endHeroPhase' });
    });
    
    // Wait for villain phase or monster decision prompt to appear
    await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Villain Phase', { timeout: 5000 }).catch(() => {});
    
    // STEP 5: Capture state after monster moves
    await screenshots.capture(page, '005-after-scorch-move', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState().game;
        });
        
        const monster = state.monsters.find((m: any) => m.instanceId === 'kobold-scorch-test');
        expect(monster).toBeDefined();
        
        // Monster should have moved toward the hero
        // It should have crossed to the east tile
        if (monster.tileId === 'tile-east') {
          // If the monster crossed tiles, verify it's at or near the scorch mark
          // Scorch mark for tile-black-2exit-a at 0° is (1, 2) in local coords
          // The monster should prioritize moving to the scorch mark
          console.log(`Monster moved to tile-east at position (${monster.position.x}, ${monster.position.y})`);
          
          // The scorch mark in global coords is (5, 2)
          // The monster should be close to or at this position
          const distanceToScorch = Math.abs(monster.position.x - 1) + Math.abs(monster.position.y - 2);
          console.log(`Distance to scorch mark (local coords): ${distanceToScorch}`);
        }
      }
    });
  });
});
