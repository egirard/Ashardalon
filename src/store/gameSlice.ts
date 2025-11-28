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
} from "./types";
import { getValidMoveSquares, isValidMoveDestination, getTileBounds } from "./movement";
import {
  initializeDungeon,
  initializeTileDeck,
  checkExploration,
  placeTile,
  drawTile,
  updateDungeonAfterExploration,
} from "./exploration";
import {
  initializeMonsterDeck,
  drawMonster,
  createMonsterInstance,
  getTileMonsterSpawnPosition,
  discardMonster,
} from "./monsters";
import {
  executeMonsterTurn,
  globalToLocalPosition,
  findTileForGlobalPosition,
} from "./monsterAI";

/**
 * Default turn state for the beginning of a game
 */
const DEFAULT_TURN_STATE: TurnState = {
  currentHeroIndex: 0,
  currentPhase: "hero-phase",
  turnNumber: 1,
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
  /** Hero turn actions tracking for enforcing valid turn structure */
  heroTurnActions: HeroTurnActions;
  /** Scenario state for MVP win/loss tracking */
  scenario: ScenarioState;
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
  heroHp: [],
  monsterAttackResult: null,
  monsterAttackTargetId: null,
  monsterAttackerId: null,
  villainPhaseMonsterIndex: 0,
  heroTurnActions: { ...DEFAULT_HERO_TURN_ACTIONS },
  scenario: { ...DEFAULT_SCENARIO_STATE },
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

      // Initialize hero HP from hero definitions
      state.heroHp = heroIds.map(heroId => {
        const hero = AVAILABLE_HEROES.find(h => h.id === heroId);
        return {
          heroId,
          currentHp: hero?.hp ?? 8,
          maxHp: hero?.maxHp ?? 8,
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
      state.heroHp = [];
      state.monsterAttackResult = null;
      state.monsterAttackTargetId = null;
      state.monsterAttackerId = null;
      state.villainPhaseMonsterIndex = 0;
      state.heroTurnActions = { ...DEFAULT_HERO_TURN_ACTIONS };
      state.scenario = { ...DEFAULT_SCENARIO_STATE };
    },
    /**
     * End the hero phase and trigger exploration if hero is on an unexplored edge
     */
    endHeroPhase: (state) => {
      if (state.turnState.currentPhase !== "hero-phase") {
        return;
      }
      
      // Clear any previously spawned monster display
      state.recentlySpawnedMonsterId = null;
      
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
            // Update dungeon state
            state.dungeon = updateDungeonAfterExploration(
              state.dungeon,
              exploredEdge,
              newTile
            );
            state.dungeon.tileDeck = remainingDeck;
            
            // Draw and spawn a monster on the new tile
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
      // Clear any previous monster attack results
      state.monsterAttackResult = null;
      state.monsterAttackTargetId = null;
      state.monsterAttackerId = null;
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
    },
    /**
     * Dismiss the monster card display
     */
    dismissMonsterCard: (state) => {
      state.recentlySpawnedMonsterId = null;
    },
    /**
     * Set the attack result and apply damage to the target monster
     */
    setAttackResult: (
      state,
      action: PayloadAction<{ result: AttackResult; targetInstanceId: string }>
    ) => {
      // Only allow attack during hero phase and if hero can attack
      if (state.turnState.currentPhase !== "hero-phase" || !state.heroTurnActions.canAttack) {
        return;
      }
      
      const { result, targetInstanceId } = action.payload;
      state.attackResult = result;
      state.attackTargetId = targetInstanceId;
      
      // Apply damage if hit
      if (result.isHit && result.damage > 0) {
        const monster = state.monsters.find(m => m.instanceId === targetInstanceId);
        if (monster) {
          monster.currentHp -= result.damage;
          
          // Remove defeated monsters
          if (monster.currentHp <= 0) {
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
      
      // Track the attack action
      state.heroTurnActions = computeHeroTurnActions(state.heroTurnActions, 'attack');
    },
    /**
     * Dismiss the attack result display
     */
    dismissAttackResult: (state) => {
      state.attackResult = null;
      state.attackTargetId = null;
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
     * Set hero HP directly (for testing purposes)
     */
    setHeroHp: (state, action: PayloadAction<{ heroId: string; hp: number }>) => {
      const { heroId, hp } = action.payload;
      const heroHp = state.heroHp.find(h => h.heroId === heroId);
      if (heroHp) {
        heroHp.currentHp = Math.max(0, hp);
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
  setAttackResult,
  dismissAttackResult,
  setMonsters,
  activateNextMonster,
  dismissMonsterAttackResult,
  setHeroHp,
} = gameSlice.actions;
export default gameSlice.reducer;
