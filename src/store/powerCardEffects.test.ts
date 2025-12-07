import { describe, it, expect } from 'vitest';
import {
  getTileSquares,
  createBladeBarrierTokens,
  createFlamingSphereToken,
  checkBladeBarrierDamage,
  getFlamingSphereDamageTargets,
  isWithinTiles,
  getValidFlamingSpherePositions,
  getValidFlamingSphereMovePositions,
} from './powerCardEffects';
import { createBoardToken } from './boardTokens';
import type { DungeonState, MonsterState, Position } from './types';

describe('powerCardEffects', () => {
  const mockDungeon: DungeonState = {
    tiles: [
      {
        id: 'start-tile',
        tileType: 'start',
        position: { col: 0, row: 0 },
        rotation: 0,
        edges: { north: 'wall', south: 'wall', east: 'open', west: 'wall' },
      },
      {
        id: 'tile-1',
        tileType: 'tile-black-2exit-a',
        position: { col: 1, row: 0 },
        rotation: 0,
        edges: { north: 'wall', south: 'wall', east: 'wall', west: 'open' },
      },
    ],
    unexploredEdges: [],
    tileDeck: [],
  };

  describe('getTileSquares', () => {
    it('should return valid squares for a normal tile', () => {
      const squares = getTileSquares('tile-1', mockDungeon);
      expect(squares.length).toBeGreaterThan(0);
      // Normal 4x4 tile at col 1, row 0 should have squares at (5,1) to (6,2)
      expect(squares).toContainEqual({ x: 5, y: 1 });
      expect(squares).toContainEqual({ x: 6, y: 2 });
    });

    it('should return empty array for non-existent tile', () => {
      const squares = getTileSquares('nonexistent', mockDungeon);
      expect(squares).toEqual([]);
    });

    it('should handle start tile with double height', () => {
      const squares = getTileSquares('start-tile', mockDungeon);
      expect(squares.length).toBeGreaterThan(0);
    });
  });

  describe('createBladeBarrierTokens', () => {
    it('should create blade barrier tokens on valid squares (up to 5)', () => {
      const tokens = createBladeBarrierTokens('quinn', 'tile-1', mockDungeon, 1);
      // Normal 4x4 tile has only 4 valid interior squares (2x2)
      expect(tokens).toHaveLength(4);
      expect(tokens[0].type).toBe('blade-barrier');
      expect(tokens[0].powerCardId).toBe(5);
      expect(tokens[0].ownerId).toBe('quinn');
      expect(tokens[0].id).toBe('token-blade-barrier-1');
    });

    it('should place tokens on different squares', () => {
      const tokens = createBladeBarrierTokens('quinn', 'tile-1', mockDungeon, 1);
      const positions = tokens.map(t => `${t.position.x},${t.position.y}`);
      const uniquePositions = new Set(positions);
      expect(uniquePositions.size).toBe(tokens.length);
    });
  });

  describe('createFlamingSphereToken', () => {
    it('should create flaming sphere token with 3 charges', () => {
      const token = createFlamingSphereToken('haskan', { x: 5, y: 1 }, 1);
      expect(token.type).toBe('flaming-sphere');
      expect(token.powerCardId).toBe(45);
      expect(token.ownerId).toBe('haskan');
      expect(token.charges).toBe(3);
      expect(token.canMove).toBe(true);
      expect(token.position).toEqual({ x: 5, y: 1 });
    });
  });

  describe('checkBladeBarrierDamage', () => {
    const tokens = [
      createBoardToken('blade-barrier', 5, 'quinn', { x: 5, y: 1 }, 1),
      createBoardToken('blade-barrier', 5, 'quinn', { x: 5, y: 2 }, 2),
    ];

    it('should detect when monster is placed on blade barrier', () => {
      const result = checkBladeBarrierDamage({ x: 5, y: 1 }, tokens);
      expect(result.shouldDamage).toBe(true);
      expect(result.tokenToRemove).toBe('token-blade-barrier-1');
    });

    it('should return no damage when monster is not on blade barrier', () => {
      const result = checkBladeBarrierDamage({ x: 6, y: 6 }, tokens);
      expect(result.shouldDamage).toBe(false);
      expect(result.tokenToRemove).toBeNull();
    });
  });

  describe('getFlamingSphereDamageTargets', () => {
    const token = createBoardToken('flaming-sphere', 45, 'haskan', { x: 5, y: 1 }, 1, {
      charges: 3,
      canMove: true,
    });

    const monsters: MonsterState[] = [
      {
        monsterId: 'kobold',
        instanceId: 'kobold-1',
        position: { x: 5, y: 1 }, // Same tile as token
        currentHp: 1,
        controllerId: 'haskan',
        tileId: 'tile-1',
      },
      {
        monsterId: 'kobold',
        instanceId: 'kobold-2',
        position: { x: 6, y: 2 }, // Same tile as token
        currentHp: 1,
        controllerId: 'haskan',
        tileId: 'tile-1',
      },
      {
        monsterId: 'kobold',
        instanceId: 'kobold-3',
        position: { x: 1, y: 1 }, // Different tile
        currentHp: 1,
        controllerId: 'haskan',
        tileId: 'start-tile',
      },
    ];

    it('should find all monsters on the same tile as token', () => {
      const targets = getFlamingSphereDamageTargets(token, monsters);
      expect(targets).toHaveLength(2);
      expect(targets.map(t => t.instanceId)).toContain('kobold-1');
      expect(targets.map(t => t.instanceId)).toContain('kobold-2');
    });

    it('should not include monsters on different tiles', () => {
      const targets = getFlamingSphereDamageTargets(token, monsters);
      expect(targets.map(t => t.instanceId)).not.toContain('kobold-3');
    });
  });

  describe('isWithinTiles', () => {
    it('should return true for positions on the same tile', () => {
      const result = isWithinTiles({ x: 5, y: 1 }, { x: 6, y: 2 }, 0);
      expect(result).toBe(true);
    });

    it('should return true for positions within 1 tile', () => {
      const result = isWithinTiles({ x: 2, y: 2 }, { x: 5, y: 1 }, 1);
      expect(result).toBe(true);
    });

    it('should return false for positions beyond tile distance', () => {
      const result = isWithinTiles({ x: 1, y: 1 }, { x: 9, y: 1 }, 1);
      expect(result).toBe(false);
    });
  });

  describe('getValidFlamingSpherePositions', () => {
    it('should return positions within 1 tile of hero', () => {
      const heroPosition: Position = { x: 2, y: 2 };
      const positions = getValidFlamingSpherePositions(heroPosition, mockDungeon);
      expect(positions.length).toBeGreaterThan(0);
      // All returned positions should be within 1 tile
      positions.forEach(pos => {
        expect(isWithinTiles(heroPosition, pos, 1)).toBe(true);
      });
    });
  });

  describe('getValidFlamingSphereMovePositions', () => {
    it('should return positions within 1 tile of current position', () => {
      const currentPosition: Position = { x: 5, y: 1 };
      const positions = getValidFlamingSphereMovePositions(currentPosition, mockDungeon);
      expect(positions.length).toBeGreaterThan(0);
      // All returned positions should be within 1 tile
      positions.forEach(pos => {
        expect(isWithinTiles(currentPosition, pos, 1)).toBe(true);
      });
    });
  });
});
