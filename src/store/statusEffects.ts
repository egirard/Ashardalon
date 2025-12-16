/**
 * Status/Condition system for tracking effects on heroes and monsters.
 * This module provides types and utilities for managing status effects like
 * poisoned, dazed, slowed, etc. that can affect characters during gameplay.
 */

import type { HeroCondition } from './types';

/**
 * Status effect type - unique identifier for each status
 */
export type StatusEffectType = 
  | 'poisoned'
  | 'dazed'
  | 'slowed'
  | 'weakened'
  | 'immobilized'
  | 'stunned'
  | 'blinded'
  | 'ongoing-damage'
  // Curse types
  | 'curse-gap-in-armor'
  | 'curse-bad-luck'
  | 'curse-bloodlust'
  | 'curse-cage'
  | 'curse-dragon-fear'
  | 'curse-terrifying-roar'
  | 'curse-time-leap'
  | 'curse-wrath-of-enemy';

/**
 * Active status effect on a character (hero or monster)
 */
export interface StatusEffect {
  /** Type of status effect */
  type: StatusEffectType;
  /** Duration in turns (undefined = until removed manually) */
  duration?: number;
  /** Turn number when status was applied */
  appliedOnTurn: number;
  /** Source of the status (power card ID, monster ID, or encounter ID) */
  source: string;
  /** Additional data specific to the status (e.g., damage amount for ongoing-damage) */
  data?: {
    damage?: number;
    saveDC?: number;
  };
}

/**
 * Status effect definitions with UI display information
 */
export const STATUS_EFFECT_DEFINITIONS: Record<StatusEffectType, HeroCondition> = {
  poisoned: {
    id: 'poisoned',
    name: 'Poisoned',
    icon: '🤢',
    description: 'Taking ongoing poison damage',
  },
  dazed: {
    id: 'dazed',
    name: 'Dazed',
    icon: '😵',
    description: 'Can only take a single action on your turn',
  },
  slowed: {
    id: 'slowed',
    name: 'Slowed',
    icon: '🐌',
    description: 'Movement speed reduced by half',
  },
  weakened: {
    id: 'weakened',
    name: 'Weakened',
    icon: '💔',
    description: 'Attack damage reduced',
  },
  immobilized: {
    id: 'immobilized',
    name: 'Immobilized',
    icon: '⛓️',
    description: 'Cannot move from current position',
  },
  stunned: {
    id: 'stunned',
    name: 'Stunned',
    icon: '⚡',
    description: 'Cannot take actions',
  },
  blinded: {
    id: 'blinded',
    name: 'Blinded',
    icon: '👁️',
    description: 'Attack rolls have disadvantage',
  },
  'ongoing-damage': {
    id: 'ongoing-damage',
    name: 'Ongoing Damage',
    icon: '🔥',
    description: 'Taking damage at the start of each turn',
  },
  // Curse definitions
  'curse-gap-in-armor': {
    id: 'curse-gap-in-armor',
    name: 'A Gap in the Armor',
    icon: '🛡️',
    description: 'AC -4. Removed if hero does not move during Hero Phase.',
  },
  'curse-bad-luck': {
    id: 'curse-bad-luck',
    name: 'Bad Luck',
    icon: '🎲',
    description: 'Draw extra encounter at Villain Phase start. Roll 10+ to remove.',
  },
  'curse-bloodlust': {
    id: 'curse-bloodlust',
    name: 'Bloodlust',
    icon: '🩸',
    description: 'Take 1 damage at Hero Phase start. Removed when defeating a monster.',
  },
  'curse-cage': {
    id: 'curse-cage',
    name: 'Cage',
    icon: '⛓️',
    description: 'AC -2, cannot move. Hero on tile can Roll 10+ to remove.',
  },
  'curse-dragon-fear': {
    id: 'curse-dragon-fear',
    name: 'Dragon Fear',
    icon: '🐉',
    description: 'Take 1 damage when moving to new tile. Roll 10+ to remove.',
  },
  'curse-terrifying-roar': {
    id: 'curse-terrifying-roar',
    name: 'Terrifying Roar',
    icon: '😱',
    description: 'Attack -4 penalty. Roll 10+ to remove.',
  },
  'curse-time-leap': {
    id: 'curse-time-leap',
    name: 'Time Leap',
    icon: '⏰',
    description: 'Hero removed from play until next Hero Phase.',
  },
  'curse-wrath-of-enemy': {
    id: 'curse-wrath-of-enemy',
    name: 'Wrath of the Enemy',
    icon: '👿',
    description: 'Closest monster moves adjacent. Roll 10+ to remove.',
  },
};

/**
 * Apply a status effect to a character
 * @param existingStatuses Current status effects on the character
 * @param statusType Type of status effect to apply
 * @param source Source of the status (power card ID, monster ID, or encounter ID)
 * @param turnNumber Current game turn number
 * @param duration Optional duration in turns
 * @param data Optional additional data for the status effect
 * @returns Updated status effects array
 */
export function applyStatusEffect(
  existingStatuses: StatusEffect[],
  statusType: StatusEffectType,
  source: string,
  turnNumber: number,
  duration?: number,
  data?: StatusEffect['data']
): StatusEffect[] {
  // Check if status already exists from the same source
  const existingIndex = existingStatuses.findIndex(
    s => s.type === statusType && s.source === source
  );

  const newStatus: StatusEffect = {
    type: statusType,
    appliedOnTurn: turnNumber,
    source,
    duration,
    data,
  };

  if (existingIndex >= 0) {
    // Replace existing status from same source
    return [
      ...existingStatuses.slice(0, existingIndex),
      newStatus,
      ...existingStatuses.slice(existingIndex + 1),
    ];
  } else {
    // Add new status
    return [...existingStatuses, newStatus];
  }
}

/**
 * Remove a specific status effect
 * @param statuses Current status effects
 * @param statusType Type of status to remove
 * @returns Updated status effects array
 */
export function removeStatusEffect(
  statuses: StatusEffect[],
  statusType: StatusEffectType
): StatusEffect[] {
  return statuses.filter(s => s.type !== statusType);
}

/**
 * Remove all status effects from a character
 * @param statuses Current status effects
 * @returns Empty array
 */
export function removeAllStatusEffects(statuses: StatusEffect[]): StatusEffect[] {
  return [];
}

/**
 * Process status effects at the start of a turn (apply ongoing damage, decrement durations)
 * @param statuses Current status effects
 * @param turnNumber Current turn number
 * @returns Object with updated statuses and damage to apply
 */
export function processStatusEffectsStartOfTurn(
  statuses: StatusEffect[],
  turnNumber: number
): {
  updatedStatuses: StatusEffect[];
  ongoingDamage: number;
  poisonedDamage: number;
} {
  let ongoingDamage = 0;
  let poisonedDamage = 0;
  const updatedStatuses: StatusEffect[] = [];

  for (const status of statuses) {
    // Apply ongoing damage
    if (status.type === 'ongoing-damage' && status.data?.damage) {
      ongoingDamage += status.data.damage;
    }
    
    // Apply poisoned damage (1 damage per poisoned status)
    if (status.type === 'poisoned') {
      poisonedDamage += 1;
    }

    // Check if status should expire based on duration
    if (status.duration !== undefined) {
      const turnsElapsed = turnNumber - status.appliedOnTurn;
      if (turnsElapsed >= status.duration) {
        // Status expires, don't include it in updated statuses
        continue;
      }
    }

    // Keep this status
    updatedStatuses.push(status);
  }

  return { updatedStatuses, ongoingDamage, poisonedDamage };
}

/**
 * Check if a character has a specific status effect
 * @param statuses Current status effects
 * @param statusType Type of status to check for
 * @returns True if character has the status
 */
export function hasStatusEffect(
  statuses: StatusEffect[],
  statusType: StatusEffectType
): boolean {
  return statuses.some(s => s.type === statusType);
}

/**
 * Get UI display data for all active statuses
 * @param statuses Current status effects
 * @returns Array of HeroCondition objects for UI display
 */
export function getStatusDisplayData(statuses: StatusEffect[]): HeroCondition[] {
  return statuses.map(status => STATUS_EFFECT_DEFINITIONS[status.type]);
}

/**
 * Calculate movement speed modifier from status effects
 * @param statuses Current status effects
 * @param baseSpeed Base movement speed
 * @returns Modified movement speed
 */
export function getModifiedSpeed(statuses: StatusEffect[], baseSpeed: number): number {
  if (hasStatusEffect(statuses, 'immobilized')) {
    return 0;
  }
  
  if (hasStatusEffect(statuses, 'slowed')) {
    return Math.floor(baseSpeed / 2);
  }
  
  return baseSpeed;
}

/**
 * Calculate attack bonus modifier from status effects
 * @param statuses Current status effects
 * @param baseAttackBonus Base attack bonus
 * @returns Modified attack bonus
 */
export function getModifiedAttackBonus(
  statuses: StatusEffect[],
  baseAttackBonus: number
): number {
  let modifier = 0;
  
  if (hasStatusEffect(statuses, 'blinded')) {
    modifier -= 2;
  }
  
  return baseAttackBonus + modifier;
}

/**
 * Calculate damage modifier from status effects
 * @param statuses Current status effects
 * @param baseDamage Base damage
 * @returns Modified damage
 */
export function getModifiedDamage(statuses: StatusEffect[], baseDamage: number): number {
  if (hasStatusEffect(statuses, 'weakened')) {
    return Math.max(0, baseDamage - 1);
  }
  
  return baseDamage;
}

/**
 * Check if a character can move based on status effects
 * @param statuses Current status effects
 * @returns True if character can move
 */
export function canMove(statuses: StatusEffect[]): boolean {
  return !hasStatusEffect(statuses, 'immobilized') && 
         !hasStatusEffect(statuses, 'stunned') &&
         !hasStatusEffect(statuses, 'curse-cage');
}

/**
 * Check if a character can attack based on status effects
 * @param statuses Current status effects
 * @returns True if character can attack
 */
export function canAttack(statuses: StatusEffect[]): boolean {
  return !hasStatusEffect(statuses, 'stunned');
}

/**
 * Check if a character is limited to a single action (dazed)
 * @param statuses Current status effects
 * @returns True if character is dazed
 */
export function isDazed(statuses: StatusEffect[]): boolean {
  return hasStatusEffect(statuses, 'dazed');
}

/**
 * Check if a character has any curse active
 * @param statuses Current status effects
 * @returns True if character has any curse
 */
export function hasCurse(statuses: StatusEffect[]): boolean {
  return statuses.some(s => s.type.startsWith('curse-'));
}

/**
 * Get all active curses on a character
 * @param statuses Current status effects
 * @returns Array of curse status effects
 */
export function getCurses(statuses: StatusEffect[]): StatusEffect[] {
  return statuses.filter(s => s.type.startsWith('curse-'));
}

/**
 * Calculate AC modifier from status effects and curses
 * @param statuses Current status effects
 * @param baseAC Base armor class
 * @returns Modified AC
 */
export function getModifiedAC(statuses: StatusEffect[], baseAC: number): number {
  let modifier = 0;
  
  if (hasStatusEffect(statuses, 'curse-gap-in-armor')) {
    modifier -= 4;
  }
  
  if (hasStatusEffect(statuses, 'curse-cage')) {
    modifier -= 2;
  }
  
  return baseAC + modifier;
}

/**
 * Update attack bonus to account for curses
 * @param statuses Current status effects
 * @param baseAttackBonus Base attack bonus
 * @returns Modified attack bonus
 */
export function getModifiedAttackBonusWithCurses(
  statuses: StatusEffect[],
  baseAttackBonus: number
): number {
  let bonus = getModifiedAttackBonus(statuses, baseAttackBonus);
  
  if (hasStatusEffect(statuses, 'curse-terrifying-roar')) {
    bonus -= 4;
  }
  
  return bonus;
}

/**
 * Attempt to recover from poisoned status at end of turn
 * @param statuses Current status effects
 * @param rollResult D20 roll result (1-20)
 * @returns Object with updated statuses and success flag
 */
export function attemptPoisonRecovery(
  statuses: StatusEffect[],
  rollResult: number
): {
  updatedStatuses: StatusEffect[];
  recovered: boolean;
} {
  const success = rollResult >= 10;
  
  if (success) {
    // Remove all poisoned statuses on successful recovery
    return {
      updatedStatuses: statuses.filter(s => s.type !== 'poisoned'),
      recovered: true,
    };
  }
  
  // Keep all statuses if recovery failed
  return {
    updatedStatuses: statuses,
    recovered: false,
  };
}
