# Issue: Monster Attacks Hero

## User Story

> As a user, during the Villain Phase, I see monsters move toward heroes and attack them, reducing hero HP.

## Acceptance Criteria

- [ ] After hero actions, the Villain Phase begins
- [ ] Monsters move toward the closest hero
- [ ] Adjacent monsters attack heroes
- [ ] Attack results are displayed
- [ ] Hero HP decreases on hit

## Design

### Data Model

```typescript
interface MonsterAttack {
  attackBonus: number;
  damage: number;
}

// Monster attacks from cards
const MONSTER_ATTACKS: Record<string, MonsterAttack> = {
  kobold: { attackBonus: 5, damage: 1 },
  snake: { attackBonus: 4, damage: 1 },
  cultist: { attackBonus: 5, damage: 1 },
};

interface HeroStats {
  heroId: string;
  hp: number;
  maxHp: number;
  ac: number;
  // ... other stats
}

// Hero stats
const HERO_STATS: Record<string, HeroStats> = {
  quinn: { heroId: 'quinn', hp: 8, maxHp: 8, ac: 17 },
  vistra: { heroId: 'vistra', hp: 10, maxHp: 10, ac: 18 },
  keyleth: { heroId: 'keyleth', hp: 10, maxHp: 10, ac: 18 },
  tarak: { heroId: 'tarak', hp: 8, maxHp: 8, ac: 17 },
  haskan: { heroId: 'haskan', hp: 6, maxHp: 6, ac: 14 },
};
```

### Monster AI

```typescript
function findClosestHero(
  monster: MonsterState,
  heroes: HeroState[],
  dungeon: DungeonState
): HeroState | null {
  // Find hero with shortest path distance
  // Ignore downed heroes (0 HP)
}

function getMonsterTarget(
  monster: MonsterState,
  heroes: HeroState[]
): HeroState | null {
  // Check for adjacent hero first
  // If adjacent, that's the target
  // Otherwise, find closest hero to move toward
}

function executeMonsterTurn(
  monster: MonsterState,
  heroes: HeroState[],
  dungeon: DungeonState
): MonsterAction {
  const target = findClosestHero(monster, heroes, dungeon);
  
  if (isAdjacent(monster.position, target.position)) {
    return { type: 'attack', targetId: target.heroId };
  }
  
  const moveTarget = pathToward(monster.position, target.position, dungeon);
  return { type: 'move', destination: moveTarget };
}
```

### Villain Phase Flow

```typescript
type VillainPhaseStep = 
  | { type: 'monster-activation'; monsterId: string }
  | { type: 'monster-move'; monsterId: string; destination: Position }
  | { type: 'monster-attack'; monsterId: string; targetId: string; result: AttackResult }
  | { type: 'phase-complete' };
```

### Components to Create

1. **VillainPhaseIndicator.svelte** - Shows villain phase is active
2. **MonsterActionLog.svelte** - Shows what monster did

### Components to Modify

1. **DungeonDisplay.svelte** - Animate monster movement
2. **HeroCard.svelte** - Show current HP

### UI Layout

```
┌──────────────────────────────────────────────────┐
│  Turn 1 - Villain Phase | Monster Activation     │
├──────────────────────────────────────────────────┤
│                                                  │
│        ┌────────────────┐                        │
│        │                │                        │
│        │   👹 → 🟡      │ ← Monster moves to     │
│        │                │   attack hero          │
│        └────────────────┘                        │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  Kobold moves toward Quinn                 │  │
│  │  Kobold attacks Quinn!                     │  │
│  │  Roll: 12 + 5 = 17 vs AC 17                │  │
│  │  ✅ HIT! Quinn takes 1 damage              │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌──────────────┐                               │
│  │ Quinn       │  HP: 7/8                       │
│  └──────────────┘                               │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Phase Transition

1. Hero Phase ends (after move + attack or action)
2. Exploration Phase (if applicable)
3. Villain Phase begins
4. Each monster activates in order
5. Monster moves toward closest hero
6. If adjacent, monster attacks
7. Attack result shown
8. Hero HP updated if damaged
9. Next monster activates
10. Villain Phase ends

## Implementation Tasks

- [ ] Add HP and AC stats to hero state
- [ ] Implement monster AI movement logic
- [ ] Implement monster attack resolution
- [ ] Create phase transition from Hero → Villain
- [ ] Create VillainPhaseIndicator component
- [ ] Animate monster movement (or instant move with log)
- [ ] Display monster attack rolls and results
- [ ] Update hero HP on damage
- [ ] Create HP display for heroes
- [ ] Handle multiple monsters in order

## Unit Tests

- [ ] findClosestHero returns correct hero
- [ ] Monster moves toward target if not adjacent
- [ ] Monster attacks if adjacent to hero
- [ ] Hero HP decreases on hit
- [ ] Monster AI ignores downed heroes

## E2E Test (Test 010)

```gherkin
Feature: Monster Attacks Hero

  Scenario: Monster moves toward hero and attacks
    Given a Kobold is on the board
    When the Villain Phase begins
    Then the Kobold moves toward the nearest hero
    When the Kobold is adjacent to Quinn
    Then the Kobold attacks Quinn
    And I see the attack roll result
    When the attack hits
    Then Quinn's HP decreases
```

### Screenshot Sequence

1. `010-01-villain-phase-start.png` - Villain Phase indicator shown
2. `010-02-monster-moves.png` - Monster moving toward hero
3. `010-03-monster-attack.png` - Monster attacks hero
4. `010-04-attack-result.png` - Attack roll and result
5. `010-05-hero-damaged.png` - Hero HP decreased

## Dependencies

- Issue #009 (Hero Attacks Monster)

## Labels

`user-story`, `phase-3`, `gameplay`, `combat`, `monster-ai`
