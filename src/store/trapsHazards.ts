import type { 
  TrapState, 
  HazardState,
  TreasureTokenState,
  EncounterCard, 
  Position,
  HeroHpState,
  PlacedTile,
  DungeonState,
  HeroToken
} from './types';

/**
 * Start tile bounds constants
 */
const START_TILE_MIN_X = 1;
const START_TILE_MAX_X = 3;
const START_TILE_MIN_Y = 0;
const START_TILE_MAX_Y = 7;

/**
 * Create a trap instance from an encounter card
 */
export function createTrapInstance(
  encounterId: string,
  encounter: EncounterCard,
  position: Position,
  instanceId: number
): TrapState {
  if (encounter.effect.type !== 'trap') {
    throw new Error(`Cannot create trap from non-trap encounter: ${encounterId}`);
  }
  
  return {
    id: `trap-${instanceId}`,
    encounterId,
    position,
    disableDC: encounter.effect.disableDC,
  };
}

/**
 * Create a hazard instance from an encounter card
 */
export function createHazardInstance(
  encounterId: string,
  position: Position,
  instanceId: number
): HazardState {
  return {
    id: `hazard-${instanceId}`,
    encounterId,
    position,
  };
}

/**
 * Create a treasure token instance from an encounter card
 */
export function createTreasureTokenInstance(
  encounterId: string,
  position: Position,
  instanceId: number
): TreasureTokenState {
  return {
    id: `treasure-token-${instanceId}`,
    encounterId,
    position,
  };
}

/**
 * Check if a tile already has a trap
 */
export function tileHasTrap(position: Position, traps: TrapState[]): boolean {
  return traps.some(trap => 
    trap.position.x === position.x && trap.position.y === position.y
  );
}

/**
 * Check if a tile already has a hazard
 */
export function tileHasHazard(position: Position, hazards: HazardState[]): boolean {
  return hazards.some(hazard => 
    hazard.position.x === position.x && hazard.position.y === position.y
  );
}

/**
 * Check if a tile already has a treasure token
 */
export function tileHasTreasureToken(position: Position, treasureTokens: TreasureTokenState[]): boolean {
  return treasureTokens.some(token => 
    token.position.x === position.x && token.position.y === position.y
  );
}

/**
 * Get all traps on a specific tile
 */
export function getTrapsOnTile(position: Position, traps: TrapState[]): TrapState[] {
  return traps.filter(trap =>
    trap.position.x === position.x && trap.position.y === position.y
  );
}

/**
 * Get all hazards on a specific tile
 */
export function getHazardsOnTile(position: Position, hazards: HazardState[]): HazardState[] {
  return hazards.filter(hazard =>
    hazard.position.x === position.x && hazard.position.y === position.y
  );
}

/**
 * Get all treasure tokens on a specific tile
 */
export function getTreasureTokensOnTile(position: Position, treasureTokens: TreasureTokenState[]): TreasureTokenState[] {
  return treasureTokens.filter(token =>
    token.position.x === position.x && token.position.y === position.y
  );
}

/**
 * Disable a trap with a DC roll
 * @returns true if trap is disabled, false if it remains active
 */
export function attemptDisableTrap(
  trap: TrapState,
  randomFn: () => number = Math.random
): boolean {
  // Roll d20
  const roll = Math.floor(randomFn() * 20) + 1;
  return roll >= trap.disableDC;
}

/**
 * Remove a trap from the array
 */
export function removeTrap(trapId: string, traps: TrapState[]): TrapState[] {
  return traps.filter(trap => trap.id !== trapId);
}

/**
 * Remove a hazard from the array
 */
export function removeHazard(hazardId: string, hazards: HazardState[]): HazardState[] {
  return hazards.filter(hazard => hazard.id !== hazardId);
}

/**
 * Helper function to apply damage to heroes on a specific tile
 */
export function applyDamageToHeroesOnTile(
  position: Position,
  damage: number,
  heroHpList: HeroHpState[],
  heroTokens: HeroToken[]
): HeroHpState[] {
  const heroIdsOnTile = heroTokens
    .filter(token => token.position.x === position.x && token.position.y === position.y)
    .map(token => token.heroId);
  
  return heroHpList.map(hp => {
    if (heroIdsOnTile.includes(hp.heroId)) {
      return {
        ...hp,
        currentHp: Math.max(0, hp.currentHp - damage),
      };
    }
    return hp;
  });
}

/**
 * Helper function to make attack rolls against heroes on a specific tile
 */
export function attackHeroesOnTile(
  position: Position,
  attackBonus: number,
  damage: number,
  missDamage: number | undefined,
  heroHpList: HeroHpState[],
  heroTokens: HeroToken[],
  randomFn: () => number = Math.random
): HeroHpState[] {
  const heroIdsOnTile = heroTokens
    .filter(token => token.position.x === position.x && token.position.y === position.y)
    .map(token => token.heroId);
  
  return heroHpList.map(hp => {
    if (heroIdsOnTile.includes(hp.heroId)) {
      // Roll attack (d20 + attack bonus vs AC)
      const roll = Math.floor(randomFn() * 20) + 1;
      const total = roll + attackBonus;
      const isHit = total >= hp.ac;
      
      if (isHit) {
        return {
          ...hp,
          currentHp: Math.max(0, hp.currentHp - damage),
        };
      } else if (missDamage !== undefined && missDamage > 0) {
        return {
          ...hp,
          currentHp: Math.max(0, hp.currentHp - missDamage),
        };
      }
    }
    return hp;
  });
}

/**
 * Get adjacent tiles to a position
 */
export function getAdjacentPositions(position: Position): Position[] {
  return [
    { x: position.x, y: position.y - 1 }, // North
    { x: position.x + 1, y: position.y }, // East
    { x: position.x, y: position.y + 1 }, // South
    { x: position.x - 1, y: position.y }, // West
  ];
}

/**
 * Find the closest hero to a position
 */
export function findClosestHero(
  position: Position,
  heroTokens: HeroToken[]
): HeroToken | null {
  if (heroTokens.length === 0) return null;
  
  let closestHero = heroTokens[0];
  let closestDistance = Math.abs(position.x - closestHero.position.x) + 
                       Math.abs(position.y - closestHero.position.y);
  
  for (let i = 1; i < heroTokens.length; i++) {
    const hero = heroTokens[i];
    const distance = Math.abs(position.x - hero.position.x) + 
                    Math.abs(position.y - hero.position.y);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestHero = hero;
    }
  }
  
  return closestHero;
}

/**
 * Move a trap/hazard one tile toward a target position
 * Returns the new position (or same position if blocked/can't move)
 */
export function moveTowardPosition(
  current: Position,
  target: Position,
  dungeon: DungeonState
): Position {
  // Calculate Manhattan distance for each adjacent position
  const adjacentPositions = getAdjacentPositions(current);
  
  let bestPosition = current;
  let bestDistance = Math.abs(current.x - target.x) + Math.abs(current.y - target.y);
  
  for (const adjacentPos of adjacentPositions) {
    // Check if position is on a valid tile (simple check - on any placed tile)
    const isOnTile = dungeon.tiles.some(tile => {
      if (tile.id === 'start-tile') {
        return adjacentPos.x >= START_TILE_MIN_X && adjacentPos.x <= START_TILE_MAX_X && 
               adjacentPos.y >= START_TILE_MIN_Y && adjacentPos.y <= START_TILE_MAX_Y;
      }
      const col = tile.position.col;
      const row = tile.position.row;
      return adjacentPos.x >= col * 4 && adjacentPos.x <= col * 4 + 3 &&
             adjacentPos.y >= row * 4 && adjacentPos.y <= row * 4 + 3;
    });
    
    if (isOnTile) {
      const distance = Math.abs(adjacentPos.x - target.x) + 
                      Math.abs(adjacentPos.y - target.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestPosition = adjacentPos;
      }
    }
  }
  
  return bestPosition;
}

/**
 * Spread lava flow to an adjacent tile
 * Chooses a random adjacent tile that doesn't already have lava
 */
export function spreadLavaFlow(
  lavaPosition: Position,
  allLavaPositions: Position[],
  dungeon: DungeonState,
  randomFn: () => number = Math.random
): Position | null {
  const adjacentPositions = getAdjacentPositions(lavaPosition);
  
  // Filter to positions that are on valid tiles and don't have lava
  const validPositions = adjacentPositions.filter(pos => {
    // Check if already has lava
    const hasLava = allLavaPositions.some(lava => 
      lava.x === pos.x && lava.y === pos.y
    );
    if (hasLava) return false;
    
    // Check if on a tile
    return dungeon.tiles.some(tile => {
      if (tile.id === 'start-tile') {
        return pos.x >= START_TILE_MIN_X && pos.x <= START_TILE_MAX_X && 
               pos.y >= START_TILE_MIN_Y && pos.y <= START_TILE_MAX_Y;
      }
      const col = tile.position.col;
      const row = tile.position.row;
      return pos.x >= col * 4 && pos.x <= col * 4 + 3 &&
             pos.y >= row * 4 && pos.y <= row * 4 + 3;
    });
  });
  
  if (validPositions.length === 0) return null;
  
  // Choose a random valid position
  const index = Math.floor(randomFn() * validPositions.length);
  return validPositions[index];
}

/**
 * Find a valid tile position for treasure token placement
 * Must be on an explored tile and not have any heroes on it
 * @returns Position for treasure, or null if no valid position found
 */
export function findValidTreasurePlacement(
  heroTokens: HeroToken[],
  dungeon: DungeonState,
  randomFn: () => number = Math.random
): Position | null {
  // Get all valid tile positions (any position on any explored tile)
  const validPositions: Position[] = [];
  
  for (const tile of dungeon.tiles) {
    if (tile.id === 'start-tile') {
      // Start tile covers x: 1-3, y: 0-7
      for (let x = START_TILE_MIN_X; x <= START_TILE_MAX_X; x++) {
        for (let y = START_TILE_MIN_Y; y <= START_TILE_MAX_Y; y++) {
          validPositions.push({ x, y });
        }
      }
    } else {
      // Regular tiles are 4x4
      const col = tile.position.col;
      const row = tile.position.row;
      for (let x = col * 4; x <= col * 4 + 3; x++) {
        for (let y = row * 4; y <= row * 4 + 3; y++) {
          validPositions.push({ x, y });
        }
      }
    }
  }
  
  // Filter out positions with heroes
  const positionsWithoutHeroes = validPositions.filter(pos => {
    return !heroTokens.some(hero => 
      hero.position.x === pos.x && hero.position.y === pos.y
    );
  });
  
  if (positionsWithoutHeroes.length === 0) return null;
  
  // Choose a random valid position
  const index = Math.floor(randomFn() * positionsWithoutHeroes.length);
  return positionsWithoutHeroes[index];
}
