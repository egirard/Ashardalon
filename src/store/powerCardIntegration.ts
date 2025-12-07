/**
 * Integration module for power card event hooks with game state.
 * This module provides utility functions to register/unregister hooks based on
 * hero power cards and to trigger events during gameplay.
 */

import type { HeroPowerCards } from './powerCards';
import type { GameState } from './gameSlice';
import {
  type EventHookState,
  type AnyGameEvent,
  type GameEventType,
  registerEventHook,
  unregisterPowerCardHooks,
  triggerEvent,
  createEventHookState,
} from './gameEvents';
import { getPowerCardHooks } from './powerCardHooks';

/**
 * Tile dimension constants (should match values in types.ts and powerCardEffects.ts)
 */
const TILE_WIDTH = 4;
const NORMAL_TILE_HEIGHT = 4;
const START_TILE_HEIGHT = 8;

/**
 * Initialize event hook state for a new game
 */
export function initializeEventHooks(): EventHookState {
  return createEventHookState();
}

/**
 * Register all hooks for a hero's available power cards
 * This should be called when a hero's power cards are initialized
 * and whenever power cards are flipped back up (rest/extended rest)
 */
export function registerHeroPowerCardHooks(
  state: EventHookState,
  heroPowerCards: HeroPowerCards
): EventHookState {
  let newState = state;
  
  // Get all card IDs for this hero (that are not flipped)
  const availableCardIds = [
    heroPowerCards.customAbility,
    heroPowerCards.utility,
    ...heroPowerCards.atWills,
    heroPowerCards.daily,
    ...(heroPowerCards.dailyLevel2 ? [heroPowerCards.dailyLevel2] : []),
  ].filter(cardId => {
    // Only register hooks for cards that are not flipped
    const cardState = heroPowerCards.cardStates.find(s => s.cardId === cardId);
    return cardState && !cardState.isFlipped;
  });
  
  // Register hooks for each available card
  for (const cardId of availableCardIds) {
    const hooks = getPowerCardHooks(cardId);
    
    for (const { eventType, hook, priority } of hooks) {
      newState = registerEventHook(
        newState,
        eventType as GameEventType,
        hook,
        cardId,
        heroPowerCards.heroId,
        priority
      );
    }
  }
  
  return newState;
}

/**
 * Unregister all hooks for a specific power card
 * This should be called when a power card is flipped (used)
 */
export function unregisterPowerCard(
  state: EventHookState,
  powerCardId: number,
  heroId: string
): EventHookState {
  return unregisterPowerCardHooks(state, powerCardId, heroId);
}

/**
 * Register hooks for all heroes in the game
 * This should be called during game initialization
 */
export function registerAllHeroHooks(
  state: EventHookState,
  allHeroPowerCards: HeroPowerCards[]
): EventHookState {
  let newState = state;
  
  for (const heroPowerCards of allHeroPowerCards) {
    newState = registerHeroPowerCardHooks(newState, heroPowerCards);
  }
  
  return newState;
}

/**
 * Result of triggering an event that includes actions to take in game state
 */
export interface EventTriggerResult<T extends AnyGameEvent> {
  /** The potentially modified event */
  event: T;
  /** Power cards to flip (mark as used) */
  powerCardsToFlip: Array<{ powerCardId: number; heroId: string }>;
  /** Power cards to keep unflipped despite normal flip rules */
  powerCardsToKeep: Array<{ powerCardId: number; heroId: string }>;
  /** Whether any hook prevented default behavior */
  preventedDefault: boolean;
}

/**
 * Trigger an event and return actions for the game state to process
 * This is the main integration point between the event system and game slice
 */
export function triggerGameEvent<T extends AnyGameEvent>(
  hookState: EventHookState,
  event: T
): EventTriggerResult<T> {
  const result = triggerEvent(hookState, event);
  
  return {
    event: result.event,
    powerCardsToFlip: result.powerCardsToFlip,
    powerCardsToKeep: result.powerCardsToKeep,
    preventedDefault: result.preventedDefault,
  };
}

/**
 * Helper to count heroes on a specific tile
 * Used for Perseverance effect calculation
 */
export function countHeroesOnTile(
  gameState: GameState,
  tileId: string
): number {
  return gameState.heroTokens.filter(token => {
    // Get the tile ID for this hero's position
    const heroTileId = getTileIdForPosition(gameState, token.position);
    return heroTileId === tileId;
  }).length;
}

/**
 * Get the tile ID for a specific position
 * Helper function for tile-based queries
 */
function getTileIdForPosition(
  gameState: GameState,
  position: { x: number; y: number }
): string | null {
  // Implementation depends on how tiles are stored
  // For now, use a simple approach based on tile grid positions
  
  // Check start tile first
  if (position.x >= 0 && position.x < TILE_WIDTH &&
      position.y >= 0 && position.y < START_TILE_HEIGHT) {
    return 'start-tile';
  }
  
  // Find matching tile
  for (const tile of gameState.dungeon.tiles) {
    if (tile.id === 'start-tile') continue; // Already checked
    
    const tileHeight = NORMAL_TILE_HEIGHT;
    const minX = tile.position.col * TILE_WIDTH;
    const maxX = minX + TILE_WIDTH - 1;
    const minY = tile.position.row * tileHeight;
    const maxY = minY + tileHeight - 1;
    
    if (position.x >= minX && position.x <= maxX &&
        position.y >= minY && position.y <= maxY) {
      return tile.id;
    }
  }
  
  return null;
}

/**
 * Get hero ID for current active hero
 */
export function getCurrentHeroId(gameState: GameState): string {
  if (gameState.heroTokens.length === 0) {
    return '';
  }
  
  const currentIndex = gameState.turnState.currentHeroIndex;
  return gameState.heroTokens[currentIndex]?.heroId || '';
}

/**
 * Calculate modified encounter cancel cost with Perseverance effect
 * This applies the Perseverance power card's cost reduction
 * Only applies if a hero on the active hero's tile has Perseverance active
 */
export function calculateEncounterCancelCost(
  gameState: GameState,
  hookState: EventHookState,
  baseCost: number
): number {
  const currentHeroId = getCurrentHeroId(gameState);
  const currentHero = gameState.heroTokens.find(t => t.heroId === currentHeroId);
  
  if (!currentHero) {
    return baseCost;
  }
  
  const tileId = getTileIdForPosition(gameState, currentHero.position);
  if (!tileId) {
    return baseCost;
  }
  
  // Check if any hero on the tile has Perseverance (ID 10) active
  const heroesOnTile = gameState.heroTokens.filter(token => {
    const heroTileId = getTileIdForPosition(gameState, token.position);
    return heroTileId === tileId;
  });
  
  // Check if any of these heroes has Perseverance active (not flipped)
  const hasPerseveranceActive = heroesOnTile.some(hero =>
    isPowerCardHookActive(hookState, 10, hero.heroId)
  );
  
  if (!hasPerseveranceActive) {
    return baseCost;
  }
  
  // Perseverance reduces cost by number of heroes on tile (including caster)
  const heroCount = heroesOnTile.length;
  return Math.max(0, baseCost - heroCount);
}

/**
 * Check if a specific power card has active hooks registered
 */
export function isPowerCardHookActive(
  hookState: EventHookState,
  powerCardId: number,
  heroId: string
): boolean {
  return Object.values(hookState.hooks).some(
    reg => reg.powerCardId === powerCardId && reg.heroId === heroId
  );
}

/**
 * Get all active power cards with hooks for a specific hero
 */
export function getActiveHookPowerCards(
  hookState: EventHookState,
  heroId: string
): number[] {
  const cardIds = new Set<number>();
  
  for (const registration of Object.values(hookState.hooks)) {
    if (registration.heroId === heroId) {
      cardIds.add(registration.powerCardId);
    }
  }
  
  return Array.from(cardIds);
}
