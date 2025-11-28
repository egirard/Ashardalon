import type { MonsterState, Position, HeroToken, DungeonState, AttackResult, MonsterAttack } from './types';
import { MONSTER_ATTACKS } from './types';
import { arePositionsAdjacent, rollD20 } from './combat';
import { getAdjacentPositions, findTileAtPosition, isOccupied, getTileBounds } from './movement';

/**
 * Result of a monster's turn - either move, attack, or no action
 */
export type MonsterAction =
  | { type: 'move'; destination: Position }
  | { type: 'attack'; targetId: string; result: AttackResult }
  | { type: 'none' };

/**
 * Convert a monster's local tile position to global coordinates
 */
export function getMonsterGlobalPosition(monster: MonsterState, dungeon: DungeonState): Position | null {
  const tile = dungeon.tiles.find(t => t.id === monster.tileId);
  if (!tile) return null;
  
  const bounds = getTileBounds(tile);
  return {
    x: bounds.minX + monster.position.x,
    y: bounds.minY + monster.position.y,
  };
}

/**
 * Calculate Manhattan distance between two positions (used for pathfinding heuristic)
 */
export function getManhattanDistance(pos1: Position, pos2: Position): number {
  return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
}

/**
 * Find the closest hero to a monster using BFS pathfinding.
 * Returns null if no hero is reachable or all heroes are downed (0 HP).
 * 
 * @param monster The monster looking for a target
 * @param heroTokens All hero tokens on the board
 * @param heroHpMap Map of hero IDs to current HP
 * @param dungeon Dungeon state for pathfinding
 */
export function findClosestHero(
  monster: MonsterState,
  heroTokens: HeroToken[],
  heroHpMap: Record<string, number>,
  dungeon: DungeonState
): { hero: HeroToken; distance: number } | null {
  // Get monster's global position
  const monsterGlobal = getMonsterGlobalPosition(monster, dungeon);
  if (!monsterGlobal) return null;
  
  // Filter out downed heroes (0 HP)
  const aliveHeroes = heroTokens.filter(token => {
    const hp = heroHpMap[token.heroId];
    return hp !== undefined && hp > 0;
  });
  
  if (aliveHeroes.length === 0) return null;
  
  // BFS to find distances to all heroes
  const visited = new Set<string>();
  const queue: { pos: Position; distance: number }[] = [{ pos: monsterGlobal, distance: 0 }];
  visited.add(`${monsterGlobal.x},${monsterGlobal.y}`);
  
  let closestHero: { hero: HeroToken; distance: number } | null = null;
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    
    // Check if any hero is at this position
    for (const hero of aliveHeroes) {
      if (hero.position.x === current.pos.x && hero.position.y === current.pos.y) {
        if (!closestHero || current.distance < closestHero.distance) {
          closestHero = { hero, distance: current.distance };
        }
      }
    }
    
    // If we've found the closest hero, stop (BFS guarantees shortest path)
    if (closestHero && closestHero.distance < current.distance) {
      break;
    }
    
    // Explore adjacent positions
    const adjacent = getAdjacentPositions(current.pos, dungeon);
    for (const adjPos of adjacent) {
      const key = `${adjPos.x},${adjPos.y}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ pos: adjPos, distance: current.distance + 1 });
      }
    }
  }
  
  return closestHero;
}

/**
 * Check if a monster is adjacent to any hero.
 * Returns the first adjacent hero found.
 */
export function findAdjacentHero(
  monster: MonsterState,
  heroTokens: HeroToken[],
  heroHpMap: Record<string, number>,
  dungeon: DungeonState
): HeroToken | null {
  const monsterGlobal = getMonsterGlobalPosition(monster, dungeon);
  if (!monsterGlobal) return null;
  
  // Filter out downed heroes (0 HP)
  const aliveHeroes = heroTokens.filter(token => {
    const hp = heroHpMap[token.heroId];
    return hp !== undefined && hp > 0;
  });
  
  for (const hero of aliveHeroes) {
    if (arePositionsAdjacent(monsterGlobal, hero.position)) {
      return hero;
    }
  }
  
  return null;
}

/**
 * Find the best position for a monster to move toward a target hero.
 * Returns the adjacent position that minimizes distance to the target.
 */
export function findMoveTowardHero(
  monster: MonsterState,
  targetPos: Position,
  heroTokens: HeroToken[],
  monsters: MonsterState[],
  dungeon: DungeonState
): Position | null {
  const monsterGlobal = getMonsterGlobalPosition(monster, dungeon);
  if (!monsterGlobal) return null;
  
  const adjacent = getAdjacentPositions(monsterGlobal, dungeon);
  
  // Filter out positions occupied by heroes or other monsters
  const validPositions = adjacent.filter(pos => {
    // Check for heroes
    const hasHero = heroTokens.some(h => h.position.x === pos.x && h.position.y === pos.y);
    if (hasHero) return false;
    
    // Check for other monsters
    for (const otherMonster of monsters) {
      if (otherMonster.instanceId === monster.instanceId) continue;
      const otherGlobal = getMonsterGlobalPosition(otherMonster, dungeon);
      if (otherGlobal && otherGlobal.x === pos.x && otherGlobal.y === pos.y) {
        return false;
      }
    }
    
    return true;
  });
  
  if (validPositions.length === 0) return null;
  
  // Find the position that minimizes distance to target
  let bestPos = validPositions[0];
  let bestDistance = getManhattanDistance(bestPos, targetPos);
  
  for (const pos of validPositions) {
    const distance = getManhattanDistance(pos, targetPos);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestPos = pos;
    }
  }
  
  return bestPos;
}

/**
 * Resolve a monster's attack against a hero.
 */
export function resolveMonsterAttack(
  monsterId: string,
  targetAC: number,
  randomFn: () => number = Math.random
): AttackResult {
  const attack = MONSTER_ATTACKS[monsterId];
  if (!attack) {
    // Fallback for unknown monsters
    return {
      roll: 1,
      attackBonus: 0,
      total: 1,
      targetAC,
      isHit: false,
      damage: 0,
      isCritical: false,
    };
  }
  
  const roll = rollD20(randomFn);
  const total = roll + attack.attackBonus;
  const isHit = roll === 20 || total >= targetAC;
  const isCritical = roll === 20;
  
  return {
    roll,
    attackBonus: attack.attackBonus,
    total,
    targetAC,
    isHit,
    damage: isHit ? attack.damage : 0,
    isCritical,
  };
}

/**
 * Execute a monster's turn: move toward closest hero and/or attack if adjacent.
 * 
 * @param monster The monster taking the turn
 * @param heroTokens All hero tokens on the board
 * @param heroHpMap Map of hero IDs to current HP
 * @param heroAcMap Map of hero IDs to AC
 * @param monsters All monsters (for collision checking)
 * @param dungeon Dungeon state
 * @param randomFn Random function for attack rolls
 */
export function executeMonsterTurn(
  monster: MonsterState,
  heroTokens: HeroToken[],
  heroHpMap: Record<string, number>,
  heroAcMap: Record<string, number>,
  monsters: MonsterState[],
  dungeon: DungeonState,
  randomFn: () => number = Math.random
): MonsterAction {
  // First, check if already adjacent to a hero
  const adjacentHero = findAdjacentHero(monster, heroTokens, heroHpMap, dungeon);
  
  if (adjacentHero) {
    // Attack the adjacent hero
    const targetAC = heroAcMap[adjacentHero.heroId] ?? 10;
    const result = resolveMonsterAttack(monster.monsterId, targetAC, randomFn);
    return { type: 'attack', targetId: adjacentHero.heroId, result };
  }
  
  // Find closest hero and move toward them
  const closest = findClosestHero(monster, heroTokens, heroHpMap, dungeon);
  
  if (!closest) {
    return { type: 'none' };
  }
  
  // Find the best position to move toward the hero
  const moveTarget = findMoveTowardHero(monster, closest.hero.position, heroTokens, monsters, dungeon);
  
  if (moveTarget) {
    return { type: 'move', destination: moveTarget };
  }
  
  return { type: 'none' };
}

/**
 * Convert a global position back to local tile coordinates
 */
export function globalToLocalPosition(globalPos: Position, tileId: string, dungeon: DungeonState): Position | null {
  const tile = dungeon.tiles.find(t => t.id === tileId);
  if (!tile) return null;
  
  const bounds = getTileBounds(tile);
  return {
    x: globalPos.x - bounds.minX,
    y: globalPos.y - bounds.minY,
  };
}

/**
 * Find which tile a global position is on
 */
export function findTileForGlobalPosition(globalPos: Position, dungeon: DungeonState): string | null {
  const tile = findTileAtPosition(globalPos, dungeon);
  return tile?.id ?? null;
}
