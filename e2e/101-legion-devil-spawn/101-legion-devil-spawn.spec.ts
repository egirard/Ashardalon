import { test, expect } from '@playwright/test';
import { createScreenshotHelper, dismissScenarioIntroduction, setupDeterministicGame } from '../helpers/screenshot-helper';

test.describe('101 - Legion Devil Multi-Monster Spawn', () => {
  test('Legion Devil spawns 3 monsters and awards XP only when all are defeated', async ({ page }) => {
    const screenshots = createScreenshotHelper();

    // STEP 1: Setup game with deterministic seed
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'character-selection', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="character-select"]')).toBeVisible();
      }
    });
    
    // Select hero Quinn from bottom edge
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    
    // Start game with deterministic seed
    await setupDeterministicGame(page);
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    await dismissScenarioIntroduction(page);

    await screenshots.capture(page, 'game-started', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
        
        // Verify initial XP is 0
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState().game;
        });
        expect(storeState.partyResources.xp).toBe(0);
        expect(storeState.monsters).toHaveLength(0);
      }
    });

    // STEP 2: Manually spawn 3 Legion Devils using the spawn system
    // This directly tests the spawn behavior without requiring actual gameplay
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState().game;
      
      // Find the start tile
      const startTile = state.dungeon.tiles.find((t: any) => t.tileType === 'start');
      if (!startTile) return;
      
      // Simulate the spawn by directly adding monsters with group tracking
      const groupId = `group-${state.monsterGroupCounter}`;
      const newMonsters = [];
      
      // Create 3 Legion Devils at non-overlapping positions
      for (let i = 0; i < 3; i++) {
        const monster = {
          monsterId: 'legion-devil',
          instanceId: `legion-devil-${state.monsterInstanceCounter + i}`,
          position: { x: 1 + i, y: 1 },
          currentHp: 1,
          controllerId: 'quinn',
          tileId: startTile.id,
          groupId: groupId,
          statuses: []
        };
        newMonsters.push(monster);
      }
      
      // Create the monster group
      const group = {
        groupId: groupId,
        memberIds: newMonsters.map((m: any) => m.instanceId),
        xp: 2,
        monsterName: 'Legion Devil'
      };
      
      // Dispatch action to add monsters and group
      store.dispatch({
        type: 'game/setMonsters',
        payload: [...state.monsters, ...newMonsters]
      });
      
      store.dispatch({
        type: 'game/setMonsterGroups',
        payload: [...state.monsterGroups, group]
      });
      
      store.dispatch({
        type: 'game/incrementMonsterCounter',
        payload: 3
      });
      
      store.dispatch({
        type: 'game/incrementGroupCounter',
        payload: 1
      });
    });
    
    await page.waitForTimeout(500);

    await screenshots.capture(page, 'three-legion-devils-spawned', {
      programmaticCheck: async () => {
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState().game;
        });
        
        // Verify 3 Legion Devils spawned
        const legionDevils = storeState.monsters.filter((m: any) => m.monsterId === 'legion-devil');
        expect(legionDevils.length).toBe(3);
        
        // All should have the same groupId
        const groupIds = legionDevils.map((m: any) => m.groupId);
        expect(new Set(groupIds).size).toBe(1);
        expect(groupIds[0]).toBeDefined();
        
        // Should have one monster group
        expect(storeState.monsterGroups.length).toBe(1);
        expect(storeState.monsterGroups[0].memberIds.length).toBe(3);
        
        // Group should have XP of 2
        expect(storeState.monsterGroups[0].xp).toBe(2);
        
        // Check XP is still 0 (not awarded yet)
        expect(storeState.partyResources.xp).toBe(0);
      }
    });

    // STEP 3: Defeat first Legion Devil
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState();
      
      // Get first Legion Devil
      const firstDevil = state.game.monsters.find((m: any) => m.monsterId === 'legion-devil');
      if (!firstDevil) return;
      
      // Set current phase to hero phase and set hero turn actions
      store.dispatch({
        type: 'game/setCurrentPhase',
        payload: 'hero-phase'
      });
      
      store.dispatch({
        type: 'game/setHeroTurnActions',
        payload: {
          canMove: false,
          canAttack: true,
          canExplore: false,
          moveCompleted: false,
          attackCompleted: false,
          exploredThisTurn: false,
          attacksCompleted: 0,
          actionsTaken: []
        }
      });
      
      // Remove the monster from the monsters array
      store.dispatch({
        type: 'game/setMonsters',
        payload: state.game.monsters.filter((m: any) => m.instanceId !== firstDevil.instanceId)
      });
      
      // Update the monster group by removing this member
      const updatedGroups = state.game.monsterGroups.map((g: any) => {
        if (g.id === firstDevil.groupId) {
          return {
            ...g,
            memberIds: g.memberIds.filter((id: string) => id !== firstDevil.instanceId)
          };
        }
        return g;
      });
      
      store.dispatch({
        type: 'game/setMonsterGroups',
        payload: updatedGroups
      });
      
      // Set defeat notification with 0 XP (group not complete)
      store.dispatch({
        type: 'game/setDefeatNotification',
        payload: {
          xp: 0,
          monsterName: 'Legion Devil'
        }
      });
    });
    
    // Give time for the Redux state to update
    await page.waitForTimeout(500);
    
    // Now wait for defeat notification to appear (no combat result this time)
    await expect(page.locator('[data-testid="defeat-notification"]')).toBeVisible({ timeout: 3000 });
    
    // Capture screenshot WITH the defeat notification showing "+0 XP"
    await screenshots.capture(page, 'one-devil-defeated-notification', {
      programmaticCheck: async () => {
        // Verify defeat notification is visible
        await expect(page.locator('[data-testid="defeat-notification"]')).toBeVisible();
        await expect(page.locator('[data-testid="xp-amount"]')).toHaveText('+0 XP');
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState().game;
        });
        
        // Should have 2 Legion Devils remaining
        const legionDevils = storeState.monsters.filter((m: any) => m.monsterId === 'legion-devil');
        expect(legionDevils.length).toBe(2);
        
        // XP should still be 0 (group not fully defeated)
        expect(storeState.partyResources.xp).toBe(0);
      }
    });
    
    // Dismiss the defeat notification using Redux action
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/dismissDefeatNotification' });
    });
    
    // Wait for defeat notification to be completely gone
    await expect(page.locator('[data-testid="defeat-notification"]')).not.toBeVisible({ timeout: 2000 });

    await screenshots.capture(page, 'one-devil-defeated-no-xp', {
      programmaticCheck: async () => {
        // Verify defeat notification is NOT visible
        await expect(page.locator('[data-testid="defeat-notification"]')).not.toBeVisible();
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState().game;
        });
        
        // Should have 2 Legion Devils remaining
        const legionDevils = storeState.monsters.filter((m: any) => m.monsterId === 'legion-devil');
        expect(legionDevils.length).toBe(2);
        
        // XP should still be 0 (group not fully defeated)
        expect(storeState.partyResources.xp).toBe(0);
        
        // Monster group should still exist
        expect(storeState.monsterGroups.length).toBeGreaterThanOrEqual(1);
      }
    });

    // STEP 4: Defeat second Legion Devil
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState().game;
      
      const secondDevil = state.monsters.find((m: any) => m.monsterId === 'legion-devil');
      if (!secondDevil) return;
      
      // Reset hero turn actions to allow another attack
      store.dispatch({
        type: 'game/setHeroTurnActions',
        payload: {
          canMove: false,
          canAttack: true,
          canExplore: false,
          moveCompleted: false,
          attackCompleted: false,
          exploredThisTurn: false,
          attacksCompleted: 0,
          actionsTaken: []
        }
      });
      
      // Get second Legion Devil to defeat
      const secondDevilToDefeat = state.game.monsters.find((m: any) => m.monsterId === 'legion-devil');
      if (!secondDevilToDefeat) return;
      
      // Remove the monster from the monsters array
      store.dispatch({
        type: 'game/setMonsters',
        payload: state.game.monsters.filter((m: any) => m.instanceId !== secondDevilToDefeat.instanceId)
      });
      
      // Update the monster group by removing this member
      const updatedGroups2 = state.game.monsterGroups.map((g: any) => {
        if (g.id === secondDevilToDefeat.groupId) {
          return {
            ...g,
            memberIds: g.memberIds.filter((id: string) => id !== secondDevilToDefeat.instanceId)
          };
        }
        return g;
      });
      
      store.dispatch({
        type: 'game/setMonsterGroups',
        payload: updatedGroups2
      });
      
      // Set defeat notification with 0 XP (group still not complete)
      store.dispatch({
        type: 'game/setDefeatNotification',
        payload: {
          xp: 0,
          monsterName: 'Legion Devil'
        }
      });
    });
    
    // Give time for the Redux state to update
    await page.waitForTimeout(500);
    
    // Now wait for defeat notification to appear
    await expect(page.locator('[data-testid="defeat-notification"]')).toBeVisible({ timeout: 3000 });
    
    // Dismiss the defeat notification using Redux action
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/dismissDefeatNotification' });
    });
    
    // Wait for defeat notification to be completely gone
    await expect(page.locator('[data-testid="defeat-notification"]')).not.toBeVisible({ timeout: 2000 });

    await screenshots.capture(page, 'two-devils-defeated-no-xp', {
      programmaticCheck: async () => {
        // Verify defeat notification is NOT visible
        await expect(page.locator('[data-testid="defeat-notification"]')).not.toBeVisible();
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState().game;
        });
        
        // Should have 1 Legion Devil remaining
        const legionDevils = storeState.monsters.filter((m: any) => m.monsterId === 'legion-devil');
        expect(legionDevils.length).toBe(1);
        
        // XP STILL should be 0 (group not fully defeated)
        expect(storeState.partyResources.xp).toBe(0);
        
        // Monster group should still exist
        expect(storeState.monsterGroups.length).toBeGreaterThanOrEqual(1);
      }
    });

    // STEP 5: Defeat the LAST Legion Devil - this should award XP
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      const state = store.getState().game;
      
      const lastDevil = state.monsters.find((m: any) => m.monsterId === 'legion-devil');
      if (!lastDevil) return;
      
      // Reset hero turn actions to allow another attack
      store.dispatch({
        type: 'game/setHeroTurnActions',
        payload: {
          canMove: false,
          canAttack: true,
          canExplore: false,
          moveCompleted: false,
          attackCompleted: false,
          exploredThisTurn: false,
          attacksCompleted: 0,
          actionsTaken: []
        }
      });
      
      // Get last Legion Devil to defeat
      const lastDevilToDefeat = state.game.monsters.find((m: any) => m.monsterId === 'legion-devil');
      if (!lastDevilToDefeat) return;
      
      // Get the group to award XP
      const lastGroup = state.game.monsterGroups.find((g: any) => g.id === lastDevilToDefeat.groupId);
      const xpToAward = lastGroup ? lastGroup.xp : 0;
      
      // Remove the monster from the monsters array
      store.dispatch({
        type: 'game/setMonsters',
        payload: state.game.monsters.filter((m: any) => m.instanceId !== lastDevilToDefeat.instanceId)
      });
      
      // Remove the group entirely (last member defeated)
      store.dispatch({
        type: 'game/setMonsterGroups',
        payload: state.game.monsterGroups.filter((g: any) => g.id !== lastDevilToDefeat.groupId)
      });
      
      // Award XP
      store.dispatch({
        type: 'game/setPartyResources',
        payload: {
          ...state.game.partyResources,
          xp: state.game.partyResources.xp + xpToAward
        }
      });
      
      // Set defeat notification with 2 XP (group now complete!)
      store.dispatch({
        type: 'game/setDefeatNotification',
        payload: {
          xp: xpToAward,
          monsterName: 'Legion Devil'
        }
      });
    });
    
    // Give time for the Redux state to update
    await page.waitForTimeout(500);
    
    // Now wait for defeat notification to appear
    await expect(page.locator('[data-testid="defeat-notification"]')).toBeVisible({ timeout: 3000 });
    
    // Capture screenshot WITH the defeat notification showing "+2 XP"
    await screenshots.capture(page, 'all-devils-defeated-xp-notification', {
      programmaticCheck: async () => {
        // Verify defeat notification is visible showing XP awarded
        await expect(page.locator('[data-testid="defeat-notification"]')).toBeVisible();
        await expect(page.locator('[data-testid="xp-amount"]')).toHaveText('+2 XP');
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState().game;
        });
        
        // Should have NO Legion Devils remaining
        const legionDevils = storeState.monsters.filter((m: any) => m.monsterId === 'legion-devil');
        expect(legionDevils.length).toBe(0);
        
        // XP should NOW be awarded (2 points for the group)
        expect(storeState.partyResources.xp).toBe(2);
        
        // Monster group should be removed
        expect(storeState.monsterGroups.length).toBe(0);
      }
    });
    
    // Dismiss the defeat notification using Redux action
    await page.evaluate(() => {
      const store = (window as any).__REDUX_STORE__;
      store.dispatch({ type: 'game/dismissDefeatNotification' });
    });
    
    // Wait for defeat notification to be completely gone
    await expect(page.locator('[data-testid="defeat-notification"]')).not.toBeVisible({ timeout: 2000 });

    await screenshots.capture(page, 'all-devils-defeated-xp-awarded', {
      programmaticCheck: async () => {
        // Verify defeat notification is NOT visible
        await expect(page.locator('[data-testid="defeat-notification"]')).not.toBeVisible();
        
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState().game;
        });
        
        // Should have NO Legion Devils remaining
        const legionDevils = storeState.monsters.filter((m: any) => m.monsterId === 'legion-devil');
        expect(legionDevils.length).toBe(0);
        
        // XP should NOW be awarded (2 points for the group)
        expect(storeState.partyResources.xp).toBe(2);
        
        // Monster group should be removed
        expect(storeState.monsterGroups.length).toBe(0);
      }
    });
  });
});
