# E2E Test 101 - Legion Devil Multi-Monster Spawn

## User Story

As a player, when I encounter a Legion Devil monster card:
1. The Legion Devil spawns 3 total monsters (1 initial + 2 additional)
2. All 3 Legion Devils are tracked as a group
3. Defeating individual Legion Devils does NOT award XP
4. XP (2 points) is only awarded when ALL 3 Legion Devils are defeated

## Test Flow

### Screenshot 000 - Character Selection
![Screenshot 000](101-legion-devil-spawn.spec.ts-snapshots/000-character-selection-chromium-linux.png)

**Verification:**
- Character selection screen is displayed
- Hero selection is available

### Screenshot 001 - Game Started
![Screenshot 001](101-legion-devil-spawn.spec.ts-snapshots/001-game-started-chromium-linux.png)

**Verification:**
- Game board is displayed
- Initial XP is 0
- No monsters on the board yet

### Screenshot 002 - Three Legion Devils Spawned
![Screenshot 002](101-legion-devil-spawn.spec.ts-snapshots/002-three-legion-devils-spawned-chromium-linux.png)

**Verification:**
- 3 Legion Devil monsters are visible on the board
- All 3 have the same `groupId`
- One monster group exists with 3 members
- Group XP is 2 points
- Party XP is still 0 (not awarded yet)

### Screenshot 003 - One Devil Defeated, No XP
![Screenshot 003](101-legion-devil-spawn.spec.ts-snapshots/003-one-devil-defeated-no-xp-chromium-linux.png)

**Verification:**
- 2 Legion Devils remaining on the board
- Party XP is still 0 (group not fully defeated)
- Monster group still exists with 2 members

### Screenshot 004 - Two Devils Defeated, No XP
![Screenshot 004](101-legion-devil-spawn.spec.ts-snapshots/004-two-devils-defeated-no-xp-chromium-linux.png)

**Verification:**
- 1 Legion Devil remaining on the board
- Party XP is STILL 0 (group not fully defeated)
- Monster group still exists with 1 member

### Screenshot 005 - All Devils Defeated, XP Awarded
![Screenshot 005](101-legion-devil-spawn.spec.ts-snapshots/005-all-devils-defeated-xp-awarded-chromium-linux.png)

**Verification:**
- 0 Legion Devils remaining on the board
- Party XP is NOW 2 (group fully defeated, XP awarded)
- Monster group has been removed (no longer exists)

## Manual Verification Checklist

- [ ] Character selection screen displays correctly
- [ ] Game board loads with no monsters initially
- [ ] Legion Devil spawns exactly 3 monsters
- [ ] All 3 monsters appear on the board at non-overlapping positions
- [ ] Defeating 1 monster does not award XP
- [ ] Defeating 2 monsters does not award XP
- [ ] Defeating all 3 monsters awards exactly 2 XP
- [ ] Monster group is properly cleaned up after all defeats
- [ ] UI accurately reflects the number of remaining monsters

## Implementation Details

**Multi-Monster Spawn:**
- Legion Devil has `spawnBehavior: { count: 2 }`
- Spawns 1 + 2 = 3 total monsters
- All spawned monsters assigned same `groupId`

**Group XP Tracking:**
- `MonsterGroup` tracks all member IDs and collective XP
- XP award logic checks `isGroupDefeated()` before awarding
- Group removed from `monsterGroups` array when complete

**Test Approach:**
- Uses Redux state manipulation for reliable, deterministic testing
- Directly spawns monsters with group tracking
- Simulates attacks using `setAttackResult` action
- Verifies state changes after each defeat
