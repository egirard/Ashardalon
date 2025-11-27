# Issue: Hero Attacks Monster

## User Story

> As a user, I can attack an adjacent monster with my hero's basic attack, roll a d20, and see if I hit or miss.

## Acceptance Criteria

- [ ] When adjacent to a monster, an "Attack" option is available
- [ ] Clicking attack shows the d20 roll result
- [ ] The attack hits if roll + bonus >= monster AC
- [ ] On hit, damage is applied and monster HP decreases
- [ ] Hit or miss result is clearly displayed

## Design

### Data Model

```typescript
interface HeroAttack {
  name: string;
  attackBonus: number;
  damage: number;
  range: number;  // 1 for melee
}

// Hero basic attacks
const HERO_ATTACKS: Record<string, HeroAttack> = {
  quinn: { name: 'Mace', attackBonus: 6, damage: 2, range: 1 },
  vistra: { name: 'Warhammer', attackBonus: 8, damage: 2, range: 1 },
  keyleth: { name: 'Longsword', attackBonus: 7, damage: 2, range: 1 },
  tarak: { name: 'Short Sword', attackBonus: 7, damage: 2, range: 1 },
  haskan: { name: 'Quarterstaff', attackBonus: 4, damage: 1, range: 1 },
};

interface AttackResult {
  roll: number;        // d20 result (1-20)
  attackBonus: number;
  total: number;       // roll + bonus
  targetAC: number;
  isHit: boolean;
  damage: number;      // 0 if miss
  isCritical: boolean; // natural 20
}
```

### Dice Rolling

```typescript
function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

function resolveAttack(
  attacker: HeroState,
  target: MonsterState,
  attack: HeroAttack
): AttackResult {
  const roll = rollD20();
  const total = roll + attack.attackBonus;
  const isHit = roll === 20 || total >= target.ac;
  
  return {
    roll,
    attackBonus: attack.attackBonus,
    total,
    targetAC: target.ac,
    isHit,
    damage: isHit ? attack.damage : 0,
    isCritical: roll === 20,
  };
}
```

### Components to Create

1. **AttackButton.svelte** - Attack action button
2. **DiceRollDisplay.svelte** - Shows dice roll animation/result
3. **CombatResultDisplay.svelte** - Shows hit/miss and damage

### Components to Modify

1. **GameBoard.svelte** - Show attack option when valid

### UI Layout

```
┌──────────────────────────────────────────────────┐
│  Turn 1 - Quinn's Turn | Hero Phase              │
├──────────────────────────────────────────────────┤
│                                                  │
│        ┌────────────────┐                        │
│        │                │                        │
│        │   🟡 ← 👹      │ ← Adjacent             │
│        │                │                        │
│        └────────────────┘                        │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  [ Attack Kobold ]                         │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
└──────────────────────────────────────────────────┘

After clicking Attack:

┌──────────────────────────────────────────────────┐
│                                                  │
│           ┌─────────────────────┐                │
│           │    🎲 Roll: 15      │                │
│           │    + Bonus: 6       │                │
│           │    ─────────────    │                │
│           │    Total: 21        │                │
│           │    vs AC: 14        │                │
│           │                     │                │
│           │    ✅ HIT!          │                │
│           │    2 damage dealt   │                │
│           └─────────────────────┘                │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Attack Flow

1. Hero Phase begins
2. Hero is adjacent to monster
3. "Attack" button appears
4. User clicks Attack
5. Dice roll animation plays
6. Result displays (roll, bonus, total, AC)
7. Hit or Miss displayed
8. If hit, damage is applied to monster
9. Monster HP updates (if tracked visually)

## Implementation Tasks

- [ ] Add hero attack stats to hero data
- [ ] Implement rollD20 function
- [ ] Implement resolveAttack function
- [ ] Create AttackButton component
- [ ] Create DiceRollDisplay component
- [ ] Create CombatResultDisplay component
- [ ] Check adjacency to show attack option
- [ ] Apply damage to monster on hit
- [ ] Update monster HP in state
- [ ] Show hit/miss result clearly

## Unit Tests

- [ ] rollD20 returns values 1-20
- [ ] resolveAttack calculates hit correctly
- [ ] Natural 20 always hits
- [ ] Damage is applied only on hit
- [ ] Adjacency check works correctly

## E2E Test (Test 009)

```gherkin
Feature: Hero Attacks Monster

  Scenario: Hero attacks adjacent monster
    Given Quinn is adjacent to a Kobold with AC 14 and HP 1
    When I click "Attack"
    Then I see a d20 roll result
    And I see whether the attack hit or missed
    When the attack hits
    Then the Kobold's HP decreases by Quinn's damage
```

### Screenshot Sequence

1. `009-01-adjacent-monster.png` - Hero adjacent to monster
2. `009-02-attack-button.png` - Attack button visible
3. `009-03-dice-roll.png` - Dice roll in progress/result
4. `009-04-hit-result.png` - Attack hit, damage shown
5. `009-05-miss-result.png` - (Alternative) Attack missed

## Dependencies

- Issue #008 (Spawn Monster on Exploration)

## Labels

`user-story`, `phase-3`, `gameplay`, `combat`
