# Encounter Cards Implementation Status

This document tracks the implementation status of all 53 encounter cards from Wrath of Ashardalon.

## Overview

Encounter cards are drawn during the Villain Phase when:
- No exploration occurred during the turn, OR
- A black arrow tile was placed during exploration

Encounter cards are NOT drawn when:
- Only white arrow tiles were placed during the turn

## Effect Types

### ✅ Fully Implemented

| Effect Type | Description | Example Cards |
|-------------|-------------|---------------|
| `damage` (active-hero) | Deals fixed damage to the active hero | Frenzied Leap |
| `damage` (all-heroes) | Deals fixed damage to all heroes | Unbearable Heat |
| `damage` (heroes-on-tile) | Deals damage to heroes on the active hero's tile | (treated as all-heroes) |
| `attack` | Makes attack roll (+bonus vs AC), deals damage on hit | Bull's Eye, Deep Tremor |

### ⚠️ Partially Implemented (Display Only)

These effect types display the card description and resolve to the discard pile, but do not apply their mechanical effects.

| Effect Type | Description | Cards Count | Notes |
|-------------|-------------|-------------|-------|
| `curse` | Persistent debuff attached to hero | 8 cards | ⚠️ 1 of 8 fully functional (Wrath of the Enemy) |
| `environment` | Persistent dungeon-wide effect | 6 cards | ✅ Implemented (2 of 6 cards fully functional) |
| `trap` | Persistent trap with triggered effects | 4 cards | Requires trap marker/trigger system |
| `hazard` | Hazard marker with ongoing effects | 3 cards | Requires hazard marker system |
| `special` | Complex effects (tile/monster manipulation) | 14 cards | Requires additional game logic |

## Card Breakdown by Type

### Curse Cards (8 cards, #51-58)

| ID | Name | Effect Summary | Implementation Status |
|----|------|----------------|----------------------|
| gap-in-armor | A Gap in the Armor | AC -4 until hero doesn't move | ⚠️ Display only (see issue: gap-in-armor-doc-update) |
| bad-luck | Bad Luck | Draw extra encounter each turn | ⚠️ Display only (see issue: bad-luck-doc-update) |
| bloodlust | Bloodlust | Take 1 damage at turn start | ⚠️ Display only (see issue: bloodlust-doc-update) |
| cage | Cage | AC -2, cannot move, Roll 10+ to escape | ⚠️ Display only (see issue: cage-doc-update) |
| dragon-fear | Dragon Fear | Take 1 damage when moving to new tile | ⚠️ Display only (see issue: dragon-fear-doc-update) |
| terrifying-roar | Terrifying Roar | Attack -4 penalty | ⚠️ Display only |
| time-leap | Time Leap | Hero removed from play, returns next turn | ✅ Fully Implemented |
| wrath-of-enemy | Wrath of the Enemy | Monster moves to hero each turn | ✅ Fully Implemented |

#### Implementation Notes

Issues have been filed for the first five Curse cards to track future implementation work:
- **A Gap in the Armor**: See issue `gap-in-armor-doc-update`
- **Bad Luck**: See issue `bad-luck-doc-update`
- **Bloodlust**: See issue `bloodlust-doc-update`
- **Cage**: See issue `cage-doc-update`
- **Dragon Fear**: See issue `dragon-fear-doc-update`

**Time Leap** is now fully implemented:
- When the curse is applied (during Villain Phase encounter resolution), the hero is immediately marked as `removedFromPlay`
- The hero remains removed for the remainder of the current turn and through the entire next turn cycle
- At the start of the hero's next Hero Phase (when `endVillainPhase` transitions to their turn), the hero is automatically:
  - Restored to play (removedFromPlay flag cleared)
  - The Time Leap curse status is removed
- The hero can then take their turn normally
- While removed from play, the hero:
  - Does not take their turn (turn passes to next hero)
  - Is not targeted by monsters during Villain Phase
  - Cannot be affected by encounter cards or environment effects
- Limitations:
  - UI currently does not visually hide/dim the removed hero token on the board
  - The hero's token remains visible but functionally inactive until they return

**Wrath of the Enemy** is now fully implemented:
- When a hero has this curse, at the end of Exploration Phase, the closest monster NOT on the hero's tile moves adjacent to the cursed hero
- Uses Manhattan distance to find the closest monster
- Monster movement uses existing AI pathfinding to find an adjacent position
- After the monster movement (or attempt), the hero automatically rolls d20 to attempt curse removal
- Roll 10+ removes the curse - both success and failure are shown in the notification message
- If no valid adjacent position exists, the player is notified that the monster couldn't move
- If no monster is found off-tile, the player is notified
- Multiple heroes can have this curse simultaneously, and each will trigger the effect
- Effect message is appended to any existing messages (using " | " separator) to ensure visibility

### Environment Cards (6 cards, #59-64)

| ID | Name | Effect Summary | Implementation Status |
|----|------|----------------|----------------------|
| dragons-tribute | Dragon's Tribute | Draw 2 treasures, discard higher | ⚠️ Tracked, not enforced (requires treasure draw UI changes) |
| hidden-snipers | Hidden Snipers | 1 damage when alone on tile | ✅ Fully Implemented |
| high-alert | High Alert | Pass monster card to right each turn | ⚠️ Tracked, not enforced (requires multiplayer card passing) |
| kobold-trappers | Kobold Trappers | -4 to trap disable rolls | ⚠️ Tracked, not enforced (traps not yet implemented) |
| surrounded | Surrounded! | Spawn monster if hero has none | ⚠️ Tracked, helper function added (monster spawning deferred) |
| walls-of-magma | Walls of Magma | 1 damage when adjacent to wall | ✅ Fully Implemented |

### Event Cards - Damage Effects (2 cards)

| ID | Name | Effect Summary | Implementation Status |
|----|------|----------------|----------------------|
| frenzied-leap | Frenzied Leap | Active hero takes 2 damage | ✅ Implemented |
| unbearable-heat | Unbearable Heat | All heroes take 1 damage | ✅ Implemented |

### Event Cards - Attack Effects (14 cards, #83-96)

| ID | Name | Attack | Damage | Target | Status |
|----|------|--------|--------|--------|--------|
| blinding-bomb | Blinding Bomb | +8 | Dazed | Heroes within 1 tile | ✅ Implemented |
| bulls-eye | Bull's Eye! | +10 | 1 | Active hero | ✅ Implemented |
| concussive-blast | Concussive Blast | +8 | 2 (miss: 1) | Heroes on tile | ✅ Implemented |
| deep-tremor | Deep Tremor | +8 | 1 | All heroes | ✅ Implemented |
| earthquake | Earthquake! | +6 | 2 + Dazed (miss: 1) | All heroes | ✅ Implemented |
| fungal-bloom | Fungal Bloom | +8 | Dazed + Poisoned | Heroes within 1 tile | ✅ Implemented |
| lurkers-strike | Lurker's Strike | +8 | 1 + Poisoned | Active hero | ✅ Implemented |
| phalagars-lair | Phalagar's Lair | +4 | 3 + Dazed (miss: 1) | Heroes on tile | ✅ Implemented |
| poisoned-arrow | Poisoned Arrow | +8 | 2 + Poisoned (miss: 1) | Active hero | ✅ Implemented |
| steam-vent | Steam Vent | +8 | 2 (miss: 1) | Heroes on tile | ✅ Implemented |
| sulphurous-cloud | Sulphurous Cloud | +8 | 1 + Poisoned | Heroes on tile | ✅ Implemented |
| trip-wire | Trip Wire | +10 | Poisoned | Active hero | ✅ Implemented |
| volcanic-burst | Volcanic Burst | +6 | 3 (miss: 1) | Heroes on tile | ✅ Implemented |
| waking-dream | Waking Dream | +8 | 1 + Dazed | Active hero | ✅ Implemented |

**Note:** Status effects (Dazed, Poisoned) are NOT YET IMPLEMENTED. Attack cards deal damage correctly but do not apply status conditions.

### Event Cards - Special Effects (16 cards, #65-82)

| ID | Name | Effect Summary | Implementation Status |
|----|------|----------------|----------------------|
| ancient-spirits-blessing | Ancient Spirit's Blessing | Flip up a Daily Power | ⚠️ Display only |
| deadly-poison | Deadly Poison | Poisoned heroes take 1 damage | ✅ Fully Implemented |
| duergar-outpost | Duergar Outpost | Filter monster deck for Devils | ⚠️ Display only |
| hall-of-orcs | Hall of the Orcs | Filter monster deck for Orcs | ⚠️ Display only |
| hidden-treasure | Hidden Treasure | Place treasure token | ⚠️ Display only |
| kobold-warren | Kobold Warren | Filter monster deck for Reptiles | ⚠️ Display only |
| lost | Lost | Shuffle tile deck | ⚠️ Display only |
| occupied-lair | Occupied Lair | Place tile, monster, and treasure | ⚠️ Display only |
| quick-advance | Quick Advance | Move a monster closer | ⚠️ Display only |
| revel-in-destruction | Revel in Destruction | Heal a monster 1 HP | ⚠️ Display only |
| scream-of-sentry | Scream of the Sentry | Place tile and monster near monster | ⚠️ Display only |
| spotted | Spotted! | Filter deck, place tile and monster | ⚠️ Display only |
| thief-in-dark | Thief in the Dark | Lose a treasure | ⚠️ Display only |
| unnatural-corruption | Unnatural Corruption | Filter monster deck for Aberrants | ⚠️ Display only |
| wandering-monster | Wandering Monster | Spawn monster on unexplored edge | ⚠️ Display only |
| warp-in-time | Warp in Time | Pass monster cards right | ⚠️ Display only |

#### Deadly Poison Implementation Notes

**Deadly Poison** is now fully implemented:
- When the encounter card is drawn and accepted, it checks all heroes for the "poisoned" status effect
- Each hero with the poisoned status takes exactly 1 damage
- The effect message displays the number of heroes affected (e.g., "2 poisoned heroes took 1 damage" or "No poisoned heroes")
- After applying the damage, the card is discarded and automatically draws another encounter card (as per the card's text)
- Party defeat is triggered if all heroes are reduced to 0 HP
- Comprehensive unit tests validate all scenarios (multiple poisoned heroes, mix of poisoned/unpoisoned, no poisoned heroes, defeat trigger)

### Hazard Cards (3 cards, #97-99)

| ID | Name | Effect Summary | Implementation Status |
|----|------|----------------|----------------------|
| cave-in-hazard | Cave In | Place marker, Attack +9 vs heroes (2 damage, miss: 1) | ⚠️ Display only |
| pit | Pit | Place marker, Attack +10 vs heroes (2 damage, fall in) | ⚠️ Display only |
| volcanic-vapors | Volcanic Vapors | Heroes on tile become Poisoned | ⚠️ Display only |

### Trap Cards (4 cards, #100-103)

| ID | Name | Effect Summary | Disable DC | Implementation Status |
|----|------|----------------|------------|----------------------|
| lava-flow | Lava Flow | Spreads each turn, 1 damage | 10 | ⚠️ Display only |
| poisoned-dart-trap | Poisoned Dart Trap | Attack +8 each turn (2 + Poisoned, miss: 1) | 10 | ⚠️ Display only |
| rolling-boulder | Rolling Boulder | Moves toward hero, 2 damage | 10 | ⚠️ Display only |
| whirling-blades | Whirling Blades | Moves toward hero, Attack +8 (2, miss: 1) | 10 | ⚠️ Display only |

## Implementation Summary

| Category | Total Cards | Fully Implemented | Display Only |
|----------|-------------|-------------------|--------------|
| Curse | 8 | 2 | 6 |
| Environment | 6 | 0 | 6 |
| Event (Damage) | 2 | 2 | 0 |
| Event (Attack) | 14 | 14 | 0 |
| Event (Special) | 16 | 1 | 15 |
| Hazard | 3 | 0 | 3 |
| Trap | 4 | 0 | 4 |
| **Total** | **53** | **19** | **34** |

## Features Not Yet Implemented

To fully implement all encounter cards, the following systems would need to be added:

### 1. Hero Status System
- Track status effects: Poisoned, Dazed
- Track curses attached to heroes
- Integrate status effects with attack/damage resolution

### 2. Environment System ✅ Implemented
- ✅ Track active environment card in game state
- ✅ Apply environment effects during appropriate phases
- ✅ Replace environment when new one is drawn
- ✅ Display active environment in UI
- ✅ Hidden Snipers: Apply 1 damage to active hero when ending Hero Phase alone on tile
- ✅ Walls of Magma: Apply 1 damage to active hero when ending Hero Phase adjacent to wall
- ⚠️ Surrounded!: Helper function added, full implementation requires monster spawning logic
- ⚠️ High Alert: Requires multiplayer card passing mechanism (not in current game state)
- ⚠️ Dragon's Tribute: Requires treasure draw UI changes to draw 2 and choose
- ⚠️ Kobold Trappers: Requires trap system implementation

### 3. Trap/Hazard System
- Place markers on tiles
- Track trap state and triggers
- Trigger effects during Villain Phase
- Implement disable rolls (DC checks)

### 4. Tile/Monster Manipulation
- Filter and reorder monster deck
- Place tiles from deck bottom
- Place treasure tokens
- Move monsters toward heroes

## UI/UX Considerations

The current UI properly:
- ✅ Displays encounter card name, description, and effect summary
- ✅ Shows appropriate icons for each encounter type
- ✅ Provides Accept button to resolve the encounter
- ✅ Displays active environment card indicator with name and icon
- ✅ Provides Cancel button (5 XP cost) to skip the encounter
- ✅ Applies damage effects immediately upon accepting
- ✅ Shows console warnings for unimplemented effects

## Testing

The encounter card system includes comprehensive tests for:
- Deck initialization and shuffling
- Drawing and discarding encounters
- Encounter trigger conditions
- Damage effect resolution
- Cancel mechanism (XP cost)
- All 53 encounter cards are included in the deck
