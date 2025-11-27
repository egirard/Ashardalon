import { describe, it, expect, vi } from "vitest";
import gameReducer, {
  startGame,
  setHeroPosition,
  resetGame,
  showMovement,
  hideMovement,
  moveHero,
  endHeroPhase,
  endExplorationPhase,
  endVillainPhase,
  GameState,
} from "./gameSlice";
import { START_TILE_POSITIONS } from "./types";

// Start tile grid dimensions - double-height tile with valid spaces x: 1-3, y: 0-7
const START_TILE_GRID = { minX: 1, maxX: 3, minY: 0, maxY: 7 };

describe("START_TILE_POSITIONS", () => {
  it("should have exactly 8 possible positions around the staircase", () => {
    expect(START_TILE_POSITIONS).toHaveLength(8);
  });

  it("should have all positions within valid grid bounds", () => {
    START_TILE_POSITIONS.forEach((pos, index) => {
      expect(
        pos.x,
        `Position ${index} x=${pos.x} should be >= ${START_TILE_GRID.minX}`,
      ).toBeGreaterThanOrEqual(START_TILE_GRID.minX);
      expect(
        pos.x,
        `Position ${index} x=${pos.x} should be <= ${START_TILE_GRID.maxX}`,
      ).toBeLessThanOrEqual(START_TILE_GRID.maxX);
      expect(
        pos.y,
        `Position ${index} y=${pos.y} should be >= ${START_TILE_GRID.minY}`,
      ).toBeGreaterThanOrEqual(START_TILE_GRID.minY);
      expect(
        pos.y,
        `Position ${index} y=${pos.y} should be <= ${START_TILE_GRID.maxY}`,
      ).toBeLessThanOrEqual(START_TILE_GRID.maxY);
    });
  });

  it("should have all unique positions", () => {
    const positionStrings = START_TILE_POSITIONS.map((p) => `${p.x},${p.y}`);
    const uniquePositions = new Set(positionStrings);
    expect(uniquePositions.size).toBe(START_TILE_POSITIONS.length);
  });
});

describe("gameSlice", () => {
  const initialState: GameState = {
    currentScreen: "character-select",
    heroTokens: [],
    turnState: {
      currentHeroIndex: 0,
      currentPhase: "hero-phase",
      turnNumber: 1,
    },
  };

  describe("initial state", () => {
    it("should return the initial state", () => {
      const state = gameReducer(undefined, { type: "unknown" });
      expect(state.currentScreen).toBe("character-select");
      expect(state.heroTokens).toEqual([]);
    });

    it("should initialize turn state with first hero active", () => {
      const state = gameReducer(undefined, { type: "unknown" });
      expect(state.turnState.currentHeroIndex).toBe(0);
    });

    it("should initialize turn state in Hero Phase", () => {
      const state = gameReducer(undefined, { type: "unknown" });
      expect(state.turnState.currentPhase).toBe("hero-phase");
    });

    it("should initialize turn number at 1", () => {
      const state = gameReducer(undefined, { type: "unknown" });
      expect(state.turnState.turnNumber).toBe(1);
    });
  });

  describe("startGame", () => {
    it("should transition to game-board screen", () => {
      const state = gameReducer(
        initialState,
        startGame({ heroIds: ["quinn"] }),
      );
      expect(state.currentScreen).toBe("game-board");
    });

    it("should create hero tokens for each selected hero", () => {
      const heroIds = ["quinn", "vistra", "keyleth"];
      const state = gameReducer(initialState, startGame({ heroIds }));

      expect(state.heroTokens).toHaveLength(3);
      expect(state.heroTokens.map((t) => t.heroId)).toEqual(heroIds);
    });

    it("should assign positions from START_TILE_POSITIONS", () => {
      const heroIds = ["quinn", "vistra"];
      const state = gameReducer(initialState, startGame({ heroIds }));

      state.heroTokens.forEach((token) => {
        const positionExists = START_TILE_POSITIONS.some(
          (pos) => pos.x === token.position.x && pos.y === token.position.y,
        );
        expect(positionExists).toBe(true);
      });
    });

    it("should assign unique positions to each hero", () => {
      const heroIds = ["quinn", "vistra", "keyleth", "tarak", "haskan"];
      const state = gameReducer(initialState, startGame({ heroIds }));

      const positions = state.heroTokens.map(
        (t) => `${t.position.x},${t.position.y}`,
      );
      const uniquePositions = new Set(positions);
      expect(uniquePositions.size).toBe(heroIds.length);
    });

    it("should not start game with empty hero list", () => {
      const state = gameReducer(initialState, startGame({ heroIds: [] }));
      expect(state.currentScreen).toBe("character-select");
      expect(state.heroTokens).toEqual([]);
    });

    it("should not start game with more than 5 heroes", () => {
      const heroIds = [
        "quinn",
        "vistra",
        "keyleth",
        "tarak",
        "haskan",
        "extra",
      ];
      const state = gameReducer(initialState, startGame({ heroIds }));
      expect(state.currentScreen).toBe("character-select");
      expect(state.heroTokens).toEqual([]);
    });

    it("should work with single hero", () => {
      const state = gameReducer(
        initialState,
        startGame({ heroIds: ["quinn"] }),
      );
      expect(state.heroTokens).toHaveLength(1);
      expect(state.heroTokens[0].heroId).toBe("quinn");
    });

    it("should use provided positions when specified", () => {
      const heroIds = ["quinn", "vistra"];
      const positions = [
        { x: 2, y: 2 },
        { x: 3, y: 3 },
      ];
      const state = gameReducer(
        initialState,
        startGame({ heroIds, positions }),
      );

      expect(state.heroTokens[0].position).toEqual({ x: 2, y: 2 });
      expect(state.heroTokens[1].position).toEqual({ x: 3, y: 3 });
    });

    it("should initialize turn state to first hero active", () => {
      const heroIds = ["quinn", "vistra"];
      const state = gameReducer(initialState, startGame({ heroIds }));

      expect(state.turnState.currentHeroIndex).toBe(0);
    });

    it("should initialize turn state in Hero Phase", () => {
      const heroIds = ["quinn"];
      const state = gameReducer(initialState, startGame({ heroIds }));

      expect(state.turnState.currentPhase).toBe("hero-phase");
    });

    it("should initialize turn number at 1", () => {
      const heroIds = ["quinn"];
      const state = gameReducer(initialState, startGame({ heroIds }));

      expect(state.turnState.turnNumber).toBe(1);
    });

    it("should produce reproducible positions when using the same seed", () => {
      const heroIds = ["quinn", "vistra", "keyleth", "tarak", "haskan"];
      const seed = 12345;

      const state1 = gameReducer(initialState, startGame({ heroIds, seed }));
      const state2 = gameReducer(initialState, startGame({ heroIds, seed }));

      // Same seed should produce same positions
      expect(state1.heroTokens).toEqual(state2.heroTokens);
      expect(state1.randomSeed).toBe(seed);
      expect(state2.randomSeed).toBe(seed);
    });

    it("should produce different positions with different seeds", () => {
      const heroIds = ["quinn", "vistra", "keyleth", "tarak", "haskan"];

      const state1 = gameReducer(
        initialState,
        startGame({ heroIds, seed: 12345 }),
      );
      const state2 = gameReducer(
        initialState,
        startGame({ heroIds, seed: 67890 }),
      );

      // Different seeds should (very likely) produce different positions
      const positions1 = state1.heroTokens
        .map((t) => `${t.position.x},${t.position.y}`)
        .join("|");
      const positions2 = state2.heroTokens
        .map((t) => `${t.position.x},${t.position.y}`)
        .join("|");
      expect(positions1).not.toBe(positions2);
    });

    it("should store the random seed in state", () => {
      const heroIds = ["quinn"];
      const seed = 42;
      const state = gameReducer(initialState, startGame({ heroIds, seed }));
      expect(state.randomSeed).toBe(seed);
    });
  });

  describe("setHeroPosition", () => {
    const stateWithTokens: GameState = {
      currentScreen: "game-board",
      heroTokens: [
        { heroId: "quinn", position: { x: 2, y: 2 } },
        { heroId: "vistra", position: { x: 3, y: 2 } },
      ],
      turnState: {
        currentHeroIndex: 0,
        currentPhase: "hero-phase",
        turnNumber: 1,
      },
    };

    it("should update hero position", () => {
      const newPosition = { x: 4, y: 3 };
      const state = gameReducer(
        stateWithTokens,
        setHeroPosition({ heroId: "quinn", position: newPosition }),
      );

      const quinnToken = state.heroTokens.find((t) => t.heroId === "quinn");
      expect(quinnToken?.position).toEqual(newPosition);
    });

    it("should not affect other heroes when updating one", () => {
      const newPosition = { x: 4, y: 3 };
      const state = gameReducer(
        stateWithTokens,
        setHeroPosition({ heroId: "quinn", position: newPosition }),
      );

      const vistraToken = state.heroTokens.find((t) => t.heroId === "vistra");
      expect(vistraToken?.position).toEqual({ x: 3, y: 2 });
    });

    it("should do nothing for non-existent hero", () => {
      const state = gameReducer(
        stateWithTokens,
        setHeroPosition({ heroId: "nonexistent", position: { x: 5, y: 5 } }),
      );

      expect(state.heroTokens).toEqual(stateWithTokens.heroTokens);
    });
  });

  describe("resetGame", () => {
    it("should reset to character-select screen", () => {
      const gameInProgress: GameState = {
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
        },
      };
      const state = gameReducer(gameInProgress, resetGame());
      expect(state.currentScreen).toBe("character-select");
    });

    it("should clear all hero tokens", () => {
      const gameInProgress: GameState = {
        currentScreen: "game-board",
        heroTokens: [
          { heroId: "quinn", position: { x: 2, y: 2 } },
          { heroId: "vistra", position: { x: 3, y: 2 } },
        ],
        turnState: {
          currentHeroIndex: 1,
          currentPhase: "exploration-phase",
          turnNumber: 3,
        },
      };
      const state = gameReducer(gameInProgress, resetGame());
      expect(state.heroTokens).toEqual([]);
    });

    it("should reset turn state", () => {
      const gameInProgress: GameState = {
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 2,
          currentPhase: "villain-phase",
          turnNumber: 5,
        },
      };
      const state = gameReducer(gameInProgress, resetGame());
      expect(state.turnState.currentHeroIndex).toBe(0);
      expect(state.turnState.currentPhase).toBe("hero-phase");
      expect(state.turnState.turnNumber).toBe(1);
    });

    it("should clear movement state", () => {
      const gameInProgress: GameState = {
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
        },
        validMoveSquares: [{ x: 3, y: 2 }],
        showingMovement: true,
      };
      const state = gameReducer(gameInProgress, resetGame());
      expect(state.validMoveSquares).toEqual([]);
      expect(state.showingMovement).toBe(false);
    });
  });

  describe("showMovement", () => {
    const stateWithTokens: GameState = {
      currentScreen: "game-board",
      heroTokens: [
        { heroId: "quinn", position: { x: 2, y: 2 } },
        { heroId: "vistra", position: { x: 3, y: 3 } },
      ],
      turnState: {
        currentHeroIndex: 0,
        currentPhase: "hero-phase",
        turnNumber: 1,
      },
      validMoveSquares: [],
      showingMovement: false,
    };

    it("should calculate valid move squares for hero", () => {
      const state = gameReducer(
        stateWithTokens,
        showMovement({ heroId: "quinn", speed: 5 }),
      );

      expect(state.validMoveSquares.length).toBeGreaterThan(0);
      expect(state.showingMovement).toBe(true);
    });

    it("should not include occupied squares in valid moves", () => {
      const state = gameReducer(
        stateWithTokens,
        showMovement({ heroId: "quinn", speed: 5 }),
      );

      // Vistra is at (3, 3), so it should not be in valid squares
      expect(
        state.validMoveSquares.some((s) => s.x === 3 && s.y === 3),
      ).toBe(false);
    });

    it("should not include starting position in valid moves", () => {
      const state = gameReducer(
        stateWithTokens,
        showMovement({ heroId: "quinn", speed: 5 }),
      );

      // Quinn's position (2, 2) should not be in valid squares
      expect(
        state.validMoveSquares.some((s) => s.x === 2 && s.y === 2),
      ).toBe(false);
    });

    it("should do nothing for non-existent hero", () => {
      const state = gameReducer(
        stateWithTokens,
        showMovement({ heroId: "nonexistent", speed: 5 }),
      );

      expect(state.validMoveSquares).toEqual([]);
      expect(state.showingMovement).toBe(false);
    });
  });

  describe("hideMovement", () => {
    it("should clear valid move squares and hide overlay", () => {
      const stateWithMovement: GameState = {
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
        },
        validMoveSquares: [{ x: 3, y: 2 }, { x: 1, y: 2 }],
        showingMovement: true,
      };

      const state = gameReducer(stateWithMovement, hideMovement());

      expect(state.validMoveSquares).toEqual([]);
      expect(state.showingMovement).toBe(false);
    });
  });

  describe("moveHero", () => {
    const stateWithMovement: GameState = {
      currentScreen: "game-board",
      heroTokens: [
        { heroId: "quinn", position: { x: 2, y: 2 } },
      ],
      turnState: {
        currentHeroIndex: 0,
        currentPhase: "hero-phase",
        turnNumber: 1,
      },
      validMoveSquares: [{ x: 3, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 1 }],
      showingMovement: true,
    };

    it("should move hero to a valid destination", () => {
      const state = gameReducer(
        stateWithMovement,
        moveHero({ heroId: "quinn", position: { x: 3, y: 2 } }),
      );

      const quinnToken = state.heroTokens.find((t) => t.heroId === "quinn");
      expect(quinnToken?.position).toEqual({ x: 3, y: 2 });
    });

    it("should clear movement overlay after moving", () => {
      const state = gameReducer(
        stateWithMovement,
        moveHero({ heroId: "quinn", position: { x: 3, y: 2 } }),
      );

      expect(state.validMoveSquares).toEqual([]);
      expect(state.showingMovement).toBe(false);
    });

    it("should not move hero to an invalid destination", () => {
      const state = gameReducer(
        stateWithMovement,
        moveHero({ heroId: "quinn", position: { x: 5, y: 5 } }),
      );

      const quinnToken = state.heroTokens.find((t) => t.heroId === "quinn");
      // Position should remain unchanged
      expect(quinnToken?.position).toEqual({ x: 2, y: 2 });
      // Movement overlay should still be showing
      expect(state.showingMovement).toBe(true);
    });

    it("should not move non-existent hero", () => {
      const state = gameReducer(
        stateWithMovement,
        moveHero({ heroId: "nonexistent", position: { x: 3, y: 2 } }),
      );

      // State should remain unchanged
      expect(state.heroTokens).toEqual(stateWithMovement.heroTokens);
    });
  });

  describe("endHeroPhase", () => {
    it("should transition from hero phase to exploration phase", () => {
      const gameInProgress: GameState = {
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
        },
        validMoveSquares: [],
        showingMovement: false,
        dungeon: {
          tiles: [],
          unexploredEdges: [],
          tileDeck: [],
        },
      };
      const state = gameReducer(gameInProgress, endHeroPhase());
      expect(state.turnState.currentPhase).toBe("exploration-phase");
    });

    it("should not transition if not in hero phase", () => {
      const gameInProgress: GameState = {
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "exploration-phase",
          turnNumber: 1,
        },
        validMoveSquares: [],
        showingMovement: false,
        dungeon: {
          tiles: [],
          unexploredEdges: [],
          tileDeck: [],
        },
      };
      const state = gameReducer(gameInProgress, endHeroPhase());
      expect(state.turnState.currentPhase).toBe("exploration-phase");
    });
  });

  describe("endExplorationPhase", () => {
    it("should transition from exploration phase to villain phase", () => {
      const gameInProgress: GameState = {
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "exploration-phase",
          turnNumber: 1,
        },
        validMoveSquares: [],
        showingMovement: false,
        dungeon: {
          tiles: [],
          unexploredEdges: [],
          tileDeck: [],
        },
      };
      const state = gameReducer(gameInProgress, endExplorationPhase());
      expect(state.turnState.currentPhase).toBe("villain-phase");
    });

    it("should not transition if not in exploration phase", () => {
      const gameInProgress: GameState = {
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
        },
        validMoveSquares: [],
        showingMovement: false,
        dungeon: {
          tiles: [],
          unexploredEdges: [],
          tileDeck: [],
        },
      };
      const state = gameReducer(gameInProgress, endExplorationPhase());
      expect(state.turnState.currentPhase).toBe("hero-phase");
    });
  });

  describe("endVillainPhase", () => {
    it("should transition from villain phase to hero phase", () => {
      const gameInProgress: GameState = {
        currentScreen: "game-board",
        heroTokens: [
          { heroId: "quinn", position: { x: 2, y: 2 } },
          { heroId: "vistra", position: { x: 3, y: 2 } },
        ],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "villain-phase",
          turnNumber: 1,
        },
        validMoveSquares: [],
        showingMovement: false,
        dungeon: {
          tiles: [],
          unexploredEdges: [],
          tileDeck: [],
        },
      };
      const state = gameReducer(gameInProgress, endVillainPhase());
      expect(state.turnState.currentPhase).toBe("hero-phase");
    });

    it("should advance to next hero", () => {
      const gameInProgress: GameState = {
        currentScreen: "game-board",
        heroTokens: [
          { heroId: "quinn", position: { x: 2, y: 2 } },
          { heroId: "vistra", position: { x: 3, y: 2 } },
        ],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "villain-phase",
          turnNumber: 1,
        },
        validMoveSquares: [],
        showingMovement: false,
        dungeon: {
          tiles: [],
          unexploredEdges: [],
          tileDeck: [],
        },
      };
      const state = gameReducer(gameInProgress, endVillainPhase());
      expect(state.turnState.currentHeroIndex).toBe(1);
    });

    it("should wrap back to first hero and increment turn number", () => {
      const gameInProgress: GameState = {
        currentScreen: "game-board",
        heroTokens: [
          { heroId: "quinn", position: { x: 2, y: 2 } },
          { heroId: "vistra", position: { x: 3, y: 2 } },
        ],
        turnState: {
          currentHeroIndex: 1,
          currentPhase: "villain-phase",
          turnNumber: 1,
        },
        validMoveSquares: [],
        showingMovement: false,
        dungeon: {
          tiles: [],
          unexploredEdges: [],
          tileDeck: [],
        },
      };
      const state = gameReducer(gameInProgress, endVillainPhase());
      expect(state.turnState.currentHeroIndex).toBe(0);
      expect(state.turnState.turnNumber).toBe(2);
    });

    it("should not transition if not in villain phase", () => {
      const gameInProgress: GameState = {
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
        },
        validMoveSquares: [],
        showingMovement: false,
        dungeon: {
          tiles: [],
          unexploredEdges: [],
          tileDeck: [],
        },
      };
      const state = gameReducer(gameInProgress, endVillainPhase());
      expect(state.turnState.currentPhase).toBe("hero-phase");
      expect(state.turnState.currentHeroIndex).toBe(0);
    });
  });

  describe("dungeon state", () => {
    it("should initialize dungeon with start tile on game start", () => {
      const state = gameReducer(
        initialState,
        startGame({ heroIds: ["quinn"] }),
      );
      expect(state.dungeon.tiles).toHaveLength(1);
      expect(state.dungeon.tiles[0].id).toBe("start-tile");
    });

    it("should initialize tile deck on game start", () => {
      const state = gameReducer(
        initialState,
        startGame({ heroIds: ["quinn"] }),
      );
      expect(state.dungeon.tileDeck.length).toBe(8);
    });

    it("should have unexplored edges on start tile", () => {
      const state = gameReducer(
        initialState,
        startGame({ heroIds: ["quinn"] }),
      );
      expect(state.dungeon.unexploredEdges).toHaveLength(4);
    });

    it("should reset dungeon state on game reset", () => {
      const gameInProgress: GameState = {
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
        },
        validMoveSquares: [],
        showingMovement: false,
        dungeon: {
          tiles: [
            {
              id: "start-tile",
              tileType: "start",
              position: { col: 0, row: 0 },
              rotation: 0,
              edges: { north: "open", south: "unexplored", east: "unexplored", west: "unexplored" },
            },
            {
              id: "tile-1",
              tileType: "tile-2exit-a",
              position: { col: 0, row: -1 },
              rotation: 0,
              edges: { north: "unexplored", south: "open", east: "unexplored", west: "unexplored" },
            },
          ],
          unexploredEdges: [{ tileId: "tile-1", direction: "north" }],
          tileDeck: ["tile-3exit-a"],
        },
      };
      const state = gameReducer(gameInProgress, resetGame());
      expect(state.dungeon.tiles).toHaveLength(1);
      expect(state.dungeon.tiles[0].id).toBe("start-tile");
      expect(state.dungeon.unexploredEdges).toHaveLength(4);
      expect(state.dungeon.tileDeck).toHaveLength(0);
    });
  });
});
