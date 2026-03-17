import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { getScenarioById } from "./scenarios";
import {
  GameScreen,
  HeroToken,
  Position,
  START_TILE_POSITIONS,
  TurnState,
  DungeonState,
  TileEdge,
  INITIAL_TILE_DECK,
  CHAMBER_ENTRANCE_TILE_ID,
  MonsterDeck,
  MonsterState,
  MonsterGroup,
  AttackResult,
  TrapDisableResult,
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
  TreasureTokenState,
  BoardTokenState,
  MONSTER_TACTICS,
  MONSTERS,
  ENCOUNTER_CANCEL_COST,
  PendingMonsterDecision,
  VillainInstance,
  PlacedTile,
  EncounterResultTarget,
} from "./types";
import {
  executeVillainTurn,
  getVillainGlobalPosition,
  getVillainDefForScenario,
  calculateVillainHp,
  isVillainShielded,
} from "./villainAI";
import { applyDeckSetup, registerScenarioHooks, registerDynamicScenarioHook, createReflectNaturalOneHandler, evaluateWinConditions, evaluateLossConditions, getHeroDailyDamageBonus, getMonsterAcBonus } from "./scenarioEngine";
import { getValidMoveSquares, isValidMoveDestination, getTileBounds, getTileOrSubTileId, findTileAtPosition, calculateMoveCost } from "./movement";
import {
  initializeDungeon,
  initializeTileDeck,
  checkExploration,
  placeTile,
  drawTile,
  updateDungeonAfterExploration,
  getTileDefinition,
  moveBottomTileToTop,
  drawTileFromBottom,
  shuffleTileDeck,
} from "./exploration";
import {
  initializeMonsterDeck,
  drawMonster,
  createMonsterInstance,
  getMonsterSpawnPosition,
  discardMonster,
  getMonsterById,
  filterMonsterDeckByCategory,
  healMonster,
  drawMonsterFromBottom,
  getBlackSquarePosition,
  getScorchMarkPosition,
  spawnMonstersWithBehavior,
  createMonsterGroup,
  isGroupDefeated,
  removeMonsterFromGroup,
  getMonsterMoveToTilePosition,
  getValidTilePositions,
} from "./monsters";
import {
  executeMonsterTurn,
  globalToLocalPosition,
  findTileForGlobalPosition,
  findClosestMonsterNotOnTile,
  findPositionAdjacentToHero,
  getMonsterGlobalPosition,
  findMoveTowardHero,
  resolveMonsterAttackWithStats,
  localToGlobalPosition,
} from "./monsterAI";
import {
  canLevelUp,
  levelUpHero,
  calculateDamage,
  checkHealingSurgeNeeded,
  useHealingSurge,
  checkPartyDefeat,
  calculateTotalAC,
  rollD20,
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
  shouldDrawAnotherEncounter,
  getMonsterCategoryForEncounter,
  isMonsterDeckManipulationCard,
  isTileDeckManipulationCard,
  getCurseStatusType,
  findClosestUnexploredEdge,
  areOnSameTile,
} from "./encounters";
import {
  createTrapInstance,
  createHazardInstance,
  createTreasureTokenInstance,
  tileHasTrap,
  tileHasHazard,
  findValidTreasurePlacement,
  getTreasureTokensOnTile,
  getHazardsOnTile,
} from "./trapsHazards";
import { activateVillainPhaseTraps } from "./villainPhaseTraps";
import { checkBladeBarrierDamage } from "./powerCardEffects";
import { POWER_CARDS } from "./powerCards";
import { parseActionCard } from "./actionCardParser";
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
import {
  applyStatusEffect,
  removeStatusEffect,
  processStatusEffectsStartOfTurn,
  hasStatusEffect,
  isDazed,
  attemptPoisonRecovery as attemptPoisonRecoveryUtil,
  attemptCurseRemoval,
  DRAGON_FEAR_DAMAGE,
  getModifiedAC,
  canMove as canMoveWithStatus,
  type StatusEffect,
  type StatusEffectType,
} from "./statusEffects";
import type { EventHookState } from './gameEvents';
import type { HeroPowerCards } from './powerCards';
import {
  initializeEventHooks,
  registerAllHeroHooks,
  triggerGameEvent,
  unregisterPowerCard,
  calculateEncounterCancelCost,
} from './powerCardIntegration';
import type {
  AttackHitByHeroEvent,
  AttackMissEvent,
  AttackHitOnHeroEvent,
  MonsterSpawnEvent,
  MonsterActivationEvent,
  VillainPhaseStartEvent,
  HeroPhaseEndEvent,
  TileRevealEvent,
  ChamberRevealEvent,
  EncounterDrawEvent,
} from './gameEvents';

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
 * Default scenario state for MVP: Defeat 12 monsters
 */
const DEFAULT_SCENARIO_STATE: ScenarioState = {
  scenarioId: 'default',
  monstersDefeated: 0,
  monstersToDefeat: 12,
  objective: "Defeat 12 monsters",
  title: "Into the Mountain",
  description: "You and your fellow adventurers have entered the depths beneath Firestorm Peak. The dragon Ashardalon's corruption spreads through these caverns. As you explore the dungeon, you'll face hordes of monsters and discover the source of evil.",
  instructions: "Work together to explore the dungeon tiles. When you explore, draw from the Monster Deck and place monsters on the board. Defeat monsters to gain XP and level up your heroes.",
  introductionShown: false,
  chamberRevealed: false,
  villainInstanceId: null,
  activePersistentModifiers: [],
  tilesForChamber: null,
  tilesExplored: 0,
  roomSetName: null,
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
  /** ID of the scenario selected in the lobby (see src/store/scenarios.ts) */
  selectedScenarioId: string;
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
  /** Monster groups for tracking multi-monster spawns with collective XP */
  monsterGroups: MonsterGroup[];
  /** Counter for generating unique monster instance IDs */
  monsterInstanceCounter: number;
  /** Counter for generating unique monster group IDs */
  monsterGroupCounter: number;
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
  /** Name of the attack used by the monster (for displaying in combat result) */
  monsterAttackName: string | null;
  /** Results of area attack (for displaying multiple combat results sequentially) */
  monsterAreaAttackResults: AttackResult[] | null;
  /** IDs of heroes targeted by area attack */
  monsterAreaAttackTargetIds: string[] | null;
  /** Index of the monster currently being activated during villain phase */
  villainPhaseMonsterIndex: number;
  /** ID of the monster that just moved but could not attack (for displaying move feedback) */
  monsterMoveActionId: string | null;
  /** Monster exploration event: information about monster-triggered tile exploration */
  monsterExplorationEvent: { 
    monsterId: string; 
    monsterName: string; 
    direction: import('./types').Direction; 
    tileType: string;
    testDismiss?: boolean;
    /** Instance ID of a monster spawned on the new tile, if any. Shown as modal after notification dismissed. */
    spawnedMonsterInstanceId?: string;
  } | null;
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
  /** Reason for victory (for displaying on victory screen) */
  victoryReason: string | null;
  /** Encounter deck for drawing encounters when no exploration occurs */
  encounterDeck: EncounterDeck;
  /** Currently drawn encounter card (displayed during villain phase) */
  drawnEncounter: EncounterCard | null;
  /** Result of encounter card effects on heroes (for result popup display) */
  encounterResult: import('./types').EncounterResult | null;
  /** Active environment state - tracks persistent environment effects */
  activeEnvironmentId: string | null;
  /** Active traps on the board */
  traps: TrapState[];
  /** Active hazards on the board */
  hazards: HazardState[];
  /** Treasure tokens placed on tiles (collectible by heroes) */
  treasureTokens: TreasureTokenState[];
  /** Counter for generating unique trap instance IDs */
  trapInstanceCounter: number;
  /** Counter for generating unique hazard instance IDs */
  hazardInstanceCounter: number;
  /** Counter for generating unique treasure token instance IDs */
  treasureTokenInstanceCounter: number;
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
  /** Attack-then-move state: set when using cards like Righteous Advance that allow movement after attack */
  pendingMoveAfterAttack: PendingMoveAfterAttackState | null;
  /** Hero placement state: set when using cards like Tornado Strike that require hero placement after attacks */
  pendingHeroPlacement: PendingHeroPlacementState | null;
  /** Treasure deck for drawing treasure on monster defeat */
  treasureDeck: TreasureDeck;
  /** Currently drawn treasure card awaiting assignment to a hero */
  drawnTreasure: TreasureCard | null;
  /** Second treasure drawn for Dragon's Tribute (when environment is active) */
  dragonsTributeSecondTreasure: TreasureCard | null;
  /** Hero inventories - items owned by each hero */
  heroInventories: Record<string, HeroInventory>;
  /** Whether treasure has been drawn this turn (only one treasure per turn) */
  treasureDrawnThisTurn: boolean;
  /** Incremental movement state: tracks remaining movement for step-by-step movement */
  incrementalMovement: IncrementalMovementState | null;
  /** Undo state: snapshot of reversible state before last action (for undo functionality) */
  undoSnapshot: UndoSnapshot | null;
  /** Encounter effect message to display to player (null if no message) */
  encounterEffectMessage: string | null;
  /** Exploration phase notification message (null if no notification) */
  explorationPhaseMessage: string | null;
  /** Exploration phase step tracking for interactive progression */
  explorationPhase: ExplorationPhaseState;
  /** ID of the most recently placed tile (for animation tracking) */
  recentlyPlacedTileId: string | null;
  /** IDs of tiles placed as part of a room set reveal (for sequential animation) */
  recentlyPlacedRoomSetTileIds: string[];
  /** ID of monster waiting to be displayed after tile animation completes */
  pendingMonsterDisplayId: string | null;
  /** Poisoned damage notification: hero ID and damage taken (null if no notification) */
  poisonedDamageNotification: { heroId: string; damage: number } | null;
  /** Poison recovery notification: hero ID, roll result, and whether recovered (null if no notification) */
  poisonRecoveryNotification: { heroId: string; roll: number; recovered: boolean } | null;
  /** Cleric's Shield target: hero ID receiving +2 AC bonus (null if no bonus active) */
  clericsShieldTarget: string | null;
  /** Pending monster choice: context and encounter ID for effects requiring monster selection */
  pendingMonsterChoice: PendingMonsterChoiceState | null;
  /** Pending treasure placement: requires player to select a tile for treasure token */
  pendingTreasurePlacement: PendingTreasurePlacementState | null;
  /** Pending treasure discard: requires player to select which treasure to discard */
  pendingTreasureDiscard: PendingTreasureDiscardState | null;
  /** Pending monster spawn: requires player to select tile for monster spawn (Wandering Monster) */
  pendingMonsterSpawn: PendingMonsterSpawnState | null;
  /** Pending treasure item attack: hero is selecting a target monster to attack with a treasure item */
  pendingTreasureItemAttack: { heroId: string; cardId: number } | null;
  /** Selected target ID (for attack actions) - can be monster, trap, treasure, etc. */
  selectedTargetId: string | null;
  /** Selected target type (to differentiate between different targetable entity types) */
  selectedTargetType: 'monster' | 'trap' | 'treasure' | null;
  /** Whether the scenario introduction modal should be shown (can be reopened via objective panel) */
  showScenarioIntroduction: boolean;
  /** Whether an extra encounter should be drawn due to Bad Luck curse (set after first encounter) */
  badLuckExtraEncounterPending: boolean;
  /** Whether the current hero moved during this Hero Phase (for Gap in the Armor curse tracking) */
  heroMovedThisPhase: boolean;
  /** Result of the most recent trap disable attempt (for displaying result dialog) */
  trapDisableResult: TrapDisableResult | null;
  /** Player-visible log entries for tracking game history and actions */
  logEntries: import('./types').LogEntry[];
  /** Counter for generating unique log entry IDs */
  logEntryCounter: number;
  /** Test mode flag: when true, disables auto-dismiss on notifications for E2E testing */
  testMode?: boolean;
  /** Pending monster decision: requires player to choose target/position during villain phase */
  pendingMonsterDecision: PendingMonsterDecision | null;
  /** Whether villain phase is paused waiting for player input on monster decision */
  villainPhasePaused: boolean;
  /** Selected hero target from monster decision (to be used by villain phase AI) */
  monsterDecisionSelectedHero: string | null;
  /** Selected position from monster decision (to be used by villain phase AI) */
  monsterDecisionSelectedPosition: Position | null;
  /** Event hook registry for power card conditional effects */
  eventHooks: EventHookState;
  /** Power card flips pending from event hooks (to be processed by heroesSlice) */
  pendingPowerCardFlips: Array<{ powerCardId: number; heroId: string }>;
  /** Encounter cancel cost (may be reduced by Perseverance card effect) */
  encounterCancelCost: number;
  /** Current villain phase step message for display in turn progress (encounter drawing/skipped) */
  villainPhaseStepMessage: string | null;
  /**
   * Active villain instance on the board (null until the chamber is revealed).
   * Set when the Chamber Entrance tile is placed.
   */
  villain: VillainInstance | null;
  /**
   * Summary of the most recent villain activation, displayed as a dismissable
   * notification panel (like monster attack/move notifications).
   * Cleared when the player clicks to dismiss.
   */
  villainActivation: {
    villainName: string;
    /** Type of action taken: 'attack', 'move', 'auto-damage', 'spawn', or 'idle' */
    actionType: 'attack' | 'move' | 'auto-damage' | 'spawn' | 'idle';
    /** Tactic or action description shown in the header */
    tacticName: string;
    /** Primary attack result (if actionType === 'attack') */
    attackResult: AttackResult | null;
    /** Primary target hero ID */
    targetHeroId: string | null;
    /** All target IDs (AoE) */
    targetHeroIds: string[];
    /** Auto-damage amount (if actionType === 'auto-damage') */
    autoDamage: number;
    /** Remaining area-attack results to show sequentially */
    remainingResults: AttackResult[];
    /** Remaining area-attack target hero IDs */
    remainingTargetIds: string[];
  } | null;
  /**
   * Attack result from the most recent villain activation (for UI display).
   * Cleared when the player dismisses the result.
   */
  villainAttackResult: AttackResult | null;
  /** Hero ID targeted by the most recent villain attack. */
  villainAttackTargetId: string | null;
  /** Name of the tactic used in the most recent villain activation. */
  villainAttackName: string | null;
  /** Results of villain area-attack (displayed sequentially, like monsterAreaAttackResults). */
  villainAreaAttackResults: AttackResult[] | null;
  /** Hero IDs targeted by villain area attack. */
  villainAreaAttackTargetIds: string[] | null;
  /**
   * Whether the villain has already activated during the current hero's villain phase.
   * Resets to false when endVillainPhase is dispatched.
   */
  villainActivatedThisTurn: boolean;
}

/**
 * Exploration phase step types
 */
export type ExplorationStep = 
  | 'not-started'              // Phase just started, no steps shown yet
  | 'skipped'                  // Hero not on edge, phase will be skipped
  | 'awaiting-tile'            // Waiting for user to click to place tile
  | 'tile-placed'              // Tile has been placed
  | 'awaiting-monster'         // Waiting for user to click to add monster
  | 'monster-added'            // Monster has been added
  | 'awaiting-monster-dismiss' // Monster card is showing; waiting for player to dismiss before phase ends
  | 'complete';                // All steps completed

/**
 * Exploration phase state tracking
 */
export interface ExplorationPhaseState {
  step: ExplorationStep;
  /** Drawn tile waiting to be placed */
  drawnTile: string | null;
  /** Explored edge where tile will be placed */
  exploredEdge: import('./types').TileEdge | null;
  /** Drawn monster waiting to be placed */
  drawnMonster: string | null;
}

/**
 * State for tracking when player needs to choose a monster for an encounter effect
 */
export interface PendingMonsterChoiceState {
  /** The encounter card that requires monster selection */
  encounterId: string;
  /** The encounter card name for display */
  encounterName: string;
  /** Context for why the choice is needed (for UI display) */
  context: string;
}

/**
 * State for tracking when player needs to place a treasure token
 */
export interface PendingTreasurePlacementState {
  /** The encounter card that requires treasure placement */
  encounterId: string;
  /** The encounter card name for display */
  encounterName: string;
}

/**
 * State for tracking when player needs to choose which treasure to discard
 */
export interface PendingTreasureDiscardState {
  /** The encounter card that requires treasure discard */
  encounterId: string;
  /** The encounter card name for display */
  encounterName: string;
  /** The hero who must discard */
  heroId: string;
}

/**
 * State for tracking when player needs to select a tile for monster spawn
 */
export interface PendingMonsterSpawnState {
  /** The drawn monster ID to spawn */
  monsterId: string;
  /** The monster name for display */
  monsterName: string;
  /** The hero who is spawning the monster */
  heroId: string;
  /** Available tiles with unexplored edges */
  availableTileIds: string[];
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
 * State for tracking attack-then-move sequences (e.g., Righteous Advance)
 * This is triggered AFTER an attack completes (hit or miss)
 */
export interface PendingMoveAfterAttackState {
  /** Power card ID that was used for the attack */
  cardId: number;
  /** Number of squares the ally can move (from the card effect) */
  moveDistance: number;
  /** Whether this was the first or second action (affects what happens after cancel/complete) */
  wasFirstAction: boolean;
  /** Which hero was selected to move (null if selection hasn't happened yet) */
  selectedHeroId: string | null;
  /** Available heroes that can be moved (on the same tile as the attacker) */
  availableHeroes: string[];
}

/**
 * State for tracking hero placement selection (e.g., Tornado Strike post-attack placement)
 */
export interface PendingHeroPlacementState {
  /** Power card ID that requires hero placement */
  cardId: number;
  /** Hero ID that needs to be placed */
  heroId: string;
  /** Tile ID where hero can be placed */
  tileId: string;
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
 * Helper function to apply status effect from monster attack if applicable
 * This helper eliminates code duplication between attack and move-and-attack cases
 * 
 * @param state Current game state
 * @param monsterId Monster type ID
 * @param monsterInstanceId Unique monster instance ID
 * @param targetHeroId Hero ID that was attacked
 * @param attackType Type of attack - 'adjacent' for adjacentAttack, 'move' for moveAttack
 */
function applyMonsterAttackStatusEffect(
  state: GameState,
  monsterId: string,
  monsterInstanceId: string,
  targetHeroId: string,
  attackType: 'adjacent' | 'move' = 'adjacent'
): void {
  const tactics = MONSTER_TACTICS[monsterId];
  if (!tactics) return;
  
  // Get the appropriate attack option based on attack type
  const attackOption = attackType === 'move' && tactics.moveAttack 
    ? tactics.moveAttack 
    : tactics.adjacentAttack;
  
  if (attackOption?.statusEffect) {
    const heroHpIndex = state.heroHp.findIndex(h => h.heroId === targetHeroId);
    if (heroHpIndex !== -1) {
      const heroHp = state.heroHp[heroHpIndex];
      const statusType = attackOption.statusEffect as StatusEffectType;
      state.heroHp[heroHpIndex] = {
        ...heroHp,
        statuses: applyStatusEffect(
          heroHp.statuses ?? [],
          statusType,
          monsterInstanceId,
          state.turnState.turnNumber
        ),
      };
    }
  }
}

/**
 * Helper function to apply miss damage from monster attack if applicable
 * Some monsters (like Grell, Orc Archer) deal damage even on a miss
 * 
 * @param state Current game state
 * @param monsterId Monster type ID
 * @param targetHeroId Hero ID that was attacked
 * @param attackType Type of attack - 'adjacent' for adjacentAttack, 'move' for moveAttack
 */
function applyMonsterMissDamage(
  state: GameState,
  monsterId: string,
  targetHeroId: string,
  attackType: 'adjacent' | 'move' = 'adjacent'
): void {
  const tactics = MONSTER_TACTICS[monsterId];
  if (!tactics) return;
  
  // Get the appropriate attack option based on attack type
  const attackOption = attackType === 'move' && tactics.moveAttack 
    ? tactics.moveAttack 
    : tactics.adjacentAttack;
  
  if (attackOption?.missDamage && attackOption.missDamage > 0) {
    const heroHp = state.heroHp.find(h => h.heroId === targetHeroId);
    if (heroHp) {
      heroHp.currentHp = Math.max(0, heroHp.currentHp - attackOption.missDamage);
      
      // Check for party defeat (all heroes at 0 HP)
      const allHeroesDefeated = state.heroHp.every(h => h.currentHp <= 0);
      if (allHeroesDefeated) {
        state.currentScreen = "defeat";
      }
    }
  }
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
  selectedScenarioId: 'default',
  heroTokens: [],
  turnState: { ...DEFAULT_TURN_STATE },
  validMoveSquares: [],
  showingMovement: false,
  dungeon: initializeDungeon(),
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
  victoryReason: null,
  encounterDeck: { drawPile: [], discardPile: [] },
  drawnEncounter: null,
  encounterResult: null,
  activeEnvironmentId: null,
  traps: [],
  hazards: [],
  treasureTokens: [],
  trapInstanceCounter: 0,
  hazardInstanceCounter: 0,
  treasureTokenInstanceCounter: 0,
  boardTokens: [],
  boardTokenInstanceCounter: 0,
  showActionSurgePrompt: false,
  multiAttackState: null,
  pendingMoveAttack: null,
  pendingMoveAfterAttack: null,
  pendingHeroPlacement: null,
  treasureDeck: { drawPile: [], discardPile: [] },
  drawnTreasure: null,
  dragonsTributeSecondTreasure: null,
  heroInventories: {},
  treasureDrawnThisTurn: false,
  incrementalMovement: null,
  undoSnapshot: null,
  encounterEffectMessage: null,
  explorationPhaseMessage: null,
  explorationPhase: { step: 'not-started', drawnTile: null, exploredEdge: null, drawnMonster: null },
  recentlyPlacedTileId: null,
  recentlyPlacedRoomSetTileIds: [],
  pendingMonsterDisplayId: null,
  poisonedDamageNotification: null,
  poisonRecoveryNotification: null,
  clericsShieldTarget: null,
  pendingMonsterChoice: null,
  pendingTreasurePlacement: null,
  pendingTreasureDiscard: null,
  pendingMonsterSpawn: null,
  pendingTreasureItemAttack: null,
  selectedTargetId: null,
  selectedTargetType: null,
  showScenarioIntroduction: false,
  badLuckExtraEncounterPending: false,
  heroMovedThisPhase: false,
  trapDisableResult: null,
  logEntries: [],
  logEntryCounter: 0,
  testMode: false,
  pendingMonsterDecision: null,
  villainPhasePaused: false,
  monsterDecisionSelectedHero: null,
  monsterDecisionSelectedPosition: null,
  eventHooks: initializeEventHooks(),
  pendingPowerCardFlips: [],
  encounterCancelCost: ENCOUNTER_CANCEL_COST,
  villainPhaseStepMessage: null,
  villain: null,
  villainActivation: null,
  villainAttackResult: null,
  villainAttackTargetId: null,
  villainAttackName: null,
  villainAreaAttackResults: null,
  villainAreaAttackTargetIds: null,
  villainActivatedThisTurn: false,
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
 * - When Dazed: Only ONE action allowed (move OR attack), turn ends after that action
 */
function computeHeroTurnActions(
  currentActions: HeroTurnActions,
  newAction: HeroSubAction,
  heroStatuses?: StatusEffect[]
): HeroTurnActions {
  const newActionsTaken = [...currentActions.actionsTaken, newAction];
  
  // Check if hero is Dazed
  const isHeroDazed = heroStatuses ? isDazed(heroStatuses) : false;
  
  // If Dazed and just completed the first action, cannot take any more actions
  // Note: newActionsTaken includes the action we just took, so length === 1 means this was the first action
  if (isHeroDazed && newActionsTaken.length === 1) {
    return {
      actionsTaken: newActionsTaken,
      canMove: false,
      canAttack: false,
    };
  }
  
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
 * Get the statuses for a specific hero from the game state
 */
function getHeroStatuses(state: GameState, heroId: string): StatusEffect[] {
  const heroHp = state.heroHp.find(h => h.heroId === heroId);
  return heroHp?.statuses ?? [];
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

/**
 * Helper function to handle "Scream of the Sentry" encounter effect with a chosen monster
 * This is extracted as a reusable function that can be called from multiple places
 */
function handleScreamOfSentryEffect(state: GameState, chosenMonster: MonsterState): void {
  const monsterDef = getMonsterById(chosenMonster.monsterId);
  
  // Find the closest unexplored edge to the monster
  // Calculate distances from monster's position to all unexplored edges
  const monsterTile = state.dungeon.tiles.find(t => t.id === chosenMonster.tileId);
  
  if (monsterTile && state.dungeon.unexploredEdges.length > 0) {
    // Find closest unexplored edge based on tile distance
    let closestEdge = state.dungeon.unexploredEdges[0];
    let closestDistance = Infinity;
    
    for (const edge of state.dungeon.unexploredEdges) {
      const edgeTile = state.dungeon.tiles.find(t => t.id === edge.tileId);
      if (edgeTile) {
        // Calculate Manhattan distance between tiles
        const dx = Math.abs(edgeTile.position.x - monsterTile.position.x);
        const dy = Math.abs(edgeTile.position.y - monsterTile.position.y);
        const distance = dx + dy;
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestEdge = edge;
        }
      }
    }
    
    // Draw a tile from the bottom of the deck
    const { drawnTile, remainingDeck } = drawTileFromBottom(state.dungeon.tileDeck);
    
    if (drawnTile) {
      state.dungeon.tileDeck = remainingDeck;
      
      // Place the tile at the closest unexplored edge
      const newTile = placeTile(closestEdge, drawnTile, state.dungeon);
      
      if (newTile) {
        // Add the new tile to the dungeon
        state.dungeon.tiles.push(newTile);
        
        // Update unexplored edges
        state.dungeon = updateDungeonAfterExploration(state.dungeon, closestEdge, newTile);
        
        // Draw a monster from the deck
        const { monster: newMonsterId, deck: updatedMonsterDeck } = drawMonster(state.monsterDeck);
        state.monsterDeck = updatedMonsterDeck;
        
        if (newMonsterId) {
          const newMonsterDef = getMonsterById(newMonsterId);
          
          // Use spawn function to handle multi-monster spawns
          const activeHeroToken = state.heroTokens[state.turnState.currentHeroIndex];
          const spawnResult = spawnMonstersWithBehavior(
            newMonsterId,
            newTile,
            activeHeroToken?.heroId || state.heroTokens[0].heroId,
            state.monsters,
            state.monsterInstanceCounter,
            state.monsterGroupCounter
          );
          
          if (spawnResult.monsters.length > 0) {
            state.monsters.push(...spawnResult.monsters);
            state.monsterInstanceCounter = spawnResult.monsterInstanceCounter;
            state.monsterGroupCounter = spawnResult.monsterGroupCounter;
            state.recentlySpawnedMonsterId = spawnResult.monsters[0].instanceId;
            
            // Add group if multiple monsters spawned
            if (spawnResult.group) {
              state.monsterGroups.push(spawnResult.group);
            }
            
            state.encounterEffectMessage = `Tile placed near ${monsterDef?.name || 'monster'}, ${newMonsterDef?.name || 'monster'} spawned`;
          } else {
            state.encounterEffectMessage = 'Failed to create monster';
          }
        } else {
          state.encounterEffectMessage = 'No monsters in deck to spawn';
        }
      } else {
        state.encounterEffectMessage = 'Failed to place tile';
      }
    } else {
      state.encounterEffectMessage = 'No tiles in deck to place';
    }
  } else {
    state.encounterEffectMessage = 'No unexplored edges available';
  }
  
  // Discard the encounter card
  if (state.drawnEncounter) {
    state.encounterDeck = discardEncounter(state.encounterDeck, state.drawnEncounter.id);
    state.drawnEncounter = null;
  }
}

/**
 * Handle the Quick Advance encounter card effect for a chosen monster.
 * Moves the monster one step closer toward the active hero.
 */
function handleQuickAdvanceEffect(state: GameState, chosenMonster: MonsterState): void {
  const monsterDef = getMonsterById(chosenMonster.monsterId);
  const activeHeroToken = state.heroTokens[state.turnState.currentHeroIndex];
  
  if (activeHeroToken) {
    // HeroToken.position is already in global coordinates
    const heroGlobal = activeHeroToken.position;
    
    const moveResult = findMoveTowardHero(
      chosenMonster,
      heroGlobal,
      state.heroTokens,
      state.monsters,
      state.dungeon
    );
    
    if (moveResult) {
      // If multiple equally-good positions exist, just pick the first one
      const destination = 'needsChoice' in moveResult ? moveResult.positions[0] : moveResult;
      
      const newTileId = findTileForGlobalPosition(destination, state.dungeon);
      const localPos = newTileId ? globalToLocalPosition(destination, newTileId, state.dungeon) : null;
      
      if (newTileId && localPos) {
        chosenMonster.position = localPos;
        chosenMonster.tileId = newTileId;
        state.encounterEffectMessage = `${monsterDef?.name || 'Monster'} moved closer`;
        
        // Check for Blade Barrier tokens at destination
        const bladeBarrierCheck = checkBladeBarrierDamage(destination, state.boardTokens || []);
        if (bladeBarrierCheck.shouldDamage && bladeBarrierCheck.tokenToRemove) {
          chosenMonster.currentHp = Math.max(0, chosenMonster.currentHp - 1);
          state.boardTokens = state.boardTokens.filter(token => token.id !== bladeBarrierCheck.tokenToRemove);
          state.encounterEffectMessage = `${monsterDef?.name || 'Monster'} moved closer and hit Blade Barrier (1 damage)`;
        }
      } else {
        state.encounterEffectMessage = `${monsterDef?.name || 'Monster'} couldn't move closer`;
      }
    } else {
      state.encounterEffectMessage = `${monsterDef?.name || 'Monster'} couldn't move closer`;
    }
  } else {
    state.encounterEffectMessage = `${monsterDef?.name || 'Monster'} couldn't move closer`;
  }
  
  // Discard the encounter card
  if (state.drawnEncounter) {
    state.encounterDeck = discardEncounter(state.encounterDeck, state.drawnEncounter.id);
    state.drawnEncounter = null;
  }
}

/**
 * Handle the full chamber entrance reveal sequence: mark revealed, place room set tiles,
 * spawn villain, fire chamber-reveal event, and register scenario hooks.
 * Called from both hero exploration and monster-triggered exploration.
 */
function handleChamberEntranceRevealed(state: GameState, newTile: DungeonTile): void {
  state.scenario.chamberRevealed = true;
  state.logEntries.push({
    id: state.logEntryCounter++,
    timestamp: Date.now(),
    type: 'exploration',
    message: `🚪 Chamber Entrance revealed!`,
    details: `The way to the final chamber is open.`,
  });

  // Place room set tiles if the scenario defines one
  const scenarioDef = getScenarioById(state.selectedScenarioId);
  if (scenarioDef.roomSet) {
    const roomSetTileIds: string[] = [];
    const placedRoomSetIds = new Set<string>([newTile.id]);

    for (const roomTile of scenarioDef.roomSet.tiles) {
      const dirOrder: Record<string, number> = { north: 0, east: 1, west: 2, south: 3 };
      const availableEdges = state.dungeon.unexploredEdges
        .filter(e => placedRoomSetIds.has(e.tileId))
        .sort((a, b) => {
          const aIsEntrance = a.tileId === newTile.id ? 1 : 0;
          const bIsEntrance = b.tileId === newTile.id ? 1 : 0;
          if (aIsEntrance !== bIsEntrance) return aIsEntrance - bIsEntrance;
          const aOrder = roomSetTileIds.indexOf(a.tileId);
          const bOrder = roomSetTileIds.indexOf(b.tileId);
          if (aOrder !== bOrder) return aOrder - bOrder;
          return (dirOrder[a.direction] ?? 9) - (dirOrder[b.direction] ?? 9);
        });

      if (availableEdges.length === 0) break;
      const edge = availableEdges[0];

      const placedRoomTile = placeTile(edge, roomTile.tileType, state.dungeon);
      if (!placedRoomTile) break;

      state.dungeon = updateDungeonAfterExploration(state.dungeon, edge, placedRoomTile);
      roomSetTileIds.push(placedRoomTile.id);
      placedRoomSetIds.add(placedRoomTile.id);
      state.logEntries.push({
        id: state.logEntryCounter++,
        timestamp: Date.now(),
        type: 'exploration',
        message: `🏛️ ${scenarioDef.roomSet.name}: placed ${roomTile.tileType}`,
        details: `Room set tile placed at col:${placedRoomTile.position.col} row:${placedRoomTile.position.row}`,
      });
    }
    state.recentlyPlacedRoomSetTileIds = roomSetTileIds;
  }

  // Spawn the scenario villain if this scenario has one
  const villainDef = getVillainDefForScenario(state.selectedScenarioId);
  if (villainDef && !state.villain) {
    const allRoomTiles = state.dungeon.tiles.filter(
      t => state.recentlyPlacedRoomSetTileIds.includes(t.id)
    );
    const spawnTile = allRoomTiles.length > 0 ? allRoomTiles[0] : newTile;
    const spawnPos = getMonsterSpawnPosition(spawnTile, state.monsters);
    if (spawnPos) {
      const heroCount = state.heroTokens.length;
      const maxHp = calculateVillainHp(villainDef, heroCount);
      const instanceId = `villain-${villainDef.id}`;
      const villain: VillainInstance = {
        villainId: villainDef.id,
        instanceId,
        position: spawnPos,
        tileId: spawnTile.id,
        currentHp: maxHp,
        maxHp,
        statuses: [],
      };
      state.villain = villain;
      state.scenario.villainInstanceId = instanceId;

      state.logEntries.push({
        id: state.logEntryCounter++,
        timestamp: Date.now(),
        type: 'exploration',
        message: `⚔️ ${villainDef.name} appears!`,
        details: `The villain spawns with ${maxHp} HP (AC ${villainDef.ac}).`,
      });
    }
  }

  // Fire the chamber-reveal event for scenario hooks
  const chamberRevealHero = state.heroTokens[state.turnState.currentHeroIndex];
  if (chamberRevealHero) {
    const chamberRevealEvent: ChamberRevealEvent = {
      type: 'chamber-reveal',
      heroId: chamberRevealHero.heroId,
      turnNumber: state.turnState.turnNumber,
      chamberType: getScenarioById(state.selectedScenarioId).roomSet?.name ?? 'chamber',
      position: newTile.position,
      heroIds: state.heroTokens.map(t => t.heroId),
    };
    const chamberResult = triggerGameEvent(state.eventHooks, chamberRevealEvent);

    for (const effect of chamberResult.applyHeroStatusEffects) {
      const heroIds = effect.heroId === '*'
        ? state.heroTokens.map(t => t.heroId)
        : [effect.heroId];
      for (const heroId of heroIds) {
        const heroHp = state.heroHp.find(h => h.heroId === heroId);
        if (heroHp) {
          heroHp.statuses = applyStatusEffect(
            heroHp.statuses ?? [],
            effect.statusType,
            'scenario-chamber-reveal',
            state.turnState.turnNumber,
            effect.duration
          );
          state.logEntries.push({
            id: state.logEntryCounter++,
            timestamp: Date.now(),
            type: 'game-event',
            message: `✨ ${heroId} is ${effect.statusType} (chamber reveal effect)`,
            details: `Duration: ${effect.duration ?? 'indefinite'} turn(s).`,
            heroId,
          });
        }
      }
    }

    if (chamberResult.activatePersistentModifiers.length > 0) {
      state.scenario.activePersistentModifiers.push(...chamberResult.activatePersistentModifiers);
      for (const mod of chamberResult.activatePersistentModifiers) {
        let modDesc: string;
        if (mod.type === 'hero-daily-damage-bonus') {
          modDesc = `+${mod.bonus} Daily Power damage`;
        } else if (mod.type === 'monster-ac-bonus') {
          modDesc = `+${mod.bonus} Monster AC`;
        } else {
          modDesc = `Reflect natural-1 (${mod.damage} damage)`;
        }
        state.logEntries.push({
          id: state.logEntryCounter++,
          timestamp: Date.now(),
          type: 'game-event',
          message: `🔥 Workshop Aura: ${modDesc}`,
          details: 'Persistent modifier active for the rest of the game.',
        });
      }
    }

    const chamberScenarioDef = getScenarioById(state.selectedScenarioId);
    if (chamberScenarioDef.id === 'adventure-14') {
      state.eventHooks = registerDynamicScenarioHook(
        state.eventHooks,
        'attack-miss',
        createReflectNaturalOneHandler(),
        100
      );
    }
  }
}

export interface StartGamePayload {
  heroIds: string[];
  /** Optional positions for deterministic testing. If not provided, positions are randomly assigned. */
  positions?: Position[];
  /** Optional seed for random number generation. If not provided, uses current timestamp. */
  seed?: number;
}

/**
 * Calculate the encounter cancel cost for the given game state, factoring in Perseverance card.
 * This is an inline helper to avoid passing a Draft to external functions.
 */
function getModifiedEncounterCancelCost(
  heroTokens: HeroToken[],
  dungeon: DungeonState,
  eventHooks: EventHookState,
  currentHeroIndex: number,
  baseCost: number
): number {
  const currentHeroId = heroTokens[currentHeroIndex]?.heroId;
  if (!currentHeroId) return baseCost;

  const currentHero = heroTokens.find(t => t.heroId === currentHeroId);
  if (!currentHero) return baseCost;

  // Simple tile check - get the sub-tile/tile of the current hero
  const getTileId = getTileOrSubTileId;
  const currentTileId = getTileId(currentHero.position, dungeon);
  if (!currentTileId) return baseCost;

  // Find all heroes on the same tile
  const heroesOnTile = heroTokens.filter(token => {
    const tileId = getTileId(token.position, dungeon);
    return tileId === currentTileId;
  });

  // Check if any hero on the tile has Perseverance (ID 10) hook active
  const hasPerseverance = heroesOnTile.some(hero =>
    Object.values(eventHooks.hooks).some(
      reg => reg.powerCardId === 10 && reg.heroId === hero.heroId
    )
  );

  if (!hasPerseverance) return baseCost;

  // Perseverance reduces cost by number of heroes on tile
  return Math.max(0, baseCost - heroesOnTile.length);
}

/**
 * Convert a global position back to local tile coordinates for the villain.
 * Falls back to the original position if the tile is not found.
 */
function globalToLocalForVillain(
  globalPos: Position,
  tileId: string,
  dungeon: DungeonState
): Position {
  const tile = dungeon.tiles.find(t => t.id === tileId);
  if (!tile) return globalPos;
  const b = getTileBounds(tile);
  return { x: globalPos.x - b.minX, y: globalPos.y - b.minY };
}

/**
 * Build a detailed per-target summary string for encounter effect log entries.
 * Includes attack roll information (if applicable), damage taken, and status effects.
 */
function buildDetailedResultSummaries(results: EncounterResultTarget[]): string {
  return results.map(r => {
    const lines = [`${r.heroName}:`];
    if (r.attackRoll !== undefined && r.attackTotal !== undefined && r.targetAC !== undefined) {
      lines.push(`  Attack roll: ${r.attackRoll} (total ${r.attackTotal}) vs AC ${r.targetAC} → ${r.wasHit ? 'Hit' : 'Miss'}`);
    }
    if (r.damageTaken > 0) {
      lines.push(`  Damage taken: ${r.damageTaken}`);
    }
    if (r.statusesApplied && r.statusesApplied.length > 0) {
      lines.push(`  Status: ${r.statusesApplied.join(', ')}`);
    }
    return lines.join('\n');
  }).join('\n');
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

      // Resolve the selected scenario definition (used for deck setup and scenario state)
      const scenarioDef = getScenarioById(state.selectedScenarioId);

      // Initialize turn state
      state.turnState = { ...DEFAULT_TURN_STATE };

      // Clear any movement state
      state.validMoveSquares = [];
      state.showingMovement = false;

      // Initialize dungeon with start tile and shuffled tile deck
      const dungeon = initializeDungeon();
      // Use scenario-specific deck setup if defined, otherwise shuffle randomly
      if (scenarioDef.deckSetup) {
        dungeon.tileDeck = applyDeckSetup([...INITIAL_TILE_DECK], scenarioDef.deckSetup, randomFn);
      } else {
        dungeon.tileDeck = initializeTileDeck([...INITIAL_TILE_DECK], randomFn);
      }
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
      state.monsterAttackName = null;
      state.villainPhaseMonsterIndex = 0;

      // Initialize hero turn actions for the first hero
      state.heroTurnActions = { ...DEFAULT_HERO_TURN_ACTIONS };

      // Initialize scenario state from the selected scenario definition
      const hasVillainWinCondition = scenarioDef.winConditions?.some(c => c.type === 'defeat-villain') ?? false;
      state.scenario = {
        scenarioId: state.selectedScenarioId,
        monstersDefeated: 0,
        monstersToDefeat: scenarioDef.monstersToDefeat,
        objective: scenarioDef.goal,
        title: scenarioDef.title,
        description: scenarioDef.intro,
        introductionShown: false,
        chamberRevealed: false,
        villainInstanceId: null,
        activePersistentModifiers: [],
        // For villain-hunt scenarios, the mini-stack tiles are the tiles players must explore
        // before the chamber entrance appears, so miniStackSize equals the number of tiles to find the chamber.
        tilesForChamber: hasVillainWinCondition && scenarioDef.deckSetup ? scenarioDef.deckSetup.miniStackSize : null,
        tilesExplored: 0,
        roomSetName: scenarioDef.roomSet?.name ?? null,
      };

      // Reset villain state
      state.villain = null;
      state.villainAttackResult = null;
      state.villainAttackTargetId = null;
      state.villainAttackName = null;
      state.villainAreaAttackResults = null;
      state.villainAreaAttackTargetIds = null;

      // Initialize party resources (XP starts at 0)
      state.partyResources = { ...DEFAULT_PARTY_RESOURCES };
      state.defeatedMonsterXp = null;
      state.defeatedMonsterName = null;
      state.leveledUpHeroId = null;
      state.levelUpOldStats = null;

      // Initialize encounter deck
      state.encounterDeck = initializeEncounterDeck(randomFn);
      state.drawnEncounter = null;
      
      // Clear environment cards and effects
      state.activeEnvironmentId = null;
      
      // Clear traps, hazards, and board tokens
      state.traps = [];
      state.hazards = [];
      state.trapInstanceCounter = 0;
      state.hazardInstanceCounter = 0;
      state.boardTokens = [];
      state.boardTokenInstanceCounter = 0;

      // Initialize treasure deck and hero inventories
      state.treasureDeck = initializeTreasureDeck(randomFn);
      state.drawnTreasure = null;
      state.dragonsTributeSecondTreasure = null;
      state.heroInventories = {};
      for (const heroId of heroIds) {
        state.heroInventories[heroId] = createHeroInventory(heroId);
      }
      state.treasureDrawnThisTurn = false;
      
      // Clear encounter effect messages
      state.encounterEffectMessage = null;
      state.badLuckExtraEncounterPending = false;

      // Initialize event hook system and register scenario-scoped hooks
      state.eventHooks = registerScenarioHooks(scenarioDef, initializeEventHooks());
      state.pendingPowerCardFlips = [];
      state.encounterCancelCost = ENCOUNTER_CANCEL_COST;

      // Show scenario introduction on game start
      state.showScenarioIntroduction = true;

      // Add "game started" log entry
      const gameStartLogEntry: import('./types').LogEntry = {
        id: state.logEntryCounter++,
        timestamp: Date.now(),
        type: 'game-event',
        message: '🎮 Game Started',
        details: `${heroIds.length} hero${heroIds.length > 1 ? 'es' : ''} begin their adventure into the Mountain. ${state.scenario.objective}`,
      };
      state.logEntries.push(gameStartLogEntry);

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
    setHeroTurnActions: (
      state,
      action: PayloadAction<HeroTurnActions>,
    ) => {
      state.heroTurnActions = action.payload;
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
      
      // Check if hero can move based on status effects (e.g., cage curse)
      const heroStatuses = getHeroStatuses(state, heroId);
      if (!canMoveWithStatus(heroStatuses)) {
        return;
      }
      
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
      
      // Check if hero can move based on status effects (e.g., cage curse)
      const heroStatuses = getHeroStatuses(state, heroId);
      if (!canMoveWithStatus(heroStatuses)) {
        return;
      }
      
      // Verify this is a valid move destination
      if (!isValidMoveDestination(position, state.validMoveSquares)) {
        return;
      }
      
      const token = state.heroTokens.find((t) => t.heroId === heroId);
      if (!token) return;
      
      // Store old position to check for tile change (for Dragon Fear curse)
      const oldPosition = { ...token.position };
      
      // Calculate distance moved (for incremental movement tracking)
      // Use BFS path distance to correctly account for paths around corners and obstacles.
      // Chebyshev distance (Math.max(|dx|, |dy|)) would undercount movement around corners.
      const distance = calculateMoveCost(token.position, position, state.dungeon);
      
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
      
      // Track that the hero moved this phase (for Gap in the Armor curse)
      state.heroMovedThisPhase = true;
      
      // Check if hero moved to a new tile (for Dragon Fear curse)
      const movedToNewTile = !areOnSameTile(oldPosition, position, state.dungeon);
      
      // Apply Dragon Fear curse damage if hero moved to a new tile
      if (movedToNewTile) {
        const heroHpIndex = state.heroHp.findIndex(hp => hp.heroId === heroId);
        if (heroHpIndex !== -1) {
          const heroHp = state.heroHp[heroHpIndex];
          if (hasStatusEffect(heroHp.statuses ?? [], 'curse-dragon-fear')) {
            // Apply Dragon Fear damage
            const newHp = Math.max(0, heroHp.currentHp - DRAGON_FEAR_DAMAGE);
            state.heroHp[heroHpIndex] = {
              ...heroHp,
              currentHp: newHp,
            };
            
            // Set encounter effect message for Dragon Fear damage
            const message = `${heroId} takes ${DRAGON_FEAR_DAMAGE} damage from Dragon Fear curse. Roll 10+ at end of Hero Phase to remove.`;
            if (state.encounterEffectMessage) {
              state.encounterEffectMessage += ` | ${message}`;
            } else {
              state.encounterEffectMessage = message;
            }
            
            // Check for party defeat
            if (checkPartyDefeat(state.heroHp, state.partyResources)) {
              state.partyDefeated = true;
            }
          }
        }
      }
      
      // Check for treasure tokens on the destination tile
      const treasureTokensOnTile = getTreasureTokensOnTile(position, state.treasureTokens);
      if (treasureTokensOnTile.length > 0 && !state.treasureDrawnThisTurn) {
        // Collect the first treasure token
        const treasureToken = treasureTokensOnTile[0];
        
        // Remove treasure token from board
        state.treasureTokens = state.treasureTokens.filter(t => t.id !== treasureToken.id);
        
        // Check if Dragon's Tribute environment is active
        const isDragonsTribute = state.activeEnvironmentId === 'dragons-tribute';
        
        // Draw treasure card(s) for the hero
        const { treasure, deck: updatedDeck } = drawTreasure(state.treasureDeck);
        state.treasureDeck = updatedDeck;
        
        if (treasure) {
          state.drawnTreasure = treasure;
          state.treasureDrawnThisTurn = true;
          
          // If Dragon's Tribute is active, draw a second treasure
          if (isDragonsTribute) {
            const { treasure: secondTreasure, deck: updatedDeck2 } = drawTreasure(state.treasureDeck);
            state.treasureDeck = updatedDeck2;
            
            if (secondTreasure) {
              state.dragonsTributeSecondTreasure = secondTreasure;
            }
          }
          
          // Set message about collecting treasure
          const message = isDragonsTribute && state.dragonsTributeSecondTreasure
            ? `${heroId} collected treasure token! (Dragon's Tribute: Draw 2, discard higher)`
            : `${heroId} collected treasure token!`;
          if (state.encounterEffectMessage) {
            state.encounterEffectMessage += ` | ${message}`;
          } else {
            state.encounterEffectMessage = message;
          }
        }
      }
      
      // Check for volcanic vapors hazard on destination tile - hero becomes Poisoned
      const hazardsOnDestTile = getHazardsOnTile(position, state.hazards);
      const hasVolcanicVapors = hazardsOnDestTile.some(h => h.encounterId === 'volcanic-vapors');
      if (hasVolcanicVapors) {
        const heroHpIndex = state.heroHp.findIndex(hp => hp.heroId === heroId);
        if (heroHpIndex !== -1) {
          const heroHp = state.heroHp[heroHpIndex];
          const updatedStatuses = applyStatusEffect(
            heroHp.statuses ?? [],
            'poisoned',
            'volcanic-vapors',
            state.turnState.turnNumber
          );
          state.heroHp[heroHpIndex] = { ...heroHp, statuses: updatedStatuses };
          const message = `${heroId} is Poisoned by Volcanic Vapors!`;
          if (state.encounterEffectMessage) {
            state.encounterEffectMessage += ` | ${message}`;
          } else {
            state.encounterEffectMessage = message;
          }
        }
      }
      
      // Check if all movement is used or if this completes the move action
      if (state.incrementalMovement.remainingMovement <= 0) {
        // Movement complete - mark move action as taken
        state.incrementalMovement.inProgress = false;
        const heroStatuses = getHeroStatuses(state, heroId);
        state.heroTurnActions = computeHeroTurnActions(state.heroTurnActions, 'move', heroStatuses);
        // Clear movement overlay
        state.validMoveSquares = [];
        state.showingMovement = false;
        // Log movement completion
        const movingHero = AVAILABLE_HEROES.find(h => h.id === heroId);
        const movingHeroName = movingHero?.name ?? heroId;
        const startPos = state.incrementalMovement.startingPosition;
        const squaresUsed = state.incrementalMovement.totalSpeed;
        state.logEntries.push({
          id: state.logEntryCounter++,
          timestamp: Date.now(),
          type: 'hero-action',
          message: `${movingHeroName} moved ${squaresUsed} square${squaresUsed !== 1 ? 's' : ''}`,
          details: `From (${startPos.x}, ${startPos.y}) to (${position.x}, ${position.y})`,
          heroId,
        });
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
      
      // Capture movement info before clearing state
      const heroId = state.incrementalMovement.heroId;
      const startPos = state.incrementalMovement.startingPosition;
      const totalSpeed = state.incrementalMovement.totalSpeed;
      const squaresUsed = totalSpeed - state.incrementalMovement.remainingMovement;
      const heroToken = state.heroTokens.find(t => t.heroId === heroId);
      
      // Mark movement as complete and discard remaining movement
      state.incrementalMovement.inProgress = false;
      state.incrementalMovement.remainingMovement = 0;
      
      // Track the move action
      const heroStatuses = getHeroStatuses(state, heroId);
      state.heroTurnActions = computeHeroTurnActions(state.heroTurnActions, 'move', heroStatuses);
      
      // Clear movement overlay
      state.validMoveSquares = [];
      state.showingMovement = false;
      
      // Clear undo snapshot (completing the move is a commitment)
      state.undoSnapshot = null;
      
      // Log movement completion
      if (squaresUsed > 0 && heroToken) {
        const movingHero = AVAILABLE_HEROES.find(h => h.id === heroId);
        const movingHeroName = movingHero?.name ?? heroId;
        const endPos = heroToken.position;
        state.logEntries.push({
          id: state.logEntryCounter++,
          timestamp: Date.now(),
          type: 'hero-action',
          message: `${movingHeroName} moved ${squaresUsed} square${squaresUsed !== 1 ? 's' : ''}`,
          details: `From (${startPos.x}, ${startPos.y}) to (${endPos.x}, ${endPos.y})`,
          heroId,
        });
      }
    },
    /**
     * Record Flaming Sphere movement as the hero's movement action
     * This is used when moving the Flaming Sphere token instead of the hero
     */
    recordFlamingSphereMovement: (
      state,
      action: PayloadAction<{ heroId: string }>
    ) => {
      if (state.turnState.currentPhase !== "hero-phase") return;
      if (!state.heroTurnActions.canMove) return;
      
      // Record the move action
      const heroStatuses = getHeroStatuses(state, action.payload.heroId);
      state.heroTurnActions = computeHeroTurnActions(state.heroTurnActions, 'move', heroStatuses);
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
      state.monsterAttackName = null;
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
      state.victoryReason = null;
      state.encounterDeck = { drawPile: [], discardPile: [] };
      state.drawnEncounter = null;
      state.activeEnvironmentId = null;
      state.traps = [];
      state.hazards = [];
      state.trapInstanceCounter = 0;
      state.hazardInstanceCounter = 0;
      state.boardTokens = [];
      state.boardTokenInstanceCounter = 0;
      state.showActionSurgePrompt = false;
      state.multiAttackState = null;
      state.pendingMoveAttack = null;
      state.pendingMoveAfterAttack = null;
      state.treasureDeck = { drawPile: [], discardPile: [] };
      state.drawnTreasure = null;
      state.dragonsTributeSecondTreasure = null;
      state.heroInventories = {};
      state.treasureDrawnThisTurn = false;
      state.incrementalMovement = null;
      state.undoSnapshot = null;
      state.encounterEffectMessage = null;
      state.badLuckExtraEncounterPending = false;
      state.trapDisableResult = null;
      state.villain = null;
      state.villainActivation = null;
      state.villainAttackResult = null;
      state.villainAttackTargetId = null;
      state.villainAttackName = null;
      state.villainAreaAttackResults = null;
      state.villainAreaAttackTargetIds = null;
      state.villainActivatedThisTurn = false;
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
      
      // Don't end hero phase if attack result is still displayed
      // This ensures the player has time to review the attack outcome
      // before the exploration phase begins
      if (state.attackResult !== null) {
        return;
      }
      
      // Don't end hero phase if a move-after-attack (e.g. Righteous Advance) is pending
      // The player must complete or skip the movement before the phase can end
      if (state.pendingMoveAfterAttack) {
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
        const heroId = state.incrementalMovement.heroId;
        const heroStatuses = getHeroStatuses(state, heroId);
        state.heroTurnActions = computeHeroTurnActions(state.heroTurnActions, 'move', heroStatuses);
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
        // Hero is on edge - prepare for exploration
        // Draw a tile from the deck
        const { drawnTile, remainingDeck } = drawTile(state.dungeon.tileDeck);
        
        if (drawnTile) {
          // Draw a monster from the deck for later placement
          const { monster: drawnMonsterId, deck: updatedMonsterDeck } = drawMonster(state.monsterDeck);
          
          // Set up exploration phase state
          state.explorationPhase = {
            step: 'awaiting-tile',
            drawnTile,
            exploredEdge,
            drawnMonster: drawnMonsterId,
          };
          
          // Update decks
          state.dungeon.tileDeck = remainingDeck;
          state.monsterDeck = updatedMonsterDeck;
          
          // Log exploration trigger
          const exploringHero = AVAILABLE_HEROES.find(h => h.id === currentToken.heroId);
          const exploringHeroName = exploringHero?.name ?? currentToken.heroId;
          state.logEntries.push({
            id: state.logEntryCounter++,
            timestamp: Date.now(),
            type: 'exploration',
            message: `🗺️ ${exploringHeroName} explores to the ${exploredEdge.direction}`,
            details: `Position (${currentToken.position.x}, ${currentToken.position.y}) | Tiles remaining: ${remainingDeck.length}`,
            heroId: currentToken.heroId,
          });
        }
      } else if (exploredEdge && state.dungeon.tileDeck.length === 0) {
        // Hero is on an unexplored edge but the tile deck is empty
        const scenarioDef = getScenarioById(state.selectedScenarioId);
        if (scenarioDef.defeatedIfDeckExhausted && !state.scenario.chamberRevealed) {
          // Adventure 15: defeat if deck runs out before the chamber is revealed
          state.defeatReason = 'The mountain collapses. The Chamber Entrance was never found — the dungeon tile deck is exhausted.';
          state.currentScreen = 'defeat';
          return;
        }
        // No tiles remain but no defeat condition — skip exploration
        state.explorationPhase = {
          step: 'skipped',
          drawnTile: null,
          exploredEdge: null,
          drawnMonster: null,
        };
        state.explorationPhaseMessage = 'Tile deck exhausted,\nskipping exploration';
      } else {
        // No exploration - hero not on unexplored edge
        state.explorationPhase = {
          step: 'skipped',
          drawnTile: null,
          exploredEdge: null,
          drawnMonster: null,
        };
        state.explorationPhaseMessage = 'Not on unexplored edge,\nskipping exploration';
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
          
          const envResult = applyEndOfHeroPhaseEnvironmentEffects(
            state.activeEnvironmentId,
            state.heroHp,
            activeHeroId,
            activeHeroPos,
            allHeroPositions,
            state.dungeon
          );
          state.heroHp = envResult.heroHpList;
          
          // Log environment effect if it triggered
          if (envResult.effects.length > 0) {
            const envCard = getEncounterById(state.activeEnvironmentId);
            const targetSummaries = envResult.effects
              .filter(r => r.damageTaken > 0)
              .map(r => `${r.heroName}: ${r.damageTaken} dmg`);
            if (targetSummaries.length > 0) {
              state.logEntries.push({
                id: state.logEntryCounter++,
                timestamp: Date.now(),
                type: 'encounter',
                message: `Environment effect: ${envCard?.name ?? state.activeEnvironmentId} - ${targetSummaries.join('; ')}`,
                details: envCard?.description,
                extendedDetails: `Effect: ${envCard?.effect.description}`,
              });
            }
          }
          
          // Check for party defeat after environment effect
          const allHeroesDefeated = state.heroHp.every(h => h.currentHp <= 0);
          if (allHeroesDefeated) {
            state.defeatReason = `The party was overwhelmed by environment effects.`;
            state.currentScreen = "defeat";
            return;
          }
        }
      }
      
      // Attempt to remove Dragon Fear curse at end of Hero Phase
      const currentHeroId = state.heroTokens[state.turnState.currentHeroIndex]?.heroId;
      if (currentHeroId) {
        const heroHpIndex = state.heroHp.findIndex(h => h.heroId === currentHeroId);
        if (heroHpIndex !== -1) {
          const heroHp = state.heroHp[heroHpIndex];
          if (hasStatusEffect(heroHp.statuses ?? [], 'curse-dragon-fear')) {
            const roll = rollD20();
            const statuses = heroHp.statuses ?? [];
            const { updatedStatuses, removed } = attemptCurseRemoval(statuses, 'curse-dragon-fear', roll);
            
            // Update hero's status effects
            state.heroHp[heroHpIndex] = {
              ...state.heroHp[heroHpIndex],
              statuses: updatedStatuses,
            };
            
            // Set message for curse removal attempt
            if (removed) {
              state.encounterEffectMessage = `${currentHeroId} rolled ${roll} - Dragon Fear curse removed!`;
            } else {
              state.encounterEffectMessage = `${currentHeroId} rolled ${roll} - Dragon Fear curse persists (need 10+)`;
            }
          }
        }
      }
      
      // Remove Gap in the Armor curse if hero didn't move during Hero Phase
      if (currentHeroId) {
        const heroHpIndex = state.heroHp.findIndex(h => h.heroId === currentHeroId);
        if (heroHpIndex !== -1) {
          const heroHp = state.heroHp[heroHpIndex];
          if (hasStatusEffect(heroHp.statuses ?? [], 'curse-gap-in-armor') && !state.heroMovedThisPhase) {
            // Remove the curse because hero didn't move
            const statuses = heroHp.statuses ?? [];
            const updatedStatuses = removeStatusEffect(statuses, 'curse-gap-in-armor');
            
            // Update hero's status effects
            state.heroHp[heroHpIndex] = {
              ...state.heroHp[heroHpIndex],
              statuses: updatedStatuses,
            };
            
            // Set message for curse removal
            state.encounterEffectMessage = `${currentHeroId}'s A Gap in the Armor curse removed (did not move)`;
          }
        }
      }
      
      // Fire hero-phase-end event for scenario hooks (e.g. Heat Exhaustion for Adventure 15)
      const heroPhaseEndToken = state.heroTokens[state.turnState.currentHeroIndex];
      if (heroPhaseEndToken) {
        const heroTileForEnd = findTileAtPosition(heroPhaseEndToken.position, state.dungeon);
        const heroTileDefForEnd = heroTileForEnd ? getTileDefinition(heroTileForEnd.tileType) : null;
        const heroPhaseEndEvent: HeroPhaseEndEvent = {
          type: 'hero-phase-end',
          heroId: heroPhaseEndToken.heroId,
          turnNumber: state.turnState.turnNumber,
          currentTileFeatures: heroTileDefForEnd?.terrainFeatures ?? [],
        };
        const heroPhaseEndResult = triggerGameEvent(state.eventHooks, heroPhaseEndEvent);
        // Apply status effects (e.g. Heat Exhaustion → Slowed on Volcanic Vent tiles)
        for (const effect of heroPhaseEndResult.applyHeroStatusEffects) {
          const heroIds = effect.heroId === '*'
            ? state.heroTokens.map(t => t.heroId)
            : [effect.heroId];
          for (const hId of heroIds) {
            const heroHpIdx = state.heroHp.findIndex(h => h.heroId === hId);
            if (heroHpIdx !== -1) {
              state.heroHp[heroHpIdx].statuses = applyStatusEffect(
                state.heroHp[heroHpIdx].statuses ?? [],
                effect.statusType,
                'scenario-hero-phase-end',
                state.turnState.turnNumber,
                effect.duration
              );
              state.logEntries.push({
                id: state.logEntryCounter++,
                timestamp: Date.now(),
                type: 'game-event',
                message: `🌋 Heat Exhaustion: ${hId} is ${effect.statusType}`,
                details: `Duration: ${effect.duration ?? 'indefinite'} turn(s).`,
                heroId: hId,
              });
            }
          }
        }
      }

      // Transition to exploration phase
      state.turnState.currentPhase = "exploration-phase";
    },
    /**
     * Advance exploration phase to next step (place tile)
     */
    placeExplorationTile: (state) => {
      if (state.turnState.currentPhase !== "exploration-phase") {
        return;
      }
      
      if (state.explorationPhase.step !== 'awaiting-tile') {
        return;
      }
      
      const { drawnTile, exploredEdge } = state.explorationPhase;
      const currentToken = state.heroTokens[state.turnState.currentHeroIndex];
      
      if (!drawnTile || !exploredEdge || !currentToken) {
        return;
      }
      
      // Place the new tile
      const newTile = placeTile(exploredEdge, drawnTile, state.dungeon);
      
      if (newTile) {
        // Track the recently placed tile for animation
        state.recentlyPlacedTileId = newTile.id;
        
        // Check if this is a black or white tile
        const tileDef = getTileDefinition(drawnTile);
        const isBlackTile = tileDef?.isBlackTile ?? true;
        
        // Track tile colors for encounter logic
        if (isBlackTile) {
          state.turnState.drewOnlyWhiteTilesThisTurn = false;
        } else {
          if (!state.turnState.exploredThisTurn) {
            state.turnState.drewOnlyWhiteTilesThisTurn = true;
          }
        }
        
        // Mark that exploration occurred this turn
        state.turnState.exploredThisTurn = true;
        
        // Update dungeon state
        state.dungeon = updateDungeonAfterExploration(
          state.dungeon,
          exploredEdge,
          newTile
        );
        
        // Log tile placement
        const tileColor = isBlackTile ? 'Black' : 'White';
        state.logEntries.push({
          id: state.logEntryCounter++,
          timestamp: Date.now(),
          type: 'exploration',
          message: `New tile revealed to the ${exploredEdge.direction} (${tileColor} arrow)`,
          details: `Tile type: ${drawnTile} | New exits added to dungeon`,
        });

        // Fire the tile-reveal event for scenario hooks (e.g. Heat Exhaustion terrain check)
        const tileRevealHero = state.heroTokens[state.turnState.currentHeroIndex];
        if (tileRevealHero) {
          const tileRevealEvent: TileRevealEvent = {
            type: 'tile-reveal',
            heroId: tileRevealHero.heroId,
            turnNumber: state.turnState.turnNumber,
            tileId: newTile.id,
            tileType: drawnTile,
            terrainFeatures: tileDef?.terrainFeatures ?? [],
            position: newTile.position,
          };
          triggerGameEvent(state.eventHooks, tileRevealEvent);
        }

        // Track tiles explored towards finding the chamber (before chamber is revealed)
        if (state.scenario.tilesForChamber != null && !state.scenario.chamberRevealed && !tileDef?.isChamberEntrance) {
          state.scenario.tilesExplored = (state.scenario.tilesExplored ?? 0) + 1;
        }

        // Detect Chamber Entrance placement and trigger full reveal sequence
        if (tileDef?.isChamberEntrance) {
          handleChamberEntranceRevealed(state, newTile);
        }

        
        // Long Hallway special rule: automatically draw and place a second tile on its unexplored edge
        if (tileDef?.isLongHallway && state.dungeon.tileDeck.length > 0) {
          const hallwayUnexploredEdge = state.dungeon.unexploredEdges.find(e => e.tileId === newTile.id);
          if (hallwayUnexploredEdge) {
            const { drawnTile: secondTileType, remainingDeck: deckAfterSecond } = drawTile(state.dungeon.tileDeck);
            if (secondTileType) {
              const secondTile = placeTile(hallwayUnexploredEdge, secondTileType, state.dungeon);
              if (secondTile) {
                const secondTileDef = getTileDefinition(secondTileType);
                const isSecondTileBlack = secondTileDef?.isBlackTile ?? true;
                
                // Update encounter tracking: if second tile is black, an encounter will be drawn
                if (isSecondTileBlack) {
                  state.turnState.drewOnlyWhiteTilesThisTurn = false;
                }
                
                // Update dungeon state with second tile
                state.dungeon = updateDungeonAfterExploration(state.dungeon, hallwayUnexploredEdge, secondTile);
                state.dungeon.tileDeck = deckAfterSecond;
                
                // Log second tile placement
                const secondTileColor = isSecondTileBlack ? 'Black' : 'White';
                state.logEntries.push({
                  id: state.logEntryCounter++,
                  timestamp: Date.now(),
                  type: 'exploration',
                  message: `🏛️ Long Hallway: second tile revealed to the ${hallwayUnexploredEdge.direction} (${secondTileColor} arrow)`,
                  details: `Tile type: ${secondTileType} | Long Hallway special rule`,
                });
              }
            }
          }
        }
        
        // Move to next step
        state.explorationPhase.step = 'awaiting-monster';
      }
    },
    /**
     * Advance exploration phase to add monster
     */
    addExplorationMonster: (state) => {
      if (state.turnState.currentPhase !== "exploration-phase") {
        return;
      }
      
      if (state.explorationPhase.step !== 'awaiting-monster') {
        return;
      }
      
      const { drawnMonster } = state.explorationPhase;
      const currentToken = state.heroTokens[state.turnState.currentHeroIndex];
      
      if (!drawnMonster || !currentToken) {
        // No monster to place, mark as complete
        state.explorationPhase.step = 'complete';
        return;
      }
      
      // Find the recently placed tile
      const newTile = state.dungeon.tiles.find(t => t.id === state.recentlyPlacedTileId);
      
      if (newTile) {
        // Use spawn function to handle multi-monster spawns
        const spawnResult = spawnMonstersWithBehavior(
          drawnMonster,
          newTile,
          currentToken.heroId,
          state.monsters,
          state.monsterInstanceCounter,
          state.monsterGroupCounter
        );
        
        if (spawnResult.monsters.length > 0) {
          state.monsters.push(...spawnResult.monsters);
          state.monsterInstanceCounter = spawnResult.monsterInstanceCounter;
          state.monsterGroupCounter = spawnResult.monsterGroupCounter;
          
          // Add group if multiple monsters spawned
          if (spawnResult.group) {
            state.monsterGroups.push(spawnResult.group);
          }
          
          // Show monster card immediately as a blocking modal
          state.recentlySpawnedMonsterId = spawnResult.monsters[0].instanceId;
          
          // Check for Blade Barrier tokens at spawn position of first monster
          const bladeBarrierCheck = checkBladeBarrierDamage(
            spawnResult.monsters[0].position,
            state.boardTokens || []
          );
          
          if (bladeBarrierCheck.shouldDamage && bladeBarrierCheck.tokenToRemove) {
            // Deal 1 damage to the monster
            const monster = state.monsters.find(m => m.instanceId === spawnResult.monsters[0].instanceId);
            if (monster) {
              monster.currentHp = Math.max(0, monster.currentHp - 1);
            }
            
            // Remove the blade barrier token
            state.boardTokens = state.boardTokens.filter(
              token => token.id !== bladeBarrierCheck.tokenToRemove
            );
          }
          
          // Log monster spawn
          const spawnedMonsterDef = getMonsterById(drawnMonster);
          const spawnedMonsterName = spawnedMonsterDef?.name ?? drawnMonster;
          const spawnCount = spawnResult.monsters.length;
          const spawnPositions = spawnResult.monsters
            .map(m => `(${m.position.x}, ${m.position.y})`)
            .join(', ');
          const spawnInstanceIds = spawnResult.monsters.map(m => m.instanceId).join(', ');
          state.logEntries.push({
            id: state.logEntryCounter++,
            timestamp: Date.now(),
            type: 'exploration',
            message: `${spawnedMonsterName}${spawnCount > 1 ? ` ×${spawnCount}` : ''} appeared on the new tile!`,
            details: `Spawned at position${spawnCount > 1 ? 's' : ''}: ${spawnPositions}`,
            extendedDetails: `Instance${spawnCount > 1 ? 's' : ''}: ${spawnInstanceIds} | Tile: ${newTile.id}`,
          });

          // Trigger monster-spawn event for power card hooks (e.g., To Arms!)
          const firstMonster = spawnResult.monsters[0];
          if (firstMonster) {
            const monsterSpawnEvent: MonsterSpawnEvent = {
              type: 'monster-spawn',
              heroId: currentToken.heroId,
              turnNumber: state.turnState.turnNumber,
              monsterInstanceId: firstMonster.instanceId,
              monsterId: drawnMonster,
              position: firstMonster.position,
              tileId: newTile.id,
            };
            const spawnEventResult = triggerGameEvent(state.eventHooks, monsterSpawnEvent);
            // Queue power card flips and unregister used hooks
            for (const flip of spawnEventResult.powerCardsToFlip) {
              state.pendingPowerCardFlips.push(flip);
              state.eventHooks = unregisterPowerCard(state.eventHooks, flip.powerCardId, flip.heroId);
            }
          }
        }
      }
      
      // Mark exploration as waiting for monster card dismissal (if a monster was spawned)
      // or complete (if no monster was spawned / no tile placed)
      if (state.recentlySpawnedMonsterId) {
        state.explorationPhase.step = 'awaiting-monster-dismiss';
      } else {
        state.explorationPhase.step = 'complete';
      }
    },
    /**
     * End the exploration phase and move to villain phase
     */
    /**
     * End the exploration phase and move to villain phase
     */
    endExplorationPhase: (state) => {
      if (state.turnState.currentPhase !== "exploration-phase") {
        return;
      }
      
      // Reset exploration phase state
      state.explorationPhase = { step: 'not-started', drawnTile: null, exploredEdge: null, drawnMonster: null };
      
      // Apply Surrounded! environment effect if active
      if (state.activeEnvironmentId === 'surrounded') {
        // Get the active hero
        const activeHeroId = state.heroTokens[state.turnState.currentHeroIndex]?.heroId;
        
        if (activeHeroId) {
          // Check if the active hero controls at least one monster
          const activeHeroControlsMonster = state.monsters.some(m => m.controllerId === activeHeroId);
          
          if (!activeHeroControlsMonster) {
            const heroToken = state.heroTokens.find(t => t.heroId === activeHeroId);
            
            if (heroToken) {
              // Find closest unexplored edge to the active hero
              const closestEdge = findClosestUnexploredEdge(
                heroToken.position,
                state.dungeon.unexploredEdges,
                state.dungeon
              );
              
              if (closestEdge) {
                // Find the tile that has this unexplored edge
                const edgeTile = state.dungeon.tiles.find(t => t.id === closestEdge.tileId);
                
                if (edgeTile) {
                  // Draw a monster from the deck
                  const { monster: drawnMonsterId, deck: updatedMonsterDeck } = drawMonster(state.monsterDeck);
                  
                  if (drawnMonsterId) {
                    // Use spawn function to handle multi-monster spawns
                    const spawnResult = spawnMonstersWithBehavior(
                      drawnMonsterId,
                      edgeTile,
                      activeHeroId, // Monster is controlled by the active hero
                      state.monsters,
                      state.monsterInstanceCounter,
                      state.monsterGroupCounter
                    );
                    
                    if (spawnResult.monsters.length > 0) {
                      // Add all spawned monsters to the board
                      state.monsters.push(...spawnResult.monsters);
                      state.monsterInstanceCounter = spawnResult.monsterInstanceCounter;
                      state.monsterGroupCounter = spawnResult.monsterGroupCounter;
                      state.monsterDeck = updatedMonsterDeck;
                      
                      // Add group if multiple monsters spawned
                      if (spawnResult.group) {
                        state.monsterGroups.push(spawnResult.group);
                      }
                      
                      // Set pending monster display to show the first monster card popup
                      state.recentlySpawnedMonsterId = spawnResult.monsters[0].instanceId;
                    }
                  }
                }
              }
            }
          }
        }
      }
      
      // Apply Wrath of the Enemy curse effect - check all heroes for this curse
      for (const heroHp of state.heroHp) {
        // Check if hero has wrath-of-enemy curse
        const hasWrathCurse = heroHp.statuses?.some(s => s.type === 'curse-wrath-of-enemy');
        if (!hasWrathCurse) continue;
        
        // Find the hero token
        const heroToken = state.heroTokens.find(t => t.heroId === heroHp.heroId);
        if (!heroToken) continue;
        
        // Find the closest monster not on this hero's tile
        const closestMonster = findClosestMonsterNotOnTile(
          heroToken.position,
          state.monsters,
          state.dungeon
        );
        
        let monsterMoved = false;
        
        if (closestMonster) {
          // Find a position adjacent to the hero for the monster to move to
          const adjacentPos = findPositionAdjacentToHero(
            closestMonster,
            heroToken,
            state.heroTokens,
            state.monsters,
            state.dungeon
          );
          
          if (adjacentPos) {
            // Move the monster to the adjacent position
            const newTileId = findTileForGlobalPosition(adjacentPos, state.dungeon);
            if (newTileId) {
              const localPos = globalToLocalPosition(adjacentPos, newTileId, state.dungeon);
              if (localPos) {
                closestMonster.position = localPos;
                closestMonster.tileId = newTileId;
                
                const monsterDef = getMonsterById(closestMonster.monsterId);
                const monsterName = monsterDef?.name || 'Monster';
                
                // Append to existing message or create new one
                // This ensures the curse effect is always visible to the player
                if (state.encounterEffectMessage) {
                  state.encounterEffectMessage += ` | Wrath of the Enemy: ${monsterName} moved adjacent to ${heroHp.heroId}!`;
                } else {
                  state.encounterEffectMessage = `Wrath of the Enemy: ${monsterName} moved adjacent to ${heroHp.heroId}!`;
                }
                monsterMoved = true;
              }
            }
          } else {
            // No valid adjacent position - notify player
            const monsterDef = getMonsterById(closestMonster.monsterId);
            const monsterName = monsterDef?.name || 'Monster';
            if (state.encounterEffectMessage) {
              state.encounterEffectMessage += ` | Wrath of the Enemy: ${monsterName} could not move adjacent to ${heroHp.heroId} (no valid position)`;
            } else {
              state.encounterEffectMessage = `Wrath of the Enemy: ${monsterName} could not move adjacent to ${heroHp.heroId} (no valid position)`;
            }
          }
        } else {
          // No monster found - notify player
          if (state.encounterEffectMessage) {
            state.encounterEffectMessage += ` | Wrath of the Enemy: No monster found to move toward ${heroHp.heroId}`;
          } else {
            state.encounterEffectMessage = `Wrath of the Enemy: No monster found to move toward ${heroHp.heroId}`;
          }
        }
        
        // Attempt to remove curse with roll 10+
        const heroHpIndex = state.heroHp.findIndex(h => h.heroId === heroHp.heroId);
        if (heroHpIndex !== -1) {
          const roll = rollD20();
          const statuses = state.heroHp[heroHpIndex].statuses ?? [];
          const { updatedStatuses, removed } = attemptCurseRemoval(statuses, 'curse-wrath-of-enemy', roll);
          
          // Update hero's status effects
          state.heroHp[heroHpIndex] = {
            ...state.heroHp[heroHpIndex],
            statuses: updatedStatuses,
          };
          
          // Add curse removal result to message
          if (removed) {
            if (state.encounterEffectMessage) {
              state.encounterEffectMessage += ` | ${heroHp.heroId} rolled ${roll} and removed Wrath of the Enemy curse!`;
            } else {
              state.encounterEffectMessage = `${heroHp.heroId} rolled ${roll} and removed Wrath of the Enemy curse!`;
            }
          } else {
            if (state.encounterEffectMessage) {
              state.encounterEffectMessage += ` | ${heroHp.heroId} rolled ${roll} and failed to remove the curse (need 10+)`;
            } else {
              state.encounterEffectMessage = `${heroHp.heroId} rolled ${roll} and failed to remove the curse (need 10+)`;
            }
          }
        }
      }
      
      state.turnState.currentPhase = "villain-phase";
      // Reset villain phase monster index to start activating from the first monster
      state.villainPhaseMonsterIndex = 0;
      // Clear any previous monster action results

      // Fire the villain-phase-start event with hero positions for scenario hooks
      const currentHeroForVillainPhase = state.heroTokens[state.turnState.currentHeroIndex];
      const villainPhaseStartEvent: VillainPhaseStartEvent = {
        type: 'villain-phase-start',
        heroId: currentHeroForVillainPhase?.heroId ?? '',
        turnNumber: state.turnState.turnNumber,
        heroPositions: state.heroTokens.map(t => ({ heroId: t.heroId, position: t.position })),
      };
      const villainPhaseResult = triggerGameEvent(state.eventHooks, villainPhaseStartEvent);
      // Handle scenario effects from the villain-phase-start event
      if (villainPhaseResult.drawExtraEncounter) {
        state.badLuckExtraEncounterPending = true; // reuse the pending-extra-encounter flag
        state.logEntries.push({
          id: state.logEntryCounter++,
          timestamp: Date.now(),
          type: 'game-event',
          message: '🌑 The Creeping Void draws an additional Encounter Card',
          details: 'No heroes are adjacent — the void grows stronger.',
        });
      }
      state.monsterAttackResult = null;
      state.monsterAttackTargetId = null;
      state.monsterAttackerId = null;
      state.monsterAttackName = null;
      state.monsterMoveActionId = null;
      
      // Clear exploration phase message to ensure sequential display
      state.explorationPhaseMessage = null;
      state.recentlyPlacedTileId = null;
      state.recentlyPlacedRoomSetTileIds = [];
      
      // Draw encounter if no exploration occurred this turn
      if (shouldDrawEncounter(state.turnState)) {
        const { encounterId, deck: updatedDeck } = drawEncounter(state.encounterDeck);
        state.encounterDeck = updatedDeck;
        
        if (encounterId) {
          const encounter = getEncounterById(encounterId);
          if (encounter) {
            state.drawnEncounter = encounter;
            state.villainPhaseStepMessage = 'Drawing encounter card';
            
            // Calculate encounter cancel cost (may be reduced by Perseverance)
            state.encounterCancelCost = getModifiedEncounterCancelCost(
              state.heroTokens,
              state.dungeon,
              state.eventHooks,
              state.turnState.currentHeroIndex,
              ENCOUNTER_CANCEL_COST
            );

            // Check if current hero has Bad Luck curse - mark for extra encounter
            const currentHeroId = state.heroTokens[state.turnState.currentHeroIndex]?.heroId;
            if (currentHeroId) {
              const heroHp = state.heroHp.find(h => h.heroId === currentHeroId);
              const hasBadLuckCurse = heroHp?.statuses?.some(s => s.type === 'curse-bad-luck');
              
              if (hasBadLuckCurse) {
                // Set a flag to draw extra encounter after this one is resolved
                // We'll check this flag in dismissEncounterCard
                state.badLuckExtraEncounterPending = true;
              }
            }
            
            // Log encounter draw
            const canCancel = state.partyResources.xp >= state.encounterCancelCost;
            const cancelInfo = canCancel ? ` (Cancel: ${state.encounterCancelCost} XP)` : '';
            state.logEntries.push({
              id: state.logEntryCounter++,
              timestamp: Date.now(),
              type: 'encounter',
              message: `Encounter: ${encounter.name} (${encounter.type})${cancelInfo}`,
              details: encounter.description,
              extendedDetails: `Effect: ${encounter.effect.description}`,
            });

            // Fire encounter-draw event for scenario hooks (e.g. Adventure 15 Automated Defense)
            const encounterHeroId = state.heroTokens[state.turnState.currentHeroIndex]?.heroId ?? '';
            const encounterHeroToken = state.heroTokens[state.turnState.currentHeroIndex];
            const encounterHeroTile = encounterHeroToken
              ? findTileAtPosition(encounterHeroToken.position, state.dungeon)
              : null;
            const hasExistingTrap = encounterHeroTile
              ? state.boardTokens.some(t => t.tileId === encounterHeroTile.id && t.type === 'blade-barrier')
              : false;
            const encounterKeywords: string[] = encounter.effect.type === 'trap' ? ['trap'] : [];
            const encounterDrawEvent: EncounterDrawEvent = {
              type: 'encounter-draw',
              heroId: encounterHeroId,
              turnNumber: state.turnState.turnNumber,
              encounterId,
              currentXp: state.partyResources.xp,
              baseCancelCost: state.encounterCancelCost,
              encounterKeywords,
              hasExistingTrapOnTile: hasExistingTrap,
            };
            const encounterDrawResult = triggerGameEvent(state.eventHooks, encounterDrawEvent);
            // Handle scenario hook: dealDamageToHero (e.g. Automated Defense stacking trap)
            for (const { heroId: encHeroId, damage: encDamage, reason: encReason } of encounterDrawResult.dealDamageToHero) {
              const encHeroHpIdx = state.heroHp.findIndex(h => h.heroId === encHeroId);
              if (encHeroHpIdx !== -1) {
                state.heroHp[encHeroHpIdx].currentHp = Math.max(
                  0,
                  state.heroHp[encHeroHpIdx].currentHp - encDamage
                );
                state.logEntries.push({
                  id: state.logEntryCounter++,
                  timestamp: Date.now(),
                  type: 'game-event',
                  message: `🔩 ${encReason}: ${encDamage} damage`,
                  details: `${encHeroId} takes ${encDamage} damage from Automated Defense.`,
                  heroId: encHeroId,
                });
              }
            }
          }
        }
      } else {
        state.villainPhaseStepMessage = 'Encounter card skipped';
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
      state.villainActivatedThisTurn = false;
      state.villainActivation = null;
      state.villainAttackResult = null;
      state.villainAttackTargetId = null;
      state.villainAttackName = null;
      state.villainAreaAttackResults = null;
      state.villainAreaAttackTargetIds = null;
      state.monsterAttackResult = null;
      state.monsterAttackTargetId = null;
      state.monsterAttackerId = null;
      state.monsterAttackName = null;
      state.monsterMoveActionId = null;
      state.monsterAreaAttackResults = null;
      state.monsterAreaAttackTargetIds = null;
      state.villainPhaseStepMessage = null;
      
      // Clear encounter state
      state.drawnEncounter = null;
      state.badLuckExtraEncounterPending = false;
      
      // Attempt Bad Luck curse removal for current hero
      const currentHeroIdForCurse = state.heroTokens[state.turnState.currentHeroIndex]?.heroId;
      if (currentHeroIdForCurse) {
        const heroHpIndex = state.heroHp.findIndex(h => h.heroId === currentHeroIdForCurse);
        if (heroHpIndex !== -1) {
          const heroHp = state.heroHp[heroHpIndex];
          const hasBadLuckCurse = heroHp.statuses?.some(s => s.type === 'curse-bad-luck');
          
          if (hasBadLuckCurse) {
            // Automatically roll to attempt curse removal (10+ removes)
            const roll = rollD20();
            const statuses = heroHp.statuses ?? [];
            const { updatedStatuses, removed } = attemptCurseRemoval(statuses, 'curse-bad-luck', roll);
            
            // Update hero's status effects
            state.heroHp[heroHpIndex] = {
              ...heroHp,
              statuses: updatedStatuses,
            };
            
            // Add curse removal result to message
            if (removed) {
              state.encounterEffectMessage = `${currentHeroIdForCurse} rolled ${roll} and removed Bad Luck curse!`;
            } else {
              state.encounterEffectMessage = `${currentHeroIdForCurse} rolled ${roll} and failed to remove Bad Luck curse (need 10+)`;
            }
          }
        }
      }
      
      // Clear any previous healing surge notification
      state.healingSurgeUsedHeroId = null;
      state.healingSurgeHpRestored = null;
      
      // Clear action surge prompt
      state.showActionSurgePrompt = false;
      
      // High Alert environment effect: Pass one monster card to the player on the right
      if (state.activeEnvironmentId === 'high-alert' && state.heroTokens.length > 1) {
        const currentHeroId = state.heroTokens[state.turnState.currentHeroIndex]?.heroId;
        if (currentHeroId) {
          // Find monsters controlled by the current hero
          const controlledMonsters = state.monsters.filter(m => m.controllerId === currentHeroId);
          
          if (controlledMonsters.length > 0) {
            // Calculate the index of the player on the right (next player in turn order)
            const rightPlayerIndex = (state.turnState.currentHeroIndex + 1) % state.heroTokens.length;
            const rightPlayerId = state.heroTokens[rightPlayerIndex]?.heroId;
            
            if (rightPlayerId) {
              // Pass the first monster to the player on the right
              const monsterToPass = controlledMonsters[0];
              const monsterIndex = state.monsters.findIndex(m => m.instanceId === monsterToPass.instanceId);
              
              if (monsterIndex !== -1) {
                state.monsters[monsterIndex] = {
                  ...state.monsters[monsterIndex],
                  controllerId: rightPlayerId,
                };
                
                // Add notification message
                const monsterData = MONSTERS.find(m => m.id === monsterToPass.monsterId);
                const monsterName = monsterData?.name ?? 'Monster';
                const existingMessage = state.encounterEffectMessage;
                const passMessage = `High Alert: ${currentHeroId} passes ${monsterName} to ${rightPlayerId}`;
                state.encounterEffectMessage = existingMessage 
                  ? `${existingMessage} | ${passMessage}`
                  : passMessage;
              }
            }
          }
        }
      }
      
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
      
      // Reset hero moved flag for Gap in the Armor curse tracking
      state.heroMovedThisPhase = false;
      
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
          let heroHp = state.heroHp[heroHpIndex];
          let isRestoredFromTimeLeap = false;
          
          // Handle Time Leap curse - return hero to play and remove curse
          if (heroHp.removedFromPlay && hasStatusEffect(heroHp.statuses ?? [], 'curse-time-leap')) {
            heroHp = {
              ...heroHp,
              removedFromPlay: false,
              statuses: removeStatusEffect(heroHp.statuses ?? [], 'curse-time-leap'),
            };
            isRestoredFromTimeLeap = true;
          }
          
          const { updatedStatuses, ongoingDamage, poisonedDamage, bloodlustDamage } = processStatusEffectsStartOfTurn(
            heroHp.statuses ?? [],
            state.turnState.turnNumber
          );
          
          // Apply ongoing damage, poisoned damage, and bloodlust damage, update statuses
          const totalDamage = ongoingDamage + poisonedDamage + bloodlustDamage;
          state.heroHp[heroHpIndex] = {
            ...heroHp,
            currentHp: Math.max(0, heroHp.currentHp - totalDamage),
            statuses: updatedStatuses,
            removedFromPlay: heroHp.removedFromPlay, // Preserve removedFromPlay flag
          };
          
          // Build notification messages
          let messages: string[] = [];
          
          if (isRestoredFromTimeLeap) {
            messages.push(`${currentHeroId} returns to play!`);
          }
          
          if (poisonedDamage > 0) {
            messages.push(`${currentHeroId} takes ${poisonedDamage} poison damage`);
            state.poisonedDamageNotification = {
              heroId: currentHeroId,
              damage: poisonedDamage,
            };
          }
          
          if (bloodlustDamage > 0) {
            messages.push(`${currentHeroId} takes ${bloodlustDamage} damage from bloodlust curse (defeat a monster to remove)`);
          }
          
          // Set combined message if any notifications exist
          if (messages.length > 0) {
            state.encounterEffectMessage = messages.join(' | ');
          }
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
      // If exploration is waiting for the monster card to be dismissed, advance to complete
      // so the exploration phase can end and the villain phase can start
      if (state.explorationPhase?.step === 'awaiting-monster-dismiss') {
        state.explorationPhase.step = 'complete';
      }
    },
    /**
     * Dismiss the encounter card display and apply its effect
     * Optional payload: restoredDailyPower - pre-resolved daily power for Ancient Spirit's Blessing
     */
    dismissEncounterCard: (state, action: PayloadAction<{ restoredDailyPower?: { heroId: string; cardId: number; cardName: string } | null } | undefined>) => {
      if (state.drawnEncounter) {
        state.villainPhaseStepMessage = null;
        const activeHeroToken = state.heroTokens[state.turnState.currentHeroIndex];
        const activeHeroPosition = activeHeroToken?.position;
        
        // Check if this is an environment card
        if (isEnvironmentCard(state.drawnEncounter)) {
          // Activate the environment (replaces any existing environment)
          state.activeEnvironmentId = activateEnvironment(
            state.drawnEncounter.id,
            state.activeEnvironmentId
          );
          
          // Log environment activation
          state.logEntries.push({
            id: state.logEntryCounter++,
            timestamp: Date.now(),
            type: 'encounter',
            message: `Environment active: ${state.drawnEncounter.name}`,
            details: state.drawnEncounter.description,
            extendedDetails: `Effect: ${state.drawnEncounter.effect.description}`,
          });
          
          // Environment cards are not discarded - they remain active
          // The old environment (if any) is implicitly replaced
        } else if (shouldPlaceTrapMarker(state.drawnEncounter)) {
          // Place trap marker on active hero's tile (if no trap already there)
          let trapPlaced = false;
          if (activeHeroPosition && !tileHasTrap(activeHeroPosition, state.traps)) {
            const trap = createTrapInstance(
              state.drawnEncounter.id,
              state.drawnEncounter,
              activeHeroPosition,
              state.trapInstanceCounter
            );
            state.traps.push(trap);
            state.trapInstanceCounter++;
            trapPlaced = true;
          }
          
          // Log trap placement
          state.logEntries.push({
            id: state.logEntryCounter++,
            timestamp: Date.now(),
            type: 'encounter',
            message: trapPlaced 
              ? `Trap placed: ${state.drawnEncounter.name}` 
              : `Trap not placed (tile already has trap): ${state.drawnEncounter.name}`,
            details: state.drawnEncounter.description,
            extendedDetails: `Effect: ${state.drawnEncounter.effect.description}`,
          });
          
          // Discard the trap encounter card
          state.encounterDeck = discardEncounter(state.encounterDeck, state.drawnEncounter.id);
          
          // Check if Bad Luck curse requires drawing an extra encounter
          if (state.badLuckExtraEncounterPending) {
            state.badLuckExtraEncounterPending = false;
            
            // Draw the extra encounter for Bad Luck curse
            const { encounterId, deck: updatedDeck } = drawEncounter(state.encounterDeck);
            state.encounterDeck = updatedDeck;
            
            if (encounterId) {
              const encounter = getEncounterById(encounterId);
              if (encounter) {
                state.drawnEncounter = encounter;
                const currentHeroId = activeHeroToken?.heroId;
                state.encounterEffectMessage = `Bad Luck curse: ${currentHeroId} draws an extra encounter!`;
                
                // Log Bad Luck extra encounter
                const canCancel = canCancelEncounter(state.partyResources);
                const cancelInfo = canCancel ? ` (Cancel: ${ENCOUNTER_CANCEL_COST} XP)` : '';
                state.logEntries.push({
                  id: state.logEntryCounter++,
                  timestamp: Date.now(),
                  type: 'encounter',
                  message: `Bad Luck: Extra encounter - ${encounter.name} (${encounter.type})${cancelInfo}`,
                  details: encounter.description,
                  extendedDetails: `Effect: ${encounter.effect.description}`,
                  heroId: currentHeroId,
                });
                return;
              }
            }
          }
        } else if (shouldPlaceHazardMarker(state.drawnEncounter)) {
          // Place hazard marker on active hero's tile (if no hazard already there)
          let hazardPlaced = false;
          if (activeHeroPosition && !tileHasHazard(activeHeroPosition, state.hazards)) {
            const hazard = createHazardInstance(
              state.drawnEncounter.id,
              activeHeroPosition,
              state.hazardInstanceCounter
            );
            state.hazards.push(hazard);
            state.hazardInstanceCounter++;
            hazardPlaced = true;
          }
          
          // Get the current hero ID for active-hero effects
          const activeHeroId = activeHeroToken?.heroId;
          
          if (activeHeroId) {
            // Apply immediate hazard effects (Cave In, Pit)
            const { heroHpList, results } = resolveEncounterEffect(
              state.drawnEncounter,
              state.heroHp,
              activeHeroId,
              state.heroTokens,
              state.dungeon
            );
            state.heroHp = heroHpList;
            
            // Log hazard placement and effects
            if (results.length > 0) {
              const targetSummaries = results.map(r => {
                const parts = [];
                if (r.wasHit !== undefined) {
                  parts.push(r.wasHit ? 'Hit' : 'Miss');
                }
                if (r.damageTaken > 0) {
                  parts.push(`${r.damageTaken} dmg`);
                }
                return `${r.heroName}: ${parts.join(', ')}`;
              });
              
              const detailedSummaries = buildDetailedResultSummaries(results);
              
              state.logEntries.push({
                id: state.logEntryCounter++,
                timestamp: Date.now(),
                type: 'encounter',
                message: `Hazard: ${state.drawnEncounter.name} - ${targetSummaries.join('; ')}`,
                details: state.drawnEncounter.description,
                extendedDetails: `Effect: ${state.drawnEncounter.effect.description}\n\n${detailedSummaries}`,
              });
            } else {
              state.logEntries.push({
                id: state.logEntryCounter++,
                timestamp: Date.now(),
                type: 'encounter',
                message: hazardPlaced 
                  ? `Hazard placed: ${state.drawnEncounter.name}` 
                  : `Hazard not placed (tile already has hazard): ${state.drawnEncounter.name}`,
                details: state.drawnEncounter.description,
                extendedDetails: `Effect: ${state.drawnEncounter.effect.description}`,
              });
            }
            
            // Store results for popup display if there were any effects
            if (results.length > 0) {
              state.encounterResult = {
                encounterId: state.drawnEncounter.id,
                encounterName: state.drawnEncounter.name,
                targets: results,
              };
            }
            
            // Check for party defeat (all heroes at 0 HP)
            const allHeroesDefeated = state.heroHp.every(h => h.currentHp <= 0);
            if (allHeroesDefeated) {
              state.defeatReason = `The party was overwhelmed by ${state.drawnEncounter.name}.`;
              state.currentScreen = "defeat";
            }
          }
          
          // Discard the hazard encounter card
          state.encounterDeck = discardEncounter(state.encounterDeck, state.drawnEncounter.id);
          
          // Check if Bad Luck curse requires drawing an extra encounter
          if (state.badLuckExtraEncounterPending) {
            state.badLuckExtraEncounterPending = false;
            
            // Draw the extra encounter for Bad Luck curse
            const { encounterId, deck: updatedDeck } = drawEncounter(state.encounterDeck);
            state.encounterDeck = updatedDeck;
            
            if (encounterId) {
              const encounter = getEncounterById(encounterId);
              if (encounter) {
                state.drawnEncounter = encounter;
                const currentHeroId = activeHeroToken?.heroId;
                state.encounterEffectMessage = `Bad Luck curse: ${currentHeroId} draws an extra encounter!`;
                
                // Log Bad Luck extra encounter
                const canCancel = canCancelEncounter(state.partyResources);
                const cancelInfo = canCancel ? ` (Cancel: ${ENCOUNTER_CANCEL_COST} XP)` : '';
                state.logEntries.push({
                  id: state.logEntryCounter++,
                  timestamp: Date.now(),
                  type: 'encounter',
                  message: `Bad Luck: Extra encounter - ${encounter.name} (${encounter.type})${cancelInfo}`,
                  details: encounter.description,
                  extendedDetails: `Effect: ${encounter.effect.description}`,
                  heroId: currentHeroId,
                });
                return;
              }
            }
          }
        } else if (state.drawnEncounter.effect.type === 'special') {
          // Handle special encounter cards
          const encounterId = state.drawnEncounter.id;
          
          // Lost: Shuffle the entire tile deck
          if (encounterId === 'lost') {
            const deckSize = state.dungeon.tileDeck.length;
            state.dungeon.tileDeck = shuffleTileDeck(state.dungeon.tileDeck);
            state.encounterEffectMessage = `Tile deck shuffled (${deckSize} tiles remaining)`;
            if (state.scenario.tilesForChamber != null && !state.scenario.chamberRevealed) {
              state.scenario.tilesForChamberUnknown = true;
            }
          }
          
          // Occupied Lair: Place tile from bottom near hero, spawn monster, place treasure token
          else if (encounterId === 'occupied-lair') {
            const activeHeroToken = state.heroTokens[state.turnState.currentHeroIndex];
            const activeHeroTile = activeHeroToken ? findTileAtPosition(activeHeroToken.position, state.dungeon) : null;

            if (activeHeroTile && state.dungeon.unexploredEdges.length > 0) {
              // Find closest unexplored edge to active hero
              let closestEdge = state.dungeon.unexploredEdges[0];
              let closestDistance = Infinity;

              for (const edge of state.dungeon.unexploredEdges) {
                const edgeTile = state.dungeon.tiles.find(t => t.id === edge.tileId);
                if (edgeTile) {
                  const dx = Math.abs(edgeTile.position.col - activeHeroTile.position.col);
                  const dy = Math.abs(edgeTile.position.row - activeHeroTile.position.row);
                  const distance = dx + dy;
                  if (distance < closestDistance) {
                    closestDistance = distance;
                    closestEdge = edge;
                  }
                }
              }

              // Draw tile from bottom of deck
              const { drawnTile, remainingDeck } = drawTileFromBottom(state.dungeon.tileDeck);

              if (drawnTile) {
                state.dungeon.tileDeck = remainingDeck;

                const newTile = placeTile(closestEdge, drawnTile, state.dungeon);

                if (newTile) {
                  state.dungeon.tiles.push(newTile);
                  state.dungeon = updateDungeonAfterExploration(state.dungeon, closestEdge, newTile);

                  // Draw and spawn a monster on the new tile
                  const { monster: newMonsterId, deck: updatedMonsterDeck } = drawMonster(state.monsterDeck);
                  state.monsterDeck = updatedMonsterDeck;

                  let effectMessage = 'Tile placed';

                  if (newMonsterId) {
                    const newMonsterDef = getMonsterById(newMonsterId);
                    const controllerHeroId = activeHeroToken?.heroId || (state.heroTokens.length > 0 ? state.heroTokens[0].heroId : 'quinn');

                    const spawnResult = spawnMonstersWithBehavior(
                      newMonsterId,
                      newTile,
                      controllerHeroId,
                      state.monsters,
                      state.monsterInstanceCounter,
                      state.monsterGroupCounter
                    );

                    if (spawnResult.monsters.length > 0) {
                      state.monsters.push(...spawnResult.monsters);
                      state.monsterInstanceCounter = spawnResult.monsterInstanceCounter;
                      state.monsterGroupCounter = spawnResult.monsterGroupCounter;
                      state.recentlySpawnedMonsterId = spawnResult.monsters[0].instanceId;
                      if (spawnResult.group) {
                        state.monsterGroups.push(spawnResult.group);
                      }
                      effectMessage += `, ${newMonsterDef?.name || 'monster'} spawned`;
                    } else {
                      effectMessage += ', failed to spawn monster';
                    }
                  } else {
                    effectMessage += ', no monsters in deck';
                  }

                  // Place a treasure token on the new tile
                  // Use getTileBounds to get correct global coordinates (accounts for start tile height offset)
                  const newTileBounds = getTileBounds(newTile);
                  const treasurePosition = { x: newTileBounds.minX + 1, y: newTileBounds.minY + 1 };
                  const treasureToken = createTreasureTokenInstance('occupied-lair', treasurePosition, state.treasureTokenInstanceCounter);
                  state.treasureTokens.push(treasureToken);
                  state.treasureTokenInstanceCounter++;
                  effectMessage += ', treasure token placed';

                  state.encounterEffectMessage = effectMessage;
                } else {
                  state.encounterEffectMessage = 'Failed to place tile';
                }
              } else {
                state.encounterEffectMessage = 'No tiles in deck to place';
              }
            } else {
              state.encounterEffectMessage = 'No unexplored edges available';
            }
          }
          
          // Spotted!: Filter deck for Sentries, place tile, spawn monster
          else if (encounterId === 'spotted') {
            // Part 1: Filter monster deck for Sentries
            const category = getMonsterCategoryForEncounter(encounterId);
            if (category) {
              const result = filterMonsterDeckByCategory(
                state.monsterDeck,
                category,
                5
              );
              state.monsterDeck = result.deck;
              
              // Build message about deck filtering
              const kept = 5 - result.discardedMonsters.length;
              const discarded = result.discardedMonsters.length;
              const categoryName = category.charAt(0).toUpperCase() + category.slice(1) + (kept === 1 ? '' : 's');
              let effectMessage = `Drew 5 monster cards. ${kept} ${categoryName} placed on top, ${discarded} discarded.`;
              
              // Part 2: Find closest unexplored edge to active hero
              const activeHeroToken = state.heroTokens[state.turnState.currentHeroIndex];
              const activeHeroTile = activeHeroToken ? findTileAtPosition(activeHeroToken.position, state.dungeon) : null;
              
              if (activeHeroTile && state.dungeon.unexploredEdges.length > 0) {
                // Find closest unexplored edge based on tile distance
                let closestEdge = state.dungeon.unexploredEdges[0];
                let closestDistance = Infinity;
                
                for (const edge of state.dungeon.unexploredEdges) {
                  const edgeTile = state.dungeon.tiles.find(t => t.id === edge.tileId);
                  if (edgeTile) {
                    // Calculate Manhattan distance between tiles
                    const dx = Math.abs(edgeTile.position.x - activeHeroTile.position.x);
                    const dy = Math.abs(edgeTile.position.y - activeHeroTile.position.y);
                    const distance = dx + dy;
                    
                    if (distance < closestDistance) {
                      closestDistance = distance;
                      closestEdge = edge;
                    }
                  }
                }
                
                // Part 3: Draw tile from bottom of deck
                const { drawnTile, remainingDeck } = drawTileFromBottom(state.dungeon.tileDeck);
                
                if (drawnTile) {
                  state.dungeon.tileDeck = remainingDeck;
                  
                  // Place the tile at the closest unexplored edge
                  const newTile = placeTile(closestEdge, drawnTile, state.dungeon);
                  
                  if (newTile) {
                    // Add the new tile to the dungeon
                    state.dungeon.tiles.push(newTile);
                    
                    // Update unexplored edges
                    state.dungeon = updateDungeonAfterExploration(state.dungeon, closestEdge, newTile);
                    
                    // Part 4: Draw and spawn a monster on the new tile
                    const { monster: newMonsterId, deck: updatedMonsterDeck } = drawMonster(state.monsterDeck);
                    state.monsterDeck = updatedMonsterDeck;
                    
                    if (newMonsterId) {
                      const newMonsterDef = getMonsterById(newMonsterId);
                      
                      // Determine controller hero ID with fallback
                      const controllerHeroId = activeHeroToken?.heroId || (state.heroTokens.length > 0 ? state.heroTokens[0].heroId : 'quinn');
                      
                      // Use spawn function to handle multi-monster spawns
                      const spawnResult = spawnMonstersWithBehavior(
                        newMonsterId,
                        newTile,
                        controllerHeroId,
                        state.monsters,
                        state.monsterInstanceCounter,
                        state.monsterGroupCounter
                      );
                      
                      if (spawnResult.monsters.length > 0) {
                        state.monsters.push(...spawnResult.monsters);
                        state.monsterInstanceCounter = spawnResult.monsterInstanceCounter;
                        state.monsterGroupCounter = spawnResult.monsterGroupCounter;
                        state.recentlySpawnedMonsterId = spawnResult.monsters[0].instanceId;
                        
                        // Add group if multiple monsters spawned
                        if (spawnResult.group) {
                          state.monsterGroups.push(spawnResult.group);
                        }
                        
                        effectMessage += ` Tile placed, ${newMonsterDef?.name || 'monster'} spawned.`;
                      } else {
                        effectMessage += ' Tile placed, but failed to spawn monster.';
                      }
                    } else {
                      effectMessage += ' Tile placed, but no monsters in deck.';
                    }
                  } else {
                    effectMessage += ' Failed to place tile.';
                  }
                } else {
                  effectMessage += ' No tiles in deck to place.';
                }
              } else {
                effectMessage += ' No unexplored edges available.';
              }
              
              state.encounterEffectMessage = effectMessage;
              
              // Discard the encounter card and clear drawn encounter
              if (state.drawnEncounter) {
                state.encounterDeck = discardEncounter(state.encounterDeck, state.drawnEncounter.id);
                state.drawnEncounter = null;
              }
            } else {
              // Fallback if category is not found
              state.encounterEffectMessage = 'Monster category not found for Spotted! card';
              
              // Discard the encounter card even if there's an error
              if (state.drawnEncounter) {
                state.encounterDeck = discardEncounter(state.encounterDeck, state.drawnEncounter.id);
                state.drawnEncounter = null;
              }
            }
          }
          
          // Other monster deck manipulation cards (Hall of Orcs, Duergar Outpost, etc.)
          else if (isMonsterDeckManipulationCard(encounterId)) {
            const category = getMonsterCategoryForEncounter(encounterId);
            if (category) {
              const result = filterMonsterDeckByCategory(
                state.monsterDeck,
                category,
                5
              );
              state.monsterDeck = result.deck;
              
              // Build message about what happened
              const kept = 5 - result.discardedMonsters.length;
              const discarded = result.discardedMonsters.length;
              const categoryName = category.charAt(0).toUpperCase() + category.slice(1) + (kept !== 1 ? 's' : '');
              state.encounterEffectMessage = `Drew 5 monster cards. ${kept} ${categoryName} placed on top, ${discarded} discarded.`;
            }
          }
          
          // Revel in Destruction: Heal a damaged monster 1 HP
          else if (encounterId === 'revel-in-destruction') {
            // Find first damaged monster
            const damagedMonster = state.monsters.find(m => {
              const monsterDef = getMonsterById(m.monsterId);
              return monsterDef && m.currentHp < monsterDef.maxHp;
            });
            if (damagedMonster) {
              const monsterDef = getMonsterById(damagedMonster.monsterId);
              const oldHp = damagedMonster.currentHp;
              damagedMonster.currentHp = healMonster(damagedMonster, 1);
              state.encounterEffectMessage = `${monsterDef?.name || 'Monster'} healed: ${oldHp} → ${damagedMonster.currentHp} HP`;
            } else {
              state.encounterEffectMessage = 'No damaged monsters to heal';
            }
          }
          
          // Deadly Poison: Each hero that is currently Poisoned takes 1 damage
          else if (encounterId === 'deadly-poison') {
            const poisonedHeroes = state.heroHp.filter(hp => 
              hp.statuses?.some(s => s.type === 'poisoned')
            );
            
            state.heroHp = state.heroHp.map(hp => {
              // Check if hero is poisoned
              const isPoisoned = hp.statuses?.some(s => s.type === 'poisoned');
              if (isPoisoned) {
                return { ...hp, currentHp: Math.max(0, hp.currentHp - 1) };
              }
              return hp;
            });
            
            if (poisonedHeroes.length > 0) {
              const heroNames = poisonedHeroes.map(h => 
                state.heroTokens.find(t => t.heroId === h.heroId)?.heroId || 'Hero'
              ).join(', ');
              state.encounterEffectMessage = `${poisonedHeroes.length} poisoned ${poisonedHeroes.length === 1 ? 'hero' : 'heroes'} took 1 damage`;
            } else {
              state.encounterEffectMessage = 'No poisoned heroes';
            }
            
            // Check for party defeat
            const allHeroesDefeated = state.heroHp.every(h => h.currentHp <= 0);
            if (allHeroesDefeated) {
              state.defeatReason = `The party was overwhelmed by ${state.drawnEncounter.name}.`;
              state.currentScreen = "defeat";
            }
          }
          
          // Hidden Treasure: Prompt player to place treasure token on a tile without heroes
          else if (encounterId === 'hidden-treasure') {
            // Set pending treasure placement state to prompt player for selection
            state.pendingTreasurePlacement = {
              encounterId: 'hidden-treasure',
              encounterName: 'Hidden Treasure'
            };
            // Note: No modal message - the player card will show the prompt
          }
          
          // Thief in the Dark: Active hero discards a treasure card or token
          else if (encounterId === 'thief-in-dark') {
            const activeHeroId = activeHeroToken?.heroId;
            const activeHeroPosition = activeHeroToken?.position;
            
            if (activeHeroId && activeHeroPosition) {
              const inventory = state.heroInventories[activeHeroId];
              const treasureTokensOnTile = getTreasureTokensOnTile(activeHeroPosition, state.treasureTokens);
              
              // Check if hero has treasure cards
              const hasTreasureCards = inventory && inventory.items.length > 0;
              // Check if hero has treasure tokens on their tile
              const hasTreasureTokens = treasureTokensOnTile.length > 0;
              
              // Priority 1: Treasure Cards - if multiple cards, show selection
              if (inventory && inventory.items.length > 1) {
                state.pendingTreasureDiscard = {
                  encounterId: 'thief-in-dark',
                  encounterName: 'Thief in the Dark',
                  heroId: activeHeroId,
                };
                // Note: No modal message - the selection modal will handle the UI
              }
              // Priority 1: Treasure Cards - if single card, auto-discard
              else if (hasTreasureCards) {
                const removedItem = inventory.items[0];
                const cardId = removedItem.cardId;
                const treasureCard = getTreasureById(cardId);
                
                // Add treasure card back to discard pile
                state.treasureDeck = discardTreasure(state.treasureDeck, cardId);
                
                // Remove from inventory
                state.heroInventories[activeHeroId] = {
                  ...inventory,
                  items: inventory.items.slice(1),
                };
                
                const treasureName = treasureCard?.name || `Treasure #${cardId}`;
                state.encounterEffectMessage = `${activeHeroId} lost ${treasureName}`;
              }
              // Priority 2: Treasure Tokens - if no cards but multiple tokens, show selection
              else if (hasTreasureTokens && treasureTokensOnTile.length > 1) {
                state.pendingTreasureDiscard = {
                  encounterId: 'thief-in-dark',
                  encounterName: 'Thief in the Dark',
                  heroId: activeHeroId,
                };
                // Note: No modal message - the selection modal will handle the UI
              }
              // Priority 2: Treasure Tokens - if single token, auto-discard
              else if (hasTreasureTokens) {
                const removedToken = treasureTokensOnTile[0];
                state.treasureTokens = state.treasureTokens.filter(t => t.id !== removedToken.id);
                state.encounterEffectMessage = `${activeHeroId} lost a treasure token`;
              }
              // Hero has no treasures
              else {
                state.encounterEffectMessage = `${activeHeroId} has no treasure - the thief gets nothing`;
              }
            }
          }
          
          // Wandering Monster: Draw a monster and prompt player to select tile
          else if (encounterId === 'wandering-monster') {
            const activeHeroToken = state.heroTokens[state.turnState.currentHeroIndex];
            if (activeHeroToken) {
              // Draw a monster
              const { monster: monsterId, deck: updatedMonsterDeck } = drawMonster(state.monsterDeck);
              state.monsterDeck = updatedMonsterDeck;
              
              if (monsterId) {
                const monsterDef = getMonsterById(monsterId);
                if (monsterDef) {
                  // Find all tiles with unexplored edges
                  const tilesWithUnexploredEdges = state.dungeon.unexploredEdges.map(edge => 
                    state.dungeon.tiles.find(t => t.id === edge.tileId)
                  ).filter((t, i, arr) => t && arr.findIndex(tile => tile?.id === t.id) === i); // Deduplicate
                  
                  if (tilesWithUnexploredEdges.length > 0) {
                    const availableTileIds = tilesWithUnexploredEdges.map(t => t!.id);
                    
                    // If only one tile available, spawn directly
                    if (availableTileIds.length === 1) {
                      const spawnTile = tilesWithUnexploredEdges[0];
                      if (spawnTile) {
                        // Use spawn function to handle multi-monster spawns
                        const spawnResult = spawnMonstersWithBehavior(
                          monsterId,
                          spawnTile,
                          activeHeroToken.heroId,
                          state.monsters,
                          state.monsterInstanceCounter,
                          state.monsterGroupCounter
                        );
                        
                        if (spawnResult.monsters.length > 0) {
                          state.monsters.push(...spawnResult.monsters);
                          state.monsterInstanceCounter = spawnResult.monsterInstanceCounter;
                          state.monsterGroupCounter = spawnResult.monsterGroupCounter;
                          state.recentlySpawnedMonsterId = spawnResult.monsters[0].instanceId;
                          
                          // Add group if multiple monsters spawned
                          if (spawnResult.group) {
                            state.monsterGroups.push(spawnResult.group);
                          }
                          
                          state.encounterEffectMessage = `${monsterDef.name} spawned`;
                        } else {
                          state.encounterEffectMessage = 'Failed to create monster';
                        }
                      }
                    } else {
                      // Multiple tiles available - prompt player to select
                      state.pendingMonsterSpawn = {
                        monsterId,
                        monsterName: monsterDef.name,
                        heroId: activeHeroToken.heroId,
                        availableTileIds,
                      };
                      // Don't set encounterEffectMessage yet - will be set when tile is selected
                    }
                  } else {
                    state.encounterEffectMessage = 'No tiles with unexplored edges';
                  }
                } else {
                  state.encounterEffectMessage = 'Monster not found in database';
                }
              } else {
                state.encounterEffectMessage = 'No monsters available in deck';
              }
            }
          }
          
          // Quick Advance: Move a monster closer to active hero
          else if (encounterId === 'quick-advance') {
            if (state.monsters.length === 0) {
              state.encounterEffectMessage = 'No monsters in play - card discarded';
              state.encounterDeck = discardEncounter(state.encounterDeck, state.drawnEncounter.id);
              state.drawnEncounter = null;
            } else if (state.monsters.length === 1) {
              handleQuickAdvanceEffect(state, state.monsters[0]);
            } else {
              // Multiple monsters - prompt player to choose
              state.pendingMonsterChoice = {
                encounterId: 'quick-advance',
                encounterName: state.drawnEncounter.name,
                context: 'Choose a monster to move closer',
              };
              return;
            }
          }
          
          // Ancient Spirit's Blessing: Flip up a used Daily Power
          // The actual card restoration is handled by the heroes slice (restoreUsedDailyPower action),
          // coordinated from GameBoard.svelte before this action is dispatched.
          // The payload contains info about which power was restored (for the effect message).
          else if (encounterId === 'ancient-spirits-blessing') {
            const restoredPower = action.payload?.restoredDailyPower;
            if (restoredPower) {
              state.encounterEffectMessage = `${restoredPower.cardName} restored for ${restoredPower.heroId}`;
            } else {
              state.encounterEffectMessage = 'No used daily powers to restore';
            }
          }
          
          // Scream of the Sentry: Place tile from bottom near existing monster, spawn new monster
          else if (encounterId === 'scream-of-sentry') {
            // Check if there are any monsters in play
            if (state.monsters.length === 0) {
              state.encounterEffectMessage = 'No monsters in play - card discarded';
              // Discard the encounter card
              state.encounterDeck = discardEncounter(state.encounterDeck, state.drawnEncounter.id);
              state.drawnEncounter = null;
            } else if (state.monsters.length === 1) {
              // Only one monster - automatically use it
              handleScreamOfSentryEffect(state, state.monsters[0]);
            } else {
              // Multiple monsters - prompt player to choose
              state.pendingMonsterChoice = {
                encounterId: 'scream-of-sentry',
                encounterName: state.drawnEncounter.name,
                context: 'Choose a monster to place a tile near',
              };
              // Keep the encounter card displayed until choice is made
              return;
            }
          }
          
          // Warp in Time: Each player passes one monster card to the player on the right, draw another encounter
          else if (encounterId === 'warp-in-time') {
            if (state.heroTokens.length <= 1) {
              state.encounterEffectMessage = 'No other players - no monster cards passed';
            } else {
              const passMsgs: string[] = [];
              // Each hero simultaneously passes one monster to the right
              // Build pass pairs first to avoid sequential assignment confusion
              const passPairs: Array<{ fromIdx: number; toIdx: number }> = [];
              for (let i = 0; i < state.heroTokens.length; i++) {
                passPairs.push({ fromIdx: i, toIdx: (i + 1) % state.heroTokens.length });
              }
              // Collect monsters to pass (first controlled monster per hero, before any changes)
              const monstersToPass: Array<{ instanceId: string; toHeroId: string; monsterName: string } | null> = 
                passPairs.map(({ fromIdx, toIdx }) => {
                  const fromHeroId = state.heroTokens[fromIdx]?.heroId;
                  const toHeroId = state.heroTokens[toIdx]?.heroId;
                  if (!fromHeroId || !toHeroId) return null;
                  const monster = state.monsters.find(m => m.controllerId === fromHeroId);
                  if (!monster) return null;
                  const monsterData = MONSTERS.find(m => m.id === monster.monsterId);
                  return { instanceId: monster.instanceId, toHeroId, monsterName: monsterData?.name ?? 'Monster' };
                });
              // Apply the passes
              for (const pass of monstersToPass) {
                if (!pass) continue;
                const idx = state.monsters.findIndex(m => m.instanceId === pass.instanceId);
                if (idx !== -1) {
                  state.monsters[idx] = { ...state.monsters[idx], controllerId: pass.toHeroId };
                  passMsgs.push(`${pass.monsterName} → ${pass.toHeroId}`);
                }
              }
              state.encounterEffectMessage = passMsgs.length > 0
                ? `Warp in Time: ${passMsgs.join(', ')}`
                : 'Warp in Time: No monsters to pass';
            }
          }
          
          // For other special cards, just log a warning for now
          else {
            console.warn(`Special encounter '${state.drawnEncounter.name}' (${encounterId}) effect not yet implemented`);
            state.encounterEffectMessage = 'Effect not yet implemented';
          }
          
          // Discard the encounter card (if not already discarded by effect handler)
          if (state.drawnEncounter) {
            state.encounterDeck = discardEncounter(state.encounterDeck, state.drawnEncounter.id);
          }
          
          // Check if Bad Luck curse requires drawing an extra encounter FIRST
          // This ensures Bad Luck extra is drawn before any special encounter extras
          if (state.badLuckExtraEncounterPending) {
            state.badLuckExtraEncounterPending = false;
            
            // Draw the extra encounter for Bad Luck curse
            const { encounterId: badLuckEncounterId, deck: updatedDeck } = drawEncounter(state.encounterDeck);
            state.encounterDeck = updatedDeck;
            
            if (badLuckEncounterId) {
              const badLuckEncounter = getEncounterById(badLuckEncounterId);
              if (badLuckEncounter) {
                state.drawnEncounter = badLuckEncounter;
                const currentHeroId = state.heroTokens[state.turnState.currentHeroIndex]?.heroId;
                state.encounterEffectMessage = `Bad Luck curse: ${currentHeroId} draws an extra encounter!`;
                // Note: If this Bad Luck encounter itself requires another draw (like Deadly Poison),
                // it will be handled when this encounter is dismissed
                return;
              }
            }
          }
          
          // Check if we need to draw another encounter card (for special encounters like Deadly Poison)
          // Skip this for Hidden Treasure since the follow-up encounter is drawn after token placement
          if (shouldDrawAnotherEncounter(encounterId) && encounterId !== 'hidden-treasure') {
            const { encounterId: nextEncounterId, deck: updatedDeck } = drawEncounter(state.encounterDeck);
            state.encounterDeck = updatedDeck;
            
            if (nextEncounterId) {
              const nextEncounter = getEncounterById(nextEncounterId);
              if (nextEncounter) {
                state.drawnEncounter = nextEncounter;
                // If hero has Bad Luck curse, set flag again for the extra draw after this one
                const currentHeroId = state.heroTokens[state.turnState.currentHeroIndex]?.heroId;
                if (currentHeroId) {
                  const heroHp = state.heroHp.find(h => h.heroId === currentHeroId);
                  if (heroHp?.statuses?.some(s => s.type === 'curse-bad-luck')) {
                    state.badLuckExtraEncounterPending = true;
                  }
                }
                return;
              }
            }
          }
        } else if (state.drawnEncounter.effect.type === 'curse') {
          // Apply curse as a status effect to the active hero
          const activeHeroId = activeHeroToken?.heroId;
          
          if (activeHeroId) {
            const curseType = getCurseStatusType(state.drawnEncounter.id);
            if (curseType) {
              const heroHpIndex = state.heroHp.findIndex(h => h.heroId === activeHeroId);
              if (heroHpIndex !== -1) {
                const heroHp = state.heroHp[heroHpIndex];
                const updatedStatuses = applyStatusEffect(
                  heroHp.statuses ?? [],
                  curseType,
                  state.drawnEncounter.id,
                  state.turnState.turnNumber
                );
                
                // Get base AC from hero level stats
                const hero = AVAILABLE_HEROES.find(h => h.id === activeHeroId);
                const baseAC = hero ? HERO_LEVELS[activeHeroId][`level${heroHp.level}`].ac : heroHp.ac;
                
                // Recalculate AC with updated status effects
                const modifiedAC = getModifiedAC(updatedStatuses, baseAC);
                
                // Special handling for Time Leap curse - remove hero from play
                const isTimeLeap = state.drawnEncounter.id === 'time-leap';
                state.heroHp[heroHpIndex] = {
                  ...heroHp,
                  statuses: updatedStatuses,
                  ac: modifiedAC,
                  removedFromPlay: isTimeLeap ? true : (heroHp.removedFromPlay || false),
                };
                
                // Log curse application
                const curseName = state.drawnEncounter.name;
                const logExtendedDetails = isTimeLeap 
                  ? `${activeHeroId} removed from play until next turn\nEffect: ${state.drawnEncounter.effect.description}` 
                  : `Effect: ${state.drawnEncounter.effect.description}`;
                state.logEntries.push({
                  id: state.logEntryCounter++,
                  timestamp: Date.now(),
                  type: 'encounter',
                  message: `Curse applied: ${curseName} on ${activeHeroId}`,
                  details: state.drawnEncounter.description,
                  extendedDetails: logExtendedDetails,
                  heroId: activeHeroId,
                });
                
                if (isTimeLeap) {
                  state.encounterEffectMessage = `${activeHeroId} is removed from play until next turn!`;
                }
              }
            }
          }
          
          // Discard curse encounter card
          state.encounterDeck = discardEncounter(state.encounterDeck, state.drawnEncounter.id);
          
          // Check if Bad Luck curse requires drawing an extra encounter
          if (state.badLuckExtraEncounterPending) {
            state.badLuckExtraEncounterPending = false;
            
            // Draw the extra encounter for Bad Luck curse
            const { encounterId, deck: updatedDeck } = drawEncounter(state.encounterDeck);
            state.encounterDeck = updatedDeck;
            
            if (encounterId) {
              const encounter = getEncounterById(encounterId);
              if (encounter) {
                state.drawnEncounter = encounter;
                const currentHeroId = activeHeroToken?.heroId;
                state.encounterEffectMessage = `Bad Luck curse: ${currentHeroId} draws an extra encounter!`;
                
                // Log Bad Luck extra encounter
                const canCancel = canCancelEncounter(state.partyResources);
                const cancelInfo = canCancel ? ` (Cancel: ${ENCOUNTER_CANCEL_COST} XP)` : '';
                state.logEntries.push({
                  id: state.logEntryCounter++,
                  timestamp: Date.now(),
                  type: 'encounter',
                  message: `Bad Luck: Extra encounter - ${encounter.name} (${encounter.type})${cancelInfo}`,
                  details: encounter.description,
                  extendedDetails: `Effect: ${encounter.effect.description}`,
                  heroId: currentHeroId,
                });
                return;
              }
            }
          }
        } else {
          // Get the current hero ID for active-hero effects
          const activeHeroId = activeHeroToken?.heroId;
          
          if (activeHeroId) {
            // Apply the encounter effect
            const { heroHpList, results } = resolveEncounterEffect(
              state.drawnEncounter,
              state.heroHp,
              activeHeroId,
              state.heroTokens,
              state.dungeon
            );
            state.heroHp = heroHpList;
            
            // Log encounter effect
            if (results.length > 0) {
              const targetSummaries = results.map(r => {
                const parts = [];
                if (r.wasHit !== undefined) {
                  parts.push(r.wasHit ? 'Hit' : 'Miss');
                }
                if (r.damageTaken > 0) {
                  parts.push(`${r.damageTaken} dmg`);
                }
                if (r.statusesApplied && r.statusesApplied.length > 0) {
                  parts.push(r.statusesApplied.join(', '));
                }
                return `${r.heroName}: ${parts.join(', ')}`;
              });
              
              const detailedSummaries = buildDetailedResultSummaries(results);
              
              state.logEntries.push({
                id: state.logEntryCounter++,
                timestamp: Date.now(),
                type: 'encounter',
                message: `${state.drawnEncounter.name} - ${targetSummaries.join('; ')}`,
                details: state.drawnEncounter.description,
                extendedDetails: `Effect: ${state.drawnEncounter.effect.description}\n\n${detailedSummaries}`,
              });
            } else {
              // No immediate effects (e.g., environment cards)
              state.logEntries.push({
                id: state.logEntryCounter++,
                timestamp: Date.now(),
                type: 'encounter',
                message: `Resolved: ${state.drawnEncounter.name}`,
                details: state.drawnEncounter.description,
                extendedDetails: `Effect: ${state.drawnEncounter.effect.description}`,
              });
            }
            
            // Store results for popup display if there were any effects
            if (results.length > 0) {
              state.encounterResult = {
                encounterId: state.drawnEncounter.id,
                encounterName: state.drawnEncounter.name,
                targets: results,
              };
            }
            
            // Check for party defeat (all heroes at 0 HP)
            const allHeroesDefeated = state.heroHp.every(h => h.currentHp <= 0);
            if (allHeroesDefeated) {
              state.defeatReason = `The party was overwhelmed by ${state.drawnEncounter.name}.`;
              state.currentScreen = "defeat";
            }
          }
          
          // Discard non-environment encounters
          state.encounterDeck = discardEncounter(state.encounterDeck, state.drawnEncounter.id);
          
          // Check if Bad Luck curse requires drawing an extra encounter
          if (state.badLuckExtraEncounterPending) {
            state.badLuckExtraEncounterPending = false;
            
            // Draw the extra encounter for Bad Luck curse
            const { encounterId, deck: updatedDeck } = drawEncounter(state.encounterDeck);
            state.encounterDeck = updatedDeck;
            
            if (encounterId) {
              const encounter = getEncounterById(encounterId);
              if (encounter) {
                state.drawnEncounter = encounter;
                const currentHeroId = activeHeroToken?.heroId;
                state.encounterEffectMessage = `Bad Luck curse: ${currentHeroId} draws an extra encounter!`;
                
                // Log Bad Luck extra encounter
                const canCancel = canCancelEncounter(state.partyResources);
                const cancelInfo = canCancel ? ` (Cancel: ${ENCOUNTER_CANCEL_COST} XP)` : '';
                state.logEntries.push({
                  id: state.logEntryCounter++,
                  timestamp: Date.now(),
                  type: 'encounter',
                  message: `Bad Luck: Extra encounter - ${encounter.name} (${encounter.type})${cancelInfo}`,
                  details: encounter.description,
                  extendedDetails: `Effect: ${encounter.effect.description}`,
                  heroId: currentHeroId,
                });
                return;
              }
            }
          }
        }
        
        state.drawnEncounter = null;
        state.badLuckExtraEncounterPending = false;
      }
    },
    /**
     * Register event hooks for all heroes' power cards.
     * Re-registers from scratch based on current card states (only non-flipped cards get hooks).
     * Should be called after game start and whenever power card states change (rest, card use).
     */
    registerEventHooks: (state, action: PayloadAction<HeroPowerCards[]>) => {
      // Re-register from scratch: only cards that are not flipped will have active hooks.
      // This ensures the registry always reflects the current availability of power cards.
      state.eventHooks = registerAllHeroHooks(initializeEventHooks(), action.payload);
    },
    /**
     * Clear pending power card flips (called after heroesSlice has processed them).
     */
    clearPendingPowerCardFlips: (state) => {
      state.pendingPowerCardFlips = [];
    },
    /**
     * Unregister event hook for a specific power card (called when a card is manually used).
     */
    unregisterEventHookForCard: (state, action: PayloadAction<{ powerCardId: number; heroId: string }>) => {
      state.eventHooks = unregisterPowerCard(state.eventHooks, action.payload.powerCardId, action.payload.heroId);
    },
    /**
     * Cancel the encounter card by spending XP (skips encounter effect)
     * Cost may be reduced by Perseverance card effect.
     */
    cancelEncounterCard: (state) => {
      if (state.drawnEncounter && state.partyResources.xp >= state.encounterCancelCost) {
        state.villainPhaseStepMessage = null;
        const encounterName = state.drawnEncounter.name;
        const cancelCost = state.encounterCancelCost;
        
        // Cancel encounter - deducts XP (using potentially Perseverance-modified cost) and discards the card
        state.partyResources = {
          ...state.partyResources,
          xp: state.partyResources.xp - cancelCost,
        };
        state.encounterDeck = {
          ...state.encounterDeck,
          discardPile: [...state.encounterDeck.discardPile, state.drawnEncounter.id],
        };
        state.drawnEncounter = null;
        state.encounterCancelCost = ENCOUNTER_CANCEL_COST;
        
        // Log encounter cancellation
        state.logEntries.push({
          id: state.logEntryCounter++,
          timestamp: Date.now(),
          type: 'encounter',
          message: `Cancelled: ${encounterName} (-${cancelCost} XP, ${state.partyResources.xp} remaining)`,
        });
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
      action: PayloadAction<{ result: AttackResult; targetInstanceId: string; attackName: string; cardId?: number; treasureItemCardId?: number; usesMoveAction?: boolean }>
    ) => {
      const { treasureItemCardId, usesMoveAction } = action.payload;
      
      // Only allow attack during hero phase
      if (state.turnState.currentPhase !== "hero-phase") {
        return;
      }
      
      // For treasure item attacks that use the move action, check canMove
      // For regular attacks, check canAttack
      if (usesMoveAction) {
        if (!state.heroTurnActions.canMove) {
          return;
        }
      } else {
        if (!state.heroTurnActions.canAttack) {
          return;
        }
      }
      
      const { result, targetInstanceId, attackName, cardId } = action.payload;
      state.attackTargetId = targetInstanceId;
      state.attackName = attackName;
      
      // Clear undo snapshot - attacks involve die rolls and are irreversible
      state.undoSnapshot = null;
      
      // Finalize any in-progress incremental movement (discard remaining movement)
      if (state.incrementalMovement?.inProgress) {
        state.incrementalMovement.inProgress = false;
        state.incrementalMovement.remainingMovement = 0;
        // Track the move action since we're committing to it before attacking
        const heroId = state.incrementalMovement.heroId;
        const heroStatuses = getHeroStatuses(state, heroId);
        state.heroTurnActions = computeHeroTurnActions(state.heroTurnActions, 'move', heroStatuses);
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
      let actualDamage = (result.isHit && currentHeroHp) 
        ? calculateDamage(currentHeroHp.level, result.roll, result.damage)
        : result.damage;
      
      // Trigger attack-hit-by-hero event for power card hooks (e.g., Furious Assault +1 damage)
      if (result.isHit && currentHeroId) {
        const attackHitEvent: AttackHitByHeroEvent = {
          type: 'attack-hit-by-hero',
          heroId: currentHeroId,
          turnNumber: state.turnState.turnNumber,
          attackerId: currentHeroId,
          targetMonsterId: targetInstanceId,
          attackResult: result,
          damage: actualDamage,
          powerCardId: cardId,
        };
        const eventResult = triggerGameEvent(state.eventHooks, attackHitEvent);
        // Apply damage modification from hooks (e.g., Furious Assault +1)
        actualDamage = eventResult.event.damage;
        // Queue power card flips and unregister used hooks
        for (const flip of eventResult.powerCardsToFlip) {
          state.pendingPowerCardFlips.push(flip);
          state.eventHooks = unregisterPowerCard(state.eventHooks, flip.powerCardId, flip.heroId);
        }
      } else if (!result.isHit && currentHeroId) {
        // Trigger attack-miss event for power card hooks (e.g., Inspiring Advice reroll)
        const attackMissEvent: AttackMissEvent = {
          type: 'attack-miss',
          heroId: currentHeroId,
          turnNumber: state.turnState.turnNumber,
          attackerId: currentHeroId,
          targetMonsterId: targetInstanceId,
          attackResult: result,
          powerCardId: cardId,
        };
        const attackMissHookResult = triggerGameEvent(state.eventHooks, attackMissEvent);
        // Note: Inspiring Advice reroll is handled via UI interaction using pendingPowerCardFlips

        // Handle scenario hooks: dealDamageToHero (e.g. Adventure 14 Reflect Natural-One)
        for (const { heroId: damagedHeroId, damage: reflectDamage, reason: reflectReason } of attackMissHookResult.dealDamageToHero) {
          const reflectHeroHpIndex = state.heroHp.findIndex(h => h.heroId === damagedHeroId);
          if (reflectHeroHpIndex !== -1) {
            state.heroHp[reflectHeroHpIndex].currentHp = Math.max(
              0,
              state.heroHp[reflectHeroHpIndex].currentHp - reflectDamage
            );
            state.logEntries.push({
              id: state.logEntryCounter++,
              timestamp: Date.now(),
              type: 'game-event',
              message: `💫 ${reflectReason}: ${reflectDamage} damage`,
              details: `${damagedHeroId} takes ${reflectDamage} damage from void reflection.`,
              heroId: damagedHeroId,
            });
          }
        }
      }

      // Always store the result with calculated damage for display consistency
      state.attackResult = { ...result, damage: actualDamage };
      
      // Log the attack attempt
      const attackerHero = AVAILABLE_HEROES.find(h => h.id === currentHeroId);
      const attackerName = attackerHero?.name ?? currentHeroId;
      const targetMonster = state.monsters.find(m => m.instanceId === targetInstanceId);
      const targetMonsterDef = targetMonster ? getMonsterById(targetMonster.monsterId) : null;
      const targetName = targetMonsterDef?.name ?? 'Monster';
      
      // Build log message and details
      const hitOrMiss = result.isHit ? 'Hit' : 'Miss';
      const criticalText = result.isCritical ? ' (Critical!)' : '';
      const logMessage = `${attackerName} attacks ${targetName}: ${hitOrMiss}!${criticalText}`;
      
      // Build detailed breakdown
      let logDetails = `Roll: ${result.roll} + ${result.attackBonus} = ${result.total} vs AC ${result.targetAC}`;
      if (result.isHit) {
        logDetails += ` | Damage: ${actualDamage}`;
        if (targetMonster && targetMonster.currentHp - actualDamage <= 0) {
          logDetails += ' | Monster defeated!';
        }
      }
      
      state.logEntries.push({
        id: state.logEntryCounter++,
        timestamp: Date.now(),
        type: 'combat',
        message: logMessage,
        details: logDetails,
        heroId: currentHeroId,
      });
      
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
            
            // Check if this monster is part of a group
            const groupId = monster.groupId;
            let xpGained = 0;
            let monsterName = monsterDef?.name ?? monster.monsterId;
            
            if (groupId) {
              // Monster is part of a group - check if all group members are defeated
              const group = state.monsterGroups.find(g => g.groupId === groupId);
              if (group) {
                // Remove this monster from the group
                const groupIndex = state.monsterGroups.findIndex(g => g.groupId === groupId);
                if (groupIndex !== -1) {
                  state.monsterGroups[groupIndex] = removeMonsterFromGroup(group, monster.instanceId);
                }
                
                // Remove defeated monster from board first
                state.monsters = state.monsters.filter(m => m.instanceId !== targetInstanceId);
                
                // Check if all group members are now defeated
                if (isGroupDefeated(group, state.monsters)) {
                  // Award group XP
                  xpGained = group.xp;
                  monsterName = group.monsterName;
                  
                  // Remove the completed group
                  state.monsterGroups = state.monsterGroups.filter(g => g.groupId !== groupId);
                } else {
                  // Group not fully defeated yet, no XP awarded
                  xpGained = 0;
                  monsterName = '';
                }
              } else {
                // Group not found (should not happen), award individual XP as fallback
                console.error(`[XP Award] Monster ${monster.instanceId} has groupId ${groupId} but group not found. This indicates a data consistency issue. Awarding individual XP as fallback.`);
                xpGained = monsterDef?.xp ?? 0;
                state.monsters = state.monsters.filter(m => m.instanceId !== targetInstanceId);
              }
            } else {
              // Not part of a group, award XP immediately
              xpGained = monsterDef?.xp ?? 0;
              state.monsters = state.monsters.filter(m => m.instanceId !== targetInstanceId);
            }
            
            // Set defeat notification for UI
            if (xpGained > 0) {
              // Full XP awarded (individual monster or completed group)
              state.partyResources.xp += xpGained;
              state.defeatedMonsterXp = xpGained;
              state.defeatedMonsterName = monsterName;
            } else if (groupId) {
              // Group member defeated but group not complete - show partial defeat notification
              state.defeatedMonsterXp = 0;
              state.defeatedMonsterName = monsterDef?.name ?? monster.monsterId;
            }
            
            // Discard the monster card
            state.monsterDeck = discardMonster(state.monsterDeck, monster.monsterId);
            
            // Track monster defeated for scenario
            state.scenario.monstersDefeated += 1;
            
            // Remove Bloodlust curse from attacking hero if they have it
            const attackerHeroId = state.heroTokens[state.turnState.currentHeroIndex]?.heroId;
            if (attackerHeroId) {
              const attackerHpIndex = state.heroHp.findIndex(h => h.heroId === attackerHeroId);
              if (attackerHpIndex !== -1) {
                const attackerHp = state.heroHp[attackerHpIndex];
                if (hasStatusEffect(attackerHp.statuses ?? [], 'curse-bloodlust')) {
                  state.heroHp[attackerHpIndex] = {
                    ...attackerHp,
                    statuses: removeStatusEffect(attackerHp.statuses ?? [], 'curse-bloodlust'),
                  };
                  
                  // Append bloodlust removal message to encounter effect message
                  const removalMessage = `${attackerHeroId}'s Bloodlust curse is lifted!`;
                  if (state.encounterEffectMessage) {
                    state.encounterEffectMessage += ` | ${removalMessage}`;
                  } else {
                    state.encounterEffectMessage = removalMessage;
                  }
                }
              }
            }
            
            // Draw treasure on monster defeat (only once per turn)
            if (!state.treasureDrawnThisTurn) {
              const { treasure: treasureId, deck: updatedTreasureDeck } = drawTreasure(state.treasureDeck);
              state.treasureDeck = updatedTreasureDeck;
              
              if (treasureId !== null) {
                const treasureCard = getTreasureById(treasureId);
                if (treasureCard) {
                  state.drawnTreasure = treasureCard;
                  state.treasureDrawnThisTurn = true;
                  
                  // Log the treasure draw
                  const treasureHeroId = state.heroTokens[state.turnState.currentHeroIndex]?.heroId;
                  const treasureHero = AVAILABLE_HEROES.find(h => h.id === treasureHeroId);
                  const treasureHeroName = treasureHero?.name ?? treasureHeroId ?? 'Hero';
                  state.logEntries.push({
                    id: state.logEntryCounter++,
                    timestamp: Date.now(),
                    type: 'hero-action',
                    message: `🎁 ${treasureHeroName} draws a treasure card: ${treasureCard.name}`,
                    details: treasureCard.rule,
                    heroId: treasureHeroId,
                  });
                }
              }
            }
            
            // Check for victory condition (MVP: defeat 2 monsters)
            if (state.scenario.monstersDefeated >= state.scenario.monstersToDefeat) {
              state.victoryReason = `You have defeated ${state.scenario.monstersDefeated} monsters and completed the objective!`;
              state.currentScreen = "victory";
            }
          }
        }

        // Apply damage to villain if it is the target
        if (state.villain && state.villain.instanceId === targetInstanceId) {
          const villainDef = getVillainDefForScenario(state.selectedScenarioId);
          const shielded = villainDef
            ? isVillainShielded(state.villain, villainDef, state.monsters, state.dungeon)
            : false;

          if (!shielded) {
            state.villain.currentHp = Math.max(0, state.villain.currentHp - actualDamage);

            if (state.villain.currentHp <= 0) {
              // Villain defeated — victory!
              state.scenario.villainInstanceId = null;
              const defeatedName = villainDef?.name ?? 'the Villain';
              state.defeatedMonsterName = defeatedName;
              state.defeatedMonsterXp = 0; // Villains don't award XP (win condition)
              state.logEntries.push({
                id: state.logEntryCounter++,
                timestamp: Date.now(),
                type: 'combat',
                message: `⚔️ ${defeatedName} has been defeated! Victory!`,
              });
              state.victoryReason = `You have defeated ${defeatedName} and completed the scenario!`;
              state.currentScreen = "victory";
            }
          } else {
            // Shield is active — damage is blocked
            state.logEntries.push({
              id: state.logEntryCounter++,
              timestamp: Date.now(),
              type: 'combat',
              message: `🛡️ ${villainDef?.name ?? 'Villain'}'s shield absorbs the attack!`,
              details: 'Defeat all adjacent guards to remove the shield.',
            });
            // Override attack result to show 0 damage (absorbed)
            state.attackResult = { ...result, damage: 0, isHit: false };
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
        
        // Log level up
        const levelUpHero = AVAILABLE_HEROES.find(h => h.id === currentHeroId);
        const heroName = levelUpHero?.name ?? currentHeroId;
        state.logEntries.push({
          id: state.logEntryCounter++,
          timestamp: Date.now(),
          type: 'hero-action',
          message: `${heroName} levels up to Level 2!`,
          details: `Natural 20 rolled, 5 XP spent | HP: ${state.levelUpOldStats.maxHp} → ${levelUpResult.heroState.maxHp}, AC: ${state.levelUpOldStats.ac} → ${levelUpResult.heroState.ac}`,
          heroId: currentHeroId,
        });
      }
      
      // Check if this card has hit-or-miss effects
      if (cardId) {
        const powerCard = POWER_CARDS.find(c => c.id === cardId);
        if (powerCard) {
          const parsedAction = parseActionCard(powerCard);
          
          // Apply hit-or-miss healing effect (e.g., Righteous Smite)
          const healEffect = parsedAction.hitOrMissEffects?.find(e => e.type === 'heal');
          if (healEffect && healEffect.amount !== undefined && healEffect.amount !== null) {
            // Find all heroes on the same tile as the attacker
            const attackerToken = state.heroTokens.find(t => t.heroId === currentHeroId);
            
            if (attackerToken) {
              // Find the tile the attacker is on
              const attackerTileId = getTileOrSubTileId(attackerToken.position, state.dungeon);
              
              // Heal all heroes on the same tile/sub-tile
              for (const token of state.heroTokens) {
                const heroTileId = getTileOrSubTileId(token.position, state.dungeon);
                if (heroTileId && heroTileId === attackerTileId) {
                  const heroHpIndex = state.heroHp.findIndex(h => h.heroId === token.heroId);
                  if (heroHpIndex !== -1) {
                    const heroHp = state.heroHp[heroHpIndex];
                    // Heal the hero, capped at max HP
                    heroHp.currentHp = Math.min(heroHp.maxHp, heroHp.currentHp + healEffect.amount);
                  }
                }
              }
            }
          }
          
          // Check if this card has an "ally-move" effect (Hit or Miss)
          // If so, set up pendingMoveAfterAttack state
          const allyMoveEffect = parsedAction.hitOrMissEffects?.find(e => e.type === 'ally-move');
          
          if (allyMoveEffect && allyMoveEffect.amount) {
            // Determine if this was the first or second action
            const wasFirstAction = state.heroTurnActions.actionsTaken.length === 0;
            
            // Find all heroes on the same tile as the attacker
            const attackerToken = state.heroTokens.find(t => t.heroId === currentHeroId);
            const availableHeroes: string[] = [];
            
            if (attackerToken) {
              // Find the tile the attacker is on
              const attackerTileId = getTileOrSubTileId(attackerToken.position, state.dungeon);
              
              // Find all heroes on the same tile/sub-tile
              for (const token of state.heroTokens) {
                const heroTileId = getTileOrSubTileId(token.position, state.dungeon);
                if (heroTileId && heroTileId === attackerTileId) {
                  availableHeroes.push(token.heroId);
                }
              }
            }
            
            // Set pending move-after-attack state
            state.pendingMoveAfterAttack = {
              cardId,
              moveDistance: allyMoveEffect.amount,
              wasFirstAction,
              selectedHeroId: availableHeroes.length === 1 ? availableHeroes[0] : null,
              availableHeroes,
            };
          }

          // Check if this card has a "self-move" effect (attacker moves their speed after attack)
          const selfMoveEffect = parsedAction.hitOrMissEffects?.find(e => e.type === 'self-move');

          // Only set up self-move if no other pending move-after-attack is already in progress
          // (prevents overwriting an ally-move effect set by the same card)
          if (selfMoveEffect && !state.pendingMoveAfterAttack) {
            // Determine if this was the first or second action
            const wasFirstAction = state.heroTurnActions.actionsTaken.length === 0;

            // The attacker moves their own speed
            const attackerHero = AVAILABLE_HEROES.find(h => h.id === currentHeroId);
            const moveDistance = attackerHero?.speed ?? DEFAULT_HERO_SPEED;

            state.pendingMoveAfterAttack = {
              cardId,
              moveDistance,
              wasFirstAction,
              selectedHeroId: currentHeroId,
              availableHeroes: [currentHeroId],
            };
          }
          
          // Check if this card has an "ac-bonus" effect (Hit or Miss)
          const acBonusEffect = parsedAction.hitOrMissEffects?.find(e => e.type === 'ac-bonus');
          
          // Only apply if this card has AC bonus effect (currently only Cleric's Shield, ID 2)
          // Future cards with AC bonus effects will also work with this logic
          if (acBonusEffect && acBonusEffect.amount && powerCard) {
            // Cleric's Shield and other AC bonus powers: +X AC to one hero on the same tile
            // Effect persists until this power is used again
            
            // For now, automatically apply to the first hero on the tile
            // TODO: In full implementation, show a hero selection UI if multiple heroes available
            const attackerToken = state.heroTokens.find(t => t.heroId === currentHeroId);
            
            if (attackerToken) {
              // Find the tile the attacker is on
              const attackerTileId = getTileOrSubTileId(attackerToken.position, state.dungeon);
              
              // Find all heroes on the same tile/sub-tile
              const heroesOnTile: string[] = [];
              for (const token of state.heroTokens) {
                const heroTileId = getTileOrSubTileId(token.position, state.dungeon);
                if (heroTileId && heroTileId === attackerTileId) {
                  heroesOnTile.push(token.heroId);
                }
              }
              
              // Apply bonus to first hero on tile (in practice, usually the caster themselves)
              // The bonus persists until Cleric's Shield is used again
              if (heroesOnTile.length > 0) {
                state.clericsShieldTarget = heroesOnTile[0];
              }
            }
          }
        }
      }
      
      // Track the attack action (unless we're in a multi-attack sequence)
      // For multi-attacks, the action is tracked only once when the sequence completes
      if (!state.multiAttackState) {
        const currentHeroId = state.heroTokens[state.turnState.currentHeroIndex]?.heroId;
        if (currentHeroId) {
          const heroStatuses = getHeroStatuses(state, currentHeroId);
          // Treasure item attacks that say "instead of moving" consume the move action
          const actionType = usesMoveAction ? 'move' : 'attack';
          state.heroTurnActions = computeHeroTurnActions(state.heroTurnActions, actionType, heroStatuses);
        }
      }
      
      // If this was a treasure item attack, flip/discard the item and clear pending state
      if (treasureItemCardId !== undefined) {
        const pendingAttack = state.pendingTreasureItemAttack;
        if (!pendingAttack) {
          // Should not happen - pendingTreasureItemAttack must be set before calling setAttackResult with treasureItemCardId
          state.pendingTreasureItemAttack = null;
          return;
        }
        const treasureCard = getTreasureById(treasureItemCardId);
        if (treasureCard && state.heroInventories[pendingAttack.heroId]) {
          if (treasureCard.discardAfterUse) {
            state.heroInventories[pendingAttack.heroId] = removeTreasureFromInventory(
              state.heroInventories[pendingAttack.heroId], treasureItemCardId
            );
            state.treasureDeck = discardTreasure(state.treasureDeck, treasureItemCardId);
          } else {
            state.heroInventories[pendingAttack.heroId] = flipTreasureInInventory(
              state.heroInventories[pendingAttack.heroId], treasureItemCardId
            );
          }
        }
        state.pendingTreasureItemAttack = null;
      }
    },
    /**
     * Dismiss the attack result display
     * If pendingMoveAfterAttack is set, this will trigger hero selection (if needed) or movement UI
     */
    dismissAttackResult: (state) => {
      state.attackResult = null;
      state.attackTargetId = null;
      state.attackName = null;
      
      // If there's a pending move-after-attack and a hero has been selected, show movement UI
      if (state.pendingMoveAfterAttack && state.pendingMoveAfterAttack.selectedHeroId) {
        const selectedHeroToken = state.heroTokens.find(
          t => t.heroId === state.pendingMoveAfterAttack!.selectedHeroId
        );
        
        if (selectedHeroToken) {
          // Calculate valid move squares based on the effect's move distance
          const moveDistance = state.pendingMoveAfterAttack.moveDistance;
          state.validMoveSquares = getValidMoveSquares(
            selectedHeroToken.position,
            moveDistance,
            state.heroTokens,
            state.pendingMoveAfterAttack.selectedHeroId,
            state.dungeon
          );
          state.showingMovement = true;
        }
      }
      // If pendingMoveAfterAttack is set but no hero selected yet, hero selection UI will show
      // (handled in the UI layer)
    },
    /**
     * Dismiss the trap disable result display
     */
    dismissTrapDisableResult: (state) => {
      state.trapDisableResult = null;
    },
    /**
     * Add a log entry to the player-visible log
     */
    addLogEntry: (
      state,
      action: PayloadAction<{
        type: import('./types').LogMessageType;
        message: string;
        details?: string;
        extendedDetails?: string;
        heroId?: string;
      }>,
    ) => {
      const { type, message, details, extendedDetails, heroId } = action.payload;
      const newEntry: import('./types').LogEntry = {
        id: state.logEntryCounter++,
        timestamp: Date.now(),
        type,
        message,
        details,
        extendedDetails,
        heroId,
      };
      state.logEntries.push(newEntry);
    },
    /**
     * Dismiss the monster defeat/XP notification
     */
    dismissDefeatNotification: (state) => {
      state.defeatedMonsterXp = null;
      state.defeatedMonsterName = null;
    },
    /**
     * Set defeat notification (for testing only)
     */
    setDefeatNotification: (state, action: PayloadAction<{ xp: number; monsterName: string }>) => {
      state.defeatedMonsterXp = action.payload.xp;
      state.defeatedMonsterName = action.payload.monsterName;
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
        const cardId = state.multiAttackState.cardId;
        
        // Clear multi-attack state when done
        state.multiAttackState = null;
        
        // Check if this is Tornado Strike (ID: 37) which requires hero placement after attacks
        if (cardId === 37) {
          const currentHeroId = state.heroTokens[state.turnState.currentHeroIndex]?.heroId;
          const currentToken = state.heroTokens.find(t => t.heroId === currentHeroId);
          if (currentToken && currentHeroId) {
            // Find the actual tile (not sub-tile ID)
            const tile = findTileAtPosition(currentToken.position, state.dungeon);
            if (tile) {
              // Trigger hero placement selection
              state.pendingHeroPlacement = {
                cardId,
                heroId: currentHeroId,
                tileId: tile.id, // Use the tile's actual ID
              };
              // Don't track the attack action yet - wait until placement is complete
              return;
            }
          }
        }
        
        // Track the attack action (only once per multi-attack sequence)
        const currentHeroId = state.heroTokens[state.turnState.currentHeroIndex]?.heroId;
        if (currentHeroId) {
          const heroStatuses = getHeroStatuses(state, currentHeroId);
          state.heroTurnActions = computeHeroTurnActions(state.heroTurnActions, 'attack', heroStatuses);
        }
      }
    },
    /**
     * Cancel/clear the multi-attack state (e.g., when target dies mid-sequence)
     */
    clearMultiAttack: (state) => {
      if (state.multiAttackState) {
        // If at least one attack was made, count the action
        if (state.multiAttackState.attacksCompleted > 0) {
          const currentHeroId = state.heroTokens[state.turnState.currentHeroIndex]?.heroId;
          if (currentHeroId) {
            const heroStatuses = getHeroStatuses(state, currentHeroId);
            state.heroTurnActions = computeHeroTurnActions(state.heroTurnActions, 'attack', heroStatuses);
          }
        }
        state.multiAttackState = null;
      }
    },
    /**
     * Start hero placement selection (for cards like Tornado Strike)
     */
    startHeroPlacement: (
      state,
      action: PayloadAction<{ cardId: number; heroId: string; tileId: string }>
    ) => {
      const { cardId, heroId, tileId } = action.payload;
      state.pendingHeroPlacement = {
        cardId,
        heroId,
        tileId,
      };
    },
    /**
     * Complete hero placement by moving hero to selected square
     */
    completeHeroPlacement: (
      state,
      action: PayloadAction<{ position: Position }>
    ) => {
      if (!state.pendingHeroPlacement) return;
      
      const { heroId } = state.pendingHeroPlacement;
      const { position } = action.payload;
      
      // Find hero token and update position
      const heroToken = state.heroTokens.find(t => t.heroId === heroId);
      if (heroToken) {
        heroToken.position = position;
      }
      
      // Clear the pending placement state
      state.pendingHeroPlacement = null;
      
      // Track the attack action now that placement is complete
      const heroStatuses = getHeroStatuses(state, heroId);
      state.heroTurnActions = computeHeroTurnActions(state.heroTurnActions, 'attack', heroStatuses);
    },
    /**
     * Cancel hero placement selection
     */
    cancelHeroPlacement: (state) => {
      state.pendingHeroPlacement = null;
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
     * Note: This doesn't hide the movement overlay - the player can continue moving
     * during a charge attack until they attack or cancel
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
     * Cancel the move-attack sequence and undo any movement
     * After canceling, the player can still move normally, so we show movement
     */
    cancelMoveAttack: (state) => {
      if (!state.pendingMoveAttack) return;
      
      // Find the current hero
      const currentHeroId = state.heroTokens[state.turnState.currentHeroIndex]?.heroId;
      const currentToken = state.heroTokens.find(t => t.heroId === currentHeroId);
      
      if (currentToken) {
        // Restore hero to starting position
        currentToken.position = { ...state.pendingMoveAttack.startPosition };
        
        // Recalculate valid move squares from the restored position
        // Player can still move after canceling the charge
        const speed = state.incrementalMovement?.totalSpeed ?? DEFAULT_HERO_SPEED;
        state.validMoveSquares = getValidMoveSquares(
          state.pendingMoveAttack.startPosition,
          speed,
          state.heroTokens,
          currentHeroId,
          state.dungeon,
        );
        // Keep movement overlay visible since player can still move
        state.showingMovement = true;
      }
      
      // Clear incremental movement state completely
      state.incrementalMovement = undefined;
      
      // Clear the move-attack state
      state.pendingMoveAttack = null;
    },
    /**
     * Complete the move-after-attack sequence (when ally finishes moving)
     * This clears the pendingMoveAfterAttack state and continues the game
     */
    completeMoveAfterAttack: (state) => {
      if (!state.pendingMoveAfterAttack) return;
      
      // Clear the move-after-attack state
      state.pendingMoveAfterAttack = null;
      
      // Hide movement UI
      state.showingMovement = false;
      state.validMoveSquares = [];
      
      // If this was the first action, player can still do a second action
      // The game should continue in hero phase
      // If this was the second action, hero phase should end (handled by UI)
    },
    /**
     * Cancel the move-after-attack sequence (skip the movement portion)
     * This does NOT undo the attack, it simply skips the movement effect
     * The player may still be able to move normally after canceling
     */
    cancelMoveAfterAttack: (state) => {
      if (!state.pendingMoveAfterAttack) return;
      
      const wasFirstAction = state.pendingMoveAfterAttack.wasFirstAction;
      
      // Clear the move-after-attack state
      state.pendingMoveAfterAttack = null;
      
      // If this was the first action and the player can still move, show normal movement
      if (wasFirstAction && state.heroTurnActions.canMove) {
        const currentHeroId = state.heroTokens[state.turnState.currentHeroIndex]?.heroId;
        const currentToken = state.heroTokens.find(t => t.heroId === currentHeroId);
        
        if (currentToken) {
          // Show normal movement with hero's speed
          const speed = DEFAULT_HERO_SPEED;
          state.validMoveSquares = getValidMoveSquares(
            currentToken.position,
            speed,
            state.heroTokens,
            currentHeroId,
            state.dungeon
          );
          state.showingMovement = true;
        }
      } else {
        // Otherwise hide movement UI
        state.showingMovement = false;
        state.validMoveSquares = [];
      }
    },
    /**
     * Select which hero to move for the move-after-attack effect
     * This is used when multiple heroes are on the same tile
     */
    selectHeroForMoveAfterAttack: (state, action: PayloadAction<string>) => {
      if (!state.pendingMoveAfterAttack) return;
      
      const heroId = action.payload;
      
      // Verify the hero is in the available list
      if (!state.pendingMoveAfterAttack.availableHeroes.includes(heroId)) {
        return;
      }
      
      // Set the selected hero
      state.pendingMoveAfterAttack.selectedHeroId = heroId;
      
      // Show movement UI for the selected hero
      const selectedHeroToken = state.heroTokens.find(t => t.heroId === heroId);
      if (selectedHeroToken) {
        const moveDistance = state.pendingMoveAfterAttack.moveDistance;
        state.validMoveSquares = getValidMoveSquares(
          selectedHeroToken.position,
          moveDistance,
          state.heroTokens,
          heroId,
          state.dungeon
        );
        state.showingMovement = true;
      }
    },
    /**
     * Set monsters directly (for testing purposes)
     */
    setMonsters: (state, action: PayloadAction<MonsterState[]>) => {
      state.monsters = action.payload;
    },
    /**
     * Set villain state directly (for testing purposes)
     */
    setVillain: (state, action: PayloadAction<VillainInstance | null>) => {
      state.villain = action.payload;
    },
    /**
     * Set monster deck directly (for testing purposes)
     */
    setMonsterDeck: (state, action: PayloadAction<MonsterDeck>) => {
      state.monsterDeck = action.payload;
    },
    /**
     * Set drawn encounter directly (for testing purposes)
     */
    setDrawnEncounter: (state, action: PayloadAction<string>) => {
      const encounter = getEncounterById(action.payload);
      if (encounter) {
        state.drawnEncounter = encounter;
      }
    },
    /**
     * Set encounter deck directly (for testing purposes)
     */
    setEncounterDeck: (state, action: PayloadAction<EncounterDeck>) => {
      state.encounterDeck = action.payload;
    },
    /**
     * Set turn phase directly (for testing purposes)
     */
    setTurnPhase: (state, action: PayloadAction<TurnPhase>) => {
      state.turnState.currentPhase = action.payload;
    },
    /**
     * Set monster groups directly (for testing purposes)
     */
    setMonsterGroups: (state, action: PayloadAction<MonsterGroup[]>) => {
      state.monsterGroups = action.payload;
    },
    /**
     * Increment monster instance counter (for testing purposes)
     */
    incrementMonsterCounter: (state, action: PayloadAction<number>) => {
      state.monsterInstanceCounter += action.payload;
    },
    /**
     * Increment monster group counter (for testing purposes)
     */
    incrementGroupCounter: (state, action: PayloadAction<number>) => {
      state.monsterGroupCounter += action.payload;
    },
    /**
     * Set current phase directly (for testing purposes)
     */
    setCurrentPhase: (state, action: PayloadAction<TurnPhase>) => {
      state.turnState.currentPhase = action.payload;
    },
    /**
     * Clear attack result (for testing purposes)
     */
    clearAttackResult: (state) => {
      state.attackResult = null;
      state.attackTargetId = null;
      state.attackName = null;
      state.defeatedMonsterXp = null;
      state.defeatedMonsterName = null;
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

      // Trigger monster-activation event for power card hooks (e.g., Bravery - teleport to monster)
      const monsterActivationEvent: MonsterActivationEvent = {
        type: 'monster-activation',
        heroId: currentHeroId,
        turnNumber: state.turnState.turnNumber,
        monsterInstanceId: monster.instanceId,
        monsterId: monster.monsterId,
        position: monster.position,
        controllerId: monster.controllerId,
      };
      const activationEventResult = triggerGameEvent(state.eventHooks, monsterActivationEvent);
      // Queue power card flips and unregister used hooks
      for (const flip of activationEventResult.powerCardsToFlip) {
        state.pendingPowerCardFlips.push(flip);
        state.eventHooks = unregisterPowerCard(state.eventHooks, flip.powerCardId, flip.heroId);
      }

      // Build hero HP and AC maps (AC includes item bonuses)
      const heroHpMap: Record<string, number> = {};
      const heroAcMap: Record<string, number> = {};
      for (const hp of state.heroHp) {
        heroHpMap[hp.heroId] = hp.currentHp;
      }
      for (const token of state.heroTokens) {
        const hero = AVAILABLE_HEROES.find(h => h.id === token.heroId);
        if (hero) {
          let totalAC = calculateTotalAC(hero.ac, state.heroInventories[token.heroId]);
          
          // Apply Cleric's Shield bonus (+2 AC) if this hero is the target
          if (state.clericsShieldTarget === token.heroId) {
            totalAC += 2;
          }
          
          heroAcMap[token.heroId] = totalAC;
        }
      }

      // Filter out heroes that are removed from play (e.g., Time Leap curse)
      const activeHeroTokens = state.heroTokens.filter(token => {
        const heroHp = state.heroHp.find(hp => hp.heroId === token.heroId);
        return !heroHp?.removedFromPlay;
      });

      // Execute the monster's turn
      const randomFn = action.payload?.randomFn ?? Math.random;
      const result = executeMonsterTurn(
        monster,
        activeHeroTokens,
        heroHpMap,
        heroAcMap,
        state.monsters,
        state.dungeon,
        randomFn
      );

      // Check if the monster needs player choice (e.g., multiple equidistant heroes or destinations)
      if (result.type === 'needs-choice') {
        // Pause villain phase and show decision prompt
        state.pendingMonsterDecision = result.decision;
        state.villainPhasePaused = true;
        return;
      }

      if (result.type === 'move') {
        // Capture monster's current global position before the move for logging
        const monsterPreMoveGlobal = getMonsterGlobalPosition(monster, state.dungeon);

        // Update monster position
        const monsterToMove = state.monsters.find(m => m.instanceId === monster.instanceId);
        if (monsterToMove) {
          // Find which tile the destination is on
          const newTileId = findTileForGlobalPosition(result.destination, state.dungeon);
          if (newTileId) {
            // Check if monster is moving to a different tile
            const isMovingToNewTile = newTileId !== monsterToMove.tileId;
            
            let finalPosition: Position | null = null;
            
            if (isMovingToNewTile) {
              // Monster is crossing to a new tile - try to place on scorch mark
              const newTile = state.dungeon.tiles.find(t => t.id === newTileId);
              if (newTile) {
                const scorchMarkResult = getMonsterMoveToTilePosition(
                  newTile,
                  state.monsters,
                  state.heroTokens,
                  state.dungeon
                );
                
                if (scorchMarkResult === 'occupied') {
                  // Scorch mark is occupied - need player to choose a position
                  // Calculate all valid positions on the tile
                  const validPositions = getValidTilePositions(
                    newTile,
                    state.monsters,
                    state.heroTokens,
                    state.dungeon
                  );
                  
                  // Create a pending decision for position selection
                  state.pendingMonsterDecision = {
                    decisionId: `monster-${monster.instanceId}-tile-entry-${Date.now()}`,
                    type: 'choose-tile-entry-position',
                    monsterId: monster.instanceId,
                    options: {
                      tileId: newTileId,
                      positions: validPositions,
                    },
                    context: 'movement'
                  };
                  state.villainPhasePaused = true;
                  return;
                } else {
                  // Use scorch mark position
                  finalPosition = scorchMarkResult;
                }
              }
            } else {
              // Monster is moving within the same tile - use the calculated destination
              finalPosition = globalToLocalPosition(result.destination, newTileId, state.dungeon);
            }
            
            if (finalPosition) {
              monsterToMove.position = finalPosition;
              monsterToMove.tileId = newTileId;
              
              // Calculate global position for blade barrier check
              const finalGlobalPos = isMovingToNewTile 
                ? (localToGlobalPosition(finalPosition, newTileId, state.dungeon) ?? result.destination)
                : result.destination;
              
              // Check for Blade Barrier tokens at destination
              const bladeBarrierCheck = checkBladeBarrierDamage(
                finalGlobalPos,
                state.boardTokens || []
              );
              
              if (bladeBarrierCheck.shouldDamage && bladeBarrierCheck.tokenToRemove) {
                // Deal 1 damage to the monster
                monsterToMove.currentHp = Math.max(0, monsterToMove.currentHp - 1);
                
                // Remove the blade barrier token
                state.boardTokens = state.boardTokens.filter(
                  token => token.id !== bladeBarrierCheck.tokenToRemove
                );
              }
            }
          }
        }
        // Store the monster ID to show "moved but could not attack" message
        state.monsterMoveActionId = monster.instanceId;

        // Log the monster move
        const movingMonsterDef = getMonsterById(monster.monsterId);
        const movingMonsterName = movingMonsterDef?.name ?? 'Monster';
        const fromPos = monsterPreMoveGlobal ? `(${monsterPreMoveGlobal.x}, ${monsterPreMoveGlobal.y})` : 'unknown';
        const toPos = `(${result.destination.x}, ${result.destination.y})`;
        const moveDecisionLogText = result.decisionLog && result.decisionLog.length > 0
          ? `\n\nDecision Log:\n${result.decisionLog.map((l, i) => `${i + 1}. ${l}`).join('\n')}`
          : '';
        state.logEntries.push({
          id: state.logEntryCounter++,
          timestamp: Date.now(),
          type: 'combat',
          message: `${movingMonsterName} moves.`,
          extendedDetails: `Monster: ${monster.instanceId} | From: ${fromPos} → To: ${toPos}${moveDecisionLogText}`,
        });
      } else if (result.type === 'attack') {
        // Store the attack result
        state.monsterAttackResult = result.result;
        state.monsterAttackTargetId = result.targetId;
        state.monsterAttackerId = monster.instanceId;
        state.monsterAttackName = MONSTER_TACTICS[monster.monsterId]?.adjacentAttack?.name ?? null;

        // Log the monster attack
        const monsterDef = getMonsterById(monster.monsterId);
        const monsterName = monsterDef?.name ?? 'Monster';
        const targetHero = AVAILABLE_HEROES.find(h => h.id === result.targetId);
        const targetName = targetHero?.name ?? result.targetId;
        
        const hitOrMiss = result.result.isHit ? 'Hit' : 'Miss';
        const criticalText = result.result.isCritical ? ' (Critical!)' : '';
        const logMessage = `${monsterName} attacks ${targetName}: ${hitOrMiss}!${criticalText}`;

        // Build extended position details
        const attackMonsterGlobal = getMonsterGlobalPosition(monster, state.dungeon);
        const attackTargetHeroToken = state.heroTokens.find(h => h.heroId === result.targetId);
        const attackMonsterPos = attackMonsterGlobal ? `(${attackMonsterGlobal.x}, ${attackMonsterGlobal.y})` : 'unknown';
        const attackTargetPos = attackTargetHeroToken ? `(${attackTargetHeroToken.position.x}, ${attackTargetHeroToken.position.y})` : 'unknown';
        const attackDecisionLogText = result.decisionLog && result.decisionLog.length > 0
          ? `\n\nDecision Log:\n${result.decisionLog.map((l, i) => `${i + 1}. ${l}`).join('\n')}`
          : '';
        const attackExtendedDetails = `Monster: ${monster.instanceId} at ${attackMonsterPos} | Target ${result.targetId} at ${attackTargetPos}${attackDecisionLogText}`;
        
        let logDetails = `Roll: ${result.result.roll} + ${result.result.attackBonus} = ${result.result.total} vs AC ${result.result.targetAC}`;
        if (result.result.isHit && result.result.damage > 0) {
          logDetails += ` | Damage: ${result.result.damage}`;
        }

        // Trigger attack-hit-on-hero event for power card hooks (e.g., Practiced Evasion, Tumbling Escape)
        let monsterAttackPrevented = false;
        if (result.result.isHit) {
          const attackHitOnHeroEvent: AttackHitOnHeroEvent = {
            type: 'attack-hit-on-hero',
            heroId: result.targetId,
            turnNumber: state.turnState.turnNumber,
            targetHeroId: result.targetId,
            attackerMonsterId: monster.instanceId,
            attackResult: result.result,
            isTrapAttack: false,
            isEventAttack: false,
            allTargetHeroIds: [result.targetId],
          };
          const hitEventResult = triggerGameEvent(state.eventHooks, attackHitOnHeroEvent);
          monsterAttackPrevented = hitEventResult.preventedDefault;
          // Queue power card flips and unregister used hooks
          for (const flip of hitEventResult.powerCardsToFlip) {
            state.pendingPowerCardFlips.push(flip);
            state.eventHooks = unregisterPowerCard(state.eventHooks, flip.powerCardId, flip.heroId);
          }
        }

        // Apply damage to hero if hit and not prevented by a hook
        if (result.result.isHit && result.result.damage > 0 && !monsterAttackPrevented) {
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
          applyMonsterAttackStatusEffect(state, monster.monsterId, monster.instanceId, result.targetId, 'adjacent');
          
          // Check if status effect was applied for logging
          const tactics = MONSTER_TACTICS[monster.monsterId];
          const attackOption = tactics?.adjacentAttack;
          if (attackOption?.statusEffect) {
            logDetails += ` | Applied: ${attackOption.statusEffect}`;
          }
        }
        
        // Apply miss damage if the attack missed but has miss damage
        if (!result.result.isHit) {
          applyMonsterMissDamage(state, monster.monsterId, result.targetId, 'adjacent');
          
          // Check if miss damage was applied for logging
          const tactics = MONSTER_TACTICS[monster.monsterId];
          const attackOption = tactics?.adjacentAttack;
          if (attackOption?.missDamage && attackOption.missDamage > 0) {
            logDetails += ` | Miss damage: ${attackOption.missDamage}`;
          }
        }
        
        state.logEntries.push({
          id: state.logEntryCounter++,
          timestamp: Date.now(),
          type: 'combat',
          message: logMessage,
          details: logDetails,
          extendedDetails: attackExtendedDetails,
        });
      } else if (result.type === 'move-and-attack') {
        // Handle move-and-attack: monster moves adjacent AND attacks in same turn
        // Capture monster's current global position before the move for logging
        const moveAttackPreMoveGlobal = getMonsterGlobalPosition(monster, state.dungeon);

        // First, update monster position
        const monsterToMove = state.monsters.find(m => m.instanceId === monster.instanceId);
        if (monsterToMove) {
          const newTileId = findTileForGlobalPosition(result.destination, state.dungeon);
          if (newTileId) {
            // Check if monster is moving to a different tile
            const isMovingToNewTile = newTileId !== monsterToMove.tileId;
            
            let finalPosition: Position | null = null;
            
            if (isMovingToNewTile) {
              // Monster is crossing to a new tile - try to place on scorch mark
              const newTile = state.dungeon.tiles.find(t => t.id === newTileId);
              if (newTile) {
                const scorchMarkResult = getMonsterMoveToTilePosition(
                  newTile,
                  state.monsters,
                  state.heroTokens,
                  state.dungeon
                );
                
                if (scorchMarkResult === 'occupied') {
                  // Scorch mark is occupied - need player to choose a position
                  // Calculate all valid positions on the tile
                  const validPositions = getValidTilePositions(
                    newTile,
                    state.monsters,
                    state.heroTokens,
                    state.dungeon
                  );
                  
                  // Create a pending decision for position selection
                  state.pendingMonsterDecision = {
                    decisionId: `monster-${monster.instanceId}-tile-entry-${Date.now()}`,
                    type: 'choose-tile-entry-position',
                    monsterId: monster.instanceId,
                    options: {
                      tileId: newTileId,
                      positions: validPositions,
                    },
                    context: 'move-and-attack'
                  };
                  state.villainPhasePaused = true;
                  return;
                } else {
                  // Use scorch mark position
                  finalPosition = scorchMarkResult;
                }
              }
            } else {
              // Monster is moving within the same tile - use the calculated destination
              finalPosition = globalToLocalPosition(result.destination, newTileId, state.dungeon);
            }
            
            if (finalPosition) {
              monsterToMove.position = finalPosition;
              monsterToMove.tileId = newTileId;
              
              // Calculate global position for blade barrier check
              const finalGlobalPos = isMovingToNewTile 
                ? (localToGlobalPosition(finalPosition, newTileId, state.dungeon) ?? result.destination)
                : result.destination;
              
              // Check for Blade Barrier tokens at destination
              const bladeBarrierCheck = checkBladeBarrierDamage(
                finalGlobalPos,
                state.boardTokens || []
              );
              
              if (bladeBarrierCheck.shouldDamage && bladeBarrierCheck.tokenToRemove) {
                // Deal 1 damage to the monster
                monsterToMove.currentHp = Math.max(0, monsterToMove.currentHp - 1);
                
                // Remove the blade barrier token
                state.boardTokens = state.boardTokens.filter(
                  token => token.id !== bladeBarrierCheck.tokenToRemove
                );
              }
            }
          }
        }
        
        // Then, store the attack result
        state.monsterAttackResult = result.result;
        state.monsterAttackTargetId = result.targetId;
        state.monsterAttackerId = monster.instanceId;
        state.monsterAttackName = MONSTER_TACTICS[monster.monsterId]?.moveAttack?.name ?? MONSTER_TACTICS[monster.monsterId]?.adjacentAttack?.name ?? null;

        // Log the monster attack (move-and-attack)
        const monsterDef = getMonsterById(monster.monsterId);
        const monsterName = monsterDef?.name ?? 'Monster';
        const targetHero = AVAILABLE_HEROES.find(h => h.id === result.targetId);
        const targetName = targetHero?.name ?? result.targetId;
        
        const hitOrMiss = result.result.isHit ? 'Hit' : 'Miss';
        const criticalText = result.result.isCritical ? ' (Critical!)' : '';
        const logMessage = `${monsterName} moves and attacks ${targetName}: ${hitOrMiss}!${criticalText}`;
        
        let logDetails = `Roll: ${result.result.roll} + ${result.result.attackBonus} = ${result.result.total} vs AC ${result.result.targetAC}`;
        if (result.result.isHit && result.result.damage > 0) {
          logDetails += ` | Damage: ${result.result.damage}`;
        }

        // Build extended position details for move-and-attack
        const moveAttackFromPos = moveAttackPreMoveGlobal ? `(${moveAttackPreMoveGlobal.x}, ${moveAttackPreMoveGlobal.y})` : 'unknown';
        const moveAttackToPos = `(${result.destination.x}, ${result.destination.y})`;
        const moveAttackTargetHeroToken = state.heroTokens.find(h => h.heroId === result.targetId);
        const moveAttackTargetPos = moveAttackTargetHeroToken ? `(${moveAttackTargetHeroToken.position.x}, ${moveAttackTargetHeroToken.position.y})` : 'unknown';
        const moveAttackDecisionLogText = result.decisionLog && result.decisionLog.length > 0
          ? `\n\nDecision Log:\n${result.decisionLog.map((l, i) => `${i + 1}. ${l}`).join('\n')}`
          : '';
        const moveAttackExtendedDetails = `Monster: ${monster.instanceId} | From: ${moveAttackFromPos} → To: ${moveAttackToPos} | Target ${result.targetId} at ${moveAttackTargetPos}${moveAttackDecisionLogText}`;

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
          applyMonsterAttackStatusEffect(state, monster.monsterId, monster.instanceId, result.targetId, 'move');
          
          // Check if status effect was applied for logging
          const tactics = MONSTER_TACTICS[monster.monsterId];
          const attackOption = tactics?.moveAttack;
          if (attackOption?.statusEffect) {
            logDetails += ` | Applied: ${attackOption.statusEffect}`;
          }
        }
        
        // Apply miss damage if the attack missed but has miss damage
        if (!result.result.isHit) {
          applyMonsterMissDamage(state, monster.monsterId, result.targetId, 'move');
          
          // Check if miss damage was applied for logging
          const tactics = MONSTER_TACTICS[monster.monsterId];
          const attackOption = tactics?.moveAttack;
          if (attackOption?.missDamage && attackOption.missDamage > 0) {
            logDetails += ` | Miss damage: ${attackOption.missDamage}`;
          }
        }
        
        state.logEntries.push({
          id: state.logEntryCounter++,
          timestamp: Date.now(),
          type: 'combat',
          message: logMessage,
          details: logDetails,
          extendedDetails: moveAttackExtendedDetails,
        });
      } else if (result.type === 'area-attack') {
        // Handle area attack: monster attacks all valid targets simultaneously
        // Process all attacks immediately (damage, status effects)
        const monsterDef = getMonsterById(monster.monsterId);
        const monsterName = monsterDef?.name ?? 'Monster';
        const tactics = MONSTER_TACTICS[monster.monsterId];
        const attackOption = tactics?.adjacentAttack;
        // Capture area attacker position for extended details
        const areaAttackerGlobal = getMonsterGlobalPosition(monster, state.dungeon);
        
        for (let i = 0; i < result.targetIds.length; i++) {
          const targetId = result.targetIds[i];
          const attackResult = result.results[i];
          
          // Apply damage to hero if hit
          if (attackResult.isHit && attackResult.damage > 0) {
            const heroHp = state.heroHp.find(h => h.heroId === targetId);
            if (heroHp) {
              heroHp.currentHp = Math.max(0, heroHp.currentHp - attackResult.damage);
            }
          }
          
          // Apply status effect if the attack has one and hit
          if (attackResult.isHit) {
            applyMonsterAttackStatusEffect(state, monster.monsterId, monster.instanceId, targetId, 'adjacent');
          }
          
          // Log each attack
          const targetHero = AVAILABLE_HEROES.find(h => h.id === targetId);
          const targetName = targetHero?.name ?? targetId;
          const hitOrMiss = attackResult.isHit ? 'Hit' : 'Miss';
          const criticalText = attackResult.isCritical ? ' (Critical!)' : '';
          const logMessage = `${monsterName} area attacks ${targetName}: ${hitOrMiss}!${criticalText}`;
          
          let logDetails = `Roll: ${attackResult.roll} + ${attackResult.attackBonus} = ${attackResult.total} vs AC ${attackResult.targetAC}`;
          if (attackResult.isHit && attackResult.damage > 0) {
            logDetails += ` | Damage: ${attackResult.damage}`;
          }
          if (attackResult.isHit && attackOption?.statusEffect) {
            logDetails += ` | Applied: ${attackOption.statusEffect}`;
          }

          const areaAttackerPos = areaAttackerGlobal ? `(${areaAttackerGlobal.x}, ${areaAttackerGlobal.y})` : 'unknown';
          const areaTargetHeroToken = state.heroTokens.find(h => h.heroId === targetId);
          const areaTargetPos = areaTargetHeroToken ? `(${areaTargetHeroToken.position.x}, ${areaTargetHeroToken.position.y})` : 'unknown';
          // Include decision log only on the first target entry
          const areaDecisionLogText = i === 0 && result.decisionLog && result.decisionLog.length > 0
            ? `\n\nDecision Log:\n${result.decisionLog.map((l, idx) => `${idx + 1}. ${l}`).join('\n')}`
            : '';
          const areaExtendedDetails = `Monster: ${monster.instanceId} at ${areaAttackerPos} | Target ${targetId} at ${areaTargetPos}${areaDecisionLogText}`;
          
          state.logEntries.push({
            id: state.logEntryCounter++,
            timestamp: Date.now(),
            type: 'combat',
            message: logMessage,
            details: logDetails,
            extendedDetails: areaExtendedDetails,
          });
        }
        
        // Check for party defeat (all heroes at 0 HP)
        const allHeroesDefeated = state.heroHp.every(h => h.currentHp <= 0);
        if (allHeroesDefeated) {
          state.currentScreen = "defeat";
        }

        // Show first result via monsterAttackResult so the $effect blocks villain phase advancement.
        // Remaining results are stored in monsterAreaAttackResults for sequential display.
        if (result.results.length > 0) {
          state.monsterAttackResult = result.results[0];
          state.monsterAttackTargetId = result.targetIds[0];
          state.monsterAttackerId = monster.instanceId;
          state.monsterAttackName = attackOption?.name ?? null;
          if (result.results.length > 1) {
            state.monsterAreaAttackResults = result.results.slice(1);
            state.monsterAreaAttackTargetIds = result.targetIds.slice(1);
          } else {
            state.monsterAreaAttackResults = null;
            state.monsterAreaAttackTargetIds = null;
          }
        } else {
          state.monsterAreaAttackResults = null;
          state.monsterAreaAttackTargetIds = null;
        }
      } else if (result.type === 'explore') {
        // Handle monster-triggered exploration
        // Draw a tile from the deck
        const { drawnTile, remainingDeck } = drawTile(state.dungeon.tileDeck);
        
        if (drawnTile) {
          // Place the new tile
          const newTile = placeTile(result.edge, drawnTile, state.dungeon);
          
          if (newTile) {
            // Update dungeon state
            state.dungeon = updateDungeonAfterExploration(state.dungeon, result.edge, newTile);
            state.dungeon.tileDeck = remainingDeck;
            
            // Get tile definition to check if it's a black tile
            const tileDef = getTileDefinition(drawnTile);
            const isBlackTile = tileDef?.isBlackTile ?? true;

            // Track tiles explored towards finding the chamber (before chamber is revealed)
            if (state.scenario.tilesForChamber != null && !state.scenario.chamberRevealed && !tileDef?.isChamberEntrance) {
              state.scenario.tilesExplored = (state.scenario.tilesExplored ?? 0) + 1;
            }

            // Detect Chamber Entrance placement and trigger full reveal sequence
            if (tileDef?.isChamberEntrance) {
              handleChamberEntranceRevealed(state, newTile);
            }

            // Log the exploration
            const monsterDef = getMonsterById(monster.monsterId);
            const monsterName = monsterDef?.name ?? 'Monster';
            const directionName = result.edge.direction.toUpperCase();
            const exploreDecisionLogText = result.decisionLog && result.decisionLog.length > 0
              ? `\n\nDecision Log:\n${result.decisionLog.map((l, i) => `${i + 1}. ${l}`).join('\n')}`
              : undefined;
            
            state.logEntries.push({
              id: state.logEntryCounter++,
              timestamp: Date.now(),
              type: 'exploration',
              message: `${monsterName} explored ${directionName} edge`,
              details: `Tile: ${drawnTile} (${isBlackTile ? 'Black' : 'White'} arrow)`,
              extendedDetails: exploreDecisionLogText,
            });
            
            // Draw monster from deck (monsters always spawn on explored tiles)
            let spawnedMonsterInstanceId: string | undefined;
            const { monster: drawnMonsterId, deck: newMonsterDeck } = drawMonster(
              state.monsterDeck,
              randomFn
            );
            
            if (drawnMonsterId) {
              // Use spawn function to handle multi-monster spawns
              const spawnResult = spawnMonstersWithBehavior(
                drawnMonsterId,
                newTile,
                currentHeroId,
                state.monsters,
                state.monsterInstanceCounter,
                state.monsterGroupCounter
              );
              
              if (spawnResult.monsters.length > 0) {
                state.monsters.push(...spawnResult.monsters);
                state.monsterInstanceCounter = spawnResult.monsterInstanceCounter;
                state.monsterGroupCounter = spawnResult.monsterGroupCounter;
                
                // Add group if multiple monsters spawned
                if (spawnResult.group) {
                  state.monsterGroups.push(spawnResult.group);
                }
                
                // Log monster spawn
                const spawnedMonsterDef = getMonsterById(drawnMonsterId);
                const spawnedMonsterName = spawnedMonsterDef?.name ?? drawnMonsterId;
                
                state.logEntries.push({
                  id: state.logEntryCounter++,
                  timestamp: Date.now(),
                  type: 'exploration',
                  message: `${spawnedMonsterName} appeared on the new tile!`,
                  details: `Spawned at position: (${spawnResult.monsters[0].position.x}, ${spawnResult.monsters[0].position.y})`,
                  extendedDetails: `Instance: ${spawnResult.monsters[0].instanceId} | Tile: ${newTile.id}`,
                });
                
                // Store the spawned monster id so it shows as a modal after the exploration notification is dismissed
                spawnedMonsterInstanceId = spawnResult.monsters[0].instanceId;
              }
              
              state.monsterDeck = newMonsterDeck;
            }
            
            // Highlight the newly placed tile (same as hero exploration)
            state.recentlyPlacedTileId = newTile.id;
            
            // Store the monster exploration event for UI notification.
            // spawnedMonsterInstanceId (if set) will be shown as the "monster appears" modal
            // after the player dismisses this notification.
            state.monsterExplorationEvent = {
              monsterId: monster.instanceId,
              monsterName: monsterName,
              direction: result.edge.direction,
              tileType: drawnTile,
              testDismiss: state.testMode, // Use testMode to control auto-dismiss in E2E tests
              spawnedMonsterInstanceId,
            };
          }
        }
      }
      // Note: For result.type === 'none', no visual feedback is needed - monster couldn't act
      if (result.type === 'none' && result.decisionLog && result.decisionLog.length > 0) {
        const noActionMonsterDef = getMonsterById(monster.monsterId);
        const noActionMonsterName = noActionMonsterDef?.name ?? 'Monster';
        state.logEntries.push({
          id: state.logEntryCounter++,
          timestamp: Date.now(),
          type: 'combat',
          message: `${noActionMonsterName} takes no action.`,
          extendedDetails: `Decision Log:\n${result.decisionLog.map((l, i) => `${i + 1}. ${l}`).join('\n')}`,
        });
      }

      // Move to next monster
      state.villainPhaseMonsterIndex += 1;
    },
    /**
     * Dismiss the monster attack result display.
     * If there are remaining area attack results (from area-attack tactics), shows the next one.
     */
    dismissMonsterAttackResult: (state) => {
      // Check if there are more area attack results to show sequentially.
      // Both arrays are always set together, so treat targetIds as parallel to results.
      const remainingResults = state.monsterAreaAttackResults;
      const remainingTargets = state.monsterAreaAttackTargetIds ?? [];
      if (remainingResults && remainingResults.length > 0) {
        state.monsterAttackResult = remainingResults[0];
        state.monsterAttackTargetId = remainingTargets[0] ?? null;
        // Keep monsterAttackerId and monsterAttackName unchanged (same monster)
        const nextResults = remainingResults.slice(1);
        const nextTargets = remainingTargets.slice(1);
        state.monsterAreaAttackResults = nextResults.length > 0 ? nextResults : null;
        state.monsterAreaAttackTargetIds = nextTargets.length > 0 ? nextTargets : null;
      } else {
        state.monsterAttackResult = null;
        state.monsterAttackTargetId = null;
        state.monsterAttackerId = null;
        state.monsterAttackName = null;
        state.monsterAreaAttackResults = null;
        state.monsterAreaAttackTargetIds = null;
      }
    },
    /**
     * Dismiss the monster move action display
     */
    dismissMonsterMoveAction: (state) => {
      state.monsterMoveActionId = null;
    },
    /**
     * Dismiss the monster exploration event display.
     * If a monster was spawned during the exploration, show it as a blocking modal afterwards.
     */
    dismissMonsterExplorationEvent: (state) => {
      const spawnedId = state.monsterExplorationEvent?.spawnedMonsterInstanceId;
      state.monsterExplorationEvent = null;
      // Clear the tile highlight now that the player has acknowledged the exploration
      state.recentlyPlacedTileId = null;
      // Show spawned monster card (blocks until player dismisses)
      if (spawnedId) {
        state.recentlySpawnedMonsterId = spawnedId;
      }
    },
    /**
     * Set monster exploration event (for testing purposes)
     */
    setMonsterExplorationEvent: (state, action: PayloadAction<{
      monsterId: string;
      monsterName: string;
      direction: import('./types').Direction;
      tileType: string;
      testDismiss?: boolean;
    }>) => {
      state.monsterExplorationEvent = action.payload;
    },
    /**
     * Add tiles to dungeon (for testing purposes)
     */
    addDungeonTiles: (state, action: PayloadAction<{
      tiles: PlacedTile[];
      unexploredEdges: Array<{ tileId: string; direction: Direction }>;
    }>) => {
      state.dungeon.tiles = [...state.dungeon.tiles, ...action.payload.tiles];
      state.dungeon.unexploredEdges = action.payload.unexploredEdges;
    },
    /**
     * Add monsters to the game (for testing purposes)
     */
    addMonstersForTesting: (state, action: PayloadAction<MonsterState[]>) => {
      state.monsters = [...state.monsters, ...action.payload];
    },
    /**
     * Set the tile deck (for testing purposes)
     * Allows E2E tests to force specific tiles to be drawn next.
     */
    setTileDeck: (state, action: PayloadAction<string[]>) => {
      state.dungeon.tileDeck = action.payload;
    },
    /**
     * Set test mode (for E2E testing purposes)
     * When testMode is true, notifications will not auto-dismiss
     */
    setTestMode: (state, action: PayloadAction<boolean>) => {
      state.testMode = action.payload;
    },
    /**
     * Activate the villain during the villain phase.
     * Should be called once per hero turn (after all controlled monsters activate).
     * Only applies when a villain is present (chamber has been revealed).
     */
    activateVillain: (state, action: PayloadAction<{ randomFn?: () => number }>) => {
      if (state.turnState.currentPhase !== "villain-phase") return;
      if (!state.villain) return;

      // Mark villain as activated for this turn (prevents double-activation)
      state.villainActivatedThisTurn = true;

      const randomFn = action.payload?.randomFn ?? Math.random;
      const villain = state.villain;

      // Build helper maps
      const heroHpMap: Record<string, number> = {};
      const heroAcMap: Record<string, number> = {};
      for (const hp of state.heroHp) {
        heroHpMap[hp.heroId] = hp.currentHp;
        const hero = AVAILABLE_HEROES.find(h => h.id === hp.heroId);
        const baseAC = hero ? HERO_LEVELS[hp.heroId][`level${hp.level}`].ac : hp.ac;
        heroAcMap[hp.heroId] = getModifiedAC(hp.statuses ?? [], baseAC);
      }

      // Run villain AI
      const result = executeVillainTurn(
        villain,
        state.heroTokens,
        heroHpMap,
        heroAcMap,
        state.monsters,
        state.dungeon,
        randomFn
      );

      // Look up villain definition for logging
      const villainDef = getVillainDefForScenario(state.selectedScenarioId);
      const villainName = villainDef?.name ?? 'Villain';

      switch (result.type) {
        case 'move': {
          // Capture villain's current global position before the move for logging
          const villainPreMoveGlobal = state.villain ? getVillainGlobalPosition(state.villain, state.dungeon) : null;
          // Update villain position
          state.villain.position = globalToLocalForVillain(result.destination, result.newTileId, state.dungeon);
          state.villain.tileId = result.newTileId;
          const villainFromPos = villainPreMoveGlobal ? `(${villainPreMoveGlobal.x}, ${villainPreMoveGlobal.y})` : 'unknown';
          const villainToPos = `(${result.destination.x}, ${result.destination.y})`;
          state.logEntries.push({
            id: state.logEntryCounter++,
            timestamp: Date.now(),
            type: 'combat',
            message: `${villainName} moves.`,
            extendedDetails: `From: ${villainFromPos} → To: ${villainToPos} | Tile: ${result.newTileId}`,
          });
          // Show villain activation notification
          state.villainActivation = {
            villainName,
            actionType: 'move',
            tacticName: 'Moves',
            attackResult: null,
            targetHeroId: null,
            targetHeroIds: [],
            autoDamage: 0,
            remainingResults: [],
            remainingTargetIds: [],
          };
          break;
        }

        case 'attack': {
          // Update position if villain moved before attacking
          if (result.newPosition !== undefined && result.newTileId !== undefined) {
            state.villain.position = globalToLocalForVillain(result.newPosition, result.newTileId, state.dungeon);
            state.villain.tileId = result.newTileId;
          }

          // Apply damage and status effects to each targeted hero
          for (let i = 0; i < result.targetHeroIds.length; i++) {
            const heroId = result.targetHeroIds[i];
            const attackResult = result.results[i];
            if (!attackResult) continue;

            const hpIdx = state.heroHp.findIndex(h => h.heroId === heroId);
            if (hpIdx === -1) continue;

            if (attackResult.isHit) {
              state.heroHp[hpIdx] = {
                ...state.heroHp[hpIdx],
                currentHp: Math.max(0, state.heroHp[hpIdx].currentHp - attackResult.damage),
              };
            }
          }

          // Store first result for UI display (others queued in area array)
          if (result.results.length > 0) {
            state.villainAttackResult = result.results[0];
            state.villainAttackTargetId = result.targetHeroIds[0] ?? null;
            state.villainAttackName = result.tacticName;

            if (result.results.length > 1) {
              state.villainAreaAttackResults = result.results.slice(1);
              state.villainAreaAttackTargetIds = result.targetHeroIds.slice(1);
            }

            // Show villain activation notification panel
            state.villainActivation = {
              villainName,
              actionType: 'attack',
              tacticName: result.tacticName,
              attackResult: result.results[0],
              targetHeroId: result.targetHeroIds[0] ?? null,
              targetHeroIds: result.targetHeroIds,
              autoDamage: 0,
              remainingResults: result.results.slice(1),
              remainingTargetIds: result.targetHeroIds.slice(1),
            };
          }

          // Apply hit status effects for each target
          const tacticDef = villainDef?.tactics.find(t => t.name === result.tacticName);
          if (tacticDef?.hitStatusEffect) {
            for (let i = 0; i < result.targetHeroIds.length; i++) {
              const attackResult = result.results[i];
              if (!attackResult?.isHit) continue;
              const heroId = result.targetHeroIds[i];
              const hpIdx = state.heroHp.findIndex(h => h.heroId === heroId);
              if (hpIdx === -1) continue;
              state.heroHp[hpIdx] = {
                ...state.heroHp[hpIdx],
                statuses: applyStatusEffect(
                  state.heroHp[hpIdx].statuses ?? [],
                  tacticDef.hitStatusEffect,
                  villain.instanceId,
                  state.turnState.turnNumber
                ),
              };
            }
          }

          state.logEntries.push({
            id: state.logEntryCounter++,
            timestamp: Date.now(),
            type: 'combat',
            message: `${villainName} uses ${result.tacticName}.`,
            details: result.targetHeroIds.map((id, i) => {
              const r = result.results[i];
              return r ? `${id}: roll ${r.roll}${r.isHit ? ` HIT ${r.damage} dmg` : ' MISS'}` : '';
            }).join('; '),
          });

          // Check for party defeat
          if (state.heroHp.every(h => h.currentHp <= 0)) {
            state.defeatReason = `The party was defeated by ${villainName}.`;
            state.currentScreen = "defeat";
          }
          break;
        }

        case 'spawn-monster': {
          // Update villain position
          state.villain.position = globalToLocalForVillain(result.destination, result.newTileId, state.dungeon);
          state.villain.tileId = result.newTileId;

          // Draw a monster from the deck and spawn it adjacent to the villain
          const { monster: newMonsterId, deck: updatedDeck } = drawMonster(state.monsterDeck);
          state.monsterDeck = updatedDeck;
          if (newMonsterId) {
            const spawnTile = state.dungeon.tiles.find(t => t.id === result.newTileId);
            if (spawnTile) {
              const spawnPos = getMonsterSpawnPosition(spawnTile, state.monsters);
              if (spawnPos) {
                const currentHeroId = state.heroTokens[state.turnState.currentHeroIndex]?.heroId ?? 'unknown';
                const newMonster: MonsterState = createMonsterInstance(
                  newMonsterId,
                  spawnPos,
                  spawnTile.id,
                  currentHeroId,
                  state.monsterInstanceCounter
                );
                state.monsters.push(newMonster);
                state.monsterInstanceCounter += 1;
                state.logEntries.push({
                  id: state.logEntryCounter++,
                  timestamp: Date.now(),
                  type: 'exploration',
                  message: `${villainName} summons a ${newMonsterId}!`,
                  extendedDetails: `Instance: ${newMonster.instanceId} | Spawned at: (${spawnPos.x}, ${spawnPos.y}) | Tile: ${spawnTile.id}`,
                });
                // Show villain activation notification
                state.villainActivation = {
                  villainName,
                  actionType: 'spawn',
                  tacticName: `Summons ${newMonsterId}!`,
                  attackResult: null,
                  targetHeroId: null,
                  targetHeroIds: [],
                  autoDamage: 0,
                  remainingResults: [],
                  remainingTargetIds: [],
                };
              }
            }
          }
          break;
        }

        case 'auto-damage': {
          // Update villain position
          state.villain.position = globalToLocalForVillain(result.newPosition, result.newTileId, state.dungeon);
          state.villain.tileId = result.newTileId;

          // Apply automatic damage to each adjacent hero (no roll)
          for (const heroId of result.targetHeroIds) {
            const hpIdx = state.heroHp.findIndex(h => h.heroId === heroId);
            if (hpIdx === -1) continue;
            state.heroHp[hpIdx] = {
              ...state.heroHp[hpIdx],
              currentHp: Math.max(0, state.heroHp[hpIdx].currentHp - result.damage),
            };
          }

          state.logEntries.push({
            id: state.logEntryCounter++,
            timestamp: Date.now(),
            type: 'combat',
            message: `${villainName} charges and deals ${result.damage} automatic damage!`,
            details: `Targets: ${result.targetHeroIds.join(', ')}`,
          });

          // Show villain activation notification
          state.villainActivation = {
            villainName,
            actionType: 'auto-damage',
            tacticName: 'Charges!',
            attackResult: null,
            targetHeroId: result.targetHeroIds[0] ?? null,
            targetHeroIds: result.targetHeroIds,
            autoDamage: result.damage,
            remainingResults: [],
            remainingTargetIds: [],
          };

          // Check for party defeat
          if (state.heroHp.every(h => h.currentHp <= 0)) {
            state.defeatReason = `The party was defeated by ${villainName}.`;
            state.currentScreen = "defeat";
          }
          break;
        }

        default:
          break;
      }
    },
    /**
     * Dismiss villain attack result (advance sequential area-attack display)
     */
    dismissVillainAttackResult: (state) => {
      const remaining = state.villainAreaAttackResults;
      const remainingTargets = state.villainAreaAttackTargetIds ?? [];
      if (remaining && remaining.length > 0) {
        state.villainAttackResult = remaining[0];
        state.villainAttackTargetId = remainingTargets[0] ?? null;
        state.villainAreaAttackResults = remaining.slice(1).length > 0 ? remaining.slice(1) : null;
        state.villainAreaAttackTargetIds = remainingTargets.slice(1).length > 0 ? remainingTargets.slice(1) : null;
      } else {
        state.villainAttackResult = null;
        state.villainAttackTargetId = null;
        state.villainAttackName = null;
        state.villainAreaAttackResults = null;
        state.villainAreaAttackTargetIds = null;
      }
    },
    /**
     * Dismiss the villain activation notification panel.
     * For attack results, also advances sequential area-attack display.
     */
    dismissVillainActivation: (state) => {
      if (!state.villainActivation) return;
      if (state.villainActivation.actionType === 'attack') {
        // Advance area attack sequence
        const remaining = state.villainActivation.remainingResults;
        const remainingTargets = state.villainActivation.remainingTargetIds;
        if (remaining.length > 0) {
          // Show next target in the area attack
          state.villainActivation = {
            ...state.villainActivation,
            attackResult: remaining[0],
            targetHeroId: remainingTargets[0] ?? null,
            remainingResults: remaining.slice(1),
            remainingTargetIds: remainingTargets.slice(1),
          };
          return;
        }
      }
      state.villainActivation = null;
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
        randomFn,
        state.turnState.turnNumber
      );
      
      // Log trap activations if any traps exist
      if (state.traps.length > 0) {
        const trapNames = state.traps.map(trap => {
          const encounter = getEncounterById(trap.encounterId);
          return encounter?.name || 'Trap';
        });
        const uniqueTrapNames = [...new Set(trapNames)];
        
        state.logEntries.push({
          id: state.logEntryCounter++,
          timestamp: Date.now(),
          type: 'combat',
          message: `Villain Phase: Traps activated`,
          details: `Active traps: ${uniqueTrapNames.join(', ')}`,
        });
      }
      
      // Log hazard activations if any hazards exist
      if (state.hazards.length > 0) {
        const hazardNames = state.hazards.map(hazard => {
          const encounter = getEncounterById(hazard.encounterId);
          return encounter?.name || 'Hazard';
        });
        const uniqueHazardNames = [...new Set(hazardNames)];
        
        state.logEntries.push({
          id: state.logEntryCounter++,
          timestamp: Date.now(),
          type: 'combat',
          message: `Villain Phase: Hazards activated`,
          details: `Active hazards: ${uniqueHazardNames.join(', ')}`,
        });
      }
      
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
      
      // Get trap encounter to get the name
      const trapEncounter = getEncounterById(trap.encounterId);
      const trapName = trapEncounter?.name || 'Trap';
      
      // Roll d20 vs DC
      const roll = Math.floor(randomFn() * 20) + 1;
      
      // Apply Kobold Trappers environment penalty (-4 to trap disable rolls)
      const koboldTrappersPenalty = state.activeEnvironmentId === 'kobold-trappers' ? -4 : 0;
      const modifiedRoll = roll + koboldTrappersPenalty;
      
      const success = modifiedRoll >= trap.disableDC;
      
      // Store the result for display
      state.trapDisableResult = {
        roll,
        penalty: koboldTrappersPenalty,
        modifiedRoll,
        disableDC: trap.disableDC,
        success,
        trapName,
      };
      
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
     * Dismiss the encounter effect message notification
     */
    dismissEncounterEffectMessage: (state) => {
      state.encounterEffectMessage = null;
    },
    /**
     * Dismiss the encounter result popup
     */
    dismissEncounterResult: (state) => {
      state.encounterResult = null;
    },
    
    /**
     * Place treasure token at the selected position (for Hidden Treasure encounter)
     */
    placeTreasureToken: (state, action: PayloadAction<{ position: Position }>) => {
      const { position } = action.payload;
      
      if (!state.pendingTreasurePlacement) {
        return; // No pending treasure placement
      }
      
      const encounterId = state.pendingTreasurePlacement.encounterId;
      
      // Verify the position is valid (no hero on it)
      const hasHero = state.heroTokens.some(hero => 
        hero.position.x === position.x && hero.position.y === position.y
      );
      
      if (hasHero) {
        state.encounterEffectMessage = 'Cannot place treasure on a tile with a hero';
        return;
      }
      
      // Create and place the treasure token
      const treasureToken = createTreasureTokenInstance(
        encounterId,
        position,
        state.treasureTokenInstanceCounter
      );
      state.treasureTokens.push(treasureToken);
      state.treasureTokenInstanceCounter++;
      
      // Clear the pending state
      state.pendingTreasurePlacement = null;
      // Note: No modal message - the token is now visible on the board
      
      // Draw the follow-up encounter card (Hidden Treasure requires drawing another encounter)
      const { encounterId: nextEncounterId, deck: updatedDeck } = drawEncounter(state.encounterDeck);
      state.encounterDeck = updatedDeck;
      
      if (nextEncounterId) {
        const nextEncounter = getEncounterById(nextEncounterId);
        if (nextEncounter) {
          state.drawnEncounter = nextEncounter;
        }
      }
    },
    
    /**
     * Dismiss the exploration phase notification message
     * Note: Also clears recentlyPlacedTileId since both are part of the same exploration event.
     * The tile fade-in (2s) completes before the notification fully fades (3s total).
     */
    dismissExplorationPhaseMessage: (state) => {
      state.explorationPhaseMessage = null;
      state.recentlyPlacedTileId = null;
      state.recentlyPlacedRoomSetTileIds = [];
    },
    /**
     * Dismiss the villain phase step message (e.g. "Encounter card skipped" auto-dismiss)
     */
    dismissVillainPhaseStepMessage: (state) => {
      state.villainPhaseStepMessage = null;
    },
    /**
     * Dismiss the poisoned damage notification
     */
    dismissPoisonedDamageNotification: (state) => {
      state.poisonedDamageNotification = null;
    },
    /**
     * Dismiss the poison recovery notification
     */
    dismissPoisonRecoveryNotification: (state) => {
      state.poisonRecoveryNotification = null;
    },
    /**
     * Attempt to recover from poisoned status at end of hero phase.
     * Rolls d20, removes poisoned on 10+.
     */
    attemptPoisonRecovery: (state) => {
      if (state.turnState.currentPhase !== "hero-phase") {
        return;
      }
      
      const currentHeroId = state.heroTokens[state.turnState.currentHeroIndex]?.heroId;
      if (!currentHeroId) return;
      
      const heroHpIndex = state.heroHp.findIndex(h => h.heroId === currentHeroId);
      if (heroHpIndex === -1) return;
      
      const heroHp = state.heroHp[heroHpIndex];
      const statuses = heroHp.statuses ?? [];
      
      // Only attempt recovery if poisoned
      if (!hasStatusEffect(statuses, 'poisoned')) {
        return;
      }
      
      // Roll d20 for recovery
      const roll = rollD20();
      const { updatedStatuses, recovered } = attemptPoisonRecoveryUtil(statuses, roll);
      
      // Update hero's status effects
      state.heroHp[heroHpIndex] = {
        ...heroHp,
        statuses: updatedStatuses,
      };
      
      // Show recovery notification
      state.poisonRecoveryNotification = {
        heroId: currentHeroId,
        roll,
        recovered,
      };
    },
    /**
     * Attempt to escape from Cage curse (curse-cage status effect)
     * A hero on the same tile as the caged hero can attempt a DC 10+ roll to free them
     */
    attemptCageEscape: (state, action: PayloadAction<{
      cagedHeroId: string;
      rescuerHeroId: string;
    }>) => {
      const { cagedHeroId, rescuerHeroId } = action.payload;
      
      // Find the caged hero
      const cagedHeroIndex = state.heroHp.findIndex(h => h.heroId === cagedHeroId);
      if (cagedHeroIndex === -1) return;
      
      const cagedHero = state.heroHp[cagedHeroIndex];
      const statuses = cagedHero.statuses ?? [];
      
      // Verify the hero has the cage curse
      if (!hasStatusEffect(statuses, 'curse-cage')) {
        return;
      }
      
      // Verify rescuer and caged hero are on the same tile
      const rescuerToken = state.heroTokens.find(t => t.heroId === rescuerHeroId);
      const cagedToken = state.heroTokens.find(t => t.heroId === cagedHeroId);
      
      if (!rescuerToken || !cagedToken) return;
      
      if (!areOnSameTile(rescuerToken.position, cagedToken.position, state.dungeon)) {
        return;
      }
      
      // Roll d20 for escape attempt
      const roll = rollD20();
      const { updatedStatuses, removed } = attemptCurseRemoval(statuses, 'curse-cage', roll);
      
      // Get base AC from hero level stats
      const hero = AVAILABLE_HEROES.find(h => h.id === cagedHeroId);
      const baseAC = hero ? HERO_LEVELS[cagedHeroId][`level${cagedHero.level}`].ac : cagedHero.ac;
      
      // Recalculate AC with updated status effects
      const modifiedAC = getModifiedAC(updatedStatuses, baseAC);
      
      // Update caged hero's status effects and AC
      state.heroHp[cagedHeroIndex] = {
        ...cagedHero,
        statuses: updatedStatuses,
        ac: modifiedAC,
      };
      
      // Show escape attempt message
      if (removed) {
        state.encounterEffectMessage = `${rescuerHeroId} rolled ${roll} - ${cagedHeroId}'s Cage curse removed!`;
      } else {
        state.encounterEffectMessage = `${rescuerHeroId} rolled ${roll} - ${cagedHeroId}'s Cage curse persists (need 10+)`;
      }
    },
    /**
     * Show the pending monster card after tile animation completes
     * This is called after a 2-second delay to sequence the animations properly
     */
    showPendingMonster: (state) => {
      if (state.pendingMonsterDisplayId) {
        state.recentlySpawnedMonsterId = state.pendingMonsterDisplayId;
        state.pendingMonsterDisplayId = null;
      }
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
     * Select which treasure to keep when Dragon's Tribute is active (keep one, discard the other)
     */
    selectDragonsTributeTreasure: (state, action: PayloadAction<{ keepFirst: boolean }>) => {
      const { keepFirst } = action.payload;
      
      if (!state.drawnTreasure || !state.dragonsTributeSecondTreasure) {
        return;
      }
      
      // Determine which treasure to discard
      const treasureToDiscard = keepFirst ? state.dragonsTributeSecondTreasure : state.drawnTreasure;
      
      // Discard the higher-value treasure (or the one not selected by player)
      state.treasureDeck = discardTreasure(state.treasureDeck, treasureToDiscard.id);
      
      // Keep the selected treasure as drawnTreasure
      if (!keepFirst) {
        state.drawnTreasure = state.dragonsTributeSecondTreasure;
      }
      
      // Clear the second treasure
      state.dragonsTributeSecondTreasure = null;
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
      // If Dragon's Tribute second treasure exists, discard it too
      if (state.dragonsTributeSecondTreasure) {
        state.treasureDeck = discardTreasure(state.treasureDeck, state.dragonsTributeSecondTreasure.id);
        state.dragonsTributeSecondTreasure = null;
      }
    },
    /**
     * Select which treasure to discard for Thief in the Dark
     */
    selectThiefDiscard: (state, action: PayloadAction<{ cardId?: number; tokenId?: string }>) => {
      const { cardId, tokenId } = action.payload;
      
      if (!state.pendingTreasureDiscard) {
        return;
      }
      
      const heroId = state.pendingTreasureDiscard.heroId;
      const inventory = state.heroInventories[heroId];
      
      // Discard treasure card
      if (cardId !== undefined) {
        if (!inventory) {
          return;
        }
        
        const itemIndex = inventory.items.findIndex(item => item.cardId === cardId);
        if (itemIndex === -1) {
          return;
        }
        
        const treasureCard = getTreasureById(cardId);
        
        // Add treasure card back to discard pile
        state.treasureDeck = discardTreasure(state.treasureDeck, cardId);
        
        // Remove from inventory
        state.heroInventories[heroId] = {
          ...inventory,
          items: inventory.items.filter((_, index) => index !== itemIndex),
        };
        
        const treasureName = treasureCard?.name || `Treasure #${cardId}`;
        state.encounterEffectMessage = `${heroId} lost ${treasureName}`;
      }
      // Discard treasure token
      else if (tokenId !== undefined) {
        const token = state.treasureTokens.find(t => t.id === tokenId);
        if (!token) {
          return;
        }
        
        state.treasureTokens = state.treasureTokens.filter(t => t.id !== tokenId);
        state.encounterEffectMessage = `${heroId} lost a treasure token`;
      }
      
      // Clear the pending state
      state.pendingTreasureDiscard = null;
    },
    /**
     * Select a tile to spawn a wandering monster
     */
    selectTileForMonsterSpawn: (state, action: PayloadAction<{ tileId: string }>) => {
      const { tileId } = action.payload;
      
      if (!state.pendingMonsterSpawn) {
        return;
      }
      
      const { monsterId, monsterName, heroId } = state.pendingMonsterSpawn;
      
      // Find the selected tile
      const spawnTile = state.dungeon.tiles.find(t => t.id === tileId);
      if (!spawnTile) {
        return;
      }
      
      // Spawn the monster on the selected tile
      const spawnResult = spawnMonstersWithBehavior(
        monsterId,
        spawnTile,
        heroId,
        state.monsters,
        state.monsterInstanceCounter,
        state.monsterGroupCounter
      );
      
      if (spawnResult.monsters.length > 0) {
        state.monsters.push(...spawnResult.monsters);
        state.monsterInstanceCounter = spawnResult.monsterInstanceCounter;
        state.monsterGroupCounter = spawnResult.monsterGroupCounter;
        state.recentlySpawnedMonsterId = spawnResult.monsters[0].instanceId;
        
        // Add group if multiple monsters spawned
        if (spawnResult.group) {
          state.monsterGroups.push(spawnResult.group);
        }
        
        state.encounterEffectMessage = `${monsterName} spawned`;
      } else {
        state.encounterEffectMessage = 'Failed to create monster';
      }
      
      // Clear the pending state
      state.pendingMonsterSpawn = null;
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
      
      // Handle attack-action effect - requires player to select a target monster
      if (effect.type === 'attack-action') {
        // Set pending state - player needs to select a target before the attack resolves
        state.pendingTreasureItemAttack = { heroId, cardId };
        return;
      }
      
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
     * Cancel a pending treasure item attack (e.g., player changed their mind)
     */
    cancelTreasureItemAttack: (state) => {
      state.pendingTreasureItemAttack = null;
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
     * Set traps directly (for testing purposes)
     */
    setTraps: (state, action: PayloadAction<TrapState[]>) => {
      state.traps = action.payload;
    },
    /**
     * Apply a status effect to a hero
     */
    applyHeroStatus: (state, action: PayloadAction<{
      heroId: string;
      statusType: StatusEffectType;
      source: string;
      duration?: number;
      data?: StatusEffect['data'];
    }>) => {
      const { heroId, statusType, source, duration, data } = action.payload;
      const heroHpIndex = state.heroHp.findIndex(h => h.heroId === heroId);
      
      if (heroHpIndex !== -1) {
        const heroHp = state.heroHp[heroHpIndex];
        const updatedStatuses = applyStatusEffect(
          heroHp.statuses ?? [],
          statusType,
          source,
          state.turnState.turnNumber,
          duration,
          data
        );
        
        // Get base AC from hero level stats
        const hero = AVAILABLE_HEROES.find(h => h.id === heroId);
        const baseAC = hero ? HERO_LEVELS[heroId][`level${heroHp.level}`].ac : heroHp.ac;
        
        // Recalculate AC with status effects
        const modifiedAC = getModifiedAC(updatedStatuses, baseAC);
        
        state.heroHp[heroHpIndex] = {
          ...heroHp,
          statuses: updatedStatuses,
          ac: modifiedAC,
        };
      }
    },
    /**
     * Remove a status effect from a hero
     */
    removeHeroStatus: (state, action: PayloadAction<{
      heroId: string;
      statusType: StatusEffectType;
    }>) => {
      const { heroId, statusType } = action.payload;
      const heroHpIndex = state.heroHp.findIndex(h => h.heroId === heroId);
      
      if (heroHpIndex !== -1) {
        const heroHp = state.heroHp[heroHpIndex];
        const updatedStatuses = removeStatusEffect(heroHp.statuses ?? [], statusType);
        
        // Get base AC from hero level stats
        const hero = AVAILABLE_HEROES.find(h => h.id === heroId);
        const baseAC = hero ? HERO_LEVELS[heroId][`level${heroHp.level}`].ac : heroHp.ac;
        
        // Recalculate AC with remaining status effects
        const modifiedAC = getModifiedAC(updatedStatuses, baseAC);
        
        state.heroHp[heroHpIndex] = {
          ...heroHp,
          statuses: updatedStatuses,
          ac: modifiedAC,
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
      statusType: StatusEffectType;
      source: string;
      duration?: number;
      data?: StatusEffect['data'];
    }>) => {
      const { monsterInstanceId, statusType, source, duration, data } = action.payload;
      const monsterIndex = state.monsters.findIndex(m => m.instanceId === monsterInstanceId);
      
      if (monsterIndex !== -1) {
        const monster = state.monsters[monsterIndex];
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
      statusType: StatusEffectType;
    }>) => {
      const { monsterInstanceId, statusType } = action.payload;
      const monsterIndex = state.monsters.findIndex(m => m.instanceId === monsterInstanceId);
      
      if (monsterIndex !== -1) {
        const monster = state.monsters[monsterIndex];
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
    /**
     * Apply healing to a hero, respecting HP cap
     */
    applyHealing: (state, action: PayloadAction<{ heroId: string; amount: number }>) => {
      const { heroId, amount } = action.payload;
      const heroHpIndex = state.heroHp.findIndex(h => h.heroId === heroId);
      
      if (heroHpIndex !== -1 && amount > 0) {
        const heroHp = state.heroHp[heroHpIndex];
        // Heal the hero, capped at max HP
        heroHp.currentHp = Math.min(heroHp.maxHp, heroHp.currentHp + amount);
      }
    },
    /**
     * Prompt player to choose a monster for an encounter effect
     * This is a reusable action for any encounter card that requires monster selection
     */
    promptMonsterChoice: (state, action: PayloadAction<{ 
      encounterId: string; 
      encounterName: string; 
      context: string;
    }>) => {
      const { encounterId, encounterName, context } = action.payload;
      state.pendingMonsterChoice = {
        encounterId,
        encounterName,
        context,
      };
    },
    /**
     * Handle player's monster selection for an encounter effect
     * This is a reusable action that delegates to the appropriate encounter handler
     */
    selectMonsterForEncounter: (state, action: PayloadAction<{ monsterInstanceId: string }>) => {
      const { monsterInstanceId } = action.payload;
      
      if (!state.pendingMonsterChoice) {
        return;
      }
      
      const { encounterId } = state.pendingMonsterChoice;
      const selectedMonster = state.monsters.find(m => m.instanceId === monsterInstanceId);
      
      if (!selectedMonster) {
        state.encounterEffectMessage = 'Selected monster not found';
        state.pendingMonsterChoice = null;
        return;
      }
      
      // Clear the pending choice
      state.pendingMonsterChoice = null;
      
      // Handle the specific encounter effect with the chosen monster
      // This is a reusable pattern - add more cases here as needed
      if (encounterId === 'scream-of-sentry') {
        handleScreamOfSentryEffect(state, selectedMonster);
      } else if (encounterId === 'quick-advance') {
        handleQuickAdvanceEffect(state, selectedMonster);
        // Quick Advance requires drawing another encounter card afterward
        if (shouldDrawAnotherEncounter(encounterId)) {
          const { encounterId: nextEncounterId, deck: updatedDeck } = drawEncounter(state.encounterDeck);
          state.encounterDeck = updatedDeck;
          if (nextEncounterId) {
            const nextEncounter = getEncounterById(nextEncounterId);
            if (nextEncounter) {
              state.drawnEncounter = nextEncounter;
            }
          }
        }
      }
      // Add more encounter handlers here as needed
    },
    /**
     * Cancel monster selection prompt
     */
    cancelMonsterChoice: (state) => {
      if (state.pendingMonsterChoice) {
        // Discard the encounter card without applying effect
        if (state.drawnEncounter) {
          state.encounterDeck = discardEncounter(state.encounterDeck, state.drawnEncounter.id);
          state.drawnEncounter = null;
        }
        state.pendingMonsterChoice = null;
        state.encounterEffectMessage = 'Monster selection cancelled';
      }
    },
    /**
     * Select a target on the map (monster, trap, treasure, etc.)
     */
    selectTarget: (state, action: PayloadAction<{ targetId: string; targetType: 'monster' | 'trap' | 'treasure' }>) => {
      const { targetId, targetType } = action.payload;
      
      // If clicking the same target, deselect it
      if (state.selectedTargetId === targetId && state.selectedTargetType === targetType) {
        // Use the same deselection logic
        state.selectedTargetId = null;
        state.selectedTargetType = null;
      } else {
        // Select the new target
        state.selectedTargetId = targetId;
        state.selectedTargetType = targetType;
      }
    },
    /**
     * Deselect the currently selected target
     */
    deselectTarget: (state) => {
      state.selectedTargetId = null;
      state.selectedTargetType = null;
    },
    /**
     * Prompt for monster decision - pauses villain phase and shows selection UI
     */
    promptMonsterDecision: (state, action: PayloadAction<PendingMonsterDecision>) => {
      state.pendingMonsterDecision = action.payload;
      state.villainPhasePaused = true;
    },
    /**
     * Player selected a hero target for monster action
     */
    selectMonsterTarget: (state, action: PayloadAction<{ decisionId: string; targetHeroId: string }>) => {
      const { decisionId, targetHeroId } = action.payload;
      
      // Verify this matches the pending decision
      if (state.pendingMonsterDecision?.decisionId === decisionId) {
        const decision = state.pendingMonsterDecision;
        
        // Store the selected target for the monster AI to use
        state.monsterDecisionSelectedHero = targetHeroId;
        
        // Clear the decision and resume villain phase
        state.pendingMonsterDecision = null;
        state.villainPhasePaused = false;
        
        // Re-execute the monster turn with the selected hero
        // This will allow the monster to continue its action using the selected target
        const monster = state.monsters.find(m => m.instanceId === decision.monsterId);
        if (!monster) {
          // Monster was removed (defeated) before decision was resolved — skip and continue
          state.villainPhaseMonsterIndex++;
        } else {
          // Build hero HP and AC maps (AC includes item bonuses)
          const heroHpMap: Record<string, number> = {};
          const heroAcMap: Record<string, number> = {};
          for (const hp of state.heroHp) {
            heroHpMap[hp.heroId] = hp.currentHp;
          }
          for (const token of state.heroTokens) {
            const hero = AVAILABLE_HEROES.find(h => h.id === token.heroId);
            if (hero) {
              let totalAC = calculateTotalAC(hero.ac, state.heroInventories[token.heroId]);
              
              // Apply Cleric's Shield bonus (+2 AC) if this hero is the target
              if (state.clericsShieldTarget === token.heroId) {
                totalAC += 2;
              }
              
              heroAcMap[token.heroId] = totalAC;
            }
          }
          
          // Filter out heroes that are removed from play
          const activeHeroTokens = state.heroTokens.filter(token => {
            const heroHp = state.heroHp.find(hp => hp.heroId === token.heroId);
            return !heroHp?.removedFromPlay;
          });
          
          // Get the selected hero token
          const selectedHeroToken = activeHeroTokens.find(h => h.heroId === targetHeroId);
          
          if (!selectedHeroToken) {
            // Hero was removed from play before decision was resolved — skip and continue
            state.villainPhaseMonsterIndex++;
          } else {
            // Execute action based on decision context
            if (decision.context === 'attack' || decision.type === 'choose-adjacent-target') {
              // Adjacent attack - execute attack immediately
              const targetAC = heroAcMap[targetHeroId] ?? 10;
              const tactics = MONSTER_TACTICS[monster.monsterId];
              const attackOption = tactics?.adjacentAttack;
              if (!attackOption) {
                state.villainPhaseMonsterIndex++;
                return;
              }
              const attackResult = resolveMonsterAttackWithStats(attackOption, targetAC, Math.random);
              
              // Store the attack result
              state.monsterAttackResult = attackResult;
              state.monsterAttackTargetId = targetHeroId;
              state.monsterAttackerId = monster.instanceId;
              state.monsterAttackName = attackOption.name;
              
              // Apply damage if hit
              if (attackResult.isHit && attackResult.damage > 0) {
                const heroHp = state.heroHp.find(h => h.heroId === targetHeroId);
                if (heroHp) {
                  heroHp.currentHp = Math.max(0, heroHp.currentHp - attackResult.damage);
                  
                  // Check for party defeat
                  const allHeroesDefeated = state.heroHp.every(h => h.currentHp <= 0);
                  if (allHeroesDefeated) {
                    state.currentScreen = "defeat";
                  }
                }
              }
              
              // Apply status effect if hit
              if (attackResult.isHit) {
                applyMonsterAttackStatusEffect(state, monster.monsterId, monster.instanceId, targetHeroId, 'adjacent');
              }
              
              // Apply miss damage if missed
              if (!attackResult.isHit) {
                applyMonsterMissDamage(state, monster.monsterId, targetHeroId, 'adjacent');
              }
              
              // Increment monster index to continue to next monster
              state.villainPhaseMonsterIndex++;
            } else {
              // Movement targeting - find move toward selected hero
              const moveTarget = findMoveTowardHero(monster, selectedHeroToken.position, activeHeroTokens, state.monsters, state.dungeon);
              
              if (moveTarget && 'needsChoice' in moveTarget && moveTarget.needsChoice) {
                // Multiple equidistant destinations — ask player to choose
                state.pendingMonsterDecision = {
                  decisionId: `monster-${monster.instanceId}-move-${Date.now()}`,
                  type: 'choose-move-destination',
                  monsterId: monster.instanceId,
                  options: {
                    positions: moveTarget.positions,
                  },
                  context: 'movement',
                };
                state.villainPhasePaused = true;
                // Do NOT increment villainPhaseMonsterIndex — will be done by selectMonsterPosition
              } else {
                // Either a valid single destination or no valid move (null) — advance past this monster
                if (moveTarget && !('needsChoice' in moveTarget)) {
                  // Execute the move
                  const newTileId = findTileForGlobalPosition(moveTarget, state.dungeon);
                  if (newTileId) {
                    const localPos = globalToLocalPosition(moveTarget, newTileId, state.dungeon);
                    if (localPos) {
                      monster.position = localPos;
                      monster.tileId = newTileId;
                      
                      // Check for Blade Barrier
                      const bladeBarrierCheck = checkBladeBarrierDamage(moveTarget, state.boardTokens || []);
                      if (bladeBarrierCheck.shouldDamage && bladeBarrierCheck.tokenToRemove) {
                        monster.currentHp = Math.max(0, monster.currentHp - 1);
                        state.boardTokens = state.boardTokens.filter(token => token.id !== bladeBarrierCheck.tokenToRemove);
                      }
                    }
                  }
                  state.monsterMoveActionId = monster.instanceId;
                }
                // Increment in both sub-cases: after a successful move and when no valid move exists
                state.villainPhaseMonsterIndex++;
              }
            }
          }
        }
        
        // Clear the selected hero
        state.monsterDecisionSelectedHero = null;
      }
    },
    /**
     * Player selected a position for monster action  
     */
    selectMonsterPosition: (state, action: PayloadAction<{ decisionId: string; position: Position }>) => {
      const { decisionId, position } = action.payload;
      
      // Verify this matches the pending decision
      if (state.pendingMonsterDecision?.decisionId === decisionId) {
        const decision = state.pendingMonsterDecision;
        
        // Store the selected position for the monster AI to use
        state.monsterDecisionSelectedPosition = position;
        
        // Clear the decision and resume villain phase
        state.pendingMonsterDecision = null;
        state.villainPhasePaused = false;
        
        // Execute the move action with the selected position
        const monster = state.monsters.find(m => m.instanceId === decision.monsterId);
        if (!monster) {
          // Monster was removed (defeated) before decision was resolved — skip and continue
          state.villainPhaseMonsterIndex++;
        } else {
          // Find which tile the destination is on
          const newTileId = findTileForGlobalPosition(position, state.dungeon);
          if (newTileId) {
            // Convert global position to local tile position
            const localPos = globalToLocalPosition(position, newTileId, state.dungeon);
            if (localPos) {
              monster.position = localPos;
              monster.tileId = newTileId;
              
              // Check for Blade Barrier tokens at destination
              const bladeBarrierCheck = checkBladeBarrierDamage(
                position,
                state.boardTokens || []
              );
              
              if (bladeBarrierCheck.shouldDamage && bladeBarrierCheck.tokenToRemove) {
                // Deal 1 damage to the monster
                monster.currentHp = Math.max(0, monster.currentHp - 1);
                
                // Remove the blade barrier token
                state.boardTokens = state.boardTokens.filter(
                  token => token.id !== bladeBarrierCheck.tokenToRemove
                );
              }
            }
          }
          state.monsterMoveActionId = monster.instanceId;
          
          // Increment monster index to continue to next monster
          state.villainPhaseMonsterIndex++;
        }
        
        // Clear the selected position
        state.monsterDecisionSelectedPosition = null;
      }
    },
    /**
     * Cancel/clear pending monster decision
     */
    cancelMonsterDecision: (state) => {
      state.pendingMonsterDecision = null;
      state.villainPhasePaused = false;
      state.monsterDecisionSelectedHero = null;
      state.monsterDecisionSelectedPosition = null;
    },
    /**
     * Select a scenario in the lobby (before the game starts)
     */
    selectScenario: (state, action: PayloadAction<string>) => {
      state.selectedScenarioId = action.payload;
    },
    /**
     * Dismiss the scenario introduction modal
     */
    dismissScenarioIntroduction: (state) => {
      state.scenario.introductionShown = true;
      state.showScenarioIntroduction = false;
    },
    /**
     * Show the scenario introduction modal (e.g., when clicking objective panel)
     */
    showScenarioIntroductionModal: (state) => {
      state.showScenarioIntroduction = true;
    },
  },
});

export const { 
  startGame, 
  setHeroPosition,
  setHeroTurnActions,
  showMovement, 
  hideMovement, 
  moveHero,
  completeMove,
  undoAction,
  resetGame,
  endHeroPhase,
  placeExplorationTile,
  addExplorationMonster,
  endExplorationPhase,
  endVillainPhase,
  dismissMonsterCard,
  dismissEncounterCard,
  cancelEncounterCard,
  setAttackResult,
  dismissAttackResult,
  dismissTrapDisableResult,
  dismissDefeatNotification,
  setDefeatNotification,
  setMonsters,
  setVillain,
  setMonsterDeck,
  setMonsterGroups,
  incrementMonsterCounter,
  incrementGroupCounter,
  setCurrentPhase,
  clearAttackResult,
  setDrawnEncounter,
  setEncounterDeck,
  setTurnPhase,
  activateNextMonster,
  dismissMonsterAttackResult,
  dismissMonsterMoveAction,
  dismissMonsterExplorationEvent,
  setMonsterExplorationEvent,
  addDungeonTiles,
  addMonstersForTesting,
  setTileDeck,
  setTestMode,
  dismissHealingSurgeNotification,
  dismissEncounterEffectMessage,
  dismissEncounterResult,
  placeTreasureToken,
  dismissExplorationPhaseMessage,
  dismissVillainPhaseStepMessage,
  dismissPoisonedDamageNotification,
  dismissPoisonRecoveryNotification,
  attemptPoisonRecovery,
  attemptCageEscape,
  attemptDisableTrap,
  showPendingMonster,
  setHeroHp,
  dismissLevelUpNotification,
  setPartyResources,
  useVoluntaryActionSurge,
  skipActionSurge,
  startMultiAttack,
  recordMultiAttackHit,
  clearMultiAttack,
  startHeroPlacement,
  completeHeroPlacement,
  cancelHeroPlacement,
  startMoveAttack,
  completeMoveAttackMovement,
  clearMoveAttack,
  cancelMoveAttack,
  completeMoveAfterAttack,
  cancelMoveAfterAttack,
  selectHeroForMoveAfterAttack,
  assignTreasureToHero,
  selectDragonsTributeTreasure,
  dismissTreasureCard,
  selectThiefDiscard,
  selectTileForMonsterSpawn,
  useTreasureItem,
  cancelTreasureItemAttack,
  setTreasureDeck,
  setHeroInventories,
  setActiveEnvironment,
  placeBoardToken,
  removeBoardToken,
  moveBoardToken,
  decrementBoardTokenCharges,
  setBoardTokens,
  setTraps,
  applyHeroStatus,
  removeHeroStatus,
  clearHeroStatuses,
  applyMonsterStatus,
  removeMonsterStatus,
  processHeroStatusEffects,
  applyHealing,
  promptMonsterChoice,
  selectMonsterForEncounter,
  cancelMonsterChoice,
  selectTarget,
  deselectTarget,
  promptMonsterDecision,
  selectMonsterTarget,
  selectMonsterPosition,
  cancelMonsterDecision,
  selectScenario,
  dismissScenarioIntroduction,
  showScenarioIntroductionModal,
  addLogEntry,
  registerEventHooks,
  clearPendingPowerCardFlips,
  unregisterEventHookForCard,
  activateVillain,
  dismissVillainAttackResult,
  dismissVillainActivation,
} = gameSlice.actions;
export default gameSlice.reducer;
