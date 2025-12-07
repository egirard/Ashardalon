/**
 * Power card hook implementations for conditional and utility effects.
 * This module defines the event hooks for power cards that respond to game events.
 */

import type {
  EventHook,
  EncounterDrawEvent,
  AttackMissEvent,
  AttackHitByHeroEvent,
  AttackHitOnHeroEvent,
  MonsterSpawnEvent,
  MonsterActivationEvent,
  EventHookResponse,
} from './gameEvents';

/**
 * Get all hooks that should be registered for a power card when it's available
 * Returns an array of [eventType, hook, priority] tuples
 */
export function getPowerCardHooks(powerCardId: number): Array<{
  eventType: string;
  hook: EventHook;
  priority: number;
}> {
  switch (powerCardId) {
    // Perseverance (ID 10) - Cleric utility
    // Reduces encounter cancel cost by number of heroes on tile
    case 10:
      return [{
        eventType: 'encounter-draw',
        hook: createPerseveranceHook(),
        priority: 10,
      }];
    
    // Inspiring Advice (ID 18) - Fighter utility
    // Reroll missed attack, keep card if still misses
    case 18:
      return [{
        eventType: 'attack-miss',
        hook: createInspiringAdviceHook(),
        priority: 10,
      }];
    
    // One for the Team (ID 19) - Fighter utility
    // Redirect encounter to this hero
    case 19:
      return [{
        eventType: 'encounter-draw',
        hook: createOneForTheTeamHook(),
        priority: 5,
      }];
    
    // To Arms! (ID 20) - Fighter utility
    // Allow movement when monster spawns
    case 20:
      return [{
        eventType: 'monster-spawn',
        hook: createToArmsHook(),
        priority: 10,
      }];
    
    // Bravery (ID 28) - Paladin utility
    // Teleport to monster and heal when it activates
    case 28:
      return [{
        eventType: 'monster-activation',
        hook: createBraveryHook(),
        priority: 10,
      }];
    
    // Furious Assault (ID 31) - Half-Orc utility (custom ability)
    // Add +1 damage when attack hits
    case 31:
      return [{
        eventType: 'attack-hit-by-hero',
        hook: createFuriousAssaultHook(),
        priority: 10,
      }];
    
    // Practiced Evasion (ID 39) - Rogue utility
    // Negate trap/event attack
    case 39:
      return [{
        eventType: 'attack-hit-on-hero',
        hook: createPracticedEvasionHook(),
        priority: 10,
      }];
    
    // Tumbling Escape (ID 40) - Rogue utility
    // Negate monster attack and teleport
    case 40:
      return [{
        eventType: 'attack-hit-on-hero',
        hook: createTumblingEscapeHook(),
        priority: 10,
      }];
    
    // Mirror Image (ID 49) - Wizard utility
    // Remove charge when monster misses
    case 49:
      return [{
        eventType: 'attack-hit-on-hero',
        hook: createMirrorImageHook(),
        priority: 5,
      }];
    
    default:
      return [];
  }
}

/**
 * Perseverance (ID 10): Reduce encounter cancel cost by heroes on tile
 * Note: This requires game state context to count heroes, so it will be
 * handled specially in the game slice
 */
function createPerseveranceHook(): EventHook<EncounterDrawEvent> {
  return (event: EncounterDrawEvent): EventHookResponse => {
    // This hook is a marker that Perseverance is active
    // The actual cost reduction is calculated in the game slice
    // based on hero positions
    return {
      // Signal that this card modifies encounter cancel cost
      modifiedEvent: {
        // Cost reduction will be applied by game slice
      },
    };
  };
}

/**
 * Inspiring Advice (ID 18): Allow reroll on missed attack
 * If second attack misses, don't flip the card
 */
function createInspiringAdviceHook(): EventHook<AttackMissEvent> {
  return (event: AttackMissEvent): EventHookResponse => {
    // This hook signals that a reroll is available
    // The actual reroll mechanics are handled in the game slice
    // If the reroll also misses, keepPowerCard will be true
    return {
      // Mark that this power enables a reroll
      // Game slice will handle the UI and reroll logic
    };
  };
}

/**
 * One for the Team (ID 19): Redirect encounter to different hero
 */
function createOneForTheTeamHook(): EventHook<EncounterDrawEvent> {
  return (event: EncounterDrawEvent): EventHookResponse => {
    // This hook signals that the encounter can be redirected
    // The actual redirection (choosing target hero) is handled in the game slice
    return {
      flipPowerCard: 19,
      // Game slice will handle changing the active hero for encounter resolution
    };
  };
}

/**
 * To Arms! (ID 20): Allow movement when monster spawns
 */
function createToArmsHook(): EventHook<MonsterSpawnEvent> {
  return (event: MonsterSpawnEvent): EventHookResponse => {
    // This hook signals that movement is available
    // The game slice will handle showing movement options for this hero
    // and one hero on their tile
    return {
      flipPowerCard: 20,
    };
  };
}

/**
 * Bravery (ID 28): Teleport to monster and heal when it activates
 */
function createBraveryHook(): EventHook<MonsterActivationEvent> {
  return (event: MonsterActivationEvent): EventHookResponse => {
    // This hook signals that the hero can teleport to the monster
    // The game slice will handle the teleport and healing
    return {
      flipPowerCard: 28,
    };
  };
}

/**
 * Furious Assault (ID 31): Add +1 damage when hero hits
 */
function createFuriousAssaultHook(): EventHook<AttackHitByHeroEvent> {
  return (event: AttackHitByHeroEvent): EventHookResponse => {
    // Add +1 damage to the attack
    return {
      flipPowerCard: 31,
      modifiedEvent: {
        damage: event.damage + 1,
      },
    };
  };
}

/**
 * Practiced Evasion (ID 39): Negate trap/event attack and get free disable check
 */
function createPracticedEvasionHook(): EventHook<AttackHitOnHeroEvent> {
  return (event: AttackHitOnHeroEvent): EventHookResponse => {
    // Only trigger on trap or event attacks
    if (!event.isTrapAttack && !event.isEventAttack) {
      return null;
    }
    
    // Negate the attack
    return {
      preventDefault: true,
      flipPowerCard: 39,
      // Game slice will handle free disable check if it was a trap
    };
  };
}

/**
 * Tumbling Escape (ID 40): Negate monster attack and teleport
 */
function createTumblingEscapeHook(): EventHook<AttackHitOnHeroEvent> {
  return (event: AttackHitOnHeroEvent): EventHookResponse => {
    // Only trigger on monster attacks (not trap/event)
    if (event.isTrapAttack || event.isEventAttack) {
      return null;
    }
    
    // Negate the attack
    return {
      preventDefault: true,
      flipPowerCard: 40,
      // Game slice will handle teleport to tile within 1 tile
    };
  };
}

/**
 * Mirror Image (ID 49): Remove charge when monster misses
 * Note: This only handles the charge removal on miss
 * The AC bonus is handled separately when the card is activated
 */
function createMirrorImageHook(): EventHook<AttackHitOnHeroEvent> {
  return (event: AttackHitOnHeroEvent): EventHookResponse => {
    // Only trigger on misses (when isHit is false in the attack result)
    if (event.attackResult.isHit) {
      return null;
    }
    
    // Signal that a Mirror Image charge should be removed
    // Game slice will handle the actual charge tracking
    return {
      // Don't flip the card - charges are tracked separately
      // Game slice will remove one charge from Mirror Image tokens
    };
  };
}

/**
 * Check if a power card has any event hooks
 */
export function powerCardHasHooks(powerCardId: number): boolean {
  return getPowerCardHooks(powerCardId).length > 0;
}

/**
 * Get all power card IDs that have event hooks
 */
export function getAllPowerCardsWithHooks(): number[] {
  return [
    10, // Perseverance
    18, // Inspiring Advice
    19, // One for the Team
    20, // To Arms!
    28, // Bravery
    31, // Furious Assault
    39, // Practiced Evasion
    40, // Tumbling Escape
    49, // Mirror Image
  ];
}
