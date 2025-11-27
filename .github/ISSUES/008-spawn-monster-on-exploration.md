# Issue: Spawn Monster on Exploration

## User Story

> As a user, when a new tile is placed, I see a monster appear on it, so that I have something to fight.

## Acceptance Criteria

- [ ] After a tile is placed, a monster token appears on it
- [ ] The monster's name is displayed
- [ ] A monster card is shown with basic stats (AC, HP)

## Design

### Data Model

```typescript
interface Monster {
  id: string;
  name: string;
  ac: number;     // Armor Class
  hp: number;     // Hit Points
  maxHp: number;
  xp: number;     // Experience Points value
  imagePath: string;
}

interface MonsterState {
  monsterId: string;
  instanceId: string;  // Unique instance ID
  position: Position;
  currentHp: number;
  controllerId: string;  // Player who controls this monster
}

// Monster deck - start with a few basic monsters
const MONSTERS: Monster[] = [
  { id: 'kobold', name: 'Kobold Dragonshield', ac: 14, hp: 1, maxHp: 1, xp: 1, imagePath: 'kobold.png' },
  { id: 'snake', name: 'Snake', ac: 12, hp: 1, maxHp: 1, xp: 1, imagePath: 'snake.png' },
  { id: 'cultist', name: 'Cultist', ac: 13, hp: 2, maxHp: 2, xp: 1, imagePath: 'cultist.png' },
];
```

### Monster Deck

```typescript
interface MonsterDeck {
  drawPile: string[];    // Monster IDs
  discardPile: string[];
}

function drawMonster(deck: MonsterDeck): { monster: string; deck: MonsterDeck } {
  if (deck.drawPile.length === 0) {
    // Reshuffle discard pile
    return {
      monster: deck.discardPile[0],
      deck: {
        drawPile: shuffle(deck.discardPile.slice(1)),
        discardPile: [],
      }
    };
  }
  return {
    monster: deck.drawPile[0],
    deck: {
      drawPile: deck.drawPile.slice(1),
      discardPile: deck.discardPile,
    }
  };
}
```

### Components to Create

1. **MonsterToken.svelte** - Visual representation of monster on board
2. **MonsterCard.svelte** - Displays monster stats and info

### Components to Modify

1. **DungeonDisplay.svelte** - Render monster tokens
2. **GameBoard.svelte** - Show monster card when spawned

### UI Layout

```
┌──────────────────────────────────────────────────┐
│  Turn 1 - Quinn's Turn | Exploration Phase       │
├──────────────────────────────────────────────────┤
│                                                  │
│        ┌────────────────┐                        │
│        │   New Tile     │                        │
│        │                │                        │
│        │      👹        │ ← Monster Token        │
│        │                │                        │
│        └───────┬────────┘                        │
│                │                                 │
│        ┌───────┴────────┐    ┌─────────────────┐ │
│        │  Start Tile    │    │ Kobold          │ │
│        │                │    │ Dragonshield    │ │
│        │       🟡       │    │ ─────────────── │ │
│        │                │    │ AC: 14  HP: 1   │ │
│        └────────────────┘    │ XP: 1           │ │
│                              └─────────────────┘ │
│                                Monster Card      │
└──────────────────────────────────────────────────┘
```

### Monster Token Design

- Distinct shape (different from hero tokens)
- Red/enemy color scheme
- Shows monster type identifier
- Smaller than hero tokens or equal size

### Monster Card Display

When a monster spawns:
1. Draw monster card from deck
2. Display card prominently (modal or side panel)
3. Place monster token on new tile
4. Card can be dismissed but monster info stays accessible

## Implementation Tasks

- [ ] Create Monster data model and initial monsters
- [ ] Create Monster deck with draw functionality
- [ ] Create MonsterToken.svelte component
- [ ] Create MonsterCard.svelte component
- [ ] Implement monster spawning on tile placement
- [ ] Place monster token on spawned tile
- [ ] Display monster card popup/panel
- [ ] Track monsters in game state
- [ ] Assign monster to exploring player's control

## Unit Tests

- [ ] drawMonster returns monster and updates deck
- [ ] Monster spawns at correct position on new tile
- [ ] Monster card displays correct stats
- [ ] Deck reshuffles when empty

## E2E Test (Test 008)

```gherkin
Feature: Spawn Monster on Exploration

  Scenario: Monster appears on newly placed tile
    Given Quinn just placed a new tile through exploration
    Then a monster token appears on the new tile
    And I see a monster card displayed showing the monster's name
    And the monster card shows AC and HP values
```

### Screenshot Sequence

1. `008-01-tile-placed.png` - New tile just placed
2. `008-02-monster-spawns.png` - Monster token appears on tile
3. `008-03-monster-card.png` - Monster card showing stats

## Dependencies

- Issue #007 (Explore and Place New Tile)

## Labels

`user-story`, `phase-2`, `gameplay`, `monsters`
