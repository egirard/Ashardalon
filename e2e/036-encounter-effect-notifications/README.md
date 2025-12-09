# 036 - Encounter Effect Notifications

## User Story

As a player, when I accept a special encounter card that manipulates game state (like filtering the monster deck or healing monsters), I want to see a clear notification showing exactly what happened, so I can verify the encounter effect was applied correctly.

## Test Scenario

This test verifies that special encounter cards display user-visible notifications with detailed effect information:

1. **Start Game**: Select Quinn and start the game
2. **Setup State**: Configure game state for villain phase with specific monster deck
3. **Hall of the Orcs**: Draw and accept "Hall of the Orcs" encounter
   - Verify encounter card displays
   - Accept encounter to trigger deck manipulation
   - Verify notification shows: "Drew 5 monster cards. X Orcs placed on top, Y discarded."
4. **Revel in Destruction**: Draw and accept "Revel in Destruction" encounter
   - Spawn a damaged monster (Cultist at 1/2 HP)
   - Accept encounter to trigger healing
   - Verify notification shows: "Cultist healed: 1 → 2 HP"

## Special Encounter Cards Tested

1. **Hall of the Orcs** (Deck Manipulation)
   - Filters monster deck for Orc creature type
   - Shows count of cards drawn, kept, and discarded

2. **Revel in Destruction** (Monster Healing)
   - Heals first damaged monster by 1 HP
   - Shows monster name and HP change (before → after)

## Visual Elements Verified

- **EncounterEffectNotification** component displays correctly
- Purple gradient overlay with effect icon (⚡)
- Clear message text with specific counts and details
- "Continue" button to dismiss notification

## Programmatic Checks

- Encounter card displays with correct name and description
- Effect notification appears after accepting encounter
- Message text contains expected details (card counts, HP values)
- Redux store state reflects actual game state changes
  - Monster deck manipulation (cards filtered and discarded)
  - Monster HP changes (healing applied)
- Notification dismisses and clears state properly

## Screenshots

1. `000-character-select-screen.png` - Initial character selection
2. `001-game-state-ready-for-encounter.png` - Game board ready for encounter
3. `002-hall-of-orcs-encounter-card-displayed.png` - Hall of Orcs encounter card
4. `003-encounter-effect-notification-displayed.png` - **Deck manipulation notification**
5. `004-notification-dismissed.png` - Notification dismissed, game continues
6. `005-revel-in-destruction-encounter-card.png` - Revel in Destruction encounter
7. `006-revel-in-destruction-effect-notification.png` - **Monster healing notification**
8. `007-monster-healed-notification-dismissed.png` - Final state verification

## Related Encounter Cards

This notification system also works for:
- **Lost**: "Bottom tile moved to top of deck (X tiles remaining)"
- **Duergar Outpost**: "Drew 5 monster cards. X Devils placed on top, Y discarded."
- **Kobold Warren**: "Drew 5 monster cards. X Reptiles placed on top, Y discarded."
- **Unnatural Corruption**: "Drew 5 monster cards. X Aberrants placed on top, Y discarded."
- **Deadly Poison**: "X poisoned heroes took 1 damage" (when heroes are poisoned)
