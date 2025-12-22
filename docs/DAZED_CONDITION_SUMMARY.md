# Dazed Condition - Implementation Summary

## Quick Reference

**Status**: Partially Implemented (Infrastructure exists, action restrictions not enforced)

**Full Documentation**: [DAZED_CONDITION_IMPLEMENTATION.md](../DAZED_CONDITION_IMPLEMENTATION.md)

## What is Dazed?

Dazed is a status condition that **limits a character to ONE action per turn** instead of the normal combination of actions.

### Normal Turn vs Dazed Turn

| Normal Turn | Dazed Turn |
|-------------|------------|
| Move + Attack | Move **OR** Attack |
| Attack + Move | Move **OR** Attack |
| Move + Move | Move only |

## Current Status

### ✅ Already Implemented

- Status type definition (`'dazed'` in StatusEffectType)
- Status display (😵 icon on hero cards)
- Status tracking in Redux state
- Helper function: `isDazed(statuses)`
- Duration-based expiration
- E2E test coverage for display

### ❌ Not Yet Implemented (Critical)

- **Action restriction enforcement** - Heroes can still take multiple actions when Dazed
- **Combat integration** - Monster attacks don't apply Dazed on hit
- **Encounter integration** - Encounter cards don't apply Dazed
- **UI feedback** - No indicator that actions are limited
- **Turn flow** - Turn doesn't end after single action when Dazed

## Implementation Priority

### Phase 1: Core Mechanics (HIGH PRIORITY)
1. Implement action restriction logic in gameSlice.ts
2. Update combat system to apply Dazed from monster attacks
3. Make hero turn end after single action when Dazed
4. Add unit tests for action restrictions

### Phase 2: UI/UX (MEDIUM PRIORITY)
5. Add "Dazed - Choose ONE action" indicator to action panel
6. Grey out action buttons after first action when Dazed
7. Enhance status tooltip with duration and restrictions

### Phase 3: Integration (MEDIUM PRIORITY)
8. Update encounter system to apply Dazed
9. Add comprehensive E2E tests
10. Handle edge cases (Dazed + Stunned, etc.)

## Monsters That Apply Dazed

These monsters can inflict Dazed status on hit:

| Monster | Attack | Notes |
|---------|--------|-------|
| Rage Drake | Fire Breath | Dazed only |
| Kraash | Spectral Ram | Dazed only |
| Ashardalon | Tail Slap | Dazed + Poisoned |
| Bellax | Eye Rays | Dazed only |
| Meerak | Spear | Dazed only |

## Key Rules

1. **Single Action Only**: Hero can move OR attack OR use a power (not combinations)
2. **Free Actions Still Work**: Picking up items doesn't count as the action
3. **Can Still Defend**: AC and HP are unaffected
4. **Duration-Based**: Most Dazed effects last 1-2 turns
5. **Stunned Overrides**: If both Stunned and Dazed, Stunned takes precedence

## Files to Modify

- `src/store/gameSlice.ts` - Action restriction logic
- `src/store/combat.ts` - Apply Dazed on monster hit
- `src/store/encounters.ts` - Apply Dazed from encounter cards
- UI components - Action panel, status display

## Testing

### Unit Tests Needed
- Action restriction enforcement
- Turn ending after single action
- Dazed expiration timing

### E2E Tests Needed
- Create test 046: Dazed action restrictions
- Verify UI indicators
- Test monster attacks applying Dazed

## References

- **Full Specification**: [DAZED_CONDITION_IMPLEMENTATION.md](../DAZED_CONDITION_IMPLEMENTATION.md)
- **Status Effects Module**: `src/store/statusEffects.ts`
- **E2E Test 034**: `e2e/034-status-effects/` (basic display)
- **Design Document**: `design.md` (line 698)

---

For complete implementation details, edge cases, and comprehensive testing requirements, see the full [Dazed Condition Implementation Guide](../DAZED_CONDITION_IMPLEMENTATION.md).
