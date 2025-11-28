import type { HeroAttack, AttackResult, Position, MonsterState } from './types';
import { getMonsterById } from './monsters';

/**
 * Roll a d20 (1-20)
 * @param randomFn Optional random function for deterministic testing
 */
export function rollD20(randomFn: () => number = Math.random): number {
  return Math.floor(randomFn() * 20) + 1;
}

/**
 * Resolve an attack against a monster
 * @param attack The hero's attack stats
 * @param targetAC The monster's armor class
 * @param randomFn Optional random function for deterministic testing
 */
export function resolveAttack(
  attack: HeroAttack,
  targetAC: number,
  randomFn: () => number = Math.random
): AttackResult {
  const roll = rollD20(randomFn);
  const total = roll + attack.attackBonus;
  // Natural 20 always hits, otherwise must meet or beat AC
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
 * Check if two positions are adjacent (within 1 square orthogonally or diagonally)
 */
export function arePositionsAdjacent(pos1: Position, pos2: Position): boolean {
  const dx = Math.abs(pos1.x - pos2.x);
  const dy = Math.abs(pos1.y - pos2.y);
  // Adjacent means within 1 square in any direction (including diagonals)
  // but not the same position
  return dx <= 1 && dy <= 1 && (dx > 0 || dy > 0);
}

/**
 * Get the AC for a monster by its ID
 */
export function getMonsterAC(monsterId: string): number | undefined {
  return getMonsterById(monsterId)?.ac;
}

/**
 * Find all monsters adjacent to a given position
 */
export function getAdjacentMonsters(
  position: Position,
  monsters: MonsterState[],
  tileId: string
): MonsterState[] {
  return monsters.filter(monster => 
    monster.tileId === tileId && arePositionsAdjacent(position, monster.position)
  );
}
