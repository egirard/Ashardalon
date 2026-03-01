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
import type { PersistentModifier, Position, ScenarioState } from './types';
import type { DeckSetupConfig, ScenarioDefinition, ScenarioHookDefinition, WinCondition, LossCondition } from './scenarios';
import { shuffleArray } from './exploration';
import {
  registerEventHook,
  type EventHookState,
  type EventHook,
  type EventHookResponse,
  type VillainPhaseStartEvent,
  type ChamberRevealEvent,
  type AttackMissEvent,
  type HeroPhaseEndEvent,
  type EncounterDrawEvent,
} from './gameEvents';

/**
 * Sentinel power card ID used for scenario hooks.
 * Using -1 ensures scenario hooks are never confused with real power cards
 * and are never unregistered by the power card flip mechanism.
 */
export const SCENARIO_HOOK_POWER_CARD_ID = -1;

/**
 * Sentinel hero ID used for scenario hooks.
 */
export const SCENARIO_HOOK_HERO_ID = 'scenario';

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

// ---------------------------------------------------------------------------
// Scenario hook handler factories
// Each factory returns an EventHook function for the given scenario rule.
// Priority 100+ is used for scenario hooks so they evaluate after power cards (0-99).
// ---------------------------------------------------------------------------

/**
 * Adventure 14: The Creeping Void
 *
 * At the start of each Villain Phase, if no hero is adjacent to another hero,
 * the active player draws an additional Encounter Card.
 *
 * Two heroes are "adjacent" if they are on the same tile.
 */
export function createCreepingVoidHandler(): EventHook<VillainPhaseStartEvent> {
  return (event: VillainPhaseStartEvent): EventHookResponse | null => {
    const positions = event.heroPositions;
    if (!positions || positions.length <= 1) {
      // 0 or 1 hero: no adjacency possible — trigger the extra encounter
      return { drawExtraEncounter: true };
    }

    // Check if any two heroes share the same tile position
    const anyAdjacent = areHeroesAdjacent(positions);
    if (anyAdjacent) {
      return null; // heroes are together — no extra encounter
    }
    return { drawExtraEncounter: true };
  };
}

/**
 * Adventure 14: Daze All Heroes (Obsidian Sanctum chamber reveal effect)
 *
 * When the Chamber Entrance tile is placed, all heroes are Dazed for 1 turn.
 */
export function createDazeAllHeroesHandler(): EventHook<ChamberRevealEvent> {
  return (event: ChamberRevealEvent): EventHookResponse | null => {
    const statusEffects = event.heroIds.map(heroId => ({
      heroId,
      statusType: 'dazed' as const,
      duration: 1,
    }));
    return { applyHeroStatusEffects: statusEffects };
  };
}

/**
 * Adventure 14 (post-chamber-reveal): Reflect Natural One
 *
 * After the Obsidian Sanctum is revealed, if a hero rolls a natural 1 on an
 * attack, the void reflects the strike and deals 1 damage to that hero.
 *
 * This hook is registered dynamically when chamber-reveal fires; it is NOT
 * listed in the scenario's static eventHooks array.
 */
export function createReflectNaturalOneHandler(): EventHook<AttackMissEvent> {
  return (event: AttackMissEvent): EventHookResponse | null => {
    if (event.attackResult.roll !== 1) {
      return null;
    }
    return {
      dealDamageToHero: {
        heroId: event.attackerId,
        damage: 1,
        reason: 'The void reflects your strike',
      },
    };
  };
}

/**
 * Adventure 15: Heat Exhaustion
 *
 * At the end of a hero's turn, if they are on a tile with the 'volcanic-vent'
 * terrain feature, roll a d6 (provided via event or defaulting to Math.random).
 * On a result of 5 or lower, the hero gains the Slowed condition for 1 turn.
 *
 * @param randomFn Random number generator (injected for testability)
 */
export function createHeatExhaustionHandler(
  randomFn: () => number = Math.random
): EventHook<HeroPhaseEndEvent> {
  return (event: HeroPhaseEndEvent): EventHookResponse | null => {
    const features = event.currentTileFeatures ?? [];
    if (!features.includes('volcanic-vent')) {
      return null;
    }
    const roll = Math.floor(randomFn() * 6) + 1; // d6: 1–6
    if (roll > 5) {
      return null; // rolled a 6 — hero resists the heat
    }
    return {
      applyHeroStatusEffects: [{
        heroId: event.heroId,
        statusType: 'slowed' as const,
        duration: 1,
      }],
    };
  };
}

/**
 * Adventure 15: Automated Defense
 *
 * When a Trap encounter card is drawn, check the active hero's current tile:
 * - If no Blade Trap token is present, place one (placeTrapToken: true).
 * - If a Blade Trap is already present, deal 1 damage to the active hero instead.
 */
export function createAutomatedDefenseHandler(): EventHook<EncounterDrawEvent> {
  return (event: EncounterDrawEvent): EventHookResponse | null => {
    const keywords = event.encounterKeywords ?? [];
    if (!keywords.includes('trap')) {
      return null;
    }
    if (event.hasExistingTrapOnTile) {
      return {
        dealDamageToHero: {
          heroId: event.heroId,
          damage: 1,
          reason: 'Automated Defense: stacking trap deals 1 damage',
        },
        preventDefault: true, // absorb the trap encounter — no standard placement
      };
    }
    return {
      placeTrapToken: true,
      preventDefault: true, // absorb the trap encounter — token is placed instead
    };
  };
}

/**
 * Adventure 15: The Forge Awakens (Infernal Workshop chamber reveal effect)
 *
 * When the Chamber Entrance is revealed, activate the workshop's aura:
 * - All heroes' Daily Powers deal +1 damage.
 * - All monsters gain +2 AC.
 * - Monster spawns from this encounter are doubled.
 */
export function createForgeAwakensHandler(): EventHook<ChamberRevealEvent> {
  return (_event: ChamberRevealEvent): EventHookResponse | null => {
    const modifiers: PersistentModifier[] = [
      { type: 'hero-daily-damage-bonus', bonus: 1 },
      { type: 'monster-ac-bonus', bonus: 2 },
    ];
    return {
      activatePersistentModifiers: modifiers,
      monsterSpawnMultiplier: 2,
    };
  };
}

// ---------------------------------------------------------------------------
// Handler registry
// Maps handlerId strings (from ScenarioHookDefinition) to factory functions.
// ---------------------------------------------------------------------------

type HandlerFactory = (config?: Record<string, unknown>) => EventHook;

const SCENARIO_HANDLER_REGISTRY: Record<string, HandlerFactory> = {
  'creeping-void': () => createCreepingVoidHandler(),
  'daze-all-heroes': () => createDazeAllHeroesHandler(),
  'heat-exhaustion': () => createHeatExhaustionHandler(),
  'automated-defense': () => createAutomatedDefenseHandler(),
  'forge-awakens': () => createForgeAwakensHandler(),
};

/**
 * Register all scenario-scoped event hooks from a ScenarioDefinition into the
 * existing EventHookState. Returns the updated hook state.
 *
 * Scenario hooks use a well-known sentinel powerCardId (-1) and heroId
 * ('scenario') so they are never confused with power card hooks and are never
 * unregistered by the flip mechanism.
 */
export function registerScenarioHooks(
  definition: ScenarioDefinition,
  hookState: EventHookState
): EventHookState {
  let state = hookState;
  for (const hookDef of definition.eventHooks ?? []) {
    const factory = SCENARIO_HANDLER_REGISTRY[hookDef.handlerId];
    if (!factory) {
      // Unknown handler — skip gracefully
      continue;
    }
    const hook = factory(hookDef.config);
    state = registerEventHook(
      state,
      hookDef.eventType as import('./gameEvents').GameEventType,
      hook,
      SCENARIO_HOOK_POWER_CARD_ID,
      SCENARIO_HOOK_HERO_ID,
      100 // scenario hooks run at priority 100, above power cards (0–99)
    );
  }
  return state;
}

/**
 * Register a single dynamic scenario hook (not listed in the static definition).
 * Used for effects that are triggered mid-game (e.g. reflect-natural-one
 * registers itself when chamber-reveal fires).
 */
export function registerDynamicScenarioHook(
  hookState: EventHookState,
  eventType: import('./gameEvents').GameEventType,
  hook: EventHook,
  priority: number = 100
): EventHookState {
  return registerEventHook(
    hookState,
    eventType,
    hook,
    SCENARIO_HOOK_POWER_CARD_ID,
    SCENARIO_HOOK_HERO_ID,
    priority
  );
}

// ---------------------------------------------------------------------------
// Win / Loss condition evaluation
// ---------------------------------------------------------------------------

/**
 * State snapshot needed for evaluating win/loss conditions.
 * Extracted from the full Redux game state to keep this module pure.
 */
export interface ConditionEvalContext {
  scenario: ScenarioState;
  /** True if the villain has been defeated (currentHp === 0) */
  villainDefeated: boolean;
  /** True if the tile deck is empty */
  tileDeckEmpty: boolean;
  /** True if all heroes are at 0 HP and there are no healing surges left */
  allHeroesDefeated: boolean;
}

/**
 * Evaluate win conditions for a scenario.
 * Returns the matched win condition or null if none are satisfied.
 */
export function evaluateWinConditions(
  ctx: ConditionEvalContext,
  winConditions: WinCondition[]
): WinCondition | null {
  for (const condition of winConditions) {
    switch (condition.type) {
      case 'defeat-villain':
        if (ctx.villainDefeated) {
          return condition;
        }
        break;
      case 'defeat-n-monsters':
        if (ctx.scenario.monstersDefeated >= condition.count) {
          return condition;
        }
        break;
    }
  }
  return null;
}

/**
 * Evaluate loss conditions for a scenario.
 * Returns the matched loss condition or null if none are satisfied.
 */
export function evaluateLossConditions(
  ctx: ConditionEvalContext,
  lossConditions: LossCondition[]
): LossCondition | null {
  for (const condition of lossConditions) {
    switch (condition.type) {
      case 'hero-defeated-no-surges':
        if (ctx.allHeroesDefeated) {
          return condition;
        }
        break;
      case 'tile-deck-exhausted-before-chamber':
        if (ctx.tileDeckEmpty && !ctx.scenario.chamberRevealed) {
          return condition;
        }
        break;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Persistent modifier helpers
// ---------------------------------------------------------------------------

/**
 * Get the hero daily power damage bonus from active persistent modifiers.
 * Returns 0 if no bonus modifier is active.
 */
export function getHeroDailyDamageBonus(modifiers: PersistentModifier[]): number {
  let total = 0;
  for (const m of modifiers) {
    if (m.type === 'hero-daily-damage-bonus') {
      total += m.bonus;
    }
  }
  return total;
}

/**
 * Get the monster AC bonus from active persistent modifiers.
 * Returns 0 if no bonus modifier is active.
 */
export function getMonsterAcBonus(modifiers: PersistentModifier[]): number {
  let total = 0;
  for (const m of modifiers) {
    if (m.type === 'monster-ac-bonus') {
      total += m.bonus;
    }
  }
  return total;
}

/**
 * Check if the reflect-natural-one modifier is active.
 */
export function hasReflectNaturalOne(modifiers: PersistentModifier[]): boolean {
  return modifiers.some(m => m.type === 'reflect-natural-one');
}

// ---------------------------------------------------------------------------
// Position helpers
// ---------------------------------------------------------------------------

/**
 * Check if any two heroes in the provided positions list are "adjacent" —
 * defined as being within 1 Chebyshev distance step of each other
 * (i.e. dx ≤ 1 AND dy ≤ 1 in global board coordinates).
 */
export function areHeroesAdjacent(
  positions: Array<{ heroId: string; position: Position }>
): boolean {
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const a = positions[i].position;
      const b = positions[j].position;
      const dx = Math.abs(a.x - b.x);
      const dy = Math.abs(a.y - b.y);
      if (dx <= 1 && dy <= 1) {
        return true;
      }
    }
  }
  return false;
}
