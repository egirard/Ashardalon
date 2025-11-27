# Issue: Party Defeat

## User Story

> As a user, if a hero is at 0 HP and no healing surges remain, the party is defeated and I see a defeat screen.

## Acceptance Criteria

- [ ] When hero at 0 HP with 0 surges starts turn, game ends
- [ ] Defeat screen is displayed
- [ ] Option to start new game is provided

## Design

### Data Model

```typescript
type GameResult = 'ongoing' | 'victory' | 'defeat';

interface GameState {
  // ... existing state
  result: GameResult;
  defeatReason?: string;
}
```

### Defeat Detection Logic

```typescript
function checkPartyDefeat(
  hero: HeroState,
  resources: PartyResources
): boolean {
  return hero.hp === 0 && resources.healingSurges === 0;
}

function handleTurnStart(
  hero: HeroState,
  resources: PartyResources,
  gameState: GameState
): GameState {
  if (checkPartyDefeat(hero, resources)) {
    return {
      ...gameState,
      result: 'defeat',
      defeatReason: `${hero.name} fell with no healing surges remaining.`,
    };
  }
  
  // Otherwise, check for healing surge use
  if (hero.hp === 0 && resources.healingSurges > 0) {
    return useHealingSurge(hero, resources, gameState);
  }
  
  return gameState;
}
```

### Components to Create

1. **DefeatScreen.svelte** - Game over screen for defeat
2. **NewGameButton.svelte** - Button to restart game

### Components to Modify

1. **GameBoard.svelte** - Check defeat condition at turn start

### UI Layout

```
┌──────────────────────────────────────────────────┐
│                                                  │
│                                                  │
│              ┌─────────────────────┐             │
│              │                     │             │
│              │    💀 DEFEAT 💀    │             │
│              │                     │             │
│              │  The heroes have    │             │
│              │  fallen.            │             │
│              │                     │             │
│              │  Quinn fell with no │             │
│              │  healing surges     │             │
│              │  remaining.         │             │
│              │                     │             │
│              │  ───────────────    │             │
│              │                     │             │
│              │  Monsters: 4        │             │
│              │  Tiles: 6           │             │
│              │  XP Earned: 3       │             │
│              │                     │             │
│              │  [ New Game ]       │             │
│              │                     │             │
│              └─────────────────────┘             │
│                                                  │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Defeat Flow

1. Turn passes to a hero
2. System checks hero HP
3. Hero HP = 0
4. System checks healing surges
5. Surges = 0
6. **Game ends - Defeat!**
7. Defeat screen displayed
8. Shows reason for defeat
9. Shows game statistics (optional)
10. "New Game" button available
11. Clicking "New Game" returns to hero selection

### Game Reset

```typescript
function resetGame(): GameState {
  return {
    ...initialGameState,
    result: 'ongoing',
  };
}
```

## Implementation Tasks

- [ ] Add result field to game state
- [ ] Implement checkPartyDefeat function
- [ ] Add defeat check to turn start logic
- [ ] Create DefeatScreen.svelte component
- [ ] Create NewGameButton component
- [ ] Show defeat reason on screen
- [ ] Implement game reset functionality
- [ ] Navigate to hero selection on new game
- [ ] (Optional) Track game statistics for defeat screen

## Unit Tests

- [ ] checkPartyDefeat returns true when HP=0 and surges=0
- [ ] checkPartyDefeat returns false when HP>0
- [ ] checkPartyDefeat returns false when surges>0
- [ ] handleTurnStart sets defeat result correctly
- [ ] resetGame returns to initial state

## E2E Test (Test 018)

```gherkin
Feature: Party Defeat

  Scenario: Game ends when hero dies with no surges
    Given the party has 0 healing surges
    And Quinn has 0 HP
    When Quinn's turn would begin
    Then I see a defeat screen
    And I see a "New Game" button
```

### Screenshot Sequence

1. `018-01-no-surges.png` - Party has 0 healing surges
2. `018-02-quinn-at-zero.png` - Quinn at 0 HP
3. `018-03-turn-starts.png` - Quinn's turn about to begin
4. `018-04-defeat-screen.png` - Defeat screen displayed
5. `018-05-new-game-button.png` - New Game button highlighted

## Dependencies

- Issue #014 (Use Healing Surge) - Surge tracking
- Issue #017 (Complete Turn Cycle) - Turn start logic

## Labels

`user-story`, `phase-5`, `gameplay`, `game-end`
