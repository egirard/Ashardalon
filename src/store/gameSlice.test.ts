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
  dismissMonsterCard,
  setAttackResult,
  dismissAttackResult,
  dismissDefeatNotification,
  activateNextMonster,
  dismissMonsterAttackResult,
  dismissMonsterMoveAction,
  dismissHealingSurgeNotification,
  setHeroHp,
  setPartyResources,
  drawEncounterCard,
  cancelCurrentEncounter,
  acceptEncounter,
  setDrawnEncounter,
  GameState,
} from "./gameSlice";
import { START_TILE_POSITIONS, INITIAL_MONSTER_DECK, AttackResult, ENCOUNTER_CANCEL_COST } from "./types";

// Start tile grid dimensions - double-height tile with valid spaces x: 1-3, y: 0-7
const START_TILE_GRID = { minX: 1, maxX: 3, minY: 0, maxY: 7 };

// Helper to create a base GameState with all required fields
function createGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    currentScreen: "character-select",
    heroTokens: [],
    turnState: {
      currentHeroIndex: 0,
      currentPhase: "hero-phase",
      turnNumber: 1,
    },
    validMoveSquares: [],
    showingMovement: false,
    dungeon: { tiles: [], unexploredEdges: [], tileDeck: [] },
    monsterDeck: { drawPile: [], discardPile: [] },
    monsters: [],
    monsterInstanceCounter: 0,
    recentlySpawnedMonsterId: null,
    attackResult: null,
    attackTargetId: null,
    attackName: null,
    heroHp: [],
    monsterAttackResult: null,
    monsterAttackTargetId: null,
    monsterAttackerId: null,
    villainPhaseMonsterIndex: 0,
    monsterMoveActionId: null,
    heroTurnActions: { actionsTaken: [], canMove: true, canAttack: true },
    scenario: { monstersDefeated: 0, monstersToDefeat: 2, objective: "Defeat 2 monsters" },
    partyResources: { xp: 0, healingSurges: 2 },
    defeatedMonsterXp: null,
    defeatedMonsterName: null,
    leveledUpHeroId: null,
    levelUpOldStats: null,
    healingSurgeUsedHeroId: null,
    healingSurgeHpRestored: null,
    defeatReason: null,
    encounterDeck: { drawPile: [], discardPile: [] },
    drawnEncounterId: null,
    ...overrides,
  };
}

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
  const initialState = createGameState();

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
    const stateWithTokens = createGameState({
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
    });

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
      const gameInProgress = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
        },
      });
      const state = gameReducer(gameInProgress, resetGame());
      expect(state.currentScreen).toBe("character-select");
    });

    it("should clear all hero tokens", () => {
      const gameInProgress = createGameState({
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
      });
      const state = gameReducer(gameInProgress, resetGame());
      expect(state.heroTokens).toEqual([]);
    });

    it("should reset turn state", () => {
      const gameInProgress = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 2,
          currentPhase: "villain-phase",
          turnNumber: 5,
        },
      });
      const state = gameReducer(gameInProgress, resetGame());
      expect(state.turnState.currentHeroIndex).toBe(0);
      expect(state.turnState.currentPhase).toBe("hero-phase");
      expect(state.turnState.turnNumber).toBe(1);
    });

    it("should clear movement state", () => {
      const gameInProgress = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
        },
        validMoveSquares: [{ x: 3, y: 2 }],
        showingMovement: true,
      });
      const state = gameReducer(gameInProgress, resetGame());
      expect(state.validMoveSquares).toEqual([]);
      expect(state.showingMovement).toBe(false);
    });
  });

  describe("showMovement", () => {
    const stateWithTokens = createGameState({
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
      dungeon: {
        tiles: [
          {
            id: "start-tile",
            tileType: "start",
            position: { col: 0, row: 0 },
            rotation: 0,
            edges: { north: "unexplored", south: "unexplored", east: "unexplored", west: "unexplored" },
          },
        ],
        unexploredEdges: [
          { tileId: "start-tile", direction: "north" },
          { tileId: "start-tile", direction: "south" },
          { tileId: "start-tile", direction: "east" },
          { tileId: "start-tile", direction: "west" },
        ],
        tileDeck: [],
      },
    });

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
      const stateWithMovement = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
        },
        validMoveSquares: [{ x: 3, y: 2 }, { x: 1, y: 2 }],
        showingMovement: true,
      });

      const state = gameReducer(stateWithMovement, hideMovement());

      expect(state.validMoveSquares).toEqual([]);
      expect(state.showingMovement).toBe(false);
    });
  });

  describe("moveHero", () => {
    const stateWithMovement = createGameState({
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
    });

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
      const gameInProgress = createGameState({
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
      });
      const state = gameReducer(gameInProgress, endHeroPhase());
      expect(state.turnState.currentPhase).toBe("exploration-phase");
    });

    it("should not transition if not in hero phase", () => {
      const gameInProgress = createGameState({
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
      });
      const state = gameReducer(gameInProgress, endHeroPhase());
      expect(state.turnState.currentPhase).toBe("exploration-phase");
    });
  });

  describe("endExplorationPhase", () => {
    it("should transition from exploration phase to villain phase", () => {
      const gameInProgress = createGameState({
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
      });
      const state = gameReducer(gameInProgress, endExplorationPhase());
      expect(state.turnState.currentPhase).toBe("villain-phase");
    });

    it("should not transition if not in exploration phase", () => {
      const gameInProgress = createGameState({
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
      });
      const state = gameReducer(gameInProgress, endExplorationPhase());
      expect(state.turnState.currentPhase).toBe("hero-phase");
    });
  });

  describe("endVillainPhase", () => {
    it("should transition from villain phase to hero phase", () => {
      const gameInProgress = createGameState({
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
      });
      const state = gameReducer(gameInProgress, endVillainPhase());
      expect(state.turnState.currentPhase).toBe("hero-phase");
    });

    it("should advance to next hero", () => {
      const gameInProgress = createGameState({
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
      });
      const state = gameReducer(gameInProgress, endVillainPhase());
      expect(state.turnState.currentHeroIndex).toBe(1);
    });

    it("should wrap back to first hero and increment turn number", () => {
      const gameInProgress = createGameState({
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
      });
      const state = gameReducer(gameInProgress, endVillainPhase());
      expect(state.turnState.currentHeroIndex).toBe(0);
      expect(state.turnState.turnNumber).toBe(2);
    });

    it("should not transition if not in villain phase", () => {
      const gameInProgress = createGameState({
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
      });
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
      const gameInProgress = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
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
        monsters: [
          {
            monsterId: "kobold",
            instanceId: "kobold-0",
            position: { x: 2, y: 2 },
            currentHp: 1,
            controllerId: "quinn",
            tileId: "tile-1",
          },
        ],
        monsterInstanceCounter: 1,
      });
      const state = gameReducer(gameInProgress, resetGame());
      expect(state.dungeon.tiles).toHaveLength(1);
      expect(state.dungeon.tiles[0].id).toBe("start-tile");
      expect(state.dungeon.unexploredEdges).toHaveLength(4);
      expect(state.dungeon.tileDeck).toHaveLength(0);
      expect(state.monsters).toHaveLength(0);
      expect(state.monsterInstanceCounter).toBe(0);
    });
  });

  describe("monster spawning", () => {
    it("should initialize monster deck on game start", () => {
      const state = gameReducer(
        initialState,
        startGame({ heroIds: ["quinn"], seed: 12345 }),
      );
      expect(state.monsterDeck.drawPile.length).toBe(INITIAL_MONSTER_DECK.length);
      expect(state.monsterDeck.discardPile).toHaveLength(0);
    });

    it("should spawn monster when tile is placed during exploration", () => {
      // Create state where hero is on north edge with tiles and monsters available
      const gameInProgress = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 0 } }], // On north edge
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
        },
        dungeon: {
          tiles: [
            {
              id: "start-tile",
              tileType: "start",
              position: { col: 0, row: 0 },
              rotation: 0,
              edges: { north: "unexplored", south: "unexplored", east: "unexplored", west: "unexplored" },
            },
          ],
          unexploredEdges: [
            { tileId: "start-tile", direction: "north" },
            { tileId: "start-tile", direction: "south" },
            { tileId: "start-tile", direction: "east" },
            { tileId: "start-tile", direction: "west" },
          ],
          tileDeck: ["tile-2exit-a", "tile-2exit-b"],
        },
        monsterDeck: {
          drawPile: ["kobold", "snake", "cultist"],
          discardPile: [],
        },
        monsters: [],
        monsterInstanceCounter: 0,
      });

      const state = gameReducer(gameInProgress, endHeroPhase());

      // Should have spawned a monster
      expect(state.monsters).toHaveLength(1);
      expect(state.monsters[0].monsterId).toBe("kobold"); // First in deck
      expect(state.monsters[0].controllerId).toBe("quinn"); // Controlled by exploring hero
      expect(state.monsters[0].instanceId).toBe("kobold-0");
      expect(state.monsterInstanceCounter).toBe(1);
      expect(state.recentlySpawnedMonsterId).toBe("kobold-0");
    });

    it("should not spawn monster when no tile is placed (hero not on edge)", () => {
      const gameInProgress = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }], // Center, not on edge
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
        },
        dungeon: {
          tiles: [
            {
              id: "start-tile",
              tileType: "start",
              position: { col: 0, row: 0 },
              rotation: 0,
              edges: { north: "unexplored", south: "unexplored", east: "unexplored", west: "unexplored" },
            },
          ],
          unexploredEdges: [
            { tileId: "start-tile", direction: "north" },
            { tileId: "start-tile", direction: "south" },
            { tileId: "start-tile", direction: "east" },
            { tileId: "start-tile", direction: "west" },
          ],
          tileDeck: ["tile-2exit-a"],
        },
        monsterDeck: {
          drawPile: ["kobold"],
          discardPile: [],
        },
        monsters: [],
        monsterInstanceCounter: 0,
      });

      const state = gameReducer(gameInProgress, endHeroPhase());

      // No monster should be spawned
      expect(state.monsters).toHaveLength(0);
      expect(state.recentlySpawnedMonsterId).toBeNull();
    });

    it("should update monster deck after drawing", () => {
      const gameInProgress = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 0 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
        },
        dungeon: {
          tiles: [
            {
              id: "start-tile",
              tileType: "start",
              position: { col: 0, row: 0 },
              rotation: 0,
              edges: { north: "unexplored", south: "unexplored", east: "unexplored", west: "unexplored" },
            },
          ],
          unexploredEdges: [
            { tileId: "start-tile", direction: "north" },
            { tileId: "start-tile", direction: "south" },
            { tileId: "start-tile", direction: "east" },
            { tileId: "start-tile", direction: "west" },
          ],
          tileDeck: ["tile-2exit-a"],
        },
        monsterDeck: {
          drawPile: ["kobold", "snake", "cultist"],
          discardPile: [],
        },
        monsters: [],
        monsterInstanceCounter: 0,
      });

      const state = gameReducer(gameInProgress, endHeroPhase());

      // Monster deck should have one less monster
      expect(state.monsterDeck.drawPile).toEqual(["snake", "cultist"]);
    });

    it("should assign monster to correct tile", () => {
      const gameInProgress = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 0 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
        },
        dungeon: {
          tiles: [
            {
              id: "start-tile",
              tileType: "start",
              position: { col: 0, row: 0 },
              rotation: 0,
              edges: { north: "unexplored", south: "unexplored", east: "unexplored", west: "unexplored" },
            },
          ],
          unexploredEdges: [
            { tileId: "start-tile", direction: "north" },
            { tileId: "start-tile", direction: "south" },
            { tileId: "start-tile", direction: "east" },
            { tileId: "start-tile", direction: "west" },
          ],
          tileDeck: ["tile-2exit-a"],
        },
        monsterDeck: {
          drawPile: ["kobold"],
          discardPile: [],
        },
        monsters: [],
        monsterInstanceCounter: 0,
      });

      const state = gameReducer(gameInProgress, endHeroPhase());

      // Monster should be on the new tile (tile-1 is the first placed after start-tile)
      expect(state.monsters[0].tileId).toBe("tile-1");
    });

    it("should place monster at tile center position", () => {
      const gameInProgress = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 0 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
        },
        dungeon: {
          tiles: [
            {
              id: "start-tile",
              tileType: "start",
              position: { col: 0, row: 0 },
              rotation: 0,
              edges: { north: "unexplored", south: "unexplored", east: "unexplored", west: "unexplored" },
            },
          ],
          unexploredEdges: [
            { tileId: "start-tile", direction: "north" },
            { tileId: "start-tile", direction: "south" },
            { tileId: "start-tile", direction: "east" },
            { tileId: "start-tile", direction: "west" },
          ],
          tileDeck: ["tile-2exit-a"],
        },
        monsterDeck: {
          drawPile: ["kobold"],
          discardPile: [],
        },
        monsters: [],
        monsterInstanceCounter: 0,
      });

      const state = gameReducer(gameInProgress, endHeroPhase());

      // Monster should be at center (2, 2)
      expect(state.monsters[0].position).toEqual({ x: 2, y: 2 });
    });

    it("should clear recently spawned monster ID on next endHeroPhase when no exploration", () => {
      const gameInProgress = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }], // Not on edge
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
        },
        dungeon: {
          tiles: [
            {
              id: "start-tile",
              tileType: "start",
              position: { col: 0, row: 0 },
              rotation: 0,
              edges: { north: "unexplored", south: "unexplored", east: "unexplored", west: "unexplored" },
            },
          ],
          unexploredEdges: [
            { tileId: "start-tile", direction: "north" },
            { tileId: "start-tile", direction: "south" },
            { tileId: "start-tile", direction: "east" },
            { tileId: "start-tile", direction: "west" },
          ],
          tileDeck: ["tile-2exit-a"],
        },
        monsterDeck: {
          drawPile: ["kobold"],
          discardPile: [],
        },
        recentlySpawnedMonsterId: "kobold-0", // Previously spawned
        monsters: [],
        monsterInstanceCounter: 0,
      });

      const state = gameReducer(gameInProgress, endHeroPhase());

      // Recently spawned monster ID should be cleared
      expect(state.recentlySpawnedMonsterId).toBeNull();
    });
  });

  describe("dismissMonsterCard", () => {
    it("should clear recently spawned monster ID", () => {
      const gameInProgress = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        recentlySpawnedMonsterId: "kobold-0",
      });

      const state = gameReducer(gameInProgress, dismissMonsterCard());

      expect(state.recentlySpawnedMonsterId).toBeNull();
    });
  });

  describe("setAttackResult", () => {
    it("should set the attack result and target ID", () => {
      const attackResult: AttackResult = {
        roll: 15,
        attackBonus: 6,
        total: 21,
        targetAC: 14,
        isHit: true,
        damage: 2,
        isCritical: false,
      };

      const initialState = createGameState({
        currentScreen: "game-board",
        monsters: [
          { monsterId: "kobold", instanceId: "kobold-0", position: { x: 2, y: 2 }, currentHp: 1, controllerId: "quinn", tileId: "start-tile" },
        ],
      });

      const state = gameReducer(initialState, setAttackResult({
        result: attackResult,
        targetInstanceId: "kobold-0",
      }));

      expect(state.attackResult).toEqual(attackResult);
      expect(state.attackTargetId).toBe("kobold-0");
    });

    it("should apply damage to the target monster on hit", () => {
      const attackResult: AttackResult = {
        roll: 15,
        attackBonus: 6,
        total: 21,
        targetAC: 14,
        isHit: true,
        damage: 2,
        isCritical: false,
      };

      const initialState = createGameState({
        currentScreen: "game-board",
        monsters: [
          { monsterId: "cultist", instanceId: "cultist-0", position: { x: 2, y: 2 }, currentHp: 5, controllerId: "quinn", tileId: "start-tile" },
        ],
      });

      const state = gameReducer(initialState, setAttackResult({
        result: attackResult,
        targetInstanceId: "cultist-0",
      }));

      expect(state.monsters[0].currentHp).toBe(3);
      expect(state.monsters).toHaveLength(1);
    });

    it("should remove defeated monsters", () => {
      const attackResult: AttackResult = {
        roll: 15,
        attackBonus: 6,
        total: 21,
        targetAC: 14,
        isHit: true,
        damage: 2,
        isCritical: false,
      };

      const initialState = createGameState({
        currentScreen: "game-board",
        monsters: [
          { monsterId: "kobold", instanceId: "kobold-0", position: { x: 2, y: 2 }, currentHp: 1, controllerId: "quinn", tileId: "start-tile" },
        ],
      });

      const state = gameReducer(initialState, setAttackResult({
        result: attackResult,
        targetInstanceId: "kobold-0",
      }));

      expect(state.monsters).toHaveLength(0);
    });

    it("should discard defeated monster to discard pile", () => {
      const attackResult: AttackResult = {
        roll: 15,
        attackBonus: 6,
        total: 21,
        targetAC: 14,
        isHit: true,
        damage: 2,
        isCritical: false,
      };

      const initialState = createGameState({
        currentScreen: "game-board",
        monsters: [
          { monsterId: "kobold", instanceId: "kobold-0", position: { x: 2, y: 2 }, currentHp: 1, controllerId: "quinn", tileId: "start-tile" },
        ],
        monsterDeck: { drawPile: ["snake"], discardPile: [] },
      });

      const state = gameReducer(initialState, setAttackResult({
        result: attackResult,
        targetInstanceId: "kobold-0",
      }));

      expect(state.monsterDeck.discardPile).toContain("kobold");
    });

    it("should not apply damage on miss", () => {
      const attackResult: AttackResult = {
        roll: 5,
        attackBonus: 6,
        total: 11,
        targetAC: 14,
        isHit: false,
        damage: 0,
        isCritical: false,
      };

      const initialState = createGameState({
        currentScreen: "game-board",
        monsters: [
          { monsterId: "kobold", instanceId: "kobold-0", position: { x: 2, y: 2 }, currentHp: 1, controllerId: "quinn", tileId: "start-tile" },
        ],
      });

      const state = gameReducer(initialState, setAttackResult({
        result: attackResult,
        targetInstanceId: "kobold-0",
      }));

      expect(state.monsters[0].currentHp).toBe(1);
      expect(state.monsters).toHaveLength(1);
    });
  });

  describe("dismissAttackResult", () => {
    it("should clear the attack result and target ID", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        attackResult: {
          roll: 15,
          attackBonus: 6,
          total: 21,
          targetAC: 14,
          isHit: true,
          damage: 2,
          isCritical: false,
        },
        attackTargetId: "kobold-0",
      });

      const state = gameReducer(initialState, dismissAttackResult());

      expect(state.attackResult).toBeNull();
      expect(state.attackTargetId).toBeNull();
    });
  });

  describe("Hero HP", () => {
    it("should initialize hero HP when starting the game", () => {
      const state = gameReducer(undefined, startGame({
        heroIds: ["quinn", "vistra"],
        seed: 12345,
      }));

      expect(state.heroHp).toHaveLength(2);
      expect(state.heroHp.find(h => h.heroId === "quinn")?.currentHp).toBe(8);
      expect(state.heroHp.find(h => h.heroId === "quinn")?.maxHp).toBe(8);
      expect(state.heroHp.find(h => h.heroId === "vistra")?.currentHp).toBe(10);
      expect(state.heroHp.find(h => h.heroId === "vistra")?.maxHp).toBe(10);
    });

    it("should clear hero HP on reset", () => {
      const gameInProgress = createGameState({
        currentScreen: "game-board",
        heroHp: [
          { heroId: "quinn", currentHp: 8, maxHp: 8 },
        ],
      });

      const state = gameReducer(gameInProgress, resetGame());
      expect(state.heroHp).toHaveLength(0);
    });
  });

  describe("setHeroHp", () => {
    it("should update hero HP", () => {
      const initialState = createGameState({
        heroHp: [
          { heroId: "quinn", currentHp: 8, maxHp: 8 },
        ],
      });

      const state = gameReducer(initialState, setHeroHp({ heroId: "quinn", hp: 5 }));
      expect(state.heroHp.find(h => h.heroId === "quinn")?.currentHp).toBe(5);
    });

    it("should not reduce HP below 0", () => {
      const initialState = createGameState({
        heroHp: [
          { heroId: "quinn", currentHp: 2, maxHp: 8 },
        ],
      });

      const state = gameReducer(initialState, setHeroHp({ heroId: "quinn", hp: -5 }));
      expect(state.heroHp.find(h => h.heroId === "quinn")?.currentHp).toBe(0);
    });
  });

  describe("activateNextMonster", () => {
    it("should do nothing if not in villain phase", () => {
      const initialState = createGameState({
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
        },
        monsters: [
          { monsterId: "kobold", instanceId: "kobold-0", position: { x: 2, y: 2 }, currentHp: 1, controllerId: "quinn", tileId: "start-tile" },
        ],
        villainPhaseMonsterIndex: 0,
      });

      const state = gameReducer(initialState, activateNextMonster({}));
      expect(state.villainPhaseMonsterIndex).toBe(0);
    });

    it("should increment villainPhaseMonsterIndex after activation", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 5 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "villain-phase",
          turnNumber: 1,
        },
        dungeon: {
          tiles: [
            {
              id: "start-tile",
              tileType: "start",
              position: { col: 0, row: 0 },
              rotation: 0,
              edges: { north: "open", south: "open", east: "open", west: "open" },
            },
          ],
          unexploredEdges: [],
          tileDeck: [],
        },
        monsters: [
          { monsterId: "kobold", instanceId: "kobold-0", position: { x: 2, y: 2 }, currentHp: 1, controllerId: "quinn", tileId: "start-tile" },
        ],
        heroHp: [{ heroId: "quinn", currentHp: 8, maxHp: 8 }],
        villainPhaseMonsterIndex: 0,
      });

      const state = gameReducer(initialState, activateNextMonster({}));
      expect(state.villainPhaseMonsterIndex).toBe(1);
    });
  });

  describe("dismissMonsterAttackResult", () => {
    it("should clear monster attack result", () => {
      const initialState = createGameState({
        monsterAttackResult: {
          roll: 15,
          attackBonus: 5,
          total: 20,
          targetAC: 17,
          isHit: true,
          damage: 1,
          isCritical: false,
        },
        monsterAttackTargetId: "quinn",
        monsterAttackerId: "kobold-0",
      });

      const state = gameReducer(initialState, dismissMonsterAttackResult());
      expect(state.monsterAttackResult).toBeNull();
      expect(state.monsterAttackTargetId).toBeNull();
      expect(state.monsterAttackerId).toBeNull();
    });
  });

  describe("monsterMoveActionId (automatic villain phase)", () => {
    it("should set monsterMoveActionId when monster moves but cannot attack", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 5 } }], // Far from monster
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "villain-phase",
          turnNumber: 1,
        },
        dungeon: {
          tiles: [
            {
              id: "start-tile",
              tileType: "start",
              position: { col: 0, row: 0 },
              rotation: 0,
              edges: { north: "open", south: "open", east: "open", west: "open" },
            },
          ],
          unexploredEdges: [],
          tileDeck: [],
        },
        monsters: [
          { monsterId: "kobold", instanceId: "kobold-0", position: { x: 2, y: 2 }, currentHp: 1, controllerId: "quinn", tileId: "start-tile" },
        ],
        heroHp: [{ heroId: "quinn", currentHp: 8, maxHp: 8 }],
        villainPhaseMonsterIndex: 0,
        monsterMoveActionId: null,
      });

      const state = gameReducer(initialState, activateNextMonster({}));
      
      // Monster moved but couldn't attack, so monsterMoveActionId should be set
      expect(state.monsterMoveActionId).toBe("kobold-0");
      // No attack result since it moved instead
      expect(state.monsterAttackResult).toBeNull();
    });

    it("should not set monsterMoveActionId when monster attacks", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 3 } }], // Adjacent to monster
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "villain-phase",
          turnNumber: 1,
        },
        dungeon: {
          tiles: [
            {
              id: "start-tile",
              tileType: "start",
              position: { col: 0, row: 0 },
              rotation: 0,
              edges: { north: "open", south: "open", east: "open", west: "open" },
            },
          ],
          unexploredEdges: [],
          tileDeck: [],
        },
        monsters: [
          { monsterId: "kobold", instanceId: "kobold-0", position: { x: 2, y: 2 }, currentHp: 1, controllerId: "quinn", tileId: "start-tile" },
        ],
        heroHp: [{ heroId: "quinn", currentHp: 8, maxHp: 8 }],
        villainPhaseMonsterIndex: 0,
        monsterMoveActionId: null,
      });

      const state = gameReducer(initialState, activateNextMonster({}));
      
      // Monster attacked, so monsterMoveActionId should not be set
      expect(state.monsterMoveActionId).toBeNull();
      // Attack result should be set
      expect(state.monsterAttackResult).not.toBeNull();
    });
  });

  describe("dismissMonsterMoveAction", () => {
    it("should clear monsterMoveActionId", () => {
      const initialState = createGameState({
        monsterMoveActionId: "kobold-0",
      });

      const state = gameReducer(initialState, dismissMonsterMoveAction());
      expect(state.monsterMoveActionId).toBeNull();
    });
  });

  describe("endExplorationPhase with villain phase setup", () => {
    it("should reset villain phase monster index when entering villain phase", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "exploration-phase",
          turnNumber: 1,
        },
        villainPhaseMonsterIndex: 5, // From previous villain phase
      });

      const state = gameReducer(initialState, endExplorationPhase());
      expect(state.turnState.currentPhase).toBe("villain-phase");
      expect(state.villainPhaseMonsterIndex).toBe(0);
    });

    it("should clear monsterMoveActionId when entering villain phase", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "exploration-phase",
          turnNumber: 1,
        },
        monsterMoveActionId: "kobold-0", // From previous phase
      });

      const state = gameReducer(initialState, endExplorationPhase());
      expect(state.monsterMoveActionId).toBeNull();
    });
  });

  describe("endVillainPhase cleanup", () => {
    it("should clear villain phase state when ending", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "villain-phase",
          turnNumber: 1,
        },
        villainPhaseMonsterIndex: 3,
        monsterAttackResult: {
          roll: 15,
          attackBonus: 5,
          total: 20,
          targetAC: 17,
          isHit: true,
          damage: 1,
          isCritical: false,
        },
        monsterAttackTargetId: "quinn",
        monsterAttackerId: "kobold-0",
      });

      const state = gameReducer(initialState, endVillainPhase());
      expect(state.villainPhaseMonsterIndex).toBe(0);
      expect(state.monsterAttackResult).toBeNull();
      expect(state.monsterAttackTargetId).toBeNull();
      expect(state.monsterAttackerId).toBeNull();
    });

    it("should clear monsterMoveActionId when ending villain phase", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "villain-phase",
          turnNumber: 1,
        },
        monsterMoveActionId: "kobold-0",
      });

      const state = gameReducer(initialState, endVillainPhase());
      expect(state.monsterMoveActionId).toBeNull();
    });
  });

  describe("heroTurnActions", () => {
    it("should initialize with canMove and canAttack both true", () => {
      const state = gameReducer(undefined, startGame({
        heroIds: ["quinn"],
        seed: 12345,
      }));

      expect(state.heroTurnActions.actionsTaken).toEqual([]);
      expect(state.heroTurnActions.canMove).toBe(true);
      expect(state.heroTurnActions.canAttack).toBe(true);
    });

    it("should track move action and still allow attack after first move", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
        },
        validMoveSquares: [{ x: 3, y: 2 }],
        showingMovement: true,
        dungeon: {
          tiles: [
            {
              id: "start-tile",
              tileType: "start",
              position: { col: 0, row: 0 },
              rotation: 0,
              edges: { north: "unexplored", south: "unexplored", east: "unexplored", west: "unexplored" },
            },
          ],
          unexploredEdges: [],
          tileDeck: [],
        },
      });

      const state = gameReducer(initialState, moveHero({ heroId: "quinn", position: { x: 3, y: 2 } }));

      expect(state.heroTurnActions.actionsTaken).toEqual(["move"]);
      expect(state.heroTurnActions.canMove).toBe(true); // Can still move (for double move)
      expect(state.heroTurnActions.canAttack).toBe(true); // Can still attack
    });

    it("should track attack action and disable further attacks", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
        },
        monsters: [
          { monsterId: "kobold", instanceId: "kobold-0", position: { x: 2, y: 3 }, currentHp: 1, controllerId: "quinn", tileId: "start-tile" },
        ],
      });

      const attackResult: AttackResult = {
        roll: 15,
        attackBonus: 6,
        total: 21,
        targetAC: 14,
        isHit: true,
        damage: 2,
        isCritical: false,
      };

      const state = gameReducer(initialState, setAttackResult({
        result: attackResult,
        targetInstanceId: "kobold-0",
      }));

      expect(state.heroTurnActions.actionsTaken).toEqual(["attack"]);
      expect(state.heroTurnActions.canMove).toBe(true); // Can still move after attack
      expect(state.heroTurnActions.canAttack).toBe(false); // No double attacks
    });

    it("should not allow move after move+attack sequence", () => {
      // Start with a move already taken
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 3, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
        },
        heroTurnActions: { actionsTaken: ["move"], canMove: true, canAttack: true },
        monsters: [
          { monsterId: "kobold", instanceId: "kobold-0", position: { x: 2, y: 2 }, currentHp: 1, controllerId: "vistra", tileId: "start-tile" },
        ],
      });

      const attackResult: AttackResult = {
        roll: 15,
        attackBonus: 6,
        total: 21,
        targetAC: 14,
        isHit: true,
        damage: 2,
        isCritical: false,
      };

      const state = gameReducer(initialState, setAttackResult({
        result: attackResult,
        targetInstanceId: "kobold-0",
      }));

      expect(state.heroTurnActions.actionsTaken).toEqual(["move", "attack"]);
      expect(state.heroTurnActions.canMove).toBe(false); // Turn should end
      expect(state.heroTurnActions.canAttack).toBe(false); // No double attacks
    });

    it("should not allow attack after attack+move sequence", () => {
      // Start with an attack already taken
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
        },
        heroTurnActions: { actionsTaken: ["attack"], canMove: true, canAttack: false },
        validMoveSquares: [{ x: 3, y: 2 }],
        showingMovement: true,
        dungeon: {
          tiles: [
            {
              id: "start-tile",
              tileType: "start",
              position: { col: 0, row: 0 },
              rotation: 0,
              edges: { north: "unexplored", south: "unexplored", east: "unexplored", west: "unexplored" },
            },
          ],
          unexploredEdges: [],
          tileDeck: [],
        },
      });

      const state = gameReducer(initialState, moveHero({ heroId: "quinn", position: { x: 3, y: 2 } }));

      expect(state.heroTurnActions.actionsTaken).toEqual(["attack", "move"]);
      expect(state.heroTurnActions.canMove).toBe(false); // Turn should end
      expect(state.heroTurnActions.canAttack).toBe(false); // Can't attack after attack+move
    });

    it("should not allow more moves after double move", () => {
      // Start with a move already taken
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 3, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
        },
        heroTurnActions: { actionsTaken: ["move"], canMove: true, canAttack: true },
        validMoveSquares: [{ x: 3, y: 3 }],
        showingMovement: true,
        dungeon: {
          tiles: [
            {
              id: "start-tile",
              tileType: "start",
              position: { col: 0, row: 0 },
              rotation: 0,
              edges: { north: "unexplored", south: "unexplored", east: "unexplored", west: "unexplored" },
            },
          ],
          unexploredEdges: [],
          tileDeck: [],
        },
      });

      const state = gameReducer(initialState, moveHero({ heroId: "quinn", position: { x: 3, y: 3 } }));

      expect(state.heroTurnActions.actionsTaken).toEqual(["move", "move"]);
      expect(state.heroTurnActions.canMove).toBe(false); // Turn should end after double move
      expect(state.heroTurnActions.canAttack).toBe(true); // Never attacked, but turn ends
    });

    it("should reset heroTurnActions when villain phase ends", () => {
      const initialState = createGameState({
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
        heroTurnActions: { actionsTaken: ["move", "attack"], canMove: false, canAttack: false },
      });

      const state = gameReducer(initialState, endVillainPhase());

      expect(state.heroTurnActions.actionsTaken).toEqual([]);
      expect(state.heroTurnActions.canMove).toBe(true);
      expect(state.heroTurnActions.canAttack).toBe(true);
    });

    it("should not allow move when canMove is false", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
        },
        heroTurnActions: { actionsTaken: ["move", "move"], canMove: false, canAttack: true },
        validMoveSquares: [{ x: 3, y: 2 }],
        showingMovement: true,
      });

      const state = gameReducer(initialState, moveHero({ heroId: "quinn", position: { x: 3, y: 2 } }));

      // Position should remain unchanged
      const quinnToken = state.heroTokens.find((t) => t.heroId === "quinn");
      expect(quinnToken?.position).toEqual({ x: 2, y: 2 });
    });

    it("should not allow attack when canAttack is false", () => {
      const attackResult: AttackResult = {
        roll: 15,
        attackBonus: 6,
        total: 21,
        targetAC: 14,
        isHit: true,
        damage: 2,
        isCritical: false,
      };

      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
        },
        heroTurnActions: { actionsTaken: ["attack"], canMove: true, canAttack: false },
        monsters: [
          { monsterId: "kobold", instanceId: "kobold-0", position: { x: 2, y: 3 }, currentHp: 1, controllerId: "quinn", tileId: "start-tile" },
        ],
      });

      const state = gameReducer(initialState, setAttackResult({
        result: attackResult,
        targetInstanceId: "kobold-0",
      }));

      // Attack result should not be set
      expect(state.attackResult).toBeNull();
      // Monster HP should be unchanged
      expect(state.monsters[0].currentHp).toBe(1);
    });
  });

  describe("Scenario State (MVP: Defeat 2 Monsters)", () => {
    it("should initialize scenario state on game start", () => {
      const state = gameReducer(undefined, startGame({
        heroIds: ["quinn"],
        seed: 12345,
      }));

      expect(state.scenario.monstersDefeated).toBe(0);
      expect(state.scenario.monstersToDefeat).toBe(2);
      expect(state.scenario.objective).toBe("Defeat 2 monsters");
    });

    it("should increment monstersDefeated when monster is killed", () => {
      const attackResult: AttackResult = {
        roll: 15,
        attackBonus: 6,
        total: 21,
        targetAC: 14,
        isHit: true,
        damage: 2,
        isCritical: false,
      };

      const initialState = createGameState({
        currentScreen: "game-board",
        monsters: [
          { monsterId: "kobold", instanceId: "kobold-0", position: { x: 2, y: 2 }, currentHp: 1, controllerId: "quinn", tileId: "start-tile" },
        ],
        scenario: { monstersDefeated: 0, monstersToDefeat: 2, objective: "Defeat 2 monsters" },
      });

      const state = gameReducer(initialState, setAttackResult({
        result: attackResult,
        targetInstanceId: "kobold-0",
      }));

      expect(state.scenario.monstersDefeated).toBe(1);
    });

    it("should not increment monstersDefeated when attack misses", () => {
      const attackResult: AttackResult = {
        roll: 5,
        attackBonus: 6,
        total: 11,
        targetAC: 14,
        isHit: false,
        damage: 0,
        isCritical: false,
      };

      const initialState = createGameState({
        currentScreen: "game-board",
        monsters: [
          { monsterId: "kobold", instanceId: "kobold-0", position: { x: 2, y: 2 }, currentHp: 1, controllerId: "quinn", tileId: "start-tile" },
        ],
        scenario: { monstersDefeated: 0, monstersToDefeat: 2, objective: "Defeat 2 monsters" },
      });

      const state = gameReducer(initialState, setAttackResult({
        result: attackResult,
        targetInstanceId: "kobold-0",
      }));

      expect(state.scenario.monstersDefeated).toBe(0);
    });

    it("should transition to victory screen when 2 monsters are defeated", () => {
      const attackResult: AttackResult = {
        roll: 15,
        attackBonus: 6,
        total: 21,
        targetAC: 14,
        isHit: true,
        damage: 2,
        isCritical: false,
      };

      const initialState = createGameState({
        currentScreen: "game-board",
        monsters: [
          { monsterId: "kobold", instanceId: "kobold-1", position: { x: 2, y: 2 }, currentHp: 1, controllerId: "quinn", tileId: "start-tile" },
        ],
        scenario: { monstersDefeated: 1, monstersToDefeat: 2, objective: "Defeat 2 monsters" },
      });

      const state = gameReducer(initialState, setAttackResult({
        result: attackResult,
        targetInstanceId: "kobold-1",
      }));

      expect(state.scenario.monstersDefeated).toBe(2);
      expect(state.currentScreen).toBe("victory");
    });

    it("should not transition to victory screen when less than 2 monsters defeated", () => {
      const attackResult: AttackResult = {
        roll: 15,
        attackBonus: 6,
        total: 21,
        targetAC: 14,
        isHit: true,
        damage: 2,
        isCritical: false,
      };

      const initialState = createGameState({
        currentScreen: "game-board",
        monsters: [
          { monsterId: "kobold", instanceId: "kobold-0", position: { x: 2, y: 2 }, currentHp: 1, controllerId: "quinn", tileId: "start-tile" },
        ],
        scenario: { monstersDefeated: 0, monstersToDefeat: 2, objective: "Defeat 2 monsters" },
      });

      const state = gameReducer(initialState, setAttackResult({
        result: attackResult,
        targetInstanceId: "kobold-0",
      }));

      expect(state.scenario.monstersDefeated).toBe(1);
      expect(state.currentScreen).toBe("game-board");
    });

    it("should transition to defeat screen when all heroes are at 0 HP", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "villain-phase",
          turnNumber: 1,
        },
        dungeon: {
          tiles: [
            {
              id: "start-tile",
              tileType: "start",
              position: { col: 0, row: 0 },
              rotation: 0,
              edges: { north: "open", south: "open", east: "open", west: "open" },
            },
          ],
          unexploredEdges: [],
          tileDeck: [],
        },
        monsters: [
          { monsterId: "kobold", instanceId: "kobold-0", position: { x: 2, y: 3 }, currentHp: 1, controllerId: "quinn", tileId: "start-tile" },
        ],
        heroHp: [{ heroId: "quinn", currentHp: 1, maxHp: 8 }],
        villainPhaseMonsterIndex: 0,
        scenario: { monstersDefeated: 0, monstersToDefeat: 2, objective: "Defeat 2 monsters" },
      });

      // Use a deterministic random function that will result in a hit and damage
      const state = gameReducer(initialState, activateNextMonster({
        randomFn: () => 0.95, // High roll to ensure hit
      }));

      // Hero should be defeated
      expect(state.heroHp.find(h => h.heroId === "quinn")?.currentHp).toBe(0);
      expect(state.currentScreen).toBe("defeat");
    });

    it("should not transition to defeat screen if at least one hero has HP remaining", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [
          { heroId: "quinn", position: { x: 2, y: 2 } },
          { heroId: "vistra", position: { x: 3, y: 3 } },
        ],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "villain-phase",
          turnNumber: 1,
        },
        dungeon: {
          tiles: [
            {
              id: "start-tile",
              tileType: "start",
              position: { col: 0, row: 0 },
              rotation: 0,
              edges: { north: "open", south: "open", east: "open", west: "open" },
            },
          ],
          unexploredEdges: [],
          tileDeck: [],
        },
        monsters: [
          { monsterId: "kobold", instanceId: "kobold-0", position: { x: 2, y: 3 }, currentHp: 1, controllerId: "quinn", tileId: "start-tile" },
        ],
        heroHp: [
          { heroId: "quinn", currentHp: 1, maxHp: 8 },
          { heroId: "vistra", currentHp: 10, maxHp: 10 },
        ],
        villainPhaseMonsterIndex: 0,
        scenario: { monstersDefeated: 0, monstersToDefeat: 2, objective: "Defeat 2 monsters" },
      });

      // Use a deterministic random function that will result in a hit and damage
      const state = gameReducer(initialState, activateNextMonster({
        randomFn: () => 0.95, // High roll to ensure hit
      }));

      // Quinn should be at 0 HP but Vistra still has HP
      expect(state.heroHp.find(h => h.heroId === "quinn")?.currentHp).toBe(0);
      expect(state.heroHp.find(h => h.heroId === "vistra")?.currentHp).toBe(10);
      expect(state.currentScreen).toBe("game-board");
    });

    it("should reset scenario state on game reset", () => {
      const gameInProgress = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        scenario: { monstersDefeated: 5, monstersToDefeat: 2, objective: "Defeat 2 monsters" },
      });

      const state = gameReducer(gameInProgress, resetGame());

      expect(state.scenario.monstersDefeated).toBe(0);
      expect(state.scenario.monstersToDefeat).toBe(2);
      expect(state.scenario.objective).toBe("Defeat 2 monsters");
    });
  });

  describe("Party XP (Defeat Monster and Gain XP)", () => {
    it("should initialize party resources with 0 XP on game start", () => {
      const state = gameReducer(undefined, startGame({
        heroIds: ["quinn"],
        seed: 12345,
      }));

      expect(state.partyResources.xp).toBe(0);
      expect(state.partyResources.healingSurges).toBe(2);
    });

    it("should award XP when monster is defeated", () => {
      const attackResult: AttackResult = {
        roll: 15,
        attackBonus: 6,
        total: 21,
        targetAC: 14,
        isHit: true,
        damage: 2,
        isCritical: false,
      };

      const initialState = createGameState({
        currentScreen: "game-board",
        monsters: [
          { monsterId: "kobold", instanceId: "kobold-0", position: { x: 2, y: 2 }, currentHp: 1, controllerId: "quinn", tileId: "start-tile" },
        ],
        partyResources: { xp: 0, healingSurges: 2 },
      });

      const state = gameReducer(initialState, setAttackResult({
        result: attackResult,
        targetInstanceId: "kobold-0",
      }));

      // Kobold has 1 XP value
      expect(state.partyResources.xp).toBe(1);
    });

    it("should accumulate XP from multiple defeated monsters", () => {
      const attackResult: AttackResult = {
        roll: 15,
        attackBonus: 6,
        total: 21,
        targetAC: 14,
        isHit: true,
        damage: 2,
        isCritical: false,
      };

      // Start with some XP already earned
      const initialState = createGameState({
        currentScreen: "game-board",
        monsters: [
          { monsterId: "kobold", instanceId: "kobold-1", position: { x: 2, y: 2 }, currentHp: 1, controllerId: "quinn", tileId: "start-tile" },
        ],
        partyResources: { xp: 3, healingSurges: 2 },
      });

      const state = gameReducer(initialState, setAttackResult({
        result: attackResult,
        targetInstanceId: "kobold-1",
      }));

      // Should add 1 XP to existing 3
      expect(state.partyResources.xp).toBe(4);
    });

    it("should not award XP when attack misses", () => {
      const attackResult: AttackResult = {
        roll: 5,
        attackBonus: 6,
        total: 11,
        targetAC: 14,
        isHit: false,
        damage: 0,
        isCritical: false,
      };

      const initialState = createGameState({
        currentScreen: "game-board",
        monsters: [
          { monsterId: "kobold", instanceId: "kobold-0", position: { x: 2, y: 2 }, currentHp: 1, controllerId: "quinn", tileId: "start-tile" },
        ],
        partyResources: { xp: 0, healingSurges: 2 },
      });

      const state = gameReducer(initialState, setAttackResult({
        result: attackResult,
        targetInstanceId: "kobold-0",
      }));

      expect(state.partyResources.xp).toBe(0);
      expect(state.monsters).toHaveLength(1); // Monster still alive
    });

    it("should not award XP when monster survives the hit", () => {
      const attackResult: AttackResult = {
        roll: 15,
        attackBonus: 6,
        total: 21,
        targetAC: 13,
        isHit: true,
        damage: 1,
        isCritical: false,
      };

      // Cultist has 2 HP
      const initialState = createGameState({
        currentScreen: "game-board",
        monsters: [
          { monsterId: "cultist", instanceId: "cultist-0", position: { x: 2, y: 2 }, currentHp: 2, controllerId: "quinn", tileId: "start-tile" },
        ],
        partyResources: { xp: 0, healingSurges: 2 },
      });

      const state = gameReducer(initialState, setAttackResult({
        result: attackResult,
        targetInstanceId: "cultist-0",
      }));

      // No XP awarded - monster still alive at 1 HP
      expect(state.partyResources.xp).toBe(0);
      expect(state.monsters[0].currentHp).toBe(1);
    });

    it("should set defeatedMonsterXp and defeatedMonsterName on defeat", () => {
      const attackResult: AttackResult = {
        roll: 15,
        attackBonus: 6,
        total: 21,
        targetAC: 14,
        isHit: true,
        damage: 2,
        isCritical: false,
      };

      const initialState = createGameState({
        currentScreen: "game-board",
        monsters: [
          { monsterId: "kobold", instanceId: "kobold-0", position: { x: 2, y: 2 }, currentHp: 1, controllerId: "quinn", tileId: "start-tile" },
        ],
        partyResources: { xp: 0, healingSurges: 2 },
        defeatedMonsterXp: null,
        defeatedMonsterName: null,
      });

      const state = gameReducer(initialState, setAttackResult({
        result: attackResult,
        targetInstanceId: "kobold-0",
      }));

      expect(state.defeatedMonsterXp).toBe(1);
      expect(state.defeatedMonsterName).toBe("Kobold Dragonshield");
    });

    it("should clear defeat notification with dismissDefeatNotification", () => {
      const initialState = createGameState({
        defeatedMonsterXp: 1,
        defeatedMonsterName: "Kobold Dragonshield",
      });

      const state = gameReducer(initialState, dismissDefeatNotification());

      expect(state.defeatedMonsterXp).toBeNull();
      expect(state.defeatedMonsterName).toBeNull();
    });

    it("should reset party resources on game reset", () => {
      const gameInProgress = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        partyResources: { xp: 10, healingSurges: 0 },
        defeatedMonsterXp: 1,
        defeatedMonsterName: "Snake",
      });

      const state = gameReducer(gameInProgress, resetGame());

      expect(state.partyResources.xp).toBe(0);
      expect(state.partyResources.healingSurges).toBe(2);
      expect(state.defeatedMonsterXp).toBeNull();
      expect(state.defeatedMonsterName).toBeNull();
    });
  });

  describe("Healing Surge", () => {
    it("should initialize party with 2 healing surges", () => {
      const state = gameReducer(undefined, startGame({
        heroIds: ["quinn"],
        seed: 12345,
      }));

      expect(state.partyResources.healingSurges).toBe(2);
    });

    it("should auto-use healing surge when hero at 0 HP starts turn", () => {
      // Quinn is at 0 HP at start of villain phase
      const initialState = createGameState({
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
        heroHp: [
          { heroId: "quinn", currentHp: 0, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 },
          { heroId: "vistra", currentHp: 10, maxHp: 10, level: 1, ac: 18, surgeValue: 5, attackBonus: 8 },
        ],
        partyResources: { xp: 0, healingSurges: 2 },
      });

      // End villain phase - next hero (Vistra at index 1) begins their turn
      let state = gameReducer(initialState, endVillainPhase());
      
      // Vistra is not at 0 HP, so no surge used
      expect(state.healingSurgeUsedHeroId).toBeNull();
      
      // Now end Vistra's turn and get back to Quinn who is at 0 HP
      // Quinn is at index 0, Vistra at index 1
      // After ending Vistra's villain phase, Quinn's turn begins
      
      // Fast forward: set state to Quinn's villain phase
      const quinnVillainState = createGameState({
        currentScreen: "game-board",
        heroTokens: [
          { heroId: "quinn", position: { x: 2, y: 2 } },
          { heroId: "vistra", position: { x: 3, y: 2 } },
        ],
        turnState: {
          currentHeroIndex: 1, // Vistra's turn
          currentPhase: "villain-phase",
          turnNumber: 1,
        },
        heroHp: [
          { heroId: "quinn", currentHp: 0, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 },
          { heroId: "vistra", currentHp: 10, maxHp: 10, level: 1, ac: 18, surgeValue: 5, attackBonus: 8 },
        ],
        partyResources: { xp: 0, healingSurges: 2 },
      });

      // End villain phase - wraps back to Quinn (index 0)
      state = gameReducer(quinnVillainState, endVillainPhase());

      // Quinn should have received a healing surge
      expect(state.healingSurgeUsedHeroId).toBe("quinn");
      expect(state.healingSurgeHpRestored).toBe(4); // Quinn's surge value
      expect(state.heroHp.find(h => h.heroId === "quinn")?.currentHp).toBe(4);
      expect(state.partyResources.healingSurges).toBe(1);
    });

    it("should not use healing surge if hero HP > 0", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [
          { heroId: "quinn", position: { x: 2, y: 2 } },
        ],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "villain-phase",
          turnNumber: 1,
        },
        heroHp: [
          { heroId: "quinn", currentHp: 1, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 },
        ],
        partyResources: { xp: 0, healingSurges: 2 },
      });

      const state = gameReducer(initialState, endVillainPhase());

      // No surge used since HP > 0
      expect(state.healingSurgeUsedHeroId).toBeNull();
      expect(state.heroHp.find(h => h.heroId === "quinn")?.currentHp).toBe(1);
      expect(state.partyResources.healingSurges).toBe(2);
    });

    it("should not use healing surge if no surges available", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [
          { heroId: "quinn", position: { x: 2, y: 2 } },
          { heroId: "vistra", position: { x: 3, y: 2 } },
        ],
        turnState: {
          currentHeroIndex: 1, // Vistra's turn
          currentPhase: "villain-phase",
          turnNumber: 1,
        },
        heroHp: [
          { heroId: "quinn", currentHp: 0, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 },
          { heroId: "vistra", currentHp: 10, maxHp: 10, level: 1, ac: 18, surgeValue: 5, attackBonus: 8 },
        ],
        partyResources: { xp: 0, healingSurges: 0 }, // No surges!
      });

      const state = gameReducer(initialState, endVillainPhase());

      // No surge used since none available
      expect(state.healingSurgeUsedHeroId).toBeNull();
      expect(state.heroHp.find(h => h.heroId === "quinn")?.currentHp).toBe(0);
      expect(state.partyResources.healingSurges).toBe(0);
    });

    it("should restore HP to hero's surge value", () => {
      // Test with Vistra (surge value 5)
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [
          { heroId: "vistra", position: { x: 2, y: 2 } },
        ],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "villain-phase",
          turnNumber: 1,
        },
        heroHp: [
          { heroId: "vistra", currentHp: 0, maxHp: 10, level: 1, ac: 18, surgeValue: 5, attackBonus: 8 },
        ],
        partyResources: { xp: 0, healingSurges: 2 },
      });

      const state = gameReducer(initialState, endVillainPhase());

      expect(state.heroHp.find(h => h.heroId === "vistra")?.currentHp).toBe(5);
      expect(state.healingSurgeHpRestored).toBe(5);
    });

    it("should decrease surge count by 1 when used", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [
          { heroId: "quinn", position: { x: 2, y: 2 } },
          { heroId: "vistra", position: { x: 3, y: 2 } },
        ],
        turnState: {
          currentHeroIndex: 1, // Vistra's turn
          currentPhase: "villain-phase",
          turnNumber: 1,
        },
        heroHp: [
          { heroId: "quinn", currentHp: 0, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 },
          { heroId: "vistra", currentHp: 10, maxHp: 10, level: 1, ac: 18, surgeValue: 5, attackBonus: 8 },
        ],
        partyResources: { xp: 0, healingSurges: 2 },
      });

      const state = gameReducer(initialState, endVillainPhase());

      expect(state.partyResources.healingSurges).toBe(1);
    });

    it("should dismiss healing surge notification", () => {
      const initialState = createGameState({
        healingSurgeUsedHeroId: "quinn",
        healingSurgeHpRestored: 4,
      });

      const state = gameReducer(initialState, dismissHealingSurgeNotification());

      expect(state.healingSurgeUsedHeroId).toBeNull();
      expect(state.healingSurgeHpRestored).toBeNull();
    });

    it("should clear healing surge notification on reset", () => {
      const gameInProgress = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        healingSurgeUsedHeroId: "quinn",
        healingSurgeHpRestored: 4,
      });

      const state = gameReducer(gameInProgress, resetGame());

      expect(state.healingSurgeUsedHeroId).toBeNull();
      expect(state.healingSurgeHpRestored).toBeNull();
    });

    it("should clear previous healing surge notification at start of new turn", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [
          { heroId: "quinn", position: { x: 2, y: 2 } },
        ],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "villain-phase",
          turnNumber: 1,
        },
        heroHp: [
          { heroId: "quinn", currentHp: 5, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 },
        ],
        partyResources: { xp: 0, healingSurges: 2 },
        healingSurgeUsedHeroId: "vistra", // Old notification
        healingSurgeHpRestored: 5,
      });

      const state = gameReducer(initialState, endVillainPhase());

      // Old notification should be cleared
      expect(state.healingSurgeUsedHeroId).toBeNull();
      expect(state.healingSurgeHpRestored).toBeNull();
    });
  });

  describe("Party Defeat", () => {
    it("should transition to defeat screen when hero at 0 HP with 0 surges at turn start", () => {
      // Quinn is at 0 HP and 0 surges available
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [
          { heroId: "quinn", position: { x: 2, y: 2 } },
          { heroId: "vistra", position: { x: 3, y: 2 } },
        ],
        turnState: {
          currentHeroIndex: 1, // Vistra's turn (about to end, Quinn next)
          currentPhase: "villain-phase",
          turnNumber: 1,
        },
        heroHp: [
          { heroId: "quinn", currentHp: 0, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 },
          { heroId: "vistra", currentHp: 10, maxHp: 10, level: 1, ac: 18, surgeValue: 5, attackBonus: 8 },
        ],
        partyResources: { xp: 0, healingSurges: 0 }, // No surges!
      });

      const state = gameReducer(initialState, endVillainPhase());

      // Should transition to defeat screen
      expect(state.currentScreen).toBe("defeat");
      expect(state.defeatReason).toBe("Quinn fell with no healing surges remaining.");
    });

    it("should not defeat if surges are available for hero at 0 HP", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [
          { heroId: "quinn", position: { x: 2, y: 2 } },
          { heroId: "vistra", position: { x: 3, y: 2 } },
        ],
        turnState: {
          currentHeroIndex: 1, // Vistra's turn
          currentPhase: "villain-phase",
          turnNumber: 1,
        },
        heroHp: [
          { heroId: "quinn", currentHp: 0, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 },
          { heroId: "vistra", currentHp: 10, maxHp: 10, level: 1, ac: 18, surgeValue: 5, attackBonus: 8 },
        ],
        partyResources: { xp: 0, healingSurges: 1 }, // 1 surge available
      });

      const state = gameReducer(initialState, endVillainPhase());

      // Should NOT transition to defeat - should use healing surge instead
      expect(state.currentScreen).toBe("game-board");
      expect(state.defeatReason).toBeNull();
      expect(state.healingSurgeUsedHeroId).toBe("quinn");
      expect(state.heroHp.find(h => h.heroId === "quinn")?.currentHp).toBe(4);
    });

    it("should not defeat if hero HP > 0 even with no surges", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [
          { heroId: "quinn", position: { x: 2, y: 2 } },
        ],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "villain-phase",
          turnNumber: 1,
        },
        heroHp: [
          { heroId: "quinn", currentHp: 1, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 },
        ],
        partyResources: { xp: 0, healingSurges: 0 },
      });

      const state = gameReducer(initialState, endVillainPhase());

      // Should NOT transition to defeat - hero has HP
      expect(state.currentScreen).toBe("game-board");
      expect(state.defeatReason).toBeNull();
    });

    it("should set correct defeat reason with hero name", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [
          { heroId: "vistra", position: { x: 2, y: 2 } },
        ],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "villain-phase",
          turnNumber: 1,
        },
        heroHp: [
          { heroId: "vistra", currentHp: 0, maxHp: 10, level: 1, ac: 18, surgeValue: 5, attackBonus: 8 },
        ],
        partyResources: { xp: 0, healingSurges: 0 },
      });

      const state = gameReducer(initialState, endVillainPhase());

      expect(state.currentScreen).toBe("defeat");
      expect(state.defeatReason).toBe("Vistra fell with no healing surges remaining.");
    });

    it("should clear defeatReason on resetGame", () => {
      const initialState = createGameState({
        currentScreen: "defeat",
        defeatReason: "Quinn fell with no healing surges remaining.",
      });

      const state = gameReducer(initialState, resetGame());

      expect(state.currentScreen).toBe("character-select");
      expect(state.defeatReason).toBeNull();
    });

    it("should prioritize defeat check over healing surge check", () => {
      // This tests that checkPartyDefeat is called first and blocks healing surge usage
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [
          { heroId: "quinn", position: { x: 2, y: 2 } },
        ],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "villain-phase",
          turnNumber: 1,
        },
        heroHp: [
          { heroId: "quinn", currentHp: 0, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 },
        ],
        partyResources: { xp: 0, healingSurges: 0 },
      });

      const state = gameReducer(initialState, endVillainPhase());

      // Should defeat, not use surge (which would fail anyway)
      expect(state.currentScreen).toBe("defeat");
      expect(state.healingSurgeUsedHeroId).toBeNull();
    });
  });

  describe("encounter actions", () => {
    describe("drawEncounterCard", () => {
      it("should draw an encounter from the deck", () => {
        const initialState = createGameState({
          encounterDeck: {
            drawPile: ["volcanic-spray", "cave-in"],
            discardPile: [],
          },
          drawnEncounterId: null,
        });

        const state = gameReducer(initialState, drawEncounterCard());

        expect(state.drawnEncounterId).toBe("volcanic-spray");
        expect(state.encounterDeck.drawPile).toEqual(["cave-in"]);
      });

      it("should not draw if an encounter is already drawn", () => {
        const initialState = createGameState({
          encounterDeck: {
            drawPile: ["volcanic-spray", "cave-in"],
            discardPile: [],
          },
          drawnEncounterId: "poisoned-air",
        });

        const state = gameReducer(initialState, drawEncounterCard());

        // Should not change
        expect(state.drawnEncounterId).toBe("poisoned-air");
        expect(state.encounterDeck.drawPile).toEqual(["volcanic-spray", "cave-in"]);
      });
    });

    describe("cancelCurrentEncounter", () => {
      it("should cancel encounter when party has enough XP", () => {
        const initialState = createGameState({
          encounterDeck: {
            drawPile: ["cave-in"],
            discardPile: [],
          },
          drawnEncounterId: "volcanic-spray",
          partyResources: { xp: 6, healingSurges: 2 },
        });

        const state = gameReducer(initialState, cancelCurrentEncounter());

        expect(state.drawnEncounterId).toBeNull();
        expect(state.partyResources.xp).toBe(6 - ENCOUNTER_CANCEL_COST);
        expect(state.encounterDeck.discardPile).toContain("volcanic-spray");
      });

      it("should not cancel when party has insufficient XP", () => {
        const initialState = createGameState({
          encounterDeck: {
            drawPile: ["cave-in"],
            discardPile: [],
          },
          drawnEncounterId: "volcanic-spray",
          partyResources: { xp: 4, healingSurges: 2 },
        });

        const state = gameReducer(initialState, cancelCurrentEncounter());

        // Should not change
        expect(state.drawnEncounterId).toBe("volcanic-spray");
        expect(state.partyResources.xp).toBe(4);
      });

      it("should not do anything when no encounter is drawn", () => {
        const initialState = createGameState({
          encounterDeck: {
            drawPile: ["cave-in"],
            discardPile: [],
          },
          drawnEncounterId: null,
          partyResources: { xp: 10, healingSurges: 2 },
        });

        const state = gameReducer(initialState, cancelCurrentEncounter());

        expect(state.drawnEncounterId).toBeNull();
        expect(state.partyResources.xp).toBe(10);
      });

      it("should work with exactly 5 XP", () => {
        const initialState = createGameState({
          encounterDeck: {
            drawPile: [],
            discardPile: [],
          },
          drawnEncounterId: "volcanic-spray",
          partyResources: { xp: 5, healingSurges: 2 },
        });

        const state = gameReducer(initialState, cancelCurrentEncounter());

        expect(state.drawnEncounterId).toBeNull();
        expect(state.partyResources.xp).toBe(0);
      });
    });

    describe("acceptEncounter", () => {
      it("should discard the encounter and clear drawnEncounterId", () => {
        const initialState = createGameState({
          encounterDeck: {
            drawPile: ["cave-in"],
            discardPile: [],
          },
          drawnEncounterId: "volcanic-spray",
        });

        const state = gameReducer(initialState, acceptEncounter());

        expect(state.drawnEncounterId).toBeNull();
        expect(state.encounterDeck.discardPile).toContain("volcanic-spray");
        expect(state.encounterDeck.drawPile).toEqual(["cave-in"]);
      });

      it("should not do anything when no encounter is drawn", () => {
        const initialState = createGameState({
          encounterDeck: {
            drawPile: ["cave-in"],
            discardPile: [],
          },
          drawnEncounterId: null,
        });

        const state = gameReducer(initialState, acceptEncounter());

        expect(state.drawnEncounterId).toBeNull();
        expect(state.encounterDeck.discardPile).toEqual([]);
      });
    });

    describe("setDrawnEncounter", () => {
      it("should set the drawn encounter ID", () => {
        const initialState = createGameState({
          drawnEncounterId: null,
        });

        const state = gameReducer(initialState, setDrawnEncounter("volcanic-spray"));

        expect(state.drawnEncounterId).toBe("volcanic-spray");
      });

      it("should clear the drawn encounter when passed null", () => {
        const initialState = createGameState({
          drawnEncounterId: "volcanic-spray",
        });

        const state = gameReducer(initialState, setDrawnEncounter(null));

        expect(state.drawnEncounterId).toBeNull();
      });
    });
  });
});
