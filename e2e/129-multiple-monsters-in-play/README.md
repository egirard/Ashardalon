# 129 – Multiple Monsters in Play

Validates three core rules about monster cards:

1. **No duplicate types per hero** – A hero cannot have two monsters of the same type in their list. When a hero would draw a duplicate monster type they already control, they re-draw until they get a different type.

2. **Different players may share a type** – It is valid for two different players to control the same type of monster (e.g. both having a kobold).

3. **Shared types activate together** – When two or more players share a monster card type, activating that named monster for any one player also activates ALL matching monsters on the board, regardless of which player controls them.

## Screenshots

### Test 1: Hero re-draws duplicate monster types; different players may share types; shared types activate together

#### Step 1: Game started with two players
129-multiple-monsters-in-play.spec.ts-snapshots/000-game-started-two-players-chromium-linux.png

#### Step 2: Quinn has kobold; deck rigged with kobold on top
129-multiple-monsters-in-play.spec.ts-snapshots/001-quinn-has-kobold-deck-rigged-chromium-linux.png

#### Step 3: Exploration triggered; kobold skipped (duplicate), snake drawn instead
129-multiple-monsters-in-play.spec.ts-snapshots/002-exploration-triggered-no-kobold-duplicate-chromium-linux.png

#### Step 4: Quinn now has kobold + snake (no duplicates)
129-multiple-monsters-in-play.spec.ts-snapshots/003-quinn-has-kobold-and-snake-chromium-linux.png

#### Step 5: Both players have a kobold — different players sharing a type is allowed
129-multiple-monsters-in-play.spec.ts-snapshots/004-both-players-have-kobold-chromium-linux.png

#### Step 6: Quinn's villain phase — cross-player kobold activation list verified
129-multiple-monsters-in-play.spec.ts-snapshots/005-quinn-villain-phase-cross-player-kobolds-chromium-linux.png

### Test 2: Hero skips multiple duplicates to find a new type

#### Skipped kobold×2 and snake, drew orc-archer
129-multiple-monsters-in-play.spec.ts-snapshots/000-skipped-duplicates-drew-orc-archer-chromium-linux.png
