# 129 – Multiple Monsters in Play

Validates three core rules about monster cards:

1. **No duplicate types per hero** – A hero cannot have two monsters of the same type in their list. When a hero would draw a duplicate monster type they already control, they re-draw until they get a different type.

2. **Different players may share a type** – It is valid for two different players to control the same type of monster (e.g. both having a kobold).

3. **Shared types activate together** – When two or more players share a monster card type, activating that named monster for any one player also activates ALL matching monsters on the board, regardless of which player controls them.

## Screenshots

### Test 1: Hero re-draws duplicate monster types and shared types activate together

#### Step 1: Game started with two players
000-game-started-two-players.png

#### Step 2: Quinn has kobold; deck rigged with kobold on top
001-quinn-has-kobold-deck-rigged.png

#### Step 3: Exploration triggered; kobold skipped (duplicate), snake drawn instead
002-exploration-triggered-no-kobold-duplicate.png

#### Step 4: Quinn now has kobold + snake (no duplicates)
003-quinn-has-kobold-and-snake.png

#### Step 5: Both players have a kobold — different players sharing a type is allowed
004-both-players-have-kobold.png

#### Step 6: Quinn's villain phase starts
005-quinn-villain-phase-starts.png

#### Step 7: After villain phase — all activations complete
006-villain-phase-complete.png

### Test 2: Hero skips multiple duplicates to find a new type

#### Skipped kobold×2 and snake, drew orc-archer
000-skipped-duplicates-drew-orc-archer.png
