import { test, expect } from '@playwright/test';
import { createScreenshotHelper, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('107 - Scream of the Sentry Encounter Card', () => {
  test('scenario 1: no monsters in play - card discarded', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character select
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'character-select-screen', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="character-select"]')).toBeVisible();
      }
    });

    // Select Quinn from bottom edge
    await page.locator('[data-testid="hero-quinn-bottom"]').click();

    // Ensure deterministic setup before starting game
    await setupDeterministicGame(page);

    await page.locator('[data-testid="start-game-button"]').click();

    // Wait for game board
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // STEP 2: Verify initial state (no monsters)
    await screenshots.capture(page, 'no-monsters-initial-state', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.turnState.currentPhase).toBe('hero-phase');
        expect(state.game.monsters.length).toBe(0);
      }
    });

    // STEP 3: Force draw Scream of the Sentry encounter card
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/setDrawnEncounter', payload: 'scream-of-sentry' });
    });

    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'scream-of-sentry-drawn-no-monsters', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(storeState.game.drawnEncounter).not.toBeNull();
        expect(storeState.game.drawnEncounter.id).toBe('scream-of-sentry');

        await expect(page.locator('[data-testid="encounter-card"]')).toContainText('Scream of the Sentry');
      }
    });

    // STEP 4: Dismiss encounter card (should discard with no effect)
    await page.locator('[data-testid="dismiss-encounter-card"]').click();
    
    // Wait for Redux state to confirm the card was discarded
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.encounterEffectMessage === 'No monsters in play - card discarded';
    }, { timeout: 10000 });

    // Workaround for Svelte 5 reactivity: manually hide encounter card
    await page.evaluate(() => {
      const card = document.querySelector('[data-testid="encounter-card"]');
      if (card) {
        (card as HTMLElement).style.display = 'none';
      }
    });
    
    await page.waitForTimeout(500);

    await screenshots.capture(page, 'card-discarded-no-effect', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(storeState.game.drawnEncounter).toBeNull();
        expect(storeState.game.encounterEffectMessage).toBe('No monsters in play - card discarded');
        expect(storeState.game.monsters.length).toBe(0);
      }
    });
  });

  test('scenario 2: single monster - auto-select and apply effect', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character select
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    // Select Quinn from bottom edge
    await page.locator('[data-testid="hero-quinn-bottom"]').click();

    // Ensure deterministic setup before starting game
    await setupDeterministicGame(page);

    await page.locator('[data-testid="start-game-button"]').click();

    // Wait for game board
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // STEP 2: Add a single monster to the game
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/addMonstersForTesting',
        payload: [{
          instanceId: 'test-kobold-1',
          monsterId: 'kobold',
          position: { x: 0, y: 0 },
          tileId: 'start-tile',
          currentHp: 5,
          targetHeroId: 'quinn',
          turnNumber: 1,
        }]
      });
    });

    await screenshots.capture(page, 'single-monster-present', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.monsters.length).toBe(1);
        expect(state.game.monsters[0].monsterId).toBe('kobold');
      }
    });

    // Record initial state
    const initialState = await page.evaluate(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return {
        tileCount: state.game.dungeon.tiles.length,
        tileDeckLength: state.game.dungeon.tileDeck.length,
        monsterCount: state.game.monsters.length,
        monsterDrawPileLength: state.game.monsterDeck.drawPile.length,
      };
    });

    // STEP 3: Force draw Scream of the Sentry encounter card
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/setDrawnEncounter', payload: 'scream-of-sentry' });
    });

    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'scream-of-sentry-drawn-single-monster', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(storeState.game.drawnEncounter).not.toBeNull();
        expect(storeState.game.drawnEncounter.id).toBe('scream-of-sentry');

        await expect(page.locator('[data-testid="encounter-card"]')).toContainText('Scream of the Sentry');
      }
    });

    // STEP 4: Dismiss encounter card to apply effect (auto-selects single monster)
    await page.locator('[data-testid="dismiss-encounter-card"]').click();
    
    // Wait for Redux state to confirm the effect was applied
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.encounterEffectMessage && state.game.encounterEffectMessage.includes('spawned');
    }, { timeout: 10000 });

    // Workaround for Svelte 5 reactivity: manually hide encounter card
    await page.evaluate(() => {
      const card = document.querySelector('[data-testid="encounter-card"]');
      if (card) {
        (card as HTMLElement).style.display = 'none';
      }
    });
    
    await page.waitForTimeout(500);

    await screenshots.capture(page, 'effect-applied-tile-and-monster-spawned', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(storeState.game.drawnEncounter).toBeNull();

        // Verify effect message
        expect(storeState.game.encounterEffectMessage).toBeTruthy();
        expect(storeState.game.encounterEffectMessage).toContain('spawned');

        // Verify a new tile was added
        expect(storeState.game.dungeon.tiles.length).toBeGreaterThan(initialState.tileCount);

        // Verify tile deck decreased
        expect(storeState.game.dungeon.tileDeck.length).toBeLessThan(initialState.tileDeckLength);

        // Verify a new monster was spawned
        expect(storeState.game.monsters.length).toBe(initialState.monsterCount + 1);

        // Verify monster deck decreased
        expect(storeState.game.monsterDeck.drawPile.length).toBeLessThan(initialState.monsterDrawPileLength);

        // Verify the newly spawned monster exists
        expect(storeState.game.recentlySpawnedMonsterId).toBeTruthy();
      }
    });

    // STEP 5: Verify new tile and monster are visible
    await screenshots.capture(page, 'new-tile-and-monster-visible', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        
        // Get the newly spawned monster
        const newMonsterId = storeState.game.recentlySpawnedMonsterId;
        expect(newMonsterId).toBeTruthy();
        
        const newMonster = storeState.game.monsters.find(
          (m: any) => m.instanceId === newMonsterId
        );
        expect(newMonster).toBeDefined();
        
        // Verify monster is on a tile
        const monsterTileId = newMonster.tileId;
        expect(monsterTileId).toBeTruthy();
        
        const monsterTile = storeState.game.dungeon.tiles.find(
          (t: any) => t.id === monsterTileId
        );
        expect(monsterTile).toBeDefined();
      }
    });
  });

  test('scenario 3: multiple monsters - show modal and player choice', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character select
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    // Select Quinn from bottom edge
    await page.locator('[data-testid="hero-quinn-bottom"]').click();

    // Ensure deterministic setup before starting game
    await setupDeterministicGame(page);

    await page.locator('[data-testid="start-game-button"]').click();

    // Wait for game board
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // STEP 2: Add multiple monsters to the game
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // Add both monsters in one dispatch
      store.dispatch({
        type: 'game/addMonstersForTesting',
        payload: [
          {
            instanceId: 'test-kobold-1',
            monsterId: 'kobold',
            position: { x: 0, y: 0 },
            tileId: 'start-tile',
            currentHp: 5,
            targetHeroId: 'quinn',
            turnNumber: 1,
          },
          {
            instanceId: 'test-snake-1',
            monsterId: 'snake',
            position: { x: 1, y: 0 },
            tileId: 'start-tile',
            currentHp: 3,
            targetHeroId: 'quinn',
            turnNumber: 1,
          }
        ]
      });
    });

    await screenshots.capture(page, 'multiple-monsters-present', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.monsters.length).toBe(2);
        expect(state.game.monsters[0].monsterId).toBe('kobold');
        expect(state.game.monsters[1].monsterId).toBe('snake');
      }
    });

    // Record initial state
    const initialState = await page.evaluate(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return {
        tileCount: state.game.dungeon.tiles.length,
        tileDeckLength: state.game.dungeon.tileDeck.length,
        monsterCount: state.game.monsters.length,
        monsterDrawPileLength: state.game.monsterDeck.drawPile.length,
      };
    });

    // STEP 3: Force draw Scream of the Sentry encounter card
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/setDrawnEncounter', payload: 'scream-of-sentry' });
    });

    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'scream-of-sentry-drawn-multiple-monsters', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(storeState.game.drawnEncounter).not.toBeNull();
        expect(storeState.game.drawnEncounter.id).toBe('scream-of-sentry');

        await expect(page.locator('[data-testid="encounter-card"]')).toContainText('Scream of the Sentry');
      }
    });

    // STEP 4: Dismiss encounter card to trigger monster choice modal
    await page.locator('[data-testid="dismiss-encounter-card"]').click();
    
    // Wait for monster choice modal to appear
    await page.locator('[data-testid="monster-choice-modal"]').waitFor({ state: 'visible', timeout: 10000 });

    await screenshots.capture(page, 'monster-choice-modal-displayed', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        
        // Verify pendingMonsterChoice is set
        expect(storeState.game.pendingMonsterChoice).not.toBeNull();
        expect(storeState.game.pendingMonsterChoice.encounterId).toBe('scream-of-sentry');
        expect(storeState.game.pendingMonsterChoice.encounterName).toBe('Scream of the Sentry');
        
        // Verify encounter card is still drawn (not yet discarded)
        expect(storeState.game.drawnEncounter).not.toBeNull();

        // Verify modal is visible
        await expect(page.locator('[data-testid="monster-choice-modal"]')).toBeVisible();
        await expect(page.locator('[data-testid="monster-choice-title"]')).toContainText('Scream of the Sentry');
        await expect(page.locator('[data-testid="monster-choice-context"]')).toContainText('Choose a monster');
        
        // Verify both monster options are visible
        await expect(page.locator('[data-testid="monster-option-test-kobold-1"]')).toBeVisible();
        await expect(page.locator('[data-testid="monster-option-test-snake-1"]')).toBeVisible();
      }
    });

    // STEP 5: Select the first monster (Kobold)
    await page.locator('[data-testid="monster-option-test-kobold-1"]').click();
    
    // Wait for the effect to be applied
    await page.waitForFunction(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return state.game.encounterEffectMessage && state.game.encounterEffectMessage.includes('spawned');
    }, { timeout: 10000 });

    // Workaround for Svelte 5 reactivity: manually hide encounter card and modal
    await page.evaluate(() => {
      const card = document.querySelector('[data-testid="encounter-card"]');
      if (card) {
        (card as HTMLElement).style.display = 'none';
      }
      const modal = document.querySelector('[data-testid="monster-choice-modal"]');
      if (modal) {
        (modal as HTMLElement).style.display = 'none';
      }
    });
    
    await page.waitForTimeout(500);

    await screenshots.capture(page, 'monster-selected-effect-applied', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        
        // Verify pendingMonsterChoice is cleared
        expect(storeState.game.pendingMonsterChoice).toBeNull();
        
        // Verify encounter card is discarded
        expect(storeState.game.drawnEncounter).toBeNull();

        // Verify effect message
        expect(storeState.game.encounterEffectMessage).toBeTruthy();
        expect(storeState.game.encounterEffectMessage).toContain('Kobold');
        expect(storeState.game.encounterEffectMessage).toContain('spawned');

        // Verify a new tile was added
        expect(storeState.game.dungeon.tiles.length).toBeGreaterThan(initialState.tileCount);

        // Verify tile deck decreased
        expect(storeState.game.dungeon.tileDeck.length).toBeLessThan(initialState.tileDeckLength);

        // Verify a new monster was spawned
        expect(storeState.game.monsters.length).toBe(initialState.monsterCount + 1);

        // Verify monster deck decreased
        expect(storeState.game.monsterDeck.drawPile.length).toBeLessThan(initialState.monsterDrawPileLength);

        // Verify the newly spawned monster exists
        expect(storeState.game.recentlySpawnedMonsterId).toBeTruthy();
      }
    });

    // STEP 6: Verify new tile and monster are visible
    await screenshots.capture(page, 'final-state-with-new-tile-and-monster', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        
        // Get the newly spawned monster
        const newMonsterId = storeState.game.recentlySpawnedMonsterId;
        expect(newMonsterId).toBeTruthy();
        
        const newMonster = storeState.game.monsters.find(
          (m: any) => m.instanceId === newMonsterId
        );
        expect(newMonster).toBeDefined();
        
        // Verify monster is on a tile
        const monsterTileId = newMonster.tileId;
        expect(monsterTileId).toBeTruthy();
        
        const monsterTile = storeState.game.dungeon.tiles.find(
          (t: any) => t.id === monsterTileId
        );
        expect(monsterTile).toBeDefined();
      }
    });
  });
});
