import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  GameScreen,
  HeroToken,
  Position,
  START_TILE_POSITIONS,
  TurnState,
} from "./types";
import { getValidMoveSquares, isValidMoveDestination } from "./movement";

/**
 * Default turn state for the beginning of a game
 */
const DEFAULT_TURN_STATE: TurnState = {
  currentHeroIndex: 0,
  currentPhase: "hero-phase",
  turnNumber: 1,
};

export interface GameState {
  currentScreen: GameScreen;
  heroTokens: HeroToken[];
  turnState: TurnState;
  /** Seed used for random number generation, enables reproducible game states */
  randomSeed?: number;
  /** Valid movement squares for the current hero (when showing movement overlay) */
  validMoveSquares: Position[];
  /** Whether the movement overlay is currently shown */
  showingMovement: boolean;
}

const initialState: GameState = {
  currentScreen: "character-select",
  heroTokens: [],
  turnState: { ...DEFAULT_TURN_STATE },
  validMoveSquares: [],
  showingMovement: false,
};

/**
 * Seeded random number generator using a simple LCG (Linear Congruential Generator)
 * Returns a function that generates random numbers between 0 and 1
 */
function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    // LCG parameters (same as glibc)
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * Shuffle array using Fisher-Yates algorithm with optional seeded randomness
 */
function shuffleArray<T>(
  array: T[],
  randomFn: () => number = Math.random,
): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export interface StartGamePayload {
  heroIds: string[];
  /** Optional positions for deterministic testing. If not provided, positions are randomly assigned. */
  positions?: Position[];
  /** Optional seed for random number generation. If not provided, uses current timestamp. */
  seed?: number;
}

export const gameSlice = createSlice({
  name: "game",
  initialState,
  reducers: {
    startGame: (state, action: PayloadAction<StartGamePayload>) => {
      const { heroIds, positions, seed } = action.payload;

      if (heroIds.length === 0 || heroIds.length > 5) {
        return; // Invalid number of heroes
      }

      // Use provided seed or generate one from current timestamp
      const gameSeed = seed ?? Date.now();
      state.randomSeed = gameSeed;

      // Use provided positions or randomly assign from shuffled START_TILE_POSITIONS
      let assignedPositions: Position[];
      if (positions) {
        assignedPositions = positions;
      } else {
        const randomFn = createSeededRandom(gameSeed);
        const shuffledPositions = shuffleArray(START_TILE_POSITIONS, randomFn);
        // Take only the first 5 positions (for up to 5 heroes)
        assignedPositions = shuffledPositions.slice(0, 5);
      }

      state.heroTokens = heroIds.map((heroId, index) => ({
        heroId,
        position: assignedPositions[index],
      }));

      // Initialize turn state
      state.turnState = { ...DEFAULT_TURN_STATE };

      // Clear any movement state
      state.validMoveSquares = [];
      state.showingMovement = false;

      state.currentScreen = "game-board";
    },
    setHeroPosition: (
      state,
      action: PayloadAction<{ heroId: string; position: Position }>,
    ) => {
      const token = state.heroTokens.find(
        (t) => t.heroId === action.payload.heroId,
      );
      if (token) {
        token.position = action.payload.position;
      }
    },
    /**
     * Show valid movement squares for the specified hero
     */
    showMovement: (
      state,
      action: PayloadAction<{ heroId: string; speed: number }>,
    ) => {
      const { heroId, speed } = action.payload;
      const token = state.heroTokens.find((t) => t.heroId === heroId);
      
      if (token) {
        state.validMoveSquares = getValidMoveSquares(
          token.position,
          speed,
          state.heroTokens,
          heroId,
        );
        state.showingMovement = true;
      }
    },
    /**
     * Hide the movement overlay
     */
    hideMovement: (state) => {
      state.validMoveSquares = [];
      state.showingMovement = false;
    },
    /**
     * Move the current hero to a new position (must be a valid move square)
     */
    moveHero: (
      state,
      action: PayloadAction<{ heroId: string; position: Position }>,
    ) => {
      const { heroId, position } = action.payload;
      
      // Verify this is a valid move destination
      if (!isValidMoveDestination(position, state.validMoveSquares)) {
        return;
      }
      
      const token = state.heroTokens.find((t) => t.heroId === heroId);
      if (token) {
        token.position = position;
        // Clear movement overlay after moving
        state.validMoveSquares = [];
        state.showingMovement = false;
      }
    },
    resetGame: (state) => {
      state.currentScreen = "character-select";
      state.heroTokens = [];
      state.turnState = { ...DEFAULT_TURN_STATE };
      state.randomSeed = undefined;
      state.validMoveSquares = [];
      state.showingMovement = false;
    },
  },
});

export const { startGame, setHeroPosition, showMovement, hideMovement, moveHero, resetGame } = gameSlice.actions;
export default gameSlice.reducer;
