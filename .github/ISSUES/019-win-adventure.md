# Issue: Win Adventure

## User Story

> As a user, when I complete the adventure objective, I see a victory screen showing that I won.

## Acceptance Criteria

- [ ] Adventure has a clear objective (e.g., defeat specific villain)
- [ ] When objective is met, victory triggers
- [ ] Victory screen is displayed
- [ ] Option to start new game is provided

## Design

### Data Model

```typescript
interface AdventureObjective {
  type: 'defeat-villain' | 'reach-exit' | 'collect-items';
  targetId?: string;  // e.g., villain ID
  description: string;
}

interface Adventure {
  id: string;
  name: string;
  description: string;
  objective: AdventureObjective;
  setupInstructions: string[];
}

// First adventure - simple villain defeat
const FIRST_ADVENTURE: Adventure = {
  id: 'adventure-1',
  name: 'The Chamber of Flame',
  description: 'Defeat the Kobold leader Meerak to escape the dungeon.',
  objective: {
    type: 'defeat-villain',
    targetId: 'meerak',
    description: 'Defeat Meerak, Kobold Dragonlord',
  },
  setupInstructions: [
    'Place the Start Tile',
    'Shuffle Meerak into the bottom 5 tiles of the Dungeon Stack',
  ],
};
```

### Victory Detection Logic

```typescript
function checkVictory(
  adventure: Adventure,
  gameState: GameState
): boolean {
  switch (adventure.objective.type) {
    case 'defeat-villain':
      return gameState.defeatedMonsters.includes(adventure.objective.targetId!);
    case 'reach-exit':
      return gameState.heroesEscaped.length === gameState.heroes.length;
    case 'collect-items':
      // Check if required items collected
      return false;
  }
}

function handleVillainDefeated(
  villainId: string,
  adventure: Adventure,
  gameState: GameState
): GameState {
  const updatedState = {
    ...gameState,
    defeatedMonsters: [...gameState.defeatedMonsters, villainId],
  };
  
  if (checkVictory(adventure, updatedState)) {
    return {
      ...updatedState,
      result: 'victory',
    };
  }
  
  return updatedState;
}
```

### Components to Create

1. **VictoryScreen.svelte** - Game over screen for victory
2. **ObjectiveDisplay.svelte** - Shows current adventure objective

### Components to Modify

1. **GameBoard.svelte** - Show objective, check victory

### UI Layout

```
┌──────────────────────────────────────────────────┐
│                                                  │
│                                                  │
│              ┌─────────────────────┐             │
│              │                     │             │
│              │   🏆 VICTORY! 🏆    │             │
│              │                     │             │
│              │  The heroes have    │             │
│              │  triumphed!         │             │
│              │                     │             │
│              │  Meerak has been    │             │
│              │  defeated!          │             │
│              │                     │             │
│              │  ───────────────    │             │
│              │                     │             │
│              │  Monsters: 8        │             │
│              │  Tiles: 12          │             │
│              │  XP Earned: 10      │             │
│              │  Treasure: 5        │             │
│              │                     │             │
│              │  [ New Game ]       │             │
│              │                     │             │
│              └─────────────────────┘             │
│                                                  │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Objective Display During Game

```
┌──────────────────────────────────────────────────┐
│  The Chamber of Flame                            │
│  ┌─────────────────────────────────────────────┐ │
│  │ Objective: Defeat Meerak, Kobold Dragonlord │ │
│  └─────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────┤
│  ...                                            │
```

### Victory Flow

1. Heroes battle through dungeon
2. Villain (Meerak) appears when specific tile drawn
3. Heroes defeat Meerak
4. Victory condition checked
5. **Victory achieved!**
6. Victory screen displayed
7. Shows statistics
8. "New Game" button available

### Villain Monster

```typescript
const MEERAK: Monster = {
  id: 'meerak',
  name: 'Meerak, Kobold Dragonlord',
  ac: 16,
  hp: 3,
  maxHp: 3,
  xp: 2,
  isVillain: true,
  imagePath: 'meerak.png',
};
```

## Implementation Tasks

- [ ] Create Adventure data model
- [ ] Create first adventure (defeat Meerak)
- [ ] Add Meerak villain monster
- [ ] Implement checkVictory function
- [ ] Create ObjectiveDisplay component
- [ ] Create VictoryScreen component
- [ ] Track defeated monsters
- [ ] Check victory when villain defeated
- [ ] Display victory screen on win
- [ ] Add statistics to victory screen
- [ ] Implement game reset from victory

## Unit Tests

- [ ] checkVictory returns true when objective met
- [ ] checkVictory returns false when objective not met
- [ ] handleVillainDefeated triggers victory correctly
- [ ] Villain is flagged as villain type

## E2E Test (Test 019)

```gherkin
Feature: Win Adventure

  Scenario: Party wins by defeating villain
    Given the adventure objective is to defeat Meerak
    When the party defeats Meerak
    Then I see a victory screen
    And I see "Victory!" displayed
    And I see a "New Game" button
```

### Screenshot Sequence

1. `019-01-meerak-appears.png` - Meerak on the board
2. `019-02-final-battle.png` - Heroes fighting Meerak
3. `019-03-meerak-defeated.png` - Meerak defeated
4. `019-04-victory-screen.png` - Victory screen displayed
5. `019-05-new-game.png` - New Game button highlighted

## Dependencies

- Issue #011 (Defeat Monster and Gain XP) - Monster defeat
- Issue #008 (Spawn Monster on Exploration) - Monster spawning

## Labels

`user-story`, `phase-5`, `gameplay`, `game-end`, `adventure`
