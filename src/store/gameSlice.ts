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
} from "./types";
import { getValidMoveSquares, isValidMoveDestination, getTileBounds, getTileOrSubTileId, findTileAtPosition } from "./movement";
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
} from "./monsters";
import {
  executeMonsterTurn,
  globalToLocalPosition,
  findTileForGlobalPosition,
  findClosestMonsterNotOnTile,
  findPositionAdjacentToHero,
  getMonsterGlobalPosition,
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
  monstersDefeated: 0,
  monstersToDefeat: 12,
  objective: "Defeat 12 monsters",
  title: "Into the Mountain",
  description: "You and your fellow adventurers have entered the depths beneath Firestorm Peak. The dragon Ashardalon's corruption spreads through these caverns. As you explore the dungeon, you'll face hordes of monsters and discover the source of evil.",
  instructions: "Work together to explore the dungeon tiles. When you explore, draw from the Monster Deck and place monsters on the board. Defeat monsters to gain XP and level up your heroes.",
  introductionShown: false,
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
}

/**
 * Exploration phase step types
 */
export type ExplorationStep = 
  | 'not-started'        // Phase just started, no steps shown yet
  | 'skipped'            // Hero not on edge, phase will be skipped
  | 'awaiting-tile'      // Waiting for user to click to place tile
  | 'tile-placed'        // Tile has been placed
  | 'awaiting-monster'   // Waiting for user to click to add monster
  | 'monster-added'      // Monster has been added
  | 'complete';          // All steps completed

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
 */
function applyMonsterAttackStatusEffect(
  state: GameState,
  monsterId: string,
  monsterInstanceId: string,
  targetHeroId: string
): void {
  const tactics = MONSTER_TACTICS[monsterId];
  if (tactics?.adjacentAttack.statusEffect) {
    const heroHpIndex = state.heroHp.findIndex(h => h.heroId === targetHeroId);
    if (heroHpIndex !== -1) {
      const heroHp = state.heroHp[heroHpIndex];
      const statusType = tactics.adjacentAttack.statusEffect as StatusEffectType;
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
  pendingMonsterDisplayId: null,
  poisonedDamageNotification: null,
  poisonRecoveryNotification: null,
  clericsShieldTarget: null,
  pendingMonsterChoice: null,
  pendingTreasurePlacement: null,
  selectedTargetId: null,
  selectedTargetType: null,
  showScenarioIntroduction: false,
  badLuckExtraEncounterPending: false,
  heroMovedThisPhase: false,
  trapDisableResult: null,
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
          
          // Get spawn position on the new tile
          const spawnPosition = getMonsterSpawnPosition(newTile, state.monsters);
          
          if (spawnPosition) {
            const activeHeroToken = state.heroTokens[state.turnState.currentHeroIndex];
            
            // Create the new monster instance
            const newMonster = createMonsterInstance(
              newMonsterId,
              spawnPosition,
              activeHeroToken?.heroId || state.heroTokens[0].heroId,
              newTile.id,
              state.monsterInstanceCounter
            );
            
            if (newMonster) {
              state.monsters.push(newMonster);
              state.monsterInstanceCounter++;
              state.recentlySpawnedMonsterId = newMonster.instanceId;
              
              state.encounterEffectMessage = `Tile placed near ${monsterDef?.name || 'monster'}, ${newMonsterDef?.name || 'monster'} spawned`;
            } else {
              state.encounterEffectMessage = 'Failed to create monster';
            }
          } else {
            state.encounterEffectMessage = 'No valid spawn position on new tile';
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

      // Show scenario introduction on game start
      state.showScenarioIntroduction = true;

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
      
      // Check if all movement is used or if this completes the move action
      if (state.incrementalMovement.remainingMovement <= 0) {
        // Movement complete - mark move action as taken
        state.incrementalMovement.inProgress = false;
        const heroStatuses = getHeroStatuses(state, heroId);
        state.heroTurnActions = computeHeroTurnActions(state.heroTurnActions, 'move', heroStatuses);
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
      const heroId = state.incrementalMovement.heroId;
      const heroStatuses = getHeroStatuses(state, heroId);
      state.heroTurnActions = computeHeroTurnActions(state.heroTurnActions, 'move', heroStatuses);
      
      // Clear movement overlay
      state.validMoveSquares = [];
      state.showingMovement = false;
      
      // Clear undo snapshot (completing the move is a commitment)
      state.undoSnapshot = null;
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
        }
      } else {
        // No exploration - hero not on unexplored edge
        state.explorationPhase = {
          step: 'skipped',
          drawnTile: null,
          exploredEdge: null,
          drawnMonster: null,
        };
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
        // Get spawn position (black square, or adjacent if occupied)
        const monsterPosition = getMonsterSpawnPosition(newTile, state.monsters);
        
        if (monsterPosition) {
          const monsterInstance = createMonsterInstance(
            drawnMonster,
            monsterPosition,
            currentToken.heroId,
            newTile.id,
            state.monsterInstanceCounter
          );
          
          if (monsterInstance) {
            state.monsters.push(monsterInstance);
            state.monsterInstanceCounter += 1;
            // Set pending monster display for animation
            state.pendingMonsterDisplayId = monsterInstance.instanceId;
            
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
      }
      
      // Mark exploration as complete
      state.explorationPhase.step = 'complete';
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
                    // Get proper spawn position on the tile (black square or adjacent)
                    const spawnPosition = getMonsterSpawnPosition(edgeTile, state.monsters);
                    
                    if (spawnPosition) {
                      // Create monster instance at the spawn position
                      const monsterInstance = createMonsterInstance(
                        drawnMonsterId,
                        spawnPosition,
                        activeHeroId, // Monster is controlled by the active hero
                        closestEdge.tileId,
                        state.monsterInstanceCounter
                      );
                      
                      if (monsterInstance) {
                        state.monsters.push(monsterInstance);
                        state.monsterInstanceCounter += 1;
                        state.monsterDeck = updatedMonsterDeck;
                        
                        // Set pending monster display to show the monster card popup
                        state.pendingMonsterDisplayId = monsterInstance.instanceId;
                      }
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
      state.monsterAttackResult = null;
      state.monsterAttackTargetId = null;
      state.monsterAttackerId = null;
      state.monsterMoveActionId = null;
      
      // Clear exploration phase message to ensure sequential display
      state.explorationPhaseMessage = null;
      state.recentlyPlacedTileId = null;
      
      // Draw encounter if no exploration occurred this turn
      if (shouldDrawEncounter(state.turnState)) {
        const { encounterId, deck: updatedDeck } = drawEncounter(state.encounterDeck);
        state.encounterDeck = updatedDeck;
        
        if (encounterId) {
          const encounter = getEncounterById(encounterId);
          if (encounter) {
            state.drawnEncounter = encounter;
            
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
                return;
              }
            }
          }
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
            const { heroHpList, results } = resolveEncounterEffect(
              state.drawnEncounter,
              state.heroHp,
              activeHeroId,
              state.heroTokens,
              state.dungeon
            );
            state.heroHp = heroHpList;
            
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
                return;
              }
            }
          }
        } else if (state.drawnEncounter.effect.type === 'special') {
          // Handle special encounter cards
          const encounterId = state.drawnEncounter.id;
          
          // Lost: Move bottom tile to top
          if (encounterId === 'lost') {
            const deckSize = state.dungeon.tileDeck.length;
            state.dungeon.tileDeck = moveBottomTileToTop(state.dungeon.tileDeck);
            state.encounterEffectMessage = `Bottom tile moved to top of deck (${deckSize} tiles remaining)`;
          }
          
          // Monster deck manipulation cards
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
          
          // Thief in the Dark: Active hero discards a treasure
          else if (encounterId === 'thief-in-dark') {
            const activeHeroId = state.heroTokens[state.turnState.currentHeroIndex]?.heroId;
            if (activeHeroId) {
              const inventory = state.heroInventories[activeHeroId];
              if (inventory && inventory.items.length > 0) {
                // Remove the first treasure item
                const removedItem = inventory.items[0];
                state.heroInventories[activeHeroId] = {
                  ...inventory,
                  items: inventory.items.slice(1),
                };
                state.encounterEffectMessage = `${activeHeroId} lost ${removedItem.name}`;
              } else {
                state.encounterEffectMessage = 'No treasure to lose';
              }
            }
          }
          
          // Wandering Monster: Draw a monster and place on closest unexplored edge
          else if (encounterId === 'wandering-monster') {
            const activeHeroToken = state.heroTokens[state.turnState.currentHeroIndex];
            if (activeHeroToken) {
              // Draw a monster
              const { monster: monsterId, deck: updatedMonsterDeck } = drawMonster(state.monsterDeck);
              state.monsterDeck = updatedMonsterDeck;
              
              if (monsterId) {
                const monsterDef = getMonsterById(monsterId);
                if (monsterDef) {
                  // Find a tile with an unexplored edge (prefer closer to active hero)
                  const tilesWithUnexploredEdges = state.dungeon.unexploredEdges.map(edge => 
                    state.dungeon.tiles.find(t => t.id === edge.tileId)
                  ).filter((t, i, arr) => t && arr.findIndex(tile => tile?.id === t.id) === i); // Deduplicate
                  
                  if (tilesWithUnexploredEdges.length > 0) {
                    // Get the first tile with unexplored edge (could be improved to find closest)
                    const spawnTile = tilesWithUnexploredEdges[0];
                    if (spawnTile) {
                      // Get spawn position on the tile (black square or adjacent)
                      const spawnPosition = getMonsterSpawnPosition(spawnTile, state.monsters);
                      
                      if (spawnPosition) {
                        // Create monster instance
                        const monster = createMonsterInstance(
                          monsterId,
                          spawnPosition,
                          activeHeroToken.heroId,
                          spawnTile.id,
                          state.monsterInstanceCounter
                        );
                        
                        if (monster) {
                          state.monsters.push(monster);
                          state.monsterInstanceCounter++;
                          state.recentlySpawnedMonsterId = monster.instanceId;
                          state.encounterEffectMessage = `${monsterDef.name} spawned`;
                        } else {
                          state.encounterEffectMessage = 'Failed to create monster';
                        }
                      } else {
                        state.encounterEffectMessage = 'No valid spawn position on tile';
                      }
                    } else {
                      state.encounterEffectMessage = 'No tile found with unexplored edge';
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
            const activeHeroToken = state.heroTokens[state.turnState.currentHeroIndex];
            if (activeHeroToken && state.monsters.length > 0) {
              // Find a monster not on active hero's tile
              const monstersNotOnTile = state.monsters.filter(m => {
                return m.tileId !== activeHeroToken.tileId || 
                       m.position.x !== activeHeroToken.position.x || 
                       m.position.y !== activeHeroToken.position.y;
              });
              
              if (monstersNotOnTile.length > 0) {
                // Move the first such monster
                const monsterToMove = monstersNotOnTile[0];
                const monsterDef = getMonsterById(monsterToMove.monsterId);
                
                // Use monster AI to move toward hero
                const result = executeMonsterTurn(
                  monsterToMove,
                  state.heroTokens,
                  state.heroHp.reduce((acc, hp) => ({ ...acc, [hp.heroId]: hp.currentHp }), {}),
                  state.heroHp.reduce((acc, hp) => ({ ...acc, [hp.heroId]: hp.ac }), {}),
                  state.monsters,
                  state.dungeon,
                  Math.random
                );
                
                if (result.type === 'move') {
                  const newTileId = findTileForGlobalPosition(result.destination, state.dungeon);
                  if (newTileId) {
                    const localPos = globalToLocalPosition(result.destination, newTileId, state.dungeon);
                    if (localPos) {
                      monsterToMove.position = localPos;
                      monsterToMove.tileId = newTileId;
                      state.encounterEffectMessage = `${monsterDef?.name || 'Monster'} moved closer`;
                      
                      // Check for Blade Barrier tokens at destination
                      const bladeBarrierCheck = checkBladeBarrierDamage(
                        result.destination,
                        state.boardTokens || []
                      );
                      
                      if (bladeBarrierCheck.shouldDamage && bladeBarrierCheck.tokenToRemove) {
                        // Deal 1 damage to the monster
                        monsterToMove.currentHp = Math.max(0, monsterToMove.currentHp - 1);
                        
                        // Remove the blade barrier token
                        state.boardTokens = state.boardTokens.filter(
                          token => token.id !== bladeBarrierCheck.tokenToRemove
                        );
                        
                        state.encounterEffectMessage = `${monsterDef?.name || 'Monster'} moved closer and hit Blade Barrier (1 damage)`;
                      }
                    }
                  }
                }
              } else {
                state.encounterEffectMessage = 'No monster to move';
              }
            }
          }
          
          // Ancient Spirit's Blessing: Flip up a used Daily Power
          else if (encounterId === 'ancient-spirits-blessing') {
            // Find first hero with a used daily power
            let powerRestored = false;
            for (const heroId in state.heroInventories) {
              const inventory = state.heroInventories[heroId];
              if (inventory.dailyPowers) {
                for (let i = 0; i < inventory.dailyPowers.length; i++) {
                  if (inventory.dailyPowers[i].used) {
                    // Flip the power back up
                    state.heroInventories[heroId] = {
                      ...inventory,
                      dailyPowers: [
                        ...inventory.dailyPowers.slice(0, i),
                        { ...inventory.dailyPowers[i], used: false },
                        ...inventory.dailyPowers.slice(i + 1),
                      ],
                    };
                    state.encounterEffectMessage = `${inventory.dailyPowers[i].name} restored`;
                    powerRestored = true;
                    break;
                  }
                }
                if (powerRestored) break;
              }
            }
            if (!powerRestored) {
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
      action: PayloadAction<{ result: AttackResult; targetInstanceId: string; attackName: string; cardId?: number }>
    ) => {
      // Only allow attack during hero phase and if hero can attack
      if (state.turnState.currentPhase !== "hero-phase" || !state.heroTurnActions.canAttack) {
        return;
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
          state.heroTurnActions = computeHeroTurnActions(state.heroTurnActions, 'attack', heroStatuses);
        }
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
     * Set turn phase directly (for testing purposes)
     */
    setTurnPhase: (state, action: PayloadAction<TurnPhase>) => {
      state.turnState.currentPhase = action.payload;
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
              
              // Check for Blade Barrier tokens at destination
              const bladeBarrierCheck = checkBladeBarrierDamage(
                result.destination,
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
          applyMonsterAttackStatusEffect(state, monster.monsterId, monster.instanceId, result.targetId);
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
              
              // Check for Blade Barrier tokens at destination
              const bladeBarrierCheck = checkBladeBarrierDamage(
                result.destination,
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
          applyMonsterAttackStatusEffect(state, monster.monsterId, monster.instanceId, result.targetId);
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
  setMonsters,
  setMonsterDeck,
  setDrawnEncounter,
  setTurnPhase,
  activateNextMonster,
  dismissMonsterAttackResult,
  dismissMonsterMoveAction,
  dismissHealingSurgeNotification,
  dismissEncounterEffectMessage,
  dismissEncounterResult,
  placeTreasureToken,
  dismissExplorationPhaseMessage,
  dismissPoisonedDamageNotification,
  dismissPoisonRecoveryNotification,
  attemptPoisonRecovery,
  attemptCageEscape,
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
  useTreasureItem,
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
  dismissScenarioIntroduction,
  showScenarioIntroductionModal,
} = gameSlice.actions;
export default gameSlice.reducer;
