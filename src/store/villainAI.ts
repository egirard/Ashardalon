/**
 * Villain AI — turn execution for scenario villains (Malphas, Vraxos, etc.)
 *
 * The villain activates once per hero turn during the Villain Phase, after all
 * regular monsters controlled by that hero have been activated.  Tactics are
 * evaluated in order; the first matching condition fires.
 */

import type {
  VillainInstance,
  VillainDefinition,
  VillainTactic,
  MonsterState,
  HeroToken,
  DungeonState,
  Position,
  AttackResult,
} from './types';
import { VILLAIN_DEFINITIONS } from './types';
import { arePositionsAdjacent, rollD20 } from './combat';
import { getTileBounds, getAdjacentPositions, findTileAtPosition } from './movement';

/**
 * A tile is 4 × 4 squares; used for tactic range comparisons.
 */
const SQUARES_PER_TILE = 4;

// ---------------------------------------------------------------------------
// Helper: get villain global position
// ---------------------------------------------------------------------------

export function getVillainGlobalPosition(
  villain: VillainInstance,
  dungeon: DungeonState
): Position | null {
  const tile = dungeon.tiles.find(t => t.id === villain.tileId);
  if (!tile) return null;
  const bounds = getTileBounds(tile);
  return {
    x: bounds.minX + villain.position.x,
    y: bounds.minY + villain.position.y,
  };
}

// ---------------------------------------------------------------------------
// Helper: BFS distance from villain to a position
// ---------------------------------------------------------------------------

function bfsDistance(
  from: Position,
  to: Position,
  dungeon: DungeonState
): number {
  const key = (p: Position) => `${p.x},${p.y}`;
  const visited = new Set<string>([key(from)]);
  const queue: { pos: Position; dist: number }[] = [{ pos: from, dist: 0 }];

  while (queue.length > 0) {
    const { pos, dist } = queue.shift()!;
    if (pos.x === to.x && pos.y === to.y) return dist;

    for (const adj of getAdjacentPositions(pos, dungeon)) {
      const k = key(adj);
      if (!visited.has(k)) {
        visited.add(k);
        queue.push({ pos: adj, dist: dist + 1 });
      }
    }
  }

  return Infinity;
}

// ---------------------------------------------------------------------------
// Helper: distance in tiles from villain to each hero
// ---------------------------------------------------------------------------

function distanceInTiles(squareDistance: number): number {
  return squareDistance / SQUARES_PER_TILE;
}

// ---------------------------------------------------------------------------
// Helper: find the closest alive hero
// ---------------------------------------------------------------------------

function findClosestAliveHero(
  villainGlobal: Position,
  heroTokens: HeroToken[],
  heroHpMap: Record<string, number>,
  dungeon: DungeonState
): { hero: HeroToken; squareDist: number } | null {
  let best: { hero: HeroToken; squareDist: number } | null = null;

  for (const hero of heroTokens) {
    const hp = heroHpMap[hero.heroId];
    if (hp === undefined || hp <= 0) continue;

    const dist = bfsDistance(villainGlobal, hero.position, dungeon);
    if (best === null || dist < best.squareDist) {
      best = { hero, squareDist: dist };
    }
  }

  return best;
}

// ---------------------------------------------------------------------------
// Helper: find all alive heroes within a given tile range (BFS square distance)
// ---------------------------------------------------------------------------

function heroesWithinRange(
  villainGlobal: Position,
  heroTokens: HeroToken[],
  heroHpMap: Record<string, number>,
  dungeon: DungeonState,
  maxTiles: number
): HeroToken[] {
  const maxSquares = maxTiles * SQUARES_PER_TILE;
  return heroTokens.filter(hero => {
    const hp = heroHpMap[hero.heroId];
    if (hp === undefined || hp <= 0) return false;
    const dist = bfsDistance(villainGlobal, hero.position, dungeon);
    return dist <= maxSquares;
  });
}

// ---------------------------------------------------------------------------
// Helper: find all alive heroes on the villain's tile or adjacent tiles
// ---------------------------------------------------------------------------

function heroesOnOrAdjacentToVillainTile(
  villainGlobal: Position,
  heroTokens: HeroToken[],
  heroHpMap: Record<string, number>,
  dungeon: DungeonState
): HeroToken[] {
  return heroTokens.filter(hero => {
    const hp = heroHpMap[hero.heroId];
    if (hp === undefined || hp <= 0) return false;
    // Check if hero is on the same tile or an adjacent square to the villain
    return arePositionsAdjacent(villainGlobal, hero.position) ||
           (hero.position.x === villainGlobal.x && hero.position.y === villainGlobal.y);
  });
}

// ---------------------------------------------------------------------------
// Helper: resolve an attack roll for the villain
// ---------------------------------------------------------------------------

function resolveVillainAttack(
  tactic: VillainTactic,
  targetAC: number,
  randomFn: () => number
): AttackResult {
  const roll = rollD20(randomFn);
  const total = roll + tactic.attackBonus;
  const isHit = roll === 20 || total >= targetAC;
  return {
    roll,
    attackBonus: tactic.attackBonus,
    total,
    targetAC,
    isHit,
    damage: isHit ? tactic.damage : 0,
    isCritical: roll === 20,
  };
}

// ---------------------------------------------------------------------------
// Helper: find the best move position toward a target
// ---------------------------------------------------------------------------

function findMoveToward(
  from: Position,
  to: Position,
  dungeon: DungeonState
): Position {
  const adjacent = getAdjacentPositions(from, dungeon);
  if (adjacent.length === 0) return from;

  let best = adjacent[0];
  let bestDist = bfsDistance(best, to, dungeon);

  for (const pos of adjacent.slice(1)) {
    const d = bfsDistance(pos, to, dungeon);
    if (d < bestDist) {
      bestDist = d;
      best = pos;
    }
  }

  return best;
}

// ---------------------------------------------------------------------------
// Check: is the villain currently shielded (guards adjacent)?
// ---------------------------------------------------------------------------

/**
 * Return true if Malphas's shield is active — i.e. at least one regular monster
 * occupies the villain's tile or a directly adjacent square.
 */
export function isVillainShielded(
  villain: VillainInstance,
  villainDef: VillainDefinition,
  monsters: MonsterState[],
  dungeon: DungeonState
): boolean {
  if (!villainDef.shieldedWhileGuardsAdjacent) return false;

  const villainGlobal = getVillainGlobalPosition(villain, dungeon);
  if (!villainGlobal) return false;

  for (const m of monsters) {
    const tile = dungeon.tiles.find(t => t.id === m.tileId);
    if (!tile) continue;
    const bounds = getTileBounds(tile);
    const mGlobal: Position = {
      x: bounds.minX + m.position.x,
      y: bounds.minY + m.position.y,
    };

    if (
      (mGlobal.x === villainGlobal.x && mGlobal.y === villainGlobal.y) ||
      arePositionsAdjacent(villainGlobal, mGlobal)
    ) {
      return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Villain activation result type
// ---------------------------------------------------------------------------

export type VillainActivationResult =
  | { type: 'idle' }                      // No heroes reachable / already done
  | { type: 'move'; destination: Position; newTileId: string }
  | {
      type: 'attack';
      tacticName: string;
      targetHeroIds: string[];
      results: AttackResult[];
      newPosition?: Position;
      newTileId?: string;
    }
  | { type: 'spawn-monster'; destination: Position; newTileId: string }
  | { type: 'auto-damage'; targetHeroIds: string[]; damage: number; newPosition: Position; newTileId: string };

// ---------------------------------------------------------------------------
// Main: execute villain turn
// ---------------------------------------------------------------------------

/**
 * Execute the villain's turn for the current hero phase.
 *
 * Returns a `VillainActivationResult` describing what happened.  The caller
 * (gameSlice reducer) is responsible for applying the result to game state.
 *
 * @param villain      Current villain instance state.
 * @param heroTokens   All hero tokens on the board.
 * @param heroHpMap    Map of heroId → currentHp.
 * @param heroAcMap    Map of heroId → AC.
 * @param monsters     All regular monsters on the board (for shield check).
 * @param dungeon      Current dungeon state.
 * @param randomFn     RNG (defaults to Math.random).
 */
export function executeVillainTurn(
  villain: VillainInstance,
  heroTokens: HeroToken[],
  heroHpMap: Record<string, number>,
  heroAcMap: Record<string, number>,
  monsters: MonsterState[],
  dungeon: DungeonState,
  randomFn: () => number = Math.random
): VillainActivationResult {
  const def = VILLAIN_DEFINITIONS.find(d => d.id === villain.villainId);
  if (!def) return { type: 'idle' };

  const villainGlobal = getVillainGlobalPosition(villain, dungeon);
  if (!villainGlobal) return { type: 'idle' };

  // Find closest alive hero to determine which tactic applies
  const closest = findClosestAliveHero(villainGlobal, heroTokens, heroHpMap, dungeon);
  if (!closest) return { type: 'idle' };

  // Evaluate tactics in order; first matching tactic fires
  for (const tactic of def.tactics) {
    // maxRangeTiles: 0 means "adjacent (1 square)", otherwise N tiles = N*4 squares
    const maxSquareDist = tactic.maxRangeTiles === Infinity
      ? Infinity
      : tactic.maxRangeTiles === 0
        ? 1
        : tactic.maxRangeTiles * SQUARES_PER_TILE;
    if (closest.squareDist > maxSquareDist) continue;

    // ---- Fallback: spawn-monster tactic ----
    if (tactic.spawnMonster) {
      // Move one step toward closest hero first
      let finalPos = villainGlobal;
      let finalTileId = villain.tileId;

      if (tactic.moveBefore) {
        const dest = findMoveToward(villainGlobal, closest.hero.position, dungeon);
        finalPos = dest;
        const destTile = findTileAtPosition(dest, dungeon);
        finalTileId = destTile?.id ?? villain.tileId;
      }

      return { type: 'spawn-monster', destination: finalPos, newTileId: finalTileId };
    }

    // ---- Charge / auto-damage tactic (Vraxos "Otherwise") ----
    if (tactic.autoAdjacentDamage !== undefined && tactic.attackBonus === 0 && tactic.damage === 0) {
      let finalPos = villainGlobal;
      let finalTileId = villain.tileId;

      // Move up to 2 steps (2 tiles) toward closest hero
      for (let step = 0; step < 2; step++) {
        const dest = findMoveToward(finalPos, closest.hero.position, dungeon);
        if (dest.x === finalPos.x && dest.y === finalPos.y) break;
        finalPos = dest;
        const destTile = findTileAtPosition(finalPos, dungeon);
        finalTileId = destTile?.id ?? finalTileId;
      }

      // Check if villain ended up adjacent to any hero
      const adjacentHeroes = heroTokens.filter(h => {
        const hp = heroHpMap[h.heroId];
        if (hp === undefined || hp <= 0) return false;
        return arePositionsAdjacent(finalPos, h.position) ||
               (h.position.x === finalPos.x && h.position.y === finalPos.y);
      });

      if (adjacentHeroes.length > 0) {
        return {
          type: 'auto-damage',
          targetHeroIds: adjacentHeroes.map(h => h.heroId),
          damage: tactic.autoAdjacentDamage,
          newPosition: finalPos,
          newTileId: finalTileId,
        };
      }

      // Moved but didn't end adjacent — just report the move
      return { type: 'move', destination: finalPos, newTileId: finalTileId };
    }

    // ---- Regular attack tactic ----
    let finalPos = villainGlobal;
    let finalTileId = villain.tileId;

    // Move toward closest hero if the tactic requires it
    if (tactic.moveBefore) {
      const dest = findMoveToward(villainGlobal, closest.hero.position, dungeon);
      finalPos = dest;
      const destTile = findTileAtPosition(dest, dungeon);
      finalTileId = destTile?.id ?? villain.tileId;
    }

    // Determine attack targets based on AOE pattern
    let targets: HeroToken[] = [];

    if (tactic.aoe === 'adjacent-tiles') {
      targets = heroesOnOrAdjacentToVillainTile(finalPos, heroTokens, heroHpMap, dungeon);
    } else if (tactic.aoe === 'within-range') {
      targets = heroesWithinRange(finalPos, heroTokens, heroHpMap, dungeon, tactic.maxRangeTiles);
    } else {
      // 'self-tile' or 'single' — target closest hero (re-evaluate from finalPos)
      const closestFromFinal = findClosestAliveHero(finalPos, heroTokens, heroHpMap, dungeon);
      if (closestFromFinal) {
        targets = [closestFromFinal.hero];
      }
    }

    if (targets.length === 0) continue;

    // Roll attacks for each target
    const results: AttackResult[] = targets.map(hero => {
      const ac = heroAcMap[hero.heroId] ?? 10;
      return resolveVillainAttack(tactic, ac, randomFn);
    });

    return {
      type: 'attack',
      tacticName: tactic.name,
      targetHeroIds: targets.map(h => h.heroId),
      results,
      newPosition: tactic.moveBefore ? finalPos : undefined,
      newTileId: tactic.moveBefore ? finalTileId : undefined,
    };
  }

  return { type: 'idle' };
}

/**
 * Calculate total HP for a villain based on number of heroes.
 *
 * Formula: baseHp + (heroCount - 1) * perHeroHp
 */
export function calculateVillainHp(def: VillainDefinition, heroCount: number): number {
  return def.baseHp + Math.max(0, heroCount - 1) * def.perHeroHp;
}

/**
 * Look up the VillainDefinition for the given scenario ID.
 * Returns undefined if the scenario has no villain.
 */
export function getVillainDefForScenario(scenarioId: string): VillainDefinition | undefined {
  const mapping: Record<string, string> = {
    'adventure-14': 'malphas',
    'adventure-15': 'vraxos',
  };
  const villainId = mapping[scenarioId];
  if (!villainId) return undefined;
  return VILLAIN_DEFINITIONS.find(d => d.id === villainId);
}
