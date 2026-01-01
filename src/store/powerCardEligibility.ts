/**
 * Utility functions to determine if power cards are eligible for activation
 */

import type { PowerCard } from './powerCards';
import type { GameState } from './gameSlice';
import type { MonsterState } from './types';

/**
 * Power card IDs for reference in eligibility checks
 */
const POWER_CARD_IDS = {
  // Custom abilities
  HEALING_HYMN: 1,
  DWARVEN_RESILIENCE: 11,
  LAY_ON_HANDS: 21,
  FURIOUS_ASSAULT: 31,
  HURLED_BREATH: 41,
  
  // Daily cards that can be activated proactively
  BLADE_BARRIER: 5,
  
  // Utility cards - proactive (can be activated during hero phase)
  COMMAND: 9,
  DISTANT_DIVERSION: 38,
  INVISIBILITY: 48,
  MIRROR_IMAGE: 49,
  WIZARD_EYE: 50,
  
  // Utility cards - reactive (triggered by events)
  ASTRAL_REFUGE: 8,
  PERSEVERANCE: 10,
  INSPIRING_ADVICE: 18,
  ONE_FOR_THE_TEAM: 19,
  TO_ARMS: 20,
  BRAVERY: 28,
  NOBLE_SHIELD: 29,
  VIRTUES_TOUCH: 30,
  PRACTICED_EVASION: 39,
  TUMBLING_ESCAPE: 40,
} as const;

/**
 * Determines if a power card can be activated during the hero phase
 * based on game state and card rules.
 * 
 * @param card - The power card to check
 * @param isFlipped - Whether the card has been used
 * @param gameState - Current game state
 * @param heroId - The hero's ID
 * @param targetableMonsters - Optional array of monsters that can be targeted. If provided for attack cards,
 *                             the card is only eligible if there's at least one valid target.
 */
export function isPowerCardEligibleForActivation(
  card: PowerCard,
  isFlipped: boolean,
  gameState: GameState,
  heroId: string,
  targetableMonsters?: MonsterState[]
): boolean {
  // Can't use flipped cards
  if (isFlipped) return false;
  
  // Must be during hero phase
  if (gameState.turnState.currentPhase !== 'hero-phase') return false;
  
  // Must be the active hero's turn
  const currentHeroToken = gameState.heroTokens[gameState.turnState.currentHeroIndex];
  if (!currentHeroToken || currentHeroToken.heroId !== heroId) return false;
  
  // Attack cards can be shown as eligible in the dashboard
  // They are activated via PowerCardAttackPanel but should visually indicate availability
  if (card.attackBonus !== undefined) {
    // Attack cards are eligible during hero phase if hero can attack
    if (!(gameState.heroTurnActions?.canAttack ?? false)) {
      return false;
    }
    
    // If targetableMonsters is provided, verify there's at least one valid target
    // This ensures attack cards are only enabled when there are monsters in range
    if (targetableMonsters !== undefined) {
      return targetableMonsters.length > 0;
    }
    
    // If targetableMonsters not provided, fall back to just checking canAttack
    // (for backwards compatibility)
    return true;
  }
  
  // Check card-specific eligibility based on type and rule text
  return isCardEligibleByRule(card, gameState, heroId);
}

/**
 * Check if a card is eligible based on its specific rules
 */
function isCardEligibleByRule(
  card: PowerCard,
  gameState: GameState,
  heroId: string
): boolean {
  // Parse rule to determine when card can be used
  const rule = card.rule.toLowerCase();
  
  // Cards that specifically require "during your Hero Phase" or similar
  if (rule.includes('use this power during your hero phase')) {
    return true;
  }
  
  // Cards that require specific triggers (not activatable from dashboard)
  // These are handled by event hooks
  if (
    rule.includes('use when') ||
    rule.includes('use this power when') ||
    rule.includes('use at the start of any villain phase')
  ) {
    return false; // Reactive cards, not proactive
  }
  
  // Custom ability cards that can be used during hero phase
  if (card.isCustomAbility) {
    // Healing Hymn - during hero phase
    if (card.id === POWER_CARD_IDS.HEALING_HYMN) return true;
    // Dwarven Resilience - during hero phase instead of moving
    if (card.id === POWER_CARD_IDS.DWARVEN_RESILIENCE) return gameState.heroTurnActions.canMove;
    // Lay On Hands - utility (assume can be used during hero phase)
    if (card.id === POWER_CARD_IDS.LAY_ON_HANDS) return true;
    // Furious Assault - when you hit (reactive, not proactive)
    if (card.id === POWER_CARD_IDS.FURIOUS_ASSAULT) return false;
    // Hurled Breath - this is actually a daily attack power
    if (card.id === POWER_CARD_IDS.HURLED_BREATH) return false; // Handled by attack panel
  }
  
  // Specific utility cards that can be activated during hero phase
  switch (card.id) {
    case POWER_CARD_IDS.BLADE_BARRIER:
    case POWER_CARD_IDS.COMMAND:
    case POWER_CARD_IDS.DISTANT_DIVERSION:
    case POWER_CARD_IDS.INVISIBILITY:
    case POWER_CARD_IDS.MIRROR_IMAGE:
    case POWER_CARD_IDS.WIZARD_EYE:
      return true;
    
    // Reactive cards (not activatable from dashboard)
    case POWER_CARD_IDS.ASTRAL_REFUGE:
    case POWER_CARD_IDS.PERSEVERANCE:
    case POWER_CARD_IDS.INSPIRING_ADVICE:
    case POWER_CARD_IDS.ONE_FOR_THE_TEAM:
    case POWER_CARD_IDS.TO_ARMS:
    case POWER_CARD_IDS.BRAVERY:
    case POWER_CARD_IDS.NOBLE_SHIELD:
    case POWER_CARD_IDS.VIRTUES_TOUCH:
    case POWER_CARD_IDS.PRACTICED_EVASION:
    case POWER_CARD_IDS.TUMBLING_ESCAPE:
      return false;
  }
  
  // Default to false for safety
  return false;
}

/**
 * Get a user-friendly message explaining why a card cannot be activated
 */
export function getPowerCardIneligibilityReason(
  card: PowerCard,
  isFlipped: boolean,
  gameState: GameState,
  heroId: string,
  targetableMonsters?: MonsterState[]
): string {
  if (isFlipped) {
    return 'This power has already been used';
  }
  
  if (gameState.turnState.currentPhase !== 'hero-phase') {
    return 'Can only be used during hero phase';
  }
  
  const currentHeroToken = gameState.heroTokens[gameState.turnState.currentHeroIndex];
  if (!currentHeroToken || currentHeroToken.heroId !== heroId) {
    return 'Not your turn';
  }
  
  if (card.attackBonus !== undefined) {
    if (!gameState.heroTurnActions?.canAttack) {
      return 'You have already attacked this turn';
    }
    // Check if there are no valid targets
    if (targetableMonsters !== undefined && targetableMonsters.length === 0) {
      return 'No valid targets in range';
    }
    return 'Click to expand and select target';
  }
  
  const rule = card.rule.toLowerCase();
  if (rule.includes('use when') || rule.includes('use this power when')) {
    return 'This power activates in response to specific events';
  }
  
  if (rule.includes('use at the start of any villain phase')) {
    return 'Can only be used at start of villain phase';
  }
  
  if (card.id === POWER_CARD_IDS.DWARVEN_RESILIENCE && !gameState.heroTurnActions.canMove) {
    return 'You have already moved this turn';
  }
  
  return 'This power cannot be activated right now';
}

/**
 * Returns a highlight state for a power card
 * - 'eligible': Card can be activated now
 * - 'ineligible': Card cannot be activated (grayed out)
 * - 'disabled': Card is flipped/used
 */
export function getPowerCardHighlightState(
  card: PowerCard,
  isFlipped: boolean,
  gameState: GameState,
  heroId: string,
  targetableMonsters?: MonsterState[]
): 'eligible' | 'ineligible' | 'disabled' {
  if (isFlipped) return 'disabled';
  
  if (isPowerCardEligibleForActivation(card, isFlipped, gameState, heroId, targetableMonsters)) {
    return 'eligible';
  }
  
  return 'ineligible';
}
