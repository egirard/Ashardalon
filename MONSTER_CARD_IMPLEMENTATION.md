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

### High Priority
1. **Condition System**: Track Poisoned, Dazed states per hero
2. **Miss Damage**: Allow attacks to deal damage on miss

### Medium Priority  
3. **Area Attacks**: Attack multiple targets (same tile, within range)
4. **Ranged Attacks**: Allow attacks at 2+ tile distance

### Low Priority
5. **Monster Exploration**: Allow monsters to trigger tile exploration
6. **Linked Monsters**: Track spawned monster groups for XP
7. **Multi-monster Spawn**: Spawn additional monsters on placement

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024 | Initial implementation with Kobold, Snake, Cultist |
