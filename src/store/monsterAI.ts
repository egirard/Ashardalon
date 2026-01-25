import type { MonsterState, Position, HeroToken, DungeonState, AttackResult, MonsterAttack, MonsterCardTactics, MonsterAttackOption, TileEdge, Direction, PendingMonsterDecision } from './types';
import { MONSTER_ATTACKS, MONSTER_TACTICS } from './types';
import { arePositionsAdjacent, rollD20 } from './combat';
import { getAdjacentPositions, findTileAtPosition, getTileBounds } from './movement';

/**
 * A tile is 4x4 squares. This constant is used for converting tile range to square distance.
 */
const SQUARES_PER_TILE = 4;

/**
 * Default monster attack stats used when no tactics or attacks are defined.
 */
const DEFAULT_MONSTER_ATTACK: MonsterAttackOption = {
  name: 'Attack',
  attackBonus: 5,
  damage: 1,
};

/**
 * Result of a monster's turn - either move, attack, move-and-attack, area-attack, explore, needs-choice, or no action
 */
export type MonsterAction =
  | { type: 'move'; destination: Position }
  | { type: 'attack'; targetId: string; result: AttackResult }
  | { type: 'move-and-attack'; destination: Position; targetId: string; result: AttackResult }
  | { type: 'area-attack'; targetIds: string[]; results: AttackResult[] }
  | { type: 'explore'; edge: TileEdge }
  | { type: 'needs-choice'; decision: PendingMonsterDecision }
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
 * If multiple heroes are equidistant, returns all of them with needsChoice flag.
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
): { hero: HeroToken; distance: number } | { heroes: HeroToken[]; distance: number; needsChoice: true } | null {
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
  
  const heroDistances = new Map<string, number>();
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    
    // Check if any hero is at this position
    for (const hero of aliveHeroes) {
      if (hero.position.x === current.pos.x && hero.position.y === current.pos.y) {
        if (!heroDistances.has(hero.heroId)) {
          heroDistances.set(hero.heroId, current.distance);
        }
      }
    }
    
    // Continue until we've found all heroes or searched far enough
    if (heroDistances.size === aliveHeroes.length) {
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
  
  if (heroDistances.size === 0) return null;
  
  // Find the minimum distance
  const minDistance = Math.min(...Array.from(heroDistances.values()));
  
  // Get all heroes at the minimum distance
  const closestHeroes = aliveHeroes.filter(hero => {
    const distance = heroDistances.get(hero.heroId);
    return distance === minDistance;
  });
  
  // If multiple heroes at same distance, return them all with needsChoice flag
  if (closestHeroes.length > 1) {
    return {
      heroes: closestHeroes,
      distance: minDistance,
      needsChoice: true
    };
  }
  
  // Single closest hero
  return {
    hero: closestHeroes[0],
    distance: minDistance
  };
}

/**
 * Check if a monster is adjacent to any hero.
 * Returns the first adjacent hero found, or all adjacent heroes if multiple exist.
 * If multiple heroes are adjacent, returns them all with needsChoice flag.
 */
export function findAdjacentHero(
  monster: MonsterState,
  heroTokens: HeroToken[],
  heroHpMap: Record<string, number>,
  dungeon: DungeonState
): HeroToken | { heroes: HeroToken[]; needsChoice: true } | null {
  const monsterGlobal = getMonsterGlobalPosition(monster, dungeon);
  if (!monsterGlobal) return null;
  
  // Filter out downed heroes (0 HP)
  const aliveHeroes = heroTokens.filter(token => {
    const hp = heroHpMap[token.heroId];
    return hp !== undefined && hp > 0;
  });
  
  const adjacentHeroes: HeroToken[] = [];
  
  for (const hero of aliveHeroes) {
    if (arePositionsAdjacent(monsterGlobal, hero.position)) {
      adjacentHeroes.push(hero);
    }
  }
  
  if (adjacentHeroes.length === 0) return null;
  
  // If multiple adjacent heroes, return them all with needsChoice flag
  if (adjacentHeroes.length > 1) {
    return {
      heroes: adjacentHeroes,
      needsChoice: true
    };
  }
  
  return adjacentHeroes[0];
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
 * @returns The closest hero within range (or multiple if equidistant), or null if none
 */
export function findHeroWithinTileRange(
  monster: MonsterState,
  heroTokens: HeroToken[],
  heroHpMap: Record<string, number>,
  dungeon: DungeonState,
  tileRange: number
): { hero: HeroToken; distance: number } | { heroes: HeroToken[]; distance: number; needsChoice: true } | null {
  // "Within N tiles" means within N * SQUARES_PER_TILE squares of movement
  const maxSquareDistance = tileRange * SQUARES_PER_TILE;
  
  const closest = findClosestHero(monster, heroTokens, heroHpMap, dungeon);
  
  if (!closest) return null;
  
  if ('needsChoice' in closest && closest.needsChoice) {
    // Multiple heroes at same distance - check if they're within range
    if (closest.distance <= maxSquareDistance) {
      return closest;
    }
    return null;
  }
  
  // Single hero - check if within range
  if (closest.distance <= maxSquareDistance) {
    return closest;
  }
  
  return null;
}

/**
 * Find a position adjacent to the hero that the monster can move to.
 * This is used for move-and-attack behavior where the monster needs to
 * end up adjacent to the hero.
 * If multiple positions are equidistant to the monster, returns all of them with needsChoice flag.
 * 
 * @param monster The monster that wants to move
 * @param targetHero The hero to move adjacent to
 * @param heroTokens All hero tokens (for collision checking)
 * @param monsters All monsters (for collision checking)
 * @param dungeon Dungeon state for bounds checking
 * @returns A position adjacent to the hero (or multiple if equidistant), or null if none available
 */
export function findPositionAdjacentToHero(
  monster: MonsterState,
  targetHero: HeroToken,
  heroTokens: HeroToken[],
  monsters: MonsterState[],
  dungeon: DungeonState
): Position | { positions: Position[]; needsChoice: true } | null {
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
  
  // Find the minimum distance to monster's current position
  const distances = validPositions.map(pos => ({
    pos,
    distance: getManhattanDistance(pos, monsterGlobal)
  }));
  
  const minDistance = Math.min(...distances.map(d => d.distance));
  
  // Get all positions at the minimum distance (closest to monster)
  const bestPositions = distances
    .filter(d => d.distance === minDistance)
    .map(d => d.pos);
  
  // If multiple positions at same distance, return them all with needsChoice flag
  if (bestPositions.length > 1) {
    return {
      positions: bestPositions,
      needsChoice: true
    };
  }
  
  return bestPositions[0];
}

/**
 * Find the best position for a monster to move toward a target hero.
 * Returns the adjacent position that minimizes distance to the target.
 * If multiple positions are equidistant, returns all of them with needsChoice flag.
 */
export function findMoveTowardHero(
  monster: MonsterState,
  targetPos: Position,
  heroTokens: HeroToken[],
  monsters: MonsterState[],
  dungeon: DungeonState
): Position | { positions: Position[]; needsChoice: true } | null {
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
  
  // Find the minimum distance to target among all valid positions
  const distances = validPositions.map(pos => ({
    pos,
    distance: getManhattanDistance(pos, targetPos)
  }));
  
  const minDistance = Math.min(...distances.map(d => d.distance));
  
  // Get all positions at the minimum distance
  const bestPositions = distances
    .filter(d => d.distance === minDistance)
    .map(d => d.pos);
  
  // If multiple positions at same distance, return them all with needsChoice flag
  if (bestPositions.length > 1) {
    return {
      positions: bestPositions,
      needsChoice: true
    };
  }
  
  return bestPositions[0];
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
 * Find all heroes on the same tile as the monster.
 * Used for area attacks that target all heroes on the monster's tile.
 * 
 * @param monster The monster to check from
 * @param heroTokens All hero tokens
 * @param heroHpMap Map of hero IDs to HP (to filter out downed heroes)
 * @param dungeon Dungeon state
 * @returns Array of hero tokens on the same tile with HP > 0
 */
export function findAllHeroesOnSameTile(
  monster: MonsterState,
  heroTokens: HeroToken[],
  heroHpMap: Record<string, number>,
  dungeon: DungeonState
): HeroToken[] {
  // Get monster's global position
  const monsterGlobal = getMonsterGlobalPosition(monster, dungeon);
  if (!monsterGlobal) return [];
  
  // Find the tile the monster is on
  const monsterTile = findTileAtPosition(monsterGlobal, dungeon);
  if (!monsterTile) return [];
  
  // Filter heroes that are on the same tile and alive
  return heroTokens.filter(hero => {
    // Check if hero is alive
    const hp = heroHpMap[hero.heroId];
    if (hp === undefined || hp <= 0) return false;
    
    // Check if hero is on the same tile
    const heroTile = findTileAtPosition(hero.position, dungeon);
    if (!heroTile) return false;
    
    // Compare tile IDs (handles both regular tiles and start tile sub-tiles)
    return monsterTile.id === heroTile.id;
  });
}

/**
 * Find all heroes within a certain tile distance of the monster.
 * Used for area attacks that target all heroes within range.
 * 
 * @param monster The monster to check from
 * @param heroTokens All hero tokens
 * @param heroHpMap Map of hero IDs to HP (to filter out downed heroes)
 * @param dungeon Dungeon state
 * @param tileRange Number of tiles (0 = same tile, 1 = within 1 tile, etc.)
 * @returns Array of hero tokens within range with HP > 0
 */
export function findAllHeroesWithinRange(
  monster: MonsterState,
  heroTokens: HeroToken[],
  heroHpMap: Record<string, number>,
  dungeon: DungeonState,
  tileRange: number
): HeroToken[] {
  const maxSquareDistance = tileRange * SQUARES_PER_TILE;
  const monsterGlobal = getMonsterGlobalPosition(monster, dungeon);
  if (!monsterGlobal) return [];
  
  // Filter heroes that are within range and alive
  return heroTokens.filter(hero => {
    // Check if hero is alive
    const hp = heroHpMap[hero.heroId];
    if (hp === undefined || hp <= 0) return false;
    
    // Check if hero is within range using Manhattan distance
    const distance = getManhattanDistance(monsterGlobal, hero.position);
    return distance <= maxSquareDistance;
  });
}

/**
 * Execute a monster's turn based on its card tactics.
 * 
 * Monster behavior types:
 * - attack-only: If adjacent to hero, attack. Otherwise, move toward closest hero.
 * - move-and-attack: If within range (default 1 tile), move adjacent AND attack in same turn.
 *                    Otherwise, move toward closest hero.
 * - explore-or-attack: If adjacent to hero, attack. If on tile with unexplored edge and no heroes, explore.
 *                      Otherwise, move toward closest hero.
 * - area-attack: Attacks all valid targets (heroes on tile or within range) simultaneously.
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
  
  // Handle area-attack behavior first (Cave Bear, Gibbering Mouther)
  if (tacticType === 'area-attack') {
    const attackOption = tactics?.adjacentAttack ?? DEFAULT_MONSTER_ATTACK;
    let targetHeroes: HeroToken[] = [];
    
    // Determine which heroes to target based on attack properties
    if (attackOption.targetsAllOnTile) {
      // Attack all heroes on the same tile (Cave Bear)
      targetHeroes = findAllHeroesOnSameTile(monster, heroTokens, heroHpMap, dungeon);
    } else if (attackOption.targetsAllInRange) {
      // Attack all heroes within range (Gibbering Mouther)
      const range = attackOption.range ?? 1;
      targetHeroes = findAllHeroesWithinRange(monster, heroTokens, heroHpMap, dungeon, range);
    }
    
    // If we have targets, execute area attack
    if (targetHeroes.length > 0) {
      const targetIds: string[] = [];
      const results: AttackResult[] = [];
      
      // Roll attack for each hero
      for (const hero of targetHeroes) {
        const targetAC = heroAcMap[hero.heroId] ?? 10;
        const result = resolveMonsterAttackWithStats(attackOption, targetAC, randomFn);
        targetIds.push(hero.heroId);
        results.push(result);
      }
      
      return { type: 'area-attack', targetIds, results };
    }
    
    // No valid targets, move toward closest hero
    const closest = findClosestHero(monster, heroTokens, heroHpMap, dungeon);
    if (closest) {
      // Check if multiple heroes at same distance (needs player choice for targeting)
      if ('needsChoice' in closest && closest.needsChoice) {
        return {
          type: 'needs-choice',
          decision: {
            decisionId: `monster-${monster.instanceId}-target-${Date.now()}`,
            type: 'choose-hero-target',
            monsterId: monster.instanceId,
            options: {
              heroIds: closest.heroes.map(h => h.heroId)
            },
            context: 'movement'
          }
        };
      }
      
      const moveTarget = findMoveTowardHero(monster, closest.hero.position, heroTokens, monsters, dungeon);
      if (moveTarget) {
        // Check if multiple move destinations (needs player choice)
        if ('needsChoice' in moveTarget && moveTarget.needsChoice) {
          return {
            type: 'needs-choice',
            decision: {
              decisionId: `monster-${monster.instanceId}-move-${Date.now()}`,
              type: 'choose-move-destination',
              monsterId: monster.instanceId,
              options: {
                positions: moveTarget.positions
              },
              context: 'movement'
            }
          };
        }
        
        return { type: 'move', destination: moveTarget };
      }
    }
    
    return { type: 'none' };
  }
  
  // First, check if already adjacent to a hero
  const adjacentHero = findAdjacentHero(monster, heroTokens, heroHpMap, dungeon);
  
  if (adjacentHero) {
    // Check if multiple adjacent heroes (needs player choice)
    if ('needsChoice' in adjacentHero && adjacentHero.needsChoice) {
      return {
        type: 'needs-choice',
        decision: {
          decisionId: `monster-${monster.instanceId}-adjacent-target-${Date.now()}`,
          type: 'choose-adjacent-target',
          monsterId: monster.instanceId,
          options: {
            heroIds: adjacentHero.heroes.map(h => h.heroId)
          },
          context: 'attack'
        }
      };
    }
    
    // Single adjacent hero - attack them
    const targetAC = heroAcMap[adjacentHero.heroId] ?? 10;
    const attackOption = tactics?.adjacentAttack ?? DEFAULT_MONSTER_ATTACK;
    const result = resolveMonsterAttackWithStats(attackOption, targetAC, randomFn);
    return { type: 'attack', targetId: adjacentHero.heroId, result };
  }
  
  // Handle explore-or-attack behavior
  if (tacticType === 'explore-or-attack') {
    // Check if no heroes are on the monster's tile
    const heroOnTile = isHeroOnMonsterTile(monster, heroTokens, dungeon);
    
    if (!heroOnTile) {
      // Check for unexplored edge on the monster's tile
      const unexploredEdge = findUnexploredEdgeOnMonsterTile(monster, dungeon);
      
      if (unexploredEdge) {
        // Monster will explore this edge
        return { type: 'explore', edge: unexploredEdge };
      }
    }
  }
  
  // Handle move-and-attack and ranged-attack tactics
  if (tacticType === 'move-and-attack' || tacticType === 'ranged-attack') {
    const range = tactics?.moveAttackRange ?? 1;
    const heroInRange = findHeroWithinTileRange(monster, heroTokens, heroHpMap, dungeon, range);
    
    if (heroInRange) {
      // Check if multiple heroes at same distance (needs player choice for targeting)
      if ('needsChoice' in heroInRange && heroInRange.needsChoice) {
        return {
          type: 'needs-choice',
          decision: {
            decisionId: `monster-${monster.instanceId}-target-${Date.now()}`,
            type: 'choose-hero-target',
            monsterId: monster.instanceId,
            options: {
              heroIds: heroInRange.heroes.map(h => h.heroId)
            },
            context: 'move-and-attack'
          }
        };
      }
      
      // Find a position adjacent to the hero that we can move to
      const moveTarget = findPositionAdjacentToHero(
        monster, 
        heroInRange.hero, 
        heroTokens, 
        monsters, 
        dungeon
      );
      
      if (moveTarget) {
        // Check if multiple move destinations (needs player choice)
        if ('needsChoice' in moveTarget && moveTarget.needsChoice) {
          return {
            type: 'needs-choice',
            decision: {
              decisionId: `monster-${monster.instanceId}-move-${Date.now()}`,
              type: 'choose-move-destination',
              monsterId: monster.instanceId,
              options: {
                positions: moveTarget.positions
              },
              context: 'move-and-attack'
            }
          };
        }
        
        // Can move adjacent and attack in the same turn
        const targetAC = heroAcMap[heroInRange.hero.heroId] ?? 10;
        const attackOption = tactics?.moveAttack ?? tactics?.adjacentAttack ?? DEFAULT_MONSTER_ATTACK;
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
          // Check if multiple move destinations (needs player choice)
          if ('needsChoice' in moveCloser && moveCloser.needsChoice) {
            return {
              type: 'needs-choice',
              decision: {
                decisionId: `monster-${monster.instanceId}-move-${Date.now()}`,
                type: 'choose-move-destination',
                monsterId: monster.instanceId,
                options: {
                  positions: moveCloser.positions
                },
                context: 'movement'
              }
            };
          }
          
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
  
  // Check if multiple heroes at same distance (needs player choice for targeting)
  if ('needsChoice' in closest && closest.needsChoice) {
    return {
      type: 'needs-choice',
      decision: {
        decisionId: `monster-${monster.instanceId}-target-${Date.now()}`,
        type: 'choose-hero-target',
        monsterId: monster.instanceId,
        options: {
          heroIds: closest.heroes.map(h => h.heroId)
        },
        context: 'movement'
      }
    };
  }
  
  // Find the best position to move toward the hero
  const moveTarget = findMoveTowardHero(monster, closest.hero.position, heroTokens, monsters, dungeon);
  
  if (!moveTarget) {
    return { type: 'none' };
  }
  
  // Check if multiple move destinations (needs player choice)
  if ('needsChoice' in moveTarget && moveTarget.needsChoice) {
    return {
      type: 'needs-choice',
      decision: {
        decisionId: `monster-${monster.instanceId}-move-${Date.now()}`,
        type: 'choose-move-destination',
        monsterId: monster.instanceId,
        options: {
          positions: moveTarget.positions
        },
        context: 'movement'
      }
    };
  }
  
  return { type: 'move', destination: moveTarget };
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

/**
 * Find the closest monster to a hero that is NOT on the hero's tile.
 * Used for the "Wrath of the Enemy" curse effect.
 * 
 * Uses Manhattan distance to determine which monster is closest.
 * 
 * @param heroPos The hero's position
 * @param monsters All monsters on the board
 * @param dungeon Dungeon state
 * @returns The closest monster not on hero's tile (by Manhattan distance), or null if none found
 */
export function findClosestMonsterNotOnTile(
  heroPos: Position,
  monsters: MonsterState[],
  dungeon: DungeonState
): MonsterState | null {
  if (monsters.length === 0) return null;
  
  // Find which tile the hero is on
  const heroTile = findTileAtPosition(heroPos, dungeon);
  if (!heroTile) return null;
  
  // Filter monsters not on the hero's tile
  const monstersNotOnTile = monsters.filter(monster => {
    const monsterGlobal = getMonsterGlobalPosition(monster, dungeon);
    if (!monsterGlobal) return false;
    
    // Check if monster is on a different tile than the hero
    const monsterTile = findTileAtPosition(monsterGlobal, dungeon);
    if (!monsterTile) return false;
    
    // Compare tile IDs (handles both regular tiles and start tile sub-tiles)
    return heroTile.id !== monsterTile.id;
  });
  
  if (monstersNotOnTile.length === 0) return null;
  
  // Find the closest monster using Manhattan distance
  let closestMonster: MonsterState | null = null;
  let closestDistance = Infinity;
  
  for (const monster of monstersNotOnTile) {
    const monsterGlobal = getMonsterGlobalPosition(monster, dungeon);
    if (!monsterGlobal) continue;
    
    // Calculate Manhattan distance
    const distance = getManhattanDistance(heroPos, monsterGlobal);
    
    if (distance < closestDistance) {
      closestDistance = distance;
      closestMonster = monster;
    }
  }
  
  return closestMonster;
}

/**
 * Check if any hero is on the same tile as the monster.
 * Used for explore-or-attack behavior to determine if monster should explore.
 * 
 * @param monster The monster to check
 * @param heroTokens All hero tokens on the board
 * @param dungeon Dungeon state
 * @returns true if at least one hero is on the same tile as the monster
 */
export function isHeroOnMonsterTile(
  monster: MonsterState,
  heroTokens: HeroToken[],
  dungeon: DungeonState
): boolean {
  const monsterTile = dungeon.tiles.find(t => t.id === monster.tileId);
  if (!monsterTile) return false;
  
  for (const hero of heroTokens) {
    const heroTile = findTileAtPosition(hero.position, dungeon);
    if (heroTile && heroTile.id === monster.tileId) {
      return true;
    }
  }
  
  return false;
}

/**
 * Find an unexplored edge on the monster's tile.
 * Used for explore-or-attack behavior.
 * 
 * @param monster The monster looking for an unexplored edge
 * @param dungeon Dungeon state
 * @returns The first unexplored edge on the monster's tile, or null if none
 */
export function findUnexploredEdgeOnMonsterTile(
  monster: MonsterState,
  dungeon: DungeonState
): TileEdge | null {
  // Find unexplored edges on the monster's tile
  const unexploredEdges = dungeon.unexploredEdges.filter(
    edge => edge.tileId === monster.tileId
  );
  
  // Return the first unexplored edge (monster will automatically explore it)
  return unexploredEdges.length > 0 ? unexploredEdges[0] : null;
}
