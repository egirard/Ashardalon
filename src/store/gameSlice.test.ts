import { describe, it, expect, vi } from 'vitest';
import gameReducer, { startGame, setHeroPosition, resetGame, GameState } from './gameSlice';
import { START_TILE_POSITIONS } from './types';

describe('gameSlice', () => {
  const initialState: GameState = {
    currentScreen: 'character-select',
    heroTokens: [],
  };

  describe('initial state', () => {
    it('should return the initial state', () => {
      const state = gameReducer(undefined, { type: 'unknown' });
      expect(state.currentScreen).toBe('character-select');
      expect(state.heroTokens).toEqual([]);
    });
  });

  describe('startGame', () => {
    it('should transition to game-board screen', () => {
      const state = gameReducer(initialState, startGame({ heroIds: ['quinn'] }));
      expect(state.currentScreen).toBe('game-board');
    });

    it('should create hero tokens for each selected hero', () => {
      const heroIds = ['quinn', 'vistra', 'keyleth'];
      const state = gameReducer(initialState, startGame({ heroIds }));
      
      expect(state.heroTokens).toHaveLength(3);
      expect(state.heroTokens.map(t => t.heroId)).toEqual(heroIds);
    });

    it('should assign positions from START_TILE_POSITIONS', () => {
      const heroIds = ['quinn', 'vistra'];
      const state = gameReducer(initialState, startGame({ heroIds }));
      
      state.heroTokens.forEach(token => {
        const positionExists = START_TILE_POSITIONS.some(
          pos => pos.x === token.position.x && pos.y === token.position.y
        );
        expect(positionExists).toBe(true);
      });
    });

    it('should assign unique positions to each hero', () => {
      const heroIds = ['quinn', 'vistra', 'keyleth', 'tarak', 'haskan'];
      const state = gameReducer(initialState, startGame({ heroIds }));
      
      const positions = state.heroTokens.map(t => `${t.position.x},${t.position.y}`);
      const uniquePositions = new Set(positions);
      expect(uniquePositions.size).toBe(heroIds.length);
    });

    it('should not start game with empty hero list', () => {
      const state = gameReducer(initialState, startGame({ heroIds: [] }));
      expect(state.currentScreen).toBe('character-select');
      expect(state.heroTokens).toEqual([]);
    });

    it('should not start game with more than 5 heroes', () => {
      const heroIds = ['quinn', 'vistra', 'keyleth', 'tarak', 'haskan', 'extra'];
      const state = gameReducer(initialState, startGame({ heroIds }));
      expect(state.currentScreen).toBe('character-select');
      expect(state.heroTokens).toEqual([]);
    });

    it('should work with single hero', () => {
      const state = gameReducer(initialState, startGame({ heroIds: ['quinn'] }));
      expect(state.heroTokens).toHaveLength(1);
      expect(state.heroTokens[0].heroId).toBe('quinn');
    });

    it('should use provided positions when specified', () => {
      const heroIds = ['quinn', 'vistra'];
      const positions = [{ x: 2, y: 2 }, { x: 3, y: 3 }];
      const state = gameReducer(initialState, startGame({ heroIds, positions }));
      
      expect(state.heroTokens[0].position).toEqual({ x: 2, y: 2 });
      expect(state.heroTokens[1].position).toEqual({ x: 3, y: 3 });
    });
  });

  describe('setHeroPosition', () => {
    const stateWithTokens: GameState = {
      currentScreen: 'game-board',
      heroTokens: [
        { heroId: 'quinn', position: { x: 2, y: 2 } },
        { heroId: 'vistra', position: { x: 3, y: 2 } },
      ],
    };

    it('should update hero position', () => {
      const newPosition = { x: 4, y: 3 };
      const state = gameReducer(
        stateWithTokens, 
        setHeroPosition({ heroId: 'quinn', position: newPosition })
      );
      
      const quinnToken = state.heroTokens.find(t => t.heroId === 'quinn');
      expect(quinnToken?.position).toEqual(newPosition);
    });

    it('should not affect other heroes when updating one', () => {
      const newPosition = { x: 4, y: 3 };
      const state = gameReducer(
        stateWithTokens, 
        setHeroPosition({ heroId: 'quinn', position: newPosition })
      );
      
      const vistraToken = state.heroTokens.find(t => t.heroId === 'vistra');
      expect(vistraToken?.position).toEqual({ x: 3, y: 2 });
    });

    it('should do nothing for non-existent hero', () => {
      const state = gameReducer(
        stateWithTokens, 
        setHeroPosition({ heroId: 'nonexistent', position: { x: 5, y: 5 } })
      );
      
      expect(state.heroTokens).toEqual(stateWithTokens.heroTokens);
    });
  });

  describe('resetGame', () => {
    it('should reset to character-select screen', () => {
      const gameInProgress: GameState = {
        currentScreen: 'game-board',
        heroTokens: [{ heroId: 'quinn', position: { x: 2, y: 2 } }],
      };
      const state = gameReducer(gameInProgress, resetGame());
      expect(state.currentScreen).toBe('character-select');
    });

    it('should clear all hero tokens', () => {
      const gameInProgress: GameState = {
        currentScreen: 'game-board',
        heroTokens: [
          { heroId: 'quinn', position: { x: 2, y: 2 } },
          { heroId: 'vistra', position: { x: 3, y: 2 } },
        ],
      };
      const state = gameReducer(gameInProgress, resetGame());
      expect(state.heroTokens).toEqual([]);
    });
  });
});
