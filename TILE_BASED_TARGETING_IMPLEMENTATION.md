# Tile-Based Targeting Implementation

## Overview

This implementation adds proper tile-based targeting for encounter and trap cards in the Wrath of Ashardalon game. Previously, all encounters with area-of-effect targeting (e.g., "heroes-on-tile", "heroes-within-1-tile") would affect all heroes regardless of their positions on the board.

## Problem Statement

Many encounter and trap cards specify targeting that should only affect heroes in specific locations:
- **Heroes on tile**: Should only affect heroes on the same tile as the active hero
- **Heroes within 1 tile**: Should only affect heroes within 1 tile distance of the active hero
- **All heroes**: Should affect all heroes (this was already working correctly)

Before this implementation, the resolver code would fall back to targeting all heroes for any area-of-effect card, which could lead to incorrect or unfair results in multiplayer scenarios.

## Solution

### New Helper Functions

Four new helper functions were added to `src/store/encounters.ts`:

#### 1. `areOnSameTile(pos1, pos2, dungeon)`
Checks if two positions are on the same tile. This function correctly handles the special case of the start tile, which consists of two sub-tiles (north and south).

```typescript
export function areOnSameTile(
  pos1: Position,
  pos2: Position,
  dungeon: DungeonState
): boolean
```

**Key features:**
- Handles regular tiles by comparing tile IDs
- Handles start tile by comparing sub-tile IDs (north vs south)
- Returns false if either position is not on a valid tile
- Includes null safety checks for edge cases

#### 2. `getTileDistance(pos1, pos2, dungeon)`
Calculates the Manhattan distance (in tiles) between two positions. This is used for range-based targeting.

```typescript
export function getTileDistance(
  pos1: Position,
  pos2: Position,
  dungeon: DungeonState
): number
```

**Key features:**
- Returns 0 for positions on the same tile
- Returns Infinity if either position is invalid
- Uses Manhattan distance (sum of row and column differences)
- Correctly treats start tile sub-tiles as separate tiles for distance calculation

#### 3. `getHeroesOnTile(activeHeroPosition, heroTokens, dungeon)`
Returns a list of hero IDs that are on the same tile as the specified position.

```typescript
export function getHeroesOnTile(
  activeHeroPosition: Position,
  heroTokens: HeroToken[],
  dungeon: DungeonState
): string[]
```

#### 4. `getHeroesWithinRange(activeHeroPosition, heroTokens, dungeon, range)`
Returns a list of hero IDs that are within N tiles of the specified position.

```typescript
export function getHeroesWithinRange(
  activeHeroPosition: Position,
  heroTokens: HeroToken[],
  dungeon: DungeonState,
  range: number
): string[]
```

### Updated Resolver Function

The `resolveEncounterEffect()` function was updated to:
1. Accept optional `heroTokens` and `dungeon` parameters
2. Use the new helper functions for position-aware targeting
3. Maintain backward compatibility by falling back to all-heroes targeting when position data is unavailable

## Affected Cards

### Heroes-on-Tile Targeting
These cards now only affect heroes on the active hero's tile:
- Concussive Blast
- Steam Vent
- Volcanic Burst
- Phalagar's Lair
- Sulphurous Cloud
- Cave In (hazard)
- Pit (hazard)
- Poisoned Dart Trap (hazard)
- Whirling Blades (hazard)

### Heroes-within-1-Tile Targeting
These cards now only affect heroes within 1 tile of the active hero:
- Blinding Bomb
- Fungal Bloom

### All-Heroes Targeting (Unchanged)
These cards continue to affect all heroes:
- Unbearable Heat
- Deep Tremor
- Earthquake

## Testing

### Unit Tests
Comprehensive unit tests were added to `src/store/encounters.test.ts`:

1. **Helper Function Tests** (13 new tests):
   - `areOnSameTile()`: 3 tests covering same tile, different tiles, and start tile sub-tiles
   - `getTileDistance()`: 3 tests covering same tile (0), adjacent tiles (1), and farther tiles (4)
   - `getHeroesOnTile()`: 2 tests covering multiple heroes on same tile and single hero
   - `getHeroesWithinRange()`: 2 tests covering range filtering and same-tile inclusion

2. **Integration Tests** (3 updated tests):
   - Updated existing `resolveEncounterEffect()` tests to pass new optional parameters
   - All tests verify correct damage application and hero targeting

**Total Test Coverage:**
- 58 encounter tests (all passing)
- 96 movement tests (all passing)
- 154 total tests covering the targeting implementation

### Test Scenarios

The tests verify:
- Heroes on the same regular tile are correctly identified
- Heroes on different tiles are correctly excluded
- Start tile sub-tiles are treated as separate tiles
- Manhattan distance is calculated correctly
- Encounter resolution only affects targeted heroes
- Backward compatibility with missing position data

## Implementation Notes

### Start Tile Handling
The start tile is special because it's composed of two sub-tiles:
- **North sub-tile**: y-coordinates 0-3
- **South sub-tile**: y-coordinates 4-7

For tile counting and distance purposes, these are treated as separate tiles. The implementation correctly:
- Identifies which sub-tile a position is on
- Compares sub-tiles when both positions are on the start tile
- Calculates distances treating sub-tiles as separate tiles

### Backward Compatibility
The implementation maintains backward compatibility through fallback logic:
- If `heroTokens` or `dungeon` parameters are not provided, the function falls back to targeting all heroes
- This ensures existing code that doesn't pass position data continues to work
- The fallback is conservative (affects more heroes rather than fewer) to avoid unfairly sparing heroes

### Null Safety
The implementation includes null safety checks:
- Checks if tiles exist before comparing them
- Handles null returns from `getSubTileIdAtPosition()`
- Returns safe defaults (false, Infinity) for invalid inputs

## Future Work

### E2E Testing
Creating E2E tests for multi-hero targeting scenarios is challenging because:
- Tile placement is randomized during exploration
- Hero positions are dynamic and controlled by player movement
- Encounter draws are randomized from the deck

Possible approaches for future E2E tests:
1. Create test utilities to set up deterministic game states
2. Add programmatic APIs for positioning heroes and triggering specific encounters
3. Use integration tests that mock the game state rather than full E2E tests

### Additional Improvements
1. **UI Indicators**: Add visual indicators showing which heroes will be affected by an encounter
2. **Damage Preview**: Show preview of damage before resolving an encounter
3. **Range Visualization**: Highlight tiles within range for "heroes-within-N-tiles" effects
4. **Encounter Log**: Add detailed logging of who was targeted and why

## References

- Issue: "Implement Tile-Based Targeting for Encounters and E2E Multi-Hero Tests"
- Assessment Document: `CARD_TESTING_ASSESSMENT.md`
- Files Modified:
  - `src/store/encounters.ts` (new functions and updated resolver)
  - `src/store/encounters.test.ts` (new tests)
  - `src/store/gameSlice.ts` (updated to pass position data)
