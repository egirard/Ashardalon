import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  GameScreen,
  HeroToken,
  Position,
  START_TILE_POSITIONS,
  TurnState,
  DungeonState,
  TileEdge,
  INITIAL_TILE_DECK,
  MonsterDeck,
  MonsterState,
  AttackResult,
  HeroHpState,
  AVAILABLE_HEROES,
  HeroTurnActions,
  HeroSubAction,
  ScenarioState,
  PartyResources,
  HERO_LEVELS,
  HeroLevel,
  EncounterDeck,
  EncounterCard,
  TrapState,
  HazardState,
  BoardTokenState,
  MONSTER_TACTICS,
} from "./types";
import { getValidMoveSquares, isValidMoveDestination, getTileBounds } from "./movement";
import {
  initializeDungeon,
  initializeTileDeck,
  checkExploration,
  placeTile,
  drawTile,
  updateDungeonAfterExploration,
  getTileDefinition,
} from "./exploration";
import {
  initializeMonsterDeck,
  drawMonster,
  createMonsterInstance,
  getMonsterSpawnPosition,
  discardMonster,
  getMonsterById,
} from "./monsters";
import {
  executeMonsterTurn,
  globalToLocalPosition,
  findTileForGlobalPosition,
} from "./monsterAI";
import {
  canLevelUp,
  levelUpHero,
  calculateDamage,
  checkHealingSurgeNeeded,
  useHealingSurge,
  checkPartyDefeat,
  calculateTotalAC,
} from "./combat";
import {
  initializeEncounterDeck,
  drawEncounter,
  discardEncounter,
  getEncounterById,
  shouldDrawEncounter,
  resolveEncounterEffect,
  canCancelEncounter,
  cancelEncounter,
  isEnvironmentCard,
  activateEnvironment,
  applyEndOfHeroPhaseEnvironmentEffects,
  shouldPlaceTrapMarker,
  shouldPlaceHazardMarker,
} from "./encounters";
import {
  createTrapInstance,
  createHazardInstance,
  tileHasTrap,
  tileHasHazard,
} from "./trapsHazards";
import { activateVillainPhaseTraps } from "./villainPhaseTraps";
import { checkBladeBarrierDamage } from "./powerCardEffects";
import {
  initializeTreasureDeck,
  drawTreasure,
  discardTreasure,
  getTreasureById,
  createHeroInventory,
  addTreasureToInventory,
  flipTreasureInInventory,
  removeTreasureFromInventory,
  type TreasureDeck,
  type TreasureCard,
  type HeroInventory,
} from "./treasure";

/**
 * Default turn state for the beginning of a game
 */
const DEFAULT_TURN_STATE: TurnState = {
  currentHeroIndex: 0,
  currentPhase: "hero-phase",
  turnNumber: 1,
  exploredThisTurn: false,
  drewOnlyWhiteTilesThisTurn: false,
};

/**
 * Default hero turn actions at the start of a hero phase
 */
const DEFAULT_HERO_TURN_ACTIONS: HeroTurnActions = {
  actionsTaken: [],
  canMove: true,
  canAttack: true,
};

/**
 * Default scenario state for MVP: Defeat 2 monsters
 */
const DEFAULT_SCENARIO_STATE: ScenarioState = {
  monstersDefeated: 0,
  monstersToDefeat: 2,
  objective: "Defeat 2 monsters",
};

/**
 * Default party resources at the start of a game
 */
const DEFAULT_PARTY_RESOURCES: PartyResources = {
  xp: 0,
  healingSurges: 2, // Starting healing surges for the party
};

/**
 * Default hero speed used as fallback when speed is not provided
 */
const DEFAULT_HERO_SPEED = 5;

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
  /** Dungeon state for tile management and exploration */
  dungeon: DungeonState;
  /** Monster deck for drawing monsters */
  monsterDeck: MonsterDeck;
  /** Active monsters on the board */
  monsters: MonsterState[];
  /** Counter for generating unique monster instance IDs */
  monsterInstanceCounter: number;
  /** ID of recently spawned monster (for displaying monster card) */
  recentlySpawnedMonsterId: string | null;
  /** Result of the most recent attack (for displaying combat result) */
  attackResult: AttackResult | null;
  /** Instance ID of the monster targeted in the attack */
  attackTargetId: string | null;
  /** Name of the attack/power card used (for displaying in combat result) */
  attackName: string | null;
  /** Hero HP state - tracks current HP for each hero */
  heroHp: HeroHpState[];
  /** Result of the most recent monster attack (for displaying villain combat result) */
  monsterAttackResult: AttackResult | null;
  /** ID of the hero targeted by monster attack */
  monsterAttackTargetId: string | null;
  /** ID of the monster that performed the attack */
  monsterAttackerId: string | null;
  /** Index of the monster currently being activated during villain phase */
  villainPhaseMonsterIndex: number;
  /** ID of the monster that just moved but could not attack (for displaying move feedback) */
  monsterMoveActionId: string | null;
  /** Hero turn actions tracking for enforcing valid turn structure */
  heroTurnActions: HeroTurnActions;
  /** Scenario state for MVP win/loss tracking */
  scenario: ScenarioState;
  /** Party resources (XP, healing surges) */
  partyResources: PartyResources;
  /** XP gained from most recently defeated monster (for UI notification, null if no recent defeat) */
  defeatedMonsterXp: number | null;
  /** Name of the most recently defeated monster (for UI notification) */
  defeatedMonsterName: string | null;
  /** Hero ID that just leveled up (for displaying level up notification) */
  leveledUpHeroId: string | null;
  /** Old stats before level up (for showing stat changes in UI) */
  levelUpOldStats: HeroHpState | null;
  /** Hero ID that just used a healing surge (for displaying healing surge notification) */
  healingSurgeUsedHeroId: string | null;
  /** HP restored from healing surge (for displaying in notification) */
  healingSurgeHpRestored: number | null;
  /** Reason for defeat (for displaying on defeat screen) */
  defeatReason: string | null;
  /** Encounter deck for drawing encounters when no exploration occurs */
  encounterDeck: EncounterDeck;
  /** Currently drawn encounter card (displayed during villain phase) */
  drawnEncounter: EncounterCard | null;
  /** Active environment state - tracks persistent environment effects */
  activeEnvironmentId: string | null;
  /** Active traps on the board */
  traps: TrapState[];
  /** Active hazards on the board */
  hazards: HazardState[];
  /** Counter for generating unique trap instance IDs */
  trapInstanceCounter: number;
  /** Counter for generating unique hazard instance IDs */
  hazardInstanceCounter: number;
  /** Board tokens placed by power cards (Blade Barrier, Flaming Sphere, etc.) */
  boardTokens: BoardTokenState[];
  /** Counter for generating unique board token instance IDs */
  boardTokenInstanceCounter: number;
  /** Whether to show the action surge prompt at start of turn (hero can voluntarily use a surge) */
  showActionSurgePrompt: boolean;
  /** Multi-attack state: tracks remaining attacks when using cards like Reaping Strike */
  multiAttackState: MultiAttackState | null;
  /** Movement-before-attack state: set when using cards like Charge that require movement first */
  pendingMoveAttack: PendingMoveAttackState | null;
  /** Treasure deck for drawing treasure on monster defeat */
  treasureDeck: TreasureDeck;
  /** Currently drawn treasure card awaiting assignment to a hero */
  drawnTreasure: TreasureCard | null;
  /** Hero inventories - items owned by each hero */
  heroInventories: Record<string, HeroInventory>;
  /** Whether treasure has been drawn this turn (only one treasure per turn) */
  treasureDrawnThisTurn: boolean;
  /** Incremental movement state: tracks remaining movement for step-by-step movement */
  incrementalMovement: IncrementalMovementState | null;
  /** Undo state: snapshot of reversible state before last action (for undo functionality) */
  undoSnapshot: UndoSnapshot | null;
}

/**
 * State for tracking multi-attack sequences (e.g., Reaping Strike, Tornado Strike)
 */
export interface MultiAttackState {
  /** Power card ID being used */
  cardId: number;
  /** Total number of attacks to make */
  totalAttacks: number;
  /** Number of attacks completed */
  attacksCompleted: number;
  /** Target instance IDs (for same-target attacks like Reaping Strike) */
  targetInstanceId: string | null;
  /** Whether all attacks must target the same monster */
  sameTarget: boolean;
  /** Maximum number of unique targets (for multi-target attacks) */
  maxTargets: number;
}

/**
 * State for tracking move-then-attack sequences (e.g., Charge)
 */
export interface PendingMoveAttackState {
  /** Power card ID being used */
  cardId: number;
  /** Whether movement has been completed */
  movementCompleted: boolean;
  /** The hero's starting position before the move */
  startPosition: Position;
}

/**
 * State for tracking incremental (step-by-step) movement.
 * Allows players to move one square at a time instead of using all movement at once.
 */
export interface IncrementalMovementState {
  /** Hero ID that is currently moving */
  heroId: string;
  /** Total movement speed for this move action */
  totalSpeed: number;
  /** Remaining movement squares available */
  remainingMovement: number;
  /** Starting position before this movement action began */
  startingPosition: Position;
  /** Whether movement is currently in progress (can be cancelled before another action) */
  inProgress: boolean;
}

/**
 * Snapshot of reversible game state for undo functionality.
 * Only stores state that can be undone (positions, turn actions).
 * Irreversible actions (die rolls, tile reveals) clear the undo snapshot.
 */
export interface UndoSnapshot {
  /** Hero token positions before the action */
  heroTokens: HeroToken[];
  /** Hero turn actions state before the action */
  heroTurnActions: HeroTurnActions;
  /** Incremental movement state before the action (if any) */
  incrementalMovement: IncrementalMovementState | null;
  /** Type of action that was taken (for display/logging) */
  actionType: 'move' | 'start-move';
}

/**
 * Helper function to create a deep clone of state for undo snapshots
 * This ensures the snapshot is independent of the current state
 */
function createUndoSnapshot(
  heroTokens: HeroToken[],
  heroTurnActions: HeroTurnActions,
  incrementalMovement: IncrementalMovementState | null,
  actionType: 'move' | 'start-move'
): UndoSnapshot {
  return {
    heroTokens: heroTokens.map(t => ({ ...t, position: { ...t.position } })),
    heroTurnActions: { 
      ...heroTurnActions, 
      actionsTaken: [...heroTurnActions.actionsTaken] 
    },
    incrementalMovement: incrementalMovement 
      ? { 
          ...incrementalMovement, 
          startingPosition: { ...incrementalMovement.startingPosition } 
        } 
      : null,
    actionType,
  };
}

const initialState: GameState = {
  currentScreen: "character-select",
  heroTokens: [],
  turnState: { ...DEFAULT_TURN_STATE },
  validMoveSquares: [],
  showingMovement: false,
  dungeon: initializeDungeon(),
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
  heroTurnActions: { ...DEFAULT_HERO_TURN_ACTIONS },
  scenario: { ...DEFAULT_SCENARIO_STATE },
  partyResources: { ...DEFAULT_PARTY_RESOURCES },
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
  treasureDeck: { drawPile: [], discardPile: [] },
  drawnTreasure: null,
  heroInventories: {},
  treasureDrawnThisTurn: false,
  incrementalMovement: null,
  undoSnapshot: null,
};

/**
 * Calculate the updated hero turn actions state after taking an action.
 * 
 * Valid action sequences:
 * - Move only (can still move or attack after)
 * - Move, then attack (turn ends)
 * - Attack, then move (turn ends)
 * - Move, move (turn ends)
 * 
 * Key rules:
 * - No double attacks allowed
 * - After any attack, only move is allowed (turn ends after that move)
 * - After two moves, turn ends
 */
function computeHeroTurnActions(
  currentActions: HeroTurnActions,
  newAction: HeroSubAction
): HeroTurnActions {
  const newActionsTaken = [...currentActions.actionsTaken, newAction];
  
  // Count actions
  const moveCount = newActionsTaken.filter(a => a === 'move').length;
  const attackCount = newActionsTaken.filter(a => a === 'attack').length;
  
  // No double attacks ever
  const canAttack = attackCount === 0;
  
  // Can move if: no moves yet, or only 1 move AND no attack yet
  // After attack+move or move+attack or move+move, turn should end
  const canMove = moveCount < 2 && !(moveCount === 1 && attackCount === 1);
  
  return {
    actionsTaken: newActionsTaken,
    canMove,
    canAttack,
  };
}

/**
 * Check if the hero turn should automatically end based on actions taken.
 * Turn ends when:
 * - Move + Attack (in any order)
 * - Move + Move (double move)
 */
export function shouldAutoEndHeroTurn(heroTurnActions: HeroTurnActions): boolean {
  const { actionsTaken } = heroTurnActions;
  const moveCount = actionsTaken.filter(a => a === 'move').length;
  const attackCount = actionsTaken.filter(a => a === 'attack').length;
  
  // Turn ends after any of these combinations:
  // - Attack + Move (attack then move)
  // - Move + Attack (move then attack)
  // - Move + Move (double move)
  return (
    (moveCount >= 1 && attackCount >= 1) || // move+attack or attack+move
    (moveCount >= 2) // double move
  );
}

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
      const randomFn = createSeededRandom(gameSeed);
      if (positions) {
        assignedPositions = positions;
      } else {
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

      // Initialize dungeon with start tile and shuffled tile deck
      const dungeon = initializeDungeon();
      dungeon.tileDeck = initializeTileDeck([...INITIAL_TILE_DECK], randomFn);
      state.dungeon = dungeon;

      // Initialize monster deck
      state.monsterDeck = initializeMonsterDeck(randomFn);
      state.monsters = [];
      state.monsterInstanceCounter = 0;
      state.recentlySpawnedMonsterId = null;
      state.attackResult = null;
      state.attackTargetId = null;
      state.attackName = null;

      // Initialize hero HP from hero definitions with level 1 stats
      state.heroHp = heroIds.map(heroId => {
        const heroLevels = HERO_LEVELS[heroId];
        if (!heroLevels) {
          console.warn(`Hero levels not found for ${heroId}, using defaults`);
        }
        const level1Stats = heroLevels?.level1;
        const hero = AVAILABLE_HEROES.find(h => h.id === heroId);
        
        // Use level 1 stats from HERO_LEVELS, fallback to hero definition, then defaults
        const hp = level1Stats?.hp ?? hero?.hp ?? 8;
        const ac = level1Stats?.ac ?? hero?.ac ?? 17;
        const surgeValue = level1Stats?.surgeValue ?? 4;
        const attackBonus = level1Stats?.attackBonus ?? hero?.attack?.attackBonus ?? 6;
        
        return {
          heroId,
          currentHp: hp,
          maxHp: hp,
          level: 1 as HeroLevel,
          ac,
          surgeValue,
          attackBonus,
          statuses: [], // Initialize with no status effects
        };
      });

      // Clear villain phase state
      state.monsterAttackResult = null;
      state.monsterAttackTargetId = null;
      state.monsterAttackerId = null;
      state.villainPhaseMonsterIndex = 0;

      // Initialize hero turn actions for the first hero
      state.heroTurnActions = { ...DEFAULT_HERO_TURN_ACTIONS };

      // Initialize scenario state (MVP: defeat 2 monsters)
      state.scenario = { ...DEFAULT_SCENARIO_STATE };

      // Initialize party resources (XP starts at 0)
      state.partyResources = { ...DEFAULT_PARTY_RESOURCES };
      state.defeatedMonsterXp = null;
      state.defeatedMonsterName = null;
      state.leveledUpHeroId = null;
      state.levelUpOldStats = null;

      // Initialize encounter deck
      state.encounterDeck = initializeEncounterDeck(randomFn);
      state.drawnEncounter = null;

      // Initialize treasure deck and hero inventories
      state.treasureDeck = initializeTreasureDeck(randomFn);
      state.drawnTreasure = null;
      state.heroInventories = {};
      for (const heroId of heroIds) {
        state.heroInventories[heroId] = createHeroInventory(heroId);
      }
      state.treasureDrawnThisTurn = false;

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
     * Supports incremental movement: if movement is in progress, uses remaining movement
     */
    showMovement: (
      state,
      action: PayloadAction<{ heroId: string; speed: number }>,
    ) => {
      // Only show movement options during hero phase when hero can move
      if (state.turnState.currentPhase !== "hero-phase" || !state.heroTurnActions.canMove) {
        return;
      }
      
      const { heroId, speed } = action.payload;
      const token = state.heroTokens.find((t) => t.heroId === heroId);
      
      if (token) {
        // Use remaining movement if incremental movement is in progress, otherwise use full speed
        const effectiveSpeed = state.incrementalMovement?.inProgress 
          ? state.incrementalMovement.remainingMovement 
          : speed;
        
        state.validMoveSquares = getValidMoveSquares(
          token.position,
          effectiveSpeed,
          state.heroTokens,
          heroId,
          state.dungeon,
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
     * Supports incremental movement: tracks remaining movement and allows step-by-step moves
     */
    moveHero: (
      state,
      action: PayloadAction<{ heroId: string; position: Position; speed?: number }>,
    ) => {
      const { heroId, position, speed } = action.payload;
      
      // Only allow move during hero phase and if hero can move
      if (state.turnState.currentPhase !== "hero-phase" || !state.heroTurnActions.canMove) {
        return;
      }
      
      // Verify this is a valid move destination
      if (!isValidMoveDestination(position, state.validMoveSquares)) {
        return;
      }
      
      const token = state.heroTokens.find((t) => t.heroId === heroId);
      if (!token) return;
      
      // Calculate distance moved (for incremental movement tracking)
      const distance = Math.max(
        Math.abs(position.x - token.position.x),
        Math.abs(position.y - token.position.y)
      );
      
      // Create undo snapshot before the move (for reversible action)
      state.undoSnapshot = createUndoSnapshot(
        state.heroTokens,
        state.heroTurnActions,
        state.incrementalMovement,
        state.incrementalMovement?.inProgress ? 'move' : 'start-move'
      );
      
      // Initialize or update incremental movement state
      if (!state.incrementalMovement?.inProgress) {
        // Starting a new movement action
        const heroSpeed = speed ?? DEFAULT_HERO_SPEED;
        state.incrementalMovement = {
          heroId,
          totalSpeed: heroSpeed,
          remainingMovement: heroSpeed - distance,
          startingPosition: { ...token.position },
          inProgress: true,
        };
      } else {
        // Continuing incremental movement
        state.incrementalMovement.remainingMovement -= distance;
      }
      
      // Move the hero
      token.position = position;
      
      // Check if all movement is used or if this completes the move action
      if (state.incrementalMovement.remainingMovement <= 0) {
        // Movement complete - mark move action as taken
        state.incrementalMovement.inProgress = false;
        state.heroTurnActions = computeHeroTurnActions(state.heroTurnActions, 'move');
        // Clear movement overlay
        state.validMoveSquares = [];
        state.showingMovement = false;
      } else {
        // Still have remaining movement - recalculate valid squares
        state.validMoveSquares = getValidMoveSquares(
          position,
          state.incrementalMovement.remainingMovement,
          state.heroTokens,
          heroId,
          state.dungeon,
        );
      }
    },
    /**
     * Complete the current move action (end movement early, discarding remaining movement)
     * Called when player wants to stop moving before using all their movement
     */
    completeMove: (state) => {
      if (state.turnState.currentPhase !== "hero-phase") return;
      if (!state.incrementalMovement?.inProgress) return;
      
      // Mark movement as complete and discard remaining movement
      state.incrementalMovement.inProgress = false;
      state.incrementalMovement.remainingMovement = 0;
      
      // Track the move action
      state.heroTurnActions = computeHeroTurnActions(state.heroTurnActions, 'move');
      
      // Clear movement overlay
      state.validMoveSquares = [];
      state.showingMovement = false;
      
      // Clear undo snapshot (completing the move is a commitment)
      state.undoSnapshot = null;
    },
    /**
     * Undo the last reversible action (movement only, not attacks or die rolls)
     * Restores hero position and movement state to before the last move
     */
    undoAction: (state) => {
      if (state.turnState.currentPhase !== "hero-phase") return;
      if (!state.undoSnapshot) return;
      
      // Restore hero positions
      state.heroTokens = state.undoSnapshot.heroTokens;
      
      // Restore turn actions state
      state.heroTurnActions = state.undoSnapshot.heroTurnActions;
      
      // Restore incremental movement state
      state.incrementalMovement = state.undoSnapshot.incrementalMovement;
      
      // Clear the undo snapshot (can only undo once)
      state.undoSnapshot = null;
      
      // Recalculate valid movement squares if movement is in progress or can still move
      if (state.incrementalMovement?.inProgress || state.heroTurnActions.canMove) {
        const currentHeroId = state.heroTokens[state.turnState.currentHeroIndex]?.heroId;
        const currentToken = state.heroTokens.find(t => t.heroId === currentHeroId);
        if (currentToken) {
          const speed = state.incrementalMovement?.remainingMovement ?? state.incrementalMovement?.totalSpeed ?? DEFAULT_HERO_SPEED;
          state.validMoveSquares = getValidMoveSquares(
            currentToken.position,
            speed,
            state.heroTokens,
            currentHeroId,
            state.dungeon,
          );
          state.showingMovement = true;
        }
      }
    },
    resetGame: (state) => {
      state.currentScreen = "character-select";
      state.heroTokens = [];
      state.turnState = { ...DEFAULT_TURN_STATE };
      state.randomSeed = undefined;
      state.validMoveSquares = [];
      state.showingMovement = false;
      state.dungeon = initializeDungeon();
      state.monsterDeck = { drawPile: [], discardPile: [] };
      state.monsters = [];
      state.monsterInstanceCounter = 0;
      state.recentlySpawnedMonsterId = null;
      state.attackResult = null;
      state.attackTargetId = null;
      state.attackName = null;
      state.heroHp = [];
      state.monsterAttackResult = null;
      state.monsterAttackTargetId = null;
      state.monsterAttackerId = null;
      state.villainPhaseMonsterIndex = 0;
      state.monsterMoveActionId = null;
      state.heroTurnActions = { ...DEFAULT_HERO_TURN_ACTIONS };
      state.scenario = { ...DEFAULT_SCENARIO_STATE };
      state.partyResources = { ...DEFAULT_PARTY_RESOURCES };
      state.defeatedMonsterXp = null;
      state.defeatedMonsterName = null;
      state.leveledUpHeroId = null;
      state.levelUpOldStats = null;
      state.healingSurgeUsedHeroId = null;
      state.healingSurgeHpRestored = null;
      state.defeatReason = null;
      state.encounterDeck = { drawPile: [], discardPile: [] };
      state.drawnEncounter = null;
      state.showActionSurgePrompt = false;
      state.multiAttackState = null;
      state.pendingMoveAttack = null;
      state.treasureDeck = { drawPile: [], discardPile: [] };
      state.drawnTreasure = null;
      state.heroInventories = {};
      state.treasureDrawnThisTurn = false;
      state.incrementalMovement = null;
      state.undoSnapshot = null;
    },
    /**
     * End the hero phase and trigger exploration if hero is on an unexplored edge
     * 
     * IMPORTANT: Exploration involves tile reveals which are irreversible.
     * When ending hero phase:
     * - Any in-progress incremental movement is finalized
     * - The undo snapshot is cleared (cannot undo after phase ends)
     */
    endHeroPhase: (state) => {
      if (state.turnState.currentPhase !== "hero-phase") {
        return;
      }
      
      // Clear movement overlay when exiting hero phase
      state.validMoveSquares = [];
      state.showingMovement = false;
      
      // Clear undo snapshot - ending phase commits all actions
      state.undoSnapshot = null;
      
      // Finalize any in-progress incremental movement
      if (state.incrementalMovement?.inProgress) {
        state.incrementalMovement.inProgress = false;
        state.incrementalMovement.remainingMovement = 0;
        // Track the move action since we're committing to it
        state.heroTurnActions = computeHeroTurnActions(state.heroTurnActions, 'move');
      }
      
      // Clear any previously spawned monster display
      state.recentlySpawnedMonsterId = null;
      
      // Reset exploration tracking for this turn
      state.turnState.exploredThisTurn = false;
      state.turnState.drewOnlyWhiteTilesThisTurn = false;
      
      // Get current hero
      const currentToken = state.heroTokens[state.turnState.currentHeroIndex];
      if (!currentToken) {
        return;
      }
      
      // Check if hero is on an unexplored edge
      const exploredEdge = checkExploration(currentToken, state.dungeon);
      
      if (exploredEdge && state.dungeon.tileDeck.length > 0) {
        // Draw a tile from the deck
        const { drawnTile, remainingDeck } = drawTile(state.dungeon.tileDeck);
        
        if (drawnTile) {
          // Place the new tile
          const newTile = placeTile(exploredEdge, drawnTile, state.dungeon);
          
          if (newTile) {
            // Check if this is a black or white tile BEFORE updating exploration state
            const tileDef = getTileDefinition(drawnTile);
            const isBlackTile = tileDef?.isBlackTile ?? true; // Default to black if definition not found
            
            // Track whether only white tiles have been drawn this turn
            // Logic: If any black tile is drawn, drewOnlyWhiteTilesThisTurn = false
            //        If only white tiles have been drawn, drewOnlyWhiteTilesThisTurn = true
            if (isBlackTile) {
              // Black tile drawn - encounters will trigger
              state.turnState.drewOnlyWhiteTilesThisTurn = false;
            } else {
              // White tile drawn - prevents encounter only if no black tiles drawn yet
              // If this is the first tile (exploredThisTurn was false), set to true
              // If we already drew a white tile (drewOnlyWhiteTilesThisTurn is true), keep it true
              // If we drew a black tile before (drewOnlyWhiteTilesThisTurn is false and exploredThisTurn is true), keep it false
              if (!state.turnState.exploredThisTurn) {
                // First tile this turn is white
                state.turnState.drewOnlyWhiteTilesThisTurn = true;
              }
              // else: keep current value (don't override if black was already drawn)
            }
            
            // Mark that exploration occurred this turn
            state.turnState.exploredThisTurn = true;
            
            // Update dungeon state
            state.dungeon = updateDungeonAfterExploration(
              state.dungeon,
              exploredEdge,
              newTile
            );
            state.dungeon.tileDeck = remainingDeck;
            
            // Both black and white tiles spawn monsters
            const { monster: drawnMonsterId, deck: updatedMonsterDeck } = drawMonster(state.monsterDeck);
            
            if (drawnMonsterId) {
              // Get spawn position (black square, or adjacent if occupied)
              const monsterPosition = getMonsterSpawnPosition(newTile, state.monsters);
              
              if (monsterPosition) {
                const monsterInstance = createMonsterInstance(
                  drawnMonsterId,
                  monsterPosition,
                  currentToken.heroId, // Monster is controlled by the exploring hero
                  newTile.id,
                  state.monsterInstanceCounter
                );
                
                if (monsterInstance) {
                  state.monsters.push(monsterInstance);
                  state.monsterInstanceCounter += 1;
                  state.recentlySpawnedMonsterId = monsterInstance.instanceId;
                  
                  // Check for Blade Barrier tokens at spawn position
                  const bladeBarrierCheck = checkBladeBarrierDamage(
                    monsterInstance.position,
                    state.boardTokens || []
                  );
                  
                  if (bladeBarrierCheck.shouldDamage && bladeBarrierCheck.tokenToRemove) {
                    // Deal 1 damage to the monster
                    const monster = state.monsters.find(m => m.instanceId === monsterInstance.instanceId);
                    if (monster) {
                      monster.currentHp = Math.max(0, monster.currentHp - 1);
                    }
                    
                    // Remove the blade barrier token
                    state.boardTokens = state.boardTokens.filter(
                      token => token.id !== bladeBarrierCheck.tokenToRemove
                    );
                  }
                }
              }
              // Note: If no valid spawn position, monster card is still drawn but not placed
              // This could happen if all positions on the tile are occupied (rare edge case)
              
              state.monsterDeck = updatedMonsterDeck;
            }
          }
        }
      }
      
      // Apply environment effects that trigger at end of Hero Phase
      if (state.activeEnvironmentId) {
        const activeHeroId = state.heroTokens[state.turnState.currentHeroIndex]?.heroId;
        const activeHeroPos = state.heroTokens[state.turnState.currentHeroIndex]?.position;
        
        if (activeHeroId && activeHeroPos) {
          const allHeroPositions = state.heroTokens.map(t => ({
            heroId: t.heroId,
            position: t.position
          }));
          
          state.heroHp = applyEndOfHeroPhaseEnvironmentEffects(
            state.activeEnvironmentId,
            state.heroHp,
            activeHeroId,
            activeHeroPos,
            allHeroPositions,
            state.dungeon
          );
          
          // Check for party defeat after environment effect
          const allHeroesDefeated = state.heroHp.every(h => h.currentHp <= 0);
          if (allHeroesDefeated) {
            state.defeatReason = `The party was overwhelmed by environment effects.`;
            state.currentScreen = "defeat";
            return;
          }
        }
      }
      
      // Transition to exploration phase
      state.turnState.currentPhase = "exploration-phase";
    },
    /**
     * End the exploration phase and move to villain phase
     */
    endExplorationPhase: (state) => {
      if (state.turnState.currentPhase !== "exploration-phase") {
        return;
      }
      state.turnState.currentPhase = "villain-phase";
      // Reset villain phase monster index to start activating from the first monster
      state.villainPhaseMonsterIndex = 0;
      // Clear any previous monster action results
      state.monsterAttackResult = null;
      state.monsterAttackTargetId = null;
      state.monsterAttackerId = null;
      state.monsterMoveActionId = null;
      
      // Draw encounter if no exploration occurred this turn
      if (shouldDrawEncounter(state.turnState)) {
        const { encounterId, deck: updatedDeck } = drawEncounter(state.encounterDeck);
        state.encounterDeck = updatedDeck;
        
        if (encounterId) {
          const encounter = getEncounterById(encounterId);
          if (encounter) {
            state.drawnEncounter = encounter;
          }
        }
      }
    },
    /**
     * End the villain phase and move to the next hero's turn
     */
    endVillainPhase: (state) => {
      if (state.turnState.currentPhase !== "villain-phase") {
        return;
      }
      
      // Clear villain phase state
      state.villainPhaseMonsterIndex = 0;
      state.monsterAttackResult = null;
      state.monsterAttackTargetId = null;
      state.monsterAttackerId = null;
      state.monsterMoveActionId = null;
      
      // Clear encounter state
      state.drawnEncounter = null;
      
      // Clear any previous healing surge notification
      state.healingSurgeUsedHeroId = null;
      state.healingSurgeHpRestored = null;
      
      // Clear action surge prompt
      state.showActionSurgePrompt = false;
      
      // Move to next hero
      state.turnState.currentHeroIndex = 
        (state.turnState.currentHeroIndex + 1) % state.heroTokens.length;
      
      // If we've cycled back to the first hero, increment turn number
      if (state.turnState.currentHeroIndex === 0) {
        state.turnState.turnNumber += 1;
      }
      
      // Start new hero phase with fresh turn actions
      state.turnState.currentPhase = "hero-phase";
      state.heroTurnActions = { ...DEFAULT_HERO_TURN_ACTIONS };
      
      // Reset treasure drawn flag for the new turn
      state.treasureDrawnThisTurn = false;
      
      // Clear incremental movement and undo state for new turn
      state.incrementalMovement = null;
      state.undoSnapshot = null;
      
      // Process status effects at the start of the new hero's turn
      const currentHeroId = state.heroTokens[state.turnState.currentHeroIndex]?.heroId;
      if (currentHeroId) {
        const heroHpIndex = state.heroHp.findIndex(h => h.heroId === currentHeroId);
        if (heroHpIndex !== -1) {
          const heroHp = state.heroHp[heroHpIndex];
          const { processStatusEffectsStartOfTurn } = require('./statusEffects');
          const { updatedStatuses, ongoingDamage } = processStatusEffectsStartOfTurn(
            heroHp.statuses ?? [],
            state.turnState.turnNumber
          );
          
          // Apply ongoing damage and update statuses
          state.heroHp[heroHpIndex] = {
            ...heroHp,
            currentHp: Math.max(0, heroHp.currentHp - ongoingDamage),
            statuses: updatedStatuses,
          };
        }
      }
      
      // Check if the new hero needs a healing surge (at 0 HP at turn start)
      if (currentHeroId) {
        const heroHpIndex = state.heroHp.findIndex(h => h.heroId === currentHeroId);
        if (heroHpIndex !== -1) {
          const heroHpState = state.heroHp[heroHpIndex];
          
          // Check for party defeat first (hero at 0 HP with no surges)
          if (checkPartyDefeat(heroHpState, state.partyResources)) {
            const hero = AVAILABLE_HEROES.find(h => h.id === currentHeroId);
            if (!hero) {
              console.warn(`Hero not found in AVAILABLE_HEROES for ID: ${currentHeroId}`);
            }
            const heroName = hero?.name ?? 'A hero';
            state.defeatReason = `${heroName} fell with no healing surges remaining.`;
            state.currentScreen = "defeat";
            return;
          }
          
          // Show action surge prompt if hero is at 0 HP with surges available
          // This allows the player to choose to use a healing surge
          if (checkHealingSurgeNeeded(heroHpState, state.partyResources)) {
            state.showActionSurgePrompt = true;
          }
        }
      }
    },
    /**
     * Dismiss the monster card display
     */
    dismissMonsterCard: (state) => {
      state.recentlySpawnedMonsterId = null;
    },
    /**
     * Dismiss the encounter card display and apply its effect
     */
    dismissEncounterCard: (state) => {
      if (state.drawnEncounter) {
        const activeHeroToken = state.heroTokens[state.turnState.currentHeroIndex];
        const activeHeroPosition = activeHeroToken?.position;
        
        // Check if this is an environment card
        if (isEnvironmentCard(state.drawnEncounter)) {
          // Activate the environment (replaces any existing environment)
          state.activeEnvironmentId = activateEnvironment(
            state.drawnEncounter.id,
            state.activeEnvironmentId
          );
          // Environment cards are not discarded - they remain active
          // The old environment (if any) is implicitly replaced
        } else if (shouldPlaceTrapMarker(state.drawnEncounter)) {
          // Place trap marker on active hero's tile (if no trap already there)
          if (activeHeroPosition && !tileHasTrap(activeHeroPosition, state.traps)) {
            const trap = createTrapInstance(
              state.drawnEncounter.id,
              state.drawnEncounter,
              activeHeroPosition,
              state.trapInstanceCounter
            );
            state.traps.push(trap);
            state.trapInstanceCounter++;
          }
          
          // Discard the trap encounter card
          state.encounterDeck = discardEncounter(state.encounterDeck, state.drawnEncounter.id);
        } else if (shouldPlaceHazardMarker(state.drawnEncounter)) {
          // Place hazard marker on active hero's tile (if no hazard already there)
          if (activeHeroPosition && !tileHasHazard(activeHeroPosition, state.hazards)) {
            const hazard = createHazardInstance(
              state.drawnEncounter.id,
              activeHeroPosition,
              state.hazardInstanceCounter
            );
            state.hazards.push(hazard);
            state.hazardInstanceCounter++;
          }
          
          // Get the current hero ID for active-hero effects
          const activeHeroId = activeHeroToken?.heroId;
          
          if (activeHeroId) {
            // Apply immediate hazard effects (Cave In, Pit)
            state.heroHp = resolveEncounterEffect(
              state.drawnEncounter,
              state.heroHp,
              activeHeroId
            );
            
            // Check for party defeat (all heroes at 0 HP)
            const allHeroesDefeated = state.heroHp.every(h => h.currentHp <= 0);
            if (allHeroesDefeated) {
              state.defeatReason = `The party was overwhelmed by ${state.drawnEncounter.name}.`;
              state.currentScreen = "defeat";
            }
          }
          
          // Discard the hazard encounter card
          state.encounterDeck = discardEncounter(state.encounterDeck, state.drawnEncounter.id);
        } else {
          // Get the current hero ID for active-hero effects
          const activeHeroId = activeHeroToken?.heroId;
          
          if (activeHeroId) {
            // Apply the encounter effect
            state.heroHp = resolveEncounterEffect(
              state.drawnEncounter,
              state.heroHp,
              activeHeroId
            );
            
            // Check for party defeat (all heroes at 0 HP)
            const allHeroesDefeated = state.heroHp.every(h => h.currentHp <= 0);
            if (allHeroesDefeated) {
              state.defeatReason = `The party was overwhelmed by ${state.drawnEncounter.name}.`;
              state.currentScreen = "defeat";
            }
          }
          
          // Discard non-environment encounters
          state.encounterDeck = discardEncounter(state.encounterDeck, state.drawnEncounter.id);
        }
        
        state.drawnEncounter = null;
      }
    },
    /**
     * Cancel the encounter card by spending 5 XP (skips encounter effect)
     */
    cancelEncounterCard: (state) => {
      if (state.drawnEncounter && canCancelEncounter(state.partyResources)) {
        // Cancel encounter - deducts XP and discards the card without applying effect
        const result = cancelEncounter(
          state.drawnEncounter,
          state.partyResources,
          state.encounterDeck
        );
        
        state.partyResources = result.resources;
        state.encounterDeck = result.encounterDeck;
        state.drawnEncounter = null;
      }
    },
    /**
     * Set the attack result and apply damage to the target monster
     * Also handles level up on natural 20 with 5+ XP
     * 
     * IMPORTANT: Attacks are irreversible actions (involve die rolls).
     * When an attack is performed:
     * - Any in-progress incremental movement is finalized (remaining movement discarded)
     * - The undo snapshot is cleared (cannot undo after die roll)
     */
    setAttackResult: (
      state,
      action: PayloadAction<{ result: AttackResult; targetInstanceId: string; attackName: string }>
    ) => {
      // Only allow attack during hero phase and if hero can attack
      if (state.turnState.currentPhase !== "hero-phase" || !state.heroTurnActions.canAttack) {
        return;
      }
      
      const { result, targetInstanceId, attackName } = action.payload;
      state.attackTargetId = targetInstanceId;
      state.attackName = attackName;
      
      // Clear undo snapshot - attacks involve die rolls and are irreversible
      state.undoSnapshot = null;
      
      // Finalize any in-progress incremental movement (discard remaining movement)
      if (state.incrementalMovement?.inProgress) {
        state.incrementalMovement.inProgress = false;
        state.incrementalMovement.remainingMovement = 0;
        // Track the move action since we're committing to it before attacking
        state.heroTurnActions = computeHeroTurnActions(state.heroTurnActions, 'move');
      }
      
      // Clear any previous notifications
      state.defeatedMonsterXp = null;
      state.defeatedMonsterName = null;
      state.leveledUpHeroId = null;
      state.levelUpOldStats = null;
      
      // Get current hero for level up check and critical damage calculation
      const currentHeroId = state.heroTokens[state.turnState.currentHeroIndex]?.heroId;
      const currentHeroHp = state.heroHp.find(h => h.heroId === currentHeroId);
      
      // Calculate actual damage with level 2 critical bonus (always calculate for consistency)
      const actualDamage = (result.isHit && currentHeroHp) 
        ? calculateDamage(currentHeroHp.level, result.roll, result.damage)
        : result.damage;
      
      // Always store the result with calculated damage for display consistency
      state.attackResult = { ...result, damage: actualDamage };
      
      // Apply damage if hit
      if (result.isHit && actualDamage > 0) {
        const monster = state.monsters.find(m => m.instanceId === targetInstanceId);
        if (monster) {
          monster.currentHp -= actualDamage;
          
          // Remove defeated monsters and award XP
          if (monster.currentHp <= 0) {
            // Get monster definition to award XP
            const monsterDef = getMonsterById(monster.monsterId);
            if (!monsterDef) {
              // Log warning for debugging - monster ID should always exist in definitions
              console.warn(`Monster definition not found for ID: ${monster.monsterId}`);
            }
            const xpGained = monsterDef?.xp ?? 0;
            
            // Award XP to party
            state.partyResources.xp += xpGained;
            
            // Set notification data for UI
            state.defeatedMonsterXp = xpGained;
            state.defeatedMonsterName = monsterDef?.name ?? monster.monsterId;
            
            // Remove defeated monster from board
            state.monsters = state.monsters.filter(m => m.instanceId !== targetInstanceId);
            
            // Discard the monster card
            state.monsterDeck = discardMonster(state.monsterDeck, monster.monsterId);
            
            // Track monster defeated for scenario
            state.scenario.monstersDefeated += 1;
            
            // Draw treasure on monster defeat (only once per turn)
            if (!state.treasureDrawnThisTurn) {
              const { treasure: treasureId, deck: updatedTreasureDeck } = drawTreasure(state.treasureDeck);
              state.treasureDeck = updatedTreasureDeck;
              
              if (treasureId !== null) {
                const treasureCard = getTreasureById(treasureId);
                if (treasureCard) {
                  state.drawnTreasure = treasureCard;
                  state.treasureDrawnThisTurn = true;
                }
              }
            }
            
            // Check for victory condition (MVP: defeat 2 monsters)
            if (state.scenario.monstersDefeated >= state.scenario.monstersToDefeat) {
              state.currentScreen = "victory";
            }
          }
        }
      }
      
      // Check for level up on natural 20 with 5+ XP (check AFTER XP is awarded from defeating monster)
      if (currentHeroHp && currentHeroId && canLevelUp(currentHeroHp, result.roll, state.partyResources)) {
        // Store old stats for UI display
        state.levelUpOldStats = { ...currentHeroHp };
        
        // Level up the hero
        const levelUpResult = levelUpHero(currentHeroHp, state.partyResources);
        
        // Update hero state
        const heroHpIndex = state.heroHp.findIndex(h => h.heroId === currentHeroId);
        if (heroHpIndex !== -1) {
          state.heroHp[heroHpIndex] = levelUpResult.heroState;
        }
        
        // Update party resources (deduct XP)
        state.partyResources = levelUpResult.resources;
        
        // Set level up notification
        state.leveledUpHeroId = currentHeroId;
      }
      
      // Track the attack action
      state.heroTurnActions = computeHeroTurnActions(state.heroTurnActions, 'attack');
    },
    /**
     * Dismiss the attack result display
     */
    dismissAttackResult: (state) => {
      state.attackResult = null;
      state.attackTargetId = null;
      state.attackName = null;
    },
    /**
     * Dismiss the monster defeat/XP notification
     */
    dismissDefeatNotification: (state) => {
      state.defeatedMonsterXp = null;
      state.defeatedMonsterName = null;
    },
    /**
     * Dismiss the level up notification
     */
    dismissLevelUpNotification: (state) => {
      state.leveledUpHeroId = null;
      state.levelUpOldStats = null;
    },
    /**
     * Start a multi-attack sequence (for cards like Reaping Strike that attack multiple times)
     */
    startMultiAttack: (
      state,
      action: PayloadAction<{
        cardId: number;
        totalAttacks: number;
        sameTarget: boolean;
        maxTargets: number;
        targetInstanceId?: string;
      }>
    ) => {
      if (state.turnState.currentPhase !== "hero-phase" || !state.heroTurnActions.canAttack) {
        return;
      }

      const { cardId, totalAttacks, sameTarget, maxTargets, targetInstanceId } = action.payload;
      
      state.multiAttackState = {
        cardId,
        totalAttacks,
        attacksCompleted: 0,
        targetInstanceId: targetInstanceId || null,
        sameTarget,
        maxTargets,
      };
    },
    /**
     * Record a multi-attack hit and check if sequence is complete
     */
    recordMultiAttackHit: (state) => {
      if (!state.multiAttackState) return;
      
      state.multiAttackState.attacksCompleted += 1;
      
      // Check if multi-attack sequence is complete
      if (state.multiAttackState.attacksCompleted >= state.multiAttackState.totalAttacks) {
        // Clear multi-attack state when done
        state.multiAttackState = null;
        // Track the attack action (only once per multi-attack sequence)
        state.heroTurnActions = computeHeroTurnActions(state.heroTurnActions, 'attack');
      }
    },
    /**
     * Cancel/clear the multi-attack state (e.g., when target dies mid-sequence)
     */
    clearMultiAttack: (state) => {
      if (state.multiAttackState) {
        // If at least one attack was made, count the action
        if (state.multiAttackState.attacksCompleted > 0) {
          state.heroTurnActions = computeHeroTurnActions(state.heroTurnActions, 'attack');
        }
        state.multiAttackState = null;
      }
    },
    /**
     * Start a move-then-attack sequence (for cards like Charge)
     */
    startMoveAttack: (
      state,
      action: PayloadAction<{ cardId: number }>
    ) => {
      if (state.turnState.currentPhase !== "hero-phase" || !state.heroTurnActions.canAttack) {
        return;
      }

      const currentHeroId = state.heroTokens[state.turnState.currentHeroIndex]?.heroId;
      const currentToken = state.heroTokens.find(t => t.heroId === currentHeroId);
      if (!currentToken) return;

      state.pendingMoveAttack = {
        cardId: action.payload.cardId,
        movementCompleted: false,
        startPosition: { ...currentToken.position },
      };
    },
    /**
     * Mark the movement portion of move-attack as complete
     */
    completeMoveAttackMovement: (state) => {
      if (state.pendingMoveAttack) {
        state.pendingMoveAttack.movementCompleted = true;
      }
    },
    /**
     * Clear the move-attack state after the attack is completed
     */
    clearMoveAttack: (state) => {
      state.pendingMoveAttack = null;
    },
    /**
     * Set monsters directly (for testing purposes)
     */
    setMonsters: (state, action: PayloadAction<MonsterState[]>) => {
      state.monsters = action.payload;
    },
    /**
     * Activate the next monster in the villain phase.
     * The monster will either move toward the closest hero or attack if adjacent.
     */
    activateNextMonster: (state, action: PayloadAction<{ randomFn?: () => number }>) => {
      if (state.turnState.currentPhase !== "villain-phase") {
        return;
      }

      // Get monsters controlled by the current hero
      const currentHeroId = state.heroTokens[state.turnState.currentHeroIndex]?.heroId;
      if (!currentHeroId) return;

      const controlledMonsters = state.monsters.filter(m => m.controllerId === currentHeroId);
      
      if (state.villainPhaseMonsterIndex >= controlledMonsters.length) {
        // All monsters have been activated
        return;
      }

      const monster = controlledMonsters[state.villainPhaseMonsterIndex];
      if (!monster) return;

      // Build hero HP and AC maps (AC includes item bonuses)
      const heroHpMap: Record<string, number> = {};
      const heroAcMap: Record<string, number> = {};
      for (const hp of state.heroHp) {
        heroHpMap[hp.heroId] = hp.currentHp;
      }
      for (const token of state.heroTokens) {
        const hero = AVAILABLE_HEROES.find(h => h.id === token.heroId);
        if (hero) {
          heroAcMap[token.heroId] = calculateTotalAC(hero.ac, state.heroInventories[token.heroId]);
        }
      }

      // Execute the monster's turn
      const randomFn = action.payload?.randomFn ?? Math.random;
      const result = executeMonsterTurn(
        monster,
        state.heroTokens,
        heroHpMap,
        heroAcMap,
        state.monsters,
        state.dungeon,
        randomFn
      );

      if (result.type === 'move') {
        // Update monster position
        const monsterToMove = state.monsters.find(m => m.instanceId === monster.instanceId);
        if (monsterToMove) {
          // Find which tile the destination is on
          const newTileId = findTileForGlobalPosition(result.destination, state.dungeon);
          if (newTileId) {
            // Convert global position to local tile position
            const localPos = globalToLocalPosition(result.destination, newTileId, state.dungeon);
            if (localPos) {
              monsterToMove.position = localPos;
              monsterToMove.tileId = newTileId;
            }
          }
        }
        // Store the monster ID to show "moved but could not attack" message
        state.monsterMoveActionId = monster.instanceId;
      } else if (result.type === 'attack') {
        // Store the attack result
        state.monsterAttackResult = result.result;
        state.monsterAttackTargetId = result.targetId;
        state.monsterAttackerId = monster.instanceId;

        // Apply damage to hero if hit
        if (result.result.isHit && result.result.damage > 0) {
          const heroHp = state.heroHp.find(h => h.heroId === result.targetId);
          if (heroHp) {
            heroHp.currentHp = Math.max(0, heroHp.currentHp - result.result.damage);
            
            // Check for party defeat (all heroes at 0 HP)
            const allHeroesDefeated = state.heroHp.every(h => h.currentHp <= 0);
            if (allHeroesDefeated) {
              state.currentScreen = "defeat";
            }
          }
        }
        
        // Apply status effect if the attack has one and hit
        if (result.result.isHit) {
          const monsterDef = getMonsterById(monster.monsterId);
          const tactics = MONSTER_TACTICS[monster.monsterId];
          if (tactics?.adjacentAttack.statusEffect) {
            const heroHpIndex = state.heroHp.findIndex(h => h.heroId === result.targetId);
            if (heroHpIndex !== -1) {
              const heroHp = state.heroHp[heroHpIndex];
              const { applyStatusEffect } = require('./statusEffects');
              const statusType = tactics.adjacentAttack.statusEffect as any;
              state.heroHp[heroHpIndex] = {
                ...heroHp,
                statuses: applyStatusEffect(
                  heroHp.statuses ?? [],
                  statusType,
                  monster.instanceId,
                  state.turnState.turnNumber
                ),
              };
            }
          }
        }
      } else if (result.type === 'move-and-attack') {
        // Handle move-and-attack: monster moves adjacent AND attacks in same turn
        // First, update monster position
        const monsterToMove = state.monsters.find(m => m.instanceId === monster.instanceId);
        if (monsterToMove) {
          const newTileId = findTileForGlobalPosition(result.destination, state.dungeon);
          if (newTileId) {
            const localPos = globalToLocalPosition(result.destination, newTileId, state.dungeon);
            if (localPos) {
              monsterToMove.position = localPos;
              monsterToMove.tileId = newTileId;
            }
          }
        }
        
        // Then, store the attack result
        state.monsterAttackResult = result.result;
        state.monsterAttackTargetId = result.targetId;
        state.monsterAttackerId = monster.instanceId;

        // Apply damage to hero if hit
        if (result.result.isHit && result.result.damage > 0) {
          const heroHp = state.heroHp.find(h => h.heroId === result.targetId);
          if (heroHp) {
            heroHp.currentHp = Math.max(0, heroHp.currentHp - result.result.damage);
            
            // Check for party defeat (all heroes at 0 HP)
            const allHeroesDefeated = state.heroHp.every(h => h.currentHp <= 0);
            if (allHeroesDefeated) {
              state.currentScreen = "defeat";
            }
          }
        }
        
        // Apply status effect if the attack has one and hit
        if (result.result.isHit) {
          const monsterDef = getMonsterById(monster.monsterId);
          const tactics = MONSTER_TACTICS[monster.monsterId];
          if (tactics?.adjacentAttack.statusEffect) {
            const heroHpIndex = state.heroHp.findIndex(h => h.heroId === result.targetId);
            if (heroHpIndex !== -1) {
              const heroHp = state.heroHp[heroHpIndex];
              const { applyStatusEffect } = require('./statusEffects');
              const statusType = tactics.adjacentAttack.statusEffect as any;
              state.heroHp[heroHpIndex] = {
                ...heroHp,
                statuses: applyStatusEffect(
                  heroHp.statuses ?? [],
                  statusType,
                  monster.instanceId,
                  state.turnState.turnNumber
                ),
              };
            }
          }
        }
      }
      // Note: For result.type === 'none', no visual feedback is needed - monster couldn't act

      // Move to next monster
      state.villainPhaseMonsterIndex += 1;
    },
    /**
     * Dismiss the monster attack result display
     */
    dismissMonsterAttackResult: (state) => {
      state.monsterAttackResult = null;
      state.monsterAttackTargetId = null;
      state.monsterAttackerId = null;
    },
    /**
     * Dismiss the monster move action display
     */
    dismissMonsterMoveAction: (state) => {
      state.monsterMoveActionId = null;
    },
    /**
     * Activate all traps and hazards during villain phase
     * This should be called after all monsters have been activated
     */
    activateVillainPhaseTrapsAction: (state, action: PayloadAction<{ randomFn?: () => number }>) => {
      if (state.turnState.currentPhase !== "villain-phase") {
        return;
      }
      
      const randomFn = action.payload?.randomFn ?? Math.random;
      const result = activateVillainPhaseTraps(
        state.traps,
        state.hazards,
        state.heroHp,
        state.heroTokens,
        state.dungeon,
        state.trapInstanceCounter,
        state.hazardInstanceCounter,
        randomFn
      );
      
      state.heroHp = result.heroHp;
      state.traps = result.traps;
      state.hazards = result.hazards;
      state.trapInstanceCounter = result.trapInstanceCounter;
      state.hazardInstanceCounter = result.hazardInstanceCounter;
      
      // Check for party defeat (all heroes at 0 HP)
      const allHeroesDefeated = state.heroHp.every(h => h.currentHp <= 0);
      if (allHeroesDefeated) {
        state.defeatReason = "The party was overwhelmed by traps.";
        state.currentScreen = "defeat";
      }
    },
    /**
     * Attempt to disable a trap
     * Hero must be on the same tile as the trap
     */
    attemptDisableTrap: (state, action: PayloadAction<{ trapId: string; randomFn?: () => number }>) => {
      const { trapId, randomFn = Math.random } = action.payload;
      const trap = state.traps.find(t => t.id === trapId);
      
      if (!trap) return;
      
      // Check if active hero is on the trap tile
      const activeHeroToken = state.heroTokens[state.turnState.currentHeroIndex];
      if (!activeHeroToken) return;
      
      const isOnTile = 
        activeHeroToken.position.x === trap.position.x &&
        activeHeroToken.position.y === trap.position.y;
      
      if (!isOnTile) return;
      
      // Roll d20 vs DC
      const roll = Math.floor(randomFn() * 20) + 1;
      const success = roll >= trap.disableDC;
      
      if (success) {
        // Remove the trap
        state.traps = state.traps.filter(t => t.id !== trapId);
      }
      // If failed, trap remains active
    },
    /**
     * Dismiss the healing surge notification
     */
    dismissHealingSurgeNotification: (state) => {
      state.healingSurgeUsedHeroId = null;
      state.healingSurgeHpRestored = null;
    },
    /**
     * Use an action surge voluntarily at the start of a hero's turn.
     * This heals the hero by their surge value (capped at maxHp).
     */
    useVoluntaryActionSurge: (state) => {
      if (state.turnState.currentPhase !== "hero-phase" || !state.showActionSurgePrompt) {
        return;
      }
      
      const currentHeroId = state.heroTokens[state.turnState.currentHeroIndex]?.heroId;
      if (!currentHeroId) return;
      
      const heroHpIndex = state.heroHp.findIndex(h => h.heroId === currentHeroId);
      if (heroHpIndex === -1) return;
      
      const heroHpState = state.heroHp[heroHpIndex];
      
      // Check if hero needs a healing surge (at 0 HP with surges available)
      if (!checkHealingSurgeNeeded(heroHpState, state.partyResources)) {
        return;
      }
      
      // Use the healing surge
      const surgeResult = useHealingSurge(heroHpState, state.partyResources);
      state.heroHp[heroHpIndex] = surgeResult.heroState;
      state.partyResources = surgeResult.resources;
      
      // Set notification data for UI - use actual HP restored (surge value capped at maxHp)
      state.healingSurgeUsedHeroId = currentHeroId;
      state.healingSurgeHpRestored = surgeResult.heroState.currentHp;
      
      // Hide the prompt
      state.showActionSurgePrompt = false;
    },
    /**
     * Skip the action surge prompt (decline to use the surge).
     * If the hero is at 0 HP, this triggers defeat.
     */
    skipActionSurge: (state) => {
      if (!state.showActionSurgePrompt) return;
      
      const currentHeroId = state.heroTokens[state.turnState.currentHeroIndex]?.heroId;
      if (currentHeroId) {
        const heroHpState = state.heroHp.find(h => h.heroId === currentHeroId);
        
        // If hero is at 0 HP and skips the surge, they are defeated
        if (heroHpState && heroHpState.currentHp === 0) {
          const hero = AVAILABLE_HEROES.find(h => h.id === currentHeroId);
          const heroName = hero?.name ?? 'A hero';
          state.defeatReason = `${heroName} chose not to use a healing surge while at 0 HP.`;
          state.currentScreen = "defeat";
        }
      }
      
      state.showActionSurgePrompt = false;
    },
    /**
     * Set hero HP directly (for testing purposes)
     */
    setHeroHp: (state, action: PayloadAction<{ heroId: string; hp: number; currentHp?: number; maxHp?: number }>) => {
      const { heroId, hp, currentHp, maxHp } = action.payload;
      const heroHp = state.heroHp.find(h => h.heroId === heroId);
      if (heroHp) {
        if (hp !== undefined) {
          heroHp.currentHp = Math.max(0, hp);
        }
        if (currentHp !== undefined) {
          heroHp.currentHp = Math.max(0, currentHp);
        }
        if (maxHp !== undefined) {
          heroHp.maxHp = maxHp;
        }
      }
    },
    /**
     * Set active environment directly (for testing purposes)
     */
    setActiveEnvironment: (state, action: PayloadAction<string | null>) => {
      state.activeEnvironmentId = action.payload;
    },
    /**
     * Set party resources directly (for testing purposes)
     */
    setPartyResources: (state, action: PayloadAction<{ xp?: number; healingSurges?: number }>) => {
      const { xp, healingSurges } = action.payload;
      if (xp !== undefined) {
        state.partyResources.xp = xp;
      }
      if (healingSurges !== undefined) {
        state.partyResources.healingSurges = healingSurges;
      }
    },
    /**
     * Assign the currently drawn treasure to a hero's inventory
     */
    assignTreasureToHero: (state, action: PayloadAction<{ heroId: string }>) => {
      const { heroId } = action.payload;
      
      if (!state.drawnTreasure) {
        return;
      }
      
      // Get or create the hero's inventory
      if (!state.heroInventories[heroId]) {
        state.heroInventories[heroId] = createHeroInventory(heroId);
      }
      
      // Add the treasure to the hero's inventory
      state.heroInventories[heroId] = addTreasureToInventory(
        state.heroInventories[heroId],
        state.drawnTreasure.id
      );
      
      // Clear the drawn treasure (modal will close)
      state.drawnTreasure = null;
    },
    /**
     * Dismiss the treasure card without assigning it (put back in deck)
     */
    dismissTreasureCard: (state) => {
      if (state.drawnTreasure) {
        // Put the treasure back in the discard pile
        state.treasureDeck = discardTreasure(state.treasureDeck, state.drawnTreasure.id);
        state.drawnTreasure = null;
      }
    },
    /**
     * Use a treasure item from a hero's inventory
     */
    useTreasureItem: (state, action: PayloadAction<{ heroId: string; cardId: number }>) => {
      const { heroId, cardId } = action.payload;
      const inventory = state.heroInventories[heroId];
      
      if (!inventory) {
        return;
      }
      
      const card = getTreasureById(cardId);
      if (!card) {
        return;
      }
      
      // Check if the item is flippable (not already used)
      const itemState = inventory.items.find(i => i.cardId === cardId);
      if (!itemState || itemState.isFlipped) {
        return;
      }
      
      // Apply the item effect based on type
      const effect = card.effect;
      const currentHeroId = state.heroTokens[state.turnState.currentHeroIndex]?.heroId;
      
      // Handle healing effect
      if (effect.type === 'healing' && effect.value) {
        const heroHpIndex = state.heroHp.findIndex(h => h.heroId === heroId);
        if (heroHpIndex !== -1) {
          const hp = state.heroHp[heroHpIndex];
          state.heroHp[heroHpIndex] = {
            ...hp,
            currentHp: Math.min(hp.maxHp, hp.currentHp + effect.value),
          };
        }
      }
      
      // Remove or flip the item based on whether it's a consumable
      if (card.discardAfterUse) {
        // Remove from inventory and add to discard pile
        state.heroInventories[heroId] = removeTreasureFromInventory(inventory, cardId);
        state.treasureDeck = discardTreasure(state.treasureDeck, cardId);
      } else {
        // Just flip the card (mark as used)
        state.heroInventories[heroId] = flipTreasureInInventory(inventory, cardId);
      }
    },
    /**
     * Set treasure deck directly (for testing purposes)
     */
    setTreasureDeck: (state, action: PayloadAction<TreasureDeck>) => {
      state.treasureDeck = action.payload;
    },
    /**
     * Set hero inventories directly (for testing purposes)
     */
    setHeroInventories: (state, action: PayloadAction<Record<string, HeroInventory>>) => {
      state.heroInventories = action.payload;
    },
    /**
     * Place a board token on the board (e.g., Blade Barrier, Flaming Sphere)
     */
    placeBoardToken: (state, action: PayloadAction<BoardTokenState>) => {
      state.boardTokens.push(action.payload);
    },
    /**
     * Remove a board token by ID
     */
    removeBoardToken: (state, action: PayloadAction<string>) => {
      state.boardTokens = state.boardTokens.filter(token => token.id !== action.payload);
    },
    /**
     * Move a board token to a new position
     */
    moveBoardToken: (state, action: PayloadAction<{ tokenId: string; position: Position }>) => {
      const token = state.boardTokens.find(t => t.id === action.payload.tokenId);
      if (token) {
        token.position = action.payload.position;
      }
    },
    /**
     * Decrement charges on a token and remove if depleted
     */
    decrementBoardTokenCharges: (state, action: PayloadAction<string>) => {
      const token = state.boardTokens.find(t => t.id === action.payload);
      if (token && token.charges !== undefined) {
        token.charges -= 1;
        if (token.charges <= 0) {
          state.boardTokens = state.boardTokens.filter(t => t.id !== action.payload);
        }
      }
    },
    /**
     * Set board tokens directly (for testing purposes)
     */
    setBoardTokens: (state, action: PayloadAction<BoardTokenState[]>) => {
      state.boardTokens = action.payload;
    },
    /**
     * Apply a status effect to a hero
     */
    applyHeroStatus: (state, action: PayloadAction<{
      heroId: string;
      statusType: import('./statusEffects').StatusEffectType;
      source: string;
      duration?: number;
      data?: import('./statusEffects').StatusEffect['data'];
    }>) => {
      const { heroId, statusType, source, duration, data } = action.payload;
      const heroHpIndex = state.heroHp.findIndex(h => h.heroId === heroId);
      
      if (heroHpIndex !== -1) {
        const heroHp = state.heroHp[heroHpIndex];
        const { applyStatusEffect } = require('./statusEffects');
        state.heroHp[heroHpIndex] = {
          ...heroHp,
          statuses: applyStatusEffect(
            heroHp.statuses ?? [],
            statusType,
            source,
            state.turnState.turnNumber,
            duration,
            data
          ),
        };
      }
    },
    /**
     * Remove a status effect from a hero
     */
    removeHeroStatus: (state, action: PayloadAction<{
      heroId: string;
      statusType: import('./statusEffects').StatusEffectType;
    }>) => {
      const { heroId, statusType } = action.payload;
      const heroHpIndex = state.heroHp.findIndex(h => h.heroId === heroId);
      
      if (heroHpIndex !== -1) {
        const heroHp = state.heroHp[heroHpIndex];
        const { removeStatusEffect } = require('./statusEffects');
        state.heroHp[heroHpIndex] = {
          ...heroHp,
          statuses: removeStatusEffect(heroHp.statuses ?? [], statusType),
        };
      }
    },
    /**
     * Remove all status effects from a hero
     */
    clearHeroStatuses: (state, action: PayloadAction<string>) => {
      const heroId = action.payload;
      const heroHpIndex = state.heroHp.findIndex(h => h.heroId === heroId);
      
      if (heroHpIndex !== -1) {
        state.heroHp[heroHpIndex] = {
          ...state.heroHp[heroHpIndex],
          statuses: [],
        };
      }
    },
    /**
     * Apply a status effect to a monster
     */
    applyMonsterStatus: (state, action: PayloadAction<{
      monsterInstanceId: string;
      statusType: import('./statusEffects').StatusEffectType;
      source: string;
      duration?: number;
      data?: import('./statusEffects').StatusEffect['data'];
    }>) => {
      const { monsterInstanceId, statusType, source, duration, data } = action.payload;
      const monsterIndex = state.monsters.findIndex(m => m.instanceId === monsterInstanceId);
      
      if (monsterIndex !== -1) {
        const monster = state.monsters[monsterIndex];
        const { applyStatusEffect } = require('./statusEffects');
        state.monsters[monsterIndex] = {
          ...monster,
          statuses: applyStatusEffect(
            monster.statuses ?? [],
            statusType,
            source,
            state.turnState.turnNumber,
            duration,
            data
          ),
        };
      }
    },
    /**
     * Remove a status effect from a monster
     */
    removeMonsterStatus: (state, action: PayloadAction<{
      monsterInstanceId: string;
      statusType: import('./statusEffects').StatusEffectType;
    }>) => {
      const { monsterInstanceId, statusType } = action.payload;
      const monsterIndex = state.monsters.findIndex(m => m.instanceId === monsterInstanceId);
      
      if (monsterIndex !== -1) {
        const monster = state.monsters[monsterIndex];
        const { removeStatusEffect } = require('./statusEffects');
        state.monsters[monsterIndex] = {
          ...monster,
          statuses: removeStatusEffect(monster.statuses ?? [], statusType),
        };
      }
    },
    /**
     * Process status effects at the start of a hero's turn (apply ongoing damage, expire durations)
     */
    processHeroStatusEffects: (state, action: PayloadAction<string>) => {
      const heroId = action.payload;
      const heroHpIndex = state.heroHp.findIndex(h => h.heroId === heroId);
      
      if (heroHpIndex !== -1) {
        const heroHp = state.heroHp[heroHpIndex];
        const { processStatusEffectsStartOfTurn } = require('./statusEffects');
        const { updatedStatuses, ongoingDamage } = processStatusEffectsStartOfTurn(
          heroHp.statuses ?? [],
          state.turnState.turnNumber
        );
        
        // Apply ongoing damage
        const newHp = Math.max(0, heroHp.currentHp - ongoingDamage);
        
        state.heroHp[heroHpIndex] = {
          ...heroHp,
          currentHp: newHp,
          statuses: updatedStatuses,
        };
      }
    },
  },
});

export const { 
  startGame, 
  setHeroPosition, 
  showMovement, 
  hideMovement, 
  moveHero,
  completeMove,
  undoAction,
  resetGame,
  endHeroPhase,
  endExplorationPhase,
  endVillainPhase,
  dismissMonsterCard,
  dismissEncounterCard,
  cancelEncounterCard,
  setAttackResult,
  dismissAttackResult,
  dismissDefeatNotification,
  setMonsters,
  activateNextMonster,
  dismissMonsterAttackResult,
  dismissMonsterMoveAction,
  dismissHealingSurgeNotification,
  setHeroHp,
  dismissLevelUpNotification,
  setPartyResources,
  useVoluntaryActionSurge,
  skipActionSurge,
  startMultiAttack,
  recordMultiAttackHit,
  clearMultiAttack,
  startMoveAttack,
  completeMoveAttackMovement,
  clearMoveAttack,
  assignTreasureToHero,
  dismissTreasureCard,
  useTreasureItem,
  setTreasureDeck,
  setHeroInventories,
  setActiveEnvironment,
  placeBoardToken,
  removeBoardToken,
  moveBoardToken,
  decrementBoardTokenCharges,
  setBoardTokens,
  applyHeroStatus,
  removeHeroStatus,
  clearHeroStatuses,
  applyMonsterStatus,
  removeMonsterStatus,
  processHeroStatusEffects,
} = gameSlice.actions;
export default gameSlice.reducer;
