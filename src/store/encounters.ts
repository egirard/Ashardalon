import type { EncounterDeck, EncounterCard, TurnState, HeroHpState, PartyResources, DungeonState, PlacedTile, MonsterCategory, HeroToken, Position, TileEdge, Direction } from './types';
import { ENCOUNTER_CARDS, INITIAL_ENCOUNTER_DECK, ENCOUNTER_CANCEL_COST } from './types';
import type { StatusEffectType } from './statusEffects';
import { getTileBounds, findTileAtPosition, getSubTileIdAtPosition } from './movement';

/**
 * Check if two positions are on the same tile (or sub-tile for start tile)
 */
export function areOnSameTile(pos1: Position, pos2: Position, dungeon: DungeonState): boolean {
  const tile1 = findTileAtPosition(pos1, dungeon);
  const tile2 = findTileAtPosition(pos2, dungeon);
  
  if (!tile1 || !tile2) {
    return false;
  }
  
  // If both are on start tile, check sub-tiles
  if (tile1.tileType === 'start' && tile2.tileType === 'start') {
    const subTile1 = getSubTileIdAtPosition(pos1, dungeon);
    const subTile2 = getSubTileIdAtPosition(pos2, dungeon);
    // If either sub-tile is null (shouldn't happen but for safety), return false
    if (subTile1 === null || subTile2 === null) {
      return false;
    }
    return subTile1 === subTile2;
  }
  
  // Otherwise, compare tile IDs
  return tile1.id === tile2.id;
}

/**
 * Calculate the tile distance between two positions
 * This counts the minimum number of tile boundaries crossed to reach from pos1 to pos2
 */
export function getTileDistance(pos1: Position, pos2: Position, dungeon: DungeonState): number {
  // If on same tile, distance is 0
  if (areOnSameTile(pos1, pos2, dungeon)) {
    return 0;
  }
  
  const tile1 = findTileAtPosition(pos1, dungeon);
  const tile2 = findTileAtPosition(pos2, dungeon);
  
  if (!tile1 || !tile2) {
    return Infinity;
  }
  
  // For tiles, use Manhattan distance between tile positions
  // Each tile is considered adjacent if they share an edge
  const pos1Tile = tile1.position;
  const pos2Tile = tile2.position;
  
  // For start tile, treat north and south sub-tiles separately
  let adjustedRow1 = pos1Tile.row;
  let adjustedRow2 = pos2Tile.row;
  
  if (tile1.tileType === 'start') {
    // North sub-tile stays at row 0, south sub-tile is at row 1
    const subTile1 = getSubTileIdAtPosition(pos1, dungeon);
    // Default to row 1 if sub-tile is null (shouldn't happen but for safety)
    adjustedRow1 = subTile1 === 'start-tile-north' ? 0 : 1;
  }
  
  if (tile2.tileType === 'start') {
    const subTile2 = getSubTileIdAtPosition(pos2, dungeon);
    // Default to row 1 if sub-tile is null (shouldn't happen but for safety)
    adjustedRow2 = subTile2 === 'start-tile-north' ? 0 : 1;
  }
  
  // Calculate Manhattan distance between tile grid positions
  const colDist = Math.abs(pos1Tile.col - pos2Tile.col);
  const rowDist = Math.abs(adjustedRow1 - adjustedRow2);
  
  return colDist + rowDist;
}

/**
 * Get heroes on the same tile as the active hero
 */
export function getHeroesOnTile(
  activeHeroPosition: Position,
  heroTokens: HeroToken[],
  dungeon: DungeonState
): string[] {
  return heroTokens
    .filter(token => areOnSameTile(token.position, activeHeroPosition, dungeon))
    .map(token => token.heroId);
}

/**
 * Get heroes within N tiles of the active hero (inclusive of active hero's tile)
 */
export function getHeroesWithinRange(
  activeHeroPosition: Position,
  heroTokens: HeroToken[],
  dungeon: DungeonState,
  range: number
): string[] {
  return heroTokens
    .filter(token => {
      const distance = getTileDistance(activeHeroPosition, token.position, dungeon);
      return distance <= range;
    })
    .map(token => token.heroId);
}

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
 * Format hero name for display (capitalize first letter)
 */
function formatHeroName(heroId: string): string {
  return heroId.charAt(0).toUpperCase() + heroId.slice(1);
}

/**
 * Resolve an encounter effect
 * Returns updated hero HP states and detailed results for UI display
 * 
 * Currently implemented effects:
 * - damage (active-hero): Deals damage to the current hero
 * - damage (all-heroes): Deals damage to all heroes
 * - damage (heroes-on-tile): Deals damage to heroes on same tile as active hero
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
  heroTokens: HeroToken[] = [],
  dungeon: DungeonState | null = null,
  randomFn: () => number = Math.random
): { heroHpList: HeroHpState[]; results: EncounterResultTarget[] } {
  const effect = encounter.effect;
  const results: EncounterResultTarget[] = [];
  
  switch (effect.type) {
    case 'damage': {
      // Determine target heroes based on effect target type
      let targetHeroIds: string[];
      
      if (effect.target === 'active-hero') {
        targetHeroIds = [activeHeroId];
      } else if (effect.target === 'all-heroes') {
        targetHeroIds = heroHpList.map(h => h.heroId);
      } else if (effect.target === 'heroes-on-tile') {
        // Target only heroes on the same tile as the active hero
        if (heroTokens.length > 0 && dungeon) {
          const activeHeroToken = heroTokens.find(t => t.heroId === activeHeroId);
          if (activeHeroToken) {
            targetHeroIds = getHeroesOnTile(activeHeroToken.position, heroTokens, dungeon);
          } else {
            // Fallback to all heroes if active hero token not found
            targetHeroIds = heroHpList.map(h => h.heroId);
          }
        } else {
          // Fallback to all heroes if position info not available
          targetHeroIds = heroHpList.map(h => h.heroId);
        }
      } else if (effect.target === 'heroes-within-1-tile') {
        // Target heroes within 1 tile of the active hero
        if (heroTokens.length > 0 && dungeon) {
          const activeHeroToken = heroTokens.find(t => t.heroId === activeHeroId);
          if (activeHeroToken) {
            targetHeroIds = getHeroesWithinRange(activeHeroToken.position, heroTokens, dungeon, 1);
          } else {
            // Fallback to all heroes
            targetHeroIds = heroHpList.map(h => h.heroId);
          }
        } else {
          // Fallback to all heroes if position info not available
          targetHeroIds = heroHpList.map(h => h.heroId);
        }
      } else {
        // Default to active hero for unknown target types
        targetHeroIds = [activeHeroId];
      }
      
      // Apply damage to target heroes
      const updatedHpList = heroHpList.map(hp => {
        if (targetHeroIds.includes(hp.heroId)) {
          results.push({
            heroId: hp.heroId,
            heroName: formatHeroName(hp.heroId),
            damageTaken: effect.amount,
          });
          return applyDamageToHero(hp, effect.amount);
        }
        return hp;
      });
      return { heroHpList: updatedHpList, results };
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
            return heroHpList.map(h => h.heroId);
          case 'heroes-on-tile': {
            // Target only heroes on the same tile as the active hero
            if (heroTokens.length > 0 && dungeon) {
              const activeHeroToken = heroTokens.find(t => t.heroId === activeHeroId);
              if (activeHeroToken) {
                return getHeroesOnTile(activeHeroToken.position, heroTokens, dungeon);
              }
            }
            // Fallback to all heroes if position info not available
            return heroHpList.map(h => h.heroId);
          }
          case 'heroes-within-1-tile': {
            // Target heroes within 1 tile of the active hero
            if (heroTokens.length > 0 && dungeon) {
              const activeHeroToken = heroTokens.find(t => t.heroId === activeHeroId);
              if (activeHeroToken) {
                return getHeroesWithinRange(activeHeroToken.position, heroTokens, dungeon, 1);
              }
            }
            // Fallback to all heroes if position info not available
            return heroHpList.map(h => h.heroId);
          }
          default:
            return [activeHeroId];
        }
      };
      
      const targetHeroIds = getTargetHeroes();
      
      const updatedHpList = heroHpList.map(hp => {
        if (!targetHeroIds.includes(hp.heroId)) {
          return hp;
        }
        
        // Roll attack (d20 + attack bonus vs AC)
        // Note: randomFn must return values in [0, 1) range to produce valid d20 rolls (1-20)
        const roll = Math.floor(randomFn() * 20) + 1;
        const total = roll + effect.attackBonus;
        const isHit = total >= hp.ac;
        
        const statusesApplied: string[] = [];
        if (isHit && effect.statusEffect) {
          statusesApplied.push(effect.statusEffect);
        }
        
        let damageTaken = 0;
        let updatedHp = hp;
        
        if (isHit) {
          damageTaken = effect.damage;
          updatedHp = applyDamageToHero(hp, effect.damage);
        } else if (effect.missDamage !== undefined && effect.missDamage > 0) {
          damageTaken = effect.missDamage;
          updatedHp = applyDamageToHero(hp, effect.missDamage);
        }
        
        results.push({
          heroId: hp.heroId,
          heroName: formatHeroName(hp.heroId),
          wasHit: isHit,
          damageTaken,
          statusesApplied: statusesApplied.length > 0 ? statusesApplied : undefined,
          attackRoll: roll,
          attackTotal: total,
          targetAC: hp.ac,
        });
        
        return updatedHp;
      });
      
      return { heroHpList: updatedHpList, results };
    }
    
    case 'environment':
      // Environment effects are tracked in game state and applied at appropriate phases
      // No immediate effect on hero HP during encounter resolution
      return { heroHpList, results };
      
    case 'curse':
      // Apply curse as a status effect to the active hero
      // Import will be added at the top of the file
      // For now, we return the heroHpList unchanged and let gameSlice handle the curse application
      return { heroHpList, results };
      
    case 'trap':
      // Trap placement is handled separately in game slice
      // No immediate damage during encounter resolution
      return { heroHpList, results };
      
    case 'hazard':
      // Hazard placement is handled separately in game slice
      // For hazards with immediate attacks (Cave In, Pit), apply them here
      if (effect.attackBonus !== undefined && effect.damage !== undefined) {
        // Determine target heroes (hazards typically target heroes on the tile)
        let targetHeroIds: string[];
        
        if (effect.target === 'heroes-on-tile' && heroTokens.length > 0 && dungeon) {
          const activeHeroToken = heroTokens.find(t => t.heroId === activeHeroId);
          if (activeHeroToken) {
            targetHeroIds = getHeroesOnTile(activeHeroToken.position, heroTokens, dungeon);
          } else {
            // Fallback to all heroes
            targetHeroIds = heroHpList.map(h => h.heroId);
          }
        } else {
          // Default to all heroes for backward compatibility
          targetHeroIds = heroHpList.map(h => h.heroId);
        }
        
        const updatedHpList = heroHpList.map(hp => {
          if (!targetHeroIds.includes(hp.heroId)) {
            return hp;
          }
          
          // Roll attack
          const roll = Math.floor(randomFn() * 20) + 1;
          const total = roll + effect.attackBonus;
          const isHit = total >= hp.ac;
          
          let damageTaken = 0;
          let updatedHp = hp;
          
          if (isHit) {
            damageTaken = effect.damage;
            updatedHp = applyDamageToHero(hp, effect.damage);
          } else if (effect.missDamage !== undefined && effect.missDamage > 0) {
            damageTaken = effect.missDamage;
            updatedHp = applyDamageToHero(hp, effect.missDamage);
          }
          
          results.push({
            heroId: hp.heroId,
            heroName: formatHeroName(hp.heroId),
            wasHit: isHit,
            damageTaken,
            attackRoll: roll,
            attackTotal: total,
            targetAC: hp.ac,
          });
          
          return updatedHp;
        });
        
        return { heroHpList: updatedHpList, results };
      }
      return { heroHpList, results };
      
    case 'special':
      // Special effects are NOT YET IMPLEMENTED
      // Would need complex UI interactions (tile placement, monster spawning, etc.)
      console.warn(`Special effect '${encounter.name}' is not yet implemented`);
      return { heroHpList, results };
      
    default:
      return { heroHpList, results };
  }
}

/**
 * Map encounter card ID to curse status effect type
 * Returns null if the encounter is not a curse
 */
export function getCurseStatusType(encounterId: string): StatusEffectType | null {
  const curseMap: Record<string, StatusEffectType> = {
    'gap-in-armor': 'curse-gap-in-armor',
    'bad-luck': 'curse-bad-luck',
    'bloodlust': 'curse-bloodlust',
    'cage': 'curse-cage',
    'dragon-fear': 'curse-dragon-fear',
    'terrifying-roar': 'curse-terrifying-roar',
    'time-leap': 'curse-time-leap',
    'wrath-of-enemy': 'curse-wrath-of-enemy',
  };
  
  return curseMap[encounterId] ?? null;
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

/**
 * Check if an encounter card should place a trap marker
 */
export function shouldPlaceTrapMarker(encounter: EncounterCard): boolean {
  return encounter.effect.type === 'trap';
}

/**
 * Check if an encounter card should place a hazard marker
 */
export function shouldPlaceHazardMarker(encounter: EncounterCard): boolean {
  return encounter.effect.type === 'hazard';
}

/**
 * Check if a special encounter requires a follow-up encounter draw
 * Cards like Ancient Spirit's Blessing, Deadly Poison, Hidden Treasure, and Quick Advance
 * instruct: "Draw another Encounter Card"
 */
export function shouldDrawAnotherEncounter(encounterId: string): boolean {
  const followUpCards = [
    'ancient-spirits-blessing',
    'deadly-poison',
    'hidden-treasure',
    'quick-advance',
  ];
  return followUpCards.includes(encounterId);
}

/**
 * Get the monster category to filter for based on encounter card
 * Used by cards like Hall of Orcs, Duergar Outpost, etc.
 */
export function getMonsterCategoryForEncounter(encounterId: string): MonsterCategory | null {
  const categoryMap: Record<string, MonsterCategory> = {
    'duergar-outpost': 'devil',
    'hall-of-orcs': 'orc',
    'kobold-warren': 'reptile',
    'unnatural-corruption': 'aberrant',
    'spotted': 'sentry',
  };
  return categoryMap[encounterId] ?? null;
}

/**
 * Check if an encounter card manipulates monster deck
 */
export function isMonsterDeckManipulationCard(encounterId: string): boolean {
  const deckCards = [
    'duergar-outpost',
    'hall-of-orcs',
    'kobold-warren',
    'unnatural-corruption',
    'spotted',
  ];
  return deckCards.includes(encounterId);
}

/**
 * Check if an encounter card manipulates tile deck
 */
export function isTileDeckManipulationCard(encounterId: string): boolean {
  const deckCards = [
    'lost',
    'occupied-lair',
    'scream-of-sentry',
    'spotted',
  ];
  return deckCards.includes(encounterId);
}

/**
 * Get the center position of an unexplored edge
 * This is used to calculate distance to the edge for Surrounded! environment
 */
function getEdgeCenterPosition(edge: TileEdge, dungeon: DungeonState): Position {
  const tile = dungeon.tiles.find(t => t.id === edge.tileId);
  if (!tile) {
    return { x: 0, y: 0 }; // Fallback, shouldn't happen
  }
  
  const bounds = getTileBounds(tile, dungeon);
  
  // Calculate center position based on edge direction
  switch (edge.direction) {
    case 'north':
      return { x: (bounds.minX + bounds.maxX) / 2, y: bounds.minY };
    case 'south':
      return { x: (bounds.minX + bounds.maxX) / 2, y: bounds.maxY };
    case 'east':
      return { x: bounds.maxX, y: (bounds.minY + bounds.maxY) / 2 };
    case 'west':
      return { x: bounds.minX, y: (bounds.minY + bounds.maxY) / 2 };
  }
}

/**
 * Find the closest unexplored edge to a hero position
 * Used by Surrounded! environment to spawn monsters
 */
export function findClosestUnexploredEdge(
  heroPosition: Position,
  unexploredEdges: TileEdge[],
  dungeon: DungeonState
): TileEdge | null {
  if (unexploredEdges.length === 0) {
    return null;
  }
  
  let closestEdge: TileEdge | null = null;
  let closestDistance = Infinity;
  
  for (const edge of unexploredEdges) {
    const edgeCenter = getEdgeCenterPosition(edge, dungeon);
    const distance = Math.abs(heroPosition.x - edgeCenter.x) + Math.abs(heroPosition.y - edgeCenter.y);
    
    if (distance < closestDistance) {
      closestDistance = distance;
      closestEdge = edge;
    }
  }
  
  return closestEdge;
}
