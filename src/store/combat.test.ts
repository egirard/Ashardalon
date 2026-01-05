import { describe, it, expect } from 'vitest';
import { rollD20, resolveAttack, arePositionsAdjacent, getAdjacentMonsters, getMonsterAC, canLevelUp, levelUpHero, calculateDamage, checkHealingSurgeNeeded, useHealingSurge, checkPartyDefeat, applyItemBonusesToAttack, calculateTotalAC, calculateTotalSpeed, getChebyshevDistance, getManhattanDistance, isWithinTileRange, isWithinSquareRange, getMonstersWithinRange, getMonstersOnSameTile } from './combat';
import type { HeroAttack, MonsterState, HeroHpState, PartyResources, DungeonState } from './types';
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
  it('should return base damage +1 for level 1 hero on natural 20 (critical hit)', () => {
    expect(calculateDamage(1, 20, 2)).toBe(3);
    expect(calculateDamage(1, 20, 1)).toBe(2);
  });

  it('should return base damage for level 1 hero on non-20 rolls', () => {
    expect(calculateDamage(1, 15, 2)).toBe(2);
    expect(calculateDamage(1, 1, 2)).toBe(2);
  });

  it('should return base damage +1 for level 2 hero on natural 20 (critical hit)', () => {
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

  describe('cross-tile adjacency with dungeon', () => {
    it('should find monsters on adjacent tile when adjacent in global coordinates', () => {
      // Hero at position (3, 2) on start tile (global coords)
      // Monster at position (0, 2) on east tile (local coords), which is (4, 2) in global coords
      // These positions are adjacent: distance is 1 square (|3-4|=1, |2-2|=0)
      const dungeon: DungeonState = {
        tiles: [
          {
            id: 'start-tile',
            tileType: 'start',
            position: { col: 0, row: 0 },
            rotation: 0,
          },
          {
            id: 'east-tile',
            tileType: 'black-1',
            position: { col: 1, row: 0 },
            rotation: 0,
          },
        ],
        unexploredEdges: [],
        tileDeck: [],
      };

      const monstersOnEdge: MonsterState[] = [
        // Monster on east tile at local position (0, 2), which is global (4, 2)
        { monsterId: 'kobold', instanceId: 'kobold-edge', position: { x: 0, y: 2 }, currentHp: 1, controllerId: 'quinn', tileId: 'east-tile' },
      ];

      const heroGlobalPos = { x: 3, y: 2 }; // On start tile, at eastern edge

      const adjacent = getAdjacentMonsters(heroGlobalPos, monstersOnEdge, 'start-tile', dungeon);
      
      // Should find the monster on the adjacent tile since it's adjacent in global coordinates
      expect(adjacent).toHaveLength(1);
      expect(adjacent[0].instanceId).toBe('kobold-edge');
    });

    it('should find monsters on north tile when adjacent in global coordinates', () => {
      // Hero at position (2, 0) on start tile (global coords)
      // Monster at position (2, 3) on north tile (local coords), which is (2, -1) in global coords
      // These positions are adjacent: distance is 1 square (|2-2|=0, |0-(-1)|=1)
      const dungeon: DungeonState = {
        tiles: [
          {
            id: 'start-tile',
            tileType: 'start',
            position: { col: 0, row: 0 },
            rotation: 0,
          },
          {
            id: 'north-tile',
            tileType: 'black-1',
            position: { col: 0, row: -1 },
            rotation: 0,
          },
        ],
        unexploredEdges: [],
        tileDeck: [],
      };

      const monstersOnEdge: MonsterState[] = [
        // Monster on north tile at local position (2, 3), which is global (2, -1)
        // North tile (row=-1, col=0) bounds: minX=0, maxX=3, minY=-4, maxY=-1
        // Global position = (minX + localX, minY + localY) = (0+2, -4+3) = (2, -1)
        { monsterId: 'kobold', instanceId: 'kobold-north', position: { x: 2, y: 3 }, currentHp: 1, controllerId: 'quinn', tileId: 'north-tile' },
      ];

      const heroGlobalPos = { x: 2, y: 0 }; // On start tile, at northern edge

      const adjacent = getAdjacentMonsters(heroGlobalPos, monstersOnEdge, 'start-tile', dungeon);
      
      // Should find the monster on the adjacent tile since it's adjacent in global coordinates
      expect(adjacent).toHaveLength(1);
      expect(adjacent[0].instanceId).toBe('kobold-north');
    });

    it('should not find monsters that are not adjacent', () => {
      const dungeon: DungeonState = {
        tiles: [
          {
            id: 'start-tile',
            tileType: 'start',
            position: { col: 0, row: 0 },
            rotation: 0,
          },
          {
            id: 'east-tile',
            tileType: 'black-1',
            position: { col: 1, row: 0 },
            rotation: 0,
          },
        ],
        unexploredEdges: [],
        tileDeck: [],
      };

      const monstersOnEdge: MonsterState[] = [
        // Monster on east tile at local position (2, 2), which is global (6, 2)
        // East tile (col=1, row=0) bounds: minX=4, maxX=7, minY=0, maxY=3
        // Global position = (minX + localX, minY + localY) = (4+2, 0+2) = (6, 2)
        // Hero is at (1, 2), so distance is |1-6|=5 squares (not adjacent)
        { monsterId: 'kobold', instanceId: 'kobold-far', position: { x: 2, y: 2 }, currentHp: 1, controllerId: 'quinn', tileId: 'east-tile' },
      ];

      const heroGlobalPos = { x: 1, y: 2 }; // On start tile

      const adjacent = getAdjacentMonsters(heroGlobalPos, monstersOnEdge, 'start-tile', dungeon);
      
      // Should NOT find the monster since it's not adjacent
      expect(adjacent).toHaveLength(0);
    });

    it('should find monster on east tile edge adjacent to hero on start tile east edge', () => {
      // Reproduce issue #314/#319 scenario:
      // Hero at the eastern edge of start tile: (3, 2) in global coords
      // Monster at the western edge of east tile: local (0, 2) = global (4, 2)
      // These should be adjacent (distance = 1)
      const dungeon: DungeonState = {
        tiles: [
          {
            id: 'start-tile',
            tileType: 'start',
            position: { col: 0, row: 0 },
            rotation: 0,
          },
          {
            id: 'east-tile',
            tileType: 'black-1',
            position: { col: 1, row: 0 },
            rotation: 0,
          },
        ],
        unexploredEdges: [],
        tileDeck: [],
      };

      const monstersOnEdge: MonsterState[] = [
        {
          monsterId: 'kobold-dragonshield',
          instanceId: 'kobold-1',
          position: { x: 0, y: 2 }, // Local coords on east tile
          currentHp: 1,
          controllerId: 'quinn',
          tileId: 'east-tile',
        },
      ];

      // Hero at eastern edge of start tile
      const heroGlobalPos = { x: 3, y: 2 };

      const adjacent = getAdjacentMonsters(heroGlobalPos, monstersOnEdge, 'start-tile', dungeon);

      // Should find the monster since it's adjacent across tile boundary
      expect(adjacent).toHaveLength(1);
      expect(adjacent[0].instanceId).toBe('kobold-1');
    });

    it('should find monster on diagonal adjacent tile', () => {
      // Test diagonal adjacency across tiles
      // Hero at northeast corner of start tile: (3, 0) in global coords  
      // Monster at southwest corner of northeast tile: local (0, 3) on tile at col=1, row=-1
      // Northeast tile bounds: minX=4, maxX=7, minY=-4, maxY=-1
      // Monster global position: (4 + 0, -4 + 3) = (4, -1)
      // Distance from (3, 0) to (4, -1): dx=1, dy=1 -> adjacent diagonally
      const dungeon: DungeonState = {
        tiles: [
          {
            id: 'start-tile',
            tileType: 'start',
            position: { col: 0, row: 0 },
            rotation: 0,
          },
          {
            id: 'northeast-tile',
            tileType: 'black-1',
            position: { col: 1, row: -1 },
            rotation: 0,
          },
        ],
        unexploredEdges: [],
        tileDeck: [],
      };

      const monstersOnEdge: MonsterState[] = [
        {
          monsterId: 'kobold',
          instanceId: 'kobold-diagonal',
          position: { x: 0, y: 3 }, // Local coords on northeast tile
          currentHp: 1,
          controllerId: 'quinn',
          tileId: 'northeast-tile',
        },
      ];

      // Hero at northeast corner of start tile
      const heroGlobalPos = { x: 3, y: 0 };

      const adjacent = getAdjacentMonsters(heroGlobalPos, monstersOnEdge, 'start-tile', dungeon);

      // Should find the monster since it's diagonally adjacent across tile boundary
      expect(adjacent).toHaveLength(1);
      expect(adjacent[0].instanceId).toBe('kobold-diagonal');
    });

    it('should find monster diagonally adjacent across southeast tile (row=1, col=1)', () => {
      // Test diagonal adjacency with special row=1, col=1 tile positioning
      // Hero at position (3, 3) on start tile (southeast area of north sub-tile)
      // Monster at position (0, 0) on southeast tile (col=1, row=1)
      // Southeast tile at (col=1, row=1) has special positioning: minY=4 (aligns with south sub-tile)
      // So monster global position: (4 + 0, 4 + 0) = (4, 4)
      // Distance from (3, 3) to (4, 4): dx=1, dy=1 -> adjacent diagonally
      const dungeon: DungeonState = {
        tiles: [
          {
            id: 'start-tile',
            tileType: 'start',
            position: { col: 0, row: 0 },
            rotation: 0,
          },
          {
            id: 'southeast-tile',
            tileType: 'blue-1',
            position: { col: 1, row: 1 },
            rotation: 0,
          },
        ],
        unexploredEdges: [],
        tileDeck: [],
      };

      const monstersOnEdge: MonsterState[] = [
        {
          monsterId: 'snake',
          instanceId: 'snake-diagonal',
          position: { x: 0, y: 0 }, // Local coords on southeast tile
          currentHp: 1,
          controllerId: 'keyleth',
          tileId: 'southeast-tile',
        },
      ];

      // Hero at position (3, 3) on start tile
      const heroGlobalPos = { x: 3, y: 3 };

      const adjacent = getAdjacentMonsters(heroGlobalPos, monstersOnEdge, 'start-tile', dungeon);

      // Should find the monster since it's diagonally adjacent across tile boundary
      expect(adjacent).toHaveLength(1);
      expect(adjacent[0].instanceId).toBe('snake-diagonal');
    });
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

describe('getChebyshevDistance', () => {
  it('should calculate distance for same position', () => {
    expect(getChebyshevDistance({ x: 2, y: 2 }, { x: 2, y: 2 })).toBe(0);
  });

  it('should calculate distance for orthogonal movement', () => {
    // Moving 3 squares horizontally
    expect(getChebyshevDistance({ x: 2, y: 2 }, { x: 5, y: 2 })).toBe(3);
    // Moving 4 squares vertically
    expect(getChebyshevDistance({ x: 2, y: 2 }, { x: 2, y: 6 })).toBe(4);
  });

  it('should calculate distance for diagonal movement', () => {
    // Diagonal movement: max of differences is the distance
    expect(getChebyshevDistance({ x: 2, y: 2 }, { x: 5, y: 5 })).toBe(3);
    expect(getChebyshevDistance({ x: 0, y: 0 }, { x: 4, y: 3 })).toBe(4);
  });

  it('should handle negative coordinates', () => {
    expect(getChebyshevDistance({ x: 2, y: 2 }, { x: -2, y: -2 })).toBe(4);
    expect(getChebyshevDistance({ x: -5, y: 3 }, { x: 1, y: -1 })).toBe(6);
  });

  it('should be symmetric', () => {
    const pos1 = { x: 2, y: 3 };
    const pos2 = { x: 7, y: 8 };
    expect(getChebyshevDistance(pos1, pos2)).toBe(getChebyshevDistance(pos2, pos1));
  });
});

describe('getManhattanDistance', () => {
  it('should calculate distance for same position', () => {
    expect(getManhattanDistance({ x: 2, y: 2 }, { x: 2, y: 2 })).toBe(0);
  });

  it('should calculate distance for orthogonal movement', () => {
    // Moving 3 squares horizontally
    expect(getManhattanDistance({ x: 2, y: 2 }, { x: 5, y: 2 })).toBe(3);
    // Moving 4 squares vertically
    expect(getManhattanDistance({ x: 2, y: 2 }, { x: 2, y: 6 })).toBe(4);
  });

  it('should calculate distance for diagonal movement', () => {
    // Manhattan distance is sum of absolute differences
    expect(getManhattanDistance({ x: 2, y: 2 }, { x: 5, y: 5 })).toBe(6);
    expect(getManhattanDistance({ x: 0, y: 0 }, { x: 4, y: 3 })).toBe(7);
  });

  it('should handle negative coordinates', () => {
    expect(getManhattanDistance({ x: 2, y: 2 }, { x: -2, y: -2 })).toBe(8);
    expect(getManhattanDistance({ x: -5, y: 3 }, { x: 1, y: -1 })).toBe(10);
  });

  it('should be symmetric', () => {
    const pos1 = { x: 2, y: 3 };
    const pos2 = { x: 7, y: 8 };
    expect(getManhattanDistance(pos1, pos2)).toBe(getManhattanDistance(pos2, pos1));
  });
});

describe('isWithinTileRange', () => {
  it('should return true for same position', () => {
    expect(isWithinTileRange({ x: 2, y: 2 }, { x: 2, y: 2 }, 0)).toBe(true);
    expect(isWithinTileRange({ x: 2, y: 2 }, { x: 2, y: 2 }, 1)).toBe(true);
  });

  it('should correctly check within 1 tile (4 squares)', () => {
    const heroPos = { x: 10, y: 10 };
    
    // Exactly 4 squares away (edge of 1 tile)
    expect(isWithinTileRange(heroPos, { x: 14, y: 10 }, 1)).toBe(true);
    expect(isWithinTileRange(heroPos, { x: 10, y: 14 }, 1)).toBe(true);
    expect(isWithinTileRange(heroPos, { x: 14, y: 14 }, 1)).toBe(true);
    
    // 5 squares away (beyond 1 tile)
    expect(isWithinTileRange(heroPos, { x: 15, y: 10 }, 1)).toBe(false);
    expect(isWithinTileRange(heroPos, { x: 10, y: 15 }, 1)).toBe(false);
  });

  it('should correctly check within 2 tiles (8 squares)', () => {
    const heroPos = { x: 10, y: 10 };
    
    // Exactly 8 squares away
    expect(isWithinTileRange(heroPos, { x: 18, y: 10 }, 2)).toBe(true);
    expect(isWithinTileRange(heroPos, { x: 10, y: 18 }, 2)).toBe(true);
    expect(isWithinTileRange(heroPos, { x: 18, y: 18 }, 2)).toBe(true);
    
    // 9 squares away (beyond 2 tiles)
    expect(isWithinTileRange(heroPos, { x: 19, y: 10 }, 2)).toBe(false);
  });

  it('should handle negative coordinates', () => {
    expect(isWithinTileRange({ x: 0, y: 0 }, { x: -3, y: -3 }, 1)).toBe(true);
    expect(isWithinTileRange({ x: 0, y: 0 }, { x: -5, y: 0 }, 1)).toBe(false);
  });
});

describe('isWithinSquareRange', () => {
  it('should return true for same position', () => {
    expect(isWithinSquareRange({ x: 2, y: 2 }, { x: 2, y: 2 }, 0)).toBe(true);
  });

  it('should correctly check Manhattan distance', () => {
    const heroPos = { x: 10, y: 10 };
    
    // 3 squares Manhattan distance
    expect(isWithinSquareRange(heroPos, { x: 13, y: 10 }, 3)).toBe(true);
    expect(isWithinSquareRange(heroPos, { x: 12, y: 11 }, 3)).toBe(true);
    
    // 4 squares Manhattan distance
    expect(isWithinSquareRange(heroPos, { x: 14, y: 10 }, 3)).toBe(false);
    expect(isWithinSquareRange(heroPos, { x: 12, y: 12 }, 3)).toBe(false);
  });
});

describe('getMonstersWithinRange', () => {
  // Create a simple dungeon with start tile and one regular tile
  const dungeon: DungeonState = {
    tiles: [
      {
        id: 'start',
        tileType: 'start',
        position: { col: 0, row: 0 },
        edges: { north: 'unexplored', east: 'unexplored', south: 'unexplored', west: 'wall' },
      },
      {
        id: 'tile-north',
        tileType: 'normal',
        position: { col: 0, row: -1 },
        edges: { north: 'wall', east: 'wall', south: 'open', west: 'wall' },
        tileDefId: 'tile-1',
      },
    ],
    unexploredEdges: [],
    tileDeck: [],
  };

  const monsters: MonsterState[] = [
    // Monster on start tile at local (2, 2) = global (2, 2)
    { monsterId: 'kobold', instanceId: 'kobold-adjacent', position: { x: 2, y: 2 }, currentHp: 1, controllerId: 'quinn', tileId: 'start' },
    // Monster on start tile at local (2, 5) = global (2, 5)
    { monsterId: 'snake', instanceId: 'snake-sametile', position: { x: 2, y: 5 }, currentHp: 1, controllerId: 'quinn', tileId: 'start' },
    // Monster on north tile at local (2, 2) = global (2, -2)
    { monsterId: 'cultist', instanceId: 'cultist-neartile', position: { x: 2, y: 2 }, currentHp: 2, controllerId: 'quinn', tileId: 'tile-north' },
  ];

  it('should find monsters within 1 tile range', () => {
    const heroPos = { x: 2, y: 1 }; // On start tile
    const inRange = getMonstersWithinRange(heroPos, monsters, 1, dungeon);
    
    // kobold at (2,2) is 1 square away (within 1 tile = 4 squares)
    // snake at (2,5) is 4 squares away (within 1 tile)
    // cultist at (2,-2) is 3 squares away (within 1 tile)
    expect(inRange).toHaveLength(3);
    expect(inRange.map(m => m.instanceId)).toContain('kobold-adjacent');
    expect(inRange.map(m => m.instanceId)).toContain('snake-sametile');
    expect(inRange.map(m => m.instanceId)).toContain('cultist-neartile');
  });

  it('should find monsters within 2 tile range', () => {
    const heroPos = { x: 2, y: 5 }; // On start tile
    const inRange = getMonstersWithinRange(heroPos, monsters, 2, dungeon);
    
    // All monsters should be within 2 tiles (8 squares)
    expect(inRange).toHaveLength(3);
  });

  it('should return empty array when no monsters in range', () => {
    const heroPos = { x: 2, y: 1 };
    // Create monsters far away
    const farMonsters: MonsterState[] = [
      { monsterId: 'kobold', instanceId: 'kobold-far', position: { x: 2, y: 2 }, currentHp: 1, controllerId: 'quinn', tileId: 'tile-north' },
    ];
    
    const inRange = getMonstersWithinRange(heroPos, farMonsters, 0, dungeon);
    expect(inRange).toHaveLength(0);
  });
});

describe('getMonstersOnSameTile', () => {
  const dungeon: DungeonState = {
    tiles: [
      {
        id: 'start',
        tileType: 'start',
        position: { col: 0, row: 0 },
        edges: { north: 'unexplored', east: 'unexplored', south: 'unexplored', west: 'wall' },
      },
      {
        id: 'tile-north',
        tileType: 'normal',
        position: { col: 0, row: -1 },
        edges: { north: 'wall', east: 'wall', south: 'open', west: 'wall' },
        tileDefId: 'tile-1',
      },
    ],
    unexploredEdges: [],
    tileDeck: [],
  };

  const monsters: MonsterState[] = [
    { monsterId: 'kobold', instanceId: 'kobold-1', position: { x: 2, y: 2 }, currentHp: 1, controllerId: 'quinn', tileId: 'start' },
    { monsterId: 'snake', instanceId: 'snake-1', position: { x: 2, y: 5 }, currentHp: 1, controllerId: 'quinn', tileId: 'start' },
    { monsterId: 'cultist', instanceId: 'cultist-1', position: { x: 2, y: 2 }, currentHp: 2, controllerId: 'quinn', tileId: 'tile-north' },
  ];

  it('should find all monsters on the same tile', () => {
    const heroPos = { x: 2, y: 3 }; // On start tile
    const sameTile = getMonstersOnSameTile(heroPos, monsters, dungeon);
    
    expect(sameTile).toHaveLength(2);
    expect(sameTile.map(m => m.instanceId)).toContain('kobold-1');
    expect(sameTile.map(m => m.instanceId)).toContain('snake-1');
    expect(sameTile.map(m => m.instanceId)).not.toContain('cultist-1');
  });

  it('should return empty array when hero is not on a tile', () => {
    const heroPos = { x: 100, y: 100 }; // Off the map
    const sameTile = getMonstersOnSameTile(heroPos, monsters, dungeon);
    
    expect(sameTile).toHaveLength(0);
  });

  it('should only return monsters on the exact tile', () => {
    const heroPos = { x: 2, y: -2 }; // On tile-north
    const sameTile = getMonstersOnSameTile(heroPos, monsters, dungeon);
    
    expect(sameTile).toHaveLength(1);
    expect(sameTile[0].instanceId).toBe('cultist-1');
  });
});
