# Issue: Start Game and See Board

## User Story

> As a user, I can click "Start Game" and see the game board with the Start Tile displayed, so that I can begin playing.

## Acceptance Criteria

- [ ] Clicking "Start Game" transitions to the game board screen
- [ ] The Start Tile image is displayed
- [ ] The dungeon board area is visible

## Design

### Components to Create

1. **GameBoard.svelte** - Main game board container
2. **DungeonDisplay.svelte** - Renders the dungeon tiles
3. **Tile.svelte** - Individual tile component

### Screen Navigation

```typescript
// Svelte store for current screen
import { writable } from 'svelte/store';

type Screen = 'hero-selection' | 'game-board';

export const currentScreen = writable<Screen>('hero-selection');

export function startGame(): void {
  currentScreen.set('game-board');
}
```

### Game State Initialization

```typescript
interface GameState {
  selectedHeroes: string[];
  tiles: PlacedTile[];
}

interface PlacedTile {
  id: string;
  tileType: string;
  position: { row: number; col: number };
  rotation: number;
}
```

### UI Layout - Game Board

```
┌──────────────────────────────────────────────────┐
│  Wrath of Ashardalon                             │
├──────────────────────────────────────────────────┤
│                                                  │
│              ┌──────────────┐                    │
│              │              │                    │
│              │  Start Tile  │                    │
│              │    Image     │                    │
│              │              │                    │
│              └──────────────┘                    │
│                                                  │
│                                                  │
│                                                  │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Start Tile

- The Start Tile is a special double-sized tile that begins every adventure
- It contains a staircase area where heroes begin
- Asset: `assets/tiles/start-tile.png`

## Implementation Tasks

- [ ] Create currentScreen Svelte store
- [ ] Create GameBoard.svelte component
- [ ] Create DungeonDisplay.svelte component
- [ ] Create Tile.svelte component
- [ ] Add Start Tile image asset
- [ ] Implement screen transition on "Start Game" click
- [ ] Initialize game state with Start Tile placed
- [ ] Style dungeon display area

## Unit Tests

- [ ] startGame function sets currentScreen to 'game-board'
- [ ] Game state initializes with Start Tile at center position
- [ ] Tile component renders tile image correctly

## E2E Test (Test 003)

```gherkin
Feature: Start Game and See Board

  Scenario: User starts game and sees dungeon board
    Given I am on the hero selection screen
    And I have selected 2 heroes
    When I click "Start Game"
    Then I see the game board screen
    And I see the Start Tile displayed
```

### Screenshot Sequence

1. `003-01-heroes-selected.png` - Hero selection with 2 heroes selected
2. `003-02-click-start.png` - About to click Start Game button
3. `003-03-game-board.png` - Game board screen with Start Tile visible

## Dependencies

- Issue #002 (Select Heroes for Game)

## Labels

`user-story`, `phase-1`, `ui`, `navigation`
