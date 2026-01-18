# Test 084 - Bad Luck Curse Complete Lifecycle

## User Story

As a player, when my hero is afflicted with the Bad Luck curse, I want the curse to force me to draw an extra encounter card each turn during the Villain Phase, and I want the ability to automatically attempt to remove the curse at the end of each Villain Phase with a d20 roll (10+ removes it).

## Test Flow

### Step 1: Character Selection (Screenshot 000)
- Navigate to character selection screen
- Select Quinn (Cleric) from bottom edge for natural reading orientation

### Step 2: Game Start (Screenshot 001)
- Start game with deterministic seed for reproducible tests
- Dismiss scenario introduction
- Verify game board is loaded

### Step 3: Apply Bad Luck Curse (Screenshots 002-003)
- Set game phase to Villain Phase
- Set drawn encounter to 'bad-luck' curse card
- Display curse card (Screenshot 002)
- Click continue to accept curse
- Verify curse is applied to Quinn (Screenshot 003)
  - Check that Quinn's status effects include 'curse-bad-luck'

### Step 4: Trigger Extra Encounter Draw (Screenshot 004)
- Transition through game phases (end villain → end hero → end exploration)
- Entering Villain Phase triggers encounter draw
- Verify first encounter is drawn (Screenshot 004)
- **Verify Bad Luck flag is set**: `badLuckExtraEncounterPending = true`

### Step 5: Bad Luck Extra Encounter (Screenshot 005)
- Dismiss first encounter card
- **Bad Luck curse triggers extra encounter draw**
- Verify extra encounter is drawn (Screenshot 005)
- Verify flag is cleared: `badLuckExtraEncounterPending = false`
- Verify notification message: "Bad Luck curse: quinn draws an extra encounter!"

### Step 6: Dismiss Extra Encounter (Screenshot 006)
- Dismiss the extra encounter card
- Handle any result popups (damage, attacks, etc.)
- Verify encounter is cleared
- **Verify curse is still active** (removal happens at end of Villain Phase)

### Step 7: Curse Removal Attempt (Screenshot 007)
- End Villain Phase
- **Automatic d20 roll for curse removal**
- If roll >= 10: Curse is removed
- If roll < 10: Curse persists
- Verify phase transitions to Hero Phase
- Message displays roll result and outcome

### Step 8: Test Complete (Screenshot 008)
- Verify game is in valid state
- Hero Phase is active
- Test documents complete curse lifecycle

## Key Validations

### Bad Luck Curse Mechanics
1. ✅ Curse is applied as status effect when encounter card is accepted
2. ✅ Flag `badLuckExtraEncounterPending` is set when encounter is drawn in Villain Phase for cursed hero
3. ✅ Extra encounter is automatically drawn after dismissing first encounter
4. ✅ Flag is cleared after extra encounter is drawn
5. ✅ Notification message informs player of extra draw
6. ✅ Curse persists until removal roll succeeds
7. ✅ Automatic d20 roll at end of Villain Phase (10+ removes curse)
8. ✅ Result message displays roll and outcome

### Edge Cases Tested
- Curse application through encounter card
- Phase transitions while cursed
- Extra encounter draw mechanism
- Encounter result popups (damage/attack encounters)
- Curse removal roll mechanics
- Multiple turns with persistent curse

## Implementation References

- Bad Luck curse logic: `src/store/gameSlice.ts`
  - `endExplorationPhase`: Sets flag when encounter drawn for cursed hero
  - `dismissEncounterCard`: Draws extra encounter when flag is set
  - `endVillainPhase`: Automatic curse removal roll
- Status effect definition: `src/store/statusEffects.ts`
- Encounter card definition: `src/store/types.ts`

## Related Tests

- Test 081: Bloodlust Curse (damage at turn start, removed by defeating monster)
- Test 082: Dragon Fear Curse (damage on tile change, roll to remove at end of Hero Phase)
- Test 083: Cage Curse (AC penalty + cannot move, other hero can free with roll)

## Notes

- Uses deterministic seed for reproducible game state
- Selects hero from bottom edge per E2E testing guidelines
- Follows numbered screenshot pattern (000-008)
- Validates both programmatic state and visual UI
- Documents complete user story from curse application to removal
