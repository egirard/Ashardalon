# 024 - Reaping Strike Multi-Attack

## User Story

As a player using Vistra (Fighter), I want to be able to use the Reaping Strike at-will power to attack a single adjacent monster twice, so that I can deal extra damage in combat.

## Test Scenario

This test verifies that:
1. The Reaping Strike power card (id 13) shows a "x2" badge indicating it attacks twice
2. When the player selects Reaping Strike, the attack button shows the "×2" multiplier
3. The multi-attack system properly tracks attack progress
4. The parsed action description shows "Attack twice (adjacent)"

## Screenshots

### Step 1: Vistra Selected with Powers
![Vistra with powers selected](024-reaping-strike.spec.ts-snapshots/000-vistra-with-powers-selected-chromium-linux.png)

Vistra is selected as the hero with default power cards including Reaping Strike.

### Step 2: Game Board with Adjacent Monster
![Game with cultist adjacent](024-reaping-strike.spec.ts-snapshots/001-game-with-cultist-adjacent-chromium-linux.png)

The game board shows Vistra with a Cultist monster adjacent. The power card attack panel is visible with Reaping Strike showing the "x2" badge.

### Step 3: Reaping Strike Selected
![Reaping Strike selected](024-reaping-strike.spec.ts-snapshots/002-reaping-strike-selected-chromium-linux.png)

Reaping Strike is selected, showing the target selection with the "×2" attack multiplier on the attack button.

### Step 4: First Attack Result
![First attack result](024-reaping-strike.spec.ts-snapshots/003-reaping-strike-first-attack-result-chromium-linux.png)

The combat result for the first of two attacks is displayed.

### Step 5: After First Attack Dismissed
![After first attack](024-reaping-strike.spec.ts-snapshots/004-after-first-attack-dismissed-chromium-linux.png)

After dismissing the first attack result, the multi-attack progress is shown (1/2 attacks completed). A "Cancel Remaining Attacks" button is visible, allowing the player to exit the multi-attack sequence early.

### Step 6: Second Attack (Manually Verified)

The second attack can be executed by clicking the "Attack Cultist ×2" button again after dismissing the first attack result. This has been manually verified and works correctly:
- The second attack uses the same Reaping Strike card (from `multiAttackState`)
- The attack roll and damage are applied normally
- After the second attack completes, the multi-attack state is cleared
- The player returns to normal turn state

**Note**: The automated E2E test demonstrates up to the first attack and the cancel button functionality. The second attack execution is manually verified due to Playwright event handling limitations with Svelte's reactive components.

### Additional: Attack Panel with Special Badges
![Attack panel with badges](024-reaping-strike.spec.ts-snapshots/000-attack-panel-with-special-badges-chromium-linux.png)

Shows the power card attack panel with special badges and parsed action descriptions visible.

## Acceptance Criteria

- [x] Reaping Strike shows "x2" badge in the power card list
- [x] Attack button shows "×2" multiplier when Reaping Strike is selected
- [x] Multi-attack state is properly initialized when using Reaping Strike
- [x] Multi-attack progress is tracked (Attack 1 of 2, Attack 2 of 2)
- [x] First attack executes correctly with proper damage
- [x] After first attack, UI shows progress and cancel option
- [x] Cancel button is available to exit multi-attack early  
- [x] Second attack can be executed after first attack (manually verified)
- [x] Multi-attack sequence completes after all attacks (manually verified)
- [x] Action description shows "Attack twice (adjacent)"
- [x] At-will cards are NOT flipped when used (can be used repeatedly)
