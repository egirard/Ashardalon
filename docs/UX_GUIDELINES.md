# UX Guidelines for Tabletop Display

This document defines the user experience guidelines for the Wrath of Ashardalon web implementation, specifically designed for tabletop displays where multiple players sit around the screen viewing it from different edges.

---

## Table of Contents

1. [Core Principles](#core-principles)
2. [Viewport and Scaling](#viewport-and-scaling)
3. [Player Edge Positioning](#player-edge-positioning)
4. [Orientation and Readability](#orientation-and-readability)
5. [Animation Requirements](#animation-requirements)
6. [Character Selection Screen](#character-selection-screen)
7. [Game Board Screen](#game-board-screen)
8. [Turn Indicator and Phase Display](#turn-indicator-and-phase-display)
9. [Future UI Components](#future-ui-components)

---

## Core Principles

### 1. No Scrolling Required

The application is designed for a fixed tabletop display. **Scrolling should never be necessary.** All content must fit within the viewport at all times.

### 2. Multi-Directional Viewing

Players sit around different edges of the table. Each player's UI elements must be oriented toward them so they can read text and recognize images without rotating their head significantly.

### 3. Smooth Transitions

All visible UI changes must use CSS animations to smoothly transition elements to their new locations, sizes, or states. Abrupt visual changes are disorienting for tabletop users.

### 4. Equal Access

All players should have equal visual access to their personal UI elements, which are positioned along their edge of the screen.

---

## Viewport and Scaling

### Fit-to-Screen Requirement

All game content must fit within the browser viewport without requiring scrolling:

- The game board, dungeon map, and all UI elements must be visible simultaneously
- The UI must adapt to different screen sizes and aspect ratios
- Content should be centered within the viewport

### Dynamic Map Scaling

As the dungeon map grows during gameplay (with more tiles being explored):

- The map must automatically scale down to continue fitting within the available space
- The map must remain centered in the viewport
- Hero tokens, monster tokens, and markers must scale proportionally with the map
- Token labels and other text on the map must remain legible at reduced scales
- Establish a minimum scale threshold below which tokens and text become unusable; at this point, consider alternative display strategies such as zooming to active regions or providing a minimap
- If scaling would make elements too small to be usable, the system should prioritize legibility over fitting everything

### Reserved Edge Space

The outer edges of the viewport are reserved for player-specific UI elements:

- The center of the screen is dedicated to the shared game board
- Each edge (top, right, bottom, left) has a reserved zone for the player sitting at that edge
- The game board and map must scale and position themselves within the remaining central area

---

## Player Edge Positioning

### Four Player Edges

The screen has four edges where players can join:

| Edge | Position | Typical Seating |
|------|----------|-----------------|
| **Bottom** | South edge | Player facing screen normally |
| **Top** | North edge | Player on opposite side of table |
| **Left** | West edge | Player on left side of table |
| **Right** | East edge | Player on right side of table |

### Player Join Positions

When players join the game, they claim a specific edge:

- Player selection icons should be positioned along each edge of the screen
- When a player selects a hero from a particular edge, that edge becomes "their" edge
- All subsequent UI for that player should be oriented toward their edge

### Edge Assignment Rules

- Each edge can have at most one primary player assigned
- Maximum of 4 edges supports 4 players with dedicated edge zones
- **5-Player Support**: When 5 players participate, one edge must accommodate two players:
  - The two players on a shared edge split that edge's UI zone
  - Their UI elements are positioned side-by-side along the edge
  - Both players' elements remain oriented toward that edge
  - Consider placing the 5th player on the edge with the most available space
- Unassigned edges should show available player slots

---

## Orientation and Readability

### Text Orientation

All text belonging to a player must be oriented so it reads naturally from their edge. Text should be "upright" relative to where that player is sitting:

| Player Edge | Text Rotation | Description |
|-------------|---------------|-------------|
| Bottom | 0° (no rotation) | Text faces the bottom edge (standard orientation) |
| Top | 180° | Text is inverted, facing the top edge |
| Left | 90° counter-clockwise (or 270° clockwise) | Text is rotated so it faces the left edge |
| Right | 90° clockwise | Text is rotated so it faces the right edge |

### Elements Requiring Orientation

The following elements must be rotated to face each player:

- **Player name labels** - The player's name should be upright from their viewing angle
- **Character avatars** - The selected hero portrait/image should be upright for the player
- **Turn indicators** - "Your Turn" or similar prompts must face the relevant player
- **Health points and stats** - Any numeric displays for a player's hero
- **Action buttons** - Buttons the player needs to interact with should be oriented toward them
- **Card displays** - Power cards, treasure cards, and other player-specific cards

### Shared Elements

Elements that are shared by all players and viewed from the center should not be rotated:

- The game board/map itself remains in a fixed orientation
- Dungeon tiles maintain their placed orientation
- Monsters and neutral tokens remain in map orientation
- Global game state displays (shared healing surges, experience pool) should be positioned centrally or duplicated for each edge if space permits

---

## Animation Requirements

### General Animation Principles

All visible UI changes must animate smoothly:

- Use CSS transitions for property changes (position, size, opacity, rotation)
- Avoid instantaneous property changes that cause visual "jumping"
- Animation duration should be fast enough to feel responsive but slow enough to be perceivable (recommended: 200-400ms)
- Use appropriate easing functions (ease-out for most transitions)

### Specific Animation Cases

#### Map Scaling

When the dungeon map scales to accommodate new tiles:

- The scale change must animate smoothly
- All elements on the map (tokens, markers) must scale in sync
- The map must remain centered during the transition

#### Player Join/Leave

When a player joins or leaves:

- Their UI zone should animate in/out (fade, slide, or expand)
- Other players' UI zones should smoothly adjust if repositioning is needed

#### Turn Transitions

When the active turn passes to another player:

- The turn indicator should animate to the new player's edge
- Highlight effects (glow, pulse) should transition smoothly
- The previous active player's indicator should animate to an inactive state

#### Token Movement

When hero or monster tokens move on the map:

- Tokens should animate from their old position to their new position
- Movement should follow a direct path or tile-by-tile path as appropriate

#### Card/Panel Display

When cards, panels, or dialogs appear:

- They should animate in (fade, scale, or slide from player's edge)
- Dismissal should animate out in reverse

---

## Character Selection Screen

**For detailed information about the character selection (lobby) screen, see [lobby-ux.md](lobby-ux.md).**

### Summary

The character selection screen is designed for tabletop displays where players select heroes from their physical position at the table. Key features:

- Hero cards displayed at all four edges (bottom, top, left, right)
- Each edge rotated to face the player sitting there
- Player selects hero from their edge, establishing their edge assignment
- Power card selection required before starting game
- Start button enabled when all selected heroes have power cards chosen

### Tabletop Adaptation Principles

- Display hero selection options along each edge of the screen
- Heroes shown facing inward toward the center (upright for each edge's player)
- Player taps hero from their edge → assigned to that edge
- All 5 hero options visible at each edge
- No scrolling required
- Center displays game title and instructions

---

## Game Board Screen

**For detailed information about the gameplay screen, see [gameplay-ux.md](gameplay-ux.md).**

### Summary

The game board screen is the main gameplay interface with three primary regions:

1. **Center**: Dungeon map with tiles, heroes, monsters, and markers
2. **Edges**: Player dashboards showing hero status, power cards, and turn information
3. **Right Side**: Game state panel with objective, XP, healing surges, and controls

### Tabletop Adaptation Principles

#### Map Display

- Dungeon map occupies center of screen
- Auto-scales to fit as tiles are added
- Reserved edge zones not overlapped by map
- Smooth scaling animations (300-400ms)

#### Hero Tokens on Map

- Positioned on map in map-relative coordinates
- Token name labels use horizontal orientation (Option C: large fonts for distance readability)
- Hero tokens glow when active

#### Player UI Zones

Each player's edge zone displays (rotated to face them):
- Hero portrait and name
- Current HP and status effects
- Active turn phase indicator
- Power cards and treasure items

---

## Turn Indicator and Phase Display

**For detailed information about turn phases, see [gameplay-ux.md](gameplay-ux.md#turn-phases-and-indicators).**

### Summary

Turn indicator positioned in active player's edge zone showing:
- Current phase (Hero Phase, Exploration Phase, Villain Phase)
- Hero name and turn number
- Phase-specific actions available

Turn transitions animate smoothly from one player's edge to the next with visual effects (glow, highlight).

---

## Future UI Components

**Note**: Many previously "future" components are now implemented. See [gameplay-ux.md](gameplay-ux.md) for detailed documentation of implemented features.

This section defines tabletop guidelines for UI components not yet implemented or under development.

### Hero Dashboard / Stats Panel

When displaying detailed hero information:

- Position the panel in the owning player's edge zone
- Rotate content to face that player
- Animate panel open/close
- Keep panels compact to preserve central map space

### Monster Cards and Control

When a player controls monster cards:

- Display controlled monsters in that player's edge zone
- Rotate card information to face the player
- Show activation order and status

### Dice Rolling Interface

When dice rolls are required:

- Display the dice roller centrally or in the active player's zone
- Results should be visible to all players (consider central display)
- Animate dice roll for engagement

### Card Displays (Treasure, Encounter, Power)

When cards are drawn or played:

- Initially display the card centrally for all to see
- Animate the card to the relevant player's zone when assigned
- Rotate card content based on destination zone

### Action Panel / Available Actions

When showing available actions for the active player:

- Position action buttons in the active player's edge zone
- Rotate buttons to be readable and tappable from that edge
- Use clear, large touch targets for tabletop interaction

### Game Log / History

If a game log is implemented:

- Consider a collapsible panel accessible from any edge
- Or a central overlay that all players can read
- Text may need to be larger for readability from a distance

### Modal Dialogs and Confirmations

For dialogs requiring player input:

- Center the dialog for shared decisions
- Position in the relevant player's zone for individual decisions
- Ensure touch targets are appropriately sized and oriented

---

## Implementation Notes

This document specifies **behavior requirements only**, not specific CSS solutions or implementation details. When implementing these guidelines:

1. Ensure all layout decisions support the no-scroll requirement
2. Test with multiple simulated player edges
3. Verify animations are smooth and not jarring
4. Consider touch interaction on tabletop displays
5. Test at various screen sizes and aspect ratios

### Testing Criteria

When testing implementations against these guidelines, use the following measurable criteria:

- **Animation Duration**: All transitions should complete within 200-400ms
- **Touch Targets**: Interactive elements should have a minimum touch target size of 44×44 pixels
- **Viewport Fit**: Verify no scrollbars appear at the target display resolution
- **Scale Legibility**: Token labels should remain readable at minimum 10px rendered font size
- **Orientation**: Text should be readable when viewed from a distance of 2-3 feet from the corresponding edge

---

*This UX Guidelines document should be referenced when designing or modifying any UI components for the Wrath of Ashardalon web application.*
