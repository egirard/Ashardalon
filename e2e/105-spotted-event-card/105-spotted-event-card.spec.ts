import { test, expect } from '@playwright/test';
import { createScreenshotHelper, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('105 - Spotted! Encounter Card', () => {
  test('spotted filters deck for sentries, places tile, and spawns monster', async ({ page }) => {
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

    // STEP 2: Verify initial state
    await screenshots.capture(page, 'game-started', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.turnState.currentPhase).toBe('hero-phase');
        expect(state.game.monsterDeck.drawPile.length).toBeGreaterThan(0);
        expect(state.game.dungeon.tiles.length).toBeGreaterThan(0);
      }
    });

    // Record initial deck and dungeon state
    const initialState = await page.evaluate(() => {
      const state = (window as any).__REDUX_STORE__.getState();
      return {
        monsterDrawPileLength: state.game.monsterDeck.drawPile.length,
        monsterDiscardPileLength: state.game.monsterDeck.discardPile.length,
        tileCount: state.game.dungeon.tiles.length,
        tileDeckLength: state.game.dungeon.tileDeck.length,
        monsterCount: state.game.monsters.length,
        unexploredEdgesCount: state.game.dungeon.unexploredEdges.length,
      };
    });

    // STEP 3: Force draw Spotted! encounter card
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/setDrawnEncounter', payload: 'spotted' });
    });

    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'spotted-encounter-drawn', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(storeState.game.drawnEncounter).not.toBeNull();
        expect(storeState.game.drawnEncounter.id).toBe('spotted');

        await expect(page.locator('[data-testid="encounter-card"]')).toContainText('Spotted!');
        await expect(page.locator('[data-testid="encounter-card"]')).toContainText('Sentry');
      }
    });

    // STEP 4: Dismiss encounter card to apply effect
    await page.locator('[data-testid="dismiss-encounter-card"]').click();
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });

    await screenshots.capture(page, 'spotted-effect-applied', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(storeState.game.drawnEncounter).toBeNull();

        // Verify effect message contains all expected elements
        expect(storeState.game.encounterEffectMessage).toBeTruthy();
        expect(storeState.game.encounterEffectMessage).toContain('Drew 5 monster cards');
        
        // Check that message mentions Sentries placed on top
        const message = storeState.game.encounterEffectMessage;
        expect(message).toMatch(/Sentries? placed on top/);
        
        // Verify tile placement message
        expect(message).toContain('Tile placed');
        
        // Verify monster spawn message
        expect(message).toContain('spawned');
        
        // Parse the deck filtering results
        const sentryMatch = message.match(/(\d+) Sentries? placed on top, (\d+) discarded/);
        expect(sentryMatch).toBeTruthy();
        
        if (!sentryMatch) {
          throw new Error('Failed to parse encounter effect message');
        }
        
        const sentriesKept = parseInt(sentryMatch[1], 10);
        const sentriesDiscarded = parseInt(sentryMatch[2], 10);
        
        // Total should equal 5 (cards drawn)
        expect(sentriesKept + sentriesDiscarded).toBe(5);
        
        const currentDeck = storeState.game.monsterDeck;
        
        // Verify 5 cards were drawn from the draw pile and sentries added back
        expect(currentDeck.drawPile.length).toBe(initialState.monsterDrawPileLength - 5 + sentriesKept);
        
        // Verify non-sentries were added to the discard pile
        expect(currentDeck.discardPile.length).toBe(initialState.monsterDiscardPileLength + sentriesDiscarded);
        
        // Verify a new tile was added
        expect(storeState.game.dungeon.tiles.length).toBe(initialState.tileCount + 1);
        
        // Verify tile deck decreased by 1
        expect(storeState.game.dungeon.tileDeck.length).toBe(initialState.tileDeckLength - 1);
        
        // Verify unexplored edges were updated (some closed, new ones added)
        expect(storeState.game.dungeon.unexploredEdges).toBeDefined();
        
        // Verify a new monster was spawned
        expect(storeState.game.monsters.length).toBeGreaterThan(initialState.monsterCount);
        
        // Verify the newly spawned monster exists
        expect(storeState.game.recentlySpawnedMonsterId).toBeTruthy();
      }
    });

    // STEP 5: Verify encounter effect notification is visible
    await page.locator('[data-testid="encounter-effect-notification"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'encounter-effect-notification', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="encounter-effect-notification"]')).toBeVisible();
        await expect(page.locator('[data-testid="effect-message"]')).toContainText('Drew 5 monster cards');
        await expect(page.locator('[data-testid="effect-message"]')).toContainText('Tile placed');
        await expect(page.locator('[data-testid="effect-message"]')).toContainText('spawned');
      }
    });

    await page.locator('[data-testid="dismiss-effect-notification"]').click();
    await page.locator('[data-testid="encounter-effect-notification"]').waitFor({ state: 'hidden' });

    // STEP 6: Verify the newly placed tile is visible on the board
    await screenshots.capture(page, 'new-tile-visible', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        
        // Verify encounter card was cleared
        expect(storeState.game.drawnEncounter).toBeNull();
        
        // Verify game is still in hero phase
        expect(storeState.game.turnState.currentPhase).toBe('hero-phase');
        
        // Verify the new tile count
        expect(storeState.game.dungeon.tiles.length).toBe(initialState.tileCount + 1);
        
        // Verify monster was spawned
        expect(storeState.game.monsters.length).toBeGreaterThan(initialState.monsterCount);
      }
    });

    // STEP 7: Verify the spawned monster is visible on the new tile
    await screenshots.capture(page, 'spawned-monster-visible', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        
        // Get the newly spawned monster
        const newMonsterId = storeState.game.recentlySpawnedMonsterId;
        expect(newMonsterId).toBeTruthy();
        
        const newMonster = storeState.game.monsters.find(
          (m: any) => m.instanceId === newMonsterId
        );
        expect(newMonster).toBeDefined();
        
        // Verify monster is on one of the tiles
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
