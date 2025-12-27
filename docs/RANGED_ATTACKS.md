# Ranged Attack Mechanics

This document describes the ranged attack system implemented in the Wrath of Ashardalon digital game.

## Overview

Heroes can now use ranged power cards to attack monsters at a distance without being adjacent to them. The system faithfully implements the board game's range mechanics using tile-based distance calculations.

## Range Calculation

### Tile vs Square Distance

The game uses two distance metrics:

1. **Tile Distance (Chebyshev/Chessboard)**: Used for "within N tiles" abilities
   - Calculated as: `max(|x₁ - x₂|, |y₁ - y₂|)`
   - Represents the number of tiles you could move in a straight line or diagonal
   - Each tile is 4×4 squares

2. **Square Distance (Manhattan/Taxicab)**: Used for movement and some specific abilities
   - Calculated as: `|x₁ - x₂| + |y₁ - y₂|`
   - Represents actual movement distance in squares

### Range Examples

- **"Within 1 tile"** = Chebyshev distance ≤ 4 squares
- **"Within 2 tiles"** = Chebyshev distance ≤ 8 squares
- **"On your tile"** = Same tile as hero (including start tile sub-tiles)
- **"Adjacent"** = Orthogonally or diagonally adjacent (1 square away)

## Power Cards with Ranged Attacks

### Cleric (Quinn)
- **Sacred Flame** (At-Will, id: 4)
  - Range: Within 1 tile
  - Effect: Attack one monster, heal 1 HP on hit
  - Attack Bonus: +6, Damage: 1

### Rogue (Tarak)
- **Lucky Strike** (At-Will, id: 33)
  - Range: Within 1 tile
  - Effect: +1 damage on even attack rolls
  - Attack Bonus: +7, Damage: 1

- **Positioning Shot** (At-Will, id: 34)
  - Range: Within 2 tiles
  - Effect: Reposition monster after attack
  - Attack Bonus: +7, Damage: 1

### Wizard (Haskan)
- **Arc Lightning** (At-Will, id: 42)
  - Range: Within 1 tile (up to 2 targets)
  - Effect: Multi-target attack
  - Attack Bonus: +7, Damage: 1

- **Hypnotism** (At-Will, id: 43)
  - Range: Within 1 tile
  - Effect: Move monster, attack if near another monster
  - Attack Bonus: +9, Damage: 1

- **Ray of Frost** (At-Will, id: 44)
  - Range: Within 2 tiles
  - Effect: Long-range single target
  - Attack Bonus: +7, Damage: 1

### Dragonborn (Custom Ability)
- **Hurled Breath** (Daily, id: 41)
  - Range: Choose tile within 2 tiles
  - Effect: Attack all monsters on that tile
  - Attack Bonus: +5, Damage: 1

## UI Features

### Power Card Display
Ranged power cards now show range indicators:
- **"Range: 1 tile"** - Can target within 1 tile
- **"Range: 2 tiles"** - Can target within 2 tiles
- **"On tile"** - Can target monsters on same tile

### Target Selection
When a ranged power card is selected:
1. Only monsters within range are shown as valid targets
2. Monsters out of range are filtered out
3. Visual feedback shows which monsters can be attacked

### Attack Panel Behavior
- The power card attack panel appears when ANY targetable monster is in range
- Not limited to adjacent monsters anymore
- Shows all power cards, but only displays valid targets per card

## Implementation Details

### Core Functions

**Range Calculation** (`src/store/combat.ts`):
```typescript
getChebyshevDistance(pos1, pos2)     // Tile-based distance
getManhattanDistance(pos1, pos2)     // Square-based distance
isWithinTileRange(pos1, pos2, tiles) // Check if within N tiles
getMonstersWithinRange(position, monsters, tileRange, dungeon)
getMonstersOnSameTile(position, monsters, dungeon)
```

**UI Integration** (`src/components/GameBoard.svelte`):
```typescript
getTargetableMonstersForCurrentHero() // Returns all monsters in range
```

**Power Card Filtering** (`src/components/PowerCardAttackPanel.svelte`):
```typescript
canTargetMonster(cardId, monster)    // Check if card can target monster
getValidTargetsForCard(cardId)       // Get list of valid targets
```

### Action Card Parser

The parser automatically extracts range from power card text:
- "within 1 tile" → `targetType: 'within-tiles', range: 1`
- "within 2 tiles" → `targetType: 'within-tiles', range: 2`
- "on your tile" → `targetType: 'tile', range: 0`
- No range specified → `targetType: 'adjacent', range: 0`

## Coordinate System

The game uses a global coordinate system:
- **Start Tile**: Position (0,0), spans x: 0-3, y: 0-7
- **North Tiles**: Negative y coordinates
- **South Tiles**: Positive y coordinates (y ≥ 8)
- **East Tiles**: Positive x coordinates (x ≥ 4)
- **West Tiles**: Negative x coordinates

Monsters store local tile positions (0-3 for x and y on normal tiles), which are converted to global coordinates for range calculations.

## Testing

### Unit Tests
- 22 comprehensive unit tests for range calculations
- Tests cover Chebyshev distance, Manhattan distance, and range checking
- All tests verify cross-tile calculations work correctly

### E2E Tests
- Test 039 demonstrates ranged attacks with Haskan (Wizard)
- Shows Ray of Frost (2 tile range) and Arc Lightning (1 tile range)
- Verifies UI displays range indicators and filters targets correctly

## Future Enhancements

Potential additions:
1. Visual range indicators on the game board (highlight tiles in range)
2. Line-of-sight mechanics (blocked by walls)
3. Additional ranged attack treasure items
4. Range-based monster AI behaviors

## Backward Compatibility

The ranged attack system is fully backward compatible:
- All existing melee/adjacent attacks work as before
- No breaking changes to existing power cards
- All 847 unit tests pass with new implementation
- Existing e2e tests remain passing

## Related Documentation

- [Power Cards Implementation](../docs/POWER_CARDS_IMPLEMENTATION.md)
- [Treasure Implementation](TREASURE_IMPLEMENTATION.md)
- [E2E Test 039 - Ranged Attacks](../e2e/039-ranged-attacks/README.md)
