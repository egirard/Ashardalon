# Manual Testing Guide: High Alert Environment Card

This document provides detailed instructions for manually testing the "High Alert" environment card implementation.

## Overview

**High Alert** is an environment card that requires the active hero to pass one monster card to the player on their right at the end of each Villain Phase.

## Prerequisites

- Game must be running (development server or built version)
- Access to browser developer console for Redux DevTools (optional but recommended)
- Understanding of game phases: Hero Phase → Exploration Phase → Villain Phase → (cycle repeats)

## Test Scenarios

### Scenario 1: Basic Multiplayer Monster Passing

**Goal**: Verify that one monster is passed from the active hero to the next hero in turn order.

**Setup**:
1. Start a new game with 2 heroes (e.g., Quinn and Vistra)
2. Draw the "High Alert" encounter card during Villain Phase
   - This can be done by:
     - Playing normally until you draw it, OR
     - Using Redux DevTools to manually set `activeEnvironmentId: 'high-alert'` in game state
3. Ensure Quinn (first hero) controls at least one monster

**Test Steps**:
1. Note which monsters Quinn controls (check the monster markers on the board)
2. Complete Quinn's turn through all phases until the end of Villain Phase
3. Click "End Villain Phase" button

**Expected Results**:
- One of Quinn's monsters should now be controlled by Vistra
- A notification message should appear: "High Alert: quinn passes {MonsterName} to vistra"
- The monster marker color/indicator should update to show Vistra controls it
- During Vistra's Villain Phase, the passed monster should activate for Vistra

**How to Verify**:
- Open Redux DevTools and inspect the `monsters` array in game state
- Find the monster that was passed and verify its `controllerId` changed from `'quinn'` to `'vistra'`
- During Vistra's Villain Phase, verify the passed monster activates and moves/attacks

---

### Scenario 2: Passing Multiple Monsters (Only One Passes)

**Goal**: Verify that only ONE monster is passed even if the active hero controls multiple monsters.

**Setup**:
1. Start a new game with 2 heroes (Quinn and Vistra)
2. Activate High Alert environment
3. Ensure Quinn controls multiple monsters (3+)

**Test Steps**:
1. Count how many monsters Quinn controls before ending Villain Phase
2. End Quinn's Villain Phase

**Expected Results**:
- Only ONE monster should be passed to Vistra
- Quinn should still control the remaining monsters
- The notification message should specify which monster was passed

**How to Verify**:
- Use Redux DevTools to count monsters before and after:
  - Before: `state.monsters.filter(m => m.controllerId === 'quinn').length` should be 3+
  - After: Quinn should have 2+ monsters, Vistra should have gained 1 monster

---

### Scenario 3: Last Player Wraps to First Player

**Goal**: Verify that when the last player in turn order passes a monster, it goes to the first player.

**Setup**:
1. Start a new game with 3 heroes (Quinn, Vistra, Keyleth)
2. Activate High Alert environment
3. Ensure Keyleth (third hero) controls at least one monster

**Test Steps**:
1. Play through Quinn and Vistra's turns
2. During Keyleth's turn, end her Villain Phase

**Expected Results**:
- Keyleth's monster should be passed to Quinn (wrapping around)
- Notification: "High Alert: keyleth passes {MonsterName} to quinn"
- Quinn should gain control of the monster

---

### Scenario 4: Solo Player (No Passing)

**Goal**: Verify that High Alert does not attempt to pass monsters when only one hero is playing.

**Setup**:
1. Start a new game with 1 hero (Quinn)
2. Activate High Alert environment
3. Ensure Quinn controls at least one monster

**Test Steps**:
1. Note which monsters Quinn controls
2. End Quinn's Villain Phase

**Expected Results**:
- Quinn should still control all monsters (no passing occurs)
- No "High Alert" notification message should appear
- Game should continue normally

**How to Verify**:
- Use Redux DevTools to verify all monsters still have `controllerId: 'quinn'`
- Verify no error messages in browser console

---

### Scenario 5: Active Hero Has No Monsters

**Goal**: Verify that the game does not crash or error when the active hero has no monsters to pass.

**Setup**:
1. Start a new game with 2 heroes (Quinn and Vistra)
2. Activate High Alert environment
3. Ensure Quinn has NO monsters (all monsters controlled by Vistra or none exist)

**Test Steps**:
1. Verify Quinn has no monsters
2. End Quinn's Villain Phase

**Expected Results**:
- No monsters should be passed
- No "High Alert" notification message should appear
- Game should continue normally to Vistra's turn
- No errors in browser console

---

### Scenario 6: Environment Not Active

**Goal**: Verify that no monster passing occurs when High Alert is not the active environment.

**Setup**:
1. Start a new game with 2 heroes (Quinn and Vistra)
2. Do NOT activate High Alert (use a different environment or no environment)
3. Ensure Quinn controls at least one monster

**Test Steps**:
1. Note which monsters Quinn controls
2. End Quinn's Villain Phase

**Expected Results**:
- Quinn should still control all monsters (no passing)
- No "High Alert" notification should appear
- Game continues normally

---

## Advanced Testing with Redux DevTools

### Manually Activate High Alert

If you want to test High Alert without waiting to draw it:

1. Open Redux DevTools (browser extension required)
2. Go to the "State" tab
3. Find and edit `activeEnvironmentId` to `'high-alert'`
4. The environment should now be active

### Manually Add Monsters

To quickly add monsters for testing:

1. Open Redux DevTools
2. Go to the "Dispatch" tab  
3. Use the `setMonsters` action to add a monster. Note that this replaces all monsters, so you need to include existing monsters:
   ```javascript
   {
     type: 'game/setMonsters',
     payload: [
       {
         monsterId: 'kobold',
         instanceId: 'test-kobold-1',
         position: { x: 3, y: 2 },
         currentHp: 1,
         controllerId: 'quinn',
         tileId: 'start-tile'
       }
     ]
   }
   ```
   *Note: This will replace all existing monsters. To add a monster without removing others, first inspect the current `state.monsters` array and include those in the payload.*

### Verify Monster Controller

To check which hero controls a specific monster:

1. Open Redux DevTools
2. Go to the "State" tab
3. Navigate to `state.monsters`
4. Find the monster by `instanceId`
5. Check its `controllerId` field

---

## Troubleshooting

### Issue: Monster not passing

**Possible causes**:
- Only one hero in the game (solo play)
- Active hero has no monsters to pass
- High Alert is not the active environment
- Currently not in Villain Phase

**Solution**: Verify game state using Redux DevTools.

### Issue: Multiple monsters passing

**Possible causes**:
- Bug in implementation (should only pass one monster)

**Solution**: Report issue with Redux state snapshot.

### Issue: Notification not appearing

**Possible causes**:
- Another notification is displayed at the same time
- High Alert didn't trigger (see above causes)

**Solution**: Check Redux DevTools for `encounterEffectMessage` field.

---

## Expected Game Flow

Here's the complete flow for testing High Alert:

1. **Hero Phase**: Hero moves, attacks, etc.
2. **Exploration Phase**: Hero explores or not
3. **Villain Phase**: 
   - Encounter card drawn (if applicable)
   - Monsters activate and attack
   - **End of Villain Phase**: High Alert triggers here
     - Active hero passes one monster to next hero
     - Notification appears
   - Click "End Villain Phase"
4. **Next Hero's Turn**: New hero begins Hero Phase
   - If they received a monster, it should now activate for them during their Villain Phase

---

## Summary Checklist

Use this checklist to verify all scenarios work correctly:

- [ ] **Scenario 1**: Basic multiplayer monster passing works
- [ ] **Scenario 2**: Only one monster passes when hero has multiple
- [ ] **Scenario 3**: Last player wraps to first player
- [ ] **Scenario 4**: Solo player does not pass monsters
- [ ] **Scenario 5**: No error when active hero has no monsters
- [ ] **Scenario 6**: No passing when environment not active

All scenarios should pass without errors or unexpected behavior.
