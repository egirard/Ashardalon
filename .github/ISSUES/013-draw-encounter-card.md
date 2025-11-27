# Issue: Draw Encounter Card

## User Story

> As a user, when no tile is placed during my turn, I draw an encounter card and see its effect.

## Acceptance Criteria

- [ ] If hero didn't explore (no new tile), an encounter card is drawn during Villain Phase
- [ ] The encounter card is displayed
- [ ] The encounter effect is described

## Design

### Data Model

```typescript
type EncounterType = 'event' | 'trap' | 'hazard' | 'curse' | 'environment';

interface EncounterCard {
  id: string;
  name: string;
  type: EncounterType;
  description: string;
  effect: EncounterEffect;
  imagePath: string;
}

type EncounterEffect = 
  | { type: 'damage'; amount: number; target: 'active-hero' | 'all-heroes' }
  | { type: 'curse'; duration: number }
  | { type: 'environment' }
  | { type: 'trap'; disableDC: number }
  | { type: 'hazard'; ac: number; damage: number };

// Initial encounter cards
const ENCOUNTERS: EncounterCard[] = [
  {
    id: 'volcanic-spray',
    name: 'Volcanic Spray',
    type: 'event',
    description: 'Each hero on a tile adjacent to an unexplored edge takes 1 damage.',
    effect: { type: 'damage', amount: 1, target: 'active-hero' },
    imagePath: 'volcanic-spray.png',
  },
  {
    id: 'goblin-ambush',
    name: 'Goblin Ambush',
    type: 'event',
    description: 'The active hero takes 1 damage.',
    effect: { type: 'damage', amount: 1, target: 'active-hero' },
    imagePath: 'goblin-ambush.png',
  },
  {
    id: 'dark-fog',
    name: 'Dark Fog',
    type: 'environment',
    description: 'All heroes have -2 to attack rolls.',
    effect: { type: 'environment' },
    imagePath: 'dark-fog.png',
  },
];
```

### Encounter Trigger Logic

```typescript
interface TurnState {
  exploredThisTurn: boolean;
  // ... other state
}

function shouldDrawEncounter(turnState: TurnState): boolean {
  return !turnState.exploredThisTurn;
}

function resolveEncounter(
  encounter: EncounterCard,
  gameState: GameState
): GameState {
  switch (encounter.effect.type) {
    case 'damage':
      return applyEncounterDamage(encounter.effect, gameState);
    case 'environment':
      return setActiveEnvironment(encounter, gameState);
    // ... other effects
  }
}
```

### Encounter Deck

```typescript
interface EncounterDeck {
  drawPile: string[];
  discardPile: string[];
}
```

### Components to Create

1. **EncounterCard.svelte** - Displays encounter card
2. **EncounterResolver.svelte** - Handles encounter resolution

### Components to Modify

1. **GameBoard.svelte** - Show encounter card when drawn

### UI Layout

```
┌──────────────────────────────────────────────────┐
│  Turn 1 - Villain Phase | Encounter              │
├──────────────────────────────────────────────────┤
│                                                  │
│              ┌─────────────────────┐             │
│              │   Volcanic Spray    │             │
│              │   ┌───────────┐     │             │
│              │   │   🌋      │     │             │
│              │   └───────────┘     │             │
│              │   Type: Event       │             │
│              │                     │             │
│              │   Each hero on a    │             │
│              │   tile adjacent to  │             │
│              │   an unexplored     │             │
│              │   edge takes 1      │             │
│              │   damage.           │             │
│              │                     │             │
│              │   [ Continue ]      │             │
│              └─────────────────────┘             │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Encounter Draw Flow

1. Hero Phase ends
2. Exploration Phase (hero didn't explore - no new tile)
3. Villain Phase begins
4. Monsters activate
5. Encounter card drawn (because no exploration)
6. Encounter card displayed
7. Player reads effect
8. Effect resolves (damage, etc.)
9. Continue to end of Villain Phase

## Implementation Tasks

- [ ] Create EncounterCard data model
- [ ] Create initial encounter cards (3-5)
- [ ] Create encounter deck with shuffle
- [ ] Track whether exploration occurred this turn
- [ ] Create EncounterCard.svelte component
- [ ] Create EncounterResolver.svelte component
- [ ] Trigger encounter draw during Villain Phase
- [ ] Display encounter card modal
- [ ] Implement basic encounter effects (damage)
- [ ] Add encounter draw to villain phase flow

## Unit Tests

- [ ] shouldDrawEncounter returns true when no exploration
- [ ] shouldDrawEncounter returns false when tile was placed
- [ ] Encounter effects apply correctly
- [ ] Encounter deck reshuffles when empty

## E2E Test (Test 013)

```gherkin
Feature: Draw Encounter Card

  Scenario: Hero draws encounter when no exploration
    Given Quinn moved but did not explore a new tile
    When the Villain Phase begins
    Then an encounter card is drawn
    And I see the encounter card displayed
    And I see the effect description
```

### Screenshot Sequence

1. `013-01-no-exploration.png` - Hero moved but no new tile
2. `013-02-villain-phase.png` - Villain Phase begins
3. `013-03-encounter-drawn.png` - Encounter card displayed
4. `013-04-effect-applied.png` - Effect description and resolution

## Dependencies

- Issue #010 (Monster Attacks Hero) - Villain Phase structure

## Labels

`user-story`, `phase-4`, `gameplay`, `encounters`
