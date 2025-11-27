# Issue: Use Healing Surge

## User Story

> As a user, when a hero is at 0 HP at the start of their turn, a healing surge is automatically used to heal them.

## Acceptance Criteria

- [ ] Party starts with 2 healing surges
- [ ] Healing surge count is displayed
- [ ] When hero at 0 HP starts turn, surge is used automatically
- [ ] Hero HP is restored to their surge value
- [ ] Surge count decreases by 1

## Design

### Data Model

```typescript
interface PartyResources {
  xp: number;
  healingSurges: number;  // Starts at 2
}

interface HeroStats {
  heroId: string;
  hp: number;
  maxHp: number;
  ac: number;
  surgeValue: number;  // HP restored when using surge
}

// Hero surge values
const HERO_SURGE_VALUES: Record<string, number> = {
  quinn: 4,    // Cleric
  vistra: 5,   // Fighter
  keyleth: 5,  // Paladin
  tarak: 4,    // Rogue
  haskan: 3,   // Wizard
};
```

### Healing Surge Logic

```typescript
function checkHealingSurgeNeeded(
  hero: HeroState,
  resources: PartyResources
): boolean {
  return hero.hp === 0 && resources.healingSurges > 0;
}

function useHealingSurge(
  hero: HeroState,
  resources: PartyResources
): { hero: HeroState; resources: PartyResources } {
  const surgeValue = HERO_SURGE_VALUES[hero.heroId];
  
  return {
    hero: {
      ...hero,
      hp: Math.min(surgeValue, hero.maxHp),
    },
    resources: {
      ...resources,
      healingSurges: resources.healingSurges - 1,
    },
  };
}
```

### Components to Create

1. **HealingSurgeCounter.svelte** - Displays available surges
2. **HealingSurgeAnimation.svelte** - Visual feedback for healing

### Components to Modify

1. **GameBoard.svelte** - Include healing surge counter
2. **HeroCard.svelte** - Show surge value

### UI Layout

```
┌──────────────────────────────────────────────────┐
│  Wrath of Ashardalon          ❤️ Surges: 2      │
├──────────────────────────────────────────────────┤
│                                                  │
│  Turn 2 - Quinn's Turn | Start of Turn          │
│                                                  │
│              ┌─────────────────────┐             │
│              │   Healing Surge!    │             │
│              │                     │             │
│              │   Quinn was at 0 HP │             │
│              │                     │             │
│              │   ❤️ +4 HP restored │             │
│              │                     │             │
│              │   [ Continue ]      │             │
│              └─────────────────────┘             │
│                                                  │
│  ❤️ Surges: 1 (remaining)                       │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Healing Surge Flow

1. Turn passes to hero
2. System checks if hero HP = 0
3. If HP = 0 and surges > 0:
   - Healing surge automatically used
   - Display healing notification
   - Hero HP restored to surge value
   - Surge count decreases
4. Hero Phase begins normally

Note: This is automatic - player doesn't choose to use it.

## Implementation Tasks

- [ ] Add healingSurges to party resources (initialize to 2)
- [ ] Add surgeValue to hero stats
- [ ] Create HealingSurgeCounter.svelte component
- [ ] Implement checkHealingSurgeNeeded function
- [ ] Implement useHealingSurge function
- [ ] Create healing surge notification/animation
- [ ] Trigger surge check at turn start
- [ ] Update UI to show remaining surges
- [ ] Display surge value on hero cards

## Unit Tests

- [ ] Party initializes with 2 healing surges
- [ ] checkHealingSurgeNeeded returns true when HP=0 and surges available
- [ ] useHealingSurge restores correct HP amount
- [ ] useHealingSurge decreases surge count by 1
- [ ] No surge used if HP > 0

## E2E Test (Test 014)

```gherkin
Feature: Use Healing Surge

  Scenario: Hero automatically healed at turn start
    Given the party has 2 healing surges
    And Quinn has 0 HP
    When Quinn's turn begins
    Then a healing surge is used automatically
    And Quinn's HP is restored
    And the healing surge count is now 1
```

### Screenshot Sequence

1. `014-01-quinn-at-zero.png` - Quinn at 0 HP, turn about to begin
2. `014-02-surge-triggers.png` - Healing surge notification
3. `014-03-hp-restored.png` - Quinn's HP restored to surge value
4. `014-04-surge-counter.png` - Updated surge counter (2 → 1)

## Dependencies

- Issue #010 (Monster Attacks Hero) - Hero HP tracking

## Labels

`user-story`, `phase-4`, `gameplay`, `healing`
