# Issue: Move a Hero

## User Story

> As a user, I can select a movement destination for my hero and see them move there, so that I can explore the dungeon.

## Acceptance Criteria

- [ ] Clicking on the board shows valid movement squares highlighted
- [ ] Valid squares are within the hero's movement speed
- [ ] Clicking a valid square moves the hero token there
- [ ] The hero's position updates visually
- [ ] Movement cannot pass through walls

## Design

### Data Model

```typescript
interface HeroStats {
  heroId: string;
  speed: number;  // Movement speed in squares
  // ... other stats
}

// Hero speeds from the game
const HERO_SPEEDS: Record<string, number> = {
  quinn: 6,
  vistra: 6,
  keyleth: 6,
  tarak: 6,
  haskan: 6,
};
```

### Movement Calculation

```typescript
interface Square {
  tileId: string;
  x: number;
  y: number;
}

function getValidMoveSquares(
  hero: HeroState,
  speed: number,
  dungeon: DungeonState
): Square[] {
  // BFS from hero's current position
  // Return all reachable squares within speed distance
  // Respecting walls and tile boundaries
}

function canMoveTo(from: Square, to: Square, dungeon: DungeonState): boolean {
  // Check if movement is valid (adjacent, no wall, same or connected tile)
}
```

### Components to Create

1. **MovementOverlay.svelte** - Shows valid movement squares

### Components to Modify

1. **DungeonDisplay.svelte** - Handle click for movement
2. **Tile.svelte** - Support movement highlighting

### UI Layout

```
┌──────────────────────────────────────────────────┐
│  Turn 1 - Quinn's Turn | Hero Phase              │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌────┬────┬────┬────┬────┬────┐                │
│  │ 🟦 │ 🟦 │ 🟦 │ 🟦 │ 🟦 │    │                │
│  ├────┼────┼────┼────┼────┼────┤                │
│  │ 🟦 │ 🟦 │ 🟦 │ 🟦 │ 🟦 │ 🟦 │                │
│  ├────┼────┼────┼────┼────┼────┤                │
│  │ 🟦 │ 🟦 │ 🟡 │ 🟦 │ 🟦 │ 🟦 │ ← Hero        │
│  ├────┼────┼────┼────┼────┼────┤                │
│  │ 🟦 │ 🟦 │ 🟦 │ 🟦 │ 🟦 │ 🟦 │                │
│  ├────┼────┼────┼────┼────┼────┤                │
│  │ 🟦 │ 🟦 │ 🟦 │ 🟦 │ 🟦 │    │                │
│  └────┴────┴────┴────┴────┴────┘                │
│                                                  │
│  🟦 = Valid move destination                    │
└──────────────────────────────────────────────────┘
```

### Movement Interaction Flow

1. User clicks/taps on board during Hero Phase
2. Valid movement squares highlight (blue overlay)
3. User clicks/taps on a highlighted square
4. Hero token animates to new position
5. Movement highlights disappear
6. Hero position state updates

## Implementation Tasks

- [ ] Add speed stat to hero data
- [ ] Implement getValidMoveSquares function
- [ ] Create MovementOverlay component
- [ ] Handle board click to show movement options
- [ ] Handle highlighted square click to move
- [ ] Update hero position in game state
- [ ] Animate token movement (optional, can be instant)
- [ ] Clear movement highlight after move

## Unit Tests

- [ ] getValidMoveSquares returns squares within speed
- [ ] getValidMoveSquares respects tile boundaries
- [ ] Movement updates hero position correctly
- [ ] Cannot move to occupied square (future consideration)

## E2E Test (Test 006)

```gherkin
Feature: Move a Hero

  Scenario: User moves hero to a new position
    Given it is Quinn's turn in the Hero Phase
    And Quinn has speed 6
    When I click on the board near Quinn
    Then I see valid movement squares highlighted
    When I click on a highlighted square
    Then Quinn's token moves to that square
    And Quinn's token is now in the new position
```

### Screenshot Sequence

1. `006-01-quinn-turn.png` - Quinn's turn in Hero Phase
2. `006-02-movement-highlight.png` - Valid movement squares shown
3. `006-03-select-destination.png` - User about to click destination
4. `006-04-hero-moved.png` - Quinn in new position

## Dependencies

- Issue #005 (See Current Turn Indicator)

## Labels

`user-story`, `phase-2`, `gameplay`, `movement`
