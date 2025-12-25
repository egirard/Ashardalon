import { describe, it, expect, vi } from "vitest";
import gameReducer, {
  startGame,
  setHeroPosition,
  setHeroTurnActions,
  resetGame,
  showMovement,
  hideMovement,
  moveHero,
  completeMove,
  undoAction,
  endHeroPhase,
  endExplorationPhase,
  endVillainPhase,
  dismissMonsterCard,
  dismissEncounterCard,
  cancelEncounterCard,
  setAttackResult,
  dismissAttackResult,
  dismissDefeatNotification,
  activateNextMonster,
  dismissMonsterAttackResult,
  dismissMonsterMoveAction,
  dismissHealingSurgeNotification,
  setHeroHp,
  setPartyResources,
  useVoluntaryActionSurge,
  skipActionSurge,
  assignTreasureToHero,
  dismissTreasureCard,
  useTreasureItem,
  setMonsters,
  selectMonsterForEncounter,
  cancelMonsterChoice,
  GameState,
} from "./gameSlice";
import { START_TILE_POSITIONS, INITIAL_MONSTER_DECK, AttackResult } from "./types";

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
      exploredThisTurn: false,
      drewOnlyWhiteTilesThisTurn: false,
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
    heroHp: [],
    monsterAttackResult: null,
    monsterAttackTargetId: null,
    monsterAttackerId: null,
    villainPhaseMonsterIndex: 0,
    monsterMoveActionId: null,
    heroTurnActions: { actionsTaken: [], canMove: true, canAttack: true },
    scenario: { monstersDefeated: 0, monstersToDefeat: 12, objective: "Defeat 12 monsters" },
    partyResources: { xp: 0, healingSurges: 2 },
    defeatedMonsterXp: null,
    defeatedMonsterName: null,
    leveledUpHeroId: null,
    levelUpOldStats: null,
    healingSurgeUsedHeroId: null,
    healingSurgeHpRestored: null,
    defeatReason: null,
    encounterDeck: { drawPile: [], discardPile: [] },
    drawnEncounter: null,
    activeEnvironmentId: null,
    traps: [],
    hazards: [],
    trapInstanceCounter: 0,
    hazardInstanceCounter: 0,
    boardTokens: [],
    boardTokenInstanceCounter: 0,
    showActionSurgePrompt: false,
    multiAttackState: null,
    pendingMoveAttack: null,
    attackName: null,
    treasureDeck: { drawPile: [], discardPile: [] },
    drawnTreasure: null,
    heroInventories: {},
    treasureDrawnThisTurn: false,
    incrementalMovement: null,
    undoSnapshot: null,
    encounterEffectMessage: null,
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

    it("should clear environment cards and effects on start", () => {
      const stateWithEffects = createGameState({
        activeEnvironmentId: "fire-zone",
        encounterEffectMessage: "The room is burning!",
      });
      const state = gameReducer(stateWithEffects, startGame({ heroIds: ["quinn"] }));
      expect(state.activeEnvironmentId).toBeNull();
      expect(state.encounterEffectMessage).toBeNull();
    });

    it("should clear traps and hazards on start", () => {
      const stateWithTraps = createGameState({
        traps: [
          { id: "trap-1", encounterId: "encounter-trap-1", position: { x: 3, y: 3 }, disableDC: 15 },
        ],
        hazards: [
          { id: "hazard-1", encounterId: "encounter-hazard-1", position: { x: 5, y: 5 } },
        ],
        trapInstanceCounter: 10,
        hazardInstanceCounter: 5,
      });
      const state = gameReducer(stateWithTraps, startGame({ heroIds: ["quinn"] }));
      expect(state.traps).toEqual([]);
      expect(state.hazards).toEqual([]);
      expect(state.trapInstanceCounter).toBe(0);
      expect(state.hazardInstanceCounter).toBe(0);
    });

    it("should clear board tokens on start", () => {
      const stateWithTokens = createGameState({
        boardTokens: [
          { id: "token-1", type: "blade-barrier", position: { x: 3, y: 3 }, powerCardId: 101, ownerId: "quinn" },
          { id: "token-2", type: "flaming-sphere", position: { x: 4, y: 4 }, powerCardId: 102, ownerId: "vistra" },
        ],
        boardTokenInstanceCounter: 15,
      });
      const state = gameReducer(stateWithTokens, startGame({ heroIds: ["quinn"] }));
      expect(state.boardTokens).toEqual([]);
      expect(state.boardTokenInstanceCounter).toBe(0);
    });

    it("should initialize hero HP with no status effects", () => {
      const state = gameReducer(initialState, startGame({ heroIds: ["quinn", "vistra"] }));
      expect(state.heroHp).toHaveLength(2);
      state.heroHp.forEach(heroHp => {
        expect(heroHp.statuses).toEqual([]);
      });
    });

    it("should start with no monsters and their status effects", () => {
      const stateWithMonsters = createGameState({
        monsters: [
          {
            monsterId: "kobold",
            instanceId: "kobold-1",
            position: { x: 3, y: 3 },
            currentHp: 1,
            controllerId: "quinn",
            tileId: "tile-1",
            statuses: [
              { type: "weakened", appliedOnTurn: 1, source: "power-card-1" },
            ],
          },
        ],
      });
      const state = gameReducer(stateWithMonsters, startGame({ heroIds: ["quinn"] }));
      expect(state.monsters).toEqual([]);
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

    it("should clear environment cards and effects", () => {
      const gameInProgress = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        activeEnvironmentId: "fire-zone",
        encounterEffectMessage: "The room is on fire!",
      });
      const state = gameReducer(gameInProgress, resetGame());
      expect(state.activeEnvironmentId).toBeNull();
      expect(state.encounterEffectMessage).toBeNull();
    });

    it("should clear traps and hazards", () => {
      const gameInProgress = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        traps: [
          { id: "trap-1", encounterId: "encounter-trap-1", position: { x: 3, y: 3 }, disableDC: 15 },
          { id: "trap-2", encounterId: "encounter-trap-2", position: { x: 4, y: 4 }, disableDC: 15 },
        ],
        hazards: [
          { id: "hazard-1", encounterId: "encounter-hazard-1", position: { x: 5, y: 5 } },
        ],
        trapInstanceCounter: 5,
        hazardInstanceCounter: 3,
      });
      const state = gameReducer(gameInProgress, resetGame());
      expect(state.traps).toEqual([]);
      expect(state.hazards).toEqual([]);
      expect(state.trapInstanceCounter).toBe(0);
      expect(state.hazardInstanceCounter).toBe(0);
    });

    it("should clear board tokens", () => {
      const gameInProgress = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        boardTokens: [
          { id: "token-1", type: "blade-barrier", position: { x: 3, y: 3 }, powerCardId: 101, ownerId: "quinn" },
          { id: "token-2", type: "flaming-sphere", position: { x: 4, y: 4 }, powerCardId: 102, ownerId: "quinn", canMove: true },
        ],
        boardTokenInstanceCounter: 10,
      });
      const state = gameReducer(gameInProgress, resetGame());
      expect(state.boardTokens).toEqual([]);
      expect(state.boardTokenInstanceCounter).toBe(0);
    });

    it("should clear hero status effects", () => {
      const gameInProgress = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        heroHp: [
          { 
            heroId: "quinn", 
            currentHp: 5, 
            maxHp: 10, 
            level: 1, 
            ac: 17, 
            surgeValue: 4, 
            attackBonus: 6,
            statuses: [
              { type: "poisoned", appliedOnTurn: 1, source: "snake-1" },
              { type: "slowed", appliedOnTurn: 2, source: "kobold-1" },
            ],
          },
        ],
      });
      const state = gameReducer(gameInProgress, resetGame());
      expect(state.heroHp).toEqual([]);
    });

    it("should clear monster status effects via monsters array", () => {
      const gameInProgress = createGameState({
        currentScreen: "game-board",
        monsters: [
          {
            monsterId: "kobold",
            instanceId: "kobold-1",
            position: { x: 3, y: 3 },
            currentHp: 1,
            controllerId: "quinn",
            tileId: "tile-1",
            statuses: [
              { type: "weakened", appliedOnTurn: 1, source: "power-card-1" },
            ],
          },
        ],
      });
      const state = gameReducer(gameInProgress, resetGame());
      expect(state.monsters).toEqual([]);
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
      // With incremental movement, overlay is recalculated for remaining movement
      // It's only cleared when all movement is used or completeMove is called
      const stateAfterMove = gameReducer(
        { ...stateWithMovement, validMoveSquares: [{ x: 3, y: 2 }] },
        moveHero({ heroId: "quinn", position: { x: 3, y: 2 }, speed: 5 }),
      );

      // After one move step, movement overlay shows remaining movement options
      expect(stateAfterMove.showingMovement).toBe(true);
      expect(stateAfterMove.incrementalMovement?.remainingMovement).toBe(4);

      // After completing the move, overlay is cleared
      const stateAfterComplete = gameReducer(stateAfterMove, completeMove());
      expect(stateAfterComplete.validMoveSquares).toEqual([]);
      expect(stateAfterComplete.showingMovement).toBe(false);
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

    it("should clear movement overlay when transitioning to exploration phase", () => {
      const gameInProgress = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
        },
        validMoveSquares: [{ x: 3, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 1 }],
        showingMovement: true,
        dungeon: {
          tiles: [],
          unexploredEdges: [],
          tileDeck: [],
        },
      });
      const state = gameReducer(gameInProgress, endHeroPhase());
      expect(state.turnState.currentPhase).toBe("exploration-phase");
      expect(state.validMoveSquares).toEqual([]);
      expect(state.showingMovement).toBe(false);
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
      expect(state.turnState.turnNumber).toBe(12);
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
      expect(state.dungeon.tileDeck.length).toBe(16); // 8 black + 8 white tiles
    });

    it("should have unexplored edges on start tile", () => {
      const state = gameReducer(
        initialState,
        startGame({ heroIds: ["quinn"] }),
      );
      // Start tile has 6 unexplored edges: north, south, 2 east (per sub-tile), 2 west (per sub-tile)
      expect(state.dungeon.unexploredEdges).toHaveLength(6);
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
              tileType: "tile-black-2exit-a",
              position: { col: 0, row: -1 },
              rotation: 0,
              edges: { north: "unexplored", south: "open", east: "unexplored", west: "unexplored" },
            },
          ],
          unexploredEdges: [{ tileId: "tile-1", direction: "north" }],
          tileDeck: ["tile-black-3exit-a"],
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
      // Start tile has 6 unexplored edges: north, south, 2 east (per sub-tile), 2 west (per sub-tile)
      expect(state.dungeon.unexploredEdges).toHaveLength(6);
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
          tileDeck: ["tile-black-2exit-a", "tile-black-2exit-b"],
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
      // Monster display is delayed, so it should be in pendingMonsterDisplayId
      expect(state.pendingMonsterDisplayId).toBe("kobold-0");
      expect(state.recentlySpawnedMonsterId).toBeNull();
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
          tileDeck: ["tile-black-2exit-a"],
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

    it("should spawn monster when white arrow tile is placed and prevent encounter draw", () => {
      const gameInProgress = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 0 } }], // North edge
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
          tileDeck: ["tile-white-2exit-a"], // White tile - spawns monster, prevents encounter
        },
        monsterDeck: {
          drawPile: ["kobold"],
          discardPile: [],
        },
        monsters: [],
        monsterInstanceCounter: 0,
      });

      const state = gameReducer(gameInProgress, endHeroPhase());

      // White tiles DO spawn monsters
      expect(state.monsters).toHaveLength(1);
      expect(state.monsters[0].monsterId).toBe("kobold");
      // Monster display is delayed, so it should be in pendingMonsterDisplayId
      expect(state.pendingMonsterDisplayId).toBe("kobold-0");
      expect(state.recentlySpawnedMonsterId).toBeNull();
      // Monster deck should be updated
      expect(state.monsterDeck.drawPile).toEqual([]);
      // Exploration should be marked as occurred
      expect(state.turnState.exploredThisTurn).toBe(true);
      // White tile should mark that only white tiles were drawn (prevents encounter)
      expect(state.turnState.drewOnlyWhiteTilesThisTurn).toBe(true);
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
          tileDeck: ["tile-black-2exit-a"],
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
          tileDeck: ["tile-black-2exit-a"],
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

    it("should place monster at black spot position", () => {
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
          tileDeck: ["tile-black-2exit-a"],
        },
        monsterDeck: {
          drawPile: ["kobold"],
          discardPile: [],
        },
        monsters: [],
        monsterInstanceCounter: 0,
      });

      const state = gameReducer(gameInProgress, endHeroPhase());

      // Hero explores north edge, tile placed with 0° rotation (arrow points south)
      // Black spot is at (2, 1) - the dark circular marking on the tile
      expect(state.monsters[0].position).toEqual({ x: 2, y: 1 });
    });

    it("should place monster at adjacent position when black spot is occupied", () => {
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
          tileDeck: ["tile-black-2exit-a"],
        },
        monsterDeck: {
          drawPile: ["kobold", "snake"],
          discardPile: [],
        },
        // Pre-place a monster at the black spot position on the tile that will be created
        // Note: The new tile will get id "tile-1", and black spot at (2, 1) with 0° rotation
        monsters: [
          { 
            monsterId: "cultist", 
            instanceId: "cultist-0", 
            position: { x: 2, y: 1 }, 
            currentHp: 2, 
            controllerId: "quinn", 
            tileId: "tile-1"  // This is the id the new tile will get
          },
        ],
        monsterInstanceCounter: 1,
      });

      const state = gameReducer(gameInProgress, endHeroPhase());

      // Should have 12 monsters now
      expect(state.monsters).toHaveLength(2);
      
      // The new monster should NOT be at the black spot (2, 1) since it's occupied
      const newMonster = state.monsters.find(m => m.instanceId === "kobold-1");
      expect(newMonster).not.toBeUndefined();
      expect(newMonster?.position).not.toEqual({ x: 2, y: 1 });
      
      // It should be at an adjacent position
      if (newMonster) {
        const dx = Math.abs(newMonster.position.x - 2);
        const dy = Math.abs(newMonster.position.y - 1);
        // Adjacent means dx <= 1 and dy <= 1 but not (0, 0)
        expect(dx <= 1 && dy <= 1 && (dx > 0 || dy > 0)).toBe(true);
      }
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
          tileDeck: ["tile-black-2exit-a"],
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

    it("should include AC bonus from equipped items when monster attacks", () => {
      // Create a state where the hero has an Amulet of Protection (+1 AC)
      // Quinn's base AC is 17, with Amulet it should be 18
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
        heroHp: [{ heroId: "quinn", currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 }],
        villainPhaseMonsterIndex: 0,
        monsterMoveActionId: null,
        heroInventories: {
          quinn: {
            heroId: "quinn",
            items: [{ cardId: 136, isFlipped: false }], // Amulet of Protection (+1 AC)
          },
        },
      });

      // Use a fixed random that will always hit without item bonus (roll 11 + 7 = 18 vs AC 17 hits, vs AC 18 misses)
      const state = gameReducer(initialState, activateNextMonster({ randomFn: () => 0.5 })); // Roll ~11

      // The attack should have been made against AC 18 (17 base + 1 from Amulet)
      expect(state.monsterAttackResult).not.toBeNull();
      // Kobold attack bonus is +7, roll of ~11, total 18, vs AC 18 = exact hit (equals or beats)
      // This test verifies the AC bonus is considered in the attack resolution
      expect(state.monsterAttackResult?.targetAC).toBe(18);
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

      // With incremental movement, a single step doesn't mark the move as complete
      // The move action is only marked when all movement is used or completeMove is called
      const stateAfterMove = gameReducer(initialState, moveHero({ heroId: "quinn", position: { x: 3, y: 2 }, speed: 5 }));

      // With incremental movement, movement is in progress but not yet complete
      expect(stateAfterMove.incrementalMovement?.inProgress).toBe(true);
      expect(stateAfterMove.incrementalMovement?.remainingMovement).toBe(4); // 5 - 1 = 4
      expect(stateAfterMove.heroTurnActions.actionsTaken).toEqual([]); // Not yet committed
      expect(stateAfterMove.heroTurnActions.canMove).toBe(true);
      expect(stateAfterMove.heroTurnActions.canAttack).toBe(true);

      // After completing the move, the action is tracked
      const stateAfterComplete = gameReducer(stateAfterMove, completeMove());
      expect(stateAfterComplete.heroTurnActions.actionsTaken).toEqual(["move"]);
      expect(stateAfterComplete.heroTurnActions.canMove).toBe(true); // Can still move (for double move)
      expect(stateAfterComplete.heroTurnActions.canAttack).toBe(true); // Can still attack
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

      // With incremental movement, we need to move and then complete the move
      const stateAfterMove = gameReducer(initialState, moveHero({ heroId: "quinn", position: { x: 3, y: 2 }, speed: 5 }));
      const state = gameReducer(stateAfterMove, completeMove());

      expect(state.heroTurnActions.actionsTaken).toEqual(["attack", "move"]);
      expect(state.heroTurnActions.canMove).toBe(false); // Turn should end
      expect(state.heroTurnActions.canAttack).toBe(false); // Can't attack after attack+move
    });

    it("should not allow more moves after double move", () => {
      // Start with a move already taken (previous move was completed)
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

      // With incremental movement, we need to move and then complete the move
      const stateAfterMove = gameReducer(initialState, moveHero({ heroId: "quinn", position: { x: 3, y: 3 }, speed: 5 }));
      const state = gameReducer(stateAfterMove, completeMove());

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
      expect(state.scenario.monstersToDefeat).toBe(12);
      expect(state.scenario.objective).toBe("Defeat 12 monsters");
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
        scenario: { monstersDefeated: 0, monstersToDefeat: 12, objective: "Defeat 12 monsters" },
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
        scenario: { monstersDefeated: 0, monstersToDefeat: 12, objective: "Defeat 12 monsters" },
      });

      const state = gameReducer(initialState, setAttackResult({
        result: attackResult,
        targetInstanceId: "kobold-0",
      }));

      expect(state.scenario.monstersDefeated).toBe(0);
    });

    it("should transition to victory screen when 12 monsters are defeated", () => {
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
        scenario: { monstersDefeated: 11, monstersToDefeat: 12, objective: "Defeat 12 monsters" },
      });

      const state = gameReducer(initialState, setAttackResult({
        result: attackResult,
        targetInstanceId: "kobold-1",
      }));

      expect(state.scenario.monstersDefeated).toBe(12);
      expect(state.currentScreen).toBe("victory");
    });

    it("should not transition to victory screen when less than 12 monsters defeated", () => {
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
        scenario: { monstersDefeated: 0, monstersToDefeat: 12, objective: "Defeat 12 monsters" },
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
        scenario: { monstersDefeated: 0, monstersToDefeat: 12, objective: "Defeat 12 monsters" },
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
        scenario: { monstersDefeated: 0, monstersToDefeat: 12, objective: "Defeat 12 monsters" },
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
        scenario: { monstersDefeated: 5, monstersToDefeat: 12, objective: "Defeat 12 monsters" },
      });

      const state = gameReducer(gameInProgress, resetGame());

      expect(state.scenario.monstersDefeated).toBe(0);
      expect(state.scenario.monstersToDefeat).toBe(12);
      expect(state.scenario.objective).toBe("Defeat 12 monsters");
    });
  });

  describe("Party XP (Defeat Monster and Gain XP)", () => {
    it("should initialize party resources with 0 XP on game start", () => {
      const state = gameReducer(undefined, startGame({
        heroIds: ["quinn"],
        seed: 12345,
      }));

      expect(state.partyResources.xp).toBe(0);
      expect(state.partyResources.healingSurges).toBe(12);
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
      expect(state.partyResources.healingSurges).toBe(12);
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

      expect(state.partyResources.healingSurges).toBe(12);
    });

    it("should show action surge prompt when hero at 0 HP starts turn", () => {
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
      
      // Vistra is not at 0 HP, so no prompt shown
      expect(state.showActionSurgePrompt).toBe(false);
      
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

      // Quinn is at 0 HP - should show action surge prompt
      expect(state.showActionSurgePrompt).toBe(true);
      expect(state.turnState.currentPhase).toBe("hero-phase");
    });

    it("should not show action surge prompt if hero HP > 0", () => {
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

      // No prompt shown since HP > 0
      expect(state.showActionSurgePrompt).toBe(false);
      expect(state.heroHp.find(h => h.heroId === "quinn")?.currentHp).toBe(1);
      expect(state.partyResources.healingSurges).toBe(12);
    });

    it("should trigger defeat if no surges available at 0 HP", () => {
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

      // No prompt since no surges - immediate defeat
      expect(state.currentScreen).toBe("defeat");
      expect(state.showActionSurgePrompt).toBe(false);
    });

    it("should show prompt with correct surge value for hero", () => {
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

      // Prompt should be shown, not auto-heal
      expect(state.showActionSurgePrompt).toBe(true);
      expect(state.heroHp.find(h => h.heroId === "vistra")?.currentHp).toBe(0); // Not yet healed
    });

    it("should preserve surges until player uses them", () => {
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

      // Surges should still be 2 until player chooses to use
      expect(state.partyResources.healingSurges).toBe(12);
      expect(state.showActionSurgePrompt).toBe(true);
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

      // Should NOT transition to defeat - should show prompt for healing surge
      expect(state.currentScreen).toBe("game-board");
      expect(state.defeatReason).toBeNull();
      expect(state.showActionSurgePrompt).toBe(true);
      // HP should not be restored yet - player must choose to use surge
      expect(state.heroHp.find(h => h.heroId === "quinn")?.currentHp).toBe(0);
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

  describe("encounter system", () => {
    it("should initialize encounter deck when starting game", () => {
      const action = startGame({ heroIds: ["quinn"], seed: 12345 });
      const state = gameReducer(undefined, action);

      expect(state.encounterDeck.drawPile.length).toBeGreaterThan(0);
      expect(state.encounterDeck.discardPile).toEqual([]);
      expect(state.drawnEncounter).toBeNull();
    });

    it("should set exploredThisTurn to true when tile is placed", () => {
      // Set up state where hero is on unexplored edge
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 0 } }], // On north edge
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
          exploredThisTurn: false,
        },
        dungeon: {
          tiles: [{
            id: "start-tile",
            tileType: "start",
            position: { col: 0, row: 0 },
            rotation: 0,
            edges: { north: "unexplored", south: "unexplored", east: "unexplored", west: "unexplored" },
          }],
          unexploredEdges: [
            { tileId: "start-tile", direction: "north" },
            { tileId: "start-tile", direction: "south" },
            { tileId: "start-tile", direction: "east" },
            { tileId: "start-tile", direction: "west" },
          ],
          tileDeck: ["tile-black-2exit-a"],
        },
        monsterDeck: { drawPile: ["kobold"], discardPile: [] },
      });

      const state = gameReducer(initialState, endHeroPhase());

      expect(state.turnState.exploredThisTurn).toBe(true);
    });

    it("should set exploredThisTurn to false when no tile is placed", () => {
      // Set up state where hero is NOT on unexplored edge
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }], // In middle, not on edge
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
          exploredThisTurn: false,
        },
        dungeon: {
          tiles: [{
            id: "start-tile",
            tileType: "start",
            position: { col: 0, row: 0 },
            rotation: 0,
            edges: { north: "unexplored", south: "unexplored", east: "unexplored", west: "unexplored" },
          }],
          unexploredEdges: [
            { tileId: "start-tile", direction: "north" },
          ],
          tileDeck: ["tile-black-2exit-a"],
        },
      });

      const state = gameReducer(initialState, endHeroPhase());

      expect(state.turnState.exploredThisTurn).toBe(false);
    });

    it("should draw encounter when entering villain phase without exploration", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "exploration-phase",
          turnNumber: 1,
          exploredThisTurn: false, // No exploration happened
        },
        encounterDeck: {
          drawPile: ["unbearable-heat", "frenzied-leap"],
          discardPile: [],
        },
      });

      const state = gameReducer(initialState, endExplorationPhase());

      expect(state.turnState.currentPhase).toBe("villain-phase");
      expect(state.drawnEncounter).not.toBeNull();
      expect(state.drawnEncounter?.id).toBe("unbearable-heat");
      expect(state.encounterDeck.drawPile).toEqual(["frenzied-leap"]);
    });

    it("should draw encounter when entering villain phase with black tile exploration", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "exploration-phase",
          turnNumber: 1,
          exploredThisTurn: true, // Exploration happened
          drewOnlyWhiteTilesThisTurn: false, // Black tile was drawn - triggers encounter
        },
        encounterDeck: {
          drawPile: ["unbearable-heat", "frenzied-leap"],
          discardPile: [],
        },
      });

      const state = gameReducer(initialState, endExplorationPhase());

      expect(state.turnState.currentPhase).toBe("villain-phase");
      expect(state.drawnEncounter).not.toBeNull();
      expect(state.drawnEncounter?.id).toBe("unbearable-heat");
      expect(state.encounterDeck.drawPile).toEqual(["frenzied-leap"]);
    });

    it("should NOT draw encounter when entering villain phase with only white tile exploration", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "exploration-phase",
          turnNumber: 1,
          exploredThisTurn: true, // Exploration happened
          drewOnlyWhiteTilesThisTurn: true, // Only white tiles were drawn - prevents encounter
        },
        encounterDeck: {
          drawPile: ["unbearable-heat", "frenzied-leap"],
          discardPile: [],
        },
      });

      const state = gameReducer(initialState, endExplorationPhase());

      expect(state.turnState.currentPhase).toBe("villain-phase");
      expect(state.drawnEncounter).toBeNull();
      expect(state.encounterDeck.drawPile).toEqual(["unbearable-heat", "frenzied-leap"]);
    });

    it("should clear drawnEncounter when villain phase ends", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "villain-phase",
          turnNumber: 1,
          exploredThisTurn: false,
          drewOnlyWhiteTilesThisTurn: false,
        },
        drawnEncounter: {
          id: "unbearable-heat",
          name: "Unbearable Heat",
          type: "event",
          description: "Test",
          effect: { type: "damage", amount: 1, target: "active-hero" },
          imagePath: "test.png",
        },
        heroHp: [{ heroId: "quinn", currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 }],
      });

      const state = gameReducer(initialState, endVillainPhase());

      expect(state.drawnEncounter).toBeNull();
    });

    it("should clear encounter state on game reset", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        encounterDeck: {
          drawPile: ["unbearable-heat"],
          discardPile: ["frenzied-leap"],
        },
        drawnEncounter: {
          id: "unbearable-heat",
          name: "Unbearable Heat",
          type: "event",
          description: "Test",
          effect: { type: "damage", amount: 1, target: "active-hero" },
          imagePath: "test.png",
        },
      });

      const state = gameReducer(initialState, resetGame());

      expect(state.encounterDeck).toEqual({ drawPile: [], discardPile: [] });
      expect(state.drawnEncounter).toBeNull();
    });
  });

  describe("dismissEncounterCard", () => {
    it("should apply damage effect to active hero when dismissing damage encounter", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "villain-phase",
          turnNumber: 1,
          exploredThisTurn: false,
        },
        heroHp: [{ heroId: "quinn", currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 }],
        drawnEncounter: {
          id: "frenzied-leap",
          name: "Frenzied Leap",
          type: "event",
          description: "The active hero takes 2 damage.",
          effect: { type: "damage", amount: 2, target: "active-hero" },
          imagePath: "test.png",
        },
        encounterDeck: { drawPile: [], discardPile: [] },
      });

      // Import the action
      
      const state = gameReducer(initialState, dismissEncounterCard());

      expect(state.heroHp[0].currentHp).toBe(6); // Took 2 damage
      expect(state.drawnEncounter).toBeNull();
      expect(state.encounterDeck.discardPile).toContain("frenzied-leap");
    });

    it("should apply damage effect to all heroes when dismissing all-heroes encounter", () => {
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
          exploredThisTurn: false,
        },
        heroHp: [
          { heroId: "quinn", currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 },
          { heroId: "vistra", currentHp: 10, maxHp: 10, level: 1, ac: 18, surgeValue: 5, attackBonus: 8 },
        ],
        drawnEncounter: {
          id: "unbearable-heat",
          name: "Unbearable Heat",
          type: "event",
          description: "All heroes take 1 damage.",
          effect: { type: "damage", amount: 1, target: "all-heroes" },
          imagePath: "test.png",
        },
        encounterDeck: { drawPile: [], discardPile: [] },
      });

      
      const state = gameReducer(initialState, dismissEncounterCard());

      expect(state.heroHp[0].currentHp).toBe(7); // Quinn took 1 damage
      expect(state.heroHp[1].currentHp).toBe(9); // Vistra took 1 damage
      expect(state.drawnEncounter).toBeNull();
    });

    it("should trigger defeat when encounter reduces all heroes to 0 HP", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "villain-phase",
          turnNumber: 1,
          exploredThisTurn: false,
        },
        heroHp: [{ heroId: "quinn", currentHp: 1, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 }],
        drawnEncounter: {
          id: "unbearable-heat",
          name: "Unbearable Heat",
          type: "event",
          description: "All heroes take 1 damage.",
          effect: { type: "damage", amount: 1, target: "all-heroes" },
          imagePath: "test.png",
        },
        encounterDeck: { drawPile: [], discardPile: [] },
      });

      
      const state = gameReducer(initialState, dismissEncounterCard());

      expect(state.heroHp[0].currentHp).toBe(0);
      expect(state.currentScreen).toBe("defeat");
      expect(state.defeatReason).toContain("Unbearable Heat");
    });

    it("should activate environment card when dismissed", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "villain-phase",
          turnNumber: 1,
          exploredThisTurn: false,
        },
        heroHp: [{ heroId: "quinn", currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 }],
        drawnEncounter: {
          id: "hidden-snipers",
          name: "Hidden Snipers",
          type: "environment",
          description: "Take 1 damage when alone on tile.",
          effect: { type: "environment", description: "Take 1 damage when alone on tile." },
          imagePath: "test.png",
        },
        encounterDeck: { drawPile: [], discardPile: [] },
        activeEnvironmentId: null,
      });

      
      const state = gameReducer(initialState, dismissEncounterCard());

      // HP unchanged during encounter resolution - environment effects apply at appropriate phases
      expect(state.heroHp[0].currentHp).toBe(8);
      expect(state.drawnEncounter).toBeNull();
      // Environment cards are not discarded - they become the active environment
      expect(state.encounterDeck.discardPile).not.toContain("hidden-snipers");
      expect(state.activeEnvironmentId).toBe("hidden-snipers");
    });

    it("should spawn monster when dismissing wandering monster encounter", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "villain-phase",
          turnNumber: 1,
          exploredThisTurn: false,
        },
        heroHp: [{ heroId: "quinn", currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 }],
        drawnEncounter: {
          id: "wandering-monster",
          name: "Wandering Monster",
          type: "event",
          description: "Draw a Monster Card and place its figure on any tile with an unexplored edge.",
          effect: { type: "special", description: "Spawn a monster on tile with unexplored edge." },
          imagePath: "test.png",
        },
        encounterDeck: { drawPile: [], discardPile: [] },
        monsterDeck: { drawPile: ["kobold", "snake"], discardPile: [] },
        monsters: [],
        dungeon: {
          tiles: [{
            id: "start-tile",
            tileType: "start",
            position: { col: 0, row: 0 },
            rotation: 0,
            edges: { north: "unexplored", south: "wall", east: "wall", west: "wall" },
          }],
          unexploredEdges: [
            { tileId: "start-tile", direction: "north" },
          ],
          tileDeck: [],
        },
      });

      const state = gameReducer(initialState, dismissEncounterCard());

      // Should have spawned a monster
      expect(state.monsters.length).toBe(1);
      expect(state.monsters[0].monsterId).toBe("kobold");
      expect(state.encounterEffectMessage).toContain("spawned");
      // Monster deck should be updated
      expect(state.monsterDeck.drawPile).toEqual(["snake"]);
      expect(state.drawnEncounter).toBeNull();
      expect(state.encounterDeck.discardPile).toContain("wandering-monster");
    });

    it("should show error message when no monsters available for wandering monster", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "villain-phase",
          turnNumber: 1,
          exploredThisTurn: false,
        },
        heroHp: [{ heroId: "quinn", currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 }],
        drawnEncounter: {
          id: "wandering-monster",
          name: "Wandering Monster",
          type: "event",
          description: "Draw a Monster Card and place its figure on any tile with an unexplored edge.",
          effect: { type: "special", description: "Spawn a monster on tile with unexplored edge." },
          imagePath: "test.png",
        },
        encounterDeck: { drawPile: [], discardPile: [] },
        monsterDeck: { drawPile: [], discardPile: [] }, // Empty monster deck
        monsters: [],
        dungeon: {
          tiles: [{
            id: "start-tile",
            tileType: "start",
            position: { col: 0, row: 0 },
            rotation: 0,
            edges: { north: "unexplored", south: "wall", east: "wall", west: "wall" },
          }],
          unexploredEdges: [
            { tileId: "start-tile", direction: "north" },
          ],
          tileDeck: [],
        },
      });

      const state = gameReducer(initialState, dismissEncounterCard());

      // Should not have spawned a monster
      expect(state.monsters.length).toBe(0);
      expect(state.encounterEffectMessage).toBe("No monsters available in deck");
      expect(state.drawnEncounter).toBeNull();
      expect(state.encounterDeck.discardPile).toContain("wandering-monster");
    });
  });

  describe("Scream of the Sentry", () => {
    it("should discard card when no monsters in play", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 }, tileId: "start-tile" }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "villain-phase",
          turnNumber: 1,
          exploredThisTurn: false,
        },
        heroHp: [{ heroId: "quinn", currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 }],
        drawnEncounter: {
          id: "scream-of-sentry",
          name: "Scream of the Sentry",
          type: "event",
          description: "If no Monster is in play, discard this card.",
          effect: { type: "special", description: "Place tile and monster near existing monster." },
          imagePath: "test.png",
        },
        encounterDeck: { drawPile: [], discardPile: [] },
        monsters: [],
      });

      const state = gameReducer(initialState, dismissEncounterCard());

      expect(state.encounterEffectMessage).toBe("No monsters in play - card discarded");
      expect(state.drawnEncounter).toBeNull();
      expect(state.encounterDeck.discardPile).toContain("scream-of-sentry");
    });

    it("should place tile and spawn monster near existing monster", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 }, tileId: "start-tile" }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "villain-phase",
          turnNumber: 1,
          exploredThisTurn: false,
        },
        heroHp: [{ heroId: "quinn", currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 }],
        drawnEncounter: {
          id: "scream-of-sentry",
          name: "Scream of the Sentry",
          type: "event",
          description: "If no Monster is in play, discard this card.",
          effect: { type: "special", description: "Place tile and monster near existing monster." },
          imagePath: "test.png",
        },
        encounterDeck: { drawPile: [], discardPile: [] },
        monsters: [{
          instanceId: "1",
          monsterId: "kobold",
          position: { x: 2, y: 2 },
          tileId: "start-tile",
          currentHp: 5,
          targetHeroId: "quinn",
          turnNumber: 1,
        }],
        monsterDeck: { drawPile: ["snake"], discardPile: [] },
        dungeon: {
          tiles: [{
            id: "start-tile",
            tileType: "start",
            position: { x: 0, y: 0 },
            rotation: 0,
            edges: {
              north: "unexplored",
              south: "unexplored",
              east: "unexplored",
              west: "unexplored",
            },
          }],
          unexploredEdges: [
            { tileId: "start-tile", direction: "north" },
          ],
          tileDeck: ["tile-black-2exit-a"],
        },
      });

      const state = gameReducer(initialState, dismissEncounterCard());

      // Should have placed a tile (start with 1, add 1 more)
      expect(state.dungeon.tiles.length).toBeGreaterThan(1);
      // Should have spawned a monster (start with 1, add 1 more)
      expect(state.monsters.length).toBe(2);
      expect(state.monsters[1].monsterId).toBe("snake");
      // Should show success message
      expect(state.encounterEffectMessage).toContain("spawned");
      // Tile deck should be empty now
      expect(state.dungeon.tileDeck).toEqual([]);
      // Monster deck should be empty now
      expect(state.monsterDeck.drawPile).toEqual([]);
    });

    it("should prompt for monster choice when multiple monsters exist", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 }, tileId: "start-tile" }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "villain-phase",
          turnNumber: 1,
          exploredThisTurn: false,
        },
        heroHp: [{ heroId: "quinn", currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 }],
        drawnEncounter: {
          id: "scream-of-sentry",
          name: "Scream of the Sentry",
          type: "event",
          description: "Choose a monster...",
          effect: { type: "special", description: "Place tile and monster near existing monster." },
          imagePath: "test.png",
        },
        encounterDeck: { drawPile: [], discardPile: [] },
        monsters: [
          {
            instanceId: "1",
            monsterId: "kobold",
            position: { x: 2, y: 2 },
            tileId: "start-tile",
            currentHp: 5,
            targetHeroId: "quinn",
            turnNumber: 1,
          },
          {
            instanceId: "2",
            monsterId: "snake",
            position: { x: 3, y: 3 },
            tileId: "start-tile",
            currentHp: 3,
            targetHeroId: "quinn",
            turnNumber: 1,
          },
        ],
        monsterDeck: { drawPile: ["kobold"], discardPile: [] },
        dungeon: {
          tiles: [{
            id: "start-tile",
            tileType: "start",
            position: { x: 0, y: 0 },
            rotation: 0,
            edges: {
              north: "unexplored",
              south: "unexplored",
              east: "unexplored",
              west: "unexplored",
            },
          }],
          unexploredEdges: [
            { tileId: "start-tile", direction: "north" },
          ],
          tileDeck: ["tile-black-2exit-a"],
        },
      });

      const state = gameReducer(initialState, dismissEncounterCard());

      // Should show monster choice prompt
      expect(state.pendingMonsterChoice).not.toBeNull();
      expect(state.pendingMonsterChoice?.encounterId).toBe("scream-of-sentry");
      expect(state.pendingMonsterChoice?.encounterName).toBe("Scream of the Sentry");
      expect(state.pendingMonsterChoice?.context).toContain("Choose a monster");
      // Encounter card should still be drawn (not discarded yet)
      expect(state.drawnEncounter).not.toBeNull();
      // No changes to tiles or monsters yet
      expect(state.dungeon.tiles.length).toBe(1);
      expect(state.monsters.length).toBe(2);
    });

    it("should apply effect after player selects a monster", () => {
      // First, set up state with pending monster choice
      const stateWithChoice = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 }, tileId: "start-tile" }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "villain-phase",
          turnNumber: 1,
          exploredThisTurn: false,
        },
        heroHp: [{ heroId: "quinn", currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 }],
        drawnEncounter: {
          id: "scream-of-sentry",
          name: "Scream of the Sentry",
          type: "event",
          description: "Choose a monster...",
          effect: { type: "special", description: "Place tile and monster near existing monster." },
          imagePath: "test.png",
        },
        encounterDeck: { drawPile: [], discardPile: [] },
        pendingMonsterChoice: {
          encounterId: "scream-of-sentry",
          encounterName: "Scream of the Sentry",
          context: "Choose a monster to place a tile near",
        },
        monsters: [
          {
            instanceId: "1",
            monsterId: "kobold",
            position: { x: 2, y: 2 },
            tileId: "start-tile",
            currentHp: 5,
            targetHeroId: "quinn",
            turnNumber: 1,
          },
          {
            instanceId: "2",
            monsterId: "snake",
            position: { x: 3, y: 3 },
            tileId: "start-tile",
            currentHp: 3,
            targetHeroId: "quinn",
            turnNumber: 1,
          },
        ],
        monsterDeck: { drawPile: ["kobold"], discardPile: [] },
        dungeon: {
          tiles: [{
            id: "start-tile",
            tileType: "start",
            position: { x: 0, y: 0 },
            rotation: 0,
            edges: {
              north: "unexplored",
              south: "unexplored",
              east: "unexplored",
              west: "unexplored",
            },
          }],
          unexploredEdges: [
            { tileId: "start-tile", direction: "north" },
          ],
          tileDeck: ["tile-black-2exit-a"],
        },
      });

      // Select the first monster
      const state = gameReducer(stateWithChoice, selectMonsterForEncounter({ monsterInstanceId: "1" }));

      // Monster choice should be cleared
      expect(state.pendingMonsterChoice).toBeNull();
      // Should have placed a tile
      expect(state.dungeon.tiles.length).toBeGreaterThan(1);
      // Should have spawned a new monster
      expect(state.monsters.length).toBe(3);
      // Should show success message
      expect(state.encounterEffectMessage).toContain("spawned");
      // Encounter card should be discarded
      expect(state.drawnEncounter).toBeNull();
      expect(state.encounterDeck.discardPile).toContain("scream-of-sentry");
    });
  });

  describe("cancelEncounterCard", () => {
    it("should cancel encounter without applying effect when party has 5+ XP", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "villain-phase",
          turnNumber: 1,
          exploredThisTurn: false,
        },
        heroHp: [{ heroId: "quinn", currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 }],
        drawnEncounter: {
          id: "frenzied-leap",
          name: "Frenzied Leap",
          type: "event",
          description: "The active hero takes 2 damage.",
          effect: { type: "damage", amount: 2, target: "active-hero" },
          imagePath: "test.png",
        },
        encounterDeck: { drawPile: [], discardPile: [] },
        partyResources: { xp: 6, healingSurges: 2 },
      });

      const state = gameReducer(initialState, cancelEncounterCard());

      // Effect was NOT applied - HP unchanged
      expect(state.heroHp[0].currentHp).toBe(8);
      // XP was deducted
      expect(state.partyResources.xp).toBe(1);
      // Encounter was discarded
      expect(state.drawnEncounter).toBeNull();
      expect(state.encounterDeck.discardPile).toContain("frenzied-leap");
    });

    it("should deduct exactly 5 XP when canceling encounter", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "villain-phase",
          turnNumber: 1,
          exploredThisTurn: false,
        },
        heroHp: [{ heroId: "quinn", currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 }],
        drawnEncounter: {
          id: "unbearable-heat",
          name: "Unbearable Heat",
          type: "event",
          description: "All heroes take 1 damage.",
          effect: { type: "damage", amount: 1, target: "all-heroes" },
          imagePath: "test.png",
        },
        encounterDeck: { drawPile: [], discardPile: [] },
        partyResources: { xp: 10, healingSurges: 2 },
      });

      const state = gameReducer(initialState, cancelEncounterCard());

      expect(state.partyResources.xp).toBe(5);
    });

    it("should not cancel encounter when party has less than 5 XP", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "villain-phase",
          turnNumber: 1,
          exploredThisTurn: false,
        },
        heroHp: [{ heroId: "quinn", currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 }],
        drawnEncounter: {
          id: "frenzied-leap",
          name: "Frenzied Leap",
          type: "event",
          description: "The active hero takes 2 damage.",
          effect: { type: "damage", amount: 2, target: "active-hero" },
          imagePath: "test.png",
        },
        encounterDeck: { drawPile: [], discardPile: [] },
        partyResources: { xp: 4, healingSurges: 2 },
      });

      const state = gameReducer(initialState, cancelEncounterCard());

      // Encounter should still be displayed
      expect(state.drawnEncounter).not.toBeNull();
      // XP should not change
      expect(state.partyResources.xp).toBe(4);
      // Discard pile should be empty
      expect(state.encounterDeck.discardPile).toHaveLength(0);
    });

    it("should do nothing when no encounter is drawn", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "villain-phase",
          turnNumber: 1,
          exploredThisTurn: false,
        },
        heroHp: [{ heroId: "quinn", currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 }],
        drawnEncounter: null,
        encounterDeck: { drawPile: [], discardPile: [] },
        partyResources: { xp: 10, healingSurges: 2 },
      });

      const state = gameReducer(initialState, cancelEncounterCard());

      // XP should not change
      expect(state.partyResources.xp).toBe(10);
    });

    it("should not modify healing surges when canceling encounter", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "villain-phase",
          turnNumber: 1,
          exploredThisTurn: false,
        },
        heroHp: [{ heroId: "quinn", currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 }],
        drawnEncounter: {
          id: "frenzied-leap",
          name: "Frenzied Leap",
          type: "event",
          description: "The active hero takes 2 damage.",
          effect: { type: "damage", amount: 2, target: "active-hero" },
          imagePath: "test.png",
        },
        encounterDeck: { drawPile: [], discardPile: [] },
        partyResources: { xp: 5, healingSurges: 3 },
      });

      const state = gameReducer(initialState, cancelEncounterCard());

      expect(state.partyResources.healingSurges).toBe(3);
    });
  });

  describe("Action Surge (At 0 HP)", () => {
    it("should show action surge prompt when hero HP = 0 with surges available at turn start", () => {
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
        partyResources: { xp: 0, healingSurges: 2 },
        showActionSurgePrompt: false,
      });

      const state = gameReducer(initialState, endVillainPhase());

      expect(state.showActionSurgePrompt).toBe(true);
      expect(state.turnState.currentPhase).toBe("hero-phase");
    });

    it("should NOT show action surge prompt when hero HP > 0", () => {
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
        showActionSurgePrompt: false,
      });

      const state = gameReducer(initialState, endVillainPhase());

      expect(state.showActionSurgePrompt).toBe(false);
    });

    it("should NOT show action surge prompt when hero HP = maxHp", () => {
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
          { heroId: "quinn", currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 },
        ],
        partyResources: { xp: 0, healingSurges: 2 },
        showActionSurgePrompt: false,
      });

      const state = gameReducer(initialState, endVillainPhase());

      expect(state.showActionSurgePrompt).toBe(false);
    });

    it("should trigger defeat when hero HP = 0 and no surges available", () => {
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
        showActionSurgePrompt: false,
      });

      const state = gameReducer(initialState, endVillainPhase());

      expect(state.currentScreen).toBe("defeat");
      expect(state.showActionSurgePrompt).toBe(false);
    });

    it("should heal hero when using action surge at 0 HP", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [
          { heroId: "quinn", position: { x: 2, y: 2 } },
        ],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
        },
        heroHp: [
          { heroId: "quinn", currentHp: 0, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 },
        ],
        partyResources: { xp: 0, healingSurges: 2 },
        showActionSurgePrompt: true,
      });

      const state = gameReducer(initialState, useVoluntaryActionSurge());

      expect(state.heroHp.find(h => h.heroId === "quinn")?.currentHp).toBe(4); // 0 + surge value 4 = 4
      expect(state.partyResources.healingSurges).toBe(1);
      expect(state.showActionSurgePrompt).toBe(false);
      expect(state.healingSurgeUsedHeroId).toBe("quinn");
      expect(state.healingSurgeHpRestored).toBe(4);
    });

    it("should trigger defeat when skipping action surge at 0 HP", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [
          { heroId: "quinn", position: { x: 2, y: 2 } },
        ],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
        },
        heroHp: [
          { heroId: "quinn", currentHp: 0, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 },
        ],
        partyResources: { xp: 0, healingSurges: 2 },
        showActionSurgePrompt: true,
      });

      const state = gameReducer(initialState, skipActionSurge());

      expect(state.showActionSurgePrompt).toBe(false);
      expect(state.currentScreen).toBe("defeat");
      expect(state.defeatReason).toContain("chose not to use a healing surge");
    });

    it("should not allow using action surge when prompt is not shown", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [
          { heroId: "quinn", position: { x: 2, y: 2 } },
        ],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
        },
        heroHp: [
          { heroId: "quinn", currentHp: 0, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 },
        ],
        partyResources: { xp: 0, healingSurges: 2 },
        showActionSurgePrompt: false, // Prompt not shown
      });

      const state = gameReducer(initialState, useVoluntaryActionSurge());

      // HP and surges should remain unchanged
      expect(state.heroHp.find(h => h.heroId === "quinn")?.currentHp).toBe(0);
      expect(state.partyResources.healingSurges).toBe(12);
    });

    it("should not allow using action surge during non-hero phase", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [
          { heroId: "quinn", position: { x: 2, y: 2 } },
        ],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "villain-phase", // Not hero phase
          turnNumber: 1,
        },
        heroHp: [
          { heroId: "quinn", currentHp: 0, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 },
        ],
        partyResources: { xp: 0, healingSurges: 2 },
        showActionSurgePrompt: true,
      });

      const state = gameReducer(initialState, useVoluntaryActionSurge());

      // HP and surges should remain unchanged
      expect(state.heroHp.find(h => h.heroId === "quinn")?.currentHp).toBe(0);
      expect(state.partyResources.healingSurges).toBe(12);
    });

    it("should clear action surge prompt on reset", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        showActionSurgePrompt: true,
      });

      const state = gameReducer(initialState, resetGame());

      expect(state.showActionSurgePrompt).toBe(false);
    });
  });

  describe("treasure system", () => {
    it("should initialize treasure deck when starting game", () => {
      const action = startGame({ heroIds: ["quinn"], seed: 12345 });
      const state = gameReducer(undefined, action);

      expect(state.treasureDeck.drawPile.length).toBeGreaterThan(0);
      expect(state.treasureDeck.discardPile).toEqual([]);
      expect(state.drawnTreasure).toBeNull();
      expect(state.treasureDrawnThisTurn).toBe(false);
    });

    it("should initialize hero inventories when starting game", () => {
      const action = startGame({ heroIds: ["quinn", "vistra"], seed: 12345 });
      const state = gameReducer(undefined, action);

      expect(state.heroInventories).toBeDefined();
      expect(state.heroInventories["quinn"]).toBeDefined();
      expect(state.heroInventories["quinn"].heroId).toBe("quinn");
      expect(state.heroInventories["quinn"].items).toEqual([]);
      expect(state.heroInventories["vistra"]).toBeDefined();
      expect(state.heroInventories["vistra"].heroId).toBe("vistra");
    });

    it("should draw treasure when defeating a monster", () => {
      const attackResult = {
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
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 3 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
        },
        heroHp: [{ heroId: "quinn", currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 }],
        monsters: [
          { monsterId: "kobold", instanceId: "kobold-0", position: { x: 2, y: 2 }, currentHp: 1, controllerId: "quinn", tileId: "start-tile" },
        ],
        treasureDeck: { drawPile: [134, 135, 136], discardPile: [] },
        treasureDrawnThisTurn: false,
      });

      const state = gameReducer(initialState, setAttackResult({
        result: attackResult,
        targetInstanceId: "kobold-0",
        attackName: "Test Attack",
      }));

      // Treasure should be drawn
      expect(state.drawnTreasure).not.toBeNull();
      expect(state.drawnTreasure?.id).toBe(134);
      expect(state.treasureDrawnThisTurn).toBe(true);
      // Treasure deck should be updated
      expect(state.treasureDeck.drawPile).toEqual([135, 136]);
    });

    it("should only draw one treasure per turn", () => {
      const attackResult = {
        roll: 15,
        attackBonus: 6,
        total: 21,
        targetAC: 14,
        isHit: true,
        damage: 2,
        isCritical: false,
      };

      // First defeat sets treasureDrawnThisTurn
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 3 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
        },
        heroHp: [{ heroId: "quinn", currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 }],
        monsters: [
          { monsterId: "kobold", instanceId: "kobold-0", position: { x: 2, y: 2 }, currentHp: 1, controllerId: "quinn", tileId: "start-tile" },
          { monsterId: "kobold", instanceId: "kobold-1", position: { x: 1, y: 2 }, currentHp: 1, controllerId: "quinn", tileId: "start-tile" },
        ],
        treasureDeck: { drawPile: [134, 135, 136], discardPile: [] },
        treasureDrawnThisTurn: true, // Already drawn treasure this turn
        heroTurnActions: { actionsTaken: [], canMove: true, canAttack: true },
      });

      const state = gameReducer(initialState, setAttackResult({
        result: attackResult,
        targetInstanceId: "kobold-0",
        attackName: "Test Attack",
      }));

      // No new treasure should be drawn (treasureDrawnThisTurn was already true)
      expect(state.drawnTreasure).toBeNull();
      // Deck should remain unchanged
      expect(state.treasureDeck.drawPile).toEqual([134, 135, 136]);
    });

    it("should reset treasureDrawnThisTurn on new turn", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 3 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "villain-phase",
          turnNumber: 1,
        },
        heroHp: [{ heroId: "quinn", currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 }],
        treasureDrawnThisTurn: true,
      });

      const state = gameReducer(initialState, endVillainPhase());

      expect(state.treasureDrawnThisTurn).toBe(false);
    });

    it("should assign treasure to hero inventory", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 3 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
        },
        drawnTreasure: {
          id: 134,
          name: "+1 Magic Sword",
          description: "Test",
          rule: "Test",
          usage: "immediate" as const,
          goldPrice: 1000,
          effect: { type: "attack-bonus" as const, value: 1, description: "+1 attack" },
          discardAfterUse: false,
        },
        heroInventories: {
          quinn: { heroId: "quinn", items: [] },
        },
      });

      const state = gameReducer(initialState, assignTreasureToHero({ heroId: "quinn" }));

      expect(state.drawnTreasure).toBeNull();
      expect(state.heroInventories["quinn"].items).toHaveLength(1);
      expect(state.heroInventories["quinn"].items[0].cardId).toBe(134);
      expect(state.heroInventories["quinn"].items[0].isFlipped).toBe(false);
    });

    it("should dismiss treasure card and discard it", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        drawnTreasure: {
          id: 134,
          name: "+1 Magic Sword",
          description: "Test",
          rule: "Test",
          usage: "immediate" as const,
          goldPrice: 1000,
          effect: { type: "attack-bonus" as const, value: 1, description: "+1 attack" },
          discardAfterUse: false,
        },
        treasureDeck: { drawPile: [135, 136], discardPile: [] },
      });

      const state = gameReducer(initialState, dismissTreasureCard());

      expect(state.drawnTreasure).toBeNull();
      expect(state.treasureDeck.discardPile).toContain(134);
    });

    it("should reset treasure state on game reset", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        treasureDeck: { drawPile: [134], discardPile: [135] },
        drawnTreasure: {
          id: 136,
          name: "Test",
          description: "Test",
          rule: "Test",
          usage: "immediate" as const,
          goldPrice: 1000,
          effect: { type: "attack-bonus" as const, value: 1, description: "Test" },
          discardAfterUse: false,
        },
        heroInventories: {
          quinn: { heroId: "quinn", items: [{ cardId: 137, isFlipped: false }] },
        },
        treasureDrawnThisTurn: true,
      });

      const state = gameReducer(initialState, resetGame());

      expect(state.treasureDeck.drawPile).toEqual([]);
      expect(state.treasureDeck.discardPile).toEqual([]);
      expect(state.drawnTreasure).toBeNull();
      expect(state.heroInventories).toEqual({});
      expect(state.treasureDrawnThisTurn).toBe(false);
    });

    describe("useTreasureItem", () => {
      it("should heal hero when using Potion of Healing", () => {
        const initialState = createGameState({
          currentScreen: "game-board",
          heroTokens: [{ heroId: "quinn", position: { x: 2, y: 3 } }],
          turnState: {
            currentHeroIndex: 0,
            currentPhase: "hero-phase",
            turnNumber: 1,
          },
          heroHp: [{ heroId: "quinn", currentHp: 4, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 }],
          heroInventories: {
            quinn: { heroId: "quinn", items: [{ cardId: 150, isFlipped: false }] }, // Potion of Healing
          },
          treasureDeck: { drawPile: [], discardPile: [] },
        });

        const state = gameReducer(initialState, useTreasureItem({ heroId: "quinn", cardId: 150 }));

        // Hero should be healed by 2 HP
        expect(state.heroHp[0].currentHp).toBe(6);
        // Potion should be removed from inventory and discarded
        expect(state.heroInventories["quinn"].items).toHaveLength(0);
        expect(state.treasureDeck.discardPile).toContain(150);
      });

      it("should not heal beyond max HP", () => {
        const initialState = createGameState({
          currentScreen: "game-board",
          heroTokens: [{ heroId: "quinn", position: { x: 2, y: 3 } }],
          turnState: {
            currentHeroIndex: 0,
            currentPhase: "hero-phase",
            turnNumber: 1,
          },
          heroHp: [{ heroId: "quinn", currentHp: 7, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 }],
          heroInventories: {
            quinn: { heroId: "quinn", items: [{ cardId: 150, isFlipped: false }] },
          },
          treasureDeck: { drawPile: [], discardPile: [] },
        });

        const state = gameReducer(initialState, useTreasureItem({ heroId: "quinn", cardId: 150 }));

        // Hero should be capped at max HP
        expect(state.heroHp[0].currentHp).toBe(8);
        expect(state.heroHp[0].maxHp).toBe(8);
      });

      it("should not use an item that is already flipped", () => {
        const initialState = createGameState({
          currentScreen: "game-board",
          heroTokens: [{ heroId: "quinn", position: { x: 2, y: 3 } }],
          turnState: {
            currentHeroIndex: 0,
            currentPhase: "hero-phase",
            turnNumber: 1,
          },
          heroHp: [{ heroId: "quinn", currentHp: 4, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 }],
          heroInventories: {
            quinn: { heroId: "quinn", items: [{ cardId: 150, isFlipped: true }] }, // Already used
          },
          treasureDeck: { drawPile: [], discardPile: [] },
        });

        const state = gameReducer(initialState, useTreasureItem({ heroId: "quinn", cardId: 150 }));

        // Nothing should change - item is already flipped
        expect(state.heroHp[0].currentHp).toBe(4);
        expect(state.heroInventories["quinn"].items).toHaveLength(1);
        expect(state.heroInventories["quinn"].items[0].isFlipped).toBe(true);
      });

      it("should flip reusable items instead of discarding", () => {
        // Ring of Shooting Stars (157) is a flip-to-use item
        const initialState = createGameState({
          currentScreen: "game-board",
          heroTokens: [{ heroId: "quinn", position: { x: 2, y: 3 } }],
          turnState: {
            currentHeroIndex: 0,
            currentPhase: "hero-phase",
            turnNumber: 1,
          },
          heroHp: [{ heroId: "quinn", currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 }],
          heroInventories: {
            quinn: { heroId: "quinn", items: [{ cardId: 157, isFlipped: false }] }, // Ring of Shooting Stars
          },
          treasureDeck: { drawPile: [], discardPile: [] },
        });

        const state = gameReducer(initialState, useTreasureItem({ heroId: "quinn", cardId: 157 }));

        // Item should be flipped, not removed
        expect(state.heroInventories["quinn"].items).toHaveLength(1);
        expect(state.heroInventories["quinn"].items[0].isFlipped).toBe(true);
        expect(state.treasureDeck.discardPile).toHaveLength(0);
      });

      it("should do nothing if hero inventory does not exist", () => {
        const initialState = createGameState({
          currentScreen: "game-board",
          heroTokens: [{ heroId: "quinn", position: { x: 2, y: 3 } }],
          turnState: {
            currentHeroIndex: 0,
            currentPhase: "hero-phase",
            turnNumber: 1,
          },
          heroHp: [{ heroId: "quinn", currentHp: 4, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 }],
          heroInventories: {},
          treasureDeck: { drawPile: [], discardPile: [] },
        });

        const state = gameReducer(initialState, useTreasureItem({ heroId: "quinn", cardId: 150 }));

        // Nothing should change
        expect(state.heroHp[0].currentHp).toBe(4);
      });

      it("should do nothing if item is not in inventory", () => {
        const initialState = createGameState({
          currentScreen: "game-board",
          heroTokens: [{ heroId: "quinn", position: { x: 2, y: 3 } }],
          turnState: {
            currentHeroIndex: 0,
            currentPhase: "hero-phase",
            turnNumber: 1,
          },
          heroHp: [{ heroId: "quinn", currentHp: 4, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 }],
          heroInventories: {
            quinn: { heroId: "quinn", items: [{ cardId: 134, isFlipped: false }] }, // Different item
          },
          treasureDeck: { drawPile: [], discardPile: [] },
        });

        const state = gameReducer(initialState, useTreasureItem({ heroId: "quinn", cardId: 150 }));

        // Nothing should change
        expect(state.heroHp[0].currentHp).toBe(4);
        expect(state.heroInventories["quinn"].items).toHaveLength(1);
      });
    });
  });

  describe("incremental movement", () => {
    const createMovementTestState = () => createGameState({
      currentScreen: "game-board",
      heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
      turnState: {
        currentHeroIndex: 0,
        currentPhase: "hero-phase",
        turnNumber: 1,
      },
      validMoveSquares: [{ x: 3, y: 2 }, { x: 3, y: 3 }, { x: 2, y: 3 }],
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

    it("should track remaining movement after a step", () => {
      const initialState = createMovementTestState();
      const state = gameReducer(initialState, moveHero({ heroId: "quinn", position: { x: 3, y: 2 }, speed: 5 }));

      expect(state.incrementalMovement).not.toBeNull();
      expect(state.incrementalMovement?.heroId).toBe("quinn");
      expect(state.incrementalMovement?.totalSpeed).toBe(5);
      expect(state.incrementalMovement?.remainingMovement).toBe(4); // 5 - 1 = 4
      expect(state.incrementalMovement?.inProgress).toBe(true);
      expect(state.incrementalMovement?.startingPosition).toEqual({ x: 2, y: 2 });
    });

    it("should allow multiple incremental steps", () => {
      const initialState = createMovementTestState();
      
      // First step
      const stateAfterFirst = gameReducer(initialState, moveHero({ heroId: "quinn", position: { x: 3, y: 2 }, speed: 5 }));
      expect(stateAfterFirst.incrementalMovement?.remainingMovement).toBe(4);
      
      // Second step (need to add the new position to valid squares first)
      const stateWithUpdatedSquares = {
        ...stateAfterFirst,
        validMoveSquares: [{ x: 3, y: 3 }],
      };
      const stateAfterSecond = gameReducer(stateWithUpdatedSquares, moveHero({ heroId: "quinn", position: { x: 3, y: 3 }, speed: 5 }));
      expect(stateAfterSecond.incrementalMovement?.remainingMovement).toBe(3);
      expect(stateAfterSecond.incrementalMovement?.inProgress).toBe(true);
    });

    it("should mark movement complete when all movement is used", () => {
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

      // With speed 1, one step uses all movement
      const state = gameReducer(initialState, moveHero({ heroId: "quinn", position: { x: 3, y: 2 }, speed: 1 }));

      expect(state.incrementalMovement?.inProgress).toBe(false);
      expect(state.incrementalMovement?.remainingMovement).toBe(0);
      expect(state.heroTurnActions.actionsTaken).toEqual(["move"]);
    });

    it("should allow completing move early with completeMove action", () => {
      const initialState = createMovementTestState();
      
      // Take a step
      const stateAfterMove = gameReducer(initialState, moveHero({ heroId: "quinn", position: { x: 3, y: 2 }, speed: 5 }));
      expect(stateAfterMove.incrementalMovement?.remainingMovement).toBe(4);
      
      // Complete the move early
      const stateAfterComplete = gameReducer(stateAfterMove, completeMove());
      
      expect(stateAfterComplete.incrementalMovement?.inProgress).toBe(false);
      expect(stateAfterComplete.incrementalMovement?.remainingMovement).toBe(0);
      expect(stateAfterComplete.heroTurnActions.actionsTaken).toEqual(["move"]);
      expect(stateAfterComplete.showingMovement).toBe(false);
    });

    it("should finalize movement and clear undo when attack is performed", () => {
      const initialState = createGameState({
        currentScreen: "game-board",
        heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: "hero-phase",
          turnNumber: 1,
        },
        validMoveSquares: [{ x: 2, y: 3 }],
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
        monsters: [
          { monsterId: "kobold", instanceId: "kobold-0", position: { x: 2, y: 3 }, currentHp: 1, controllerId: "quinn", tileId: "start-tile" },
        ],
        heroHp: [{ heroId: "quinn", currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 }],
      });

      // Take a step
      const stateAfterMove = gameReducer(initialState, moveHero({ heroId: "quinn", position: { x: 2, y: 3 }, speed: 5 }));
      expect(stateAfterMove.incrementalMovement?.inProgress).toBe(true);
      expect(stateAfterMove.undoSnapshot).not.toBeNull();
      
      // Attack
      const attackResult = {
        roll: 15,
        attackBonus: 6,
        total: 21,
        targetAC: 14,
        isHit: true,
        damage: 2,
        isCritical: false,
      };
      const stateAfterAttack = gameReducer(stateAfterMove, setAttackResult({
        result: attackResult,
        targetInstanceId: "kobold-0",
        attackName: "Mace",
      }));
      
      // Movement should be finalized and undo cleared
      expect(stateAfterAttack.incrementalMovement?.inProgress).toBe(false);
      expect(stateAfterAttack.undoSnapshot).toBeNull();
      // Should have both move and attack in actions
      expect(stateAfterAttack.heroTurnActions.actionsTaken).toEqual(["move", "attack"]);
    });
  });

  describe("undo functionality", () => {
    const createUndoTestState = () => createGameState({
      currentScreen: "game-board",
      heroTokens: [{ heroId: "quinn", position: { x: 2, y: 2 } }],
      turnState: {
        currentHeroIndex: 0,
        currentPhase: "hero-phase",
        turnNumber: 1,
      },
      validMoveSquares: [{ x: 3, y: 2 }, { x: 3, y: 3 }],
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

    it("should create undo snapshot when moving", () => {
      const initialState = createUndoTestState();
      const state = gameReducer(initialState, moveHero({ heroId: "quinn", position: { x: 3, y: 2 }, speed: 5 }));

      expect(state.undoSnapshot).not.toBeNull();
      expect(state.undoSnapshot?.heroTokens[0].position).toEqual({ x: 2, y: 2 }); // Original position
      expect(state.undoSnapshot?.actionType).toBe("start-move");
    });

    it("should restore position when undoing a move", () => {
      const initialState = createUndoTestState();
      
      // Move
      const stateAfterMove = gameReducer(initialState, moveHero({ heroId: "quinn", position: { x: 3, y: 2 }, speed: 5 }));
      const quinnAfterMove = stateAfterMove.heroTokens.find(t => t.heroId === "quinn");
      expect(quinnAfterMove?.position).toEqual({ x: 3, y: 2 });
      
      // Undo
      const stateAfterUndo = gameReducer(stateAfterMove, undoAction());
      const quinnAfterUndo = stateAfterUndo.heroTokens.find(t => t.heroId === "quinn");
      expect(quinnAfterUndo?.position).toEqual({ x: 2, y: 2 });
    });

    it("should restore incremental movement state when undoing", () => {
      const initialState = createUndoTestState();
      
      // Move twice
      const stateAfterFirst = gameReducer(initialState, moveHero({ heroId: "quinn", position: { x: 3, y: 2 }, speed: 5 }));
      const stateWithUpdatedSquares = {
        ...stateAfterFirst,
        validMoveSquares: [{ x: 3, y: 3 }],
      };
      const stateAfterSecond = gameReducer(stateWithUpdatedSquares, moveHero({ heroId: "quinn", position: { x: 3, y: 3 }, speed: 5 }));
      
      expect(stateAfterSecond.incrementalMovement?.remainingMovement).toBe(3);
      
      // Undo second move
      const stateAfterUndo = gameReducer(stateAfterSecond, undoAction());
      
      // Should be back at first step's state
      expect(stateAfterUndo.heroTokens.find(t => t.heroId === "quinn")?.position).toEqual({ x: 3, y: 2 });
      expect(stateAfterUndo.incrementalMovement?.remainingMovement).toBe(4);
    });

    it("should clear undo snapshot after undoing", () => {
      const initialState = createUndoTestState();
      
      const stateAfterMove = gameReducer(initialState, moveHero({ heroId: "quinn", position: { x: 3, y: 2 }, speed: 5 }));
      expect(stateAfterMove.undoSnapshot).not.toBeNull();
      
      const stateAfterUndo = gameReducer(stateAfterMove, undoAction());
      expect(stateAfterUndo.undoSnapshot).toBeNull();
    });

    it("should not undo if no snapshot exists", () => {
      const initialState = createUndoTestState();
      
      // Try to undo without having made a move
      const stateAfterUndo = gameReducer(initialState, undoAction());
      
      // State should be unchanged
      const quinn = stateAfterUndo.heroTokens.find(t => t.heroId === "quinn");
      expect(quinn?.position).toEqual({ x: 2, y: 2 });
    });

    it("should clear undo snapshot when ending hero phase", () => {
      const initialState = createUndoTestState();
      
      // Move
      const stateAfterMove = gameReducer(initialState, moveHero({ heroId: "quinn", position: { x: 3, y: 2 }, speed: 5 }));
      expect(stateAfterMove.undoSnapshot).not.toBeNull();
      
      // End hero phase
      const stateAfterEnd = gameReducer(stateAfterMove, endHeroPhase());
      expect(stateAfterEnd.undoSnapshot).toBeNull();
    });

    it("should recalculate valid movement squares after undo", () => {
      const initialState = createUndoTestState();
      
      // Move
      const stateAfterMove = gameReducer(initialState, moveHero({ heroId: "quinn", position: { x: 3, y: 2 }, speed: 5 }));
      
      // Undo
      const stateAfterUndo = gameReducer(stateAfterMove, undoAction());
      
      // Should show movement options again
      expect(stateAfterUndo.showingMovement).toBe(true);
      expect(stateAfterUndo.validMoveSquares.length).toBeGreaterThan(0);
    });
  });

  describe("Dazed Action Restrictions", () => {
    it("should restrict hero to single action when dazed (move)", () => {
      const state = gameReducer(undefined, startGame({ heroIds: ["quinn"], selectedPowerCards: {} }));
      
      // Apply dazed status to Quinn
      const stateWithDazed = gameReducer(state, {
        type: 'game/applyHeroStatus',
        payload: {
          heroId: 'quinn',
          statusType: 'dazed',
          source: 'test-monster',
          duration: 1
        }
      });
      
      // Start turn
      const stateAfterTurnStart = gameReducer(stateWithDazed, endVillainPhase());
      
      // Set hero turn actions as if hero just moved using the internal setHeroTurnActions
      const stateWithMoveTaken = gameReducer(
        stateAfterTurnStart,
        {
          type: 'game/setHeroTurnActions',
          payload: { actionsTaken: ['move'], canMove: false, canAttack: false }
        }
      );
      
      // After moving, dazed hero should not be able to attack or move again
      expect(stateWithMoveTaken.heroTurnActions.canAttack).toBe(false);
      expect(stateWithMoveTaken.heroTurnActions.canMove).toBe(false);
      expect(stateWithMoveTaken.heroTurnActions.actionsTaken).toEqual(['move']);
    });

    it("should restrict hero to single action when dazed (attack)", () => {
      const state = gameReducer(undefined, startGame({ heroIds: ["quinn"], selectedPowerCards: {} }));
      
      // Apply dazed status
      const stateWithDazed = gameReducer(state, {
        type: 'game/applyHeroStatus',
        payload: {
          heroId: 'quinn',
          statusType: 'dazed',
          source: 'test-monster'
        }
      });
      
      // Add a monster to attack
      const stateWithMonster = gameReducer(stateWithDazed, setMonsters([
        {
          monsterId: 'kobold',
          instanceId: 'kobold-1',
          position: { x: 3, y: 2 },
          currentHp: 1,
          controllerId: 'quinn',
          tileId: 'start-tile',
          statuses: []
        }
      ]));
      
      // Start turn
      const stateAfterTurnStart = gameReducer(stateWithMonster, endVillainPhase());
      
      // Attack the monster
      const stateAfterAttack = gameReducer(
        stateAfterTurnStart,
        setAttackResult({
          result: { isHit: true, roll: 15, damage: 2, targetAC: 10 },
          targetInstanceId: 'kobold-1',
          attackName: 'Longsword'
        })
      );
      
      // After attacking, dazed hero should not be able to move or attack again
      expect(stateAfterAttack.heroTurnActions.canMove).toBe(false);
      expect(stateAfterAttack.heroTurnActions.canAttack).toBe(false);
      expect(stateAfterAttack.heroTurnActions.actionsTaken).toEqual(['attack']);
    });

    it("should allow normal two-action turn when not dazed", () => {
      const state = gameReducer(undefined, startGame({ heroIds: ["quinn"], selectedPowerCards: {} }));
      
      // Start turn
      const stateAfterTurnStart = gameReducer(state, endVillainPhase());
      
      // Simulate hero took a move action (without Dazed)
      const stateAfterMove = gameReducer(
        stateAfterTurnStart,
        {
          type: 'game/setHeroTurnActions',
          payload: { actionsTaken: ['move'], canMove: true, canAttack: true }
        }
      );
      
      // After moving, non-dazed hero should still be able to attack
      expect(stateAfterMove.heroTurnActions.canAttack).toBe(true);
      expect(stateAfterMove.heroTurnActions.actionsTaken).toEqual(['move']);
    });

    it("should respect Dazed even with stunned (both statuses can coexist)", () => {
      const state = gameReducer(undefined, startGame({ heroIds: ["quinn"], selectedPowerCards: {} }));
      
      // Apply both dazed and stunned
      let stateWithStatuses = gameReducer(state, {
        type: 'game/applyHeroStatus',
        payload: {
          heroId: 'quinn',
          statusType: 'dazed',
          source: 'test-encounter'
        }
      });
      
      stateWithStatuses = gameReducer(stateWithStatuses, {
        type: 'game/applyHeroStatus',
        payload: {
          heroId: 'quinn',
          statusType: 'stunned',
          source: 'test-attack'
        }
      });
      
      // Start turn - stunned prevents all actions anyway
      const stateAfterTurnStart = gameReducer(stateWithStatuses, endVillainPhase());
      
      // Verify both statuses exist
      const quinnHp = stateAfterTurnStart.heroHp.find(h => h.heroId === 'quinn');
      expect(quinnHp?.statuses.some(s => s.type === 'stunned')).toBe(true);
      expect(quinnHp?.statuses.some(s => s.type === 'dazed')).toBe(true);
    });
  });
});
