# Card Testing Assessment: Area/Tile-Based Multi-Entity and Token-Related Effects

This document provides a comprehensive assessment of all cards mentioned in the issue that affect multiple entities on a tile (heroes/monsters/tokens), or involve tokens or hero placements.

## Executive Summary

Based on review of existing tests, code, and documentation:

- **Shock Sphere (ID 46)**: ⚠️ **Partially tested** - Has scenario verification test but not full E2E attack execution
- **Hurled Breath (ID 41)**: ✅ **Fully tested** - Comprehensive E2E test with multiple monsters
- **Blade Barrier (ID 5)**: ⚠️ **Token rendering tested, placement UI not implemented**
- **Flaming Sphere (ID 45)**: ⚠️ **Token rendering tested, movement/damage UI not implemented**
- **Tornado Strike (ID 37)**: ✅ **Multi-hit tested, hero placement UI not implemented**
- **Encounter/Monster cards with multi-entity effects**: ⚠️ **Implemented but limited testing**

## Detailed Assessment

### Power Cards

#### 1. Shock Sphere (ID: 46)
**Status**: ⚠️ PARTIALLY TESTED

**Card Details**:
- Type: Daily (Wizard)
- Effect: "Choose a tile within 2 tiles of you. Attack each Monster on that tile."
- Attack Bonus: +9
- Damage: 2

**Implementation Status**:
- ✅ Card definition exists in `src/store/powerCards.ts` (line 117)
- ✅ Parser correctly identifies as area attack (maxTargets: -1) in unit tests
- ✅ Card appears in power card selection UI
- ⚠️ E2E test exists (`e2e/050-area-attacks-tile`) but only validates scenario setup
- ❌ No E2E test showing actual attack execution against multiple monsters

**Test Coverage**:
- Unit tests: ✅ Parsing verified in `src/store/actionCardParser.test.ts` (lines 162-172)
- E2E tests: ⚠️ Test 050 step 2 validates scenario but doesn't execute attack

**Recommendation**: **CREATE ISSUE** - Add full E2E test showing Shock Sphere attacking 3+ monsters with sequential combat results

---

#### 2. Hurled Breath (ID: 41)
**Status**: ✅ FULLY TESTED

**Card Details**:
- Type: Daily (Custom Ability - Dragonborn/Haskan)
- Effect: "Choose a tile within 2 tiles of you. Attack each Monster on that tile. This attack does not count as an attack action."
- Attack Bonus: +5
- Damage: 1

**Implementation Status**:
- ✅ Card definition exists
- ✅ Parser correctly identifies as area attack (maxTargets: -1)
- ✅ Full E2E test with 3 monsters on same tile
- ✅ Sequential combat results verified
- ✅ Special rule tested: Does not consume attack action

**Test Coverage**:
- Unit tests: ✅ Parser tests
- E2E tests: ✅ Test 050 step 1 - Complete attack flow with 3 monsters

**Issues Found**: None

---

#### 3. Blade Barrier (ID: 5)
**Status**: ⚠️ TOKEN RENDERING TESTED, PLACEMENT UI NOT IMPLEMENTED

**Card Details**:
- Type: Daily (Cleric)
- Effect: "Choose a tile within 2 tiles of you. Place five Blade Barrier tokens on five different squares on that tile. When a Monster is placed on a square with a Blade Barrier token, remove that token and deal 1 damage to the Monster."

**Implementation Status**:
- ✅ Card definition exists
- ✅ Board token system implemented (`src/store/boardTokens.ts`)
- ✅ Token rendering implemented (visual display with sword emoji ⚔️)
- ✅ Damage trigger on monster spawn implemented
- ❌ UI for tile/position selection not implemented
- ❌ UI for activating token-placement cards not implemented

**Test Coverage**:
- Unit tests: ✅ Token system tests in `src/store/boardTokens.test.ts`
- E2E tests: ✅ Test 033 - Token placement and rendering (programmatic placement only)
- ⚠️ Test uses programmatic token placement, not UI interaction

**Documented Limitations** (from `e2e/033-board-tokens/README.md`):
- "Token placement UI not tested (requires modal implementation)"
- "Blade Barrier damage trigger only verified at component level (automatic during monster spawn)"
- Test Note: "This test uses programmatic token placement since the UI for token placement is not yet implemented"

**Recommendation**: **CREATE ISSUE** - Implement UI for:
1. Selecting a tile within range for token placement
2. Selecting 5 different squares on that tile
3. Visual feedback during placement
4. Activating the Blade Barrier card from power card dashboard

---

#### 4. Flaming Sphere (ID: 45)
**Status**: ⚠️ TOKEN RENDERING TESTED, MOVEMENT/DAMAGE UI NOT IMPLEMENTED

**Card Details**:
- Type: Daily (Wizard)
- Effect: "Place 3 Flaming Sphere tokens in a stack on any square within 1 tile of you. Instead of moving during your Hero phase, you can move the Flaming Sphere stack 1 tile. At the end of your Hero Phase, you can remove 1 Flaming Sphere token and deal 1 damage to each Monster on that tile."

**Implementation Status**:
- ✅ Card definition exists
- ✅ Board token system supports charges
- ✅ Token rendering with charge counter (fire emoji 🔥)
- ✅ Damage calculation implemented (`getFlamingSphereDamageTargets` in `src/store/powerCardEffects.ts`)
- ❌ UI for initial placement not implemented
- ❌ UI for moving token during hero phase not implemented
- ❌ UI for triggering damage at end of hero phase not implemented

**Test Coverage**:
- Unit tests: ✅ Damage target calculation in `src/store/powerCardEffects.test.ts`
- E2E tests: ✅ Test 033 - Token with charges rendering (programmatic placement only)
- ⚠️ No test for movement or damage triggering

**Documented Limitations** (from `e2e/033-board-tokens/README.md`):
- "Flaming Sphere movement not tested (requires hero phase controls)"
- "Future Test Coverage: Token placement via power card usage UI, Flaming Sphere movement during hero phase"

**Recommendation**: **CREATE ISSUE** - Implement UI for:
1. Initial placement (select square within 1 tile)
2. Movement option during hero phase (forfeit move to move sphere 1 tile)
3. End-of-phase damage trigger (remove 1 token, damage all monsters on tile)
4. Visual feedback showing sphere can be moved/activated

---

#### 5. Tornado Strike (ID: 37)
**Status**: ✅ MULTI-HIT TESTED, ⚠️ HERO PLACEMENT UI NOT IMPLEMENTED

**Card Details**:
- Type: Daily (Rogue)
- Effect: "Attack four times. Each attack can be against any Monster on your tile. After the attacks, place your Hero on any square on your tile."
- Attack Bonus: +7
- Damage: 1

**Implementation Status**:
- ✅ Card definition exists
- ✅ Multi-attack system fully implemented (4 attacks, different targets allowed)
- ✅ Attack sequence with progress tracking
- ✅ Sequential combat results
- ✅ Proper card flipping (after first attack)
- ❌ UI for hero placement after attacks not implemented

**Test Coverage**:
- Unit tests: ✅ Parser tests for multi-attack
- E2E tests: ✅ Test 054 - Complete 4-attack sequence with different targets
- ✅ Tests defeat notifications during sequence
- ✅ Tests same-target and different-target scenarios
- ⚠️ Hero placement after attacks not tested (UI not implemented)

**Documented Limitations** (from `docs/UNPARSED_CARDS.md`):
- "What's Not Parsed: Hero placement after attacks (requires UI for square selection)"
- "Manual Implementation Needed: The hero placement after the attacks would need a separate UI interaction"

**Acceptance Criteria Status**:
- ✅ Multi-attack (4 times) working
- ✅ Target selection for each attack
- ✅ Sequential execution
- ✅ Progress tracking
- ❌ Hero placement after attacks (not implemented)

**Recommendation**: **CREATE ISSUE** - Implement UI for hero placement:
1. After all 4 attacks complete, show square selection UI
2. Allow player to select any square on current tile
3. Move hero to selected square
4. Complete the power card usage

---

### Encounter/Monster Cards with Multi-Entity Effects

#### Status: ⚠️ IMPLEMENTED BUT LIMITED E2E TESTING

**Multi-Hero Damage Events** (Implemented):

1. **Unbearable Heat** (ID: unbearable-heat)
   - Effect: "Each Hero takes 1 damage"
   - Target: `all-heroes`
   - Status: ✅ Implemented, ✅ Unit tested

2. **Deep Tremor** (ID: deep-tremor)
   - Effect: "Attack +8 vs each Hero. Hit: 1 damage."
   - Target: `all-heroes`
   - Status: ✅ Implemented, ✅ Unit tested

3. **Earthquake** (ID: earthquake)
   - Effect: "Attack +6 vs each Hero. Hit: 2 damage and Dazed. Miss: 1 damage."
   - Target: `all-heroes`
   - Status: ✅ Implemented, ✅ Unit tested

4. **Concussive Blast** (ID: concussive-blast)
   - Effect: "Attack +8 vs each Hero on the active Hero's tile. Hit: 2 damage. Miss: 1 damage."
   - Target: `heroes-on-tile`
   - Status: ✅ Implemented (treated as all-heroes currently)

5. **Steam Vent** (ID: steam-vent)
   - Effect: "Attack +8 vs each Hero on the active Hero's tile. Hit: 2 damage. Miss: 1 damage."
   - Target: `heroes-on-tile`
   - Status: ✅ Implemented (treated as all-heroes currently)

6. **Volcanic Burst** (ID: volcanic-burst)
   - Effect: "Attack +6 vs each Hero on the active Hero's tile. Hit: 3 damage. Miss: 1 damage."
   - Target: `heroes-on-tile`
   - Status: ✅ Implemented (treated as all-heroes currently)

7. **Blinding Bomb** (ID: blinding-bomb)
   - Effect: "Attack +8 vs each Hero within 1 tile of the active Hero. Hit: Dazed."
   - Target: `heroes-within-1-tile`
   - Status: ✅ Implemented (treated as all-heroes currently)

8. **Fungal Bloom** (ID: fungal-bloom)
   - Effect: "Attack +8 vs the active Hero and each Hero within 1 tile. Hit: Dazed and Poisoned."
   - Target: `heroes-within-1-tile`
   - Status: ✅ Implemented (treated as all-heroes currently)

9. **Phalagar's Lair** (ID: phalagars-lair)
   - Effect: "Attack +4 vs each Hero on the active Hero's tile. Hit: 3 damage and Dazed. Miss: 1 damage."
   - Target: `heroes-on-tile`
   - Status: ✅ Implemented (treated as all-heroes currently)

10. **Sulphurous Cloud** (ID: sulphurous-cloud)
    - Effect: "Attack +8 vs each Hero on the active Hero's tile. Hit: 1 damage and Poisoned. Miss: Poisoned."
    - Target: `heroes-on-tile`
    - Status: ✅ Implemented (treated as all-heroes currently)

**Hazard/Trap Cards** (Attack all heroes on tile):

11. **Cave In** (ID: cave-in-hazard)
    - Effect: "Attack +9 vs each Hero on tile. Hit: 2 damage. Miss: 1 damage."
    - Status: ✅ Implemented (treated as all-heroes currently)

12. **Pit** (ID: pit)
    - Effect: "Attack +10 vs each Hero on tile. Hit: 2 damage and hero falls into pit."
    - Status: ✅ Implemented (treated as all-heroes currently)

13. **Poisoned Dart Trap** (ID: poisoned-dart-trap)
    - Effect: "Each Villain Phase: Attack +8 vs each Hero on tile. Hit: 2 damage and Poisoned. Miss: 1 damage."
    - Status: ✅ Implemented (treated as all-heroes currently)

14. **Whirling Blades** (ID: whirling-blades)
    - Effect: "Each Villain Phase: Attack +8 vs each Hero on tile. Hit: 2 damage. Miss: 1 damage."
    - Status: ✅ Implemented (treated as all-heroes currently)

**Power Cards Affecting Multiple Heroes on Tile**:

15. **Righteous Smite** (ID: 27)
    - Effect: "Attack one adjacent Monster. Hit or Miss: All Heroes on your tile regain 1 Hit Point."
    - Status: ✅ Implemented, ✅ E2E tested (test 051)

16. **Healing Hymn** (ID: 1)
    - Effect: "You and one other Hero on your tile regain 2 Hit Points."
    - Status: ✅ Implemented

17. **Cleric's Shield** (ID: 2)
    - Effect: "Hit or Miss: Choose 1 Hero on your tile. That Hero gains a +2 bonus to AC."
    - Status: ✅ Implemented

18. **Righteous Advance** (ID: 3)
    - Effect: "Hit or Miss: One Hero on your tile moves 2 squares."
    - Status: ✅ Implemented

**Test Coverage**:
- Unit tests: ✅ Extensive tests in `src/store/encounters.test.ts` and `src/store/gameSlice.test.ts`
- E2E tests: ⚠️ Limited E2E coverage for multi-hero scenarios

**Known Limitation** (from `src/store/encounters.ts`):
```typescript
// TODO: Implement proper tile-based targeting for 'heroes-on-tile' and 'heroes-within-1-tile'
// This would require passing hero positions and tile information to the resolver.
// For now, treat all area targets as all heroes (conservative approach that ensures
// no heroes are unfairly spared from attacks that should hit them).
```

**Recommendation**: **CREATE ISSUE** - Two parts:
1. Implement proper tile-based targeting (differentiate between all-heroes, heroes-on-tile, heroes-within-1-tile)
2. Add E2E tests for multi-hero encounter scenarios with 2+ heroes

---

### Treasure Cards with Multi-Hero Effects

**Blessed Shield** (ID: 137):
- Rule: "You and all Heroes on your tile gain a +2 bonus to AC while this item is in play."
- Status: ⚠️ Only applies to owner (documented in `src/store/treasure.ts`)
- Comment: "Blessed Shield (137): '+2 AC for all Heroes on tile' only gives +2 to owner"

**Wand of Fear** (ID: 165):
- Rule: "Choose a tile within 1 tile of you. Place each Monster on that tile up to 2 tiles away from you."
- Effect: Affects all monsters on a tile
- Status: ⚠️ Effect description exists, implementation status unknown

**Recommendation**: **NO NEW ISSUE** - These are treasure items, not the focus of this specific issue about power cards and encounters

---

## Summary of Required Actions

### Issues to Create:

1. **Shock Sphere E2E Test** - Add full attack execution test with 3+ monsters
   - Priority: Medium
   - Estimated Effort: Small (1-2 hours)

2. **Blade Barrier UI Implementation** - Token placement interface
   - Priority: High
   - Estimated Effort: Large (4-8 hours)
   - Includes: Tile selection, square selection, activation from dashboard

3. **Flaming Sphere UI Implementation** - Movement and damage trigger interface
   - Priority: High
   - Estimated Effort: Large (6-10 hours)
   - Includes: Placement, movement during hero phase, damage trigger at end of phase

4. **Tornado Strike Hero Placement** - Post-attack hero positioning
   - Priority: Medium
   - Estimated Effort: Medium (2-4 hours)
   - Includes: Square selection UI after attack sequence

5. **Encounter Tile-Based Targeting** - Proper hero targeting based on position
   - Priority: Medium
   - Estimated Effort: Medium (3-5 hours)
   - Includes: Implementation and E2E tests with 2+ heroes

### No Issues Needed:

- **Hurled Breath**: Fully tested and working
- **Tornado Strike (multi-hit)**: Fully tested and working
- **Encounter/Monster multi-hero damage**: Implemented and unit tested (conservative approach acceptable)

---

## Conclusion

Of the 5 main cards in the issue:

- **2 cards** (Hurled Breath, Tornado Strike multi-hit) are **fully tested**
- **1 card** (Shock Sphere) needs **additional E2E test coverage**
- **2 cards** (Blade Barrier, Flaming Sphere) need **significant UI implementation work**

Additionally, Tornado Strike needs hero placement UI, and encounter cards could benefit from proper tile-based targeting.

**Total Recommended Issues**: 5 new tracking issues

---

*Assessment completed: 2024-12-29*
*Reviewer: GitHub Copilot*
*Based on: Code review, test analysis, and documentation review*
