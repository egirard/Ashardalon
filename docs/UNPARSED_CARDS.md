# Unparsed Action Cards Reference

This document lists action cards that could not be fully parsed automatically and explains why. These cards require manual handling or additional implementation to support their full effects.

## Parsing Status Summary

- **Total Power Cards**: 50
- **Fully Parsed**: 49 (98%)
- **Partially Parsed**: 1 (2%)

## Partially Parsed Cards

### Tornado Strike (ID: 37)
- **Type**: Daily
- **Hero Class**: Rogue
- **Reason**: Hero teleportation/placement

**Card Rule**:
> Attack four times. Each attack can be against any Monster on your tile.
> After the attacks, place your Hero on any square on your tile.

**What's Parsed**:
- ✅ Multi-attack (4 attacks)
- ✅ Target type (on tile)

**What's Not Parsed**:
- ❌ Hero placement after attacks (requires UI for square selection)

**Manual Implementation Needed**:
The hero placement after the attacks would need a separate UI interaction allowing the player to select any square on the tile.

---

## Cards with Complex Effects (Fully Functional but Special)

These cards are fully parsed but have complex effects that are noted:

### Cards with Movement Before Attack
- **Charge (ID: 12)**: "Move up to your speed, then attack one adjacent Monster"
- **Taunting Advance (ID: 17)**: "Move your speed. Then choose a Monster within 2 tiles of you. Place that Monster adjacent to your Hero and attack it."

### Cards with Multi-Target Attacks
- **Arcing Strike (ID: 25)**: "Attack one or two adjacent Monsters"
- **Arc Lightning (ID: 42)**: "Attack up to two Monsters"
- **Shock Sphere (ID: 46)**: "Attack each Monster on that tile"
- **Hurled Breath (ID: 41)**: "Attack each Monster on that tile"

### Cards with Multi-Hit Attacks
- **Reaping Strike (ID: 13)**: "Attack one adjacent Monster twice" ✅ IMPLEMENTED

### Cards with Hit/Miss Effects
- **Comeback Strike (ID: 15)**: Heal 2 HP on hit, don't flip on miss
- **Righteous Smite (ID: 27)**: All Heroes on tile regain 1 HP (hit or miss)
- **Cleric's Shield (ID: 2)**: +2 AC bonus (hit or miss)
- **Righteous Advance (ID: 3)**: One Hero moves 2 squares (hit or miss)

---

## Utility Cards (Not Attack Cards)

The following utility cards don't have attack mechanics and are handled separately:

| ID | Name | Effect Type |
|----|------|-------------|
| 1 | Healing Hymn | Healing |
| 8 | Astral Refuge | Hero teleportation |
| 9 | Command | Monster manipulation |
| 10 | Perseverance | Encounter cost reduction |
| 11 | Dwarven Resilience | Self-healing |
| 18 | Inspiring Advice | Attack reroll |
| 19 | One for the Team | Encounter redirect |
| 20 | To Arms! | Hero movement |
| 21 | Lay On Hands | Adjacent hero healing |
| 28 | Bravery | Movement + healing |
| 29 | Noble Shield | Attack manipulation |
| 30 | Virtue's Touch | Condition removal |
| 31 | Furious Assault | Damage boost |
| 38 | Distant Diversion | Monster manipulation |
| 39 | Practiced Evasion | Attack negation |
| 40 | Tumbling Escape | Attack negation + placement |
| 48 | Invisibility | Monster targeting change |
| 49 | Mirror Image | AC bonus |
| 50 | Wizard Eye | Exploration extension |

---

## Token-Based Cards (Not Implemented)

These cards create tokens on the board which are not yet implemented:

| ID | Name | Token Type |
|----|------|------------|
| 5 | Blade Barrier | Blade Barrier tokens |
| 45 | Flaming Sphere | Flaming Sphere tokens |

---

## Future Improvements

1. **Tornado Strike**: Implement hero placement UI after attacks
2. **Token Cards**: Add support for Blade Barrier and Flaming Sphere tokens
3. **Utility Cards**: Implement non-attack utility effects
4. **Conditional Effects**: Add support for "started adjacent" and roll-based bonuses

---

*Last updated: See git commit history for this file.*
