import type { MonsterState, Position, HeroToken, DungeonState, AttackResult, MonsterAttack, MonsterCardTactics, MonsterAttackOption } from './types';
import { MONSTER_ATTACKS, MONSTER_TACTICS } from './types';
import { arePositionsAdjacent, rollD20 } from './combat';
import { getAdjacentPositions, findTileAtPosition, getTileBounds } from './movement';

/**
 * Result of a monster's turn - either move, attack, move-and-attack, or no action
 */
export type MonsterAction =
  | { type: 'move'; destination: Position }
  | { type: 'attack'; targetId: string; result: AttackResult }
  | { type: 'move-and-attack'; destination: Position; targetId: string; result: AttackResult }
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
 * Check if any hero is within a certain tile distance of the monster.
 * "Within 1 tile" means the hero is on the same tile or an adjacent tile.
 * For our grid system, this translates to being within approximately 4-8 squares.
 * 
 * We use BFS distance to determine if a hero is "within N tiles".
 * A tile is roughly 4x4 squares, so within 1 tile = within ~4 squares of walking distance.
 * 
 * @param monster The monster to check from
 * @param heroTokens All hero tokens
 * @param heroHpMap Map of hero IDs to HP
 * @param dungeon Dungeon state
 * @param tileRange Number of tiles (1 = same or adjacent tile)
 * @returns The closest hero within range, or null if none
 */
export function findHeroWithinTileRange(
  monster: MonsterState,
  heroTokens: HeroToken[],
  heroHpMap: Record<string, number>,
  dungeon: DungeonState,
  tileRange: number
): { hero: HeroToken; distance: number } | null {
  // A tile is 4x4 squares, so "within N tiles" means within N*4 squares of movement
  const maxSquareDistance = tileRange * 4;
  
  const closest = findClosestHero(monster, heroTokens, heroHpMap, dungeon);
  
  if (closest && closest.distance <= maxSquareDistance) {
    return closest;
  }
  
  return null;
}

/**
 * Find a position adjacent to the hero that the monster can move to.
 * This is used for move-and-attack behavior where the monster needs to
 * end up adjacent to the hero.
 * 
 * @param monster The monster that wants to move
 * @param targetHero The hero to move adjacent to
 * @param heroTokens All hero tokens (for collision checking)
 * @param monsters All monsters (for collision checking)
 * @param dungeon Dungeon state for bounds checking
 * @returns A position adjacent to the hero, or null if none available
 */
export function findPositionAdjacentToHero(
  monster: MonsterState,
  targetHero: HeroToken,
  heroTokens: HeroToken[],
  monsters: MonsterState[],
  dungeon: DungeonState
): Position | null {
  const heroPos = targetHero.position;
  
  // Get positions adjacent to the hero
  const adjacentToHero = getAdjacentPositions(heroPos, dungeon);
  
  // Filter out positions occupied by heroes or other monsters
  const validPositions = adjacentToHero.filter(pos => {
    // Check for heroes (including the target hero's position)
    const hasHero = heroTokens.some(h => h.position.x === pos.x && h.position.y === pos.y);
    if (hasHero) return false;
    
    // Check for other monsters (but allow the current monster's position)
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
  
  // Get monster's current position
  const monsterGlobal = getMonsterGlobalPosition(monster, dungeon);
  if (!monsterGlobal) return validPositions[0];
  
  // Return the position closest to the monster's current position (shortest move)
  let bestPos = validPositions[0];
  let bestDistance = getManhattanDistance(bestPos, monsterGlobal);
  
  for (const pos of validPositions) {
    const distance = getManhattanDistance(pos, monsterGlobal);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestPos = pos;
    }
  }
  
  return bestPos;
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
 * Resolve a monster's attack against a hero using specific attack stats.
 * 
 * @param attackOption The attack option to use (name, bonus, damage)
 * @param targetAC The target hero's AC
 * @param randomFn Random function for dice roll
 */
export function resolveMonsterAttackWithStats(
  attackOption: MonsterAttackOption,
  targetAC: number,
  randomFn: () => number = Math.random
): AttackResult {
  const roll = rollD20(randomFn);
  const total = roll + attackOption.attackBonus;
  const isHit = roll === 20 || total >= targetAC;
  const isCritical = roll === 20;
  
  return {
    roll,
    attackBonus: attackOption.attackBonus,
    total,
    targetAC,
    isHit,
    damage: isHit ? attackOption.damage : 0,
    isCritical,
  };
}

/**
 * Resolve a monster's attack against a hero.
 * Uses the monster's tactics if available, otherwise falls back to MONSTER_ATTACKS.
 */
export function resolveMonsterAttack(
  monsterId: string,
  targetAC: number,
  randomFn: () => number = Math.random
): AttackResult {
  // Try to get attack from tactics first
  const tactics = MONSTER_TACTICS[monsterId];
  if (tactics) {
    return resolveMonsterAttackWithStats(tactics.adjacentAttack, targetAC, randomFn);
  }
  
  // Fall back to legacy MONSTER_ATTACKS
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
 * Execute a monster's turn based on its card tactics.
 * 
 * Monster behavior types:
 * - attack-only: If adjacent to hero, attack. Otherwise, move toward closest hero.
 * - move-and-attack: If within range (default 1 tile), move adjacent AND attack in same turn.
 *                    Otherwise, move toward closest hero.
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
  // Get monster tactics (default to attack-only behavior)
  const tactics = MONSTER_TACTICS[monster.monsterId];
  const tacticType = tactics?.type ?? 'attack-only';
  
  // First, check if already adjacent to a hero
  const adjacentHero = findAdjacentHero(monster, heroTokens, heroHpMap, dungeon);
  
  if (adjacentHero) {
    // Attack the adjacent hero
    const targetAC = heroAcMap[adjacentHero.heroId] ?? 10;
    const attackOption = tactics?.adjacentAttack ?? { name: 'Attack', attackBonus: 5, damage: 1 };
    const result = resolveMonsterAttackWithStats(attackOption, targetAC, randomFn);
    return { type: 'attack', targetId: adjacentHero.heroId, result };
  }
  
  // Handle move-and-attack tactics
  if (tacticType === 'move-and-attack') {
    const range = tactics?.moveAttackRange ?? 1;
    const heroInRange = findHeroWithinTileRange(monster, heroTokens, heroHpMap, dungeon, range);
    
    if (heroInRange) {
      // Find a position adjacent to the hero that we can move to
      const moveTarget = findPositionAdjacentToHero(
        monster, 
        heroInRange.hero, 
        heroTokens, 
        monsters, 
        dungeon
      );
      
      if (moveTarget) {
        // Can move adjacent and attack in the same turn
        const targetAC = heroAcMap[heroInRange.hero.heroId] ?? 10;
        const attackOption = tactics?.moveAttack ?? tactics?.adjacentAttack ?? { name: 'Attack', attackBonus: 5, damage: 1 };
        const result = resolveMonsterAttackWithStats(attackOption, targetAC, randomFn);
        return { 
          type: 'move-and-attack', 
          destination: moveTarget, 
          targetId: heroInRange.hero.heroId, 
          result 
        };
      } else {
        // No adjacent position available, just move closer
        const moveCloser = findMoveTowardHero(
          monster,
          heroInRange.hero.position,
          heroTokens,
          monsters,
          dungeon
        );
        if (moveCloser) {
          return { type: 'move', destination: moveCloser };
        }
      }
    }
  }
  
  // Default behavior: Find closest hero and move toward them
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
