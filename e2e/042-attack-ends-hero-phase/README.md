# E2E Test 042: Attack Ends Hero Phase

## Purpose
Verify that when the hero phase ends with an attack (move+attack or attack+move), the exploration phase does not begin until the attack result card is dismissed by the player.

## User Story
As a player, when I complete my hero turn with an attack, I want to review the attack result card before the exploration phase begins, so that I can understand the outcome of my attack without being distracted by the exploration phase starting immediately.

## Test Scenarios

### Test 1: Exploration phase pauses until attack result is dismissed
**Steps:**
1. Start game with Quinn
2. Set up a monster adjacent to the hero
3. Move Quinn (first action)
4. Attack the monster (second action - completes turn)
5. Verify attack result is displayed
6. **CRITICAL**: Verify phase is still "hero-phase" (not "exploration-phase")
7. Wait 500ms to ensure phase doesn't auto-advance
8. Dismiss the attack result
9. **CRITICAL**: Verify phase now transitions to "exploration-phase"

**Acceptance Criteria:**
- Attack result card is displayed after attack
- Phase remains "hero-phase" while attack result is displayed
- Phase does not auto-advance to exploration while attack result is visible
- Phase transitions to exploration only after attack result is dismissed

### Test 2: Manual end phase button does not end hero phase while attack result is displayed
**Steps:**
1. Start game with Quinn
2. Set up a monster adjacent to the hero
3. Attack the monster (single action, not completing turn)
4. Verify attack result is displayed
5. Verify End Phase button is blocked by the modal overlay
6. Dismiss attack result
7. Manually click End Phase button
8. Verify phase transitions to exploration

**Acceptance Criteria:**
- End Phase button is not clickable while attack result modal is displayed
- Phase only transitions when user explicitly dismisses attack result and then ends phase

## Screenshots

### before-attack.png
- **What it shows**: Hero phase with attack button visible, hero has moved and is adjacent to monster
- **Why it's important**: Shows the setup before the attack that will complete the turn
- **Human verification**: Verify hero is adjacent to monster, attack button is visible, hero phase is active

### attack-result-displayed-still-hero-phase.png
- **What it shows**: Attack result card displayed on screen, phase indicator still shows "Hero Phase"
- **Why it's important**: Critical verification that phase does NOT auto-advance while attack result is visible
- **Human verification**: Verify attack result card is visible, verify phase text says "Hero Phase" (NOT "Exploration Phase")

### still-hero-phase-after-wait.png
- **What it shows**: After waiting 500ms, attack result still displayed, still in hero phase
- **Why it's important**: Confirms the phase does not auto-advance even after a delay
- **Human verification**: Verify attack result card is still visible, verify phase is still "Hero Phase"

### exploration-phase-after-dismiss.png
- **What it shows**: After dismissing attack result, phase indicator now shows "Exploration Phase"
- **Why it's important**: Confirms the phase transitions only after the attack result is dismissed
- **Human verification**: Verify attack result card is gone, verify phase text says "Exploration Phase"

## Related Files
- `src/components/GameBoard.svelte` - Modified to prevent auto-end when attack result is displayed
- `src/store/gameSlice.ts` - Contains phase transition logic

## Edge Cases Tested
- Move + Attack (turn-completing sequence)
- Attack only (not turn-completing)
- Manual vs auto phase transitions
- Modal overlay blocking manual phase transitions
