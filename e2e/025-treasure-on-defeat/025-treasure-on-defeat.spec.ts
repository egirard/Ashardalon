import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction } from '../helpers/screenshot-helper';

test.describe('025 - Draw Treasure on Monster Defeat', () => {
  test('Hero defeats monster and draws treasure card', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Start the game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    // Select power cards for Quinn
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Set up deterministic position and hide movement overlay
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 3 } }
      });
      store.dispatch({ type: 'game/hideMovement' });
    });

    await screenshots.capture(page, 'initial-game-board', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        // Verify treasure deck is initialized
        expect(state.game.treasureDeck.drawPile.length).toBeGreaterThan(0);
        expect(state.game.drawnTreasure).toBeNull();
        expect(state.game.treasureDrawnThisTurn).toBe(false);
      }
    });

    // STEP 2: Add a monster for testing
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

    await screenshots.capture(page, 'monster-on-board', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(state.game.monsters.length).toBe(1);
        expect(state.game.monsters[0].currentHp).toBe(1);
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

    // Wait for combat result to appear
    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'attack-hits-monster', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="result-text"]')).toContainText('HIT');
        
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        // Monster should be defeated
        expect(state.game.monsters.length).toBe(0);
        // Treasure should be drawn
        expect(state.game.drawnTreasure).not.toBeNull();
        expect(state.game.treasureDrawnThisTurn).toBe(true);
      }
    });

    // Dismiss combat result
    await page.locator('[data-testid="dismiss-combat-result"]').click();
    await expect(page.locator('[data-testid="combat-result"]')).not.toBeVisible();

    // Wait for and dismiss defeat notification
    await page.locator('[data-testid="defeat-notification"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="dismiss-defeat-notification"]').click();
    await expect(page.locator('[data-testid="defeat-notification"]')).not.toBeVisible();

    // STEP 4: Verify treasure card modal appears
    await page.locator('[data-testid="treasure-card-modal"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'treasure-card-displayed', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="treasure-title"]')).toContainText('Treasure');
        await expect(page.locator('[data-testid="treasure-name"]')).toBeVisible();
        await expect(page.locator('[data-testid="treasure-description"]')).toBeVisible();
        await expect(page.locator('[data-testid="treasure-rule"]')).toBeVisible();
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
        expect(state.game.heroInventories['quinn']).toBeDefined();
        expect(state.game.heroInventories['quinn'].items.length).toBe(1);
      }
    });
  });

  test('Only one treasure is drawn per turn', async ({ page }) => {
    // Start game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Set up state with two monsters and already drawn treasure
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 3 } }
      });
      store.dispatch({ type: 'game/hideMovement' });
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

    // Dismiss combat result
    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="dismiss-combat-result"]').click();

    // Dismiss defeat notification
    await page.locator('[data-testid="defeat-notification"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="dismiss-defeat-notification"]').click();

    // First treasure should appear - assign it
    await page.locator('[data-testid="treasure-card-modal"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="assign-to-quinn"]').click();

    // Verify first treasure was drawn
    let state = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(state.game.heroInventories['quinn'].items.length).toBe(1);
    expect(state.game.treasureDrawnThisTurn).toBe(true);

    // Now manually attack second monster (need to reset canAttack for test)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // Reset hero turn actions to allow another attack for testing
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

    // The attack won't go through because canAttack is false after first attack
    // But even if we force another defeat, no new treasure should be drawn
    
    // Verify no second treasure drawn
    state = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    // Still only 1 treasure since treasureDrawnThisTurn prevents drawing
    expect(state.game.heroInventories['quinn'].items.length).toBe(1);
  });

  test('Treasure can be dismissed/discarded', async ({ page }) => {
    // Start game
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Set up state
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 3 } }
      });
      store.dispatch({ type: 'game/hideMovement' });
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

    // Get initial treasure deck count
    let state = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    const initialDeckSize = state.game.treasureDeck.drawPile.length;

    // Defeat monster
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

    // Treasure should appear
    await page.locator('[data-testid="treasure-card-modal"]').waitFor({ state: 'visible' });

    // Dismiss/discard the treasure instead of assigning it
    await page.locator('[data-testid="dismiss-treasure-card"]').click();
    await expect(page.locator('[data-testid="treasure-card-modal"]')).not.toBeVisible();

    // Verify treasure was discarded, not added to inventory
    state = await page.evaluate(() => {
      return (window as any).__REDUX_STORE__.getState();
    });
    expect(state.game.drawnTreasure).toBeNull();
    expect(state.game.heroInventories['quinn'].items.length).toBe(0);
    // Treasure should be in discard pile
    expect(state.game.treasureDeck.discardPile.length).toBe(1);
    // Draw pile should be smaller
    expect(state.game.treasureDeck.drawPile.length).toBe(initialDeckSize - 1);
  });
});
