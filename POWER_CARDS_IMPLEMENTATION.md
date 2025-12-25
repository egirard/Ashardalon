# Power Card Implementation Status

This document tracks the implementation status of all power cards in Wrath of Ashardalon, with a focus on utility and conditional power cards that require special rule hooks.

## Overview

Power cards are divided into three types:
- **At-Will**: Can be used multiple times (flipped back up after rest)
- **Daily**: Can be used once per day (flipped back up after extended rest)
- **Utility**: Special abilities with varying usage conditions

## Event Hook System

The game now includes a comprehensive event hook system that allows power cards to respond to game events:

### Supported Event Types
1. `encounter-draw` - When an encounter card is drawn
2. `attack-miss` - When a hero's attack misses
3. `attack-hit-by-hero` - When a hero successfully hits with an attack
4. `attack-hit-on-hero` - When a hero is hit by an attack
5. `monster-spawn` - When a monster is placed on the board
6. `monster-activation` - When a monster activates during villain phase
7. `hero-phase-start` - At the start of a hero's turn
8. `hero-phase-end` - At the end of a hero's turn
9. `villain-phase-start` - At the start of villain phase
10. `exploration-phase-end` - At the end of exploration phase

### Hook Architecture
- Power cards register event hooks when they are available (not flipped)
- Hooks can modify events, prevent default behavior, and trigger card effects
- Multiple hooks can respond to the same event with priority ordering
- Hooks can signal whether the power card should be flipped (used)

## Implementation Status by Card

### ✅ Utility Cards with Event Hooks (9 cards)

| ID | Name | Class | Event Type | Status | Notes |
|----|------|-------|------------|--------|-------|
| 10 | Perseverance | Cleric | encounter-draw | ✅ Hook Ready | Reduces encounter cancel cost by heroes on tile |
| 18 | Inspiring Advice | Fighter | attack-miss | ✅ Hook Ready | Allows reroll, keeps card if still misses |
| 19 | One for the Team | Fighter | encounter-draw | ✅ Hook Ready | Redirects encounter to this hero |
| 20 | To Arms! | Fighter | monster-spawn | ✅ Hook Ready | Allows movement when monster spawns |
| 28 | Bravery | Paladin | monster-activation | ✅ Hook Ready | Teleport to monster and heal |
| 31 | Furious Assault | Half-Orc | attack-hit-by-hero | ✅ Hook Ready | +1 damage on hit (custom ability) |
| 39 | Practiced Evasion | Rogue | attack-hit-on-hero | ✅ Hook Ready | Negate trap/event attack |
| 40 | Tumbling Escape | Rogue | attack-hit-on-hero | ✅ Hook Ready | Negate monster attack and teleport |
| 49 | Mirror Image | Wizard | attack-hit-on-hero | ✅ Hook Ready | Remove charge on miss |

**Implementation Notes:**
- All 9 cards have hooks implemented in `powerCardHooks.ts`
- Hooks are tested with 23 unit tests
- Ready for integration into gameSlice for full functionality

### ✅ Simple Utility Cards Implemented (Healing Powers)

These healing utility cards are now implemented and can be activated during hero phase:

| ID | Name | Class | Type | Implementation Status |
|----|------|-------|------|----------------------|
| 1 | Healing Hymn | Cleric | utility | ✅ Implemented - Heal self and ally on tile 2 HP |
| 11 | Dwarven Resilience | Dwarf | utility | ✅ Implemented - Self-heal 4 HP |
| 21 | Lay On Hands | Paladin | utility | ✅ Implemented - Heal adjacent ally 2 HP |

**Implementation Details:**
- Added `applyHealing({ heroId, amount })` action to gameSlice
- Healing respects HP caps (cannot exceed max HP)
- Cards can be activated from player power card dashboard during hero phase
- Healing Hymn heals all heroes on the same tile/sub-tile
- Dwarven Resilience heals only the hero using it
- Lay On Hands heals one adjacent ally (not self)

### 🔨 Simple Utility Cards (No Hooks Needed) - Remaining

These cards can be implemented as simple hero-phase actions without event hooks:

| ID | Name | Class | Type | Notes |
|----|------|-------|------|-------|
| 8 | Astral Refuge | Cleric | utility | Remove ally from board temporarily |
| 9 | Command | Cleric | utility | Move monster to tile within 2 tiles |
| 29 | Noble Shield | Paladin | utility | Complex - redirect multi-target attack |
| 30 | Virtue's Touch | Paladin | utility | Remove condition from adjacent ally |
| 38 | Distant Diversion | Rogue | utility | Move monster to adjacent tile |
| 48 | Invisibility | Wizard | utility | Passive - modify monster targeting |
| 50 | Wizard Eye | Wizard | utility | Place token, remote exploration |

**Implementation Priority:**
1. Monster relocation (9, 38) - move monsters during hero phase
2. Complex utilities (29, 30, 48, 50) - require additional game state

### ✅ At-Will Attack Cards with Special Effects

These cards have additional effects beyond basic attacks:

| ID | Name | Class | Effect | Implementation |
|----|------|-------|--------|----------------|
| 2 | Cleric's Shield | Cleric | Grant +2 AC to ally | Needs AC modifier tracking |
| 3 | Righteous Advance | Cleric | Ally moves 2 squares | Needs ally movement system |
| 4 | Sacred Flame | Cleric | Grant 1 HP on hit | Can use existing HP system |
| 22 | Divine Challenge | Paladin | Move monster adjacent | Can use existing movement |
| 23 | Holy Strike | Paladin | +1 damage if started adjacent | Condition check needed |
| 24 | Valiant Strike | Paladin | +1 attack per adjacent monster | Count adjacent monsters |
| 32 | Distracting Jab | Rogue | Move monster, then move self | Two-part effect |
| 33 | Lucky Strike | Rogue | +1 damage on even roll | Simple condition |
| 34 | Positioning Shot | Rogue | Move monster on hit or miss | Always triggers |
| 43 | Hypnotism | Wizard | Move monster, attack another | Complex chain |

**Note:** Most at-will cards with attack bonuses and damage are already functional through the combat system. The special effects listed need additional implementation.

### ✅ Daily Attack Cards with Special Effects

| ID | Name | Class | Effect | Implementation |
|----|------|-------|--------|----------------|
| 5 | Blade Barrier | Cleric | Place 5 tokens that damage monsters | ✅ Implemented |
| 6 | Cause Fear | Cleric | Allies attack, then move monsters | Multi-step effect |
| 7 | Wrathful Thunder | Cleric | Pass monster control to another player | Needs control transfer |
| 15 | Comeback Strike | Fighter | Don't flip on miss | Conditional flip |
| 16 | Into the Fray | Fighter | Teleport to ally, then attack | Two-part effect |
| 17 | Taunting Advance | Fighter | Move, pull monster, attack | Three-part effect |
| 25 | Arcing Strike | Paladin | Attack 1 or 2 adjacent monsters | Multi-target |
| 26 | Benign Transposition | Paladin | Swap with ally, attack | Two-part effect |
| 27 | Righteous Smite | Paladin | All heroes on tile heal 1 HP | AoE heal |
| 35 | Acrobatic Onslaught | Rogue | Attack, teleport, use at-will | Complex chain |
| 36 | King's Castle | Rogue | Swap with ally, ranged attack | Two-part effect |
| 37 | Tornado Strike | Rogue | 4 attacks, then move | Multi-attack |
| 41 | Hurled Breath | Dragonborn | Attack all monsters on tile | ✅ Implemented |
| 45 | Flaming Sphere | Wizard | Place 3-charge token | ✅ Implemented |
| 46 | Shock Sphere | Wizard | Attack all monsters on tile | AoE attack |
| 47 | Spectral Ram | Wizard | Attack and force move | Attack + effect |

## Cards Requiring Complex Rule Logic

The following cards have complex effects that require careful design and may need deferred implementation:

### Multi-Step Effect Cards
- **Cause Fear (6)**: Requires multi-hero attack coordination
- **Acrobatic Onslaught (35)**: Chain multiple powers together
- **Hypnotism (43)**: Move + conditional attack chain

### Status/Condition Cards
- **Noble Shield (29)**: Requires attack redirection system
- **Virtue's Touch (30)**: Requires condition/status system
- **Mirror Image (49)**: Requires AC modifier and charge tracking

### Passive/Ongoing Effect Cards
- **Cleric's Shield (2)**: AC modifier until power used again
- **Invisibility (48)**: Modify monster AI targeting

### Control Transfer Cards
- **Wrathful Thunder (7)**: Pass monster control between players
- **Astral Refuge (8)**: Temporarily remove hero from play

## Testing Coverage

### Current Test Status
- **Event System Tests**: 23 tests in `gameEvents.test.ts`
- **Power Card Hook Tests**: 23 tests in `powerCardHooks.test.ts`
- **Total Test Suite**: 749 tests passing

### Test Coverage by Category
- ✅ Event hook registration and unregistration
- ✅ Event triggering and propagation
- ✅ Hook priority ordering
- ✅ Power card flip tracking
- ✅ Event modification
- ✅ All 9 power card hooks with event-specific tests

## Next Implementation Steps

### Phase 1: Integration (High Priority)
1. Integrate event hook system into gameSlice
2. Add event triggers at appropriate game moments:
   - Trigger `encounter-draw` when encounter is drawn
   - Trigger `attack-miss` and `attack-hit-by-hero` in combat
   - Trigger `attack-hit-on-hero` when hero is targeted
   - Trigger `monster-spawn` when placing monsters
   - Trigger `monster-activation` during villain phase
3. Add power card state management for active hooks
4. Implement UI prompts for power card activation choices

### Phase 2: Simple Utilities (Medium Priority)
1. Healing utilities (1, 11, 21)
2. Monster relocation (9, 38)
3. Condition removal (30) - requires condition system
4. Wizard Eye (50) - remote exploration

### Phase 3: Complex Effects (Lower Priority)
1. AC modifiers and tracking (2, 49)
2. Multi-step effect chains (6, 35, 43)
3. Control transfer mechanics (7, 8)
4. Passive effects (48)

### Phase 4: At-Will Special Effects
1. Ally movement triggers (3, 32)
2. Conditional damage bonuses (4, 23, 24, 33)
3. Monster positioning (22, 34)

## Documentation for Future Development

### Adding New Event Hooks

To add a new power card with event hooks:

1. **Add hook implementation** in `powerCardHooks.ts`:
   ```typescript
   case YOUR_CARD_ID:
     return [{
       eventType: 'your-event-type',
       hook: createYourCardHook(),
       priority: 10,
     }];
   ```

2. **Implement the hook function**:
   ```typescript
   function createYourCardHook(): EventHook<YourEventType> {
     return (event: YourEventType): EventHookResponse => {
       // Your logic here
       return {
         flipPowerCard: YOUR_CARD_ID,
         modifiedEvent: { /* modifications */ },
       };
     };
   }
   ```

3. **Add tests** in `powerCardHooks.test.ts`:
   ```typescript
   describe('Your Card hook', () => {
     it('should handle the event correctly', () => {
       // Test implementation
     });
   });
   ```

4. **Update this documentation** with implementation status

### Event Hook Response Options

When implementing a hook, you can return:
- `preventDefault: true` - Prevent default game behavior
- `stopPropagation: true` - Stop processing other hooks
- `flipPowerCard: number` - Mark this card as used
- `keepPowerCard: true` - Keep card available (don't flip)
- `modifiedEvent: Partial<Event>` - Modify event for subsequent hooks

## Summary

**Implemented:**
- ✅ Event hook system with 10 event types
- ✅ 9 power card hooks for conditional/utility effects
- ✅ 46 comprehensive unit tests
- ✅ Foundation for event-driven gameplay

**Ready for Integration:**
- All hook implementations are complete and tested
- Game slice integration is the next critical step
- UI prompts needed for player choices

**Remaining Work:**
- 10 simple utility cards (no hooks needed)
- ~20 at-will/daily cards with special effects
- Complex multi-step and passive effects
- Status/condition system for full feature parity
