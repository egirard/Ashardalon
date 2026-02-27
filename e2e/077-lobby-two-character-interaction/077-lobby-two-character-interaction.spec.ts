import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from '../helpers/screenshot-helper';

test.describe('077 - Lobby Scenario Book & Two Character Interaction', () => {
  test('scenario book navigation, choose-hero label, two character panels, power selection', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'character-selection-initial', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="character-select"]')).toBeVisible();

        // Scenario book is shown in the center
        await expect(page.locator('[data-testid="scenario-book"]')).toBeVisible();
        await expect(page.locator('[data-testid="scenario-book-title"]')).toContainText('Into the Mountain');
        await expect(page.locator('[data-testid="scenario-book-goal"]')).toContainText('Defeat 12 monsters');
        await expect(page.locator('[data-testid="scenario-book-villain"]')).toContainText('Ashardalon');

        // Navigation: prev disabled, next enabled on first page
        await expect(page.locator('[data-testid="scenario-prev"]')).toBeDisabled();
        await expect(page.locator('[data-testid="scenario-next"]')).toBeEnabled();

        // Start button disabled (no heroes selected)
        await expect(page.locator('[data-testid="start-game-button"]')).toBeDisabled();

        // "Choose your hero" shown on all four edges
        const labels = page.locator('.choose-hero-label');
        await expect(labels).toHaveCount(4);
      }
    });

    // STEP 2: Navigate to Adventure 14
    await page.locator('[data-testid="scenario-next"]').click();
    await expect(page.locator('[data-testid="scenario-book-title"]')).toContainText('Adventure 14');

    await screenshots.capture(page, 'scenario-adventure-14', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="scenario-book-title"]')).toContainText('Adventure 14');
        await expect(page.locator('[data-testid="scenario-book-villain"]')).toContainText('Malphas');
        await expect(page.locator('[data-testid="scenario-prev"]')).toBeEnabled();
        await expect(page.locator('[data-testid="scenario-next"]')).toBeEnabled();

        // Verify Redux store has the right selected scenario
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.selectedScenarioId).toBe('adventure-14');
      }
    });

    // STEP 3: Navigate to Adventure 15 (last page)
    await page.locator('[data-testid="scenario-next"]').click();
    await expect(page.locator('[data-testid="scenario-book-title"]')).toContainText('Adventure 15');

    await screenshots.capture(page, 'scenario-adventure-15', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="scenario-book-title"]')).toContainText('Adventure 15');
        await expect(page.locator('[data-testid="scenario-book-villain"]')).toContainText('Vraxos');
        // On last page, next disabled
        await expect(page.locator('[data-testid="scenario-next"]')).toBeDisabled();
        await expect(page.locator('[data-testid="scenario-prev"]')).toBeEnabled();
      }
    });

    // STEP 4: Navigate back to default scenario
    await page.locator('[data-testid="scenario-prev"]').click();
    await page.locator('[data-testid="scenario-prev"]').click();
    await expect(page.locator('[data-testid="scenario-book-title"]')).toContainText('Into the Mountain');

    // STEP 5: Select a hero from the bottom edge, verify "Choose your hero" label disappears
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    await page.locator('[data-testid="select-powers-quinn"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'hero-selected-label-hidden', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="selected-count"]')).toContainText('1 heroes selected');

        // "Choose your hero" label is GONE on the bottom edge (hero selected there)
        // The bottom edge's hero-row-container should NOT have the label
        const bottomEdge = page.locator('[data-testid="edge-bottom"] .choose-hero-label');
        await expect(bottomEdge).toHaveCount(0);

        // Other edges still show their labels
        await expect(page.locator('[data-testid="edge-top"] .choose-hero-label')).toBeVisible();
        await expect(page.locator('[data-testid="edge-left"] .choose-hero-label')).toBeVisible();
        await expect(page.locator('[data-testid="edge-right"] .choose-hero-label')).toBeVisible();

        // Start button is now enabled (1 hero with full powers)
        await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled();
      }
    });

    // STEP 6: Select a second hero from the bottom edge (Vistra)
    await page.locator('[data-testid="hero-vistra-bottom"]').click();
    await page.locator('[data-testid="duplicate-panel-vistra-right"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'two-heroes-selected', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="selected-count"]')).toContainText('2 heroes selected');

        // Duplicate panels exist
        await expect(page.locator('[data-testid="duplicate-panel-quinn-left"]')).toBeVisible();
        await expect(page.locator('[data-testid="duplicate-panel-vistra-right"]')).toBeVisible();

        // Third hero is disabled
        await expect(page.locator('[data-testid="hero-keyleth-bottom"]')).toBeDisabled();
        await expect(page.locator('[data-testid="hero-tarak-bottom"]')).toBeDisabled();
        await expect(page.locator('[data-testid="hero-haskan-bottom"]')).toBeDisabled();
      }
    });

    // STEP 7: Open and close power modal from panel
    await page.locator('[data-testid="power-button-quinn-left"]').click();
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'power-modal-opened', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="power-card-selection"]')).toBeVisible();
      }
    });

    await page.locator('[data-testid="close-power-selection"]').click();
    await page.locator('[data-testid="power-card-selection"]').waitFor({ state: 'hidden' });

    // STEP 8: Deselect Quinn via duplicate panel
    await page.locator('[data-testid="deselect-quinn-left"]').click();
    await page.locator('[data-testid="duplicate-panel-vistra-right"]').waitFor({ state: 'hidden' });

    await screenshots.capture(page, 'hero-deselected', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="selected-count"]')).toContainText('1 heroes selected');

        // No more duplicate panels
        await expect(page.locator('[data-testid^="duplicate-panel-"]')).toHaveCount(0);

        // Quinn is available again; other heroes re-enabled
        await expect(page.locator('[data-testid="hero-quinn-bottom"]')).toBeEnabled();
        await expect(page.locator('[data-testid="hero-keyleth-bottom"]')).toBeEnabled();
      }
    });
  });
});
