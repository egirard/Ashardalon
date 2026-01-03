import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction } from '../helpers/screenshot-helper';

test.describe('035 - Use Consumable Items', () => {
  test('Hero can use Potion of Healing to restore HP', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Start the game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
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
      
      // Set hero HP to 4 out of 8 (injured)
      store.dispatch({
        type: 'game/setHeroHp',
        payload: { heroId: 'quinn', currentHp: 4 }
      });
      
      // Give hero a Potion of Healing (ID: 150) in inventory
      store.dispatch({
        type: 'game/setHeroInventories',
        payload: {
          'quinn': {
            heroId: 'quinn',
            items: [{ cardId: 150, isFlipped: false }]
          }
        }
      });
    });

    await screenshots.capture(page, 'hero-injured-with-potion', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        const heroHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
        expect(heroHp.currentHp).toBe(4);
        expect(heroHp.maxHp).toBe(8);
        expect(state.game.heroInventories['quinn'].items.length).toBe(1);
        expect(state.game.heroInventories['quinn'].items[0].cardId).toBe(150);
      }
    });

    // STEP 2: Click on the Potion of Healing to use it
    const potionButton = page.locator('.treasure-item-mini.usable').first();
    await expect(potionButton).toBeVisible();
    await expect(potionButton).toHaveClass(/usable/);
    
    await screenshots.capture(page, 'potion-ready-to-use', {
      programmaticCheck: async () => {
        const potionElement = await page.locator('.treasure-item-mini.usable').first();
        await expect(potionElement).toBeVisible();
        const title = await potionElement.getAttribute('title');
        expect(title).toContain('Potion of Healing');
        expect(title).toContain('Click to use');
      }
    });

    await potionButton.click();

    // STEP 3: Verify HP increased by 2 and potion was consumed
    await screenshots.capture(page, 'after-using-potion', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        const heroHp = state.game.heroHp.find((h: any) => h.heroId === 'quinn');
        expect(heroHp.currentHp).toBe(6); // 4 + 2 = 6
        expect(heroHp.maxHp).toBe(8);
        // Potion should be removed from inventory (consumable items are discarded)
        expect(state.game.heroInventories['quinn'].items.length).toBe(0);
        // Potion should be in discard pile
        expect(state.game.treasureDeck.discardPile).toContain(150);
      }
    });

    // Verify HP display shows updated value
    const hpDisplay = page.locator('[data-testid="hero-hp"]').first();
    await expect(hpDisplay).toContainText('6/8');
  });

  test('Non-consumable items are not usable', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Start the game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Set up state with passive bonus item (+1 Magic Sword - ID: 134)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 3 } }
      });
      store.dispatch({ type: 'game/hideMovement' });
      
      // Give hero a +1 Magic Sword (passive item, should not be clickable)
      store.dispatch({
        type: 'game/setHeroInventories',
        payload: {
          'quinn': {
            heroId: 'quinn',
            items: [{ cardId: 134, isFlipped: false }]
          }
        }
      });
    });

    await screenshots.capture(page, 'passive-item-not-usable', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(state.game.heroInventories['quinn'].items.length).toBe(1);
        expect(state.game.heroInventories['quinn'].items[0].cardId).toBe(134);
      }
    });

    // Verify the item is displayed but not usable (no .usable class)
    const itemElement = page.locator('.treasure-item-mini').first();
    await expect(itemElement).toBeVisible();
    await expect(itemElement).not.toHaveClass(/usable/);
    
    // Verify it's a div, not a button (non-interactive)
    const tagName = await itemElement.evaluate((el) => el.tagName.toLowerCase());
    expect(tagName).toBe('div');
  });

  test('Flipped items cannot be used again', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Start the game with Quinn
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await selectDefaultPowerCards(page, 'quinn');
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Set up state with a flipped action item (Ring of Shooting Stars - ID: 157)
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 2, y: 3 } }
      });
      store.dispatch({ type: 'game/hideMovement' });
      
      // Give hero a Ring of Shooting Stars that's already been used (flipped)
      store.dispatch({
        type: 'game/setHeroInventories',
        payload: {
          'quinn': {
            heroId: 'quinn',
            items: [{ cardId: 157, isFlipped: true }]
          }
        }
      });
    });

    await screenshots.capture(page, 'flipped-item-not-usable', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(state.game.heroInventories['quinn'].items.length).toBe(1);
        expect(state.game.heroInventories['quinn'].items[0].cardId).toBe(157);
        expect(state.game.heroInventories['quinn'].items[0].isFlipped).toBe(true);
      }
    });

    // Verify the item is displayed but not usable (has .flipped class but not .usable)
    const itemElement = page.locator('.treasure-item-mini').first();
    await expect(itemElement).toBeVisible();
    await expect(itemElement).toHaveClass(/flipped/);
    await expect(itemElement).not.toHaveClass(/usable/);
    
    // Verify it shows the flipped indicator
    const flippedIndicator = itemElement.locator('.flipped-indicator');
    await expect(flippedIndicator).toBeVisible();
    await expect(flippedIndicator).toContainText('✗');
  });
});
