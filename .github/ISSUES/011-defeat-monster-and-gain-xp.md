# Issue: Defeat Monster and Gain XP

## User Story

> As a user, when I reduce a monster to 0 HP, it is removed from the board and I gain experience points.

## Acceptance Criteria

- [ ] When monster HP reaches 0, it is defeated
- [ ] Defeated monster token is removed from board
- [ ] XP is added to party total
- [ ] XP total is displayed to user

## Design

### Data Model

```typescript
interface PartyResources {
  xp: number;           // Total experience points
  healingSurges: number; // Remaining healing surges
}

// XP values from monster cards
const MONSTER_XP: Record<string, number> = {
  kobold: 1,
  snake: 1,
  cultist: 1,
  // Future monsters will have higher XP
};
```

### Monster Defeat Logic

```typescript
function checkMonsterDefeat(monster: MonsterState): boolean {
  return monster.currentHp <= 0;
}

function defeatMonster(
  monster: MonsterState,
  gameState: GameState
): GameState {
  // Remove monster from active monsters
  // Add XP to party resources
  // Move monster card to discard pile
  return {
    ...gameState,
    monsters: gameState.monsters.filter(m => m.instanceId !== monster.instanceId),
    partyResources: {
      ...gameState.partyResources,
      xp: gameState.partyResources.xp + MONSTER_XP[monster.monsterId],
    },
    monsterDeck: {
      ...gameState.monsterDeck,
      discardPile: [...gameState.monsterDeck.discardPile, monster.monsterId],
    },
  };
}
```

### Components to Create

1. **XPCounter.svelte** - Displays party XP total
2. **DefeatAnimation.svelte** - Visual feedback when monster defeated

### Components to Modify

1. **GameBoard.svelte** - Include XP counter
2. **DungeonDisplay.svelte** - Handle monster removal

### UI Layout

```
┌──────────────────────────────────────────────────┐
│  Turn 1 - Quinn's Turn | Hero Phase    XP: 0    │
├──────────────────────────────────────────────────┤
│                                                  │
│        ┌────────────────┐                        │
│        │                │                        │
│        │   🟡   👹      │                        │
│        │                │                        │
│        └────────────────┘                        │
│                                                  │
└──────────────────────────────────────────────────┘

After defeating monster:

┌──────────────────────────────────────────────────┐
│  Turn 1 - Quinn's Turn | Hero Phase    XP: 1    │
├──────────────────────────────────────────────────┤
│                                                  │
│        ┌────────────────┐                        │
│        │                │  ┌────────────────────┐│
│        │   🟡   💥      │  │ Kobold Defeated!   ││
│        │                │  │ +1 XP              ││
│        └────────────────┘  └────────────────────┘│
│                                                  │
└──────────────────────────────────────────────────┘
```

### Defeat Animation

When monster is defeated:
1. Monster takes fatal damage
2. Brief defeat animation (explosion, fade out, etc.)
3. Monster token removed
4. "+X XP" popup appears briefly
5. Party XP counter updates

## Implementation Tasks

- [ ] Add partyResources to game state
- [ ] Initialize XP counter at 0
- [ ] Create XPCounter.svelte component
- [ ] Implement checkMonsterDefeat function
- [ ] Implement defeatMonster function
- [ ] Create defeat animation/visual feedback
- [ ] Remove monster token from board
- [ ] Update XP counter on defeat
- [ ] Show XP gain notification
- [ ] Move monster card to discard

## Unit Tests

- [ ] checkMonsterDefeat returns true when HP <= 0
- [ ] defeatMonster removes monster from active list
- [ ] defeatMonster adds correct XP to party
- [ ] Monster card moves to discard pile

## E2E Test (Test 011)

```gherkin
Feature: Defeat Monster and Gain XP

  Scenario: Hero defeats monster and gains experience
    Given a Kobold with 1 HP is adjacent to Quinn
    When Quinn attacks and hits
    Then the Kobold is removed from the board
    And the party XP increases by the Kobold's XP value
    And I see the updated XP total
```

### Screenshot Sequence

1. `011-01-monster-low-hp.png` - Kobold with 1 HP
2. `011-02-fatal-attack.png` - Quinn's attack hits
3. `011-03-monster-defeated.png` - Defeat animation
4. `011-04-xp-gained.png` - XP notification and updated counter

## Dependencies

- Issue #009 (Hero Attacks Monster)

## Labels

`user-story`, `phase-3`, `gameplay`, `combat`, `xp`
