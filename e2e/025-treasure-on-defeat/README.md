# E2E Test 025 - Draw Treasure on Monster Defeat

## User Story

> As a user, when I defeat a monster, I draw a treasure card and can see what I got.

## Test Scenarios

### 1. Hero defeats monster and draws treasure card
- Start game with Quinn
- Add a monster to the board
- Defeat the monster with an attack
- Verify treasure card modal appears
- Assign treasure to Quinn
- Verify treasure is in Quinn's inventory

### 2. Only one treasure is drawn per turn
- Defeat first monster - treasure drawn
- Defeat second monster same turn - no additional treasure drawn
- Verify treasureDrawnThisTurn flag prevents duplicate draws

### 3. Treasure can be dismissed/discarded
- Defeat monster and draw treasure
- Click dismiss button instead of assigning
- Verify treasure is discarded (in discard pile)
- Verify hero inventory remains empty

## Screenshot Sequence

1. `000-initial-game-board.png` - Game started with treasure deck initialized
2. `001-monster-on-board.png` - Monster placed on board
3. `002-attack-hits-monster.png` - Attack result shown, monster defeated
4. `003-treasure-card-displayed.png` - Treasure card modal appears
5. `004-treasure-assigned-to-hero.png` - Treasure assigned to hero's inventory

## Key Acceptance Criteria Verified

- [x] On monster defeat, a treasure card is drawn
- [x] The treasure card is displayed showing the item
- [x] The item can be added to a hero's inventory
- [x] Only one treasure is drawn per turn (regardless of monsters defeated)
- [x] Player can choose to discard the treasure instead
