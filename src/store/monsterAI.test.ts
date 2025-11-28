import { describe, it, expect } from 'vitest';
import {
  findClosestHero,
  findAdjacentHero,
  findMoveTowardHero,
  resolveMonsterAttack,
  executeMonsterTurn,
  getMonsterGlobalPosition,
  getManhattanDistance,
} from './monsterAI';
import type { MonsterState, HeroToken, DungeonState, PlacedTile } from './types';

// Helper to create a simple test dungeon with just the start tile
function createTestDungeon(): DungeonState {
  const startTile: PlacedTile = {
    id: 'start-tile',
    tileType: 'start',
    position: { col: 0, row: 0 },
    rotation: 0,
    edges: {
      north: 'unexplored',
      south: 'unexplored',
      east: 'unexplored',
      west: 'unexplored',
    },
  };

  return {
    tiles: [startTile],
    unexploredEdges: [],
    tileDeck: [],
  };
}

describe('monsterAI', () => {
  describe('getManhattanDistance', () => {
    it('should return 0 for same position', () => {
      const pos = { x: 2, y: 2 };
      expect(getManhattanDistance(pos, pos)).toBe(0);
    });

    it('should return correct distance for orthogonal positions', () => {
      expect(getManhattanDistance({ x: 0, y: 0 }, { x: 3, y: 0 })).toBe(3);
      expect(getManhattanDistance({ x: 0, y: 0 }, { x: 0, y: 4 })).toBe(4);
    });

    it('should return correct distance for diagonal positions', () => {
      expect(getManhattanDistance({ x: 0, y: 0 }, { x: 2, y: 2 })).toBe(4);
      expect(getManhattanDistance({ x: 1, y: 1 }, { x: 3, y: 4 })).toBe(5);
    });
  });

  describe('getMonsterGlobalPosition', () => {
    it('should convert monster local position to global on start tile', () => {
      const dungeon = createTestDungeon();
      const monster: MonsterState = {
        monsterId: 'kobold',
        instanceId: 'kobold-0',
        position: { x: 2, y: 2 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'start-tile',
      };

      const globalPos = getMonsterGlobalPosition(monster, dungeon);
      expect(globalPos).toEqual({ x: 2, y: 2 }); // Start tile at origin
    });

    it('should return null for monster on non-existent tile', () => {
      const dungeon = createTestDungeon();
      const monster: MonsterState = {
        monsterId: 'kobold',
        instanceId: 'kobold-0',
        position: { x: 2, y: 2 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'nonexistent-tile',
      };

      const globalPos = getMonsterGlobalPosition(monster, dungeon);
      expect(globalPos).toBeNull();
    });
  });

  describe('findAdjacentHero', () => {
    it('should find hero adjacent to monster', () => {
      const dungeon = createTestDungeon();
      const monster: MonsterState = {
        monsterId: 'kobold',
        instanceId: 'kobold-0',
        position: { x: 2, y: 2 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'start-tile',
      };

      const heroTokens: HeroToken[] = [
        { heroId: 'quinn', position: { x: 2, y: 3 } }, // Adjacent (one south)
      ];

      const heroHpMap = { quinn: 8 };

      const result = findAdjacentHero(monster, heroTokens, heroHpMap, dungeon);
      expect(result).not.toBeNull();
      expect(result?.heroId).toBe('quinn');
    });

    it('should not find hero when not adjacent', () => {
      const dungeon = createTestDungeon();
      const monster: MonsterState = {
        monsterId: 'kobold',
        instanceId: 'kobold-0',
        position: { x: 2, y: 2 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'start-tile',
      };

      const heroTokens: HeroToken[] = [
        { heroId: 'quinn', position: { x: 2, y: 5 } }, // Not adjacent
      ];

      const heroHpMap = { quinn: 8 };

      const result = findAdjacentHero(monster, heroTokens, heroHpMap, dungeon);
      expect(result).toBeNull();
    });

    it('should ignore downed heroes (0 HP)', () => {
      const dungeon = createTestDungeon();
      const monster: MonsterState = {
        monsterId: 'kobold',
        instanceId: 'kobold-0',
        position: { x: 2, y: 2 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'start-tile',
      };

      const heroTokens: HeroToken[] = [
        { heroId: 'quinn', position: { x: 2, y: 3 } }, // Adjacent but downed
      ];

      const heroHpMap = { quinn: 0 };

      const result = findAdjacentHero(monster, heroTokens, heroHpMap, dungeon);
      expect(result).toBeNull();
    });
  });

  describe('findClosestHero', () => {
    it('should find the closest hero', () => {
      const dungeon = createTestDungeon();
      const monster: MonsterState = {
        monsterId: 'kobold',
        instanceId: 'kobold-0',
        position: { x: 2, y: 2 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'start-tile',
      };

      const heroTokens: HeroToken[] = [
        { heroId: 'quinn', position: { x: 2, y: 5 } }, // Distance 3
        { heroId: 'vistra', position: { x: 3, y: 2 } }, // Distance 1
      ];

      const heroHpMap = { quinn: 8, vistra: 10 };

      const result = findClosestHero(monster, heroTokens, heroHpMap, dungeon);
      expect(result).not.toBeNull();
      expect(result?.hero.heroId).toBe('vistra');
      expect(result?.distance).toBe(1);
    });

    it('should ignore downed heroes', () => {
      const dungeon = createTestDungeon();
      const monster: MonsterState = {
        monsterId: 'kobold',
        instanceId: 'kobold-0',
        position: { x: 2, y: 2 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'start-tile',
      };

      const heroTokens: HeroToken[] = [
        { heroId: 'quinn', position: { x: 2, y: 5 } }, // Distance 3, alive
        { heroId: 'vistra', position: { x: 3, y: 2 } }, // Distance 1, but downed
      ];

      const heroHpMap = { quinn: 8, vistra: 0 };

      const result = findClosestHero(monster, heroTokens, heroHpMap, dungeon);
      expect(result).not.toBeNull();
      expect(result?.hero.heroId).toBe('quinn');
    });

    it('should return null when all heroes are downed', () => {
      const dungeon = createTestDungeon();
      const monster: MonsterState = {
        monsterId: 'kobold',
        instanceId: 'kobold-0',
        position: { x: 2, y: 2 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'start-tile',
      };

      const heroTokens: HeroToken[] = [
        { heroId: 'quinn', position: { x: 2, y: 5 } },
      ];

      const heroHpMap = { quinn: 0 };

      const result = findClosestHero(monster, heroTokens, heroHpMap, dungeon);
      expect(result).toBeNull();
    });
  });

  describe('findMoveTowardHero', () => {
    it('should find position closer to hero', () => {
      const dungeon = createTestDungeon();
      const monster: MonsterState = {
        monsterId: 'kobold',
        instanceId: 'kobold-0',
        position: { x: 2, y: 2 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'start-tile',
      };

      const heroTokens: HeroToken[] = [
        { heroId: 'quinn', position: { x: 2, y: 5 } },
      ];

      const result = findMoveTowardHero(
        monster,
        { x: 2, y: 5 },
        heroTokens,
        [monster],
        dungeon
      );

      expect(result).not.toBeNull();
      // Should move closer to the hero (toward y=5)
      expect(result?.y).toBeGreaterThan(2);
    });

    it('should not move onto hero position', () => {
      const dungeon = createTestDungeon();
      const monster: MonsterState = {
        monsterId: 'kobold',
        instanceId: 'kobold-0',
        position: { x: 2, y: 4 }, // Adjacent to hero
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'start-tile',
      };

      const heroTokens: HeroToken[] = [
        { heroId: 'quinn', position: { x: 2, y: 5 } },
      ];

      const result = findMoveTowardHero(
        monster,
        { x: 2, y: 5 },
        heroTokens,
        [monster],
        dungeon
      );

      // Should not return the hero's position
      if (result) {
        expect(result.x !== 2 || result.y !== 5).toBe(true);
      }
    });
  });

  describe('resolveMonsterAttack', () => {
    it('should hit when roll + bonus >= AC', () => {
      // Roll 15 + bonus 5 = 20 >= 17
      const randomFn = () => 0.7; // (0.7 * 20) + 1 = 15
      const result = resolveMonsterAttack('kobold', 17, randomFn);

      expect(result.roll).toBe(15);
      expect(result.attackBonus).toBe(5);
      expect(result.total).toBe(20);
      expect(result.targetAC).toBe(17);
      expect(result.isHit).toBe(true);
      expect(result.damage).toBe(1);
      expect(result.isCritical).toBe(false);
    });

    it('should miss when roll + bonus < AC', () => {
      // Roll 5 + bonus 5 = 10 < 17
      const randomFn = () => 0.2; // (0.2 * 20) + 1 = 5
      const result = resolveMonsterAttack('kobold', 17, randomFn);

      expect(result.roll).toBe(5);
      expect(result.total).toBe(10);
      expect(result.isHit).toBe(false);
      expect(result.damage).toBe(0);
    });

    it('should always hit on natural 20', () => {
      const randomFn = () => 0.999; // Roll 20
      const result = resolveMonsterAttack('kobold', 30, randomFn);

      expect(result.roll).toBe(20);
      expect(result.isHit).toBe(true);
      expect(result.isCritical).toBe(true);
      expect(result.damage).toBe(1);
    });

    it('should use correct stats for different monsters', () => {
      // Snake has +4 attack bonus, 1 damage
      const randomFn = () => 0.5; // (0.5 * 20) + 1 = 11
      const result = resolveMonsterAttack('snake', 12, randomFn);

      expect(result.attackBonus).toBe(4);
      expect(result.total).toBe(15); // 11 + 4
      expect(result.isHit).toBe(true);
      expect(result.damage).toBe(1);
    });
  });

  describe('executeMonsterTurn', () => {
    it('should attack when adjacent to hero', () => {
      const dungeon = createTestDungeon();
      const monster: MonsterState = {
        monsterId: 'kobold',
        instanceId: 'kobold-0',
        position: { x: 2, y: 4 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'start-tile',
      };

      const heroTokens: HeroToken[] = [
        { heroId: 'quinn', position: { x: 2, y: 5 } },
      ];

      const heroHpMap = { quinn: 8 };
      const heroAcMap = { quinn: 17 };

      const result = executeMonsterTurn(
        monster,
        heroTokens,
        heroHpMap,
        heroAcMap,
        [monster],
        dungeon
      );

      expect(result.type).toBe('attack');
      if (result.type === 'attack') {
        expect(result.targetId).toBe('quinn');
        expect(result.result).toBeDefined();
      }
    });

    it('should move toward hero when not adjacent', () => {
      const dungeon = createTestDungeon();
      const monster: MonsterState = {
        monsterId: 'kobold',
        instanceId: 'kobold-0',
        position: { x: 2, y: 2 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'start-tile',
      };

      const heroTokens: HeroToken[] = [
        { heroId: 'quinn', position: { x: 2, y: 5 } },
      ];

      const heroHpMap = { quinn: 8 };
      const heroAcMap = { quinn: 17 };

      const result = executeMonsterTurn(
        monster,
        heroTokens,
        heroHpMap,
        heroAcMap,
        [monster],
        dungeon
      );

      expect(result.type).toBe('move');
      if (result.type === 'move') {
        // Should move toward the hero (y should increase toward 5)
        expect(result.destination.y).toBeGreaterThan(2);
      }
    });

    it('should return none when all heroes are downed', () => {
      const dungeon = createTestDungeon();
      const monster: MonsterState = {
        monsterId: 'kobold',
        instanceId: 'kobold-0',
        position: { x: 2, y: 2 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'start-tile',
      };

      const heroTokens: HeroToken[] = [
        { heroId: 'quinn', position: { x: 2, y: 5 } },
      ];

      const heroHpMap = { quinn: 0 }; // Hero is downed
      const heroAcMap = { quinn: 17 };

      const result = executeMonsterTurn(
        monster,
        heroTokens,
        heroHpMap,
        heroAcMap,
        [monster],
        dungeon
      );

      expect(result.type).toBe('none');
    });
  });
});
