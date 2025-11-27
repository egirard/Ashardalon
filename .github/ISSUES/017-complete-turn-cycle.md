# Issue: Complete Turn Cycle

## User Story

> As a user, after all phases complete, the turn passes to the next hero, so that each player gets to act.

## Acceptance Criteria

- [ ] After Villain Phase ends, turn passes to next hero
- [ ] Turn indicator updates to show new active hero
- [ ] New hero can take their Hero Phase actions
- [ ] After all heroes have gone, cycle returns to first hero

## Design

### Data Model

```typescript
interface TurnState {
  turnNumber: number;
  currentHeroIndex: number;
  currentPhase: GamePhase;
  heroOrder: string[];  // Hero IDs in turn order
}

type GamePhase = 
  | 'hero-phase'
  | 'exploration-phase'
  | 'villain-phase';
```

### Turn Progression Logic

```typescript
function advanceToNextHero(turnState: TurnState): TurnState {
  const nextIndex = (turnState.currentHeroIndex + 1) % turnState.heroOrder.length;
  const isNewRound = nextIndex === 0;
  
  return {
    ...turnState,
    currentHeroIndex: nextIndex,
    currentPhase: 'hero-phase',
    turnNumber: isNewRound ? turnState.turnNumber + 1 : turnState.turnNumber,
  };
}

function advancePhase(turnState: TurnState): TurnState {
  switch (turnState.currentPhase) {
    case 'hero-phase':
      return { ...turnState, currentPhase: 'exploration-phase' };
    case 'exploration-phase':
      return { ...turnState, currentPhase: 'villain-phase' };
    case 'villain-phase':
      return advanceToNextHero(turnState);
  }
}
```

### Turn Cycle Visualization

```
Round 1:
  Quinn's Turn:
    Hero Phase → Exploration Phase → Villain Phase
  Vistra's Turn:
    Hero Phase → Exploration Phase → Villain Phase
  
Round 2:
  Quinn's Turn:
    Hero Phase → Exploration Phase → Villain Phase
  ...
```

### Components to Create

1. **EndTurnButton.svelte** - Button to end current phase/turn
2. **TurnCycleDisplay.svelte** - Shows turn order and current position

### Components to Modify

1. **TurnIndicator.svelte** - Update on turn change
2. **GameBoard.svelte** - Handle phase/turn transitions

### UI Layout

```
┌──────────────────────────────────────────────────┐
│  Round 1                                         │
│  ┌─────────────────────────────────────────────┐ │
│  │  Turn Order:                                │ │
│  │  [Quinn] ← → [Vistra] → [Keyleth]         │ │
│  │   active                                    │ │
│  └─────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────┤
│                                                  │
│  Turn 1 - Quinn's Turn | Villain Phase          │
│                                                  │
│  Monster activation complete.                   │
│                                                  │
│              [ End Turn ]                        │
│                                                  │
└──────────────────────────────────────────────────┘

After clicking End Turn:

┌──────────────────────────────────────────────────┐
│  Round 1                                         │
│  ┌─────────────────────────────────────────────┐ │
│  │  Turn Order:                                │ │
│  │  [Quinn] → [Vistra] ← → [Keyleth]         │ │
│  │             active                          │ │
│  └─────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────┤
│                                                  │
│  Turn 2 - Vistra's Turn | Hero Phase            │
│                                                  │
│  Vistra can now move and attack.               │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Phase Transition Flow

1. **Hero Phase**
   - Hero moves and/or attacks
   - Hero clicks "End Phase" or completes actions
   - → Exploration Phase

2. **Exploration Phase**
   - Automatic: check if on unexplored edge
   - If yes: place tile, spawn monster
   - → Villain Phase

3. **Villain Phase**
   - Monsters activate
   - Encounter drawn (if no exploration)
   - Player clicks "End Turn"
   - → Next hero's Hero Phase

4. **Round Complete**
   - After all heroes have taken turns
   - Round counter increments
   - Return to first hero

## Implementation Tasks

- [ ] Implement advanceToNextHero function
- [ ] Implement advancePhase function
- [ ] Create EndTurnButton component
- [ ] Create TurnCycleDisplay component
- [ ] Track hero turn order
- [ ] Track round number
- [ ] Update turn indicator on transitions
- [ ] Handle automatic phase transitions (exploration)
- [ ] Highlight active hero in turn order display
- [ ] Handle cycling back to first hero

## Unit Tests

- [ ] advanceToNextHero moves to next hero
- [ ] advanceToNextHero cycles back to first hero after last
- [ ] advanceToNextHero increments round when cycling
- [ ] advancePhase follows correct order
- [ ] Phase returns to hero-phase after villain-phase

## E2E Test (Test 017)

```gherkin
Feature: Complete Turn Cycle

  Scenario: Turn passes between heroes
    Given Quinn and Vistra are in the game
    And it is Quinn's turn
    When Quinn completes Hero Phase and Villain Phase ends
    Then it becomes Vistra's turn
    And the turn indicator shows Vistra
    When Vistra completes her turn
    Then it becomes Quinn's turn again
```

### Screenshot Sequence

1. `017-01-quinn-turn.png` - Quinn's turn, Hero Phase
2. `017-02-villain-phase.png` - Quinn's Villain Phase ending
3. `017-03-vistra-turn.png` - Vistra's turn begins
4. `017-04-cycle-back.png` - Back to Quinn (Round 2)

## Dependencies

- Issue #005 (See Current Turn Indicator) - Turn tracking
- Issue #010 (Monster Attacks Hero) - Villain Phase

## Labels

`user-story`, `phase-5`, `gameplay`, `turn-management`
