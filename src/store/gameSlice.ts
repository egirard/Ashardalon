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
  getTileMonsterSpawnPosition,
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
} from "./encounters";

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
      // Only show movement options during hero phase when hero can move
      if (state.turnState.currentPhase !== "hero-phase" || !state.heroTurnActions.canMove) {
        return;
      }
      
      const { heroId, speed } = action.payload;
      const token = state.heroTokens.find((t) => t.heroId === heroId);
      
      if (token) {
        state.validMoveSquares = getValidMoveSquares(
          token.position,
          speed,
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
     */
    moveHero: (
      state,
      action: PayloadAction<{ heroId: string; position: Position }>,
    ) => {
      const { heroId, position } = action.payload;
      
      // Only allow move during hero phase and if hero can move
      if (state.turnState.currentPhase !== "hero-phase" || !state.heroTurnActions.canMove) {
        return;
      }
      
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
        
        // Track the move action
        state.heroTurnActions = computeHeroTurnActions(state.heroTurnActions, 'move');
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
    },
    /**
     * End the hero phase and trigger exploration if hero is on an unexplored edge
     */
    endHeroPhase: (state) => {
      if (state.turnState.currentPhase !== "hero-phase") {
        return;
      }
      
      // Clear movement overlay when exiting hero phase
      state.validMoveSquares = [];
      state.showingMovement = false;
      
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
              // Create monster instance at tile center
              const monsterPosition = getTileMonsterSpawnPosition();
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
              }
              
              state.monsterDeck = updatedMonsterDeck;
            }
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
      
      // Check if the new hero needs a healing surge (at 0 HP at turn start)
      const currentHeroId = state.heroTokens[state.turnState.currentHeroIndex]?.heroId;
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
          
          // Otherwise, use a healing surge if needed
          if (checkHealingSurgeNeeded(heroHpState, state.partyResources)) {
            // Use a healing surge automatically
            const surgeResult = useHealingSurge(heroHpState, state.partyResources);
            state.heroHp[heroHpIndex] = surgeResult.heroState;
            state.partyResources = surgeResult.resources;
            
            // Set notification data for UI - use surge value as the HP restored amount
            state.healingSurgeUsedHeroId = currentHeroId;
            state.healingSurgeHpRestored = heroHpState.surgeValue;
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
        // Get the current hero ID for active-hero effects
        const activeHeroId = state.heroTokens[state.turnState.currentHeroIndex]?.heroId;
        
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
        
        // Discard the encounter
        state.encounterDeck = discardEncounter(state.encounterDeck, state.drawnEncounter.id);
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

      // Build hero HP and AC maps
      const heroHpMap: Record<string, number> = {};
      const heroAcMap: Record<string, number> = {};
      for (const hp of state.heroHp) {
        heroHpMap[hp.heroId] = hp.currentHp;
      }
      for (const token of state.heroTokens) {
        const hero = AVAILABLE_HEROES.find(h => h.id === token.heroId);
        if (hero) {
          heroAcMap[token.heroId] = hero.ac;
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
     * Dismiss the healing surge notification
     */
    dismissHealingSurgeNotification: (state) => {
      state.healingSurgeUsedHeroId = null;
      state.healingSurgeHpRestored = null;
    },
    /**
     * Set hero HP directly (for testing purposes)
     */
    setHeroHp: (state, action: PayloadAction<{ heroId: string; hp: number }>) => {
      const { heroId, hp } = action.payload;
      const heroHp = state.heroHp.find(h => h.heroId === heroId);
      if (heroHp) {
        heroHp.currentHp = Math.max(0, hp);
      }
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
  },
});

export const { 
  startGame, 
  setHeroPosition, 
  showMovement, 
  hideMovement, 
  moveHero, 
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
} = gameSlice.actions;
export default gameSlice.reducer;
