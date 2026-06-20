import { test, expect } from '@playwright/test';
import {
  createScreenshotHelper,
  selectDefaultPowerCards,
  dismissScenarioIntroduction,
  setupDeterministicGame,
  disableAnimations,
} from '../helpers/screenshot-helper';

test.describe('122 - Valiant Strike Adjacent Bonus', () => {
  test('Keyleth sees and uses the scaled Valiant Strike attack bonus when surrounded', async ({ page }) => {
    const screenshots = createScreenshotHelper({ defaultMaxDiffPixels: 0 });

    // STEP 1: Select Keyleth from the bottom edge and start a deterministic game
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-keyleth-bottom"]').click();
    await selectDefaultPowerCards(page, 'keyleth');

    await screenshots.capture(page, 'hero-selected', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="hero-keyleth-bottom"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled();
      }
    });

    await setupDeterministicGame(page);
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);
    await disableAnimations(page);

    // STEP 2: Give Keyleth Valiant Strike and surround the hero with two adjacent monsters
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      const startTileId = state.game.dungeon.tiles.find((tile: any) => tile.tileType === 'start')?.id ?? state.game.dungeon.tiles[0]?.id;

      store.dispatch({
        type: 'heroes/setHeroPowerCards',
        payload: {
          heroId: 'keyleth',
          powerCards: {
            utility: 21,
            atWills: [22, 24],
            daily: 27,
          },
        },
      });

      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'keyleth', position: { x: 2, y: 3 } },
      });

      store.dispatch({ type: 'game/hideMovement' });

      store.dispatch({
        type: 'game/setMonsters',
        payload: [
          {
            monsterId: 'orc-archer',
            instanceId: 'valiant-orc-archer',
            position: { x: 2, y: 2 },
            currentHp: 1,
            controllerId: 'keyleth',
            tileId: startTileId,
          },
          {
            monsterId: 'kobold',
            instanceId: 'valiant-kobold',
            position: { x: 3, y: 3 },
            currentHp: 1,
            controllerId: 'keyleth',
            tileId: startTileId,
          },
        ],
      });
    });

    await expect(async () => {
      const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
      expect(state.heroes.heroPowerCards.keyleth.atWills).toEqual(expect.arrayContaining([22, 24]));
      expect(state.game.monsters.map((monster: any) => monster.instanceId)).toEqual(['valiant-orc-archer', 'valiant-kobold']);
      expect(state.game.heroTokens.find((token: any) => token.heroId === 'keyleth')?.position).toEqual({ x: 2, y: 3 });
    }).toPass();

    await page.locator('[data-testid="power-card-24"]').click();
    await page.locator('[data-testid="power-card-details-panel"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="attack-card-expanded-24"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'valiant-strike-bonus-scaled', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        const hero = state.game.heroTokens.find((token: any) => token.heroId === 'keyleth');
        const adjacentMonsterCount = state.game.monsters.filter((monster: any) => {
          return Math.max(
            Math.abs(monster.position.x - hero.position.x),
            Math.abs(monster.position.y - hero.position.y)
          ) === 1;
        }).length;

        expect(adjacentMonsterCount).toBe(2);
        await expect(page.locator('[data-testid="power-card-24"] .attack-bonus-mini')).toHaveText('+10');
        await expect(page.locator('[data-testid="attack-card-expanded-24"]')).toContainText('Bonus: +10');
        await expect(page.locator('[data-testid="power-card-details-panel"]')).toContainText('Attack Bonus: +10');
        await expect(page.locator('[data-testid="attack-target-valiant-orc-archer"]')).toBeVisible();
        await expect(page.locator('[data-testid="attack-target-valiant-kobold"]')).toBeVisible();
      }
    });

    // STEP 3: Attack one of the adjacent monsters and verify the combat result uses the same bonus
    await page.evaluate(() => {
      (window as any).__originalRandom = Math.random;
      Math.random = () => 0.7; // Roll 15
    });

    await page.locator('[data-testid="attack-target-valiant-orc-archer"]').click();

    await page.evaluate(() => {
      if ((window as any).__originalRandom) {
        Math.random = (window as any).__originalRandom;
      }
    });

    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'valiant-strike-attack-result', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="result-text"]')).toContainText('HIT');
        await expect(page.locator('[data-testid="dice-roll"]')).toHaveText('15');
        await expect(page.locator('[data-testid="attack-bonus"]')).toHaveText('10');
        await expect(page.locator('[data-testid="attack-total"]')).toHaveText('25');

        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.attackResult).not.toBeNull();
        expect(state.game.attackResult.attackBonus).toBe(10);
        expect(state.game.attackResult.total).toBe(25);
      }
    });
  });
});
