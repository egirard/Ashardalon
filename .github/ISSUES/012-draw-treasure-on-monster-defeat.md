# Issue: Draw Treasure on Monster Defeat

## User Story

> As a user, when I defeat a monster, I draw a treasure card and can see what I got.

## Acceptance Criteria

- [ ] On monster defeat, a treasure card is drawn
- [ ] The treasure card is displayed showing the item
- [ ] The item is added to a hero's inventory

## Design

### Data Model

```typescript
interface TreasureCard {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'consumable' | 'item';
  description: string;
  imagePath: string;
  // Optional bonuses
  attackBonus?: number;
  defenseBonus?: number;
}

// Initial treasure cards
const TREASURES: TreasureCard[] = [
  {
    id: 'potion-healing',
    name: 'Potion of Healing',
    type: 'consumable',
    description: 'Restore 5 HP',
    imagePath: 'potion-healing.png',
  },
  {
    id: 'sword-1',
    name: '+1 Sword',
    type: 'weapon',
    description: '+1 to attack rolls',
    attackBonus: 1,
    imagePath: 'sword-1.png',
  },
  {
    id: 'shield-1',
    name: '+1 Shield',
    type: 'armor',
    description: '+1 AC',
    defenseBonus: 1,
    imagePath: 'shield-1.png',
  },
];

interface HeroInventory {
  heroId: string;
  items: string[];  // Treasure card IDs
}
```

### Treasure Deck

```typescript
interface TreasureDeck {
  drawPile: string[];
  discardPile: string[];
}

function drawTreasure(deck: TreasureDeck): { treasure: string; deck: TreasureDeck } {
  if (deck.drawPile.length === 0) {
    return {
      treasure: deck.discardPile[0],
      deck: {
        drawPile: shuffle(deck.discardPile.slice(1)),
        discardPile: [],
      }
    };
  }
  return {
    treasure: deck.drawPile[0],
    deck: {
      drawPile: deck.drawPile.slice(1),
      discardPile: deck.discardPile,
    }
  };
}
```

### Components to Create

1. **TreasureCard.svelte** - Displays treasure card info
2. **InventoryPanel.svelte** - Shows hero's inventory

### Components to Modify

1. **GameBoard.svelte** - Show treasure card on defeat
2. **HeroCard.svelte** - Show equipped items indicator

### UI Layout

```
┌──────────────────────────────────────────────────┐
│  Monster Defeated! Draw Treasure                 │
├──────────────────────────────────────────────────┤
│                                                  │
│              ┌─────────────────────┐             │
│              │   +1 Sword          │             │
│              │   ┌───────────┐     │             │
│              │   │   ⚔️      │     │             │
│              │   └───────────┘     │             │
│              │   Type: Weapon      │             │
│              │   +1 to attack rolls│             │
│              │                     │             │
│              │ [ Give to Quinn  ]  │             │
│              │ [ Give to Vistra ]  │             │
│              └─────────────────────┘             │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Treasure Assignment Flow

1. Monster is defeated
2. Treasure card is drawn automatically
3. Treasure card displayed to player
4. Player chooses which hero receives the item
5. Item added to chosen hero's inventory
6. Treasure display dismissed
7. Game continues

Note: Per rules, only one treasure can be drawn per turn regardless of monsters defeated.

## Implementation Tasks

- [ ] Create TreasureCard data model
- [ ] Create initial treasure cards (3-5)
- [ ] Create treasure deck with shuffle
- [ ] Create TreasureCard.svelte component
- [ ] Create InventoryPanel.svelte component
- [ ] Trigger treasure draw on monster defeat
- [ ] Display treasure card as modal
- [ ] Allow player to assign treasure to hero
- [ ] Track hero inventories
- [ ] Limit to one treasure per turn

## Unit Tests

- [ ] drawTreasure returns card and updates deck
- [ ] Treasure is added to hero inventory
- [ ] Only one treasure drawn per turn (even if multiple defeats)
- [ ] Deck reshuffles when empty

## E2E Test (Test 012)

```gherkin
Feature: Draw Treasure on Monster Defeat

  Scenario: Hero defeats monster and draws treasure
    Given Quinn just defeated a monster
    Then a treasure card is drawn
    And I see the treasure card displayed
    And the item appears in a hero's inventory
```

### Screenshot Sequence

1. `012-01-monster-defeated.png` - Monster just defeated
2. `012-02-treasure-drawn.png` - Treasure card revealed
3. `012-03-assign-treasure.png` - Choosing which hero gets item
4. `012-04-inventory-updated.png` - Item in hero's inventory

## Dependencies

- Issue #011 (Defeat Monster and Gain XP)

## Labels

`user-story`, `phase-3`, `gameplay`, `treasure`
