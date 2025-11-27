import { describe, it, expect, vi } from 'vitest';
import gameReducer, { startGame, setHeroPosition, resetGame, GameState } from './gameSlice';
import { START_TILE_POSITIONS } from './types';

// Start tile grid dimensions - double-height tile with valid spaces x: 1-4, y: 0-7
const START_TILE_GRID = { minX: 1, maxX: 4, minY: 0, maxY: 7 };

describe('START_TILE_POSITIONS', () => {
  it('should have exactly 5 positions for up to 5 heroes', () => {
    expect(START_TILE_POSITIONS).toHaveLength(5);
  });

  it('should have all positions within valid grid bounds', () => {
    START_TILE_POSITIONS.forEach((pos, index) => {
      expect(pos.x, `Position ${index} x=${pos.x} should be >= ${START_TILE_GRID.minX}`).toBeGreaterThanOrEqual(START_TILE_GRID.minX);
      expect(pos.x, `Position ${index} x=${pos.x} should be <= ${START_TILE_GRID.maxX}`).toBeLessThanOrEqual(START_TILE_GRID.maxX);
      expect(pos.y, `Position ${index} y=${pos.y} should be >= ${START_TILE_GRID.minY}`).toBeGreaterThanOrEqual(START_TILE_GRID.minY);
      expect(pos.y, `Position ${index} y=${pos.y} should be <= ${START_TILE_GRID.maxY}`).toBeLessThanOrEqual(START_TILE_GRID.maxY);
    });
  });

  it('should have all unique positions', () => {
    const positionStrings = START_TILE_POSITIONS.map(p => `${p.x},${p.y}`);
    const uniquePositions = new Set(positionStrings);
    expect(uniquePositions.size).toBe(START_TILE_POSITIONS.length);
  });
});

describe('gameSlice', () => {
  const initialState: GameState = {
    currentScreen: 'character-select',
    heroTokens: [],
    turnState: {
      currentHeroIndex: 0,
      currentPhase: 'hero-phase',
      turnNumber: 1,
    },
  };

  describe('initial state', () => {
    it('should return the initial state', () => {
      const state = gameReducer(undefined, { type: 'unknown' });
      expect(state.currentScreen).toBe('character-select');
      expect(state.heroTokens).toEqual([]);
    });

    it('should initialize turn state with first hero active', () => {
      const state = gameReducer(undefined, { type: 'unknown' });
      expect(state.turnState.currentHeroIndex).toBe(0);
    });

    it('should initialize turn state in Hero Phase', () => {
      const state = gameReducer(undefined, { type: 'unknown' });
      expect(state.turnState.currentPhase).toBe('hero-phase');
    });

    it('should initialize turn number at 1', () => {
      const state = gameReducer(undefined, { type: 'unknown' });
      expect(state.turnState.turnNumber).toBe(1);
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

    it('should initialize turn state to first hero active', () => {
      const heroIds = ['quinn', 'vistra'];
      const state = gameReducer(initialState, startGame({ heroIds }));
      
      expect(state.turnState.currentHeroIndex).toBe(0);
    });

    it('should initialize turn state in Hero Phase', () => {
      const heroIds = ['quinn'];
      const state = gameReducer(initialState, startGame({ heroIds }));
      
      expect(state.turnState.currentPhase).toBe('hero-phase');
    });

    it('should initialize turn number at 1', () => {
      const heroIds = ['quinn'];
      const state = gameReducer(initialState, startGame({ heroIds }));
      
      expect(state.turnState.turnNumber).toBe(1);
    });
  });

  describe('setHeroPosition', () => {
    const stateWithTokens: GameState = {
      currentScreen: 'game-board',
      heroTokens: [
        { heroId: 'quinn', position: { x: 2, y: 2 } },
        { heroId: 'vistra', position: { x: 3, y: 2 } },
      ],
      turnState: {
        currentHeroIndex: 0,
        currentPhase: 'hero-phase',
        turnNumber: 1,
      },
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
        turnState: {
          currentHeroIndex: 0,
          currentPhase: 'hero-phase',
          turnNumber: 1,
        },
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
        turnState: {
          currentHeroIndex: 1,
          currentPhase: 'exploration-phase',
          turnNumber: 3,
        },
      };
      const state = gameReducer(gameInProgress, resetGame());
      expect(state.heroTokens).toEqual([]);
    });

    it('should reset turn state', () => {
      const gameInProgress: GameState = {
        currentScreen: 'game-board',
        heroTokens: [{ heroId: 'quinn', position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 2,
          currentPhase: 'villain-phase',
          turnNumber: 5,
        },
      };
      const state = gameReducer(gameInProgress, resetGame());
      expect(state.turnState.currentHeroIndex).toBe(0);
      expect(state.turnState.currentPhase).toBe('hero-phase');
      expect(state.turnState.turnNumber).toBe(1);
    });
  });
});
