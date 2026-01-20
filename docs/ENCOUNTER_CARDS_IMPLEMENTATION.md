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
| `curse` | Persistent debuff attached to hero | 8 cards | ✅ All 8 fully functional |
| `environment` | Persistent dungeon-wide effect | 6 cards | ✅ 5 of 6 fully functional (1 requires multiplayer) |
| `trap` | Persistent trap with triggered effects | 4 cards | Requires trap marker/trigger system |
| `hazard` | Hazard marker with ongoing effects | 3 cards | Requires hazard marker system |
| `special` | Complex effects (tile/monster manipulation) | 14 cards | Requires additional game logic |

## Card Breakdown by Type

### Curse Cards (8 cards, #51-58)

| ID | Name | Effect Summary | Implementation Status |
|----|------|----------------|----------------------|
| gap-in-armor | A Gap in the Armor | AC -4 until hero doesn't move | ✅ Fully Implemented (see issue: egirard/Ashardalon#51) |
| bad-luck | Bad Luck | Draw extra encounter each turn | ✅ Fully Implemented (see issue: egirard/Ashardalon#52) |
| bloodlust | Bloodlust | Take 1 damage at turn start | ✅ Fully Implemented (see issue: egirard/Ashardalon#53) |
| cage | Cage | AC -2, cannot move, Roll 10+ to escape | ✅ Fully Implemented (see issue: egirard/Ashardalon#54) |
| dragon-fear | Dragon Fear | Take 1 damage when moving to new tile | ✅ Fully Implemented (see issue: egirard/Ashardalon#55) |
| terrifying-roar | Terrifying Roar | Attack -4 penalty | ✅ Fully Implemented |
| time-leap | Time Leap | Hero removed from play, returns next turn | ✅ Fully Implemented |
| wrath-of-enemy | Wrath of the Enemy | Monster moves to hero each turn | ✅ Fully Implemented |

#### Implementation Notes

**A Gap in the Armor** is now fully implemented:
- When a hero has this curse, they suffer an AC -4 penalty
- The AC penalty is automatically applied when the curse is added via `getModifiedAC()` in statusEffects.ts
- The game tracks whether the hero moved during the Hero Phase via the `heroMovedThisPhase` flag
- The flag is set to true in the `moveHero` reducer when the hero moves
- The flag is reset to false at the start of each Hero Phase (in `endVillainPhase`)
- At the end of Hero Phase (in `endHeroPhase`), if the hero has the curse and didn't move, the curse is automatically removed
- A notification message displays: "{heroId}'s A Gap in the Armor curse removed (did not move)"
- The AC is automatically recalculated when the curse is removed
- Comprehensive unit tests verify the curse mechanics
- E2E test (085) demonstrates the complete curse lifecycle: application, AC penalty, not moving, and removal
- Implementation reference: issue egirard/Ashardalon#51

~~**A Gap in the Armor**: See issue `gap-in-armor-doc-update`~~ ✅ **Fully Implemented** (see above)
- **A Gap in the Armor**: See issue `gap-in-armor-doc-update`
- ~~**Bad Luck**: See issue `bad-luck-doc-update`~~ ✅ **Fully Implemented** (see below)
- ~~**Bloodlust**: See issue `bloodlust-doc-update`~~ ✅ **Fully Implemented** (see below)
- ~~**Cage**: See issue `cage-doc-update`~~ ✅ **Fully Implemented** (see below)
- ~~**Dragon Fear**: See issue `dragon-fear-doc-update`~~ ✅ **Fully Implemented** (see below)

**Bad Luck** is now fully implemented:
- When a hero has this curse and an encounter is drawn at the start of Villain Phase, they must draw an additional encounter
- The extra encounter is drawn after the first encounter is resolved (dismissed)
- A notification message displays: "{heroId} draws an extra encounter!" with "Bad Luck curse:" prefix
- At the end of Villain Phase, the hero automatically rolls d20 to attempt curse removal (10+ removes the curse)
- The removal attempt message displays the roll result and whether the curse was removed
- If the first encounter itself requires another draw (e.g., "Hidden Treasure", "Deadly Poison"), the Bad Luck extra is drawn after that
- The curse persists across turns until successfully removed
- Implementation uses a `badLuckExtraEncounterPending` flag to track when an extra draw is needed
- The flag is set in `endExplorationPhase` when encounter is drawn for a cursed hero
- The flag is checked and cleared in `dismissEncounterCard` for all encounter types (environment, trap, hazard, curse, special, normal)
- Comprehensive unit tests verify extra draw, no extra when not cursed, removal roll, and curse persistence
- Implementation reference: issue egirard/Ashardalon#52

**Bloodlust** is now fully implemented:
- When a hero has this curse, they take 1 damage at the start of each Hero Phase (when `endVillainPhase` transitions to their turn)
- The damage is applied via the `processStatusEffectsStartOfTurn()` function in statusEffects.ts
- The curse is automatically removed when the cursed hero defeats a monster (during attack resolution)
- A notification message appears when the curse damage is applied: "{heroId} takes 1 damage from Bloodlust curse"
- A notification message appears when the curse is removed: "{heroId}'s Bloodlust curse is lifted!"
- The curse removal message is appended to any existing encounter effect messages
- Comprehensive unit tests verify the damage calculation
- E2E test demonstrates the complete curse lifecycle: application, damage, and removal

**Cage** is now fully implemented:
- When a hero has this curse, they suffer an AC -2 penalty and cannot move
- The AC penalty is automatically applied when the curse is added via `getModifiedAC()` in statusEffects.ts
- The `canMove()` function in statusEffects.ts checks for the cage curse and prevents movement
- A hero on the same tile as the caged hero can attempt to free them by rolling 10+ on a d20
- The escape attempt uses the `attemptCageEscape` action in gameSlice.ts
- The action verifies both heroes are on the same tile using `areOnSameTile()` from encounters.ts
- Upon successful roll (10+), the curse is removed and the hero's AC is restored
- A notification message displays the roll result: either "Cage curse removed!" or "Cage curse persists (need 10+)"
- The AC is automatically recalculated when the curse is removed
- Comprehensive unit tests verify the escape mechanic and AC penalty
- E2E test (083) demonstrates the complete curse lifecycle: application, AC penalty, movement prevention, escape attempt, and removal
- Implementation reference: issue egirard/Ashardalon#54

**Dragon Fear** is now fully implemented:
- When a hero has this curse, they take 1 damage each time they move to a new tile or sub-tile
- The damage is applied in the `moveHero` reducer when the hero's position changes to a different tile
- Tile change detection uses `areOnSameTile()` to compare old and new positions
- The start tile's two sub-tiles (north y:0-3, south y:4-7) are treated as separate tiles for this effect
- A notification message appears when the damage is applied: "{heroId} takes 1 damage from Dragon Fear curse. Roll 10+ at end of Hero Phase to remove."
- The message is appended to any existing encounter effect messages using " | " separator
- Party defeat is triggered if all heroes are reduced to 0 HP by the curse damage
- At the end of Hero Phase, the hero automatically rolls d20 to attempt curse removal (10+ removes the curse)
- A notification message displays the roll result: either "Dragon Fear curse removed!" or "Dragon Fear curse persists (need 10+)"
- Comprehensive unit tests verify damage is applied on tile change but not within same tile, and curse removal attempts occur
- E2E test (082) demonstrates the complete curse lifecycle: damage on tile crossing, removal instructions, and automatic removal attempt
- Implementation reference: issue egirard/Ashardalon#55

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
  - **Hero token is hidden from the map** (visual feedback)
- Limitations:
  - Hero's player panel doesn't show a visual "removed" indicator (like downed indicator)
  - Panel remains visible with hero's name and stats
  - The map correctly hides the token, providing clear visual feedback

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

**Terrifying Roar** is now fully implemented:
- When a hero has this curse, they suffer an Attack -4 penalty on all attacks against monsters
- The penalty is applied after item bonuses are calculated
- Uses the `getModifiedAttackBonusWithCurses()` function from statusEffects.ts
- Integrates into the attack resolution flow in GameBoard.svelte
- The curse persists until removed via a DC 10+ roll at the end of Exploration Phase
- Multiple status effects and curses can stack (e.g., blinded + terrifying roar = -6 total)
- Comprehensive unit tests verify the penalty calculation
- E2E test (080) demonstrates the curse effect in gameplay
- Limitations:
  - The UI displays the base attack bonus from power cards, not the modified value with curse penalties
  - The actual attack rolls correctly use the modified (reduced) attack bonus

### Environment Cards (6 cards, #59-64)

| ID | Name | Effect Summary | Implementation Status |
|----|------|----------------|----------------------|
| dragons-tribute | Dragon's Tribute | Draw 2 treasures, discard higher | ✅ Fully Implemented |
| hidden-snipers | Hidden Snipers | 1 damage when alone on tile | ✅ Fully Implemented |
| high-alert | High Alert | Pass monster card to right each turn | ✅ Fully Implemented |
| kobold-trappers | Kobold Trappers | -4 to trap disable rolls | ✅ Fully Implemented |
| surrounded | Surrounded! | Spawn monster if hero has none | ✅ Fully Implemented |
| walls-of-magma | Walls of Magma | 1 damage when adjacent to wall | ✅ Fully Implemented |

#### High Alert Implementation Notes

**High Alert** is now fully implemented:
- When the environment is active, at the end of each Villain Phase, the active hero passes one monster card to the player on their right
- "Player on the right" is the next hero in turn order (wraps around to first player if last player is active)
- Only the first monster controlled by the active hero is passed
- If the active hero has no monsters, no passing occurs
- In solo play (only one hero), no passing occurs (checked via `heroTokens.length > 1`)
- The monster's `controllerId` field is updated to the next player's heroId
- A notification message displays the passed monster: "High Alert: {heroId} passes {MonsterName} to {nextHeroId}"
- The effect is applied in the `endVillainPhase` reducer in `gameSlice.ts`
- Comprehensive unit tests verify all scenarios:
  - Multiplayer monster passing to next player
  - Wrapping from last player to first player
  - Passing only one monster when hero controls multiple
  - Solo player (no passing occurs)
  - Active hero has no monsters (no error, no passing)
  - Environment not active (no passing occurs)
- Implementation reference: `gameSlice.ts` lines 1850-1887, `highAlertEnvironment.test.ts`

#### Dragon's Tribute Implementation Notes

**Dragon's Tribute** is now fully implemented:
- When the environment is active, collecting a treasure token triggers a special two-treasure draw
- The treasure drawing logic in `moveHero` checks if `activeEnvironmentId === 'dragons-tribute'`
- If active, a second treasure is drawn via `drawTreasure()` and stored in `dragonsTributeSecondTreasure`
- A custom UI component `DragonsTributeTreasureChoice.svelte` displays both treasures side-by-side
- The UI highlights the higher-value treasure (based on `goldPrice`) with a "HIGHER" badge
- The UI recommends keeping the lower-value treasure (as per game rules)
- The player can select either treasure to keep via `selectDragonsTributeTreasure` action
- The selected treasure remains in `drawnTreasure` for normal assignment flow
- The discarded treasure is moved to the treasure deck's discard pile
- After selection, the normal treasure assignment UI appears
- Implementation files:
  - gameSlice.ts: State management and treasure drawing logic
  - DragonsTributeTreasureChoice.svelte: Two-treasure selection UI
  - GameBoard.svelte: Integration of Dragon's Tribute component

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
| duergar-outpost | Duergar Outpost | Filter monster deck for Devils | ✅ Fully Implemented |
| hall-of-orcs | Hall of the Orcs | Filter monster deck for Orcs | ⚠️ Display only |
| hidden-treasure | Hidden Treasure | Place treasure token | ✅ Fully Implemented |
| kobold-warren | Kobold Warren | Filter monster deck for Reptiles | ✅ Fully Implemented |
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

#### Hidden Treasure Implementation Notes

**Hidden Treasure** is now fully implemented:
- When the encounter card is drawn and accepted, it places a treasure token on a random tile that does not have any heroes on it
- Uses `findValidTreasurePlacement()` function from trapsHazards.ts to select a valid tile position
- Creates a `TreasureTokenState` instance with unique ID, encounter ID ('hidden-treasure'), and position
- The treasure token is added to the `game.treasureTokens` array in Redux state
- Treasure token marker is rendered on the game board using `TreasureTokenMarker.svelte` component
- Token displays the Token_TreasureTreasure.png asset with a pulse animation
- After the token is placed, the card is automatically discarded and another encounter card is drawn (via `shouldDrawAnotherEncounter()`)
- **Treasure Collection**: When a hero moves to a tile containing a treasure token:
  - The `moveHero` reducer in gameSlice.ts detects treasure tokens on the destination tile using `getTreasureTokensOnTile()`
  - Token is removed from `game.treasureTokens` array
  - A treasure card is drawn from the treasure deck via `drawTreasure()`
  - The drawn treasure is set in `game.drawnTreasure`, triggering the treasure card assignment UI
  - `treasureDrawnThisTurn` flag prevents multiple treasure draws in the same turn
  - Collection message is appended to encounter effect messages
- The effect message displays the treasure token position when placed (e.g., "Treasure token placed at (2, 4)")
- If no valid tile exists (all tiles have heroes), displays "No valid tile for treasure token (all tiles have heroes)"
- E2E test (087) demonstrates the complete treasure token lifecycle: draw encounter → place token → display token marker
- Implementation files:
  - types.ts: TreasureTokenState interface
  - trapsHazards.ts: createTreasureTokenInstance(), getTreasureTokensOnTile(), findValidTreasurePlacement()
  - gameSlice.ts: Token placement in dismissEncounterCard, collection in moveHero
  - TreasureTokenMarker.svelte: Visual component for treasure tokens
  - GameBoard.svelte: Integration of treasure token rendering

#### Duergar Outpost Implementation Notes

**Duergar Outpost** is now fully implemented:
- When the encounter card is drawn and accepted, it filters the monster deck for Devil monsters
- Uses `filterMonsterDeckByCategory()` function from monsters.ts to draw 5 monster cards
- Devils found are shuffled and placed on top of the draw pile
- Non-Devil monsters are moved to the discard pile
- Effect message displays the result: "Drew 5 monster cards. X Devils placed on top, Y discarded."
- The implementation checks if the encounter is a monster deck manipulation card via `isMonsterDeckManipulationCard()`
- Category mapping is defined in `getMonsterCategoryForEncounter()` which maps 'duergar-outpost' to 'devil'
- Comprehensive unit tests verify the category mapping and filtering logic
- E2E test (089) demonstrates the complete card lifecycle: draw encounter → display card → accept → filter deck → display result
- **Note**: The current monster deck contains no Devil monsters (only kobold, snake, cultist), so the test verifies that all 5 cards are properly discarded when no matches are found
- Implementation files:
  - Card definition: types.ts (line 965)
  - Category mapping: encounters.ts (`getMonsterCategoryForEncounter`, `isMonsterDeckManipulationCard`)
  - Effect application: gameSlice.ts (lines 2128-2144 in `dismissEncounterCard` reducer)
  - Filtering logic: monsters.ts (`filterMonsterDeckByCategory`)

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
| Curse | 8 | 8 | 0 |
| Environment | 6 | 6 | 0 |
| Event (Damage) | 2 | 2 | 0 |
| Event (Attack) | 14 | 14 | 0 |
| Event (Special) | 16 | 3 | 13 |
| Hazard | 3 | 0 | 3 |
| Trap | 4 | 0 | 4 |
| **Total** | **53** | **33** | **20** |

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
- ✅ Surrounded!: Spawn monster on closest unexplored edge for heroes without monsters at end of Exploration Phase
- ✅ Kobold Trappers: Apply -4 penalty to trap disable rolls
- ✅ Dragon's Tribute: Draw 2 treasures, player chooses one to keep, discard the other
- ✅ High Alert: Pass one monster card to the player on the right at end of Villain Phase

#### Kobold Trappers Implementation Notes

**Kobold Trappers** is now fully implemented:
- When the environment is active, heroes take a -4 penalty to all trap disable rolls
- The penalty is applied in the `attemptDisableTrap` reducer in `gameSlice.ts`
- The implementation checks if `activeEnvironmentId === 'kobold-trappers'` before applying the penalty
- Roll calculation: `modifiedRoll = d20Roll + koboldTrappersPenalty` where `koboldTrappersPenalty = -4` when active
- A hero on the same tile as a trap can attempt to disable it by rolling d20 vs the trap's disable DC
- With Kobold Trappers active, a DC 10 trap requires a roll of 14+ instead of 10+ to disable
- The environment affects all trap types (Lava Flow, Poisoned Dart Trap, Rolling Boulder, Whirling Blades)
- Comprehensive unit tests verify:
  - Trap disables on successful roll without environment (roll 10 vs DC 10 succeeds)
  - Trap remains on low roll without environment (roll 9 vs DC 10 fails)
  - Kobold Trappers applies -4 penalty (roll 13 vs DC 10 fails: 13 - 4 = 9)
  - High roll succeeds despite penalty (roll 14 vs DC 10 succeeds: 14 - 4 = 10)
  - Hero must be on trap tile to attempt disable
- E2E test (086) demonstrates:
  - Environment activation and indicator display
  - Trap placement at hero position with visual trap marker
  - Disable attempt with roll 13 failing due to -4 penalty (modified roll 9 < DC 10)
  - Disable attempt with roll 14 succeeding despite penalty (modified roll 10 >= DC 10)
  - Comparison with no environment where roll 10 succeeds without penalty
- Implementation reference: `gameSlice.ts` line 3338 (attemptDisableTrap action)

#### Surrounded! Implementation Notes

**Surrounded!** is now fully implemented:
- When the environment is active, at the end of each Exploration Phase, the game checks if the **active player** controls at least one monster
- If the active player doesn't control any monsters, the closest unexplored edge to that player is found using Manhattan distance
- A monster is drawn from the monster deck and placed on that edge
- The spawned monster is controlled by the active player
- A monster card popup is displayed showing the spawned monster (same as regular monster spawns)
- The effect only triggers for the active player on their turn, not for all players simultaneously
- Edge cases handled:
  - No unexplored edges: Effect does not spawn monster
  - Empty monster deck: Effect does not spawn monster
  - No valid spawn position on tile: Effect does not spawn monster
  - Active player already controls a monster: Effect does not spawn monster
- Comprehensive unit tests verify:
  - Active player monster spawning logic
  - `findClosestUnexploredEdge()` finds the nearest unexplored edge using Manhattan distance
  - All edge cases (no edges, no monsters, active player has monsters)
- E2E test (073) demonstrates the complete effect lifecycle: activation, monster spawning, popup display, and verification
- Implementation reference: `gameSlice.ts` lines 1522-1575, `encounters.ts` lines 859-882 (findClosestUnexploredEdge)

### 3. Trap/Hazard System (Partially Implemented)
- ✅ Place trap markers on tiles when trap encounter cards are drawn
- ✅ Track trap state (position, disable DC, encounter ID)
- ✅ Implement disable rolls (DC checks) with environment modifiers
- ✅ Visual trap markers displayed on game board
- ⚠️ Trap effects during Villain Phase (implemented for all 4 trap types in villainPhaseTraps.ts)
- ⚠️ Interactive UI for trap disabling (currently accessible via Redux action dispatch)

#### Trap System Implementation Notes

**Trap Foundation** is now implemented:
- Traps are automatically placed at the active hero's tile when trap encounter cards are drawn
- Each trap has a unique ID, position, encounter type, and disable DC
- The `attemptDisableTrap` action allows heroes to attempt disabling traps on their tile
- Disable attempts use d20 rolls vs the trap's DC, with environment modifiers applied
- Successful disables remove the trap from the game state
- Failed disables leave the trap active
- Trap markers are visually displayed on the game board using the TrapMarker component
- Four trap types are defined in encounter cards:
  - Lava Flow (DC 10): Spreads each turn, 1 damage to heroes on tile
  - Poisoned Dart Trap (DC 10): Attack +8 each turn (2 damage + poisoned, miss: 1)
  - Rolling Boulder (DC 10): Moves toward closest hero, 2 damage
  - Whirling Blades (DC 10): Moves toward closest hero, Attack +8 (2 damage, miss: 1)
- Trap activation during Villain Phase is implemented in `villainPhaseTraps.ts`
- Kobold Trappers environment correctly applies -4 penalty to all trap disable attempts
- Comprehensive unit tests verify trap creation, placement, disable mechanics, and environment interactions
- E2E test (086) demonstrates complete trap lifecycle with Kobold Trappers penalty

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
