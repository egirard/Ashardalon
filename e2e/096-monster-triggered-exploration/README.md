# E2E Test 096: Monster-Triggered Tile Exploration

**Test File:** `096-monster-triggered-exploration.spec.ts`

**What it demonstrates:**
1. Initial game board with start tile only
2. Duergar Guard positioned on a tile with unexplored edges (hero on different tile)
3. **Monster exploration notification** when Duergar Guard explores via real monster AI
4. **Board after notification dismissed** - Programmatically dismissed to show clean view
5. **New monster spawned** - Monster visible on the explored tile's black square
6. **Final complete dungeon** - All tiles and monsters in their final positions

**Status**: ✅ PASSING (1 test, 15.3s)

## User Story

As a player, when a Kobold Dragonshield or Duergar Guard activates during the villain phase and ends its movement on a tile with an unexplored edge (with no heroes present), the monster automatically triggers tile exploration. The game places a new tile, spawns a monster on it, and displays a clear notification about what happened—all without requiring manual player input.

## Screenshots

### Step 1: Initial Board with Start Tile Only
Shows the game starting state with only the starting tile placed.

![Initial board](096-monster-triggered-exploration.spec.ts-snapshots/000-initial-board-with-start-tile-only-chromium-linux.png)

### Step 2: Duergar Guard on Tile with Unexplored Edges
**Key Setup**: The Duergar Guard is positioned on tile-2 which has unexplored edges (north and east). The hero Quinn is on the start tile, meaning the Duergar Guard is alone on its tile—meeting the conditions for exploration.

![Duergar Guard positioned](096-monster-triggered-exploration.spec.ts-snapshots/001-duergar-guard-on-tile-with-unexplored-edges-chromium-linux.png)

### Step 3: Monster Exploration Notification ⭐
**Key Feature**: When the Duergar Guard activates during the villain phase, the monster AI detects that it's alone on a tile with unexplored edges and triggers exploration. The notification displays:
- Monster name: "Duergar Guard"
- Direction explored (automatically selected by AI)
- Tile type: "Black/White arrow tile placed"

![Exploration notification](096-monster-triggered-exploration.spec.ts-snapshots/002-monster-exploration-notification-chromium-linux.png)

### Step 4: Board After Notification Dismissed ⭐
**Key Feature**: After programmatically dismissing the notification (using test-only dismiss directive), the board clearly shows the expanded dungeon. The dungeon has grown from 2 tiles to 3+ tiles with the newly explored tile visible.

![Board after notification](096-monster-triggered-exploration.spec.ts-snapshots/003-new-tile-placed-notification-dismissed-chromium-linux.png)

### Step 5: New Monster on Explored Tile ⭐
**Key Feature**: A new monster automatically spawned on the black square of the newly explored tile. This screenshot shows:
- The original Duergar Guard (still on tile-2)
- The newly spawned monster (on the explored tile)
- The monsters are on separate tiles

![New monster spawned](096-monster-triggered-exploration.spec.ts-snapshots/004-new-monster-on-explored-tile-chromium-linux.png)

### Step 6: Final Dungeon with All Tiles and Monsters ⭐
**Key Feature**: The complete dungeon showing:
- Multiple tiles (start tile + tile-2 + explored tile(s))
- The original Duergar Guard (who triggered exploration)
- The newly spawned monster (on the explored tile)
- The fully expanded dungeon layout

![Final dungeon layout](096-monster-triggered-exploration.spec.ts-snapshots/005-final-dungeon-all-tiles-and-monsters-chromium-linux.png)

## Implementation Details

### What the Test Demonstrates

✅ **Duergar Guard on Tile with Unexplored Edges**: Guard positioned correctly before exploration  
✅ **Real Monster AI Exploration**: Uses `activateNextMonster` to trigger actual exploration logic  
✅ **Exploration Notification**: Clear UI feedback when monster explores  
✅ **Programmatic Notification Dismissal**: Uses test-only `testDismiss` prop to control notification lifecycle  
✅ **New Tile Placed**: The explored tile is visible in the expanded dungeon  
✅ **New Monster Spawned**: Monster appears on the newly explored tile's black square  
✅ **Multiple Tiles Visible**: Dungeon expansion clearly shown  
✅ **Multiple Monsters Visible**: Both original and spawned monsters present

### Technical Implementation

The test uses:
1. **`addDungeonTiles` test helper action** - Sets up the initial 2-tile scenario
2. **`activateNextMonster` action** - Triggers the real monster AI which:
   - Executes `executeMonsterTurn()` from monsterAI.ts
   - Returns `{ type: 'explore', edge: TileEdge }` when conditions are met
   - Automatically places new tile and spawns monster
   - Creates the `monsterExplorationEvent` for UI notification
3. **`testDismiss` prop** - Test-only boolean that prevents auto-dismiss timer
   - When `testDismiss: true`, the notification waits for explicit dismiss action
   - Test uses `dismissMonsterExplorationEvent` action to programmatically dismiss
   - **NO setTimeout or arbitrary delays** - all dismissals are programmatic
4. **Captures distinct states** - Each screenshot shows a genuinely different game state

This is **not a simulation** - it's the actual game logic executing the full exploration flow with programmatic control for testing.

### Core Features Verified

1. **Automatic Exploration**: Monsters with `explore-or-attack` tactic explore when alone on a tile with unexplored edges
2. **UI Notification**: Players see clear feedback about which monster explored and what tile was placed
3. **Programmatic Control**: Test can control notification lifecycle without timing dependencies
4. **Tile Placement**: New tiles are placed at the correct position
5. **Monster Spawning**: New monsters automatically spawn on explored tiles' black squares
6. **State Management**: Game correctly tracks all monsters and tiles

## Manual Verification Checklist

To manually verify this feature in gameplay:

- [ ] Start a game and move hero to explore tiles until you have at least 2 tiles
- [ ] Wait for a Kobold Dragonshield or Duergar Guard to spawn
- [ ] Maneuver the game so the monster ends up alone on a tile with unexplored edges
- [ ] Verify the monster triggers exploration during villain phase
- [ ] Verify the exploration notification appears with correct monster name
- [ ] Verify the notification auto-dismisses after 3 seconds (in normal gameplay)
- [ ] Verify a new tile is placed automatically at the explored edge
- [ ] Verify a monster spawns on the new tile's black square
- [ ] Test with hero on same tile - monster should move toward hero instead

## Test Results

```bash
Running 1 test using 1 worker
  1 passed (15.3s)
```

All screenshots captured with programmatic verification ensuring game state matches visual representation.

## Test Methodology

This E2E test uses **programmatic notification dismissal** instead of relying on setTimeout or arbitrary delays:

- **Before (problematic)**: Used `waitForTimeout(3800)` to wait for auto-dismiss, causing identical screenshots
- **After (correct)**: Sets `testDismiss: true` to disable auto-dismiss, then explicitly calls `dismissMonsterExplorationEvent` action

This approach ensures:
- ✅ No race conditions with timers
- ✅ Each screenshot captures a distinct, stable state
- ✅ Test is deterministic and reliable
- ✅ Fast execution (no waiting for auto-dismiss timers)

## Notes

- The `testDismiss` prop is only used in testing and does not affect normal gameplay
- In actual gameplay, the notification still auto-dismisses after 3 seconds (2s visible + 1s fade-out)
- The programmatic dismissal is purely for E2E test control
