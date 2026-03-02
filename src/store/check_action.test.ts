import { describe, it, expect } from "vitest";
import gameReducer, {
  endHeroPhase,
  endExplorationPhase,
  dismissMonsterCard,
  activateNextMonster,
  placeExplorationTile,
  addExplorationMonster,
  GameState,
} from "/home/runner/work/Ashardalon/Ashardalon/src/store/gameSlice";
import { createEventHookState } from "/home/runner/work/Ashardalon/Ashardalon/src/store/gameEvents";
import { ENCOUNTER_CANCEL_COST } from "/home/runner/work/Ashardalon/Ashardalon/src/store/types";

function createGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    currentScreen: "character-select",
    selectedScenarioId: 'default',
    heroTokens: [],
    turnState: { currentHeroIndex: 0, currentPhase: "hero-phase", turnNumber: 1, exploredThisTurn: false, drewOnlyWhiteTilesThisTurn: false },
    validMoveSquares: [],
    showingMovement: false,
    dungeon: { tiles: [], unexploredEdges: [], tileDeck: [] },
    monsterDeck: { drawPile: [], discardPile: [] },
    monsters: [],
    monsterGroups: [],
    monsterInstanceCounter: 0,
    monsterGroupCounter: 0,
    recentlySpawnedMonsterId: null,
    attackResult: null,
    attackTargetId: null,
    attackName: null,
    heroHp: [],
    monsterAttackResult: null,
    monsterAttackTargetId: null,
    monsterAttackerId: null,
    monsterAttackName: null,
    monsterAreaAttackResults: null,
    monsterAreaAttackTargetIds: null,
    villainPhaseMonsterIndex: 0,
    monsterMoveActionId: null,
    monsterExplorationEvent: null,
    heroTurnActions: { actionsTaken: [], canMove: true, canAttack: true },
    scenario: { scenarioId: 'default', monstersDefeated: 0, monstersToDefeat: 12, objective: "Defeat 12 monsters", title: "Into the Mountain", description: "", introductionShown: false, chamberRevealed: false, villainInstanceId: null, activePersistentModifiers: [] },
    partyResources: { xp: 0, healingSurges: 2 },
    defeatedMonsterXp: null,
    defeatedMonsterName: null,
    leveledUpHeroId: null,
    levelUpOldStats: null,
    healingSurgeUsedHeroId: null,
    healingSurgeHpRestored: null,
    defeatReason: null,
    victoryReason: null,
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
    treasureDeck: { drawPile: [], discardPile: [] },
    drawnTreasure: null,
    heroInventories: {},
    treasureDrawnThisTurn: false,
    incrementalMovement: null,
    undoSnapshot: null,
    encounterEffectMessage: null,
    logEntries: [],
    logEntryCounter: 0,
    eventHooks: createEventHookState(),
    pendingPowerCardFlips: [],
    encounterCancelCost: ENCOUNTER_CANCEL_COST,
    ...overrides,
  } as GameState;
}

describe("debug monster activation", () => {
  it("should reveal what action the Kobold takes", () => {
    const gameInProgress = createGameState({
      currentScreen: "game-board",
      heroTokens: [{ heroId: "quinn", position: { x: 3, y: 1 } }],
      turnState: { currentHeroIndex: 0, currentPhase: "hero-phase", turnNumber: 1, exploredThisTurn: false, drewOnlyWhiteTilesThisTurn: false },
      dungeon: {
        tiles: [{ id: "start-tile", tileType: "start", position: { col: 0, row: 0 }, rotation: 0, edges: { north: "unexplored", south: "unexplored", east: "unexplored", west: "wall" } }],
        unexploredEdges: [
          { tileId: "start-tile", direction: "north" },
          { tileId: "start-tile", direction: "south" },
          { tileId: "start-tile", direction: "east", subTileId: "start-tile-north" },
          { tileId: "start-tile", direction: "east", subTileId: "start-tile-south" },
        ],
        tileDeck: ["tile-white-2exit-c", "tile-black-2exit-a"],
      },
      monsterDeck: { drawPile: ["kobold", "snake"], discardPile: [] },
      heroHp: [{ heroId: "quinn", currentHp: 8, maxHp: 8 }],
      monsters: [],
      monsterInstanceCounter: 0,
    });

    const afterHeroPhase = gameReducer(gameInProgress, endHeroPhase());
    const afterTilePlaced = gameReducer(afterHeroPhase, placeExplorationTile());
    const afterMonsterAdded = gameReducer(afterTilePlaced, addExplorationMonster());
    const afterDismiss = gameReducer(afterMonsterAdded, dismissMonsterCard());
    const afterEndExploration = gameReducer(afterDismiss, endExplorationPhase());
    
    console.log("Monsters before activation:", JSON.stringify(afterEndExploration.monsters.map(m => ({id: m.instanceId, tileId: m.tileId, pos: m.position}))));
    console.log("Dungeon unexploredEdges:", JSON.stringify(afterEndExploration.dungeon.unexploredEdges));
    console.log("Dungeon tiles:", JSON.stringify(afterEndExploration.dungeon.tiles.map(t => ({id: t.id, edges: t.edges}))));
    
    const afterActivation = gameReducer(afterEndExploration, activateNextMonster({}));
    console.log("villainPhaseMonsterIndex:", afterActivation.villainPhaseMonsterIndex);
    console.log("monsterExplorationEvent:", JSON.stringify(afterActivation.monsterExplorationEvent));
    console.log("monsterMoveActionId:", afterActivation.monsterMoveActionId);
    console.log("monsterAttackResult:", JSON.stringify(afterActivation.monsterAttackResult));
    console.log("logEntries:", JSON.stringify(afterActivation.logEntries.slice(-3)));
    
    expect(true).toBe(true);
  });
});
