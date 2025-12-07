import type {
  TrapState,
  HazardState,
  HeroHpState,
  HeroToken,
  DungeonState,
  Position,
} from './types';
import { getEncounterById } from './encounters';
import {
  applyDamageToHeroesOnTile,
  attackHeroesOnTile,
  findClosestHero,
  moveTowardPosition,
  spreadLavaFlow,
} from './trapsHazards';

/**
 * Result of activating traps during villain phase
 */
export interface VillainPhaseTrapResult {
  heroHp: HeroHpState[];
  traps: TrapState[];
  hazards: HazardState[];
  trapInstanceCounter: number;
  hazardInstanceCounter: number;
}

/**
 * Activate all traps during villain phase
 * Each trap triggers its effect based on its encounter card
 */
export function activateVillainPhaseTraps(
  traps: TrapState[],
  hazards: HazardState[],
  heroHp: HeroHpState[],
  heroTokens: HeroToken[],
  dungeon: DungeonState,
  trapInstanceCounter: number,
  hazardInstanceCounter: number,
  randomFn: () => number = Math.random
): VillainPhaseTrapResult {
  let updatedHp = [...heroHp];
  let updatedTraps = [...traps];
  let updatedHazards = [...hazards];
  let updatedTrapCounter = trapInstanceCounter;
  let updatedHazardCounter = hazardInstanceCounter;

  // Process each trap
  for (const trap of traps) {
    const encounter = getEncounterById(trap.encounterId);
    if (!encounter) continue;

    switch (trap.encounterId) {
      case 'lava-flow': {
        // 1. Damage heroes on lava tiles
        const allLavaPositions = updatedTraps
          .filter(t => t.encounterId === 'lava-flow')
          .map(t => t.position);
        
        for (const lavaPos of allLavaPositions) {
          updatedHp = applyDamageToHeroesOnTile(lavaPos, 1, updatedHp, heroTokens);
        }
        
        // 2. Spread to one adjacent tile (once per lava flow trap, not per tile)
        // Only spread from this specific trap
        const newLavaPos = spreadLavaFlow(trap.position, allLavaPositions, dungeon, randomFn);
        if (newLavaPos) {
          // Create new trap instance at the spread location
          const newTrap: TrapState = {
            id: `trap-${updatedTrapCounter++}`,
            encounterId: 'lava-flow',
            position: newLavaPos,
            disableDC: 10,
          };
          updatedTraps.push(newTrap);
        }
        break;
      }

      case 'poisoned-dart-trap': {
        // Attack heroes on the trap tile each villain phase
        updatedHp = attackHeroesOnTile(
          trap.position,
          8, // Attack bonus
          2, // Damage
          1, // Miss damage
          updatedHp,
          heroTokens,
          randomFn
        );
        // Note: Poisoned status effect not yet implemented
        break;
      }

      case 'rolling-boulder': {
        // 1. Move toward closest hero
        const closestHero = findClosestHero(trap.position, heroTokens);
        if (closestHero) {
          const newPosition = moveTowardPosition(trap.position, closestHero.position, dungeon);
          
          // Update trap position
          const trapIndex = updatedTraps.findIndex(t => t.id === trap.id);
          if (trapIndex >= 0) {
            updatedTraps[trapIndex] = { ...trap, position: newPosition };
          }
          
          // 2. Damage heroes on the new tile
          updatedHp = applyDamageToHeroesOnTile(newPosition, 2, updatedHp, heroTokens);
        }
        break;
      }

      case 'whirling-blades': {
        // 1. Move toward closest hero
        const closestHero = findClosestHero(trap.position, heroTokens);
        if (closestHero) {
          const newPosition = moveTowardPosition(trap.position, closestHero.position, dungeon);
          
          // Update trap position
          const trapIndex = updatedTraps.findIndex(t => t.id === trap.id);
          if (trapIndex >= 0) {
            updatedTraps[trapIndex] = { ...trap, position: newPosition };
          }
          
          // 2. Attack heroes on the new tile
          updatedHp = attackHeroesOnTile(
            newPosition,
            8, // Attack bonus
            2, // Damage
            1, // Miss damage
            updatedHp,
            heroTokens,
            randomFn
          );
        }
        break;
      }
    }
  }

  return {
    heroHp: updatedHp,
    traps: updatedTraps,
    hazards: updatedHazards,
    trapInstanceCounter: updatedTrapCounter,
    hazardInstanceCounter: updatedHazardCounter,
  };
}
