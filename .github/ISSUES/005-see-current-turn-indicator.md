# Issue: See Current Turn Indicator

## User Story

> As a user, I can see whose turn it is and what phase we're in, so that I know who should act next.

## Acceptance Criteria

- [ ] The current hero's name is displayed
- [ ] The current phase is displayed (Hero Phase initially)
- [ ] The active hero's token is visually highlighted on the board

## Design

### Data Model

```typescript
type GamePhase = 'hero-phase' | 'exploration-phase' | 'villain-phase';

interface TurnState {
  currentHeroIndex: number;
  currentPhase: GamePhase;
  turnNumber: number;
}

// Derived state
function getCurrentHero(turnState: TurnState, heroes: HeroState[]): HeroState {
  return heroes[turnState.currentHeroIndex];
}
```

### Components to Create

1. **TurnIndicator.svelte** - Displays current turn information

### Components to Modify

1. **HeroToken.svelte** - Add highlighted/active state
2. **GameBoard.svelte** - Include turn indicator

### UI Layout

```
┌──────────────────────────────────────────────────┐
│  Wrath of Ashardalon                             │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌────────────────────────────────┐              │
│  │  Turn 1 - Quinn's Turn         │              │
│  │  Phase: Hero Phase             │              │
│  └────────────────────────────────┘              │
│                                                  │
│              ┌──────────────┐                    │
│              │  Start Tile  │                    │
│              │              │                    │
│              │    🟡 ← Active (highlighted)      │
│              │    🔵       │                    │
│              │              │                    │
│              └──────────────┘                    │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Active Hero Highlighting

Active hero token should have:
- Glowing border/halo effect
- Pulsing animation (subtle)
- Different from other tokens' resting state

```css
.hero-token.active {
  box-shadow: 0 0 10px 3px gold;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 10px 3px gold; }
  50% { box-shadow: 0 0 15px 5px gold; }
}
```

### Turn Indicator Styling

- Prominent position (top of game board)
- Hero name in bold
- Phase clearly visible
- Possibly hero portrait/icon alongside name

## Implementation Tasks

- [ ] Create TurnState in game store
- [ ] Initialize turn order based on selected heroes
- [ ] Create TurnIndicator.svelte component
- [ ] Display current hero name and phase
- [ ] Add active/highlighted state to HeroToken
- [ ] Apply highlight to current hero's token
- [ ] Style turn indicator for visibility

## Unit Tests

- [ ] Turn state initializes with first hero active
- [ ] Turn state initializes in Hero Phase
- [ ] getCurrentHero returns correct hero based on index
- [ ] Turn number starts at 1

## E2E Test (Test 005)

```gherkin
Feature: See Current Turn Indicator

  Scenario: User sees turn information after starting game
    Given I have started a game with Quinn and Vistra
    Then I see a turn indicator showing the first hero's name
    And I see "Hero Phase" displayed
    And the first hero's token is highlighted on the board
```

### Screenshot Sequence

1. `005-01-turn-indicator.png` - Turn indicator showing current hero
2. `005-02-phase-display.png` - Hero Phase displayed
3. `005-03-highlighted-token.png` - Active hero's token highlighted

## Dependencies

- Issue #004 (See Hero Positions on Start Tile)

## Labels

`user-story`, `phase-1`, `ui`, `turn-management`
