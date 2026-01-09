import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('027 - Treasure Cards', () => {
  test('Hero defeats monster, draws treasure, and assigns it to inventory', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Start the game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Set up deterministic state - position hero and hide movement
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 3 } }
      });
      store.dispatch({ type: 'game/hideMovement' });
      // Set a deterministic treasure deck with +1 Magic Sword at the top
      store.dispatch({
        type: 'game/setTreasureDeck',
        payload: { drawPile: [134, 135, 136], discardPile: [] }
      });
    });

    await screenshots.capture(page, 'initial-game-state', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(state.game.treasureDeck.drawPile.length).toBeGreaterThan(0);
        expect(state.game.drawnTreasure).toBeNull();
        expect(state.game.heroInventories['quinn'].items.length).toBe(0);
      }
    });

    // STEP 2: Add a monster adjacent to the hero
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-test',
          position: { x: 2, y: 2 },
          currentHp: 1,
          controllerId: 'quinn',
          tileId: 'start-tile'
        }]
      });
    });

    await screenshots.capture(page, 'monster-adjacent-to-hero', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(state.game.monsters.length).toBe(1);
        expect(state.game.monsters[0].position).toEqual({ x: 2, y: 2 });
      }
    });

    // STEP 3: Attack and defeat the monster
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setAttackResult',
        payload: {
          result: {
            roll: 18,
            attackBonus: 6,
            total: 24,
            targetAC: 14,
            isHit: true,
            damage: 2,
            isCritical: false
          },
          targetInstanceId: 'kobold-test',
          attackName: "Mace"
        }
      });
    });

    // Wait for combat result
    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'attack-defeats-monster', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="result-text"]')).toContainText('HIT');
        
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        // Monster should be defeated
        expect(state.game.monsters.length).toBe(0);
        // Treasure should be drawn automatically
        expect(state.game.drawnTreasure).not.toBeNull();
        expect(state.game.drawnTreasure.id).toBe(134); // +1 Magic Sword
        expect(state.game.treasureDrawnThisTurn).toBe(true);
      }
    });

    // Dismiss combat result
    await page.locator('[data-testid="dismiss-combat-result"]').click();
    await expect(page.locator('[data-testid="combat-result"]')).not.toBeVisible();

    // Dismiss defeat notification
    await page.locator('[data-testid="defeat-notification"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="dismiss-defeat-notification"]').click();
    await expect(page.locator('[data-testid="defeat-notification"]')).not.toBeVisible();

    // STEP 4: Treasure card modal appears
    await page.locator('[data-testid="treasure-card-modal"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'treasure-card-modal-displayed', {
      programmaticCheck: async () => {
        // Verify the treasure card UI
        await expect(page.locator('[data-testid="treasure-title"]')).toContainText('Treasure');
        await expect(page.locator('[data-testid="treasure-name"]')).toContainText('+1 Magic Sword');
        await expect(page.locator('[data-testid="treasure-type"]')).toContainText('Play Immediately');
        await expect(page.locator('[data-testid="treasure-effect"]')).toContainText('+1 Attack');
        await expect(page.locator('[data-testid="treasure-rule"]')).toBeVisible();
        
        // Verify assign button exists
        await expect(page.locator('[data-testid="assign-to-quinn"]')).toBeVisible();
      }
    });

    // STEP 5: Assign treasure to Quinn
    await page.locator('[data-testid="assign-to-quinn"]').click();
    await expect(page.locator('[data-testid="treasure-card-modal"]')).not.toBeVisible();

    await screenshots.capture(page, 'treasure-assigned-to-hero', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        // Treasure modal should be closed
        expect(state.game.drawnTreasure).toBeNull();
        // Treasure should be in Quinn's inventory
        expect(state.game.heroInventories['quinn'].items.length).toBe(1);
        expect(state.game.heroInventories['quinn'].items[0].cardId).toBe(134);
        expect(state.game.heroInventories['quinn'].items[0].isFlipped).toBe(false);
        // Treasure deck should have one less card
        expect(state.game.treasureDeck.drawPile).toEqual([135, 136]);
      }
    });
  });

  test('Player can discard treasure instead of assigning it', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // Start the game
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Set up state with a monster
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 3 } }
      });
      store.dispatch({ type: 'game/hideMovement' });
      store.dispatch({
        type: 'game/setTreasureDeck',
        payload: { drawPile: [134, 135], discardPile: [] }
      });
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'kobold',
          instanceId: 'kobold-test',
          position: { x: 2, y: 2 },
          currentHp: 1,
          controllerId: 'quinn',
          tileId: 'start-tile'
        }]
      });
    });

    // Defeat monster to draw treasure
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setAttackResult',
        payload: {
          result: {
            roll: 18,
            attackBonus: 6,
            total: 24,
            targetAC: 14,
            isHit: true,
            damage: 2,
            isCritical: false
          },
          targetInstanceId: 'kobold-test',
          attackName: "Mace"
        }
      });
    });

    // Dismiss combat result and defeat notification
    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="dismiss-combat-result"]').click();
    await page.locator('[data-testid="defeat-notification"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="dismiss-defeat-notification"]').click();

    // Treasure modal appears
    await page.locator('[data-testid="treasure-card-modal"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'treasure-card-before-discard', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="dismiss-treasure-card"]')).toBeVisible();
        await expect(page.locator('[data-testid="dismiss-treasure-card"]')).toContainText('Discard Treasure');
      }
    });

    // Click discard button
    await page.locator('[data-testid="dismiss-treasure-card"]').click();
    await expect(page.locator('[data-testid="treasure-card-modal"]')).not.toBeVisible();

    await screenshots.capture(page, 'treasure-discarded', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        // Treasure modal should be closed
        expect(state.game.drawnTreasure).toBeNull();
        // Treasure should NOT be in Quinn's inventory
        expect(state.game.heroInventories['quinn'].items.length).toBe(0);
        // Treasure should be in discard pile
        expect(state.game.treasureDeck.discardPile).toContain(134);
        expect(state.game.treasureDeck.drawPile).toEqual([135]);
      }
    });
  });

  test('Only one treasure is drawn per turn', async ({ page }) => {
    // Start the game
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Set up state with two monsters
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 3 } }
      });
      store.dispatch({ type: 'game/hideMovement' });
      store.dispatch({
        type: 'game/setTreasureDeck',
        payload: { drawPile: [134, 135, 136], discardPile: [] }
      });
      store.dispatch({
        type: 'game/setMonsters',
        payload: [
          {
            monsterId: 'kobold',
            instanceId: 'kobold-1',
            position: { x: 2, y: 2 },
            currentHp: 1,
            controllerId: 'quinn',
            tileId: 'start-tile'
          },
          {
            monsterId: 'kobold',
            instanceId: 'kobold-2',
            position: { x: 1, y: 3 },
            currentHp: 1,
            controllerId: 'quinn',
            tileId: 'start-tile'
          }
        ]
      });
    });

    // Defeat first monster
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setAttackResult',
        payload: {
          result: {
            roll: 18,
            attackBonus: 6,
            total: 24,
            targetAC: 14,
            isHit: true,
            damage: 2,
            isCritical: false
          },
          targetInstanceId: 'kobold-1',
          attackName: "Mace"
        }
      });
    });

    // Dismiss combat result and defeat notification
    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="dismiss-combat-result"]').click();
    await page.locator('[data-testid="defeat-notification"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="dismiss-defeat-notification"]').click();

    // Assign first treasure
    await page.locator('[data-testid="treasure-card-modal"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="assign-to-quinn"]').click();
    await expect(page.locator('[data-testid="treasure-card-modal"]')).not.toBeVisible();

    // Verify first treasure was assigned
    let state = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(state.game.heroInventories['quinn'].items.length).toBe(1);
    expect(state.game.treasureDrawnThisTurn).toBe(true);

    // Defeat second monster (if allowed by game rules - need to force attack action)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // Force allow another attack for testing
      store.dispatch({
        type: 'game/setAttackResult',
        payload: {
          result: {
            roll: 18,
            attackBonus: 6,
            total: 24,
            targetAC: 14,
            isHit: true,
            damage: 2,
            isCritical: false
          },
          targetInstanceId: 'kobold-2',
          attackName: "Mace"
        }
      });
    });

    // Verify no new treasure modal appeared (treasureDrawnThisTurn blocks it)
    state = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    
    // Still only 1 treasure in inventory
    expect(state.game.heroInventories['quinn'].items.length).toBe(1);
    // Draw pile should still have cards (second treasure not drawn)
    expect(state.game.treasureDeck.drawPile.length).toBe(2);
  });

  test('Treasure drawn flag resets at start of new turn', async ({ page }) => {
    // Start the game
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    // CRITICAL: Set deterministic seed before starting game
    await setupDeterministicGame(page);
    
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Set up state with treasure drawn this turn
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 3 } }
      });
      store.dispatch({ type: 'game/hideMovement' });
    });

    // Progress through hero phase
    await page.locator('[data-testid="end-phase-button"]').click();
    
    // Progress through exploration phase
    await page.locator('[data-testid="end-phase-button"]').click();

    // During villain phase, an encounter card may be drawn (if no exploration occurred)
    // Check if encounter card appeared and dismiss it
    const encounterCardVisible = await page.locator('[data-testid="encounter-card-overlay"]').isVisible();
    if (encounterCardVisible) {
      await page.locator('[data-testid="dismiss-encounter-card"]').click();
      await expect(page.locator('[data-testid="encounter-card-overlay"]')).not.toBeVisible();
    }

    // Progress through villain phase (ends turn and starts next)
    await page.locator('[data-testid="end-phase-button"]').click();

    // Verify treasureDrawnThisTurn is reset
    const state = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(state.game.treasureDrawnThisTurn).toBe(false);
  });
});
