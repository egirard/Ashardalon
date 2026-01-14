import { describe, it, expect } from 'vitest';
import {
  findClosestHero,
  findAdjacentHero,
  findMoveTowardHero,
  resolveMonsterAttack,
  executeMonsterTurn,
  getMonsterGlobalPosition,
  getManhattanDistance,
  findHeroWithinTileRange,
  findClosestMonsterNotOnTile,
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
      // Kobold has +7 attack bonus per monster card
      // Roll 15 + bonus 7 = 22 >= 17
      const randomFn = () => 0.7; // (0.7 * 20) + 1 = 15
      const result = resolveMonsterAttack('kobold', 17, randomFn);

      expect(result.roll).toBe(15);
      expect(result.attackBonus).toBe(7);  // Updated to match monster card
      expect(result.total).toBe(22);       // 15 + 7
      expect(result.targetAC).toBe(17);
      expect(result.isHit).toBe(true);
      expect(result.damage).toBe(1);
      expect(result.isCritical).toBe(false);
    });

    it('should miss when roll + bonus < AC', () => {
      // Roll 5 + bonus 7 = 12 < 17
      const randomFn = () => 0.2; // (0.2 * 20) + 1 = 5
      const result = resolveMonsterAttack('kobold', 17, randomFn);

      expect(result.roll).toBe(5);
      expect(result.total).toBe(12);  // 5 + 7
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
      // Snake has +7 attack bonus (Bite), 1 damage per monster card
      const randomFn = () => 0.5; // (0.5 * 20) + 1 = 11
      const result = resolveMonsterAttack('snake', 12, randomFn);

      expect(result.attackBonus).toBe(7);  // Updated to match monster card
      expect(result.total).toBe(18);       // 11 + 7
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

    it('snake should move-and-attack when hero is within 1 tile range', () => {
      const dungeon = createTestDungeon();
      // Snake at position (2, 0) on start tile (local coords)
      const monster: MonsterState = {
        monsterId: 'snake',
        instanceId: 'snake-0',
        position: { x: 2, y: 0 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'start-tile',
      };

      // Hero at position (2, 2) - within 1 tile (4 squares) of monster
      // Using (2, 2) instead of (2, 3) because (2, 3) is on the staircase
      const heroTokens: HeroToken[] = [
        { heroId: 'quinn', position: { x: 2, y: 2 } },
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

      // Snake has move-and-attack tactic, so if hero is within 1 tile
      // it should move adjacent and attack in the same turn
      expect(result.type).toBe('move-and-attack');
      if (result.type === 'move-and-attack') {
        expect(result.targetId).toBe('quinn');
        expect(result.result).toBeDefined();
        // Destination should be adjacent to hero at (2, 2)
        const heroPos = heroTokens[0].position;
        const dx = Math.abs(result.destination.x - heroPos.x);
        const dy = Math.abs(result.destination.y - heroPos.y);
        expect(dx <= 1 && dy <= 1 && (dx + dy) > 0).toBe(true);
      }
    });

    it('cultist should move-and-attack when hero is within 1 tile range', () => {
      const dungeon = createTestDungeon();
      // Cultist at position (1, 0) on start tile (local coords)
      const monster: MonsterState = {
        monsterId: 'cultist',
        instanceId: 'cultist-0',
        position: { x: 1, y: 0 },
        currentHp: 2,
        controllerId: 'quinn',
        tileId: 'start-tile',
      };

      // Hero at position (1, 2) - within 1 tile (2 squares) of monster
      const heroTokens: HeroToken[] = [
        { heroId: 'quinn', position: { x: 1, y: 2 } },
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

      // Cultist has move-and-attack tactic
      expect(result.type).toBe('move-and-attack');
      if (result.type === 'move-and-attack') {
        expect(result.targetId).toBe('quinn');
      }
    });

    it('kobold should just move when hero is not adjacent (attack-only tactic)', () => {
      const dungeon = createTestDungeon();
      // Kobold at position (2, 2) on start tile
      const monster: MonsterState = {
        monsterId: 'kobold',
        instanceId: 'kobold-0',
        position: { x: 2, y: 2 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'start-tile',
      };

      // Hero at position (2, 5) - not adjacent to kobold
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

      // Kobold has attack-only tactic, so it should just move (not move-and-attack)
      expect(result.type).toBe('move');
    });
  });

  describe('findHeroWithinTileRange', () => {
    it('should find hero within 1 tile range', () => {
      const dungeon = createTestDungeon();
      const monster: MonsterState = {
        monsterId: 'snake',
        instanceId: 'snake-0',
        position: { x: 2, y: 2 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'start-tile',
      };

      // Hero at position (2, 5) - 3 squares away (within 4 squares = 1 tile)
      const heroTokens: HeroToken[] = [
        { heroId: 'quinn', position: { x: 2, y: 5 } },
      ];

      const heroHpMap = { quinn: 8 };

      const result = findHeroWithinTileRange(monster, heroTokens, heroHpMap, dungeon, 1);
      expect(result).not.toBeNull();
      expect(result?.hero.heroId).toBe('quinn');
    });

    it('should not find hero outside tile range', () => {
      const dungeon = createTestDungeon();
      const monster: MonsterState = {
        monsterId: 'snake',
        instanceId: 'snake-0',
        position: { x: 1, y: 0 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'start-tile',
      };

      // Hero at position (1, 7) - 7 squares away (more than 4 squares = outside 1 tile range)
      // But actually BFS finds the path which goes around the staircase
      const heroTokens: HeroToken[] = [
        { heroId: 'quinn', position: { x: 1, y: 7 } },
      ];

      const heroHpMap = { quinn: 8 };

      // Path from (1,0) to (1,7): (1,0)->(1,1)->(1,2)->(3,2)->(3,3)->(3,4)->(3,5)->(1,5)->(1,6)->(1,7)
      // That's about 9 squares via BFS which is more than 4 squares
      const result = findHeroWithinTileRange(monster, heroTokens, heroHpMap, dungeon, 1);
      expect(result).toBeNull();
    });
  });

  describe('findClosestMonsterNotOnTile', () => {
    it('should find the closest monster not on hero\'s tile', () => {
      // Create a dungeon with start tile and an adjacent tile
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
      
      const adjacentTile: PlacedTile = {
        id: 'tile-1',
        tileType: 'cave',
        position: { col: 1, row: 0 },
        rotation: 0,
        edges: {
          north: 'wall',
          south: 'wall',
          east: 'unexplored',
          west: 'wall',
        },
      };

      const dungeon: DungeonState = {
        tiles: [startTile, adjacentTile],
        unexploredEdges: [],
        tileDeck: [],
      };

      // Hero at position (2, 2) on start tile
      const heroPos = { x: 2, y: 2 };

      // Monster 1 on start tile - should be excluded (same tile as hero)
      const monster1: MonsterState = {
        monsterId: 'kobold',
        instanceId: 'kobold-0',
        position: { x: 2, y: 5 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'start-tile',
      };

      // Monster 2 on adjacent tile - should be found (different tile)
      const monster2: MonsterState = {
        monsterId: 'snake',
        instanceId: 'snake-0',
        position: { x: 1, y: 1 }, // Local position on tile-1
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'tile-1',
      };

      const result = findClosestMonsterNotOnTile(heroPos, [monster1, monster2], dungeon);
      
      expect(result).not.toBeNull();
      expect(result?.instanceId).toBe('snake-0');
    });

    it('should return null when all monsters are on hero\'s tile', () => {
      const dungeon = createTestDungeon();
      
      const heroPos = { x: 2, y: 2 };

      // Both monsters on same tile as hero
      const monster1: MonsterState = {
        monsterId: 'kobold',
        instanceId: 'kobold-0',
        position: { x: 2, y: 5 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'start-tile',
      };

      const monster2: MonsterState = {
        monsterId: 'snake',
        instanceId: 'snake-0',
        position: { x: 1, y: 1 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'start-tile',
      };

      const result = findClosestMonsterNotOnTile(heroPos, [monster1, monster2], dungeon);
      expect(result).toBeNull();
    });

    it('should return null when there are no monsters', () => {
      const dungeon = createTestDungeon();
      const heroPos = { x: 2, y: 2 };

      const result = findClosestMonsterNotOnTile(heroPos, [], dungeon);
      expect(result).toBeNull();
    });

    it('should find closer monster when multiple monsters not on tile', () => {
      // Create a dungeon with multiple tiles
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
      
      const nearTile: PlacedTile = {
        id: 'tile-near',
        tileType: 'cave',
        position: { col: 1, row: 0 },
        rotation: 0,
        edges: {
          north: 'wall',
          south: 'wall',
          east: 'unexplored',
          west: 'wall',
        },
      };

      const farTile: PlacedTile = {
        id: 'tile-far',
        tileType: 'cave',
        position: { col: 2, row: 0 },
        rotation: 0,
        edges: {
          north: 'wall',
          south: 'wall',
          east: 'unexplored',
          west: 'wall',
        },
      };

      const dungeon: DungeonState = {
        tiles: [startTile, nearTile, farTile],
        unexploredEdges: [],
        tileDeck: [],
      };

      const heroPos = { x: 2, y: 2 };

      // Near monster (should be selected)
      const nearMonster: MonsterState = {
        monsterId: 'kobold',
        instanceId: 'kobold-0',
        position: { x: 0, y: 0 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'tile-near',
      };

      // Far monster
      const farMonster: MonsterState = {
        monsterId: 'snake',
        instanceId: 'snake-0',
        position: { x: 0, y: 0 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'tile-far',
      };

      const result = findClosestMonsterNotOnTile(heroPos, [farMonster, nearMonster], dungeon);
      
      expect(result).not.toBeNull();
      expect(result?.instanceId).toBe('kobold-0');
    });
  });
});
