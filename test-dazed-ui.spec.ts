import { test } from '@playwright/test';

test('Capture Dazed UI for visual verification', async ({ page }) => {
  // Start game with Quinn
  await page.goto('http://localhost:3001/');
  await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
  await page.locator('[data-testid="hero-quinn"]').click();
  
  // Select default power cards
  await page.locator('[data-testid="power-card-select-dailyQuickStrike"]').click();
  await page.locator('[data-testid="power-card-select-utilityCarefulAttack"]').click();
  
  await page.locator('[data-testid="start-game-button"]').click();
  await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
  
  // Apply Dazed status to Quinn
  await page.evaluate(() => {
    const store = (window as any).__REDUX_STORE__;
    const state = store.getState();
    const heroId = state.game.heroHp[0].heroId;
    
    store.dispatch({
      type: 'game/applyHeroStatus',
      payload: {
        heroId: heroId,
        statusType: 'dazed',
        source: 'test-monster',
        duration: 2
      }
    });
  });
  
  // Wait a moment for UI to update
  await page.waitForTimeout(500);
  
  // Take screenshot showing Dazed warning
  await page.screenshot({ 
    path: '/home/runner/work/Ashardalon/Ashardalon/dazed-ui-before-action.png',
    fullPage: true
  });
  
  console.log('Screenshot saved: dazed-ui-before-action.png');
  
  // Take an action
  await page.evaluate(() => {
    const store = (window as any).__REDUX_STORE__;
    
    store.dispatch({
      type: 'game/setHeroTurnActions',
      payload: {
        actionsTaken: ['move'],
        canMove: false,
        canAttack: false
      }
    });
  });
  
  // Wait a moment for UI to update
  await page.waitForTimeout(500);
  
  // Take screenshot showing Dazed warning after action
  await page.screenshot({ 
    path: '/home/runner/work/Ashardalon/Ashardalon/dazed-ui-after-action.png',
    fullPage: true
  });
  
  console.log('Screenshot saved: dazed-ui-after-action.png');
});
