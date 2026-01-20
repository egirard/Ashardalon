import { test, expect } from '@playwright/test';
import { createScreenshotHelper, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('090 - Player Log Viewer', () => {
  test('player can view game log with "Game Started" entry', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Navigate to character selection screen
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    // Wait for hero cards to be rendered
    await page.locator('[data-testid="hero-quinn-bottom"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'character-selection', {
      programmaticCheck: async () => {
        // Verify character selection screen is visible
        await expect(page.locator('[data-testid="character-select"]')).toBeVisible();
        await expect(page.locator('[data-testid="start-game-button"]')).toBeDisabled();
        // Verify hero cards are visible
        await expect(page.locator('[data-testid="hero-quinn-bottom"]')).toBeVisible();
        await expect(page.locator('[data-testid="hero-vistra-bottom"]')).toBeVisible();
      }
    });

    // STEP 2: Select two heroes from the bottom edge
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    
    // Wait for first selection to be processed
    await expect(page.locator('[data-testid="selected-count"]')).toContainText('1 hero');
    
    await page.locator('[data-testid="hero-vistra-bottom"]').click();
    
    // Wait for second selection to be processed
    await expect(page.locator('[data-testid="selected-count"]')).toContainText('2 heroes selected');

    await screenshots.capture(page, 'heroes-selected', {
      programmaticCheck: async () => {
        // Verify selected count shows 2
        await expect(page.locator('[data-testid="selected-count"]')).toContainText('2 heroes selected');
        
        // Verify start button is enabled
        await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled();
      }
    });

    // STEP 3: Start the game
    await setupDeterministicGame(page);
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    // Set deterministic positions for both heroes
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'quinn', position: { x: 3, y: 2 } }
      });
      store.dispatch({
        type: 'game/setHeroPosition',
        payload: { heroId: 'vistra', position: { x: 3, y: 4 } }
      });
    });

    // Wait for positions to be applied
    await expect(async () => {
      const storeState = await page.evaluate(() => {
        return (window as any).__REDUX_STORE__.getState();
      });
      expect(storeState.game.heroTokens[0].position).toEqual({ x: 3, y: 2 });
      expect(storeState.game.heroTokens[1].position).toEqual({ x: 3, y: 4 });
    }).toPass();

    // Hide movement overlay for stable screenshot
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/hideMovement' });
    });

    await page.waitForFunction(() => {
      const buttons = document.querySelectorAll('[data-testid^="move-to-"]');
      return buttons.length === 0;
    });

    await screenshots.capture(page, 'game-board', {
      programmaticCheck: async () => {
        // Verify game board is visible with both player cards
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
        
        // Verify active player card (Quinn) is visible with turn-indicator test ID
        await expect(page.locator('[data-testid="turn-indicator"]')).toBeVisible();
        
        // Verify second player card (Vistra) is visible
        await expect(page.locator('[data-testid="player-dashboard-vistra"]')).toBeVisible();
        
        // Verify log button is visible on active player card
        await expect(page.locator('[data-testid="turn-indicator"] [data-testid="view-log-button"]')).toBeVisible();
        
        // Verify Redux store has log entries
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.game.logEntries).toBeDefined();
        expect(storeState.game.logEntries.length).toBeGreaterThan(0);
        expect(storeState.game.logEntries[0].type).toBe('game-event');
        expect(storeState.game.logEntries[0].message).toContain('Game Started');
      }
    });

    // STEP 4: Click the log button on Quinn's player card
    await page.locator('[data-testid="turn-indicator"] [data-testid="view-log-button"]').click();

    // Wait for log viewer to be visible
    await page.locator('[data-testid="log-entries"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'log-viewer-opened', {
      programmaticCheck: async () => {
        // Verify log viewer is open
        await expect(page.locator('[data-testid="log-entries"]')).toBeVisible();
        
        // Verify log entries are displayed
        const logEntries = page.locator('[data-testid="log-entry"]');
        await expect(logEntries).toHaveCount(1);
        
        // Verify "Game Started" entry is visible
        const firstEntry = logEntries.first();
        await expect(firstEntry).toContainText('Game Started');
        await expect(firstEntry).toContainText('2 heroes begin their adventure');
        
        // Verify timestamp is displayed
        const timestamp = firstEntry.locator('.log-timestamp');
        await expect(timestamp).toBeVisible();
        
        // Verify game-event icon is displayed
        const icon = firstEntry.locator('.log-type-icon');
        await expect(icon).toBeVisible();
        await expect(icon).toContainText('🎮');
        
        // Verify entry count footer
        await expect(page.getByText('1 entry')).toBeVisible();
      }
    });

    // STEP 5: Close the log viewer
    await page.locator('button[aria-label="Close log"]').click();

    // Wait for log viewer to be hidden
    await page.locator('[data-testid="log-entries"]').waitFor({ state: 'hidden' });

    await screenshots.capture(page, 'log-viewer-closed', {
      programmaticCheck: async () => {
        // Verify log viewer is closed
        await expect(page.locator('[data-testid="log-entries"]')).not.toBeVisible();
        
        // Verify game board is still visible
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
        
        // Verify log button is still available
        await expect(page.locator('[data-testid="turn-indicator"] [data-testid="view-log-button"]')).toBeVisible();
      }
    });

    // STEP 6: Open log viewer from Vistra's player card
    await page.locator('[data-testid="player-dashboard-vistra"] [data-testid="view-log-button"]').click();
    await page.locator('[data-testid="log-entries"]').waitFor({ state: 'visible' });

    await screenshots.capture(page, 'log-viewer-from-second-player', {
      programmaticCheck: async () => {
        // Verify log viewer is open from second player card
        await expect(page.locator('[data-testid="log-entries"]')).toBeVisible();
        
        // Verify same log entry is visible (shared log)
        const logEntries = page.locator('[data-testid="log-entry"]');
        await expect(logEntries).toHaveCount(1);
        await expect(logEntries.first()).toContainText('Game Started');
        
        // Verify entry count matches
        await expect(page.getByText('1 entry')).toBeVisible();
      }
    });
  });
});
