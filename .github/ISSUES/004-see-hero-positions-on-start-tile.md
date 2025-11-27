# Issue: See Hero Positions on Start Tile

## User Story

> As a user, I can see the selected hero tokens positioned on the Start Tile around the staircase, so that I know where my heroes are located.

## Acceptance Criteria

- [ ] Each selected hero has a visible token on the Start Tile
- [ ] Tokens are positioned around the staircase area
- [ ] Each token is visually distinct (shows hero identity)
- [ ] No two heroes occupy the same position

## Design

### Data Model

```typescript
interface Position {
  tileId: string;
  square: { x: number; y: number };
}

interface HeroState {
  heroId: string;
  position: Position;
}

// Starting positions around the staircase (4x4 area)
const STAIRCASE_POSITIONS: Position[] = [
  { tileId: 'start-tile', square: { x: 2, y: 2 } },
  { tileId: 'start-tile', square: { x: 3, y: 2 } },
  { tileId: 'start-tile', square: { x: 2, y: 3 } },
  { tileId: 'start-tile', square: { x: 3, y: 3 } },
  { tileId: 'start-tile', square: { x: 2, y: 4 } },
];
```

### Components to Create

1. **HeroToken.svelte** - Visual representation of a hero on the board

### Components to Modify

1. **DungeonDisplay.svelte** - Render hero tokens on tiles
2. **Tile.svelte** - Support square coordinate system

### UI Layout

```
┌──────────────────────────────────────────────────┐
│  Start Tile                                      │
│  ┌────┬────┬────┬────┬────┬────┐                │
│  │    │    │    │    │    │    │                │
│  ├────┼────┼────┼────┼────┼────┤                │
│  │    │    │ 🟡 │ 🔵 │    │    │                │
│  ├────┼────┼────┼────┼────┼────┤                │
│  │    │    │ 🟢 │ 🔴 │    │    │  ← Staircase  │
│  ├────┼────┼────┼────┼────┼────┤     Area      │
│  │    │    │ 🟣 │    │    │    │                │
│  ├────┼────┼────┼────┼────┼────┤                │
│  │    │    │    │    │    │    │                │
│  └────┴────┴────┴────┴────┴────┘                │
└──────────────────────────────────────────────────┘

Legend:
🟡 = Quinn (Cleric)
🔵 = Vistra (Fighter)
🟢 = Keyleth (Paladin)
🔴 = Tarak (Rogue)
🟣 = Haskan (Wizard)
```

### Hero Token Design

Each hero token should:
- Be a colored circle/icon
- Show hero initial or small portrait
- Have distinct colors per hero class
- Scale appropriately to tile squares

| Hero | Color | Initial |
|------|-------|---------|
| Quinn | Gold | Q |
| Vistra | Blue | V |
| Keyleth | Green | K |
| Tarak | Red | T |
| Haskan | Purple | H |

## Implementation Tasks

- [ ] Create HeroToken.svelte component
- [ ] Define hero position state in game store
- [ ] Implement starting position assignment logic
- [ ] Add hero tokens to DungeonDisplay
- [ ] Position tokens accurately on tile squares
- [ ] Ensure unique positions (no overlap)
- [ ] Style tokens to be visually distinct

## Unit Tests

- [ ] Starting position assignment gives unique positions to each hero
- [ ] All starting positions are within the staircase area
- [ ] Position assignment works for 1-5 heroes
- [ ] HeroToken component renders with correct hero identifier

## E2E Test (Test 004)

```gherkin
Feature: See Hero Positions on Start Tile

  Scenario: User sees hero tokens after starting game
    Given I have selected Quinn and Vistra
    When I start the game
    Then I see Quinn's token on the Start Tile
    And I see Vistra's token on the Start Tile
    And the tokens are in different positions
    And both tokens are near the staircase
```

### Screenshot Sequence

1. `004-01-game-started.png` - Game board after starting
2. `004-02-hero-tokens.png` - Close-up of hero tokens on Start Tile
3. `004-03-token-positions.png` - Tokens in distinct positions

## Dependencies

- Issue #003 (Start Game and See Board)

## Labels

`user-story`, `phase-1`, `ui`, `game-state`
