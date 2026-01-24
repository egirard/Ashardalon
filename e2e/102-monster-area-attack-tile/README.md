# Test 102: Monster Area Attack on All Heroes on Tile

## User Story

As a player, when a monster with area attack capability activates during the villain phase, I expect it to attack **all heroes on the same tile**, showing sequential combat results for each hero affected by the area attack.

## Scenario

This test demonstrates the expected behavior for monster-driven area attacks that target all heroes on a tile. The scenario includes:

1. **Setup**: Two heroes (Quinn and Vistra) positioned on the same tile
2. **Monster Spawn**: A kobold spawned adjacent to both heroes  
3. **Villain Phase**: Monster activates during villain phase
4. **Area Attack**: When fully implemented, the monster should attack all heroes on its tile, showing sequential combat results

## Current Implementation Status

⚠️ **Note**: This test documents the **expected behavior** for monster area attacks. The current implementation (as of this test) attacks only a single hero. When the area attack feature is fully implemented for monsters like Cave Bear and Gibbering Mouther, this test will verify that:

- All heroes on the same tile are targeted
- Sequential combat results appear for each hero
- Status effects (e.g., Dazed) are applied to all affected heroes
- The UI clearly communicates the area attack effect

## Screenshots

### Step 1: Game Started with Two Heroes

![Screenshot 000](102-monster-area-attack-tile.spec.ts-snapshots/000-game-started-two-heroes-chromium-linux.png)

**Verification**: 
- Two hero tokens visible on the board (Quinn and Vistra)
- Game is in hero phase
- Both heroes start at full HP

### Step 2: Heroes Positioned on Same Tile

![Screenshot 001](102-monster-area-attack-tile.spec.ts-snapshots/001-heroes-positioned-same-tile-chromium-linux.png)

**Verification**:
- Quinn positioned at (2, 3)
- Vistra positioned at (3, 3)
- Both heroes are on the start tile (positions within 0-7, 0-7 range)
- Heroes are on the same tile, setting up the area attack scenario

### Step 3: Monster Spawned Adjacent to Both Heroes

![Screenshot 002](102-monster-area-attack-tile.spec.ts-snapshots/002-monster-spawned-adjacent-chromium-linux.png)

**Verification**:
- Kobold monster spawned at position (2, 2)
- Monster is adjacent to both Quinn (2, 3) and Vistra (3, 3)
- Monster is on the same tile as both heroes (start-tile)
- Monster card shows stats: AC 14, 1 HP, "Explore Or Attack" tactic

### Step 4: Villain Phase Ready

![Screenshot 003](102-monster-area-attack-tile.spec.ts-snapshots/003-villain-phase-ready-chromium-linux.png)

**Verification**:
- Turn phase indicator shows "Villain Phase"
- Turn progress shows villain phase as active
- Monster ready to activate
- Heroes remain at full HP before monster activation

### Step 5: Monster Action Complete

![Screenshot 004](102-monster-area-attack-tile.spec.ts-snapshots/004-monster-action-complete-chromium-linux.png)

**Verification**:
- Monster has taken its action during villain phase
- Game state reflects monster activation
- Current implementation: Monster attacked or moved toward closest hero

**Expected behavior** (when area attack is implemented):
- Combat result dialog should appear for first hero
- After dismissing, second combat result dialog should appear
- Both heroes should have taken damage if attacks hit
- Status effects applied to all affected heroes

### Step 6: Area Attack Scenario Complete

![Screenshot 005](102-monster-area-attack-tile.spec.ts-snapshots/005-area-attack-scenario-complete-chromium-linux.png)

**Verification**:
- Both hero tokens still on the board
- Monster status updated after activation
- Scenario properly demonstrates the setup for area attacks

**Future verification** (when area attack is implemented):
- Both heroes' HP should be reduced (if attacks hit)
- Monster card should indicate area attack capability
- Combat log should show attacks against multiple heroes
- Any status effects (e.g., Dazed) applied to all affected heroes

## Test Requirements

This test validates the following requirements from the issue:

### Implemented in this Test
- ✅ E2E test scenario for area attack on all heroes on a tile
- ✅ Screenshot sequence with programmatic verification
- ✅ Two heroes positioned on the same tile
- ✅ Monster adjacent to multiple heroes
- ✅ Transition to villain phase with monster activation

### To Be Implemented (Feature)
- ⏳ Monster AI identifies all heroes on the same tile as valid targets
- ⏳ Monster executes attack against all eligible heroes sequentially
- ⏳ Sequential combat result dialogs for each hero
- ⏳ Status effects (e.g., Dazed) applied to all hit targets
- ⏳ UI clearly indicates area attack vs single-target attack

## Manual Verification Checklist

When reviewing these screenshots, verify:

- [ ] Two hero tokens are clearly visible on the board
- [ ] Heroes are positioned on the same tile (identifiable by grid location)
- [ ] Monster token is adjacent to both heroes
- [ ] Villain phase UI elements are displayed correctly
- [ ] Monster card shows appropriate stats and tactics
- [ ] Turn progress indicator shows correct phase
- [ ] Hero HP displays are visible and accurate

## Running This Test

```bash
# Run this specific test
bun run test:e2e -- e2e/102-monster-area-attack-tile/102-monster-area-attack-tile.spec.ts

# Run in headed mode to observe behavior
bun run test:e2e:headed -- e2e/102-monster-area-attack-tile/102-monster-area-attack-tile.spec.ts

# Update snapshots if UI changes
bun run test:e2e -- e2e/102-monster-area-attack-tile/102-monster-area-attack-tile.spec.ts --update-snapshots
```

## Related Tests

- **Test 010**: Monster attack (single-target)
- **Test 044**: Multi-target attacks (hero power cards)
- **Test 050**: Area attacks targeting each monster on a tile (hero power cards)

## Implementation Notes

When implementing the full area attack feature for monsters:

1. **Monster AI Enhancement** (`src/store/monsterAI.ts`):
   - Add support for area attack tactics type
   - Function to find all heroes on the same tile
   - Execute attack against each hero sequentially

2. **Combat System** (`src/store/combat.ts`):
   - Support for multiple attack results in sequence
   - Status effect application to multiple targets

3. **UI Updates**:
   - Sequential combat result dialogs
   - Clear indication of area attack vs single-target
   - Monster card display of area attack capability

4. **Monster Definitions** (`src/store/types.ts`):
   - Add Cave Bear with "frenzy of claws" attack
   - Add Gibbering Mouther with area attack
   - Both should apply Dazed status on hit
