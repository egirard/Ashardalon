# Event System Implementation Summary

This document provides a comprehensive overview of the event hook system implementation for power card conditional effects.

## Overview

The event system enables power cards to respond to game events like encounters being drawn, attacks hitting or missing, monsters spawning, and more. This is essential for implementing utility and conditional power cards that require rule hooks and triggers.

## Architecture

### Core Components

1. **Event System (`gameEvents.ts`)**
   - Defines 10 game event types
   - Manages hook registration and execution
   - Handles event propagation and modification
   - Supports priority-based hook ordering

2. **Power Card Hooks (`powerCardHooks.ts`)**
   - Implements specific hooks for 9 conditional power cards
   - Maps power card IDs to their event hooks
   - Provides hook factory functions for each card

3. **Integration Layer (`powerCardIntegration.ts`)**
   - Bridges event system with game state
   - Manages hero power card hook lifecycle
   - Provides utility functions for game slice integration
   - Includes tile-based queries and hero counting

## Implemented Event Types

| Event Type | Trigger Point | Use Cases |
|------------|---------------|-----------|
| `encounter-draw` | When encounter card is drawn | Perseverance, One for the Team |
| `attack-miss` | When hero's attack misses | Inspiring Advice |
| `attack-hit-by-hero` | When hero hits with attack | Furious Assault |
| `attack-hit-on-hero` | When hero is hit by attack | Practiced Evasion, Tumbling Escape, Mirror Image |
| `monster-spawn` | When monster is placed | To Arms! |
| `monster-activation` | When monster activates | Bravery |
| `hero-phase-start` | At turn start | Future cards |
| `hero-phase-end` | At turn end | Future cards |
| `villain-phase-start` | At villain phase start | Future cards |
| `exploration-phase-end` | At exploration end | Future cards |

## Implemented Power Cards

### 1. Perseverance (ID 10) - Cleric Utility
- **Trigger**: encounter-draw
- **Effect**: Reduces encounter cancel cost by number of heroes on tile
- **Implementation**: Hook presence checked by `calculateEncounterCancelCost()`
- **Status**: ✅ Complete

### 2. Inspiring Advice (ID 18) - Fighter Utility
- **Trigger**: attack-miss
- **Effect**: Allows reroll, keeps card if second attack also misses
- **Implementation**: Hook signals reroll availability to game slice
- **Status**: ✅ Hook ready, needs UI integration

### 3. One for the Team (ID 19) - Fighter Utility
- **Trigger**: encounter-draw
- **Effect**: Redirects encounter to this hero
- **Implementation**: Hook flips card, game slice changes active hero
- **Status**: ✅ Hook ready, needs UI integration

### 4. To Arms! (ID 20) - Fighter Utility
- **Trigger**: monster-spawn
- **Effect**: This hero and one ally on tile can move their speed
- **Implementation**: Hook flips card, game slice enables movement
- **Status**: ✅ Hook ready, needs UI integration

### 5. Bravery (ID 28) - Paladin Utility
- **Trigger**: monster-activation
- **Effect**: Teleport to monster and heal 1 HP
- **Implementation**: Hook flips card, game slice handles teleport and heal
- **Status**: ✅ Hook ready, needs UI integration

### 6. Furious Assault (ID 31) - Half-Orc Custom Ability
- **Trigger**: attack-hit-by-hero
- **Effect**: +1 damage on hit
- **Implementation**: Hook modifies damage in event, flips card
- **Status**: ✅ Fully functional

### 7. Practiced Evasion (ID 39) - Rogue Utility
- **Trigger**: attack-hit-on-hero (trap/event only)
- **Effect**: Negate trap/event attack, free disable check if trap
- **Implementation**: Hook prevents default, game slice handles disable
- **Status**: ✅ Hook ready, needs UI integration

### 8. Tumbling Escape (ID 40) - Rogue Utility
- **Trigger**: attack-hit-on-hero (monster only)
- **Effect**: Negate monster attack, teleport to tile within 1
- **Implementation**: Hook prevents default, game slice handles teleport
- **Status**: ✅ Hook ready, needs UI integration

### 9. Mirror Image (ID 49) - Wizard Utility
- **Trigger**: attack-hit-on-hero (on miss)
- **Effect**: Remove one Mirror Image charge when monster misses
- **Implementation**: Hook signals charge removal (no card flip)
- **Status**: ✅ Hook ready, needs charge tracking system

## Testing

### Test Coverage
- **Event System**: 23 unit tests in `gameEvents.test.ts`
- **Power Card Hooks**: 23 unit tests in `powerCardHooks.test.ts`
- **Integration Layer**: 15 unit tests in `powerCardIntegration.test.ts`
- **Total**: 61 new tests, 764 total tests passing
- **Coverage**: All event types, all hooks, all integration functions

### Key Test Scenarios
- Hook registration and unregistration
- Event triggering and propagation
- Priority ordering of hooks
- Event modification across hooks
- Power card flipping tracking
- Default behavior prevention
- Hook-specific logic for each card

## Usage Example

```typescript
// 1. Initialize event hook state
let hookState = initializeEventHooks();

// 2. Register hero power cards
const heroPowerCards: HeroPowerCards = {
  heroId: 'tarak',
  customAbility: 31, // Furious Assault
  utility: 40,       // Tumbling Escape
  atWills: [32, 33],
  daily: 35,
  cardStates: [
    { cardId: 31, isFlipped: false },
    { cardId: 40, isFlipped: false },
    { cardId: 32, isFlipped: false },
    { cardId: 33, isFlipped: false },
    { cardId: 35, isFlipped: false },
  ],
};

hookState = registerHeroPowerCardHooks(hookState, heroPowerCards);

// 3. Trigger an event
const attackEvent = {
  type: 'attack-hit-by-hero' as const,
  heroId: 'tarak',
  turnNumber: 1,
  attackerId: 'tarak',
  targetMonsterId: 'monster-1',
  attackResult: { /* attack data */ },
  damage: 2,
};

const result = triggerGameEvent(hookState, attackEvent);

// 4. Process results
// result.event.damage === 3 (Furious Assault added +1)
// result.powerCardsToFlip contains [{ powerCardId: 31, heroId: 'tarak' }]
// result.preventedDefault === false

// 5. Flip used cards
for (const { powerCardId, heroId } of result.powerCardsToFlip) {
  hookState = unregisterPowerCard(hookState, powerCardId, heroId);
  // Also flip in hero power card state
}
```

## Integration with Game Slice

### Required State Additions

```typescript
interface GameState {
  // Existing state...
  
  // Add event hook state
  eventHooks: EventHookState;
  
  // Hero power cards (already exists in heroesSlice or similar)
  heroPowerCards: Record<string, HeroPowerCards>;
}
```

### Event Trigger Points

1. **Encounter Draw** (in villain phase)
   ```typescript
   const encounterEvent: EncounterDrawEvent = {
     type: 'encounter-draw',
     heroId: getCurrentHeroId(state),
     turnNumber: state.turnState.turnNumber,
     encounterId: drawnEncounter.id,
     currentXp: state.partyResources.xp,
     baseCancelCost: 5,
   };
   
   const result = triggerGameEvent(state.eventHooks, encounterEvent);
   // Use result.event for modified cancel cost
   // Flip cards in result.powerCardsToFlip
   ```

2. **Attack Miss** (in combat)
   ```typescript
   const missEvent: AttackMissEvent = {
     type: 'attack-miss',
     heroId: attackerId,
     turnNumber: state.turnState.turnNumber,
     attackerId,
     targetMonsterId,
     attackResult,
   };
   
   const result = triggerGameEvent(state.eventHooks, missEvent);
   // Check if Inspiring Advice triggered for reroll option
   ```

3. **Attack Hit by Hero** (in combat)
   ```typescript
   const hitEvent: AttackHitByHeroEvent = {
     type: 'attack-hit-by-hero',
     heroId: attackerId,
     turnNumber: state.turnState.turnNumber,
     attackerId,
     targetMonsterId,
     attackResult,
     damage: calculatedDamage,
   };
   
   const result = triggerGameEvent(state.eventHooks, hitEvent);
   // Use result.event.damage for modified damage (Furious Assault)
   ```

4. **Monster Spawn** (in exploration)
   ```typescript
   const spawnEvent: MonsterSpawnEvent = {
     type: 'monster-spawn',
     heroId: getCurrentHeroId(state),
     turnNumber: state.turnState.turnNumber,
     monsterInstanceId,
     monsterId,
     position,
     tileId,
   };
   
   const result = triggerGameEvent(state.eventHooks, spawnEvent);
   // Check if To Arms! triggered for movement option
   ```

## Next Steps

### Phase 1: Game Slice Integration
1. Add `eventHooks: EventHookState` to GameState
2. Initialize hooks on game start and card refresh
3. Add event triggers at appropriate game moments
4. Handle power card flipping from hook responses
5. Update encounter cancel cost with Perseverance check

### Phase 2: UI Implementation
1. Power card activation prompts (when hooks trigger)
2. Reroll option for Inspiring Advice
3. Hero selection for encounter redirection
4. Movement UI for To Arms! and Bravery
5. Teleport UI for Tumbling Escape

### Phase 3: Additional Power Cards
1. Simple healing utilities (Healing Hymn, Dwarven Resilience, Lay On Hands)
2. Monster relocation (Command, Distant Diversion)
3. Passive effects (Invisibility, Mirror Image AC bonus)
4. Complex multi-step cards (Cause Fear, Acrobatic Onslaught)

## Benefits

### Code Quality
- **Separation of Concerns**: Event logic separated from game logic
- **Type Safety**: Fully typed event system with TypeScript
- **Testability**: All hooks independently testable
- **Extensibility**: Easy to add new event types and hooks

### Game Design
- **Consistent Behavior**: All conditional effects use same system
- **Priority Control**: Resolve multiple effects in correct order
- **Event Modification**: Effects can modify events for other effects
- **Flexible Timing**: Hooks can trigger at any game moment

### Development
- **Clear Documentation**: Each hook fully documented
- **Test Coverage**: 61 tests ensure correctness
- **Integration Ready**: Helper functions for game slice
- **Security Verified**: CodeQL scan found no issues

## Conclusion

The event hook system provides a robust, tested, and well-documented foundation for implementing conditional power card effects. With 9 power cards already hooked and 10+ more identified for simple implementation, the system is ready for integration into the game slice.

The architecture is extensible, type-safe, and follows best practices for event-driven programming. All tests pass, code review feedback has been addressed, and no security issues were found.

**Status**: ✅ Event system complete and ready for game slice integration
