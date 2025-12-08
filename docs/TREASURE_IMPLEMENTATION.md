# Treasure Cards Implementation Status

This document tracks the implementation status of treasure card effects in the Wrath of Ashardalon digital game.

## Summary

- **Total Cards**: 29 unique treasure cards (from original game cards 134-166, excluding continuation rows in CSV)
- **Fully Implemented**: 12 cards (passive bonuses applied automatically)
- **Partially Implemented**: 4 cards (basic functionality works, special rules pending)
- **Not Yet Implemented**: 13 cards (require complex game mechanics)

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
| 150 | Potion of Healing | Heal 2 HP | ✅ Implemented (consumable) |
| 159 | Shield of Protection | +1 AC | ✅ Implemented |
| 160 | Staff of the Elements | +2 attack (ranged) | ✅ Basic (+2 attack to adjacent) |
| 164 | Vorpal Sword | +2 attack, +1 damage on natural 18-20 | ✅ Basic (+2 attack, crit bonus pending) |

### ⚠️ Partially Implemented (Attack Actions)

These cards provide attack actions that work at a basic level:

| ID | Name | Effect | Status |
|----|------|--------|--------|
| 141 | Crossbow of Speed | Ranged attack instead of movement | ⚠️ Data model only |
| 157 | Ring of Shooting Stars | Free ranged attack | ⚠️ Data model only |
| 161 | Thieves' Tools | +4 to disable traps | ⚠️ Bonus tracked, trap system pending |
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
| 153 | Potion of Recovery | Condition removal | Needs condition system |
| 155 | Potion of Rejuvenation | Power card refresh | Needs power card integration |
| 156 | Potion of Speed | Extra movement action | Needs action system |
| 158 | Scroll of Monster Control | Monster control | Needs villain phase hooks |
| 163 | Tome of Experience | Level up to 2 | Needs level system integration |
| 165 | Wand of Fear | Monster push effect | Needs monster movement |
| 166 | Wand of Polymorph | Monster replacement | Needs monster deck integration |

## Future Implementation Priorities

### High Priority (Core Gameplay)
1. **Lucky Charm** - Reroll is fundamental D&D mechanic
2. **Tome of Experience** - Level up is important progression

### Medium Priority (Combat Enhancement)
3. **Crossbow of Speed** - Alternate attack action
4. **Ring of Shooting Stars** - Free attack action
5. **Bracers of Defense** - Damage mitigation

### Lower Priority (Advanced Mechanics)
6. Token placement items (Caltrops, Flying Carpet)
7. Monster control items (Scroll, Wand of Fear, Wand of Polymorph)
8. Condition-related items (Potion of Recovery)

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

These bonuses are integrated into gameplay:
- **Attack bonuses**: Applied when attacking with power cards in `GameBoard.svelte`
- **Damage bonuses**: Applied when attacking with power cards in `GameBoard.svelte`
- **AC bonuses**: Applied when monsters attack in `gameSlice.ts` (via `activateNextMonster`)
- **Speed bonuses**: Applied to movement calculations in `GameBoard.svelte`

Helper functions for computing total stats:
- `applyItemBonusesToAttack(baseAttack, inventory)` - Returns attack with bonuses
- `calculateTotalAC(baseAC, inventory)` - Returns AC with bonuses
- `calculateTotalSpeed(baseSpeed, inventory)` - Returns speed with bonuses

### Implementation Status Check
The `treasure.ts` module provides functions to check implementation status:
- `isEffectImplemented(card)` - Returns true if effect is fully implemented
- `isEffectPartiallyImplemented(card)` - Returns true if some functionality works
- `getEffectImplementationStatus(card)` - Returns 'implemented', 'partial', or 'not-implemented'
- `getImplementationMessage(card)` - Returns user-friendly message about implementation status

The TreasureCard UI component displays implementation status messages to inform players when a card's effect is not yet functional.

### Item State Tracking
Each item in a hero's inventory tracks:
- `cardId` - Reference to treasure card definition
- `isFlipped` - Whether item has been used (for flip-to-use items)

Flipped items do NOT provide passive bonuses until refreshed.

### Using Consumable and Action Items
Players can use consumable and action treasure items directly from their inventory during the Hero Phase:

- **UI Integration**: Items displayed in PlayerCard.svelte show which items are usable
- **Visual Feedback**: Usable items have a green border and hover effect
- **Click to Use**: During the active hero's turn, clicking a usable item triggers its effect
- **Item Types**:
  - **Consumable items** (e.g., Potion of Healing) - Used once and then discarded
  - **Action items** (e.g., Ring of Shooting Stars) - Flip after use, can't be used again until refreshed
  - **Passive items** (e.g., +1 Magic Sword) - Always active, not clickable
  - **Reaction items** (e.g., Lucky Charm) - Require specific triggers (not yet fully implemented)
- **Restrictions**: Items can only be used:
  - During the active hero's Hero Phase
  - If the item is not already flipped
  - If the item is consumable or action type

The `useTreasureItem` action handles healing effects currently. Future enhancements will support attack actions and other item effects.

---

## Unparsed Cards Reference

The following treasure cards cannot be fully implemented with the current game systems. They are documented here with their complete rule text for reference:

### Reaction Cards (Need Reaction System)

**Lucky Charm** (ID: 147)
> Use this item after any die roll. Reroll the die. Discard this card after using it.
- *Why unparsed*: Requires a reaction system that can interrupt after any die roll and allow player to choose to reroll.

**Bracers of Defense** (ID: 140)
> Use when you take damage. Reduce the damage from the attack by 1. Flip this card over after using the item.
- *Why unparsed*: Requires a reaction system that triggers when damage is about to be applied.

**Elven Cloak** (ID: 144)
> Use before drawing a Monster Card during your Exploration Phase. The player to your left places that Monster instead.
- *Why unparsed*: Requires reaction hook during monster spawning and multi-player placement delegation.

### Power Card Integration Cards

**Pearl of Power** (ID: 149)
> Use during your Hero Phase. Flip up one of your used powers or items. Flip this card over after you use the item.
- *Why unparsed*: Requires integration with power card system to flip used cards back up.

**Potion of Rejuvenation** (ID: 155)
> Use this item during your Hero Phase. Flip up one of your used powers. Discard this card after using it.
- *Why unparsed*: Same as Pearl of Power - requires power card integration.

### Movement System Cards

**Flying Carpet** (ID: 145)
> Use during your Hero Phase. Place the Flying Carpet marker on any tile without a marker. Instead of moving, you can move the Flying Carpet marker to any tile within 1 tile of it. Any Hero standing on the Flying Carpet moves with the carpet.
- *Why unparsed*: Requires persistent marker system and alternate movement mode.

**Potion of Speed** (ID: 156)
> Use during your Hero Phase. Move up to your speed. Discard this card after using it.
- *Why unparsed*: Requires "move again" action that doesn't consume normal move action.

### Monster Control Cards

**Scroll of Monster Control** (ID: 158)
> Use during your Villain Phase when choosing a Monster's action. The Monster does not act normally. Instead, place the Monster in any square within 1 tile of it. If it is adjacent to another Monster, attack that Monster. Attack: +9 / Damage: 1. Discard this card after using it.
- *Why unparsed*: Requires villain phase action hooks and monster-vs-monster combat.

**Wand of Fear** (ID: 165)
> Use instead of an attack. Choose a tile within 1 tile of you. Place each Monster on that tile up to 2 tiles away from you. Flip this card over after you use the item.
- *Why unparsed*: Requires monster push/placement mechanics.

**Wand of Polymorph** (ID: 166)
> Use instead of an attack. Choose a Monster within 2 tiles of you. Draw a Monster Card and replace the original Monster. Flip this card over after you use the item.
- *Why unparsed*: Requires monster replacement mechanics and deck integration.

### Token System Cards

**Box of Caltrops** (ID: 139)
> Use during your Hero Phase. Place three Caltrop tokens on any three squares on your tile. When a Monster is placed on a square with a Caltrop token, remove that token and deal 1 damage to the Monster. Discard this card after using it.
- *Why unparsed*: Requires board token placement, persistence, and monster placement triggers.

### Condition System Cards

**Potion of Recovery** (ID: 153)
> Use at any time. End one condition on your Hero or an adjacent Hero. Discard this card after using it.
- *Why unparsed*: Condition system (poisoned, dazed, etc.) not yet implemented.

### Level System Cards

**Tome of Experience** (ID: 163)
> Use while your Hero is level 1. Your Hero becomes level 2. (Flip over your Hero Card.)
- *Why unparsed*: Heroes level up automatically on natural 20 with 5+ XP. Manual level-up would bypass this system.

---

*Last updated: See git commit history for this file.*
