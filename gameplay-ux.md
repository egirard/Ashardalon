# Gameplay UX Design - Game Board Screen

This document describes the design layout and user interactions for the **Game Board Screen** during active gameplay. This is where players explore the dungeon, battle monsters, and complete objectives.

For the character selection (lobby) screen, see [lobby-ux.md](lobby-ux.md).

---

## Table of Contents

1. [Overview](#overview)
2. [Screen Layout](#screen-layout)
3. [Game Board Center Area](#game-board-center-area)
4. [Game State Panel](#game-state-panel)
5. [Player Dashboards](#player-dashboards)
6. [Turn Phases and Indicators](#turn-phases-and-indicators)
7. [Interactive Elements](#interactive-elements)
8. [Card and Overlay Displays](#card-and-overlay-displays)
9. [Combat Interface](#combat-interface)
10. [Status Effects and Notifications](#status-effects-and-notifications)

---

## Overview

The Game Board Screen is the main gameplay interface where players:
- Explore dungeon tiles
- Move hero tokens
- Battle monsters
- Manage resources (HP, XP, healing surges)
- Use power cards and treasure items
- Track scenario objectives

### Design Philosophy

- **Tabletop-optimized**: Multiple players view from different edges
- **No scrolling**: All elements fit within viewport
- **Dynamic scaling**: Map scales automatically as dungeon grows
- **Edge-oriented**: Each player's UI faces their assigned edge
- **Shared center**: Game board is viewable by all players

---

## Screen Layout

The gameplay screen consists of three main regions:

```
┌────────────────────────────────────────────────┐
│  Player Dashboard (Top Edge - rotated 180°)   │
├──┬──────────────────────────────────────────┬──┤
│P │                                          │G │
│l │                                          │a │
│a │           GAME BOARD                     │m │
│y │         (Dungeon Map)                    │e │
│e │        [Tiles] [Heroes]                  │  │
│r │         [Monsters] [Tokens]              │S │
│  │                                          │t │
│D │                                          │a │
│a │                                          │t │
│s │                                          │e │
│h │                                          │  │
│b │                                          │P │
│o │                                          │a │
│a │                                          │n │
│r │                                          │e │
│d │                                          │l │
│  │                                          │  │
│( │                                          │( │
│L │                                          │R │
│e │                                          │i │
│f │                                          │g │
│t │                                          │h │
│) │                                          │t │
├──┴──────────────────────────────────────────┴──┤
│  Player Dashboard (Bottom Edge - upright)      │
└────────────────────────────────────────────────┘
```

**Screenshot References**:
- Single player game board: [E2E Test 001](e2e/001-character-selection/001-character-selection.spec.ts-snapshots/002-game-board-chromium-linux.png)
- Multi-player layout (Quinn's turn): [E2E Test 022](e2e/022-multi-player-ui-orientation/022-multi-player-ui-orientation.spec.ts-snapshots/004-game-board-quinn-turn-bottom-chromium-linux.png)
- Multi-player layout (Vistra's turn, top): [E2E Test 022](e2e/022-multi-player-ui-orientation/022-multi-player-ui-orientation.spec.ts-snapshots/005-game-board-vistra-turn-top-rotated-chromium-linux.png)
- Multi-player layout (Keyleth's turn, left): [E2E Test 022](e2e/022-multi-player-ui-orientation/022-multi-player-ui-orientation.spec.ts-snapshots/006-game-board-keyleth-turn-left-rotated-chromium-linux.png)

### Three Main Regions

1. **Game Board (Center)**: Dungeon map with tiles, heroes, monsters, and markers
2. **Player Dashboards (Edges)**: Individual player UI at each occupied edge
3. **Game State Panel (Right)**: Shared game information (objective, XP, surges, etc.)

---

## Game Board Center Area

The center of the screen displays the **dungeon map** - the shared game space visible to all players.

### Components

#### Dungeon Tiles

- **Start Tile**: 8-cell tall double-height tile where game begins
- **Regular Tiles**: 4×4 cell tiles explored during gameplay
- **Unexplored Edges**: Indicators showing where new tiles can be placed
- **Auto-scaling**: Map scales down as more tiles are added
- **Auto-centering**: Map remains centered as it grows

#### Hero Tokens

Each selected hero has a token on the map showing:
- **Hero portrait image** (circular or square)
- **Hero name label** (positioned below token)
- **Active indicator** (golden glow when it's their turn)
- **Position**: On specific grid squares within tiles

#### Monster Tokens

Spawned monsters appear as tokens showing:
- **Monster image** (from monster card)
- **Monster name** (abbreviated or full)
- **HP indicator** (optional, for damaged monsters)
- **Status effects** (poisoned, etc.)
- **Controlled indicator** (when player controls the monster)

#### Environmental Markers

- **Trap markers** (🔺): Indicate trap hazards on specific squares
- **Hazard markers** (⚠️): Mark dangerous terrain
- **Board tokens** (special): Blade Barrier, Flaming Sphere, etc.
- **Edge indicators**: Show unexplored exits from tiles

### Map Scaling Behavior

As the dungeon grows:

| Tiles Placed | Map Scale | Behavior |
|--------------|-----------|----------|
| 1 (Start Tile) | 100% | Full size |
| 2-3 tiles | 80-90% | Slight zoom out |
| 4-6 tiles | 60-80% | Moderate zoom out |
| 7+ tiles | 40-60% | Significant zoom out |
| 10+ tiles | 20-40% | Minimum scale (legibility threshold) |

**Animation**: Scale changes animate smoothly over 300-400ms using CSS transitions.

### Map Control Mode

Players can manually control the map view:

**Zoom Controls** (when enabled):
- Zoom in/out buttons (+ / −)
- Zoom slider (10% - 200%)
- Reset view button (↺)
- Current zoom percentage display

**Pan Controls**:
- Click and drag to pan
- Touch and drag on tablets
- Pinch-to-zoom on touch devices

**Toggle**: Map control button in corner controls activates/deactivates manual mode

---

## Game State Panel

Located on the **right side** of the screen, this panel displays shared game information visible to all players.

### Panel Components (Top to Bottom)

**Screenshot Reference**: See complete game state panel in [E2E Test 047](e2e/047-environment-indicator-positioning/047-environment-indicator-positioning.spec.ts-snapshots/002-kobold-trappers-environment-active-chromium-linux.png)

#### 1. Environment Indicator

**Appears when**: Environment encounter card is active (e.g., "Kobold Trappers", "Surrounded")

**Display**:
- Purple/blue badge with environment icon (🌫️)
- Environment card name
- Positioned at **top** of panel (above objective)

**Behavior**:
- Appears when environment card is drawn
- Replaces previous environment (only one active)
- Disappears when environment effect ends

**Historical Context**: PR #217 fixed positioning issue where this indicator overlapped other controls. It now properly flows at the top of the panel.

**Screenshot References**:
- Environment indicator active: [E2E Test 047](e2e/047-environment-indicator-positioning/047-environment-indicator-positioning.spec.ts-snapshots/002-kobold-trappers-environment-active-chromium-linux.png)
- Without environment indicator: [E2E Test 047](e2e/047-environment-indicator-positioning/047-environment-indicator-positioning.spec.ts-snapshots/001-game-started-no-environment-chromium-linux.png)

#### 2. Objective Display

**Shows**:
- 🎯 Target icon
- "Objective:" label
- Objective description (e.g., "Defeat 12 monsters")
- Progress tracker (e.g., "5 / 12 defeated")

**Example**: 
```
🎯 Objective: Defeat 12 monsters
   5 / 12 defeated
```

#### 3. XP Counter

**Shows**:
- ⭐ Star icon
- "XP:" label  
- Current party experience points
- Updates when monsters are defeated

**Example**: `⭐ XP: 15`

#### 4. Healing Surge Counter

**Shows**:
- 💊 Bandage icon
- "Surges:" label
- Available healing surges (shared resource)
- Starting count: 2 per hero

**Example**: `💊 Surges: 8`

#### 5. Tile Deck Counter

**Shows**:
- 🗺️ Map icon
- "Tiles:" label
- Number of tiles remaining in deck
- Decreases as tiles are explored

**Example**: `🗺️ Tiles: 15`

#### 6. Movement Controls (during hero phase)

**Shown during**: Hero phase with incremental movement

**Components**:
- **Remaining Movement Display**: "🏃 Movement: 3 remaining"
- **Complete Move Button**: Ends movement early
- **Undo Button**: Reverts last movement square

#### 7. End Phase Button

**Text varies by phase**:
- "End Hero Phase"
- "End Exploration"
- "End Villain Phase"

**States**:
- Enabled: Normal appearance, clickable
- Disabled: Greyed out (during map control mode)

**Behavior**:
- Click to advance to next phase
- Auto-advances in some situations (e.g., after attack+move)

---

## Player Dashboards

Each player has a dashboard at their assigned edge showing their hero's information and controls.

### Dashboard Layout (Active Player)

When it's a player's turn, their dashboard displays:

```
┌─────────────────────────────┐
│  [Hero Portrait]            │
│                             │
│  Hero Name                  │
│  HP: 10 / 12    ❤️          │
│                             │
│  HERO PHASE                 │
│  (Turn indicator)           │
│                             │
│  [Power Card 1]             │
│  [Power Card 2]             │
│  [Power Card 3]             │
│                             │
│  Treasure Items:            │
│  [Item 1] [Item 2]          │
└─────────────────────────────┘
```

**Screenshot References**: 
- Active player dashboard (bottom edge): [E2E Test 022](e2e/022-multi-player-ui-orientation/022-multi-player-ui-orientation.spec.ts-snapshots/004-game-board-quinn-turn-bottom-chromium-linux.png)
- Active player dashboard (top edge, rotated): [E2E Test 022](e2e/022-multi-player-ui-orientation/022-multi-player-ui-orientation.spec.ts-snapshots/005-game-board-vistra-turn-top-rotated-chromium-linux.png)
- Active player dashboard (left edge, rotated): [E2E Test 022](e2e/022-multi-player-ui-orientation/022-multi-player-ui-orientation.spec.ts-snapshots/006-game-board-keyleth-turn-left-rotated-chromium-linux.png)

### Dashboard Layout (Inactive Player)

When it's NOT a player's turn, their dashboard shows simplified info:

```
┌─────────────────────────────┐
│  [Hero Portrait]            │
│                             │
│  Hero Name                  │
│  HP: 10 / 12    ❤️          │
│                             │
│  Status: Ready              │
└─────────────────────────────┘
```

### Dashboard Components

#### Hero Portrait
- Circular or square image
- Shows hero character art
- Matches hero selected in lobby

#### Hero Name and HP
- **Name**: Player's hero name (Quinn, Vistra, etc.)
- **HP Display**: "10 / 12" (current / maximum)
- **Heart Icon**: Visual indicator (❤️)
- **Color coding**: 
  - Green: Full or high HP
  - Yellow: Moderate HP
  - Red: Low HP (warning)

#### Status Effects
Displayed as icons/badges:
- 🧪 **Poisoned**: Takes damage at turn end
- 🛡️ **Defended**: AC bonus
- ⚡ **Charged**: Other temporary effects

#### Turn Phase Indicator (Active Player Only)

Shows current phase:
- **HERO PHASE** (player's actions)
- **EXPLORATION PHASE** (draw/place tile)
- **VILLAIN PHASE** (monsters activate)

#### Power Cards (Active Player Only)

Displays hero's power cards:
- **At-Will cards**: Always available
- **Utility cards**: Repeatable actions
- **Daily cards**: One-time powerful abilities
- **Visual state**: 
  - Upright = Available
  - Flipped = Used
  - Greyed = Cannot use now

#### Treasure Items

Shows equipped/carried items:
- Item icons/cards
- Use button (if applicable)
- Quantity for consumables

### Dashboard Orientation

Dashboards are **rotated** to face the player at each edge:

| Edge | Rotation | Reading Direction |
|------|----------|-------------------|
| Bottom | 0° | Upright (standard) |
| Top | 180° | Inverted |
| Left | 90° CCW | Rotated left |
| Right | 90° CW | Rotated right |

**Active Player Highlight**: Golden glow effect around active player's dashboard

---

## Turn Phases and Indicators

Gameplay progresses through three phases each turn:

### Phase Cycle

```
HERO PHASE → EXPLORATION PHASE → VILLAIN PHASE → Next Hero's Turn
```

### 1. Hero Phase

**Active Player Actions**:
- ✅ Move (up to speed value)
- ✅ Attack (once per turn)
- ✅ Use power cards
- ✅ Use treasure items
- ✅ Pass/end phase

**Valid Action Sequences**:
- Move → Attack (turn auto-ends)
- Attack → Move (turn auto-ends)
- Move → Move (double move, turn auto-ends)
- Pass (immediately advance to exploration)

**UI Elements Shown**:
- Movement overlay (valid squares highlighted)
- Attack button (if adjacent to monster)
- Power card panel (available cards)
- End Hero Phase button

**Restrictions**:
- ❌ Cannot attack twice
- ❌ Cannot use daily card twice
- ✅ Can move in increments (step-by-step)

### 2. Exploration Phase

**Purpose**: Draw and place a new dungeon tile (if hero moved to unexplored edge)

**Process**:
1. Check if hero triggered exploration
2. If yes: Draw tile from deck
3. Player places tile at unexplored edge
4. Tile appearance animates (fade in)
5. Draw encounter card (monster or event)
6. Spawn monster (if applicable)
7. Show encounter card details

**UI Elements**:
- Tile placement indicators
- Encounter card display (modal/overlay)
- Exploration phase notification

**Auto-Advance**: If no exploration triggered, phase ends immediately

### 3. Villain Phase

**Purpose**: Activate all monsters in play

**Process**:
1. For each monster in play order:
   - Display monster card
   - Resolve monster action (move or attack)
   - Show action result
   - Player dismisses result
2. After all monsters activate:
   - Draw encounter card
   - Resolve event or spawn new monster
3. Phase ends, next hero's turn begins

**UI Elements**:
- Monster card display (current activating monster)
- Monster move indicator (target square highlighted)
- Monster attack result card
- Encounter card display

**Auto-Progression**: Monsters activate sequentially with player dismissal between each

---

## Interactive Elements

### Movement System

#### Movement Overlay

When movement is available:
- **Valid squares** highlighted in blue/green
- **Invalid squares** remain unhighlighted
- **Hero token** can be dragged/clicked
- **Path preview** shows route to destination

#### Incremental Movement

Players can move step-by-step:
1. Click adjacent valid square
2. Hero moves one square
3. Remaining movement updates
4. Can continue or complete move
5. **Undo** available for last step

#### Movement Triggers

- **Unexplored Edge**: Triggers exploration phase
- **Trap**: Hero takes damage
- **Hazard**: Special effect applies
- **Monster Square**: Cannot move through (blocked)

### Attack System

#### Attack Button

Appears when:
- ✅ Hero phase active
- ✅ Hero can attack (hasn't attacked yet)
- ✅ Monster is adjacent (or within range for ranged attacks)

Shows:
- 🗡️ Sword icon
- "Attack" label
- Target count (e.g., "2 monsters nearby")

#### Power Card Attacks

Power card panel shows available attack cards:
- Card name and description
- Attack bonus (+X)
- Damage dice
- Special effects
- **Click to use** card against selected target

#### Target Selection

For attacks with multiple potential targets:
1. Available targets highlighted
2. Player clicks target monster
3. Attack executes
4. Result display shows outcome

### Treasure and Items

#### Treasure Cards

When treasure is drawn:
- Card display appears (modal overlay)
- Shows item name, description, effect
- "Assign to Hero" buttons for each hero
- Player assigns item to hero's inventory

#### Item Usage

From player dashboard:
- Click item icon/card
- Confirm usage (if applicable)
- Effect applies immediately
- Used items removed (consumables) or marked (reusable)

---

## Card and Overlay Displays

Several card/overlay types appear during gameplay:

### Monster Cards

**Shown when**:
- Monster spawns (exploration or villain phase)
- Monster activates (villain phase)

**Display**:
- Full card image
- Monster name and type
- HP, AC, attack stats
- Special abilities
- **Dismiss button**: "OK" or "Continue"

**Position**: Center overlay, blocks board view

### Encounter Cards

**Shown when**:
- Drawn during exploration phase
- Drawn during villain phase

**Types**:
- **Monster**: Spawn new monster
- **Event**: Special one-time effect
- **Environment**: Ongoing effect (replaces previous)

**Display**:
- Card image with effect text
- "Resolve" or "Dismiss" button
- Explanation of effect

**Position**: Center overlay

### Combat Result Cards

**Shown after**:
- Hero attacks monster
- Monster attacks hero

**Hero Attack Result**:
- Attack roll (d20 + bonus)
- Target AC
- Hit or Miss
- Damage dealt (if hit)
- Monster defeated message (if applicable)

**Monster Attack Result**:
- Monster name
- Attack roll
- Target hero AC
- Damage dealt (if hit)
- Hero defeated message (if applicable)

### Level Up Animation

**Shown when**: Hero gains enough XP to level up

**Display**:
- ⭐ Star burst animation
- "LEVEL UP!" text
- Hero name
- Old stats → New stats
- HP increased message

**Duration**: 3-4 seconds, auto-dismisses

### Healing Surge Animation

**Shown when**: Hero uses healing surge

**Display**:
- 💊 Heart/bandage animation
- "HEALING SURGE" text
- Hero name
- HP restored amount
- New HP total

**Duration**: 2-3 seconds, auto-dismisses

---

## Combat Interface

### Hero Attacking

**Step-by-step flow**:

1. **Hero Phase begins**: Movement overlay appears
2. **Hero moves** (optional): Adjacent to monster or within range
3. **Attack button appears**: If valid target exists
4. **Click Attack**: Power card panel opens
5. **Select power card**: Choose attack card to use
6. **Select target**: Click monster to attack
7. **Roll attack**: D20 + attack bonus
8. **Result display**: Hit/miss, damage, effects
9. **Dismiss result**: Click "OK"
10. **Turn ends** (if move+attack or attack+move)

### Multi-Target Attacks

Some power cards attack multiple targets:

**Flow**:
1. Select multi-attack power card
2. System highlights valid targets
3. Player selects first target
4. Attack resolves
5. Player selects second target (if multi-attack)
6. Attack resolves
7. Continue until all attacks complete
8. Result summary displays

### Special Attack Types

#### Ranged Attacks
- Target within X tiles
- Line of sight rules (optional)
- Range indicator highlights targets

#### Area Attacks
- "All monsters on your tile"
- "All adjacent monsters"
- Automatically targets all valid monsters

#### Movement-Before-Attack
- Cards like "Charge"
- Move first, then attack
- Movement + attack range combined

---

## Status Effects and Notifications

### Status Effect Indicators

Shown on hero/monster tokens:

| Effect | Icon | Description |
|--------|------|-------------|
| **Poisoned** | 🧪 | Takes damage at turn end |
| **Defended** | 🛡️ | AC bonus until next turn |
| **Stunned** | 💫 | Cannot act this turn |
| **Slowed** | 🐌 | Movement reduced |

### Notification Messages

Brief messages appear for events:

#### Encounter Effect Notification
- Environment card activated
- Event card resolved
- Special ability triggered
- **Duration**: 2-3 seconds, auto-dismiss

#### Exploration Phase Notification
- "New tile placed"
- "Unexplored edge revealed"
- **Duration**: 2 seconds, auto-dismiss

#### Poison Damage Notification
- "Quinn takes 1 poison damage!"
- HP reduced display
- **Duration**: 2 seconds, auto-dismiss

#### Poison Recovery Notification
- "Quinn recovered from poison!" (success)
- "Quinn remains poisoned" (failure)
- **Duration**: 2 seconds, auto-dismiss

### Defeat Animations

#### Hero Defeated
- ☠️ Skull icon appears
- "HERO DEFEATED" message
- Hero name
- Optional: Respawn mechanics
- **Duration**: 3-4 seconds

#### Party Defeat
- All heroes defeated
- "PARTY DEFEATED" screen
- Game over message
- Options: Restart, Return to lobby

#### Monster Defeated
- ⚔️ Crossed swords animation
- XP awarded message
- Monster removed from board
- **Duration**: 2 seconds

---

## Corner Controls

Small utility buttons in screen corners:

### Top-Left Corner
- **Feedback Button**: Report bugs or provide feedback
- **Menu Button**: Access settings (future)

### Top-Right Corner  
- **Map Control Toggle**: Enable/disable manual map control
- **Undo Button**: Revert last action (when available)

### Bottom-Left Corner
- **Return to Character Select**: Restart game (confirmation required)

### Bottom-Right Corner
- *(Reserved for future use)*

---

## Related Documentation

- [**lobby-ux.md**](lobby-ux.md) - Character selection screen layout and interactions
- [**UX_GUIDELINES.md**](UX_GUIDELINES.md) - General UX principles for tabletop displays
- [**design.md**](design.md) - Complete game design and rules
- [**E2E Test 011**](e2e/011-hero-turn-structure/README.md) - Turn structure and phase transitions
- [**E2E Test 022**](e2e/022-multi-player-ui-orientation/README.md) - Multi-player dashboard orientation
- [**E2E Test 047**](e2e/047-environment-indicator-positioning/README.md) - Game state panel layout

---

## Implementation Notes

This document describes the **user-facing design** of the Game Board Screen. For implementation details, see:
- `src/components/GameBoard.svelte` - Main gameplay component
- `src/components/PlayerCard.svelte` - Player dashboard component
- `src/components/PlayerPowerCards.svelte` - Power card display
- `src/store/gameSlice.ts` - Game state management
- `src/store/combat.ts` - Combat resolution logic

**Testing**: All gameplay flows are covered by E2E tests in the `e2e/` directory with visual verification screenshots.
