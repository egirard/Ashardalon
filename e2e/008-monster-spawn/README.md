# E2E Test 008 - Spawn Monster on Exploration

## User Story

> As a user, when a new tile is placed, I see a monster appear on it at the correct black spot position (the dark circular marking on the tile), so that I have something to fight and the game follows the rules.

## Test Scenarios

### Scenario 1: Monster appears on newly placed tile at black spot position

1. **Given** Quinn just placed a new tile through exploration (exploring north edge)
2. **Then** a monster token appears on the new tile at the black spot position
3. **And** the monster is at position (2, 1) - the dark circular marking on the tile
4. **And** I see a monster card displayed showing the monster's name
5. **And** the monster card shows AC and HP values

### Scenario 2: Monster card shows correct stats

Verifies that the monster card displays:
- Monster name
- AC (Armor Class)
- HP (Hit Points)
- XP (Experience Points)

### Scenario 3: No monster spawns when hero is not on edge

Verifies that no monster spawns when the hero ends their turn in the center of a tile (not on an unexplored edge).

## Black Spot Positioning

Monsters spawn at the "black spot" position on the tile - the dark circular marking visible on each dungeon tile. In the default tile orientation (arrow pointing south), the black spot is at position (2, 1).

As the tile rotates, the black spot position rotates with it:

| Tile Rotation | Arrow Direction | Black Spot Position |
|---------------|-----------------|---------------------|
| 0°            | South           | (2, 1)              |
| 90°           | West            | (2, 2)              |
| 180°          | North           | (1, 2)              |
| 270°          | East            | (1, 1)              |

If the black spot is occupied, the monster will spawn at an adjacent open square.

## Screenshot Sequence

### 000 - Hero ready for exploration
![Screenshot 000](008-monster-spawn.spec.ts-snapshots/000-tile-placed-ready-chromium-linux.png)

Hero is positioned at the north edge, ready to trigger exploration.

### 001 - Monster spawns at black spot with card display
![Screenshot 001](008-monster-spawn.spec.ts-snapshots/001-monster-spawns-at-black-spot-chromium-linux.png)

After ending the hero phase, a new tile is placed and a monster spawns at the black spot position (2, 1). The monster card is displayed showing the monster's name and stats (AC, HP, XP).

### 002 - Monster token visible at black spot position
![Screenshot 002](008-monster-spawn.spec.ts-snapshots/002-monster-at-black-spot-dismissed-chromium-linux.png)

After dismissing the monster card, the monster token remains visible on the newly placed tile at the black spot position.

## Manual Verification Checklist

- [ ] Monster token appears on the new tile (not the start tile)
- [ ] Monster token is positioned at the black spot (dark circular marking on tile)
- [ ] Monster token has a distinct red/enemy color scheme
- [ ] Monster card shows the monster's name prominently
- [ ] Monster card shows AC (Armor Class) value
- [ ] Monster card shows HP (Hit Points) value
- [ ] Monster card shows XP (Experience Points) value
- [ ] Monster card can be dismissed by clicking the X button
- [ ] Monster card can be dismissed by clicking outside the card
- [ ] After dismissal, monster token remains visible at black spot
- [ ] Monster is assigned to the exploring hero (controllerId)
