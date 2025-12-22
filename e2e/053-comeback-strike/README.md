# 053 - Comeback Strike: On-Hit Healing and Miss No-Flip

## User Story

As a player controlling Vistra (Fighter) with the Comeback Strike power card, I want to:
1. **When my attack hits**: Deal damage and regain 2 hit points
2. **When my attack misses**: Have the card remain available (not flipped) so I can use it again

This test validates the special behavior of the Comeback Strike daily power card (ID 15).

## Test Structure

This test suite contains two separate test cases:

### Test 1: Hit Scenario - Card Flips (✅ PASSING)
Validates that when Comeback Strike hits:
- The attack deals damage
- The power card is flipped (normal daily behavior)
- The monster is defeated

### Test 2: Miss Scenario - Card Stays Available (⚠️ CURRENTLY FAILING)
Validates that when Comeback Strike misses:
- The attack misses
- The power card is NOT flipped (special behavior)
- The monster remains alive

**Status**: This test currently fails because the "no-flip on miss" feature has not been implemented yet. The `missEffects` are properly parsed by the action card parser, but the game logic doesn't yet prevent the card from being flipped when the attack misses.

## Screenshots

### Test 1: Hit Scenario

![Screenshot 000](053-comeback-strike.spec.ts-snapshots/000-vistra-with-comeback-strike-chromium-linux.png)
**Step 1**: Vistra selected with Comeback Strike as the daily power

![Screenshot 001](053-comeback-strike.spec.ts-snapshots/001-game-ready-with-monster-chromium-linux.png)
**Step 2**: Game started with Kobold adjacent to Vistra, Comeback Strike available

![Screenshot 002](053-comeback-strike.spec.ts-snapshots/002-comeback-strike-selected-chromium-linux.png)
**Step 3**: Comeback Strike selected for attack

![Screenshot 003](053-comeback-strike.spec.ts-snapshots/003-comeback-strike-hit-result-chromium-linux.png)
**Step 4**: Attack hits (roll 17 + 7 = 24 vs AC 15), showing combat result

![Screenshot 004](053-comeback-strike.spec.ts-snapshots/004-after-hit-card-flipped-chromium-linux.png)
**Step 5**: After hit, monster defeated and Comeback Strike is flipped (normal daily behavior)

### Test 2: Miss Scenario

![Screenshot 000](053-comeback-strike.spec.ts-snapshots/000-vistra-selected-chromium-linux.png)
**Step 1**: Vistra selected with powers

![Screenshot 001](053-comeback-strike.spec.ts-snapshots/001-ready-for-miss-test-chromium-linux.png)
**Step 2**: Game ready with Cultist adjacent, Comeback Strike available

![Screenshot 002](053-comeback-strike.spec.ts-snapshots/002-comeback-strike-selected-for-miss-chromium-linux.png)
**Step 3**: Comeback Strike selected for attack

![Screenshot 003](053-comeback-strike.spec.ts-snapshots/003-comeback-strike-miss-result-chromium-linux.png)
**Step 4**: Attack misses (roll 5 + 7 = 12 vs AC 13), showing combat result

**Expected (not yet implemented)**: Card should remain unflipped after dismissing result
**Actual**: Card is flipped even on miss

## Card Details

**Comeback Strike (ID 15)**
- **Type**: Daily
- **Class**: Fighter
- **Attack Bonus**: +7
- **Damage**: 2
- **Rule**: "Attack one adjacent Monster. If you hit, you regain 2 hit points. If you miss, do not flip this card over."

## Implementation Status

- ✅ Card data defined in `src/store/powerCards.ts`
- ✅ Miss effects parsed correctly in `src/store/actionCardParser.ts`
- ⚠️ Miss effects not yet applied in game logic
- ⚠️ Healing on hit may require UI interaction to apply

## Related Files

- `src/store/powerCards.ts` - Card definition
- `src/store/actionCardParser.ts` - Parsing of hit/miss effects
- `src/store/gameEvents.ts` - Event system (could be used for miss handling)
- `src/store/heroesSlice.ts` - Power card flip logic

## Manual Verification Checklist

- [ ] Comeback Strike can be selected as a daily power for Vistra
- [ ] When Comeback Strike hits, the hero is healed (displayed in UI)
- [ ] When Comeback Strike hits, the card is flipped (used)
- [ ] When Comeback Strike misses, the card remains available (not flipped) ⚠️ **NOT YET IMPLEMENTED**
- [ ] Combat results show appropriate feedback for hits and misses
