import { test, expect } from '@playwright/test';
import { createScreenshotHelper, selectDefaultPowerCards, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('112 - Monster Attack Name Display', () => {
  test('Cultist combat result displays "Dagger" attack name not generic "Attack"', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Start game with Vistra (Fighter)
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="hero-vistra-left"]').click();
    await selectDefaultPowerCards(page, 'vistra');
    await setupDeterministicGame(page);

    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Disable animations for stable screenshots
    await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = '* { animation: none !important; transition: none !important; }';
      document.head.appendChild(style);
    });

    await screenshots.capture(page, 'game-started', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
      }
    });

    // STEP 2: Place a Cultist adjacent to Vistra and enter villain phase.
    // Clear the encounter deck so no encounter card is drawn during villain phase,
    // keeping the test focused solely on the monster attack dialog.
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;

      // Clear encounter deck to prevent encounter popup from overlapping combat result
      store.dispatch({ type: 'game/setEncounterDeck', payload: { drawPile: [], discardPile: [] } });

      // Move Vistra to centre of start tile
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'vistra', position: { x: 2, y: 3 } }
      });

      // Place Cultist immediately adjacent to Vistra
      store.dispatch({
        type: 'game/setMonsters',
        payload: [{
          monsterId: 'cultist',
          instanceId: 'cultist-test',
          position: { x: 2, y: 2 },
          currentHp: 2,
          controllerId: 'vistra',
          tileId: 'start-tile'
        }]
      });

      // Transition straight to villain phase
      store.dispatch({ type: 'game/endHeroPhase' });
      store.dispatch({ type: 'game/endExplorationPhase' });
    });

    await page.waitForTimeout(200);

    // Dismiss any encounter card that may have appeared despite cleared deck
    const encounterDismissButton = page.locator('[data-testid="dismiss-encounter-card"]');
    if (await encounterDismissButton.isVisible({ timeout: 500 }).catch(() => false)) {
      await encounterDismissButton.click();
      await page.waitForTimeout(100);
    }
    // Also dismiss any encounter result popup
    const encounterResultPopup = page.locator('[data-testid="encounter-result-popup"]');
    if (await encounterResultPopup.isVisible({ timeout: 500 }).catch(() => false)) {
      await page.locator('[data-testid="continue-button"]').click();
      await encounterResultPopup.waitFor({ state: 'hidden' });
    }

    await screenshots.capture(page, 'cultist-adjacent-villain-phase', {
      programmaticCheck: async () => {
        const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
        expect(state.game.turnState.currentPhase).toBe('villain-phase');
        expect(state.game.monsters.length).toBe(1);
        expect(state.game.monsters[0].monsterId).toBe('cultist');
      }
    });

    // STEP 3: Activate the Cultist – it is already adjacent so it will attack
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      // Use a seeded roll that guarantees a hit (roll ~0.7 → 15 + 6 = 21 > Vistra's AC 18)
      const origRandom = Math.random;
      Math.random = () => 0.7;
      store.dispatch({ type: 'game/activateNextMonster', payload: {} });
      Math.random = origRandom;
    });

    // Dismiss any encounter result popup before verifying combat result
    if (await encounterResultPopup.isVisible({ timeout: 500 }).catch(() => false)) {
      await page.locator('[data-testid="continue-button"]').click();
      await encounterResultPopup.waitFor({ state: 'hidden' });
    }

    // Wait for the combat result dialog to appear
    await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });

    // STEP 4: Verify the attacker-info line reads "Cultist attacks with Dagger!"
    await expect(page.locator('[data-testid="attacker-info"]')).toContainText('Cultist attacks with Dagger!');
    // Also confirm the old generic text is NOT present
    await expect(page.locator('[data-testid="attacker-info"]')).not.toContainText('attacks with Attack!');

    await screenshots.capture(page, 'cultist-attacks-with-dagger', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="combat-result"]')).toBeVisible();
        await expect(page.locator('[data-testid="attacker-info"]')).toContainText('Cultist attacks with Dagger!');
      }
    });

    // STEP 5: Dismiss the combat result and verify state cleared
    await page.locator('[data-testid="dismiss-combat-result"]').click();
    await expect(page.locator('[data-testid="combat-result"]')).not.toBeVisible();

    const finalState = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
    expect(finalState.game.monsterAttackResult).toBeNull();
    expect(finalState.game.monsterAttackName).toBeNull();
  });
});
