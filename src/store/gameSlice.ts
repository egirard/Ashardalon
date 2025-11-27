import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { GameScreen, HeroToken, Position, START_TILE_POSITIONS, TurnState } from './types';

/**
 * Default turn state for the beginning of a game
 */
const DEFAULT_TURN_STATE: TurnState = {
  currentHeroIndex: 0,
  currentPhase: 'hero-phase',
  turnNumber: 1,
};

export interface GameState {
  currentScreen: GameScreen;
  heroTokens: HeroToken[];
  turnState: TurnState;
}

const initialState: GameState = {
  currentScreen: 'character-select',
  heroTokens: [],
  turnState: { ...DEFAULT_TURN_STATE },
};

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export interface StartGamePayload {
  heroIds: string[];
  /** Optional positions for deterministic testing. If not provided, positions are randomly assigned. */
  positions?: Position[];
}

export const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    startGame: (state, action: PayloadAction<StartGamePayload>) => {
      const { heroIds, positions } = action.payload;
      
      if (heroIds.length === 0 || heroIds.length > 5) {
        return; // Invalid number of heroes
      }
      
      // Use provided positions or randomly assign
      const assignedPositions = positions ?? shuffleArray(START_TILE_POSITIONS);
      
      state.heroTokens = heroIds.map((heroId, index) => ({
        heroId,
        position: assignedPositions[index],
      }));
      
      // Initialize turn state
      state.turnState = { ...DEFAULT_TURN_STATE };
      
      state.currentScreen = 'game-board';
    },
    setHeroPosition: (state, action: PayloadAction<{ heroId: string; position: Position }>) => {
      const token = state.heroTokens.find(t => t.heroId === action.payload.heroId);
      if (token) {
        token.position = action.payload.position;
      }
    },
    resetGame: (state) => {
      state.currentScreen = 'character-select';
      state.heroTokens = [];
      state.turnState = { ...DEFAULT_TURN_STATE };
    },
  },
});

export const { startGame, setHeroPosition, resetGame } = gameSlice.actions;
export default gameSlice.reducer;
