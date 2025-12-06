import type { EncounterDeck, EncounterCard, TurnState, HeroHpState, PartyResources, DungeonState, PlacedTile } from './types';
import { ENCOUNTER_CARDS, INITIAL_ENCOUNTER_DECK, ENCOUNTER_CANCEL_COST } from './types';

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
export function shuffleArray<T>(
  array: T[],
  randomFn: () => number = Math.random
): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Initialize the encounter deck with shuffled encounters
 */
export function initializeEncounterDeck(
  randomFn: () => number = Math.random
): EncounterDeck {
  return {
    drawPile: shuffleArray([...INITIAL_ENCOUNTER_DECK], randomFn),
    discardPile: [],
  };
}

/**
 * Draw an encounter from the deck
 * If the draw pile is empty, shuffle the discard pile to form a new draw pile
 */
export function drawEncounter(
  deck: EncounterDeck,
  randomFn: () => number = Math.random
): { encounterId: string | null; deck: EncounterDeck } {
  // If draw pile is empty, reshuffle discard pile
  if (deck.drawPile.length === 0) {
    if (deck.discardPile.length === 0) {
      return { encounterId: null, deck };
    }
    
    // Reshuffle discard pile into draw pile
    const reshuffled = shuffleArray(deck.discardPile, randomFn);
    return {
      encounterId: reshuffled[0],
      deck: {
        drawPile: reshuffled.slice(1),
        discardPile: [],
      },
    };
  }
  
  const [encounterId, ...remainingDraw] = deck.drawPile;
  return {
    encounterId,
    deck: {
      drawPile: remainingDraw,
      discardPile: deck.discardPile,
    },
  };
}

/**
 * Discard an encounter card to the discard pile
 */
export function discardEncounter(
  deck: EncounterDeck,
  encounterId: string
): EncounterDeck {
  return {
    drawPile: deck.drawPile,
    discardPile: [...deck.discardPile, encounterId],
  };
}

/**
 * Get encounter card definition by ID
 */
export function getEncounterById(encounterId: string): EncounterCard | undefined {
  return ENCOUNTER_CARDS.find(e => e.id === encounterId);
}

/**
 * Check if an encounter should be drawn this turn
 * Encounters are drawn when:
 * - No tile was placed (no exploration), OR
 * - At least one black arrow tile was placed (black tiles trigger encounters)
 * 
 * Encounters are NOT drawn when:
 * - Only white arrow tiles were placed this turn
 */
export function shouldDrawEncounter(turnState: TurnState): boolean {
  // If only white tiles were drawn, no encounter
  if (turnState.drewOnlyWhiteTilesThisTurn) {
    return false;
  }
  // Otherwise, draw encounter (either no exploration or black tile was drawn)
  return true;
}

/**
 * Check if an encounter can be cancelled by spending XP
 * Requires at least ENCOUNTER_CANCEL_COST (5) XP
 * @param resources - The party's current resources including XP and healing surges
 * @returns true if party has enough XP to cancel an encounter
 */
export function canCancelEncounter(resources: PartyResources): boolean {
  return resources.xp >= ENCOUNTER_CANCEL_COST;
}

/**
 * Cancel an encounter by spending XP
 * Deducts ENCOUNTER_CANCEL_COST (5) XP and discards the encounter card
 * @param encounter - The encounter card to cancel
 * @param resources - The party's current resources
 * @param encounterDeck - The current state of the encounter deck
 * @returns Updated resources (with XP deducted) and encounter deck (with card discarded)
 */
export function cancelEncounter(
  encounter: EncounterCard,
  resources: PartyResources,
  encounterDeck: EncounterDeck
): { resources: PartyResources; encounterDeck: EncounterDeck } {
  return {
    resources: {
      ...resources,
      xp: resources.xp - ENCOUNTER_CANCEL_COST,
    },
    encounterDeck: {
      ...encounterDeck,
      discardPile: [...encounterDeck.discardPile, encounter.id],
    },
  };
}

/**
 * Apply damage to a single hero
 */
export function applyDamageToHero(
  heroHp: HeroHpState,
  damage: number
): HeroHpState {
  return {
    ...heroHp,
    currentHp: Math.max(0, heroHp.currentHp - damage),
  };
}

/**
 * Apply damage to all heroes
 */
export function applyDamageToAllHeroes(
  heroHpList: HeroHpState[],
  damage: number
): HeroHpState[] {
  return heroHpList.map(hp => applyDamageToHero(hp, damage));
}

/**
 * Check if an encounter card is an environment card
 */
export function isEnvironmentCard(encounter: EncounterCard): boolean {
  return encounter.type === 'environment';
}

/**
 * Activate an environment card
 * If an environment is already active, it is replaced by the new one
 * Returns the new active environment ID
 */
export function activateEnvironment(
  encounterId: string,
  currentEnvironmentId: string | null
): string {
  // New environment replaces any existing one
  return encounterId;
}

/**
 * Get the active environment card by ID
 */
export function getActiveEnvironment(environmentId: string | null): EncounterCard | null {
  if (!environmentId) {
    return null;
  }
  return getEncounterById(environmentId) ?? null;
}

/**
 * Resolve an encounter effect
 * Returns updated hero HP states
 * 
 * Currently implemented effects:
 * - damage (active-hero): Deals damage to the current hero
 * - damage (all-heroes): Deals damage to all heroes
 * - damage (heroes-on-tile): Deals damage to all heroes (treated as all-heroes for now)
 * - attack: Makes attack roll vs AC and deals damage on hit
 * - environment: Persistent global effect (now tracked in game state)
 * 
 * Not yet implemented effects (will log a warning):
 * - curse: Persistent hero debuff
 * - trap: Persistent trap with trigger
 * - hazard: Hazard marker placement
 * - special: Complex effect requiring UI interaction
 */
export function resolveEncounterEffect(
  encounter: EncounterCard,
  heroHpList: HeroHpState[],
  activeHeroId: string,
  randomFn: () => number = Math.random
): HeroHpState[] {
  const effect = encounter.effect;
  
  switch (effect.type) {
    case 'damage': {
      if (effect.target === 'active-hero') {
        // Apply damage to active hero only
        return heroHpList.map(hp => {
          if (hp.heroId === activeHeroId) {
            return applyDamageToHero(hp, effect.amount);
          }
          return hp;
        });
      } else {
        // Apply damage to all heroes (covers 'all-heroes' and 'heroes-on-tile')
        return applyDamageToAllHeroes(heroHpList, effect.amount);
      }
    }
    
    case 'attack': {
      // Make attack rolls against heroes
      // Note: Status effects (dazed, poisoned) are NOT YET IMPLEMENTED
      if (effect.statusEffect) {
        console.warn(`Status effect '${effect.statusEffect}' from '${encounter.name}' is not yet implemented`);
      }
      
      const getTargetHeroes = (): string[] => {
        switch (effect.target) {
          case 'active-hero':
            return [activeHeroId];
          case 'all-heroes':
          case 'heroes-on-tile':
          case 'heroes-within-1-tile':
            // TODO: Implement proper tile-based targeting for 'heroes-on-tile' and 'heroes-within-1-tile'
            // This would require passing hero positions and tile information to the resolver.
            // For now, treat all area targets as all heroes (conservative approach that ensures
            // no heroes are unfairly spared from attacks that should hit them).
            return heroHpList.map(h => h.heroId);
          default:
            return [activeHeroId];
        }
      };
      
      const targetHeroIds = getTargetHeroes();
      
      return heroHpList.map(hp => {
        if (!targetHeroIds.includes(hp.heroId)) {
          return hp;
        }
        
        // Roll attack (d20 + attack bonus vs AC)
        // Note: randomFn must return values in [0, 1) range to produce valid d20 rolls (1-20)
        const roll = Math.floor(randomFn() * 20) + 1;
        const total = roll + effect.attackBonus;
        const isHit = total >= hp.ac;
        
        if (isHit) {
          return applyDamageToHero(hp, effect.damage);
        } else if (effect.missDamage !== undefined && effect.missDamage > 0) {
          return applyDamageToHero(hp, effect.missDamage);
        }
        return hp;
      });
    }
    
    case 'environment':
      // Environment effects are tracked in game state and applied at appropriate phases
      // No immediate effect on hero HP during encounter resolution
      return heroHpList;
      
    case 'curse':
      // Curse effects are NOT YET IMPLEMENTED
      // Would need to track curse duration on heroes
      console.warn(`Curse effect '${encounter.name}' is not yet implemented`);
      return heroHpList;
      
    case 'trap':
      // Trap effects are NOT YET IMPLEMENTED  
      // Would need persistent trap state and villain phase triggers
      console.warn(`Trap effect '${encounter.name}' is not yet implemented`);
      return heroHpList;
      
    case 'hazard':
      // Hazard effects are NOT YET IMPLEMENTED
      // Would need hazard marker placement and ongoing effects
      console.warn(`Hazard effect '${encounter.name}' is not yet implemented`);
      return heroHpList;
      
    case 'special':
      // Special effects are NOT YET IMPLEMENTED
      // Would need complex UI interactions (tile placement, monster spawning, etc.)
      console.warn(`Special effect '${encounter.name}' is not yet implemented`);
      return heroHpList;
      
    default:
      return heroHpList;
  }
}

/**
 * Apply environment effects at the end of Hero Phase
 * Returns updated hero HP states after applying any environment effects
 * 
 * Environment effects that trigger at end of Hero Phase:
 * - Hidden Snipers: Active hero takes 1 damage if ending phase alone on tile
 * - Walls of Magma: Active hero takes 1 damage if ending phase adjacent to wall
 */
export function applyEndOfHeroPhaseEnvironmentEffects(
  environmentId: string | null,
  heroHpList: HeroHpState[],
  activeHeroId: string,
  heroPosition: { x: number; y: number },
  allHeroPositions: Array<{ heroId: string; position: { x: number; y: number } }>,
  dungeon: DungeonState
): HeroHpState[] {
  if (!environmentId) {
    return heroHpList;
  }
  
  const environment = getActiveEnvironment(environmentId);
  if (!environment) {
    return heroHpList;
  }
  
  let updatedHpList = [...heroHpList];
  
  switch (environmentId) {
    case 'hidden-snipers': {
      // Check if active hero is alone on their tile
      const heroesOnSameTile = allHeroPositions.filter(h => {
        if (h.heroId === activeHeroId) return false; // Don't count the active hero
        // Simple same-tile check: on start tile, check sub-tile; on other tiles, check tile
        const activeHeroTile = dungeon.tiles.find((t: any) => {
          const bounds = getTileBoundsSimple(t, dungeon);
          return heroPosition.x >= bounds.minX && heroPosition.x <= bounds.maxX &&
                 heroPosition.y >= bounds.minY && heroPosition.y <= bounds.maxY;
        });
        const otherHeroTile = dungeon.tiles.find((t: any) => {
          const bounds = getTileBoundsSimple(t, dungeon);
          return h.position.x >= bounds.minX && h.position.x <= bounds.maxX &&
                 h.position.y >= bounds.minY && h.position.y <= bounds.maxY;
        });
        
        // For start tile, need to check sub-tiles (north/south halves)
        if (activeHeroTile?.id === 'start-tile' && otherHeroTile?.id === 'start-tile') {
          const activeSubTile = heroPosition.y <= 3 ? 'north' : 'south';
          const otherSubTile = h.position.y <= 3 ? 'north' : 'south';
          return activeSubTile === otherSubTile;
        }
        
        return activeHeroTile?.id === otherHeroTile?.id;
      });
      
      if (heroesOnSameTile.length === 0) {
        // Hero is alone on tile, apply 1 damage
        updatedHpList = updatedHpList.map(hp => {
          if (hp.heroId === activeHeroId) {
            return applyDamageToHero(hp, 1);
          }
          return hp;
        });
      }
      break;
    }
    
    case 'walls-of-magma': {
      // Check if active hero is adjacent to a wall
      const isAdjacentToWall = checkAdjacentToWall(heroPosition, dungeon);
      
      if (isAdjacentToWall) {
        // Hero is adjacent to wall, apply 1 damage
        updatedHpList = updatedHpList.map(hp => {
          if (hp.heroId === activeHeroId) {
            return applyDamageToHero(hp, 1);
          }
          return hp;
        });
      }
      break;
    }
    
    // Other environments don't trigger at end of Hero Phase
    default:
      break;
  }
  
  return updatedHpList;
}

/**
 * Helper function to get tile bounds (simplified version for environment checks)
 */
function getTileBoundsSimple(tile: PlacedTile, dungeon: DungeonState): { minX: number; maxX: number; minY: number; maxY: number } {
  if (tile.id === 'start-tile') {
    return { minX: 1, maxX: 3, minY: 0, maxY: 7 };
  }
  const col = tile.position.col;
  const row = tile.position.row;
  return {
    minX: col * 4,
    maxX: col * 4 + 3,
    minY: row * 4,
    maxY: row * 4 + 3,
  };
}

/**
 * Check if a position is adjacent to a wall
 * Note: "Adjacent" here means on or one square away from a wall edge
 * This is the game rule for Walls of Magma
 */
function checkAdjacentToWall(position: { x: number; y: number }, dungeon: DungeonState): boolean {
  // Find the tile at this position
  const tile = dungeon.tiles.find((t: any) => {
    const bounds = getTileBoundsSimple(t, dungeon);
    return position.x >= bounds.minX && position.x <= bounds.maxX &&
           position.y >= bounds.minY && position.y <= bounds.maxY;
  });
  
  if (!tile) {
    return false;
  }
  
  const bounds = getTileBoundsSimple(tile, dungeon);
  const localX = position.x - bounds.minX;
  const localY = position.y - bounds.minY;
  
  // Check if on start tile (special handling)
  if (tile.id === 'start-tile') {
    // On start tile, x=0 is wall
    if (position.x === 0 || position.x === 1) return true;
    // Staircase is at x: 1-2, y: 3-4, check if adjacent to it
    // Adjacent to staircase means being at the edge positions
    const isNearStaircase = 
      (position.x === 1 && (position.y === 2 || position.y === 5)) || // Left of staircase
      (position.x === 2 && (position.y === 2 || position.y === 5)) || // Right of staircase
      (position.y === 3 && (position.x === 0 || position.x === 3)) || // Above staircase
      (position.y === 4 && (position.x === 0 || position.x === 3));   // Below staircase
    if (isNearStaircase) return true;
  }
  
  // Check if position is adjacent to a wall edge
  const tileSize = 4;
  
  // North edge (y=0 in local coords)
  if (localY === 0 && tile.edges.north === 'wall') return true;
  if (localY === 1 && tile.edges.north === 'wall') return true; // One square away from north wall
  
  // South edge
  if (localY === tileSize - 1 && tile.edges.south === 'wall') return true;
  if (localY === tileSize - 2 && tile.edges.south === 'wall') return true; // One square away from south wall
  
  // West edge
  if (localX === 0 && tile.edges.west === 'wall') return true;
  if (localX === 1 && tile.edges.west === 'wall') return true; // One square away from west wall
  
  // East edge
  if (localX === tileSize - 1 && tile.edges.east === 'wall') return true;
  if (localX === tileSize - 2 && tile.edges.east === 'wall') return true; // One square away from east wall
  
  return false;
}

/**
 * Check which heroes need monsters spawned for Surrounded! environment
 * Returns list of hero IDs that don't control at least one monster
 */
export function getHeroesNeedingMonsters(
  heroTokens: Array<{ heroId: string }>,
  monsters: Array<{ controllerId: string }>
): string[] {
  return heroTokens
    .map(t => t.heroId)
    .filter(heroId => {
      // Check if this hero controls at least one monster
      const controlsMonster = monsters.some(m => m.controllerId === heroId);
      return !controlsMonster;
    });
}
