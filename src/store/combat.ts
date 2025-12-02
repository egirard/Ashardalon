import type { HeroAttack, AttackResult, Position, MonsterState, DungeonState, PlacedTile, HeroHpState, PartyResources, HeroLevel } from './types';
import { HERO_LEVELS, LEVEL_UP_COST } from './types';
import { getMonsterById } from './monsters';
import { getTileBounds, findTileAtPosition } from './movement';
import {
  getAttackBonusFromItems,
  getAcBonusFromItems,
  getSpeedBonusFromItems,
  getDamageBonusFromItems,
  type HeroInventory,
} from './treasure';

/**
 * Check if a hero needs a healing surge (at 0 HP with surges available)
 */
export function checkHealingSurgeNeeded(
  heroState: HeroHpState,
  resources: PartyResources
): boolean {
  return heroState.currentHp === 0 && resources.healingSurges > 0;
}

/**
 * Check if the party is defeated (hero at 0 HP with no surges remaining)
 * This should be checked at the start of a hero's turn
 */
export function checkPartyDefeat(
  heroState: HeroHpState,
  resources: PartyResources
): boolean {
  return heroState.currentHp === 0 && resources.healingSurges === 0;
}

/**
 * Use a healing surge to restore hero HP
 * @param heroState Current hero HP state
 * @param resources Current party resources
 * @returns Updated hero state and party resources
 */
export function useHealingSurge(
  heroState: HeroHpState,
  resources: PartyResources
): { heroState: HeroHpState; resources: PartyResources } {
  const surgeValue = heroState.surgeValue;
  
  return {
    heroState: {
      ...heroState,
      currentHp: Math.min(surgeValue, heroState.maxHp),
    },
    resources: {
      ...resources,
      healingSurges: resources.healingSurges - 1,
    },
  };
}

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
 * Create an attack with bonuses from equipped items applied
 * @param baseAttack The hero's base attack stats
 * @param inventory The hero's inventory with equipped items
 * @returns Attack with bonuses applied
 */
export function applyItemBonusesToAttack(
  baseAttack: HeroAttack,
  inventory: HeroInventory | undefined
): HeroAttack {
  if (!inventory) {
    return baseAttack;
  }

  return {
    attackBonus: baseAttack.attackBonus + getAttackBonusFromItems(inventory),
    damage: baseAttack.damage + getDamageBonusFromItems(inventory),
  };
}

/**
 * Calculate total AC including item bonuses
 * @param baseAC The hero's base AC
 * @param inventory The hero's inventory with equipped items
 * @returns Total AC with bonuses applied
 */
export function calculateTotalAC(
  baseAC: number,
  inventory: HeroInventory | undefined
): number {
  if (!inventory) {
    return baseAC;
  }
  return baseAC + getAcBonusFromItems(inventory);
}

/**
 * Calculate total speed including item bonuses
 * @param baseSpeed The hero's base speed
 * @param inventory The hero's inventory with equipped items
 * @returns Total speed with bonuses applied
 */
export function calculateTotalSpeed(
  baseSpeed: number,
  inventory: HeroInventory | undefined
): number {
  if (!inventory) {
    return baseSpeed;
  }
  return baseSpeed + getSpeedBonusFromItems(inventory);
}

/**
 * Check if a hero can level up
 * Requirements: hero is level 1, roll is natural 20, and party has 5+ XP
 */
export function canLevelUp(
  heroState: HeroHpState,
  roll: number,
  resources: PartyResources
): boolean {
  return heroState.level === 1 && 
         roll === 20 && 
         resources.xp >= LEVEL_UP_COST;
}

/**
 * Level up a hero from level 1 to level 2
 * Updates hero stats and deducts XP from party resources
 * @param heroState Current hero HP state
 * @param resources Current party resources
 * @returns Updated hero state and party resources
 */
export function levelUpHero(
  heroState: HeroHpState,
  resources: PartyResources
): { heroState: HeroHpState; resources: PartyResources } {
  const heroLevels = HERO_LEVELS[heroState.heroId];
  if (!heroLevels) {
    // Log warning and return unchanged - this indicates a configuration error
    console.warn(`Hero levels not found for heroId: ${heroState.heroId}. Level up skipped.`);
    return { heroState, resources };
  }
  
  const level2Stats = heroLevels.level2;
  const currentDamage = heroState.maxHp - heroState.currentHp; // Preserve damage taken
  
  return {
    heroState: {
      ...heroState,
      level: 2 as HeroLevel,
      maxHp: level2Stats.maxHp,
      currentHp: Math.max(1, level2Stats.maxHp - currentDamage), // Keep same damage, minimum 1 HP
      ac: level2Stats.ac,
      surgeValue: level2Stats.surgeValue,
      attackBonus: level2Stats.attackBonus,
    },
    resources: {
      ...resources,
      xp: resources.xp - LEVEL_UP_COST,
    },
  };
}

/**
 * Calculate damage for an attack, including critical hit bonus for level 2 heroes
 * Level 2 heroes deal +1 damage on natural 20 rolls
 */
export function calculateDamage(
  heroLevel: HeroLevel,
  roll: number,
  baseDamage: number
): number {
  if (roll === 20 && heroLevel === 2) {
    return baseDamage + 1; // Critical attack bonus for level 2
  }
  return baseDamage;
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
 * Find all monsters adjacent to a given global position
 * @param position Hero's global position
 * @param monsters List of monsters (with local tile positions)
 * @param dungeon Dungeon state for coordinate conversion
 */
export function getAdjacentMonsters(
  position: Position,
  monsters: MonsterState[],
  tileId: string,
  dungeon?: DungeonState
): MonsterState[] {
  // Legacy behavior: if no dungeon provided, compare positions directly (for backward compatibility)
  if (!dungeon) {
    return monsters.filter(monster => 
      monster.tileId === tileId && arePositionsAdjacent(position, monster.position)
    );
  }
  
  // Find which tile the hero is on
  const heroTile = findTileAtPosition(position, dungeon);
  if (!heroTile) return [];
  
  // Find monsters that are adjacent in global coordinates
  return monsters.filter(monster => {
    // Convert monster's local position to global coordinates
    const monsterGlobalPos = getMonsterGlobalPosition(monster, dungeon);
    if (!monsterGlobalPos) return false;
    
    // Check if the hero and monster are adjacent in global coordinates
    return arePositionsAdjacent(position, monsterGlobalPos);
  });
}
