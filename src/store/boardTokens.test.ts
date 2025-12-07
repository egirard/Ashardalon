import { describe, it, expect } from 'vitest';
import {
  createBoardToken,
  hasTokenAtPosition,
  getTokensAtPosition,
  getTokensByOwner,
  getTokensByType,
  removeToken,
  moveToken,
  decrementTokenCharges,
  getTokenDisplayInfo,
} from './boardTokens';
import type { BoardTokenState, Position } from './types';

describe('boardTokens', () => {
  describe('createBoardToken', () => {
    it('should create a basic board token', () => {
      const token = createBoardToken(
        'blade-barrier',
        5,
        'quinn',
        { x: 2, y: 3 },
        1
      );

      expect(token).toEqual({
        id: 'token-blade-barrier-1',
        type: 'blade-barrier',
        powerCardId: 5,
        ownerId: 'quinn',
        position: { x: 2, y: 3 },
        charges: undefined,
        canMove: undefined,
      });
    });

    it('should create a token with charges and canMove options', () => {
      const token = createBoardToken(
        'flaming-sphere',
        45,
        'haskan',
        { x: 1, y: 1 },
        2,
        { charges: 3, canMove: true }
      );

      expect(token).toEqual({
        id: 'token-flaming-sphere-2',
        type: 'flaming-sphere',
        powerCardId: 45,
        ownerId: 'haskan',
        position: { x: 1, y: 1 },
        charges: 3,
        canMove: true,
      });
    });
  });

  describe('hasTokenAtPosition', () => {
    const tokens: BoardTokenState[] = [
      createBoardToken('blade-barrier', 5, 'quinn', { x: 2, y: 3 }, 1),
      createBoardToken('flaming-sphere', 45, 'haskan', { x: 2, y: 3 }, 2),
      createBoardToken('blade-barrier', 5, 'quinn', { x: 4, y: 5 }, 3),
    ];

    it('should return true if any token exists at position', () => {
      expect(hasTokenAtPosition({ x: 2, y: 3 }, tokens)).toBe(true);
    });

    it('should return false if no token exists at position', () => {
      expect(hasTokenAtPosition({ x: 0, y: 0 }, tokens)).toBe(false);
    });

    it('should filter by type when specified', () => {
      expect(hasTokenAtPosition({ x: 2, y: 3 }, tokens, 'blade-barrier')).toBe(true);
      expect(hasTokenAtPosition({ x: 2, y: 3 }, tokens, 'wizard-eye')).toBe(false);
    });
  });

  describe('getTokensAtPosition', () => {
    const tokens: BoardTokenState[] = [
      createBoardToken('blade-barrier', 5, 'quinn', { x: 2, y: 3 }, 1),
      createBoardToken('flaming-sphere', 45, 'haskan', { x: 2, y: 3 }, 2),
      createBoardToken('blade-barrier', 5, 'quinn', { x: 4, y: 5 }, 3),
    ];

    it('should return all tokens at a position', () => {
      const result = getTokensAtPosition({ x: 2, y: 3 }, tokens);
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('blade-barrier');
      expect(result[1].type).toBe('flaming-sphere');
    });

    it('should return empty array if no tokens at position', () => {
      const result = getTokensAtPosition({ x: 0, y: 0 }, tokens);
      expect(result).toHaveLength(0);
    });
  });

  describe('getTokensByOwner', () => {
    const tokens: BoardTokenState[] = [
      createBoardToken('blade-barrier', 5, 'quinn', { x: 2, y: 3 }, 1),
      createBoardToken('flaming-sphere', 45, 'haskan', { x: 2, y: 3 }, 2),
      createBoardToken('blade-barrier', 5, 'quinn', { x: 4, y: 5 }, 3),
    ];

    it('should return all tokens owned by a hero', () => {
      const result = getTokensByOwner('quinn', tokens);
      expect(result).toHaveLength(2);
      expect(result.every(t => t.ownerId === 'quinn')).toBe(true);
    });

    it('should return empty array if hero owns no tokens', () => {
      const result = getTokensByOwner('vistra', tokens);
      expect(result).toHaveLength(0);
    });
  });

  describe('getTokensByType', () => {
    const tokens: BoardTokenState[] = [
      createBoardToken('blade-barrier', 5, 'quinn', { x: 2, y: 3 }, 1),
      createBoardToken('flaming-sphere', 45, 'haskan', { x: 2, y: 3 }, 2),
      createBoardToken('blade-barrier', 5, 'quinn', { x: 4, y: 5 }, 3),
    ];

    it('should return all tokens of a specific type', () => {
      const result = getTokensByType('blade-barrier', tokens);
      expect(result).toHaveLength(2);
      expect(result.every(t => t.type === 'blade-barrier')).toBe(true);
    });

    it('should return empty array if no tokens of that type', () => {
      const result = getTokensByType('wizard-eye', tokens);
      expect(result).toHaveLength(0);
    });
  });

  describe('removeToken', () => {
    const tokens: BoardTokenState[] = [
      createBoardToken('blade-barrier', 5, 'quinn', { x: 2, y: 3 }, 1),
      createBoardToken('flaming-sphere', 45, 'haskan', { x: 2, y: 3 }, 2),
      createBoardToken('blade-barrier', 5, 'quinn', { x: 4, y: 5 }, 3),
    ];

    it('should remove token by ID', () => {
      const result = removeToken('token-blade-barrier-1', tokens);
      expect(result).toHaveLength(2);
      expect(result.find(t => t.id === 'token-blade-barrier-1')).toBeUndefined();
    });

    it('should return unchanged array if token not found', () => {
      const result = removeToken('nonexistent', tokens);
      expect(result).toHaveLength(3);
    });
  });

  describe('moveToken', () => {
    const tokens: BoardTokenState[] = [
      createBoardToken('blade-barrier', 5, 'quinn', { x: 2, y: 3 }, 1),
      createBoardToken('flaming-sphere', 45, 'haskan', { x: 2, y: 3 }, 2, { canMove: true }),
    ];

    it('should update token position', () => {
      const result = moveToken('token-flaming-sphere-2', { x: 3, y: 4 }, tokens);
      const movedToken = result.find(t => t.id === 'token-flaming-sphere-2');
      expect(movedToken?.position).toEqual({ x: 3, y: 4 });
    });

    it('should not affect other tokens', () => {
      const result = moveToken('token-flaming-sphere-2', { x: 3, y: 4 }, tokens);
      const otherToken = result.find(t => t.id === 'token-blade-barrier-1');
      expect(otherToken?.position).toEqual({ x: 2, y: 3 });
    });
  });

  describe('decrementTokenCharges', () => {
    it('should decrement charges', () => {
      const tokens: BoardTokenState[] = [
        createBoardToken('flaming-sphere', 45, 'haskan', { x: 2, y: 3 }, 1, { charges: 3 }),
      ];

      const result = decrementTokenCharges('token-flaming-sphere-1', tokens);
      expect(result[0].charges).toBe(2);
    });

    it('should remove token when charges reach 0', () => {
      const tokens: BoardTokenState[] = [
        createBoardToken('flaming-sphere', 45, 'haskan', { x: 2, y: 3 }, 1, { charges: 1 }),
      ];

      const result = decrementTokenCharges('token-flaming-sphere-1', tokens);
      expect(result).toHaveLength(0);
    });

    it('should not affect tokens without charges', () => {
      const tokens: BoardTokenState[] = [
        createBoardToken('blade-barrier', 5, 'quinn', { x: 2, y: 3 }, 1),
      ];

      const result = decrementTokenCharges('token-blade-barrier-1', tokens);
      expect(result).toHaveLength(1);
      expect(result[0].charges).toBeUndefined();
    });
  });

  describe('getTokenDisplayInfo', () => {
    it('should return correct info for blade-barrier', () => {
      const info = getTokenDisplayInfo('blade-barrier');
      expect(info.name).toBe('Blade Barrier');
      expect(info.emoji).toBe('⚔️');
      expect(info.color).toBe('#c0c0c0');
    });

    it('should return correct info for flaming-sphere', () => {
      const info = getTokenDisplayInfo('flaming-sphere');
      expect(info.name).toBe('Flaming Sphere');
      expect(info.emoji).toBe('🔥');
      expect(info.color).toBe('#ff6600');
    });

    it('should return correct info for mirror-image', () => {
      const info = getTokenDisplayInfo('mirror-image');
      expect(info.name).toBe('Mirror Image');
      expect(info.emoji).toBe('👤');
      expect(info.color).toBe('#00aaff');
    });

    it('should return correct info for wizard-eye', () => {
      const info = getTokenDisplayInfo('wizard-eye');
      expect(info.name).toBe('Wizard Eye');
      expect(info.emoji).toBe('👁️');
      expect(info.color).toBe('#9900ff');
    });
  });
});
