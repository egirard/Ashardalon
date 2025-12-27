# E2E Test 063 - Target Selection on Map

## User Story

As a player, I want to tap on monsters (and other targets like traps and treasures) on the map to select them for actions, so that I can clearly indicate which target I want to interact with.

## Test Coverage

This test validates that:

1. **Initial State**: Monsters are displayed as targetable when the hero is adjacent and can attack
2. **Highlighting**: Targetable monsters show a visual highlight (golden glow animation)
3. **Selection**: Tapping on a targetable monster selects it (green highlight ring)
4. **State Management**: Selection state is properly stored in Redux
5. **Deselection**: Tapping the selected monster again deselects it
6. **Attack Integration**: The attack panel works correctly with selected targets
7. **Cleanup**: Target is automatically deselected after attack completes

## Test Steps

1. Start game with Quinn
2. Position Quinn to trigger exploration and spawn a monster
3. Move Quinn adjacent to the monster
4. Verify monster shows as targetable (golden glow)
5. Click monster to select it (green ring appears)
6. Verify selection state in Redux store
7. Click monster again to deselect
8. Verify deselection in Redux store
9. Select monster and perform attack
10. Verify target is deselected after attack

## Screenshots

No screenshots are generated for this test as it uses programmatic verification only. The visual effects (glowing highlights and selection rings) are validated through DOM attributes and Redux state checks.

## Implementation Notes

- Uses `data-targetable` attribute to verify highlighting state
- Uses `data-selected` attribute to verify selection state  
- Validates Redux store state for `selectedTargetId` and `selectedTargetType`
- Tests both selection and deselection workflows
- Verifies cleanup after attack completion
