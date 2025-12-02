import { describe, it, expect } from 'vitest';
import { rollD20, resolveAttack, arePositionsAdjacent, getAdjacentMonsters, getMonsterAC, canLevelUp, levelUpHero, calculateDamage, checkHealingSurgeNeeded, useHealingSurge, checkPartyDefeat, applyItemBonusesToAttack, calculateTotalAC, calculateTotalSpeed } from './combat';
import type { HeroAttack, MonsterState, HeroHpState, PartyResources } from './types';
import type { HeroInventory } from './treasure';

describe('rollD20', () => {
  it('should return values between 1 and 20', () => {
    // Test with deterministic random function
    for (let i = 0; i < 20; i++) {
      const randomFn = () => i / 20; // 0, 0.05, 0.1, ... 0.95
      const result = rollD20(randomFn);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(20);
    }
  });

  it('should return 1 when random returns 0', () => {
    const randomFn = () => 0;
    expect(rollD20(randomFn)).toBe(1);
  });

  it('should return 20 when random returns 0.999...', () => {
    const randomFn = () => 0.999;
    expect(rollD20(randomFn)).toBe(20);
  });

  it('should produce different results with different random values', () => {
    const results = new Set<number>();
    for (let i = 0; i < 20; i++) {
      const randomFn = () => i / 20;
      results.add(rollD20(randomFn));
    }
    // Should have at least a few different results
    expect(results.size).toBeGreaterThan(1);
  });
});

describe('resolveAttack', () => {
  const quinnAttack: HeroAttack = { name: 'Mace', attackBonus: 6, damage: 2, range: 1 };
  const koboldAC = 14;

  it('should hit when roll + bonus >= AC', () => {
    // Roll 10 + bonus 6 = 16 >= 14
    const randomFn = () => 0.45; // (0.45 * 20) + 1 = 10
    const result = resolveAttack(quinnAttack, koboldAC, randomFn);
    
    expect(result.roll).toBe(10);
    expect(result.attackBonus).toBe(6);
    expect(result.total).toBe(16);
    expect(result.targetAC).toBe(14);
    expect(result.isHit).toBe(true);
    expect(result.damage).toBe(2);
    expect(result.isCritical).toBe(false);
  });

  it('should miss when roll + bonus < AC', () => {
    // Roll 2 + bonus 6 = 8 < 14
    const randomFn = () => 0.05; // (0.05 * 20) + 1 = 2
    const result = resolveAttack(quinnAttack, koboldAC, randomFn);
    
    expect(result.roll).toBe(2);
    expect(result.total).toBe(8);
    expect(result.isHit).toBe(false);
    expect(result.damage).toBe(0);
    expect(result.isCritical).toBe(false);
  });

  it('should always hit on natural 20 (critical hit)', () => {
    const randomFn = () => 0.999; // Roll 20
    const result = resolveAttack(quinnAttack, 30, randomFn); // AC higher than possible total
    
    expect(result.roll).toBe(20);
    expect(result.isHit).toBe(true);
    expect(result.isCritical).toBe(true);
    expect(result.damage).toBe(2);
  });

  it('should hit when roll + bonus equals AC exactly', () => {
    // Need roll + 6 = 14, so roll = 8
    const randomFn = () => 0.35; // (0.35 * 20) + 1 = 8
    const result = resolveAttack(quinnAttack, koboldAC, randomFn);
    
    expect(result.roll).toBe(8);
    expect(result.total).toBe(14);
    expect(result.isHit).toBe(true);
    expect(result.damage).toBe(2);
  });

  it('should miss when total is one less than AC', () => {
    // Need roll + 6 = 13, so roll = 7
    const randomFn = () => 0.3; // (0.3 * 20) + 1 = 7
    const result = resolveAttack(quinnAttack, koboldAC, randomFn);
    
    expect(result.roll).toBe(7);
    expect(result.total).toBe(13);
    expect(result.isHit).toBe(false);
    expect(result.damage).toBe(0);
  });

  it('should handle different attack bonuses', () => {
    const vistraAttack: HeroAttack = { name: 'Warhammer', attackBonus: 8, damage: 2, range: 1 };
    // Roll 5 + bonus 8 = 13 < 14
    const randomFn = () => 0.2; // (0.2 * 20) + 1 = 5
    const result = resolveAttack(vistraAttack, koboldAC, randomFn);
    
    expect(result.roll).toBe(5);
    expect(result.attackBonus).toBe(8);
    expect(result.total).toBe(13);
    expect(result.isHit).toBe(false);
  });

  it('should handle different damage values', () => {
    const haskanAttack: HeroAttack = { name: 'Quarterstaff', attackBonus: 4, damage: 1, range: 1 };
    // Roll 15 + bonus 4 = 19 >= 14
    const randomFn = () => 0.7; // (0.7 * 20) + 1 = 15
    const result = resolveAttack(haskanAttack, koboldAC, randomFn);
    
    expect(result.isHit).toBe(true);
    expect(result.damage).toBe(1);
  });
});

describe('canLevelUp', () => {
  const level1Hero: HeroHpState = {
    heroId: 'quinn',
    currentHp: 8,
    maxHp: 8,
    level: 1,
    ac: 17,
    surgeValue: 4,
    attackBonus: 6,
  };

  const level2Hero: HeroHpState = {
    heroId: 'quinn',
    currentHp: 10,
    maxHp: 10,
    level: 2,
    ac: 18,
    surgeValue: 5,
    attackBonus: 7,
  };

  it('should return true on nat 20 with 5+ XP for level 1 hero', () => {
    const resources: PartyResources = { xp: 5, healingSurges: 2 };
    expect(canLevelUp(level1Hero, 20, resources)).toBe(true);
  });

  it('should return true on nat 20 with more than 5 XP', () => {
    const resources: PartyResources = { xp: 10, healingSurges: 2 };
    expect(canLevelUp(level1Hero, 20, resources)).toBe(true);
  });

  it('should return false for level 2 heroes', () => {
    const resources: PartyResources = { xp: 5, healingSurges: 2 };
    expect(canLevelUp(level2Hero, 20, resources)).toBe(false);
  });

  it('should return false when XP < 5', () => {
    const resources: PartyResources = { xp: 4, healingSurges: 2 };
    expect(canLevelUp(level1Hero, 20, resources)).toBe(false);
  });

  it('should return false when XP is 0', () => {
    const resources: PartyResources = { xp: 0, healingSurges: 2 };
    expect(canLevelUp(level1Hero, 20, resources)).toBe(false);
  });

  it('should return false when roll is not 20', () => {
    const resources: PartyResources = { xp: 5, healingSurges: 2 };
    expect(canLevelUp(level1Hero, 19, resources)).toBe(false);
    expect(canLevelUp(level1Hero, 10, resources)).toBe(false);
    expect(canLevelUp(level1Hero, 1, resources)).toBe(false);
  });
});

describe('levelUpHero', () => {
  it('should update Quinn stats correctly on level up', () => {
    const hero: HeroHpState = {
      heroId: 'quinn',
      currentHp: 8,
      maxHp: 8,
      level: 1,
      ac: 17,
      surgeValue: 4,
      attackBonus: 6,
    };
    const resources: PartyResources = { xp: 7, healingSurges: 2 };

    const result = levelUpHero(hero, resources);

    expect(result.heroState.level).toBe(2);
    expect(result.heroState.maxHp).toBe(10);
    expect(result.heroState.currentHp).toBe(10);
    expect(result.heroState.ac).toBe(18);
    expect(result.heroState.surgeValue).toBe(5);
    expect(result.heroState.attackBonus).toBe(7);
  });

  it('should preserve damage taken on level up', () => {
    const hero: HeroHpState = {
      heroId: 'quinn',
      currentHp: 5, // 3 damage taken (8 - 5 = 3)
      maxHp: 8,
      level: 1,
      ac: 17,
      surgeValue: 4,
      attackBonus: 6,
    };
    const resources: PartyResources = { xp: 5, healingSurges: 2 };

    const result = levelUpHero(hero, resources);

    // New max HP is 10, with 3 damage taken = 7 HP
    expect(result.heroState.maxHp).toBe(10);
    expect(result.heroState.currentHp).toBe(7);
  });

  it('should deduct 5 XP on level up', () => {
    const hero: HeroHpState = {
      heroId: 'quinn',
      currentHp: 8,
      maxHp: 8,
      level: 1,
      ac: 17,
      surgeValue: 4,
      attackBonus: 6,
    };
    const resources: PartyResources = { xp: 7, healingSurges: 2 };

    const result = levelUpHero(hero, resources);

    expect(result.resources.xp).toBe(2); // 7 - 5 = 2
  });

  it('should preserve healing surges on level up', () => {
    const hero: HeroHpState = {
      heroId: 'quinn',
      currentHp: 8,
      maxHp: 8,
      level: 1,
      ac: 17,
      surgeValue: 4,
      attackBonus: 6,
    };
    const resources: PartyResources = { xp: 5, healingSurges: 3 };

    const result = levelUpHero(hero, resources);

    expect(result.resources.healingSurges).toBe(3);
  });

  it('should update Vistra stats correctly on level up', () => {
    const hero: HeroHpState = {
      heroId: 'vistra',
      currentHp: 10,
      maxHp: 10,
      level: 1,
      ac: 18,
      surgeValue: 5,
      attackBonus: 8,
    };
    const resources: PartyResources = { xp: 5, healingSurges: 2 };

    const result = levelUpHero(hero, resources);

    expect(result.heroState.level).toBe(2);
    expect(result.heroState.maxHp).toBe(12);
    expect(result.heroState.ac).toBe(19);
    expect(result.heroState.surgeValue).toBe(6);
    expect(result.heroState.attackBonus).toBe(9);
  });

  it('should ensure minimum 1 HP after level up with heavy damage', () => {
    const hero: HeroHpState = {
      heroId: 'quinn',
      currentHp: 1, // 7 damage taken (8 - 1 = 7)
      maxHp: 8,
      level: 1,
      ac: 17,
      surgeValue: 4,
      attackBonus: 6,
    };
    const resources: PartyResources = { xp: 5, healingSurges: 2 };

    const result = levelUpHero(hero, resources);

    // New max HP is 10, with 7 damage taken would be 3 HP
    expect(result.heroState.maxHp).toBe(10);
    expect(result.heroState.currentHp).toBe(3);
  });
});

describe('calculateDamage', () => {
  it('should return base damage for level 1 hero on any roll', () => {
    expect(calculateDamage(1, 20, 2)).toBe(2);
    expect(calculateDamage(1, 15, 2)).toBe(2);
    expect(calculateDamage(1, 1, 2)).toBe(2);
  });

  it('should return base damage +1 for level 2 hero on natural 20', () => {
    expect(calculateDamage(2, 20, 2)).toBe(3);
    expect(calculateDamage(2, 20, 1)).toBe(2);
  });

  it('should return base damage for level 2 hero on non-20 rolls', () => {
    expect(calculateDamage(2, 19, 2)).toBe(2);
    expect(calculateDamage(2, 10, 2)).toBe(2);
    expect(calculateDamage(2, 1, 2)).toBe(2);
  });
});

describe('arePositionsAdjacent', () => {
  it('should return true for orthogonally adjacent positions', () => {
    const center = { x: 2, y: 2 };
    
    expect(arePositionsAdjacent(center, { x: 2, y: 1 })).toBe(true); // North
    expect(arePositionsAdjacent(center, { x: 2, y: 3 })).toBe(true); // South
    expect(arePositionsAdjacent(center, { x: 1, y: 2 })).toBe(true); // West
    expect(arePositionsAdjacent(center, { x: 3, y: 2 })).toBe(true); // East
  });

  it('should return true for diagonally adjacent positions', () => {
    const center = { x: 2, y: 2 };
    
    expect(arePositionsAdjacent(center, { x: 1, y: 1 })).toBe(true); // NW
    expect(arePositionsAdjacent(center, { x: 3, y: 1 })).toBe(true); // NE
    expect(arePositionsAdjacent(center, { x: 1, y: 3 })).toBe(true); // SW
    expect(arePositionsAdjacent(center, { x: 3, y: 3 })).toBe(true); // SE
  });

  it('should return false for the same position', () => {
    const pos = { x: 2, y: 2 };
    expect(arePositionsAdjacent(pos, { x: 2, y: 2 })).toBe(false);
  });

  it('should return false for non-adjacent positions', () => {
    const center = { x: 2, y: 2 };
    
    expect(arePositionsAdjacent(center, { x: 4, y: 2 })).toBe(false); // 2 squares away
    expect(arePositionsAdjacent(center, { x: 2, y: 4 })).toBe(false);
    expect(arePositionsAdjacent(center, { x: 0, y: 0 })).toBe(false); // Diagonal 2 away
    expect(arePositionsAdjacent(center, { x: 5, y: 5 })).toBe(false);
  });

  it('should be symmetric', () => {
    const pos1 = { x: 2, y: 2 };
    const pos2 = { x: 3, y: 3 };
    
    expect(arePositionsAdjacent(pos1, pos2)).toBe(arePositionsAdjacent(pos2, pos1));
  });
});

describe('getMonsterAC', () => {
  it('should return correct AC for Kobold', () => {
    expect(getMonsterAC('kobold')).toBe(14);
  });

  it('should return correct AC for Snake', () => {
    expect(getMonsterAC('snake')).toBe(12);
  });

  it('should return correct AC for Cultist', () => {
    expect(getMonsterAC('cultist')).toBe(13);
  });

  it('should return undefined for unknown monster', () => {
    expect(getMonsterAC('dragon')).toBeUndefined();
  });
});

describe('getAdjacentMonsters', () => {
  const monsters: MonsterState[] = [
    { monsterId: 'kobold', instanceId: 'kobold-0', position: { x: 2, y: 1 }, currentHp: 1, controllerId: 'quinn', tileId: 'tile-1' },
    { monsterId: 'snake', instanceId: 'snake-0', position: { x: 5, y: 5 }, currentHp: 1, controllerId: 'quinn', tileId: 'tile-1' },
    { monsterId: 'cultist', instanceId: 'cultist-0', position: { x: 3, y: 2 }, currentHp: 2, controllerId: 'quinn', tileId: 'tile-1' },
    { monsterId: 'kobold', instanceId: 'kobold-1', position: { x: 2, y: 1 }, currentHp: 1, controllerId: 'quinn', tileId: 'tile-2' },
  ];

  it('should return adjacent monsters on the same tile', () => {
    const heroPos = { x: 2, y: 2 };
    const adjacent = getAdjacentMonsters(heroPos, monsters, 'tile-1');
    
    expect(adjacent).toHaveLength(2);
    expect(adjacent.map(m => m.instanceId)).toContain('kobold-0');
    expect(adjacent.map(m => m.instanceId)).toContain('cultist-0');
  });

  it('should not return monsters on different tiles', () => {
    const heroPos = { x: 2, y: 2 };
    const adjacent = getAdjacentMonsters(heroPos, monsters, 'tile-2');
    
    // kobold-1 is at position {2,1} on tile-2, which is adjacent to {2,2}
    expect(adjacent).toHaveLength(1);
    expect(adjacent[0].instanceId).toBe('kobold-1');
  });

  it('should return empty array when no monsters are adjacent', () => {
    const heroPos = { x: 0, y: 0 };
    const adjacent = getAdjacentMonsters(heroPos, monsters, 'tile-1');
    
    expect(adjacent).toHaveLength(0);
  });

  it('should return empty array when there are no monsters', () => {
    const heroPos = { x: 2, y: 2 };
    const adjacent = getAdjacentMonsters(heroPos, [], 'tile-1');
    
    expect(adjacent).toHaveLength(0);
  });
});

describe('checkHealingSurgeNeeded', () => {
  it('should return true when HP=0 and surges available', () => {
    const heroState: HeroHpState = {
      heroId: 'quinn',
      currentHp: 0,
      maxHp: 8,
      level: 1,
      ac: 17,
      surgeValue: 4,
      attackBonus: 6,
    };
    const resources: PartyResources = { xp: 0, healingSurges: 2 };
    
    expect(checkHealingSurgeNeeded(heroState, resources)).toBe(true);
  });

  it('should return false when HP > 0', () => {
    const heroState: HeroHpState = {
      heroId: 'quinn',
      currentHp: 1,
      maxHp: 8,
      level: 1,
      ac: 17,
      surgeValue: 4,
      attackBonus: 6,
    };
    const resources: PartyResources = { xp: 0, healingSurges: 2 };
    
    expect(checkHealingSurgeNeeded(heroState, resources)).toBe(false);
  });

  it('should return false when no surges available', () => {
    const heroState: HeroHpState = {
      heroId: 'quinn',
      currentHp: 0,
      maxHp: 8,
      level: 1,
      ac: 17,
      surgeValue: 4,
      attackBonus: 6,
    };
    const resources: PartyResources = { xp: 0, healingSurges: 0 };
    
    expect(checkHealingSurgeNeeded(heroState, resources)).toBe(false);
  });

  it('should return false when HP > 0 even at low HP', () => {
    const heroState: HeroHpState = {
      heroId: 'quinn',
      currentHp: 1,
      maxHp: 8,
      level: 1,
      ac: 17,
      surgeValue: 4,
      attackBonus: 6,
    };
    const resources: PartyResources = { xp: 0, healingSurges: 2 };
    
    expect(checkHealingSurgeNeeded(heroState, resources)).toBe(false);
  });
});

describe('useHealingSurge', () => {
  it('should restore HP to surge value', () => {
    const heroState: HeroHpState = {
      heroId: 'quinn',
      currentHp: 0,
      maxHp: 8,
      level: 1,
      ac: 17,
      surgeValue: 4,
      attackBonus: 6,
    };
    const resources: PartyResources = { xp: 5, healingSurges: 2 };

    const result = useHealingSurge(heroState, resources);

    expect(result.heroState.currentHp).toBe(4); // Quinn's surge value
    expect(result.resources.healingSurges).toBe(1); // Decreased by 1
  });

  it('should decrease surge count by 1', () => {
    const heroState: HeroHpState = {
      heroId: 'vistra',
      currentHp: 0,
      maxHp: 10,
      level: 1,
      ac: 18,
      surgeValue: 5,
      attackBonus: 8,
    };
    const resources: PartyResources = { xp: 3, healingSurges: 2 };

    const result = useHealingSurge(heroState, resources);

    expect(result.resources.healingSurges).toBe(1);
  });

  it('should not exceed maxHp when restoring', () => {
    // Edge case where surge value might exceed maxHp
    const heroState: HeroHpState = {
      heroId: 'haskan',
      currentHp: 0,
      maxHp: 6, // Wizard has 6 HP
      level: 1,
      ac: 14,
      surgeValue: 3, // Wizard's surge value is 3, lower than maxHp
      attackBonus: 4,
    };
    const resources: PartyResources = { xp: 0, healingSurges: 1 };

    const result = useHealingSurge(heroState, resources);

    expect(result.heroState.currentHp).toBe(3);
    expect(result.heroState.currentHp).toBeLessThanOrEqual(result.heroState.maxHp);
  });

  it('should preserve XP when using surge', () => {
    const heroState: HeroHpState = {
      heroId: 'quinn',
      currentHp: 0,
      maxHp: 8,
      level: 1,
      ac: 17,
      surgeValue: 4,
      attackBonus: 6,
    };
    const resources: PartyResources = { xp: 10, healingSurges: 2 };

    const result = useHealingSurge(heroState, resources);

    expect(result.resources.xp).toBe(10);
  });

  it('should work with different heroes and surge values', () => {
    // Test with Vistra (Fighter, surge value 5)
    const vistraState: HeroHpState = {
      heroId: 'vistra',
      currentHp: 0,
      maxHp: 10,
      level: 1,
      ac: 18,
      surgeValue: 5,
      attackBonus: 8,
    };
    const resources: PartyResources = { xp: 0, healingSurges: 2 };

    const result = useHealingSurge(vistraState, resources);

    expect(result.heroState.currentHp).toBe(5); // Vistra's surge value
  });
});

describe('checkPartyDefeat', () => {
  it('should return true when hero at 0 HP with 0 surges', () => {
    const heroState: HeroHpState = {
      heroId: 'quinn',
      currentHp: 0,
      maxHp: 8,
      level: 1,
      ac: 17,
      surgeValue: 4,
      attackBonus: 6,
    };
    const resources: PartyResources = { xp: 0, healingSurges: 0 };

    expect(checkPartyDefeat(heroState, resources)).toBe(true);
  });

  it('should return false when hero HP > 0', () => {
    const heroState: HeroHpState = {
      heroId: 'quinn',
      currentHp: 1,
      maxHp: 8,
      level: 1,
      ac: 17,
      surgeValue: 4,
      attackBonus: 6,
    };
    const resources: PartyResources = { xp: 0, healingSurges: 0 };

    expect(checkPartyDefeat(heroState, resources)).toBe(false);
  });

  it('should return false when surges > 0', () => {
    const heroState: HeroHpState = {
      heroId: 'quinn',
      currentHp: 0,
      maxHp: 8,
      level: 1,
      ac: 17,
      surgeValue: 4,
      attackBonus: 6,
    };
    const resources: PartyResources = { xp: 0, healingSurges: 1 };

    expect(checkPartyDefeat(heroState, resources)).toBe(false);
  });

  it('should return false when hero has full HP and no surges', () => {
    const heroState: HeroHpState = {
      heroId: 'quinn',
      currentHp: 8,
      maxHp: 8,
      level: 1,
      ac: 17,
      surgeValue: 4,
      attackBonus: 6,
    };
    const resources: PartyResources = { xp: 5, healingSurges: 0 };

    expect(checkPartyDefeat(heroState, resources)).toBe(false);
  });

  it('should return false when hero has HP and surges available', () => {
    const heroState: HeroHpState = {
      heroId: 'quinn',
      currentHp: 8,
      maxHp: 8,
      level: 1,
      ac: 17,
      surgeValue: 4,
      attackBonus: 6,
    };
    const resources: PartyResources = { xp: 0, healingSurges: 2 };

    expect(checkPartyDefeat(heroState, resources)).toBe(false);
  });
});

describe('applyItemBonusesToAttack', () => {
  it('should return base attack when inventory is undefined', () => {
    const baseAttack: HeroAttack = { attackBonus: 6, damage: 1 };
    const result = applyItemBonusesToAttack(baseAttack, undefined);
    expect(result).toEqual(baseAttack);
  });

  it('should return base attack when inventory has no items', () => {
    const baseAttack: HeroAttack = { attackBonus: 6, damage: 1 };
    const inventory: HeroInventory = { heroId: 'quinn', items: [] };
    const result = applyItemBonusesToAttack(baseAttack, inventory);
    expect(result.attackBonus).toBe(6);
    expect(result.damage).toBe(1);
  });

  it('should add attack bonus from +1 Magic Sword', () => {
    const baseAttack: HeroAttack = { attackBonus: 6, damage: 1 };
    // +1 Magic Sword (id: 134) gives +1 attack bonus
    const inventory: HeroInventory = { 
      heroId: 'quinn', 
      items: [{ cardId: 134, isFlipped: false }]
    };
    const result = applyItemBonusesToAttack(baseAttack, inventory);
    expect(result.attackBonus).toBe(7);
    expect(result.damage).toBe(1);
  });

  it('should add damage bonus from Gauntlets of Ogre Power', () => {
    const baseAttack: HeroAttack = { attackBonus: 6, damage: 1 };
    // Gauntlets of Ogre Power (id: 146) gives +1 damage
    const inventory: HeroInventory = { 
      heroId: 'quinn', 
      items: [{ cardId: 146, isFlipped: false }]
    };
    const result = applyItemBonusesToAttack(baseAttack, inventory);
    expect(result.attackBonus).toBe(6);
    expect(result.damage).toBe(2);
  });

  it('should stack multiple item bonuses', () => {
    const baseAttack: HeroAttack = { attackBonus: 6, damage: 1 };
    // +2 Magic Sword (id: 135) gives +2 attack bonus
    // Gauntlets of Ogre Power (id: 146) gives +1 damage
    const inventory: HeroInventory = { 
      heroId: 'quinn', 
      items: [
        { cardId: 135, isFlipped: false },
        { cardId: 146, isFlipped: false }
      ]
    };
    const result = applyItemBonusesToAttack(baseAttack, inventory);
    expect(result.attackBonus).toBe(8);
    expect(result.damage).toBe(2);
  });

  it('should not include bonuses from flipped items', () => {
    const baseAttack: HeroAttack = { attackBonus: 6, damage: 1 };
    const inventory: HeroInventory = { 
      heroId: 'quinn', 
      items: [{ cardId: 134, isFlipped: true }] // Used/flipped item
    };
    const result = applyItemBonusesToAttack(baseAttack, inventory);
    expect(result.attackBonus).toBe(6);
    expect(result.damage).toBe(1);
  });
});

describe('calculateTotalAC', () => {
  it('should return base AC when inventory is undefined', () => {
    expect(calculateTotalAC(17, undefined)).toBe(17);
  });

  it('should return base AC when inventory has no items', () => {
    const inventory: HeroInventory = { heroId: 'quinn', items: [] };
    expect(calculateTotalAC(17, inventory)).toBe(17);
  });

  it('should add AC bonus from Amulet of Protection', () => {
    // Amulet of Protection (id: 136) gives +1 AC
    const inventory: HeroInventory = { 
      heroId: 'quinn', 
      items: [{ cardId: 136, isFlipped: false }]
    };
    expect(calculateTotalAC(17, inventory)).toBe(18);
  });

  it('should stack AC bonuses from multiple items', () => {
    // Amulet of Protection (id: 136) gives +1 AC
    // Shield of Protection (id: 159) gives +1 AC
    const inventory: HeroInventory = { 
      heroId: 'quinn', 
      items: [
        { cardId: 136, isFlipped: false },
        { cardId: 159, isFlipped: false }
      ]
    };
    expect(calculateTotalAC(17, inventory)).toBe(19);
  });

  it('should not include bonus from flipped items', () => {
    const inventory: HeroInventory = { 
      heroId: 'quinn', 
      items: [{ cardId: 136, isFlipped: true }]
    };
    expect(calculateTotalAC(17, inventory)).toBe(17);
  });
});

describe('calculateTotalSpeed', () => {
  it('should return base speed when inventory is undefined', () => {
    expect(calculateTotalSpeed(6, undefined)).toBe(6);
  });

  it('should return base speed when inventory has no items', () => {
    const inventory: HeroInventory = { heroId: 'quinn', items: [] };
    expect(calculateTotalSpeed(6, inventory)).toBe(6);
  });

  it('should add speed bonus from Boots of Striding', () => {
    // Boots of Striding (id: 138) gives +1 speed
    const inventory: HeroInventory = { 
      heroId: 'quinn', 
      items: [{ cardId: 138, isFlipped: false }]
    };
    expect(calculateTotalSpeed(6, inventory)).toBe(7);
  });

  it('should not include bonus from flipped items', () => {
    const inventory: HeroInventory = { 
      heroId: 'quinn', 
      items: [{ cardId: 138, isFlipped: true }]
    };
    expect(calculateTotalSpeed(6, inventory)).toBe(6);
  });
});
