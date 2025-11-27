# Issue: Level Up Hero

## User Story

> As a user, when I roll a natural 20 and have 5+ XP, my hero levels up to 2nd level.

## Acceptance Criteria

- [ ] On natural 20 attack roll with 5+ XP available, level up triggers
- [ ] Hero card flips to show 2nd level stats
- [ ] HP, AC, and other stats increase
- [ ] 5 XP is spent

## Design

### Data Model

```typescript
interface HeroLevel {
  level: 1 | 2;
  hp: number;
  maxHp: number;
  ac: number;
  surgeValue: number;
  attackBonus: number;
  damage: number;
}

// Level 1 and Level 2 stats
const HERO_LEVELS: Record<string, { level1: HeroLevel; level2: HeroLevel }> = {
  quinn: {
    level1: { level: 1, hp: 8, maxHp: 8, ac: 17, surgeValue: 4, attackBonus: 6, damage: 2 },
    level2: { level: 2, hp: 10, maxHp: 10, ac: 18, surgeValue: 5, attackBonus: 7, damage: 2 },
  },
  vistra: {
    level1: { level: 1, hp: 10, maxHp: 10, ac: 18, surgeValue: 5, attackBonus: 8, damage: 2 },
    level2: { level: 2, hp: 12, maxHp: 12, ac: 19, surgeValue: 6, attackBonus: 9, damage: 2 },
  },
  keyleth: {
    level1: { level: 1, hp: 10, maxHp: 10, ac: 18, surgeValue: 5, attackBonus: 7, damage: 2 },
    level2: { level: 2, hp: 12, maxHp: 12, ac: 19, surgeValue: 6, attackBonus: 8, damage: 2 },
  },
  tarak: {
    level1: { level: 1, hp: 8, maxHp: 8, ac: 17, surgeValue: 4, attackBonus: 7, damage: 2 },
    level2: { level: 2, hp: 10, maxHp: 10, ac: 18, surgeValue: 5, attackBonus: 8, damage: 2 },
  },
  haskan: {
    level1: { level: 1, hp: 6, maxHp: 6, ac: 14, surgeValue: 3, attackBonus: 4, damage: 1 },
    level2: { level: 2, hp: 8, maxHp: 8, ac: 15, surgeValue: 4, attackBonus: 5, damage: 1 },
  },
};

const LEVEL_UP_COST = 5;
```

### Level Up Logic

```typescript
function canLevelUp(
  hero: HeroState,
  roll: number,
  resources: PartyResources
): boolean {
  return hero.level === 1 && 
         roll === 20 && 
         resources.xp >= LEVEL_UP_COST;
}

function levelUpHero(
  hero: HeroState,
  resources: PartyResources
): { hero: HeroState; resources: PartyResources } {
  const level2Stats = HERO_LEVELS[hero.heroId].level2;
  const currentDamage = hero.maxHp - hero.hp;  // Preserve damage taken
  
  return {
    hero: {
      ...hero,
      level: 2,
      maxHp: level2Stats.maxHp,
      hp: level2Stats.maxHp - currentDamage,  // Keep same damage
      ac: level2Stats.ac,
      surgeValue: level2Stats.surgeValue,
      attackBonus: level2Stats.attackBonus,
    },
    resources: {
      ...resources,
      xp: resources.xp - LEVEL_UP_COST,
    },
  };
}
```

### Critical Hit Bonus (Level 2)

Level 2 heroes deal +1 damage on natural 20 rolls (critical attacks).

```typescript
function calculateDamage(
  hero: HeroState,
  roll: number,
  baseDamage: number
): number {
  if (roll === 20 && hero.level === 2) {
    return baseDamage + 1;  // Critical attack bonus
  }
  return baseDamage;
}
```

### Components to Create

1. **LevelUpAnimation.svelte** - Visual feedback for leveling up
2. **HeroCardFlip.svelte** - Card flip animation

### Components to Modify

1. **HeroCard.svelte** - Show level indicator, flip animation
2. **CombatResultDisplay.svelte** - Handle level up trigger

### UI Layout

```
┌──────────────────────────────────────────────────┐
│  Natural 20! Level Up!                   XP: 5  │
├──────────────────────────────────────────────────┤
│                                                  │
│              ┌─────────────────────┐             │
│              │   ✨ LEVEL UP! ✨   │             │
│              │                     │             │
│              │   Quinn advances    │             │
│              │   to Level 2!       │             │
│              │                     │             │
│              │   HP: 8 → 10        │             │
│              │   AC: 17 → 18       │             │
│              │   Surge: 4 → 5      │             │
│              │                     │             │
│              │   Critical attacks  │             │
│              │   deal +1 damage!   │             │
│              │                     │             │
│              │   [ Continue ]      │             │
│              └─────────────────────┘             │
│                                                  │
│  XP: 0 (5 XP spent)                            │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Level Up Flow

1. Hero attacks and rolls natural 20
2. Attack hits (nat 20 always hits)
3. Damage applied
4. System checks: level 1 hero + 5+ XP?
5. If yes:
   - Level up notification displayed
   - Hero card "flips" to show level 2
   - Stats updated (HP, AC, surge, etc.)
   - 5 XP deducted
6. If no: attack resolves normally

## Implementation Tasks

- [ ] Add level tracking to hero state
- [ ] Create HERO_LEVELS data with level 1 and 2 stats
- [ ] Implement canLevelUp function
- [ ] Implement levelUpHero function
- [ ] Create LevelUpAnimation component
- [ ] Create card flip animation
- [ ] Check for level up on natural 20
- [ ] Update hero stats on level up
- [ ] Deduct 5 XP on level up
- [ ] Add level indicator to hero cards
- [ ] Implement critical hit bonus for level 2

## Unit Tests

- [ ] canLevelUp returns true on nat 20 with 5+ XP
- [ ] canLevelUp returns false for level 2 heroes
- [ ] canLevelUp returns false when XP < 5
- [ ] levelUpHero updates all stats correctly
- [ ] levelUpHero preserves damage taken
- [ ] levelUpHero deducts 5 XP
- [ ] Critical damage bonus applies for level 2 only

## E2E Test (Test 016)

```gherkin
Feature: Level Up Hero

  Scenario: Hero levels up on natural 20
    Given the party has 5 XP
    And Quinn is level 1
    When Quinn attacks and rolls a natural 20
    Then Quinn levels up to level 2
    And Quinn's stats increase
    And the party XP is now 0
```

### Screenshot Sequence

1. `016-01-attack-roll.png` - Quinn attacks
2. `016-02-natural-20.png` - Natural 20 rolled!
3. `016-03-level-up-prompt.png` - Level up notification
4. `016-04-stats-increased.png` - New level 2 stats shown
5. `016-05-xp-spent.png` - XP deducted (5 → 0)

## Dependencies

- Issue #009 (Hero Attacks Monster) - Attack rolling
- Issue #011 (Defeat Monster and Gain XP) - XP tracking

## Labels

`user-story`, `phase-4`, `gameplay`, `leveling`, `xp`
