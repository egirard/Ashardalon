# Monster Target Selection System Design

## Overview

This document defines the design for implementing player selection when monster AI encounters multiple valid targets or positions during the villain phase.

## Scenarios Requiring Player Selection

### 1. Multiple Equidistant Hero Targets

**When:** Monster needs to choose between 2+ heroes at the same distance.

**Current Behavior:** `findClosestHero()` returns the first hero found (arbitrary).

**New Behavior:** Pause villain phase and prompt controller to select target hero.

**Affected Functions:**
- `findClosestHero()` in `monsterAI.ts`
- `findAdjacentHero()` in `monsterAI.ts`

**UI:** Highlight all equidistant heroes, allow click to select.

### 2. Multiple Adjacent Heroes for Attack

**When:** Monster is adjacent to 2+ heroes and can attack any of them.

**Current Behavior:** `findAdjacentHero()` returns the first adjacent hero found.

**New Behavior:** Prompt controller to select which adjacent hero to attack.

**UI:** Highlight all adjacent heroes, allow click to select.

### 3. Multiple Valid Positions for Movement

**When:** Monster can move to multiple positions that are equidistant to target hero.

**Current Behavior:** `findMoveTowardHero()` returns the first valid position found.

**New Behavior:** Prompt controller to select destination square.

**UI:** Highlight all valid move destinations, allow click to select.

### 4. Area Attack with Multiple Heroes on Same Tile

**When:** Cave Bear or similar monsters attack all heroes on same tile (future implementation).

**Current Behavior:** Not yet implemented.

**New Behavior:** Attack all heroes automatically (no selection needed - this is AOE).

**UI:** Show all affected heroes simultaneously.

### 5. Monster Spawn Position Selection

**When:** Placing a monster with multiple valid spawn positions (e.g., Legion Devil spawns).

**Current Behavior:** Not yet implemented.

**New Behavior:** Prompt controller to select spawn square.

**UI:** Highlight all valid spawn positions, allow click to select.

## State Management Design

### New State Types

```typescript
/**
 * Types of pending monster decisions that require player input
 */
export type PendingMonsterDecisionType = 
  | 'choose-hero-target'      // Multiple heroes at same distance
  | 'choose-adjacent-target'   // Multiple adjacent heroes for attack
  | 'choose-move-destination'  // Multiple valid move positions
  | 'choose-spawn-position';   // Multiple valid spawn positions

/**
 * Pending monster decision state
 */
export interface PendingMonsterDecision {
  /** Unique ID for this decision */
  decisionId: string;
  /** Type of decision required */
  type: PendingMonsterDecisionType;
  /** Monster making the decision */
  monsterId: string;
  /** Available options for selection */
  options: {
    /** Hero IDs if choosing hero target */
    heroIds?: string[];
    /** Positions if choosing location */
    positions?: Position[];
  };
  /** Context for the decision (e.g., "attack" or "movement") */
  context: string;
}

/**
 * Add to GameState interface
 */
interface GameState {
  // ... existing fields ...
  
  /** Pending monster decision requiring player input */
  pendingMonsterDecision: PendingMonsterDecision | null;
  
  /** Whether villain phase is paused waiting for player input */
  villainPhasePaused: boolean;
}
```

### New Actions

```typescript
/**
 * Pause villain phase to prompt for monster target selection
 */
promptMonsterDecision(state, action: PayloadAction<PendingMonsterDecision>)

/**
 * Player selected a hero target for monster action
 */
selectMonsterTarget(state, action: PayloadAction<{ 
  decisionId: string; 
  targetHeroId: string;
}>)

/**
 * Player selected a position for monster action
 */
selectMonsterPosition(state, action: PayloadAction<{ 
  decisionId: string; 
  position: Position;
}>)

/**
 * Cancel/clear pending monster decision
 */
cancelMonsterDecision(state)
```

## Monster AI Integration

### Modified Functions

#### findClosestHero()

```typescript
export function findClosestHero(
  monster: MonsterState,
  heroTokens: HeroToken[],
  heroHpMap: Record<string, number>,
  dungeon: DungeonState
): { hero: HeroToken; distance: number } | { heroes: HeroToken[]; distance: number; needsChoice: true } | null {
  // ... existing BFS logic ...
  
  // NEW: Check if multiple heroes at same distance
  const heroesAtClosestDistance = aliveHeroes.filter(hero => {
    // Calculate if hero is at the closest distance found
    // ...
  });
  
  if (heroesAtClosestDistance.length > 1) {
    // Multiple heroes at same distance - require player choice
    return {
      heroes: heroesAtClosestDistance,
      distance: closestDistance,
      needsChoice: true
    };
  }
  
  // Single closest hero
  return closestHero;
}
```

#### executeMonsterTurn()

```typescript
export function executeMonsterTurn(
  monster: MonsterState,
  heroTokens: HeroToken[],
  heroHpMap: Record<string, number>,
  heroAcMap: Record<string, number>,
  monsters: MonsterState[],
  dungeon: DungeonState,
  randomFn: () => number = Math.random
): MonsterAction | { type: 'needs-choice'; decision: PendingMonsterDecision } {
  // ... existing logic ...
  
  // When finding closest hero
  const closest = findClosestHero(monster, heroTokens, heroHpMap, dungeon);
  
  if (closest && 'needsChoice' in closest && closest.needsChoice) {
    // Multiple heroes at same distance - need player choice
    return {
      type: 'needs-choice',
      decision: {
        decisionId: `monster-${monster.instanceId}-target`,
        type: 'choose-hero-target',
        monsterId: monster.instanceId,
        options: {
          heroIds: closest.heroes.map(h => h.heroId)
        },
        context: 'movement'
      }
    };
  }
  
  // ... continue with single target ...
}
```

## UI Components

### MonsterDecisionPrompt Component

```svelte
<script lang="ts">
  import { gameStore } from '../store';
  import type { PendingMonsterDecision } from '../store/types';
  
  export let decision: PendingMonsterDecision;
  
  function selectHero(heroId: string) {
    gameStore.dispatch({
      type: 'game/selectMonsterTarget',
      payload: { decisionId: decision.decisionId, targetHeroId: heroId }
    });
  }
  
  function selectPosition(position: Position) {
    gameStore.dispatch({
      type: 'game/selectMonsterPosition',
      payload: { decisionId: decision.decisionId, position }
    });
  }
</script>

<div class="monster-decision-prompt">
  <h3>Monster Decision Required</h3>
  
  {#if decision.type === 'choose-hero-target'}
    <p>Select which hero the monster should target:</p>
    <div class="hero-options">
      {#each decision.options.heroIds as heroId}
        <button on:click={() => selectHero(heroId)}>
          {heroId}
        </button>
      {/each}
    </div>
  {/if}
  
  {#if decision.type === 'choose-move-destination'}
    <p>Select where the monster should move:</p>
    <p class="hint">Click on a highlighted square on the map</p>
  {/if}
</div>

<style>
  .monster-decision-prompt {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.9);
    border: 2px solid #ffd700;
    padding: 20px;
    border-radius: 8px;
    z-index: 1000;
  }
</style>
```

### Map Highlighting

Add visual indicators on the game board:

1. **Hero Selection:** Golden glow on selectable heroes (similar to existing target selection)
2. **Position Selection:** Blue highlight on valid destination squares
3. **Monster Indicator:** Show which monster is making the decision

## Villain Phase Flow

### Current Flow

```
1. Start villain phase
2. For each monster:
   a. Execute monster turn
   b. Apply movement
   c. Apply attack
3. End villain phase
```

### New Flow with Pausing

```
1. Start villain phase
2. For each monster:
   a. Execute monster turn
   b. If needs choice:
      - Set villainPhasePaused = true
      - Set pendingMonsterDecision
      - Wait for player selection
      - Resume with selected option
   c. Apply movement
   d. Apply attack
3. End villain phase
```

## Implementation Steps

### Phase 1: State Management (Step 1-2)
1. Add `PendingMonsterDecision` types to `types.ts`
2. Add state fields to `GameState`
3. Add actions to `gameSlice.ts`

### Phase 2: Monster AI Modifications (Step 3-4)
4. Modify `findClosestHero()` to detect ties
5. Modify `findAdjacentHero()` to detect multiple targets
6. Modify `executeMonsterTurn()` to return choice requests

### Phase 3: UI Components (Step 5-6)
7. Create `MonsterDecisionPrompt.svelte`
8. Add map highlighting for selectable options
9. Integrate prompt into `GameBoard.svelte`

### Phase 4: Integration Testing (Step 7-8)
10. E2E test: Multiple equidistant heroes
11. E2E test: Multiple adjacent heroes for attack
12. E2E test: Multiple valid move positions

### Phase 5: Documentation (Step 9)
13. Update MONSTER_CARD_IMPLEMENTATION.md
14. List all behaviors covered in PR

## E2E Test Scenarios

### Test 100: Choose Hero Target (Multiple Equidistant)

**Setup:**
- Place 2 heroes at equal distance from monster
- Trigger villain phase

**Expected:**
- Villain phase pauses
- UI prompts: "Select which hero the monster should target"
- Both heroes highlighted on map
- Click on hero → selection confirmed
- Monster moves toward selected hero

**Screenshots:**
1. Initial state: Monster with 2 equidistant heroes
2. Prompt shown with heroes highlighted
3. After selection: Monster moving toward chosen hero

### Test 101: Choose Adjacent Target for Attack

**Setup:**
- Place monster adjacent to 2 heroes
- Trigger villain phase

**Expected:**
- Villain phase pauses
- UI prompts: "Select which hero the monster should attack"
- Both adjacent heroes highlighted
- Click on hero → attack resolves against that hero

**Screenshots:**
1. Initial state: Monster adjacent to 2 heroes
2. Prompt shown with heroes highlighted
3. After selection: Attack result displayed

### Test 102: Choose Move Destination

**Setup:**
- Create scenario where monster has 2+ equidistant moves toward hero
- Trigger villain phase

**Expected:**
- Villain phase pauses
- UI prompts: "Select where the monster should move"
- Valid squares highlighted on map
- Click on square → monster moves there

**Screenshots:**
1. Initial state: Monster with multiple valid moves
2. Prompt shown with squares highlighted
3. After selection: Monster at chosen position

## Future Extensions

### Area Attacks (Cave Bear, Gibbering Mouther)

When implementing area attacks that hit all heroes on a tile/in range:
- No selection needed (automatic multi-target)
- Show all affected heroes simultaneously
- Roll attack for each hero

### Spawn Position Selection (Legion Devil)

When spawning multiple monsters:
- Prompt for each spawn position
- Show valid spawn squares
- Place monsters sequentially

### Monster-to-Monster Targeting

If future cards require monsters to target other monsters:
- Extend system to support monster targets
- Similar UI pattern to hero selection

## Acceptance Criteria

✅ Monster turns requiring player selection pause villain phase
✅ Correct UI prompt shown based on decision type
✅ Map highlights valid selectable options
✅ Selection resumes villain phase with chosen option
✅ All interaction patterns tested with E2E tests
✅ Documentation updated with covered monsters/behaviors
✅ PR includes list of all patterns implemented
