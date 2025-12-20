# Game Design Document

## Wrath of Ashardalon - Web Implementation

This document defines the game design for the web implementation of Wrath of Ashardalon, a cooperative dungeon-crawling board game. All game rules and mechanics are derived from the official Wrath of Ashardalon v1.1 rulebook.

---

## Table of Contents

1. [Game Overview](#game-overview)
2. [Technical Architecture](#technical-architecture)
3. [Game Components](#game-components)
4. [Game Setup](#game-setup)
5. [Order of Play](#order-of-play)
6. [Hero Phase](#hero-phase)
7. [Exploration Phase](#exploration-phase)
8. [Villain Phase](#villain-phase)
9. [Combat System](#combat-system)
10. [Movement and Positioning](#movement-and-positioning)
11. [Monster AI and Behavior](#monster-ai-and-behavior)
12. [Dungeon Tile System](#dungeon-tile-system)
13. [Experience and Leveling](#experience-and-leveling)
14. [Treasure System](#treasure-system)
15. [Encounter System](#encounter-system)
16. [Defeating Heroes](#defeating-heroes)
17. [Doors](#doors)
18. [Chambers](#chambers)
19. [Other Actions](#other-actions)
20. [Winning and Losing](#winning-and-losing)
21. [State Management](#state-management)
22. [UI Components](#ui-components)
23. [Testing Strategy](#testing-strategy)

---

## Game Overview

Wrath of Ashardalon is a cooperative dungeon-crawling adventure where 1-5 players control heroes exploring randomly generated dungeons. Players work together to:

- Explore randomly generated dungeon tiles
- Battle monsters and overcome challenges
- Complete adventure objectives
- Level up heroes and discover treasure

### Core Concepts

- **Cooperative Gameplay**: All players work together against the game
- **Turn-Based**: Players take turns in clockwise order
- **Randomized Dungeons**: Dungeon tiles are drawn and placed during exploration
- **Monster AI**: Monsters act according to predefined behavior rules
- **Resource Management**: Players share healing surges and experience points

---

## Technical Architecture

### Technology Stack

| Technology | Purpose |
|------------|---------|
| **TypeScript** | Primary programming language for type-safe development |
| **Svelte** | UI framework for rendering the presentation layer |
| **Redux** | State management for game state, actions, and events |
| **Vite** | Build tool and development server |
| **Playwright** | End-to-end testing framework |
| **GitHub Pages** | Deployment platform (static hosting) |

### Design Principles

- **Offline-First**: Application works without internet after initial load
- **State-Driven**: All game logic flows through Redux state management
- **Deterministic**: Given the same state and action, produce the same result
- **Testable**: All game logic can be tested in isolation
- **Serializable**: Game state can be saved and restored

### Architecture Layers

1. **Presentation Layer**: Svelte components for UI rendering
2. **State Management Layer**: Redux store, reducers, and selectors
3. **Game Logic Layer**: Pure functions implementing game rules
4. **Asset Layer**: Images, sounds, and static data

---

## Game Components

### Heroes

Five hero classes are available, each with unique abilities:

| Hero | Class |
|------|-------|
| Quinn | Cleric |
| Vistra | Fighter |
| Keyleth | Paladin |
| Tarak | Rogue |
| Haskan | Wizard |

Each hero has:
- **Hit Points (HP)**: Health total
- **Armor Class (AC)**: Defense value
- **Surge Value**: HP restored when using a Healing Surge
- **Speed**: Number of squares that can be moved per turn
- **Power Cards**: At-Will, Utility, and Daily powers

### Monsters

Regular monsters encountered during exploration:

| Monster | Max Count |
|---------|-----------|
| Cultist | 3 |
| Legion Devil | 3 |
| Snake | 3 |
| Duergar Guard | 3 |
| Orc Smasher | 3 |
| Orc Archer | 3 |
| Kobold Dragonshield | 3 |
| Cave Bear | 3 |
| Gibbering Mouther | 3 |
| Grell | 3 |

### Villains

Powerful unique monsters:

| Villain |
|---------|
| Meerak, Kobold Dragonlord |
| Margrath, Duergar Captain |
| Kraash, Orc Storm Shaman |
| Bellax, Gauth |
| Rage Drake |
| Otyugh |
| Ashardalon, Red Dragon |

### Card Decks

- **Monster Deck**: Cards defining monster statistics and behavior
- **Encounter Deck**: Events, traps, hazards, curses, and environments
- **Treasure Deck**: Items and equipment heroes can acquire
- **Power Cards**: Hero abilities (At-Will, Utility, Daily)
- **Chamber Cards**: Special chamber encounters

### Tokens

- **Healing Surge Tokens**: Shared resource for hero recovery
- **HP Tokens**: 1 HP and 5 HP markers
- **Monster HP Tokens**: Track monster damage
- **Condition Tokens**: Dazed, Poisoned
- **Door Tokens**: Unlocked, Locked, Trapped
- **Hazard Markers**: Cave In, Pit, Volcanic Vapors
- **Treasure Markers**: Value denominations (100-500 gold)
- **Time Tokens**: Track adventure duration
- **Villager Tokens**: NPCs (Alek, Brandis, Cassi, Donnel, Elizar)

### Dungeon Tiles

Tiles are categorized by:
- **Color**: Black (dangerous) vs White (normal)
- **Exits**: x2, x3, x4 (number of exits/unexplored edges)
- **Type**: Normal, Named, Chamber, Start

Named tiles include:
- Ancient Battlefield
- Long Hallway
- Secure Exit
- Tunnel Exit
- Vault

Chamber tiles:
- Dire Chamber (Entrance, Large Chamber, standard tiles)
- Horrid Chamber (Entrance, Large Chamber, standard tiles)

---

## Game Setup

### Initial Setup Steps

1. **Select Adventure**: Choose an adventure from the Adventure Book
2. **Shuffle Decks**: Separately shuffle Monster, Encounter, and Treasure decks
3. **Hero Selection**: Each player:
   - Takes a Sequence of Play card
   - Chooses one of the 5 first-level heroes
   - Takes the corresponding Hero card, Power cards, and figure
   - Selects Power cards as specified on the Hero card (or randomly)
4. **Starting Treasure**: Each player draws Treasure cards until they have one Item
5. **Healing Surges**: Start with 2 Healing Surge tokens (shared party resource)
6. **Dungeon Setup**: Set up the Dungeon Tile stack and starting tile per adventure instructions
7. **First Player**: Choose or randomly determine the first player

### Deck Management

When a deck is depleted during play:
- Shuffle the discard pile
- Form a new deck
- Continue playing

---

## Order of Play

Play progresses clockwise starting with the first player. Each player's turn consists of three phases:

### Phase 1: Hero Phase

The active player performs hero actions (see [Hero Phase](#hero-phase)).

### Phase 2: Exploration Phase

If the hero ended movement on a tile edge, explore (see [Exploration Phase](#exploration-phase)).

### Phase 3: Villain Phase

Activate monsters and resolve encounters (see [Villain Phase](#villain-phase)).

---

## Hero Phase

### Starting the Phase

If the hero has 0 Hit Points:
- Must spend a Healing Surge token if available
- Discard the token and regain HP equal to Surge Value
- Then proceed with normal actions

### Available Actions

The hero must perform exactly ONE of the following action combinations:

1. **Move, then Attack**: Move up to Speed squares, then make one attack (or disable trap)
2. **Attack, then Move**: Make one attack (or disable trap), then move up to Speed squares
3. **Double Move**: Make two separate moves (up to Speed squares each)

### Attack Actions

When attacking:
- Select an attack card to use
- Choose a valid target within range
- Roll a d20
- Add attack bonus
- Compare to target's AC
- If attack roll ≥ AC, the attack hits
- Apply damage as specified by the power used

### Critical Hits

- A natural 20 on an attack roll is always a hit
- Second-level heroes deal +1 damage on natural 20s (critical attacks)

---

## Exploration Phase

### Trigger Condition

Exploration occurs when the hero ends movement on a tile with an unexplored edge.

### Exploration Steps

1. **Draw Tile**: Draw the top tile from the Dungeon Tile stack
2. **Place Tile**: Connect the new tile to the unexplored edge
3. **Draw Monster Card**: Draw a Monster card and place the monster figure on the new tile
   - If the drawn monster card is already in front of the player, discard it and draw another (repeat until a unique monster card is drawn)
   - The exploring hero's controller takes control of the placed monster

### Long Hallway Special Rule

When drawing a Long Hallway tile:
1. Place the Long Hallway normally
2. Draw an additional tile
3. Place it on the hallway's unexplored edge (if possible)
4. If the extra tile has a black triangle, draw an Encounter card during Villain Phase

---

## Villain Phase

### Phase Steps

1. **Activate Monsters**: Each monster the player controls acts (in order received)
2. **Activate Traps**: Each trap the player controls activates
3. **Draw Encounter**: If no new tile was placed this turn, draw an Encounter card

### Monster Activation Order

Monsters activate in the order they were acquired by the controlling player.

### Encounter Card Trigger

An Encounter card is drawn if:
- The hero did not place a new tile during Exploration Phase
- Or a Long Hallway's extra tile had a black triangle

---

## Combat System

### Attack Resolution

1. **Declare Attack**: Choose power and valid target
2. **Roll Attack**: Roll 1d20, add attack modifier
3. **Compare to AC**: Check if total ≥ target's Armor Class
4. **Apply Damage**: If hit, deal damage specified by power
5. **Check Defeat**: If target reaches 0 HP, it is defeated

### Attack Modifiers

- Base attack bonus (from power or hero stats)
- Item bonuses (only one attack bonus applies)
- Condition penalties
- Environmental effects

### Defense Modifiers

- Base Armor Class
- Item bonuses (only one defense bonus applies)
- Condition effects

### Targeting Rules

- **Melee Attacks**: Target must be adjacent (including diagonal)
- **Ranged Attacks**: Target must be within specified range
- **Line of Sight**: Required for most attacks
- **Area Effects**: May target multiple enemies per power description

---

## Movement and Positioning

### Movement Basics

- **Speed**: Number of squares a hero can move in one movement action
- **Squares**: Individual spaces on tiles
- **Diagonal Movement**: Allowed between squares (unless blocked)
- **Tile Movement**: Cannot move diagonally between tiles

### Movement Restrictions

- Cannot move through monsters (unless power allows)
- Cannot move through walls or obstacles
- Must stop when entering a square with an enemy (unless power allows)

### Counting Squares and Tiles

- When counting by squares, diagonal movement is allowed
- When counting by tiles, diagonal movement is NOT allowed

---

## Monster AI and Behavior

### Monster Activation

During the Villain Phase, each monster:
1. Checks activation conditions on its card
2. Moves according to its behavior rules
3. Attacks if conditions are met

### Monster Targeting

Monsters typically:
- Target the closest hero
- Move toward the closest hero if not adjacent
- Attack if adjacent to a hero

### Monster Card Information

Each Monster card specifies:
- **Name**: Monster type
- **AC**: Armor Class
- **HP**: Hit Points
- **Tactics**: How the monster moves and selects targets
- **Attack**: Attack bonus and damage
- **XP**: Experience Points awarded when defeated

### Controlling Monsters

- The player who drew a Monster card controls that monster
- When a monster is defeated, discard its card
- Monster cards may be placed in the Experience pile

### Multiple Matching Monsters

When multiple players control monsters with the same name:
- **Activation**: All matching monsters activate (move and attack) whenever any player activates their copy of the monster card
- **Defeating**: When a player defeats one of the matching monsters, they may choose any of the matching monster cards (from any player) to discard

---

## Dungeon Tile System

### Tile Structure

- **Tiles**: Basic building blocks of the dungeon
- **Squares**: Individual spaces within tiles
- **Unexplored Edge**: Tile edge where new tiles can be placed

### Start Tile

- The Start tile consists of 2 connected tiles
- Each section is treated as its own tile for movement and counting

### Tile Placement Rules

1. New tiles connect to unexplored edges
2. Tiles must align with the grid
3. Only one tile can connect to each edge

### Named Tiles

Special tiles with unique properties:
- Some are added to the Dungeon stack during setup
- Some have special placement or effect rules

---

## Experience and Leveling

### Experience Points (XP)

- **Party Resource**: XP is shared by all heroes
- **Monster XP**: Each Monster card lists its XP value
- **Villain XP**: Equal to the villain's level
- **Experience Pile**: Defeated monster cards placed here

### Spending Experience

XP can be spent for:

#### Canceling Encounter Cards

- Cost: 5 XP
- Timing: When an Encounter card is drawn (only at that moment)
- Effect: Discard the Encounter card, ignore its effects
- Excess points cannot be saved

#### Leveling Up

- Cost: 5 XP
- Trigger: Hero rolls a natural 20 on attack or disable trap roll
- Effect:
  - Flip Hero card to 2nd level side
  - Increase HP (damage is retained)
  - Increase AC
  - Increase Surge Value
  - Choose a new Daily Power
  - Gain critical attack ability (+1 damage on natural 20)

### XP from Monsters

- Monster XP can be used immediately if a 20 was rolled
- The Tome of Experience treasure also allows leveling

---

## Treasure System

### Drawing Treasure

- Draw one Treasure card when defeating a monster
- Maximum one Treasure card per turn (regardless of monsters defeated)

### Item Ownership

- When drawing an item, decide to keep it or give to another hero
- Decision is permanent (cannot transfer items later)

### Item Bonuses

- Heroes can benefit from multiple Treasure cards
- However, only ONE attack bonus and ONE defense bonus from items apply at a time

### Treasure Card Types

Cards specify when they can be used:
- Some provide passive bonuses
- Some are activated abilities
- Some are one-time use

---

## Encounter System

### Encounter Card Types

#### Events (Yellow Cards)
- Immediate effects
- Discarded after resolution
- Event-Attacks (Red) target heroes

#### Curses
- Place on Hero card
- Last for specified duration
- Apply ongoing negative effects

#### Environment
- Affects all players
- Only one Environment can be active
- New Environment replaces old
- Canceling with XP does NOT remove existing Environment

#### Hazards
- Place marker on active hero's tile
- If hazard already exists on tile, discard and draw new card
- Controlling player activates hazard during Villain Phase
- Attacks like a monster

#### Traps
- Similar to hazards with placement rules
- Can be disabled by heroes (see [Disabling Traps](#disabling-traps))

### Active Hero

The "Active Hero" referenced on cards is the hero controlled by the player who drew the card.

---

## Defeating Heroes

### Hero at 0 HP

When reduced to 0 HP:
- Place figure on its side (downed)
- Cannot take additional damage
- Cannot use powers or items
- Other effects still apply
- Monsters ignore downed heroes

### Recovery Before Turn

If healed before the start of your turn:
- Stand figure up
- Act normally on your turn

### Starting Turn at 0 HP

- Must spend a Healing Surge token
- Discard token
- Regain HP equal to Surge Value
- Take turn as normal

### Party Defeat

If any hero is at 0 HP at the start of their turn AND no Healing Surge tokens remain:
- **The heroes lose the adventure**

---

## Doors

### Door Rules (When Adventure Uses Them)

When drawing a tile with an open door symbol:
1. Place a Closed Door token on the symbol

### Opening Doors

A hero adjacent to a Closed Door token can try to open it:
- Turn over the token to reveal door type

#### Door Types

| Type | Effect |
|------|--------|
| **Unlocked** | Discard the token immediately |
| **Trapped** | Each adjacent hero takes 1 damage, then discard token |
| **Locked** | Place token face-up; hero can attempt to unlock instead of attacking (roll 10+) |

### Unlocking Locked Doors

- Hero must be adjacent to locked door
- Attempt instead of attacking
- Roll 10 or higher to unlock
- Success: Discard the token

---

## Chambers

### Chamber Setup

When an adventure uses Chamber rules:
1. Add appropriate Chamber Entrance tile to Dungeon stack
2. Place Chamber Tiles stack nearby

### Chamber Trigger

When drawing a Chamber Entrance tile:
1. Place the entrance tile normally
2. Draw from the matching Chamber stack
3. Place Chamber tiles next to each unexplored edge of the entrance
4. If Large Chamber is drawn, add tiles to ITS unexplored edges too
5. Draw the Chamber card (specific or from deck, per adventure)

### Filling the Chamber

Most Chamber cards require:
1. Place specified monster/villain on any Chamber tile
2. Starting with active hero, each hero draws a Monster card
3. Place monsters on empty Chamber tiles first
4. Place remaining monsters on any Chamber tile

### Chamber Markers

Use Shield markers on Monster cards to identify Chamber monsters.

### Chamber Goals

Each Chamber card specifies:
- Victory conditions for the chamber
- Special rules or effects

---

## Other Actions

### Picking Up Objects

- Must be in an adjacent square during Hero Phase
- Does NOT require an action
- Can pick up multiple items
- Can pick up items while moving past them

### Destroying Objects

If an object has AC and HP:
- Target it like a monster
- Area attacks can hit objects on the same tile
- Dealing HP damage destroys it
- Remove marker when destroyed

### Disabling Traps

While on a tile with a trap:
- Attempt instead of attacking
- Roll the number on the Trap card or higher
- Success: Discard card and marker

### Escaping the Dungeon

- Must be on specified location at end of Hero Phase
- Once escaped:
  - No longer take Hero or Exploration Phases
  - No longer draw Encounter cards
  - Still take Villain Phase
  - Still activate controlled Monster and Trap cards

---

## Winning and Losing

### Victory Conditions

Players win by completing the objective specified in the adventure.

### Defeat Conditions

Players lose if:
- Defeated by adventure-specific conditions
- Any hero is at 0 HP at start of turn with no Healing Surge tokens (unless adventure states otherwise)

---

## State Management

### Redux Store Structure

The game state should be organized into the following slices:

#### Game Slice
- Current adventure
- Game phase
- Turn order
- Active player
- Victory/defeat status

#### Players Slice
- Player information
- Controlled hero reference
- Controlled monster cards
- Controlled trap cards

#### Heroes Slice
- Hero identity and class
- Current HP and max HP
- Armor Class
- Speed
- Surge Value
- Level (1 or 2)
- Position (tile and square)
- Status (active, downed)
- Equipped items
- Power cards (available, used)
- Conditions (dazed, poisoned, etc.)

#### Dungeon Slice
- Placed tiles (positions and connections)
- Unexplored edges
- Objects on tiles
- Hazard and trap markers
- Door tokens

#### Monsters Slice
- Active monsters
- Monster positions
- Monster HP
- Monster controllers
- Activation order

#### Decks Slice
- Monster deck (draw pile, discard)
- Encounter deck (draw pile, discard)
- Treasure deck (draw pile, discard)
- Chamber cards
- Dungeon tile stack

#### Resources Slice
- Healing Surge tokens
- Experience pile (monster cards)
- Total XP available
- Active Environment card

### Action Types

#### Setup Actions
- Initialize game
- Select adventure
- Select heroes
- Shuffle decks
- Deal starting items

#### Hero Phase Actions
- Start turn (auto-heal if needed)
- Move hero
- Use power (attack)
- Disable trap
- Pick up item
- End hero phase

#### Exploration Actions
- Draw tile
- Place tile
- Spawn monster
- Complete exploration

#### Villain Phase Actions
- Activate monster
- Monster move
- Monster attack
- Activate trap
- Draw encounter
- Resolve encounter
- End villain phase

#### Combat Actions
- Declare attack
- Roll attack
- Apply damage
- Defeat monster
- Defeat hero

#### Resource Actions
- Spend healing surge
- Spend XP (cancel encounter)
- Spend XP (level up)
- Draw treasure
- Equip item

---

## UI Components

**For detailed user experience and interface design documentation:**
- [**lobby-ux.md**](lobby-ux.md) - Character selection screen design and interactions
- [**gameplay-ux.md**](gameplay-ux.md) - Game board screen design and interactions
- [**UX_GUIDELINES.md**](UX_GUIDELINES.md) - General UX principles for tabletop displays

### Technical Component Overview

This section provides a technical overview of UI components. For user-facing design details, see the documents linked above.

### Main Game Board

- **Dungeon Display**: Rendered tiles with proper connections
- **Hero Tokens**: Positioned on squares
- **Monster Tokens**: Positioned on squares
- **Markers**: Hazards, traps, doors, objects

### Hero Dashboard

- **Hero Card Display**: Stats, level, powers
- **HP Tracker**: Current and maximum HP
- **Power Cards**: Available powers with usage status
- **Inventory**: Equipped items and treasures
- **Conditions**: Active status effects

### Party Resources

- **Healing Surge Counter**: Available surge tokens
- **Experience Pool**: Current XP total
- **Active Environment**: Current environment card (if any)

### Card Displays

- **Monster Cards**: Active monsters being controlled
- **Trap Cards**: Active traps being controlled
- **Drawn Cards**: Recently drawn encounter/treasure cards

### Action Panel

- **Phase Indicator**: Current phase and player
- **Available Actions**: Valid actions for current state
- **Dice Roller**: Attack and skill check interface
- **Confirmation Dialogs**: Verify important decisions

### Game Log

- **Turn History**: Record of actions and events
- **Combat Results**: Attack rolls and damage
- **Card Draws**: What was drawn and effects

---

## Testing Strategy

### Unit Tests

Test pure game logic functions:
- Attack resolution calculations
- Movement validation
- Line of sight determination
- XP calculations
- Level up effects

### Reducer Tests

Test Redux state transitions:
- Each action produces correct state change
- Invalid actions are rejected
- State remains consistent

### Integration Tests

Test component interactions:
- Complete turn sequences
- Multi-phase interactions
- Deck management

### End-to-End Tests (Playwright)

Test complete user flows:
- Game setup from start
- Complete adventure playthrough
- Victory and defeat scenarios
- Save/load functionality

### Test Scenarios

| Scenario | Test Coverage |
|----------|---------------|
| Hero movement | Valid/invalid moves, diagonal, cross-tile |
| Combat | Attack rolls, hits, misses, criticals, damage |
| Exploration | Tile placement, monster spawning |
| Monster AI | Targeting, movement, attacks |
| Resource management | Healing surges, XP spending |
| Leveling | Trigger conditions, stat changes |
| Encounter resolution | Each encounter type |
| Victory/defeat | Win conditions, loss conditions |

---

## Variant Rules

### Difficulty Adjustment

To modify adventure difficulty:
- **Easier**: Increase Healing Surge tokens by one
- **Harder**: Decrease Healing Surge tokens by one

---

## Appendix: Card Reference

### Monster Card Structure
- Name
- AC (Armor Class)
- HP (Hit Points)
- XP (Experience Points)
- Tactics (movement and targeting behavior)
- Attack (bonus and damage)

### Hero Card Structure
- Name and Class
- Level 1 / Level 2 stats
- HP, AC, Speed, Surge Value
- Starting powers allowed
- Special abilities

### Encounter Card Structure
- Type (Event, Curse, Environment, Hazard, Trap)
- Effect description
- Duration (if applicable)
- Disable difficulty (for traps)

### Treasure Card Structure
- Item name
- Type (weapon, armor, consumable, etc.)
- Effect description
- Usage timing

---

*This design document serves as the authoritative reference for implementing Wrath of Ashardalon as a web application. All mechanics should be implemented according to the rules defined herein, which are derived from the official Wrath of Ashardalon v1.1 rulebook.*
