/**
 * Scenario Engine
 *
 * A collection of pure functions for scenario-specific game mechanics.
 * Contains no Redux state — consistent with the existing pattern in
 * combat.ts, exploration.ts, etc.
 *
 * See docs/scenario_design.md for the full architecture description.
 */

import { CHAMBER_ENTRANCE_TILE_ID } from './types';
import type { DeckSetupConfig } from './scenarios';
import { shuffleArray } from './exploration';

/**
 * Build a scenario-specific dungeon tile deck.
 *
 * Algorithm:
 * 1. Shuffle all regular tiles.
 * 2. Take the first `config.miniStackSize` tiles as the mini-stack (drawn first).
 * 3. Split the remaining tiles; insert the Chamber Entrance tile at
 *    `config.chamberEntrancePosition` positions from the TOP of the remainder
 *    (position 0 = immediately after the mini-stack, which is the standard for
 *    Adventures 14 and 15).
 * 4. The final draw order is: mini-stack tiles → (0..N-1 remainder) → CHAMBER_ENTRANCE → rest.
 *
 * @param tiles       All regular dungeon tile IDs (must NOT include the chamber entrance).
 * @param config      Deck setup configuration from the scenario definition.
 * @param randomFn    Random number generator (defaults to Math.random).
 * @returns           Ordered tile deck with the Chamber Entrance at the correct position.
 */
export function applyDeckSetup(
  tiles: string[],
  config: DeckSetupConfig,
  randomFn: () => number = Math.random
): string[] {
  const shuffled = shuffleArray(tiles, randomFn);
  const miniStack = shuffled.slice(0, config.miniStackSize);
  const remainder = shuffled.slice(config.miniStackSize);
  // Insert chamber entrance at chamberEntrancePosition tiles into the remainder
  // (position 0 = directly after the mini-stack)
  const insertAt = config.chamberEntrancePosition;
  return [
    ...miniStack,
    ...remainder.slice(0, insertAt),
    CHAMBER_ENTRANCE_TILE_ID,
    ...remainder.slice(insertAt),
  ];
}
