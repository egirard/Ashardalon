import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export interface ScreenshotOptions {
  fullPage?: boolean;
  programmaticCheck?: () => Promise<void>;
}

export interface ScreenshotHelper {
  capture(page: Page, description: string, options?: ScreenshotOptions): Promise<void>;
  reset(): void;
  getCounter(): number;
}

/**
 * Creates a screenshot helper for numbered screenshots in E2E tests.
 * Screenshots are captured after programmatic verification passes.
 */
export function createScreenshotHelper(): ScreenshotHelper {
  let counter = 0;

  return {
    async capture(page: Page, description: string, options: ScreenshotOptions = {}) {
      // Run programmatic verification first
      if (options.programmaticCheck) {
        await options.programmaticCheck();
      }

      // Format counter as 3-digit string
      const counterStr = counter.toString().padStart(3, '0');
      const screenshotName = `${counterStr}-${description}`;
      
      // Use Playwright's built-in screenshot comparison
      await expect(page).toHaveScreenshot(`${screenshotName}.png`, {
        fullPage: options.fullPage ?? false,
        animations: "disabled",
        timeout: 10000,
      });

      counter++;
    },

    reset() {
      counter = 0;
    },

    getCounter() {
      return counter;
    },
  };
}

/**
 * Default power card selections for each hero class.
 * These are used to quickly select power cards in tests that need to start the game.
 */
const DEFAULT_POWER_CARD_SELECTIONS: Record<string, { utility: number; atWills: number[]; daily: number }> = {
  quinn: { utility: 8, atWills: [2, 3], daily: 5 },      // Cleric
  vistra: { utility: 18, atWills: [12, 13], daily: 15 }, // Fighter
  keyleth: { utility: 28, atWills: [22, 23], daily: 25 }, // Paladin
  tarak: { utility: 38, atWills: [32, 33], daily: 35 },  // Rogue
  haskan: { utility: 48, atWills: [42, 43], daily: 45 }, // Wizard
};

/**
 * Selects default power cards for a hero in the character selection screen.
 * This is a helper function for E2E tests that need to start the game quickly.
 * 
 * Note: Power cards are automatically pre-selected when a hero is chosen.
 * This helper just opens the modal (to visually confirm) and closes it.
 */
export async function selectDefaultPowerCards(page: Page, heroId: string): Promise<void> {
  const selection = DEFAULT_POWER_CARD_SELECTIONS[heroId];
  if (!selection) {
    throw new Error(`No default power card selection for hero: ${heroId}`);
  }

  // Open power card selection modal
  await page.locator(`[data-testid="select-powers-${heroId}"]`).click();
  await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'visible' });

  // Power cards are automatically pre-selected when the hero is chosen
  // Just verify the Done button is enabled and close the modal
  await expect(page.locator('[data-testid="done-power-selection"]')).toBeEnabled();

  // Close modal
  await page.locator('[data-testid="done-power-selection"]').click();
  await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'hidden' });
}

/**
 * Dismisses the scenario introduction modal that appears after starting a game.
 * This should be called after clicking the start-game-button to ensure the game board is ready for testing.
 */
export async function dismissScenarioIntroduction(page: Page): Promise<void> {
  // Wait for the scenario introduction modal to appear
  const scenarioButton = page.locator('[data-testid="start-scenario-button"]');
  await scenarioButton.waitFor({ state: 'visible', timeout: 5000 });
  
  // Click the button to dismiss the modal
  await scenarioButton.click();
  
  // Wait for the modal to be hidden
  await scenarioButton.waitFor({ state: 'hidden', timeout: 5000 });
}
