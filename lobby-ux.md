# Lobby UX Design - Character Selection Screen

This document describes the design layout and user interactions for the **Character Selection Screen** (also referred to as the "lobby"). This is the first screen players see when starting the game.

For gameplay screen layout and interactions, see [gameplay-ux.md](gameplay-ux.md).

---

## Table of Contents

1. [Overview](#overview)
2. [Screen Layout](#screen-layout)
3. [Edge-Based Selection System](#edge-based-selection-system)
4. [Hero Cards and Selection](#hero-cards-and-selection)
5. [Power Card Selection](#power-card-selection)
6. [Start Game Flow](#start-game-flow)
7. [Multi-Player Edge Assignment](#multi-player-edge-assignment)
8. [Visual Feedback](#visual-feedback)

---

## Overview

The Character Selection Screen (lobby) is designed for **tabletop displays** where multiple players sit around different edges of the screen. Players select their heroes from their physical position at the table, establishing their "edge" which determines the orientation of their UI elements throughout the game.

### Purpose

- Allow 1-5 players to select hero characters
- Assign each player to a screen edge (bottom, top, left, or right)
- Enable power card selection for each hero
- Initialize the game with selected heroes positioned on the Start Tile

### Key Features

- **Edge-based selection**: Players select heroes from their physical position
- **Multi-directional layout**: Hero cards appear at all four edges, rotated appropriately
- **Power card customization**: Each hero selects their starting power cards
- **Visual orientation**: All text and cards face the player at each edge

---

## Screen Layout

The Character Selection Screen is divided into **four edge zones** plus a **central area**:

```
┌─────────────────────────────────────────┐
│         TOP EDGE (rotated 180°)         │
│  [Hero] [Hero] [Hero] [Hero] [Hero]    │
├──┬────────────────────────────────────┬─┤
│  │                                    │ │
│L │         CENTRAL AREA               │R│
│E │      (Title & Instructions)        │I│
│F │                                    │G│
│T │                                    │H│
│  │                                    │T│
│E │                                    │ │
│D │                                    │E│
│G │                                    │D│
│E │                                    │G│
│  │                                    │E│
│  │    [Start Adventure Button]        │ │
├──┴────────────────────────────────────┴─┤
│  [Hero] [Hero] [Hero] [Hero] [Hero]    │
│      BOTTOM EDGE (standard/upright)     │
└─────────────────────────────────────────┘
```

### Edge Zones

Each edge zone displays:
- **Five hero cards** (one for each available hero)
- **Selection indicators** (visual feedback when a hero is selected)
- **Hero portraits** rotated to face the player at that edge

### Central Area

The central area displays:
- **Game title**: "Wrath of Ashardalon"
- **Selection count**: "X Heroes Selected" 
- **Instructions**: Brief guidance for new players
- **Start Adventure button**: Enabled when heroes are selected and power cards chosen

---

## Edge-Based Selection System

### Four Screen Edges

| Edge | Orientation | Typical Seating |
|------|-------------|-----------------|
| **Bottom** | 0° (upright) | Player facing screen normally |
| **Top** | 180° (inverted) | Player on opposite side |
| **Left** | 90° CCW | Player on left side |
| **Right** | 90° CW | Player on right side |

### Selection Mechanism

1. **Player taps a hero card** from their edge of the table
2. **Hero becomes selected** and is assigned to that player's edge
3. **Edge assignment is permanent** for that hero (cannot be re-selected from a different edge)
4. **Visual indication** shows the hero is selected (golden border/highlight)
5. **Power card selection opens** for that hero

### Edge Assignment Rules

- **One player per edge** (in 1-4 player games)
- **Maximum 4 edges** supporting 4 dedicated player zones
- **5-player support**: When 5 players join, one edge accommodates two players side-by-side
- **Unassigned edges** show all heroes as available for selection
- **Once assigned**, a hero card appears greyed out (unavailable) at other edges

---

## Hero Cards and Selection

### Available Heroes

Five heroes are available for selection, displayed at each edge:

| Hero | Class | Description |
|------|-------|-------------|
| **Quinn** | Cleric | Healer and support character |
| **Vistra** | Fighter | Tank and melee specialist |
| **Keyleth** | Paladin | Balanced fighter with healing |
| **Tarak** | Rogue | Agile striker with mobility |
| **Haskan** | Wizard | Ranged spellcaster |

### Hero Card Display

Each hero card shows:
- **Hero portrait image** (from game assets)
- **Hero name** (rotated to face the edge)
- **Class name** (Cleric, Fighter, etc.)
- **Selection border** (golden when selected)

### Selection States

| State | Visual Appearance | Interaction |
|-------|-------------------|-------------|
| **Available** | Normal appearance, clickable | Can be selected |
| **Selected (at this edge)** | Golden border, highlighted | Can be deselected |
| **Selected (at another edge)** | Greyed out, unavailable | Cannot be selected |

### Selection Interaction

```
1. Player clicks/taps hero card from their edge
2. If available:
   - Hero becomes selected
   - Card shows golden border
   - Power card selection modal opens
   - Selection count updates
3. If already selected at this edge:
   - Hero becomes deselected
   - Card returns to normal appearance
   - Power card selection is cleared
   - Selection count updates
4. If selected at another edge:
   - No action (card is disabled)
```

---

## Power Card Selection

After selecting a hero, players must choose their **starting power cards** before starting the game.

### Power Card Categories

Each hero selects:
- **1 Utility Card** (non-attack action)
- **2 At-Will Cards** (repeatable attacks)
- **1 Daily Card** (powerful one-time use)

### Power Card Selection Modal

When a hero is selected, a modal dialog appears showing:

#### Modal Layout

```
┌────────────────────────────────┐
│  [Hero Name] - Power Cards     │
├────────────────────────────────┤
│                                │
│  Utility Power (Select 1)      │
│  [ ] Card A  [ ] Card B        │
│                                │
│  At-Will Powers (Select 2)     │
│  [ ] Card C  [ ] Card D        │
│  [ ] Card E  [ ] Card F        │
│                                │
│  Daily Power (Select 1)        │
│  [ ] Card G  [ ] Card H        │
│                                │
│     [Confirm Selection]        │
└────────────────────────────────┘
```

#### Modal Orientation

- **Modal is rotated** to face the selecting player's edge
- **Text and cards** are readable from the player's position
- **Modal blocks** other interactions until selection is complete

#### Selection Process

1. **Modal opens** when hero is selected
2. **Player chooses** cards from each category
3. **Confirm button** enabled when all categories are filled
4. **Selection saved** to game state
5. **Modal closes** returning to character selection
6. **Checkmark appears** on hero card indicating power cards are selected

### Visual Indicators

- **Incomplete selection**: Hero card shows ⚠️ warning indicator
- **Complete selection**: Hero card shows ✓ checkmark indicator
- **Start button**: Remains disabled until all selected heroes have power cards chosen

---

## Start Game Flow

### Prerequisites

Before starting the game:
- ✅ At least **1 hero selected** (maximum 5)
- ✅ All selected heroes have **power cards chosen**
- ✅ Each hero is **assigned to an edge**

### Start Adventure Button

**Location**: Center of screen, visible from all edges

**States**:
| Condition | State | Appearance |
|-----------|-------|------------|
| No heroes selected | Disabled | Greyed out |
| Heroes selected, no power cards | Disabled | Greyed out with ⚠️ |
| All requirements met | Enabled | Highlighted, clickable |

### Transition to Gameplay

When Start Adventure is clicked:

```
1. Character selection screen fades out
2. Game state initializes:
   - Selected heroes spawn on Start Tile
   - Edge assignments are preserved
   - Power cards are loaded
   - Turn order is established
3. Game board screen fades in
4. First hero's turn begins
```

---

## Multi-Player Edge Assignment

### 1-Player Game

- Player selects hero(es) from any edge
- Typically uses bottom edge (standard orientation)
- Other edges remain empty

### 2-Player Game

- Players select from opposite edges (e.g., bottom and top)
- Or adjacent edges (e.g., bottom and left)
- Each player's UI oriented to their edge

### 3-Player Game

Common configurations:
- Bottom, top, left (right edge empty)
- Bottom, left, right (top edge empty)

### 4-Player Game

- All four edges occupied
- Each player has dedicated edge zone
- Optimal tabletop experience

### 5-Player Game

- **Four edges** + **one shared edge**
- Fifth player shares an edge with another player
- Shared edge UI splits space for two players:
  - Player cards positioned side-by-side
  - Both oriented toward that edge
  - Smaller individual zones

---

## Visual Feedback

### Selection Animations

All visual changes are **smoothly animated** to avoid jarring transitions:

| Interaction | Animation | Duration |
|-------------|-----------|----------|
| Hero card hover | Subtle glow/scale | 150ms |
| Hero selected | Border expand, color change | 300ms |
| Hero deselected | Border fade, revert color | 300ms |
| Power modal open | Fade in, scale up | 300ms |
| Power modal close | Fade out, scale down | 200ms |
| Start button enable | Pulse effect | 400ms |

### Color Coding

- **Available heroes**: Normal colors (from hero assets)
- **Selected heroes**: Golden/yellow border (#FFD700)
- **Unavailable heroes**: Greyed out (#888888)
- **Complete selection**: Green checkmark (✓)
- **Incomplete selection**: Yellow warning (⚠️)

### Touch Targets

For tabletop touch displays:
- **Hero cards**: Minimum 200×280px touch area
- **Power card checkboxes**: Minimum 44×44px
- **Start button**: Minimum 200×60px
- **Adequate spacing**: 20px minimum between interactive elements

---

## Related Documentation

- [**gameplay-ux.md**](gameplay-ux.md) - Game board screen layout and interactions
- [**UX_GUIDELINES.md**](UX_GUIDELINES.md) - General UX principles for tabletop displays
- [**INITIAL_SCREENS.md**](INITIAL_SCREENS.md) - Technical specification for screen flow
- [**E2E Test 001**](e2e/001-character-selection/README.md) - Character selection test with screenshots
- [**E2E Test 019**](e2e/019-power-card-selection/README.md) - Power card selection test
- [**E2E Test 022**](e2e/022-multi-player-ui-orientation/README.md) - Multi-player edge orientation test

---

## Implementation Notes

This document describes the **user-facing design** of the Character Selection Screen. For implementation details, see:
- `src/components/CharacterSelect.svelte` - Character selection component
- `src/components/PowerCardSelection.svelte` - Power card modal
- `src/store/heroesSlice.ts` - Hero selection state management

**Testing**: All character selection flows are covered by E2E tests in the `e2e/` directory with visual verification screenshots.
