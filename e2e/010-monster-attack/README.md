# 010 - Monster Attacks Hero

## User Story

> As a user, during the Villain Phase, I see monsters move toward heroes and attack them, reducing hero HP.

## Test Scenarios

### 1. Monster moves toward hero and attacks during villain phase

This test verifies:
- Hero HP is initialized when game starts
- HP is displayed in the turn indicator
- Monster spawns during exploration
- Villain Phase shows "Activate Monster" button
- Clicking activate monster triggers monster AI
- Villain phase state resets after ending

### 2. Monster attack hits hero and reduces HP

This test verifies:
- Monster can attack adjacent hero
- Attack result is displayed
- Combat result can be dismissed

### 3. Hero HP display updates when damaged

This test verifies:
- HP display shows initial value (8/8 for Quinn)
- HP display updates when hero takes damage
- HP display shows format "HP: X/Y"

### 4. Monster ignores downed heroes (0 HP)

This test verifies:
- Monsters do not target heroes at 0 HP
- Monster still activates but takes no action

## Implementation Details

### HP Display
The hero HP is displayed in the turn indicator as "HP: X/Y" where X is current HP and Y is max HP.

### Villain Phase Controls
During villain phase, an "Activate Monster" button appears showing the current monster index and total count (e.g., "👹 Activate Monster (1/1)").

### Monster AI
When activated, monsters will:
1. Check if adjacent to an alive hero - if so, attack
2. Otherwise, move toward the closest alive hero
3. Skip downed heroes (0 HP)

## Acceptance Criteria

- [x] After hero actions, the Villain Phase begins
- [x] Monsters move toward the closest hero
- [x] Adjacent monsters attack heroes
- [x] Attack results are displayed
- [x] Hero HP decreases on hit
