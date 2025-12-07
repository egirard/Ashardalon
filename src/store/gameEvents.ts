/**
 * Game event system for triggering power card effects and other conditional logic.
 * This system allows power cards to register hooks that respond to game events like
 * attacks, encounters, monster spawns, etc.
 */

import type { AttackResult, Position } from './types';

/**
 * Types of game events that can trigger power card effects
 */
export type GameEventType =
  | 'encounter-draw'        // When an encounter card is drawn
  | 'attack-miss'          // When a hero's attack misses
  | 'attack-hit-by-hero'   // When a hero hits with an attack
  | 'attack-hit-on-hero'   // When a hero is hit by an attack
  | 'monster-spawn'        // When a monster is placed on the board
  | 'monster-activation'   // When a monster activates during villain phase
  | 'hero-phase-start'     // At the start of a hero's turn
  | 'hero-phase-end'       // At the end of a hero's turn
  | 'villain-phase-start'  // At the start of villain phase
  | 'exploration-phase-end'; // At the end of exploration phase

/**
 * Base interface for all game events
 */
export interface GameEvent {
  type: GameEventType;
  /** ID of the active/triggering hero */
  heroId: string;
  /** Game turn number when event occurred */
  turnNumber: number;
}

/**
 * Event fired when an encounter card is drawn
 */
export interface EncounterDrawEvent extends GameEvent {
  type: 'encounter-draw';
  /** The encounter card ID that was drawn */
  encounterId: string;
  /** Current XP available for canceling */
  currentXp: number;
  /** Base cost to cancel the encounter (5 XP) */
  baseCancelCost: number;
}

/**
 * Event fired when a hero's attack misses a monster
 */
export interface AttackMissEvent extends GameEvent {
  type: 'attack-miss';
  /** ID of the hero who missed */
  attackerId: string;
  /** Instance ID of the monster that was targeted */
  targetMonsterId: string;
  /** The attack result */
  attackResult: AttackResult;
  /** Power card ID used for the attack, if any */
  powerCardId?: number;
}

/**
 * Event fired when a hero successfully hits with an attack
 */
export interface AttackHitByHeroEvent extends GameEvent {
  type: 'attack-hit-by-hero';
  /** ID of the hero who hit */
  attackerId: string;
  /** Instance ID of the monster that was hit */
  targetMonsterId: string;
  /** The attack result */
  attackResult: AttackResult;
  /** Damage dealt (can be modified by hooks) */
  damage: number;
  /** Power card ID used for the attack, if any */
  powerCardId?: number;
}

/**
 * Event fired when a hero is hit by an attack (monster or trap)
 */
export interface AttackHitOnHeroEvent extends GameEvent {
  type: 'attack-hit-on-hero';
  /** ID of the hero who was hit */
  targetHeroId: string;
  /** Instance ID of the monster attacker, if applicable */
  attackerMonsterId?: string;
  /** Encounter card ID if attack was from trap/event */
  encounterCardId?: string;
  /** The attack result */
  attackResult: AttackResult;
  /** Whether this was a trap attack */
  isTrapAttack?: boolean;
  /** Whether this was an event attack */
  isEventAttack?: boolean;
  /** IDs of all heroes targeted by this attack (for multi-target attacks) */
  allTargetHeroIds: string[];
}

/**
 * Event fired when a monster is spawned/placed on the board
 */
export interface MonsterSpawnEvent extends GameEvent {
  type: 'monster-spawn';
  /** Instance ID of the monster that was spawned */
  monsterInstanceId: string;
  /** Monster type ID */
  monsterId: string;
  /** Position where monster was placed */
  position: Position;
  /** Tile ID where monster was placed */
  tileId: string;
}

/**
 * Event fired when a monster activates during villain phase
 */
export interface MonsterActivationEvent extends GameEvent {
  type: 'monster-activation';
  /** Instance ID of the monster activating */
  monsterInstanceId: string;
  /** Monster type ID */
  monsterId: string;
  /** Position of the monster */
  position: Position;
  /** ID of the hero who controls this monster */
  controllerId: string;
}

/**
 * Event fired at the start of a hero's turn
 */
export interface HeroPhaseStartEvent extends GameEvent {
  type: 'hero-phase-start';
}

/**
 * Event fired at the end of a hero's turn
 */
export interface HeroPhaseEndEvent extends GameEvent {
  type: 'hero-phase-end';
}

/**
 * Event fired at the start of villain phase
 */
export interface VillainPhaseStartEvent extends GameEvent {
  type: 'villain-phase-start';
}

/**
 * Event fired at the end of exploration phase
 */
export interface ExplorationPhaseEndEvent extends GameEvent {
  type: 'exploration-phase-end';
}

/**
 * Union type of all possible game events
 */
export type AnyGameEvent =
  | EncounterDrawEvent
  | AttackMissEvent
  | AttackHitByHeroEvent
  | AttackHitOnHeroEvent
  | MonsterSpawnEvent
  | MonsterActivationEvent
  | HeroPhaseStartEvent
  | HeroPhaseEndEvent
  | VillainPhaseStartEvent
  | ExplorationPhaseEndEvent;

/**
 * Response from an event hook indicating what action to take
 */
export interface EventHookResponse {
  /** Whether this hook handled the event and should prevent default behavior */
  preventDefault?: boolean;
  /** Whether to stop processing additional hooks for this event */
  stopPropagation?: boolean;
  /** Modified event data to pass to subsequent hooks */
  modifiedEvent?: Partial<AnyGameEvent>;
  /** Power card ID that should be flipped (used) */
  flipPowerCard?: number;
  /** Whether the power card should NOT be flipped even if it normally would */
  keepPowerCard?: boolean;
}

/**
 * Type for event hook functions
 */
export type EventHook<T extends AnyGameEvent = AnyGameEvent> = (
  event: T
) => EventHookResponse | null;

/**
 * Hook registration entry
 */
export interface HookRegistration {
  /** Unique ID for this hook registration */
  id: string;
  /** Type of event this hook responds to */
  eventType: GameEventType;
  /** The hook function */
  hook: EventHook;
  /** Power card ID that registered this hook */
  powerCardId: number;
  /** Hero ID who owns the power card */
  heroId: string;
  /** Priority for execution order (higher = earlier, default 0) */
  priority?: number;
}

/**
 * State for managing event hooks
 */
export interface EventHookState {
  /** All registered hooks, keyed by hook ID */
  hooks: Record<string, HookRegistration>;
  /** Counter for generating unique hook IDs */
  hookIdCounter: number;
}

/**
 * Create initial event hook state
 */
export function createEventHookState(): EventHookState {
  return {
    hooks: {},
    hookIdCounter: 0,
  };
}

/**
 * Register a new event hook
 */
export function registerEventHook(
  state: EventHookState,
  eventType: GameEventType,
  hook: EventHook,
  powerCardId: number,
  heroId: string,
  priority: number = 0
): EventHookState {
  const hookId = `hook-${state.hookIdCounter}`;
  
  return {
    ...state,
    hooks: {
      ...state.hooks,
      [hookId]: {
        id: hookId,
        eventType,
        hook,
        powerCardId,
        heroId,
        priority,
      },
    },
    hookIdCounter: state.hookIdCounter + 1,
  };
}

/**
 * Unregister an event hook by ID
 */
export function unregisterEventHook(
  state: EventHookState,
  hookId: string
): EventHookState {
  const { [hookId]: removed, ...remainingHooks } = state.hooks;
  
  return {
    ...state,
    hooks: remainingHooks,
  };
}

/**
 * Unregister all hooks for a specific power card
 */
export function unregisterPowerCardHooks(
  state: EventHookState,
  powerCardId: number,
  heroId: string
): EventHookState {
  const remainingHooks = Object.entries(state.hooks)
    .filter(([_, reg]) => !(reg.powerCardId === powerCardId && reg.heroId === heroId))
    .reduce((acc, [id, reg]) => ({ ...acc, [id]: reg }), {});
  
  return {
    ...state,
    hooks: remainingHooks,
  };
}

/**
 * Get all hooks registered for a specific event type, sorted by priority
 */
export function getHooksForEvent(
  state: EventHookState,
  eventType: GameEventType
): HookRegistration[] {
  return Object.values(state.hooks)
    .filter(reg => reg.eventType === eventType)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

/**
 * Trigger an event and execute all registered hooks
 * Returns the potentially modified event and list of power cards to flip
 */
export function triggerEvent<T extends AnyGameEvent>(
  state: EventHookState,
  event: T
): {
  event: T;
  powerCardsToFlip: Array<{ powerCardId: number; heroId: string }>;
  powerCardsToKeep: Array<{ powerCardId: number; heroId: string }>;
  preventedDefault: boolean;
} {
  const hooks = getHooksForEvent(state, event.type);
  let currentEvent = { ...event };
  const powerCardsToFlip: Array<{ powerCardId: number; heroId: string }> = [];
  const powerCardsToKeep: Array<{ powerCardId: number; heroId: string }> = [];
  let preventedDefault = false;
  
  for (const registration of hooks) {
    const response = registration.hook(currentEvent);
    
    if (!response) continue;
    
    // Track if any hook prevented default
    if (response.preventDefault) {
      preventedDefault = true;
    }
    
    // Track power cards to flip
    if (response.flipPowerCard !== undefined) {
      powerCardsToFlip.push({
        powerCardId: response.flipPowerCard,
        heroId: registration.heroId,
      });
    }
    
    // Track power cards to keep unflipped
    if (response.keepPowerCard) {
      powerCardsToKeep.push({
        powerCardId: registration.powerCardId,
        heroId: registration.heroId,
      });
    }
    
    // Apply event modifications for subsequent hooks
    if (response.modifiedEvent) {
      currentEvent = { ...currentEvent, ...response.modifiedEvent } as T;
    }
    
    // Stop processing if requested
    if (response.stopPropagation) {
      break;
    }
  }
  
  return {
    event: currentEvent,
    powerCardsToFlip,
    powerCardsToKeep,
    preventedDefault,
  };
}

/**
 * Check if any hooks are registered for a specific event type
 */
export function hasHooksForEvent(
  state: EventHookState,
  eventType: GameEventType
): boolean {
  return Object.values(state.hooks).some(reg => reg.eventType === eventType);
}

/**
 * Clear all hooks (useful for game reset)
 */
export function clearAllHooks(state: EventHookState): EventHookState {
  return {
    ...state,
    hooks: {},
  };
}
