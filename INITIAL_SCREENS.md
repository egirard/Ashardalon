# Initial Screens Specification

This document specifies the barebones startup flow for the Wrath of Ashardalon web implementation.

## Implementation Status

✅ **IMPLEMENTED** - See the implementation in:
- `src/components/CharacterSelect.svelte` - Character selection screen
- `src/components/GameBoard.svelte` - Game board with Start Tile
- `src/store/heroesSlice.ts` - Hero selection state management
- `src/store/gameSlice.ts` - Game state management

### Screenshots

| Character Selection | Game Board |
|---------------------|------------|
| ![Character Selection](https://github.com/user-attachments/assets/af375510-13df-491d-9990-4e533a59b00f) | ![Game Board](https://github.com/user-attachments/assets/f972d21a-3f97-4caa-a834-a50f054944e3) |

---

## Screen Flow

```
┌─────────────────────┐
│  Character Select   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│    Game Board       │
│  (Start Tile View)  │
└─────────────────────┘
```

---

## Screen 1: Character Selection

### Purpose

Allow players to choose which hero characters will participate in the adventure.

### Layout

- Display all 5 available heroes:
  - Quinn (Cleric)
  - Vistra (Fighter)
  - Keyleth (Paladin)
  - Tarak (Rogue)
  - Haskan (Wizard)

### User Interaction

- Players select 1-5 heroes to use in the game
- Each hero can only be selected once
- Visual indication of selected vs unselected heroes
- "Start Game" button becomes enabled when at least 1 hero is selected

### State Changes

When "Start Game" is clicked:
- Initialize selected heroes in game state
- Transition to Game Board screen

---

## Screen 2: Game Board (Start Tile View)

### Purpose

Display the initial dungeon layout with the Start Tile and position hero tokens.

### Layout

- Render the Start Tile (two connected tile sections)
- The staircase is the central feature of the Start Tile
- Display hero tokens for all selected characters

### Hero Token Positioning

- Hero tokens are **randomly positioned** around the staircase
- Valid positions are squares adjacent to or near the staircase on the Start Tile
- Each hero occupies a unique square (no stacking)

### Initial State

- All selected heroes are placed on the Start Tile
- No monsters present initially
- No tiles explored beyond the Start Tile
- Unexplored edges are visually indicated
- Turn order is established (first player ready to take action)

---

## Minimal Implementation Requirements

### Character Selection Screen

1. ✅ Display hero portraits/cards from assets
2. ✅ Toggle selection state on click
3. ✅ Track number of selected heroes (1-5)
4. ✅ Enable/disable start button based on selection
5. ✅ Store selected heroes in Redux state

### Game Board Screen

1. ✅ Render Start Tile image (`assets/StartTile.png`)
2. ✅ Calculate valid starting positions around staircase
3. ✅ Randomly assign heroes to unique positions
4. ✅ Render hero tokens at assigned positions
5. ✅ Display turn indicator for first player

---

## Asset References

### Heroes

- `assets/Hero_Cleric_Quinn.png`
- `assets/Hero_Fighter_Vistra.png`
- `assets/Hero_Paladin_Keyleth.png`
- `assets/Hero_Rogue_Tarak.png`
- `assets/Hero_Wizard_Haskan.png`

### Tiles

- `assets/StartTile.png` - The starting dungeon tile

---

*This specification defines the minimum viable startup experience. Additional features such as adventure selection, detailed hero stats, and power card selection will be added in subsequent iterations.*
