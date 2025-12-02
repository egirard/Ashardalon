# Treasure Cards Implementation Status

This document tracks the implementation status of treasure card effects in the Wrath of Ashardalon digital game.

## Summary

- **Total Cards**: 26 unique treasure cards (from original game cards 134-166, excluding continuation rows in CSV)
- **Fully Implemented**: 12 cards (passive bonuses)
- **Partially Implemented**: 4 cards (basic attack functionality, advanced effects pending)
- **Not Yet Implemented**: 10 cards (require complex game mechanics)

## Implementation Categories

### ✅ Fully Implemented (Passive Bonuses)

These cards provide passive bonuses that are automatically applied to heroes while equipped:

| ID | Name | Effect | Status |
|----|------|--------|--------|
| 134 | +1 Magic Sword | +1 attack bonus | ✅ Implemented |
| 135 | +2 Magic Sword | +2 attack bonus | ✅ Implemented |
| 136 | Amulet of Protection | +1 AC | ✅ Implemented |
| 137 | Blessed Shield | +2 AC (party-wide) | ✅ Basic (+2 AC to owner only) |
| 138 | Boots of Striding | +1 Speed | ✅ Implemented |
| 142 | Dragontooth Pick | +1 attack, +1 damage on natural 19-20 | ✅ Basic (+1 attack, crit bonus pending) |
| 143 | Dwarven Hammer | +1 attack (+3 if not moving) | ✅ Basic (+1 attack, conditional pending) |
| 146 | Gauntlets of Ogre Power | +1 damage | ✅ Implemented |
| 159 | Shield of Protection | +1 AC | ✅ Implemented |
| 160 | Staff of the Elements | +2 attack (ranged) | ✅ Basic (+2 attack to adjacent) |
| 161 | Thieves' Tools | +4 to disable traps | ✅ Data model only (trap system pending) |
| 164 | Vorpal Sword | +2 attack, +1 damage on natural 18-20 | ✅ Basic (+2 attack, crit bonus pending) |

### ⚠️ Partially Implemented (Attack Actions)

These cards provide attack actions that work at a basic level:

| ID | Name | Effect | Status |
|----|------|--------|--------|
| 141 | Crossbow of Speed | Ranged attack instead of movement | ⚠️ Data model only |
| 157 | Ring of Shooting Stars | Free ranged attack | ⚠️ Data model only |
| 162 | Throwing Shield | +2 AC + free ranged attack | ⚠️ +2 AC works, attack pending |

### ❌ Not Yet Implemented (Complex Effects)

These cards require additional game systems to be implemented:

| ID | Name | Required Feature | Notes |
|----|------|-----------------|-------|
| 139 | Box of Caltrops | Token placement system | Needs board token placement |
| 140 | Bracers of Defense | Damage reduction reaction | Needs reaction system |
| 144 | Elven Cloak | Monster placement control | Needs exploration hooks |
| 145 | Flying Carpet | Special movement marker | Needs persistent markers |
| 147 | Lucky Charm | Reroll mechanism | Needs reroll UI/system |
| 149 | Pearl of Power | Card flip mechanism | Needs power card integration |
| 150 | Potion of Healing | Healing action | ✅ Effect works, UI pending |
| 153 | Potion of Recovery | Condition removal | Needs condition system |
| 155 | Potion of Rejuvenation | Power card refresh | Needs power card integration |
| 156 | Potion of Speed | Extra movement action | Needs action system |
| 158 | Scroll of Monster Control | Monster control | Needs villain phase hooks |
| 163 | Tome of Experience | Level up to 2 | Needs level system integration |
| 165 | Wand of Fear | Monster push effect | Needs monster movement |
| 166 | Wand of Polymorph | Monster replacement | Needs monster deck integration |

## Future Implementation Priorities

### High Priority (Core Gameplay)
1. **Potion of Healing** - Common consumable, healing is core mechanic
2. **Lucky Charm** - Reroll is fundamental D&D mechanic
3. **Tome of Experience** - Level up is important progression

### Medium Priority (Combat Enhancement)
4. **Crossbow of Speed** - Alternate attack action
5. **Ring of Shooting Stars** - Free attack action
6. **Bracers of Defense** - Damage mitigation

### Lower Priority (Advanced Mechanics)
7. Token placement items (Caltrops, Flying Carpet)
8. Monster control items (Scroll, Wand of Fear, Wand of Polymorph)
9. Condition-related items (Potion of Recovery)

## Technical Requirements for Full Implementation

### Reaction System
Items like Bracers of Defense and Lucky Charm need a reaction system that:
- Prompts player at appropriate moments
- Allows items to be used outside normal turn structure
- Tracks item usage (flip/discard)

### Token System
Items like Box of Caltrops and Flying Carpet need:
- Board token placement
- Token effect tracking
- Persistent markers between turns

### Monster Manipulation
Several items manipulate monsters:
- Move monster to specific locations
- Replace monsters with new draws
- Control monster during villain phase

### Power Card Integration
Items that refresh powers need:
- Access to hero power card state
- Ability to flip cards back to unused state
- Integration with power card UI

## Usage Notes

### Passive Bonus Application
Passive bonuses from equipped items are calculated by helper functions:
- `getAttackBonusFromItems(inventory)` - Sums attack bonuses
- `getDamageBonusFromItems(inventory)` - Sums damage bonuses
- `getAcBonusFromItems(inventory)` - Sums AC bonuses
- `getSpeedBonusFromItems(inventory)` - Sums speed bonuses

These are used by combat resolution functions:
- `applyItemBonusesToAttack(baseAttack, inventory)`
- `calculateTotalAC(baseAC, inventory)`
- `calculateTotalSpeed(baseSpeed, inventory)`

### Item State Tracking
Each item in a hero's inventory tracks:
- `cardId` - Reference to treasure card definition
- `isFlipped` - Whether item has been used (for flip-to-use items)

Flipped items do NOT provide passive bonuses until refreshed.
