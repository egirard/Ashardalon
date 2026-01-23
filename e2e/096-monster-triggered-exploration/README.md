# E2E Test 096: Monster-Triggered Tile Exploration

## User Story

As a player, when certain monsters (Kobold Dragonshield and Duergar Guard) end their movement on a tile with an unexplored edge and no heroes are present on that tile, the monster should automatically trigger exploration, revealing a new dungeon tile and spawning a new monster.

## Test Coverage

This E2E test demonstrates the complete **real** monster-triggered exploration flow using the actual game logic. The test triggers the `activateNextMonster` action which calls the monster AI, which then triggers exploration, places a new tile, and spawns a new monster.

### Test: Complete Monster Exploration Flow ✅

**What it demonstrates:**
1. Initial game board with start tile only
2. Duergar Guard positioned on a tile with unexplored edges (hero on different tile)
3. **Monster exploration notification** when Duergar Guard explores via real monster AI
4. **New tile placed** - Board shown after notification dismisses, revealing the newly placed tile
5. **New monster spawned** - Monster visible on the explored tile's black square
6. **Final complete dungeon** - All tiles and monsters in their final positions

**Status**: ✅ PASSING (1 test, 11.9s)

## Screenshots - Complete Flow Documentation

### Step 1: Initial Board with Start Tile Only
The game begins with only the start tile visible.

![Initial board](096-monster-triggered-exploration.spec.ts-snapshots/000-initial-board-with-start-tile-only-chromium-linux.png)

### Step 2: Duergar Guard on Tile with Unexplored Edges
A second tile has been added to the north. The Duergar Guard is placed on this tile, which has unexplored edges to the north and east. The hero (Quinn) is on the start tile, so the Duergar Guard is alone on its tile.

![Duergar Guard positioned](096-monster-triggered-exploration.spec.ts-snapshots/001-duergar-guard-on-tile-with-unexplored-edges-chromium-linux.png)

### Step 3: Monster Exploration Notification ⭐
**Key Feature**: When the Duergar Guard activates during the villain phase, the monster AI detects that it's alone on a tile with unexplored edges and triggers exploration. The notification displays:
- Monster name: "Duergar Guard"
- Direction explored (automatically selected)
- Tile type: "Black/White arrow tile placed"

![Exploration notification](096-monster-triggered-exploration.spec.ts-snapshots/002-monster-exploration-notification-chromium-linux.png)

### Step 4: New Tile Placed (Notification Dismissed) ⭐
**Key Feature**: After the notification auto-dismisses (3 seconds), the board clearly shows the expanded dungeon with the newly placed tile. The dungeon has grown from 2 tiles to 3+ tiles.

![New tile placed](096-monster-triggered-exploration.spec.ts-snapshots/003-new-tile-placed-after-notification-dismissed-chromium-linux.png)

### Step 5: New Monster Visible on Explored Tile ⭐
**Key Feature**: A new monster automatically spawned on the black square of the newly explored tile. This screenshot shows both:
- The original Duergar Guard (on tile-2)
- The newly spawned monster (on the explored tile)
- The monsters are on separate tiles

![New monster visible](096-monster-triggered-exploration.spec.ts-snapshots/004-new-monster-visible-on-explored-tile-chromium-linux.png)

### Step 6: Final Complete Dungeon Layout ⭐
**Key Feature**: The complete dungeon showing:
- Multiple tiles (start tile + tile-2 + explored tile(s))
- The original Duergar Guard (who triggered exploration)
- The newly spawned monster (on the explored tile)
- The fully expanded dungeon layout clearly visible

![Final dungeon layout](096-monster-triggered-exploration.spec.ts-snapshots/005-final-complete-dungeon-layout-chromium-linux.png)

## Implementation Details

### What the Test Demonstrates

✅ **Duergar Guard on Tile with Unexplored Edges**: Guard positioned correctly before exploration  
✅ **Real Monster AI Exploration**: Uses `activateNextMonster` to trigger actual exploration logic  
✅ **Exploration Notification**: Clear UI feedback when monster explores  
✅ **Notification Auto-Dismisses**: Notification disappears after 3 seconds  
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
3. **Waits for notification auto-dismiss** - Allows the 3-second notification to display and dismiss
4. **Captures distinct states** - Screenshots taken after waits to ensure different game states

This is **not a simulation** - it's the actual game logic executing the full exploration flow.

### Core Features Verified

1. **Automatic Exploration**: Monsters with `explore-or-attack` tactic explore when alone on a tile with unexplored edges
2. **UI Notification**: Players see clear feedback about which monster explored and what tile was placed
3. **Notification Auto-Dismissal**: Notification appears for 3 seconds then automatically dismisses
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
- [ ] Verify the notification auto-dismisses after 3 seconds
- [ ] Verify a new tile is placed automatically at the explored edge
- [ ] Verify a monster spawns on the new tile's black square
- [ ] Test with hero on same tile - monster should move toward hero instead

## Test Results

```bash
Running 1 test using 1 worker
  1 passed (11.9s)
```

All screenshots captured with programmatic verification ensuring game state matches visual representation.

## Known Behavior

The test may sometimes explore multiple edges in succession depending on tile deck randomization and monster AI decisions. This is expected behavior - the test validates that **at least** one exploration occurs and produces the expected results.



