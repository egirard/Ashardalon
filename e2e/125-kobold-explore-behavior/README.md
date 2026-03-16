# 125 - Kobold Dragonshield Explore Behavior

## User Story

When a hero explores a new tile and a Kobold Dragonshield spawns on it, the player should see:
1. The monster card displaying all **3 numbered activation instructions** from the official card
2. During the villain phase, the Kobold **explores** the tile's unexplored edge (because no heroes are on its tile), instead of moving toward reachable heroes

This test validates the fix for a bug where the Kobold would incorrectly move toward heroes even when card rule #2 required it to explore.

## Card Rules (Official)
1. If adjacent to a Hero: Attack with Sword (+7, 1 damage)
2. If on a tile with an unexplored edge (no Heroes on tile): Place a tile
3. Otherwise: Move toward the closest Hero

## Test Scenario

1. Start a game with Quinn as the hero
2. Add a second tile south of the start tile (simulating exploration)
3. Place a Kobold on the south tile — Quinn stays on the start tile
4. Open the monster mini-card and verify it shows 3 numbered activation instructions
5. Enter villain phase and activate the Kobold
6. Verify the Kobold **explores** (not moves) — the `monster-exploration-notification` appears
7. Verify the dungeon expanded with a new tile after exploration

## Screenshots

### 000 - Kobold Card Shows 3 Instructions
The Kobold Dragonshield card displays all 3 official numbered activation instructions including the explore rule.

![Kobold card 3 instructions](125-kobold-explore-behavior.spec.ts-snapshots/000-kobold-card-3-instructions-chromium-linux.png)

### 001 - Board: Kobold on South Tile
The board shows Kobold on the newly explored south tile; Quinn is on the start tile. The south tile has an unexplored edge.

![Board with kobold on south tile](125-kobold-explore-behavior.spec.ts-snapshots/001-board-kobold-on-south-tile-chromium-linux.png)

### 002 - Kobold Explores South Edge
During villain phase, the Kobold explores the south unexplored edge. The monster-exploration notification shows "Kobold Dragonshield explored South edge".

![Kobold explores south edge notification](125-kobold-explore-behavior.spec.ts-snapshots/002-kobold-explores-south-edge-chromium-linux.png)

### 003 - Expanded Dungeon After Exploration
The dungeon has expanded with a new tile placed by the Kobold's exploration. The Kobold remains on its tile.

![Expanded dungeon after kobold explored](125-kobold-explore-behavior.spec.ts-snapshots/003-expanded-dungeon-after-kobold-explored-chromium-linux.png)

## Notes

- Uses `setTestMode(true)` to prevent auto-dismiss of the exploration notification
- The test directly validates `state.game.monsterExplorationEvent !== null` (explore happened) and `state.game.monsterMoveActionId === null` (no move)
