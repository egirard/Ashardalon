# Issue: Explore and Place New Tile

## User Story

> As a user, when my hero ends movement on an unexplored edge, I see a new tile drawn and placed, expanding the dungeon.

## Acceptance Criteria

- [ ] Unexplored edges are visually indicated
- [ ] When hero ends movement adjacent to an unexplored edge, exploration triggers
- [ ] A new tile appears connected to the unexplored edge
- [ ] The tile deck count decreases

## Design

### Data Model

```typescript
interface TileEdge {
  tileId: string;
  direction: 'north' | 'south' | 'east' | 'west';
}

interface DungeonState {
  tiles: PlacedTile[];
  unexploredEdges: TileEdge[];
  tileDeck: string[];  // Array of tile IDs remaining
}

interface PlacedTile {
  id: string;
  tileType: string;
  position: GridPosition;
  rotation: number;
  edges: {
    north: 'wall' | 'open' | 'unexplored';
    south: 'wall' | 'open' | 'unexplored';
    east: 'wall' | 'open' | 'unexplored';
    west: 'wall' | 'open' | 'unexplored';
  };
}
```

### Tile Deck

Initial tile deck (basic tiles for this story):
- 3x Tile with 2 exits
- 3x Tile with 3 exits
- 2x Tile with 4 exits

```typescript
function initializeTileDeck(): string[] {
  const deck = [
    'tile-2exit-a', 'tile-2exit-b', 'tile-2exit-c',
    'tile-3exit-a', 'tile-3exit-b', 'tile-3exit-c',
    'tile-4exit-a', 'tile-4exit-b',
  ];
  return shuffle(deck);
}
```

### Exploration Logic

```typescript
function checkExploration(hero: HeroState, dungeon: DungeonState): TileEdge | null {
  // Check if hero is adjacent to an unexplored edge
  const heroSquare = hero.position.square;
  const heroTile = dungeon.tiles.find(t => t.id === hero.position.tileId);
  
  // Check each edge of the hero's current tile
  // Return the unexplored edge if hero is on edge square
}

function placeTile(edge: TileEdge, tileType: string, dungeon: DungeonState): PlacedTile {
  // Determine position for new tile based on edge direction
  // Rotate tile to connect properly
  // Return the newly placed tile
}
```

### Components to Create

1. **TileDeckCounter.svelte** - Shows remaining tiles in deck

### Components to Modify

1. **Tile.svelte** - Render unexplored edge indicators
2. **DungeonDisplay.svelte** - Handle tile placement

### UI Layout

```
┌──────────────────────────────────────────────────┐
│  Turn 1 - Quinn's Turn | Hero Phase   📦 8 tiles │
├──────────────────────────────────────────────────┤
│                                                  │
│                    ▓▓▓▓▓▓                        │
│                    ▓ ?? ▓ ← Unexplored           │
│                    ▓▓▓▓▓▓                        │
│                      │                           │
│              ┌───────┴───────┐                   │
│              │               │                   │
│  ▓▓▓▓▓▓─────│  Start Tile  │─────▓▓▓▓▓▓        │
│  ▓ ?? ▓     │               │     ▓ ?? ▓        │
│  ▓▓▓▓▓▓     │       🟡      │     ▓▓▓▓▓▓        │
│              │               │                   │
│              └───────┬───────┘                   │
│                      │                           │
│                    ▓▓▓▓▓▓                        │
│                    ▓ ?? ▓                        │
│                    ▓▓▓▓▓▓                        │
│                                                  │
└──────────────────────────────────────────────────┘

▓▓ = Unexplored edge indicator
?? = Unknown tile to be revealed
```

### Unexplored Edge Visual

- Distinct border/pattern (dashed, glowing, or special color)
- Possibly show "?" icon to indicate explorable
- Should draw attention but not overwhelm

## Implementation Tasks

- [ ] Add unexplored edge tracking to dungeon state
- [ ] Create tile deck with shuffle functionality
- [ ] Implement exploration trigger detection
- [ ] Implement tile placement logic
- [ ] Create unexplored edge visual indicator
- [ ] Create TileDeckCounter component
- [ ] Add new tile assets (at least 3 varieties)
- [ ] Update dungeon state on exploration
- [ ] Handle tile rotation for proper connection

## Unit Tests

- [ ] checkExploration detects hero on unexplored edge
- [ ] placeTile positions tile correctly based on edge direction
- [ ] Tile deck decreases after drawing
- [ ] New tile connects properly to existing tile

## E2E Test (Test 007)

```gherkin
Feature: Explore and Place New Tile

  Scenario: Hero explores and reveals new tile
    Given it is Quinn's turn
    And Quinn is adjacent to an unexplored edge
    When Quinn moves onto the unexplored edge
    Then a new tile appears connected to that edge
    And the unexplored edge is now explored
```

### Screenshot Sequence

1. `007-01-unexplored-edge.png` - Visible unexplored edge on board
2. `007-02-hero-at-edge.png` - Quinn moves to edge of tile
3. `007-03-new-tile-placed.png` - New tile revealed and placed
4. `007-04-edge-explored.png` - Edge now shows as explored/connected

## Dependencies

- Issue #006 (Move a Hero)

## Labels

`user-story`, `phase-2`, `gameplay`, `exploration`
