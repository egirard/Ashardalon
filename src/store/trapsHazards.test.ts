import { describe, it, expect } from 'vitest';
import {
  createTrapInstance,
  createHazardInstance,
  tileHasTrap,
  tileHasHazard,
  getTrapsOnTile,
  getHazardsOnTile,
  attemptDisableTrap,
  removeTrap,
  removeHazard,
  applyDamageToHeroesOnTile,
  attackHeroesOnTile,
  getAdjacentPositions,
  findClosestHero,
  moveTowardPosition,
  spreadLavaFlow,
} from './trapsHazards';
import { ENCOUNTER_CARDS } from './types';
import type { TrapState, HazardState, HeroHpState, HeroToken, DungeonState, Position } from './types';

describe('trapsHazards', () => {
  describe('createTrapInstance', () => {
    it('should create a trap instance from a trap encounter card', () => {
      const lavaFlow = ENCOUNTER_CARDS.find(c => c.id === 'lava-flow')!;
      const trap = createTrapInstance('lava-flow', lavaFlow, { x: 5, y: 5 }, 1);
      
      expect(trap).toEqual({
        id: 'trap-1',
        encounterId: 'lava-flow',
        position: { x: 5, y: 5 },
        disableDC: 10,
      });
    });
    
    it('should throw error for non-trap encounter', () => {
      const damage = ENCOUNTER_CARDS.find(c => c.id === 'frenzied-leap')!;
      expect(() => createTrapInstance('frenzied-leap', damage, { x: 5, y: 5 }, 1))
        .toThrow('Cannot create trap from non-trap encounter');
    });
  });
  
  describe('createHazardInstance', () => {
    it('should create a hazard instance', () => {
      const hazard = createHazardInstance('cave-in-hazard', { x: 5, y: 5 }, 1);
      
      expect(hazard).toEqual({
        id: 'hazard-1',
        encounterId: 'cave-in-hazard',
        position: { x: 5, y: 5 },
      });
    });
  });
  
  describe('tileHasTrap', () => {
    it('should return true if tile has a trap', () => {
      const traps: TrapState[] = [
        { id: 'trap-1', encounterId: 'lava-flow', position: { x: 5, y: 5 }, disableDC: 10 },
      ];
      expect(tileHasTrap({ x: 5, y: 5 }, traps)).toBe(true);
    });
    
    it('should return false if tile has no trap', () => {
      const traps: TrapState[] = [
        { id: 'trap-1', encounterId: 'lava-flow', position: { x: 5, y: 5 }, disableDC: 10 },
      ];
      expect(tileHasTrap({ x: 6, y: 5 }, traps)).toBe(false);
    });
  });
  
  describe('tileHasHazard', () => {
    it('should return true if tile has a hazard', () => {
      const hazards: HazardState[] = [
        { id: 'hazard-1', encounterId: 'pit', position: { x: 5, y: 5 } },
      ];
      expect(tileHasHazard({ x: 5, y: 5 }, hazards)).toBe(true);
    });
    
    it('should return false if tile has no hazard', () => {
      const hazards: HazardState[] = [
        { id: 'hazard-1', encounterId: 'pit', position: { x: 5, y: 5 } },
      ];
      expect(tileHasHazard({ x: 6, y: 5 }, hazards)).toBe(false);
    });
  });
  
  describe('getTrapsOnTile', () => {
    it('should return all traps on a tile', () => {
      const traps: TrapState[] = [
        { id: 'trap-1', encounterId: 'lava-flow', position: { x: 5, y: 5 }, disableDC: 10 },
        { id: 'trap-2', encounterId: 'poisoned-dart-trap', position: { x: 5, y: 5 }, disableDC: 10 },
        { id: 'trap-3', encounterId: 'lava-flow', position: { x: 6, y: 5 }, disableDC: 10 },
      ];
      const result = getTrapsOnTile({ x: 5, y: 5 }, traps);
      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toEqual(['trap-1', 'trap-2']);
    });
  });
  
  describe('getHazardsOnTile', () => {
    it('should return all hazards on a tile', () => {
      const hazards: HazardState[] = [
        { id: 'hazard-1', encounterId: 'pit', position: { x: 5, y: 5 } },
        { id: 'hazard-2', encounterId: 'cave-in-hazard', position: { x: 5, y: 5 } },
        { id: 'hazard-3', encounterId: 'pit', position: { x: 6, y: 5 } },
      ];
      const result = getHazardsOnTile({ x: 5, y: 5 }, hazards);
      expect(result).toHaveLength(2);
      expect(result.map(h => h.id)).toEqual(['hazard-1', 'hazard-2']);
    });
  });
  
  describe('attemptDisableTrap', () => {
    it('should succeed when roll meets DC', () => {
      const trap: TrapState = {
        id: 'trap-1',
        encounterId: 'lava-flow',
        position: { x: 5, y: 5 },
        disableDC: 10,
      };
      
      // Roll 10 on d20 (0.45 * 20 = 9, +1 = 10)
      const result = attemptDisableTrap(trap, () => 0.45);
      expect(result).toBe(true);
    });
    
    it('should fail when roll is below DC', () => {
      const trap: TrapState = {
        id: 'trap-1',
        encounterId: 'lava-flow',
        position: { x: 5, y: 5 },
        disableDC: 10,
      };
      
      // Roll 9 on d20 (0.40 * 20 = 8, +1 = 9)
      const result = attemptDisableTrap(trap, () => 0.40);
      expect(result).toBe(false);
    });
  });
  
  describe('removeTrap', () => {
    it('should remove a trap by id', () => {
      const traps: TrapState[] = [
        { id: 'trap-1', encounterId: 'lava-flow', position: { x: 5, y: 5 }, disableDC: 10 },
        { id: 'trap-2', encounterId: 'poisoned-dart-trap', position: { x: 6, y: 5 }, disableDC: 10 },
      ];
      const result = removeTrap('trap-1', traps);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('trap-2');
    });
  });
  
  describe('removeHazard', () => {
    it('should remove a hazard by id', () => {
      const hazards: HazardState[] = [
        { id: 'hazard-1', encounterId: 'pit', position: { x: 5, y: 5 } },
        { id: 'hazard-2', encounterId: 'cave-in-hazard', position: { x: 6, y: 5 } },
      ];
      const result = removeHazard('hazard-1', hazards);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('hazard-2');
    });
  });
  
  describe('applyDamageToHeroesOnTile', () => {
    it('should apply damage to heroes on the specified tile', () => {
      const heroHp: HeroHpState[] = [
        { heroId: 'quinn', currentHp: 8, maxHp: 8, ac: 17, surgeValue: 4, level: 1 },
        { heroId: 'vistra', currentHp: 10, maxHp: 10, ac: 18, surgeValue: 5, level: 1 },
      ];
      const heroTokens: HeroToken[] = [
        { heroId: 'quinn', position: { x: 5, y: 5 } },
        { heroId: 'vistra', position: { x: 6, y: 5 } },
      ];
      
      const result = applyDamageToHeroesOnTile({ x: 5, y: 5 }, 2, heroHp, heroTokens);
      
      expect(result[0].currentHp).toBe(6); // Quinn took 2 damage
      expect(result[1].currentHp).toBe(10); // Vistra not on tile
    });
  });
  
  describe('attackHeroesOnTile', () => {
    it('should attack heroes on tile with hit', () => {
      const heroHp: HeroHpState[] = [
        { heroId: 'quinn', currentHp: 8, maxHp: 8, ac: 17, surgeValue: 4, level: 1 },
      ];
      const heroTokens: HeroToken[] = [
        { heroId: 'quinn', position: { x: 5, y: 5 } },
      ];
      
      // Roll 10, +8 = 18 vs AC 17 = hit for 2 damage
      const result = attackHeroesOnTile(
        { x: 5, y: 5 }, 8, 2, 1, heroHp, heroTokens, () => 0.45
      );
      
      expect(result[0].currentHp).toBe(6);
    });
    
    it('should apply miss damage on miss', () => {
      const heroHp: HeroHpState[] = [
        { heroId: 'quinn', currentHp: 8, maxHp: 8, ac: 17, surgeValue: 4, level: 1 },
      ];
      const heroTokens: HeroToken[] = [
        { heroId: 'quinn', position: { x: 5, y: 5 } },
      ];
      
      // Roll 1, +8 = 9 vs AC 17 = miss, 1 damage
      const result = attackHeroesOnTile(
        { x: 5, y: 5 }, 8, 2, 1, heroHp, heroTokens, () => 0.01
      );
      
      expect(result[0].currentHp).toBe(7);
    });
  });
  
  describe('getAdjacentPositions', () => {
    it('should return 4 adjacent positions', () => {
      const result = getAdjacentPositions({ x: 5, y: 5 });
      expect(result).toEqual([
        { x: 5, y: 4 }, // North
        { x: 6, y: 5 }, // East
        { x: 5, y: 6 }, // South
        { x: 4, y: 5 }, // West
      ]);
    });
  });
  
  describe('findClosestHero', () => {
    it('should find the closest hero by Manhattan distance', () => {
      const heroTokens: HeroToken[] = [
        { heroId: 'quinn', position: { x: 2, y: 2 } }, // Distance: |5-2| + |5-2| = 6
        { heroId: 'vistra', position: { x: 6, y: 6 } }, // Distance: |5-6| + |5-6| = 2
      ];
      
      const result = findClosestHero({ x: 5, y: 5 }, heroTokens);
      expect(result?.heroId).toBe('vistra');
    });
    
    it('should return null if no heroes', () => {
      const result = findClosestHero({ x: 5, y: 5 }, []);
      expect(result).toBeNull();
    });
  });
  
  describe('moveTowardPosition', () => {
    it('should move one tile toward target', () => {
      const dungeon: DungeonState = {
        tiles: [
          {
            id: 'start-tile',
            tileType: 'start',
            position: { col: 0, row: 0 },
            rotation: 0,
            edges: { north: 'unexplored', south: 'unexplored', east: 'unexplored', west: 'unexplored' },
          },
        ],
        unexploredEdges: [],
        tileDeck: [],
      };
      
      // Move from (2,2) toward (2,5)
      const result = moveTowardPosition({ x: 2, y: 2 }, { x: 2, y: 5 }, dungeon);
      expect(result).toEqual({ x: 2, y: 3 }); // Should move south
    });
  });
  
  describe('spreadLavaFlow', () => {
    it('should spread to adjacent tile without lava', () => {
      const dungeon: DungeonState = {
        tiles: [
          {
            id: 'start-tile',
            tileType: 'start',
            position: { col: 0, row: 0 },
            rotation: 0,
            edges: { north: 'unexplored', south: 'unexplored', east: 'unexplored', west: 'unexplored' },
          },
        ],
        unexploredEdges: [],
        tileDeck: [],
      };
      
      const allLavaPositions: Position[] = [{ x: 2, y: 2 }];
      
      // Should return one of the adjacent positions
      const result = spreadLavaFlow({ x: 2, y: 2 }, allLavaPositions, dungeon, () => 0.5);
      expect(result).not.toBeNull();
      
      // Should be adjacent
      const distance = Math.abs(result!.x - 2) + Math.abs(result!.y - 2);
      expect(distance).toBe(1);
    });
    
    it('should return null if all adjacent tiles have lava', () => {
      const dungeon: DungeonState = {
        tiles: [
          {
            id: 'start-tile',
            tileType: 'start',
            position: { col: 0, row: 0 },
            rotation: 0,
            edges: { north: 'unexplored', south: 'unexplored', east: 'unexplored', west: 'unexplored' },
          },
        ],
        unexploredEdges: [],
        tileDeck: [],
      };
      
      // All adjacent tiles have lava
      const allLavaPositions: Position[] = [
        { x: 2, y: 2 },
        { x: 2, y: 1 }, // North
        { x: 3, y: 2 }, // East
        { x: 2, y: 3 }, // South
        { x: 1, y: 2 }, // West
      ];
      
      const result = spreadLavaFlow({ x: 2, y: 2 }, allLavaPositions, dungeon, () => 0.5);
      expect(result).toBeNull();
    });
  });
});
