# 013 - Wall Collision Detection

This E2E test suite verifies that characters cannot move through dungeon walls and that diagonal movement is properly restricted at tile boundaries.

## User Story

As a player, I expect:
- My hero cannot move through walls in the dungeon
- Movement overlay only shows valid, legal moves
- Diagonal movement is blocked when both connected edges have walls
- Hero cannot move to the wall column (x=0) on the start tile

## Test Scenarios

### Test 1: Movement overlay excludes diagonal moves through wall corners
**Steps:**
1. Start game with Quinn
2. Position hero at north-east corner of start tile (x=3, y=0)
3. Show movement options
4. Verify valid moves include adjacent squares within the tile

**Expected Result:**
- Movement overlay shows legal moves only
- Hero can move south, west, and diagonally within the tile
- No moves through unexplored edges (treated as walls)

### Test 2: Hero cannot move diagonally between tiles that are not directly connected
**Steps:**
1. Start game with Quinn
2. Position hero at east edge of start tile (x=3, y=2)
3. Show movement options
4. Verify no moves extend beyond tile boundary

**Expected Result:**
- All valid movement squares are within start tile bounds (x: 1-3)
- No diagonal moves to adjacent tile positions

### Test 3: Movement squares respect tile boundaries and wall edges
**Steps:**
1. Start game with Quinn
2. Position hero at west edge of walkable area (x=1, y=2)
3. Show movement options
4. Verify no moves to wall column (x=0)

**Expected Result:**
- No movement squares at x=0 (wall column)
- No movement to staircase squares (x=1-2, y=3-4)
- Can move within walkable area

## Screenshots

### Test 1: Movement from corner
![000 - Hero at corner](013-wall-collision.spec.ts-snapshots/000-hero-at-corner-chromium-linux.png)
![001 - Movement from corner](013-wall-collision.spec.ts-snapshots/001-movement-from-corner-chromium-linux.png)

### Test 2: Movement at edge
![000 - Hero at edge](013-wall-collision.spec.ts-snapshots/000-hero-at-edge-chromium-linux.png)
![001 - Movement at edge](013-wall-collision.spec.ts-snapshots/001-movement-at-edge-chromium-linux.png)

### Test 3: Movement at west wall
![000 - Hero at west edge](013-wall-collision.spec.ts-snapshots/000-hero-at-west-edge-chromium-linux.png)
![001 - Movement at west wall](013-wall-collision.spec.ts-snapshots/001-movement-at-west-wall-chromium-linux.png)

## Manual Verification Checklist

- [ ] Movement overlay appears when clicking the game board
- [ ] Valid movement squares are highlighted in blue
- [ ] No movement squares appear outside tile boundaries
- [ ] No movement squares appear on the wall column (x=0)
- [ ] No movement squares appear on staircase squares
- [ ] Clicking a valid movement square moves the hero
