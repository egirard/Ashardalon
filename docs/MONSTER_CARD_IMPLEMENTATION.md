# Monster Card Implementation Status

This document tracks the implementation status of monster card tactics from the official Wrath of Ashardalon monster cards.

## Overview

Each monster in Wrath of Ashardalon has a card that defines:
1. **Stats**: AC, HP, XP value
2. **Attack**: Name, attack bonus, damage
3. **Tactics**: Conditional AI rules for monster behavior

## Implementation Status Legend

- ✅ **FULLY IMPLEMENTED**: All card rules are working
- ⚠️ **PARTIALLY IMPLEMENTED**: Basic behavior works, some features missing
- ❌ **NOT IMPLEMENTED**: Monster exists but uses default AI only
- 📋 **DOCUMENTED**: Complex behavior documented for future implementation

## Currently Implemented Monsters

### Kobold Dragonshield
**Status**: ✅ FULLY IMPLEMENTED

| Stat | Value | Implemented |
|------|-------|-------------|
| AC | 16 | ✅ |
| HP | 1 | ✅ |
| XP | 1 | ✅ |
| Attack | Sword +7 | ✅ |
| Damage | 1 | ✅ |

**Card Tactics**:
| Rule | Status | Notes |
|------|--------|-------|
| If adjacent to Hero, attack with sword | ✅ | Working |
| If on tile with unexplored edge and no heroes, explore | ❌ | Not implemented |
| Otherwise, move 1 tile toward closest Hero | ✅ | Working |

### Snake
**Status**: ⚠️ PARTIALLY IMPLEMENTED

| Stat | Value | Implemented |
|------|-------|-------------|
| AC | 13 | ✅ |
| HP | 1 | ✅ |
| XP | 1 | ✅ |
| Attack | Bite +7 | ✅ |
| Damage | 1 + Poisoned | ⚠️ |

**Card Tactics**:
| Rule | Status | Notes |
|------|--------|-------|
| If within 1 tile of Hero, move adjacent AND attack | ✅ | Working |
| Poisoned status effect on hit | ❌ | Not implemented |
| Otherwise, move 1 tile toward closest Hero | ✅ | Working |

### Human Cultist
**Status**: ⚠️ PARTIALLY IMPLEMENTED

| Stat | Value | Implemented |
|------|-------|-------------|
| AC | 14 | ✅ |
| HP | 1 | ✅ |
| XP | 1 | ✅ |
| Attack | Dagger +6 | ✅ |
| Damage | 1 + Poisoned | ⚠️ |

**Card Tactics**:
| Rule | Status | Notes |
|------|--------|-------|
| If within 1 tile of Hero, move adjacent AND attack | ✅ | Working |
| Poisoned status effect on hit | ❌ | Not implemented |
| Otherwise, move 1 tile toward closest Hero | ✅ | Working |

## Monsters Requiring Complex Implementation

The following monsters have complex behaviors that require additional game systems to be implemented first.

### Orc Smasher ✅
**Status**: FULLY IMPLEMENTED

| Stat | Value | Implemented |
|------|-------|-------------|
| AC | 15 | ✅ |
| HP | 2 | ✅ |
| XP | 2 | ✅ |
| Attack | Heavy Mace +9 | ✅ |
| Damage | 1 | ✅ |

**Card Tactics**:
| Rule | Status | Notes |
|------|--------|-------|
| Within 1 tile: Move adjacent AND attack | ✅ | Working |
| Heavy Mace (+9, 1 damage) | ✅ | Working |
| Otherwise, move 1 tile toward closest Hero | ✅ | Working |

### Grell ⚠️
**Status**: PARTIALLY IMPLEMENTED
**Requires**: Area attack (not yet implemented)

| Stat | Value | Implemented |
|------|-------|-------------|
| AC | 14 | ✅ |
| HP | 1 | ✅ |
| XP | 2 | ✅ |

**Card Tactics**:
| Rule | Status | Notes |
|------|--------|-------|
| Adjacent: Venomous Bite (Poisoned, miss: 1 damage) | ✅ | Working |
| Within 1 tile: Tentacles (Dazed) | ✅ | Working - uses move-and-attack |
| Different attacks at different ranges | ✅ | Working |

**Implementation Notes**: The Grell's ranged attack system is now functional. It uses `adjacentAttack` for Venomous Bite when adjacent (with poisoned status and miss damage) and `moveAttack` for Tentacles when within 1 tile (with dazed status). The AI will automatically select the correct attack based on distance to hero.

### Orc Archer ⚠️
**Status**: PARTIALLY IMPLEMENTED
**Requires**: Area attack (not yet implemented)

| Stat | Value | Implemented |
|------|-------|-------------|
| AC | 13 | ✅ |
| HP | 1 | ✅ |
| XP | 1 | ✅ |

**Card Tactics**:
| Rule | Status | Notes |
|------|--------|-------|
| Adjacent: Punch (+6, 1 damage + Dazed) | ✅ | Working |
| Within 2 tiles: Arrow (+6, 2 damage, miss: 1 damage) | ✅ | Working - uses move-and-attack |
| 2-tile attack range | ✅ | Working |

**Implementation Notes**: The Orc Archer's ranged attack system is now functional. It uses `adjacentAttack` for Punch when adjacent (with dazed status) and `moveAttack` for Arrow when within 2 tiles (with miss damage). The AI will automatically select the correct attack based on distance to hero.

### Cave Bear 📋
**Requires**: Area-of-effect attacks, Dazed condition

| Tactic | Complexity | Required System |
|--------|------------|-----------------|
| Attack ALL heroes on same tile | High | Multi-target attack system |
| Leaping strike (2 damage + Dazed) | Medium | Dazed condition |
| Frenzy of claws on same tile | High | Same-tile area attack |

### Duergar Guard 📋
**Requires**: Monster-triggered exploration

| Tactic | Complexity | Required System |
|--------|------------|-----------------|
| If adjacent, attack with warhammer | Low | Already working |
| Explore when on tile with unexplored edge (no heroes) | High | Monster exploration trigger |
| Move toward hero otherwise | Low | Already working |

### Gibbering Mouther 📋
**Requires**: Area attack, Dazed condition

| Tactic | Complexity | Required System |
|--------|------------|-----------------|
| Attack ALL heroes within 1 tile | High | Area attack within range |
| Dazed on hit | Medium | Dazed condition |

### Grell 📋
**Requires**: Multiple attack types, conditions, miss damage

| Tactic | Complexity | Required System |
|--------|------------|-----------------|
| Adjacent: Venomous Bite (Poisoned, miss: 1 damage) | High | Conditions, miss damage |
| Within 1 tile: Tentacles (Dazed) | Medium | Dazed condition |
| Different attacks at different ranges | Medium | Attack selection by range |

### Legion Devil 📋
**Requires**: Spawn multiple monsters

| Tactic | Complexity | Required System |
|--------|------------|-----------------|
| Spawn 2 additional Legion Devils on placement | High | Multi-monster spawn |
| XP only awarded when ALL are destroyed | Medium | Linked monster tracking |
| Move-and-attack within 1 tile | Low | Already implemented |

### Orc Archer 📋
**Requires**: Ranged attacks, miss damage, conditions

| Tactic | Complexity | Required System |
|--------|------------|-----------------|
| Adjacent: Punch (+6, 1 damage + Dazed) | Medium | Dazed condition |
| Within 2 tiles: Arrow (+6, 2 damage, miss: 1 damage) | High | Ranged attack, miss damage |
| 2-tile attack range | Medium | Extended range attacks |

### Orc Smasher 📋
**Already partially working** as move-and-attack would work with current system.

| Tactic | Complexity | Required System |
|--------|------------|-----------------|
| Within 1 tile: Move adjacent AND attack | Low | Already implemented |
| Heavy Mace (+9, 1 damage) | Low | Just needs stats added |

## Required Game Systems (Priority Order)

To fully implement all monsters, the following systems need to be built:

### Completed ✅
1. **Condition System**: Track Poisoned, Dazed states per hero - COMPLETE
2. **Miss Damage**: Allow attacks to deal damage on miss - COMPLETE
3. **Multi-Range Attacks**: Different attacks at different ranges - COMPLETE
4. **Player Choice for Monster Movement**: When monsters have multiple valid movement/targeting options, prompt player to choose - COMPLETE
   - Multiple equidistant heroes for targeting
   - Multiple adjacent heroes for attack selection
   - Multiple equidistant move destinations
   - Multiple positions adjacent to target (for move-and-attack)

### High Priority
1. **Area Attacks**: Attack multiple targets (same tile, within range)

### Low Priority
2. **Monster Exploration**: Allow monsters to trigger tile exploration
3. **Linked Monsters**: Track spawned monster groups for XP
4. **Multi-monster Spawn**: Spawn additional monsters on placement

## Monster AI Behavior Patterns

### Automatic (No Player Choice Needed)
- Single closest hero → Monster automatically moves toward it
- Single adjacent hero → Monster automatically attacks it
- Single valid move destination → Monster automatically moves there

### Player Choice Required (Implemented ✅)
When monsters encounter ambiguous situations, the game pauses the villain phase and prompts the player:

1. **Multiple Equidistant Heroes**: When 2+ heroes are at the same distance, player selects which hero the monster should target for movement
2. **Multiple Adjacent Heroes**: When monster is adjacent to 2+ heroes, player selects which hero to attack
3. **Multiple Move Destinations**: When monster has 2+ equidistant moves toward target, player selects destination square (highlighted with golden border and target indicator 🎯)
4. **Multiple Adjacent Positions (Move-and-Attack)**: When monster with move-and-attack can reach multiple positions adjacent to hero, player selects final position

**UI Implementation:**
- `MonsterDecisionPrompt` modal displays available options
- Valid destination squares highlighted on game board with golden pulsing animation
- Click on highlighted square or hero button to make selection
- Villain phase automatically continues after selection

**Affects All Monsters:**
Every monster can potentially encounter these situations depending on board state and hero positioning. The system is universal and applies to all monster types.

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024 | Initial implementation with Kobold, Snake, Cultist |
| 2.0 | 2026-01 | Added player choice system for ambiguous monster movement/targeting |
