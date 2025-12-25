/**
 * Utility functions to determine if power cards are eligible for activation
 */

import type { PowerCard } from './powerCards';
import type { GameState } from './gameSlice';

/**
 * Determines if a power card can be activated during the hero phase
 * based on game state and card rules.
 */
export function isPowerCardEligibleForActivation(
  card: PowerCard,
  isFlipped: boolean,
  gameState: GameState,
  heroId: string
): boolean {
  // Can't use flipped cards
  if (isFlipped) return false;
  
  // Must be during hero phase
  if (gameState.turnState.currentPhase !== 'hero-phase') return false;
  
  // Must be the active hero's turn
  const currentHeroToken = gameState.heroTokens[gameState.turnState.currentHeroIndex];
  if (!currentHeroToken || currentHeroToken.heroId !== heroId) return false;
  
  // Attack cards are handled separately by PowerCardAttackPanel
  // Only utility cards and custom abilities can be activated directly from dashboard
  if (card.attackBonus !== undefined) return false;
  
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
    // Healing Hymn (1) - during hero phase
    if (card.id === 1) return true;
    // Dwarven Resilience (11) - during hero phase instead of moving
    if (card.id === 11) return gameState.heroTurnActions.canMove;
    // Lay On Hands (21) - utility (assume can be used during hero phase)
    if (card.id === 21) return true;
    // Furious Assault (31) - when you hit (reactive, not proactive)
    if (card.id === 31) return false;
    // Hurled Breath (41) - this is actually a daily attack power
    if (card.id === 41) return false; // Handled by attack panel
  }
  
  // Specific utility cards that can be activated during hero phase
  switch (card.id) {
    case 9:  // Command - during hero phase
    case 38: // Distant Diversion - during hero phase (implied)
    case 48: // Invisibility - during hero phase
    case 49: // Mirror Image - during hero phase
    case 50: // Wizard Eye - during hero phase
      return true;
    
    // Reactive cards (not activatable from dashboard)
    case 8:  // Astral Refuge - at start of villain phase
    case 10: // Perseverance - when encounter drawn
    case 18: // Inspiring Advice - when hero misses
    case 19: // One for the Team - when encounter drawn
    case 20: // To Arms! - when monster placed
    case 28: // Bravery - when monster activates
    case 29: // Noble Shield - when attacked
    case 30: // Virtue's Touch - during hero phase (but needs adjacent hero)
    case 39: // Practiced Evasion - when hit by trap
    case 40: // Tumbling Escape - when monster hits
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
  heroId: string
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
    return 'Use the attack panel to activate attack powers';
  }
  
  const rule = card.rule.toLowerCase();
  if (rule.includes('use when') || rule.includes('use this power when')) {
    return 'This power activates in response to specific events';
  }
  
  if (rule.includes('use at the start of any villain phase')) {
    return 'Can only be used at start of villain phase';
  }
  
  if (card.id === 11 && !gameState.heroTurnActions.canMove) {
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
  heroId: string
): 'eligible' | 'ineligible' | 'disabled' {
  if (isFlipped) return 'disabled';
  
  if (isPowerCardEligibleForActivation(card, isFlipped, gameState, heroId)) {
    return 'eligible';
  }
  
  return 'ineligible';
}
