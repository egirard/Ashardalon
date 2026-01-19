<script lang="ts">
  import { store } from "../store";
  import { tick } from 'svelte';
  import {
    resetGame,
    showMovement,
    hideMovement,
    moveHero,
    completeMove,
    undoAction,
    endHeroPhase,
    placeExplorationTile,
    addExplorationMonster,
    endExplorationPhase,
    endVillainPhase,
    dismissMonsterCard,
    dismissEncounterCard,
    cancelEncounterCard,
    dismissScenarioIntroduction,
    showScenarioIntroductionModal,
    dismissEncounterResult,
    setAttackResult,
    dismissAttackResult,
    dismissTrapDisableResult,
    dismissDefeatNotification,
    activateNextMonster,
    dismissMonsterAttackResult,
    dismissMonsterMoveAction,
    shouldAutoEndHeroTurn,
    dismissLevelUpNotification,
    dismissHealingSurgeNotification,
    dismissEncounterEffectMessage,
    dismissExplorationPhaseMessage,
    dismissPoisonedDamageNotification,
    dismissPoisonRecoveryNotification,
    attemptPoisonRecovery,
    attemptCageEscape,
    showPendingMonster,
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
    dismissTreasureCard,
    useTreasureItem,
    applyHealing,
    selectMonsterForEncounter,
    cancelMonsterChoice,
    selectTarget,
    deselectTarget,
    type MultiAttackState,
    type PendingMoveAttackState,
    type PendingMoveAfterAttackState,
    type PendingHeroPlacementState,
    type PendingMonsterChoiceState,
    type IncrementalMovementState,
    type UndoSnapshot,
  } from "../store/gameSlice";
  import type { EdgePosition } from "../store/heroesSlice";
  import { getTileSquares } from "../store/powerCardEffects";
  import { TargetIcon, CheckIcon } from './icons';
  import type {
    HeroToken,
    Hero,
    TurnState,
    GamePhase,
    Position,
    DungeonState,
    TileEdge,
    PlacedTile,
    MonsterState,
    MonsterDeck,
    AttackResult,
    HeroHpState,
    HeroTurnActions,
    ScenarioState,
    PartyResources,
    EncounterCard as EncounterCardType,
  } from "../store/types";
  import { TILE_DEFINITIONS, MONSTERS, AVAILABLE_HEROES, ENCOUNTER_CARDS } from "../store/types";
  import { assetPath } from "../utils";
  import MovementOverlay from "./MovementOverlay.svelte";
  import TileDeckCounter from "./TileDeckCounter.svelte";
  import UnexploredEdgeIndicator from "./UnexploredEdgeIndicator.svelte";
  import MonsterToken from "./MonsterToken.svelte";
  import MonsterCard from "./MonsterCard.svelte";
  import MonsterCardMini from "./MonsterCardMini.svelte";
  import EncounterCard from "./EncounterCard.svelte";
  import EncounterResultPopup from "./EncounterResultPopup.svelte";
  import TrapMarker from "./TrapMarker.svelte";
  import HazardMarker from "./HazardMarker.svelte";
  import TreasureTokenMarker from "./TreasureTokenMarker.svelte";
  import BoardTokenMarker from "./BoardTokenMarker.svelte";
  import CombatResultDisplay from "./CombatResultDisplay.svelte";
  import TrapDisableResultDisplay from "./TrapDisableResultDisplay.svelte";
  import MonsterMoveDisplay from "./MonsterMoveDisplay.svelte";
  import XPCounter from "./XPCounter.svelte";
  import HealingSurgeCounter from "./HealingSurgeCounter.svelte";
  import DefeatAnimation from "./DefeatAnimation.svelte";
  import LevelUpAnimation from "./LevelUpAnimation.svelte";
  import HealingSurgeAnimation from "./HealingSurgeAnimation.svelte";
  import EncounterEffectNotification from "./EncounterEffectNotification.svelte";
  import ExplorationPhaseNotification from "./ExplorationPhaseNotification.svelte";
  import ActionSurgePrompt from "./ActionSurgePrompt.svelte";
  import PoisonedDamageNotification from "./PoisonedDamageNotification.svelte";
  import PoisonRecoveryNotification from "./PoisonRecoveryNotification.svelte";
  import TreasureCard from "./TreasureCard.svelte";
  import MonsterChoiceModal from "./MonsterChoiceModal.svelte";
  import PlayerCard from "./PlayerCard.svelte";
  import PlayerPowerCards from "./PlayerPowerCards.svelte";
  import TurnProgressCard from "./TurnProgressCard.svelte";
  import FeedbackButton from "./FeedbackButton.svelte";
  import CornerControls from "./CornerControls.svelte";
  import ScenarioIntroduction from "./ScenarioIntroduction.svelte";
  import {
    resolveAttack,
    getAdjacentMonsters,
    getMonsterAC,
    applyItemBonusesToAttack,
    calculateTotalSpeed,
    getMonstersWithinRange,
    getMonstersOnSameTile,
    getMonsterGlobalPosition,
    arePositionsAdjacent,
    isWithinTileRange,
  } from "../store/combat";
  import { findTileAtPosition, getTileOrSubTileId } from "../store/movement";
  import { getPowerCardById, type HeroPowerCards, POWER_CARDS } from "../store/powerCards";
  import { usePowerCard } from "../store/heroesSlice";
  import { parseActionCard, requiresMultiAttack, requiresMovementFirst } from "../store/actionCardParser";
  import type { TreasureCard as TreasureCardType, HeroInventory } from "../store/treasure";
  import { getStatusDisplayData, isDazed, STATUS_EFFECT_DEFINITIONS, getModifiedAttackBonusWithCurses } from "../store/statusEffects";
  import { areOnSameTile } from "../store/encounters";

  // Tile dimension constants (based on 140px grid cells)
  const TILE_CELL_SIZE = 140; // Size of each grid square in pixels
  const TILE_GRID_WIDTH = 4; // Number of cells wide
  const START_TILE_GRID_HEIGHT = 8; // Start tile is double height (8 cells tall)
  const NORMAL_TILE_GRID_HEIGHT = 4; // Normal tiles are 4 cells tall
  const TILE_WIDTH = TILE_CELL_SIZE * TILE_GRID_WIDTH; // 560px (playable grid)
  const START_TILE_HEIGHT = TILE_CELL_SIZE * START_TILE_GRID_HEIGHT; // 1120px (playable grid)
  const NORMAL_TILE_HEIGHT = TILE_CELL_SIZE * NORMAL_TILE_GRID_HEIGHT; // 560px (playable grid)
  // Buffer space (in px) to prevent map clipping during CSS transform scaling.
  // The map uses transform: scale() with transform-origin: center, which maintains
  // original element dimensions for layout while visually scaling the content.
  // This larger buffer ensures all tile edges including connector tabs are visible.
  const CONTAINER_PADDING = 140;
  const MIN_SCALE = 0.15; // Minimum scale for legibility (lower to fit more tiles)
  const MAX_SCALE = 1; // Maximum scale (no upscaling)
  
  // Dynamic padding constants for overlay panels
  const PANEL_GAP_BUFFER = 20; // Gap between panel edge and map content (in px)
  const MIN_PANEL_PADDING = 20; // Minimum padding when no panels are present (in px)

  // Token positioning constants - offset from image edge to playable grid
  const TOKEN_OFFSET_X = 36; // Offset from left edge of tile image to playable grid
  const TOKEN_OFFSET_Y = 36; // Offset from top edge of normal tile image to playable grid

  // Tile image dimensions (includes border and puzzle connectors)
  const TILE_IMAGE_WIDTH = 632; // Actual image width
  const NORMAL_TILE_IMAGE_HEIGHT = 632; // Actual normal tile image height
  const START_TILE_IMAGE_HEIGHT = 1195; // Actual start tile image height

  // Start tile has asymmetric vertical borders due to image dimensions
  // Start tile: 1195px image - 1120px grid = 75px total (not divisible by 2)
  // Expected: 560+560+72 = 1192px, Actual: 1195px, Difference: 3px
  // This 3px is all on the north edge for proper connector alignment
  // North edge: 39px border (36 + 3), South edge: 36px border (standard)
  const START_TILE_NORTH_OFFSET_DIFF = 3; // Extra pixels on north edge vs normal 36px
  const START_TILE_SOUTH_OFFSET_DIFF = 0; // No extra pixels on south edge

  // Tile overlap - tiles need to overlap by this amount to interlock puzzle connectors
  // This equals the border/connector area on each side
  const TILE_OVERLAP = TOKEN_OFFSET_X; // 36px overlap for interlocking

  let heroTokens: HeroToken[] = $state([]);
  let selectedHeroes: Hero[] = $state([]);
  let heroEdgeMap: Record<string, EdgePosition> = $state({});
  let heroSidePreferences: Record<string, 'left' | 'right'> = $state({});
  let turnState: TurnState = $state({
    currentHeroIndex: 0,
    currentPhase: "hero-phase",
    turnNumber: 1,
    exploredThisTurn: false,
  });
  let validMoveSquares: Position[] = $state([]);
  let showingMovement: boolean = $state(false);
  let dungeon: DungeonState = $state({
    tiles: [],
    unexploredEdges: [],
    tileDeck: [],
  });
  let monsters: MonsterState[] = $state([]);
  let recentlySpawnedMonsterId: string | null = $state(null);
  let attackResult: AttackResult | null = $state(null);
  let attackTargetId: string | null = $state(null);
  let heroHp: HeroHpState[] = $state([]);
  let monsterAttackResult: AttackResult | null = $state(null);
  let monsterAttackTargetId: string | null = $state(null);
  let monsterAttackerId: string | null = $state(null);
  let villainPhaseMonsterIndex: number = $state(0);
  let monsterMoveActionId: string | null = $state(null);
  let heroTurnActions: HeroTurnActions = $state({ actionsTaken: [], canMove: true, canAttack: true });
  let scenario: ScenarioState = $state({ monstersDefeated: 0, monstersToDefeat: 12, objective: "Defeat 12 monsters" });
  let partyResources: PartyResources = $state({ xp: 0, healingSurges: 2 });
  let defeatedMonsterXp: number | null = $state(null);
  let defeatedMonsterName: string | null = $state(null);
  let leveledUpHeroId: string | null = $state(null);
  let levelUpOldStats: HeroHpState | null = $state(null);
  let healingSurgeUsedHeroId: string | null = $state(null);
  let healingSurgeHpRestored: number | null = $state(null);
  let encounterEffectMessage: string | null = $state(null);
  let explorationPhaseMessage: string | null = $state(null);
  let explorationPhase: import('../store/gameSlice').ExplorationPhaseState = $state({ step: 'not-started', drawnTile: null, exploredEdge: null, drawnMonster: null });
  let recentlyPlacedTileId: string | null = $state(null);
  let pendingMonsterDisplayId: string | null = $state(null);
  let poisonedDamageNotification: { heroId: string; damage: number } | null = $state(null);
  let poisonRecoveryNotification: { heroId: string; roll: number; recovered: boolean } | null = $state(null);
  let showScenarioIntroduction: boolean = $state(false);
  let boardContainerRef: HTMLDivElement | null = $state(null);
  let heroPowerCards: Record<string, HeroPowerCards> = $state({});
  let attackName: string | null = $state(null);
  let drawnEncounter: EncounterCardType | null = $state(null);
  let encounterResult: import('../store/types').EncounterResult | null = $state(null);
  let activeEnvironmentId: string | null = $state(null);
  let showEnvironmentDetail: boolean = $state(false);
  let traps: import("../store/types").TrapState[] = $state([]);
  let hazards: import("../store/types").HazardState[] = $state([]);
  let treasureTokens: import("../store/types").TreasureTokenState[] = $state([]);
  let boardTokens: import("../store/types").BoardTokenState[] = $state([]);
  let showActionSurgePrompt: boolean = $state(false);
  let multiAttackState: MultiAttackState | null = $state(null);
  let pendingMoveAttack: PendingMoveAttackState | null = $state(null);
  let pendingMoveAfterAttack: PendingMoveAfterAttackState | null = $state(null);
  let pendingHeroPlacement: PendingHeroPlacementState | null = $state(null);
  let drawnTreasure: TreasureCardType | null = $state(null);
  let heroInventories: Record<string, HeroInventory> = $state({});
  let incrementalMovement: IncrementalMovementState | null = $state(null);
  let undoSnapshot: UndoSnapshot | null = $state(null);
  let pendingMonsterChoice: PendingMonsterChoiceState | null = $state(null);
  let selectedTargetId: string | null = $state(null);
  let selectedTargetType: 'monster' | 'trap' | 'treasure' | null = $state(null);
  let trapDisableResult: import('../store/types').TrapDisableResult | null = $state(null);
  
  // Blade Barrier token placement state
  let pendingBladeBarrier: { 
    heroId: string; 
    cardId: number; 
    step: 'tile-selection' | 'square-selection'; 
    selectedTileId?: string;
    selectedSubTileId?: string; // For start tile, which half: 'top' or 'bottom'
    selectedSquares?: Position[]; // For square selection mode
  } | null = $state(null);
  
  // Flaming Sphere token placement/movement state
  let pendingFlamingSphere: {
    heroId: string;
    cardId: number;
    action: 'placement' | 'movement' | 'damage';
    step: 'square-selection';
    selectedSquare?: Position;
  } | null = $state(null);
  
  // Monster relocation state (for Command, Distant Diversion)
  let pendingMonsterRelocation: {
    heroId: string;
    cardId: number;
    step: 'monster-selection' | 'tile-selection';
    selectedMonsterInstanceId?: string;
    maxTileRange: number; // 2 for Command, 1 for Distant Diversion (adjacent tiles only)
  } | null = $state(null);
  
  // Track which power card is selected for attacking (so map clicks can trigger attacks)
  // Track remaining targets for area attacks (attacks that hit all monsters on a tile)
  let pendingAreaAttackTargets: MonsterState[] = $state([]);

  // Map control state
  let mapControlMode: boolean = $state(false);
  let manualZoom: number = $state(1); // User-controlled zoom level
  let panOffset: { x: number; y: number } = $state({ x: 0, y: 0 });
  let isPanning: boolean = $state(false);
  let lastPanPoint: { x: number; y: number } = $state({ x: 0, y: 0 });
  let lastPinchDistance: number = $state(0);
  let dungeonMapRef: HTMLDivElement | null = $state(null);

  // Derived map bounds - recalculates when dungeon changes
  let mapBounds = $derived(getMapBoundsFromDungeon(dungeon));

  // Subscribe to store updates
  $effect(() => {
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      
      // Batch all state updates
      heroTokens = state.game.heroTokens;
      selectedHeroes = state.heroes.selectedHeroes;
      heroEdgeMap = state.heroes.heroEdgeMap;
      heroSidePreferences = state.heroes.heroSidePreferences;
      turnState = state.game.turnState;
      validMoveSquares = state.game.validMoveSquares;
      showingMovement = state.game.showingMovement;
      dungeon = state.game.dungeon;
      monsters = state.game.monsters;
      recentlySpawnedMonsterId = state.game.recentlySpawnedMonsterId;
      attackResult = state.game.attackResult;
      attackTargetId = state.game.attackTargetId;
      heroHp = state.game.heroHp;
      monsterAttackResult = state.game.monsterAttackResult;
      monsterAttackTargetId = state.game.monsterAttackTargetId;
      monsterAttackerId = state.game.monsterAttackerId;
      villainPhaseMonsterIndex = state.game.villainPhaseMonsterIndex;
      monsterMoveActionId = state.game.monsterMoveActionId;
      heroTurnActions = state.game.heroTurnActions;
      scenario = state.game.scenario;
      partyResources = state.game.partyResources;
      defeatedMonsterXp = state.game.defeatedMonsterXp;
      defeatedMonsterName = state.game.defeatedMonsterName;
      leveledUpHeroId = state.game.leveledUpHeroId;
      levelUpOldStats = state.game.levelUpOldStats;
      healingSurgeUsedHeroId = state.game.healingSurgeUsedHeroId;
      healingSurgeHpRestored = state.game.healingSurgeHpRestored;
      encounterEffectMessage = state.game.encounterEffectMessage;
      explorationPhaseMessage = state.game.explorationPhaseMessage;
      explorationPhase = state.game.explorationPhase;
      recentlyPlacedTileId = state.game.recentlyPlacedTileId;
      pendingMonsterDisplayId = state.game.pendingMonsterDisplayId;
      poisonedDamageNotification = state.game.poisonedDamageNotification;
      poisonRecoveryNotification = state.game.poisonRecoveryNotification;
      heroPowerCards = state.heroes.heroPowerCards;
      attackName = state.game.attackName;
      drawnEncounter = state.game.drawnEncounter;
      encounterResult = state.game.encounterResult;
      activeEnvironmentId = state.game.activeEnvironmentId;
      traps = state.game.traps;
      hazards = state.game.hazards;
      treasureTokens = state.game.treasureTokens;
      boardTokens = state.game.boardTokens;
      showActionSurgePrompt = state.game.showActionSurgePrompt;
      multiAttackState = state.game.multiAttackState;
      pendingMoveAttack = state.game.pendingMoveAttack;
      pendingMoveAfterAttack = state.game.pendingMoveAfterAttack;
      pendingHeroPlacement = state.game.pendingHeroPlacement;
      drawnTreasure = state.game.drawnTreasure;
      heroInventories = state.game.heroInventories;
      incrementalMovement = state.game.incrementalMovement;
      undoSnapshot = state.game.undoSnapshot;
      pendingMonsterChoice = state.game.pendingMonsterChoice;
      selectedTargetId = state.game.selectedTargetId;
      selectedTargetType = state.game.selectedTargetType;
      showScenarioIntroduction = state.game.showScenarioIntroduction;
      trapDisableResult = state.game.trapDisableResult;
      
      // Force Svelte to process pending updates
      tick();
    });

    // Initialize state immediately
    const state = store.getState();
    heroTokens = state.game.heroTokens;
    selectedHeroes = state.heroes.selectedHeroes;
    heroEdgeMap = state.heroes.heroEdgeMap;
    heroSidePreferences = state.heroes.heroSidePreferences;
    turnState = state.game.turnState;
    validMoveSquares = state.game.validMoveSquares;
    showingMovement = state.game.showingMovement;
    dungeon = state.game.dungeon;
    monsters = state.game.monsters;
    recentlySpawnedMonsterId = state.game.recentlySpawnedMonsterId;
    attackResult = state.game.attackResult;
    attackTargetId = state.game.attackTargetId;
    heroHp = state.game.heroHp;
    monsterAttackResult = state.game.monsterAttackResult;
    monsterAttackTargetId = state.game.monsterAttackTargetId;
    monsterAttackerId = state.game.monsterAttackerId;
    villainPhaseMonsterIndex = state.game.villainPhaseMonsterIndex;
    monsterMoveActionId = state.game.monsterMoveActionId;
    heroTurnActions = state.game.heroTurnActions;
    scenario = state.game.scenario;
    partyResources = state.game.partyResources;
    defeatedMonsterXp = state.game.defeatedMonsterXp;
    defeatedMonsterName = state.game.defeatedMonsterName;
    leveledUpHeroId = state.game.leveledUpHeroId;
    levelUpOldStats = state.game.levelUpOldStats;
    healingSurgeUsedHeroId = state.game.healingSurgeUsedHeroId;
    healingSurgeHpRestored = state.game.healingSurgeHpRestored;
    encounterEffectMessage = state.game.encounterEffectMessage;
    explorationPhaseMessage = state.game.explorationPhaseMessage;
    explorationPhase = state.game.explorationPhase;
    recentlyPlacedTileId = state.game.recentlyPlacedTileId;
    pendingMonsterDisplayId = state.game.pendingMonsterDisplayId;
    poisonedDamageNotification = state.game.poisonedDamageNotification;
    poisonRecoveryNotification = state.game.poisonRecoveryNotification;
    heroPowerCards = state.heroes.heroPowerCards;
    attackName = state.game.attackName;
    drawnEncounter = state.game.drawnEncounter;
    encounterResult = state.game.encounterResult;
    activeEnvironmentId = state.game.activeEnvironmentId;
    traps = state.game.traps;
    hazards = state.game.hazards;
    treasureTokens = state.game.treasureTokens;
    boardTokens = state.game.boardTokens;
    showActionSurgePrompt = state.game.showActionSurgePrompt;
    multiAttackState = state.game.multiAttackState;
    pendingMoveAttack = state.game.pendingMoveAttack;
    pendingMoveAfterAttack = state.game.pendingMoveAfterAttack;
    pendingHeroPlacement = state.game.pendingHeroPlacement;
    drawnTreasure = state.game.drawnTreasure;
    heroInventories = state.game.heroInventories;
    incrementalMovement = state.game.incrementalMovement;
    undoSnapshot = state.game.undoSnapshot;
    pendingMonsterChoice = state.game.pendingMonsterChoice;
    selectedTargetId = state.game.selectedTargetId;
    selectedTargetType = state.game.selectedTargetType;
    showScenarioIntroduction = state.game.showScenarioIntroduction;
    trapDisableResult = state.game.trapDisableResult;

    return unsubscribe;
  });

  // Create a derived game state object for power card eligibility checking
  // This consolidates the necessary state properties for determining if power cards can be activated
  let gameState = $derived.by(() => {
    return {
      heroTokens,
      turnState,
      heroHp,
      heroTurnActions,
      dungeon,
      monsters,
    } as {
      heroTokens: typeof heroTokens;
      turnState: typeof turnState;
      heroHp: typeof heroHp;
      heroTurnActions: typeof heroTurnActions;
      dungeon: typeof dungeon;
      monsters: typeof monsters;
    };
  });

  // Get valid placement squares when hero placement is pending
  let validPlacementSquares = $derived.by(() => {
    if (!pendingHeroPlacement) return [];
    
    // Get all squares on the tile where hero is being placed
    const squares = getTileSquares(pendingHeroPlacement.tileId, dungeon);
    return squares;
  });

  // Auto-advance hero phase when valid action sequence is complete
  // Turn ends when: move+attack, attack+move, or move+move
  // However, if the hero phase ends with an attack, we must wait for the
  // attack result card to be dismissed before transitioning to exploration phase
  $effect(() => {
    if (turnState.currentPhase !== "hero-phase") return;
    
    // Don't auto-end if there's an attack result being displayed
    // This prevents the exploration phase from starting while the player
    // is still reviewing the attack result
    if (attackResult !== null) return;
    
    if (shouldAutoEndHeroTurn(heroTurnActions)) {
      store.dispatch(endHeroPhase());
    }
  });

  // Auto-end exploration phase when both steps are complete or phase is skipped
  $effect(() => {
    if (turnState.currentPhase !== "exploration-phase") return;
    if (explorationPhase.step !== 'complete' && explorationPhase.step !== 'skipped') return;
    
    // Wait a brief moment for the user to see the completion/skip state
    const timer = setTimeout(() => {
      store.dispatch(endExplorationPhase());
    }, explorationPhase.step === 'skipped' ? 1500 : 500); // Longer delay for skipped message
    
    return () => clearTimeout(timer);
  });

  // Auto-show movement options when hero phase starts and hero can move
  $effect(() => {
    if (turnState.currentPhase !== "hero-phase") return;
    if (!heroTurnActions.canMove) return;
    if (showingMovement) return; // Already showing
    
    const currentHeroId = getCurrentHeroId();
    if (!currentHeroId) return;
    
    const currentHero = getHeroInfo(currentHeroId);
    if (!currentHero) return;
    
    // Auto-show movement options for the current hero (including item speed bonuses)
    store.dispatch(
      showMovement({ heroId: currentHeroId, speed: getTotalSpeed(currentHeroId) }),
    );
  });

  // Sequence tile and monster animations: show monster card after tile fade-in completes
  // When a tile is placed, the monster spawns immediately but the card display is delayed
  // This creates a sequential animation: tile fades in (2s), exploration message completes (3s), pause (1s), then monster card shows
  $effect(() => {
    if (!pendingMonsterDisplayId) return;
    
    // Wait 4 seconds: 3s for exploration message (1s visible + 2s fade) + 1s pause before showing monster
    const timer = setTimeout(() => {
      store.dispatch(showPendingMonster());
    }, 4000);
    
    return () => clearTimeout(timer);
  });

  // Auto-activate monsters during villain phase
  // This effect triggers when:
  // 1. Entering villain phase (to start the first monster)
  // 2. After dismissing a monster action result (attack or move)
  $effect(() => {
    if (turnState.currentPhase !== "villain-phase") return;
    
    // Don't auto-activate if there's an action result being displayed
    if (monsterAttackResult !== null || monsterMoveActionId !== null) return;
    
    // Don't auto-end if there's an encounter card being displayed
    if (drawnEncounter !== null) return;
    
    const controlledMonsters = getControlledMonsters();
    
    // Check if all monsters have been activated
    if (villainPhaseMonsterIndex >= controlledMonsters.length) {
      // All monsters activated, auto-end villain phase
      store.dispatch(endVillainPhase());
      return;
    }
    
    // Auto-activate the next monster
    store.dispatch(activateNextMonster({}));
  });

  // Calculate the bounds of all placed tiles (pure function for use with $derived)
  // Returns the total map dimensions accounting for tile overlap.
  //
  // OVERLAP CALCULATION:
  // - Tiles are positioned at grid-width intervals (560px) but images are larger (632px)
  // - First tile contributes its full image width (632px)
  // - Each additional tile only adds grid width (560px) because it overlaps the previous
  // - Example: 2 tiles = 632 + 560 = 1192px (not 632*2=1264px)
  function getMapBoundsFromDungeon(d: DungeonState): {
    minCol: number;
    maxCol: number;
    minRow: number;
    maxRow: number;
    width: number;
    height: number;
  } {
    if (d.tiles.length === 0) {
      return {
        minCol: 0,
        maxCol: 0,
        minRow: 0,
        maxRow: 0,
        width: TILE_IMAGE_WIDTH,
        height: START_TILE_IMAGE_HEIGHT,
      };
    }

    let minCol = Infinity,
      maxCol = -Infinity;
    let minRow = Infinity,
      maxRow = -Infinity;

    for (const tile of d.tiles) {
      minCol = Math.min(minCol, tile.position.col);
      maxCol = Math.max(maxCol, tile.position.col);
      minRow = Math.min(minRow, tile.position.row);
      maxRow = Math.max(maxRow, tile.position.row);
    }

    // Width: first tile full image + remaining tiles add grid width (due to overlap)
    const numCols = maxCol - minCol + 1;
    const width = TILE_IMAGE_WIDTH + (numCols - 1) * TILE_WIDTH;

    // Height: similar calculation but accounting for start tile's double height
    const northTileCount = Math.max(0, -minRow);
    const southTileCount = Math.max(0, maxRow);
    // Start tile image + adjacent tiles add grid height (due to overlap)
    const height =
      START_TILE_IMAGE_HEIGHT +
      northTileCount * NORMAL_TILE_HEIGHT +
      southTileCount * NORMAL_TILE_HEIGHT;

    return {
      minCol,
      maxCol,
      minRow,
      maxRow,
      width: Math.max(width, TILE_IMAGE_WIDTH),
      height: Math.max(height, START_TILE_IMAGE_HEIGHT),
    };
  }

  // Get pixel position for a tile based on its grid position
  // Tiles are positioned so their playable grids align, with overlapping connectors.
  //
  // HOW OVERLAP WORKS:
  // - Tile images are 632px wide/tall but the playable grid is only 560px
  // - The extra 72px (36px per side) is the border/connector area
  // - By positioning tiles at TILE_WIDTH (560px) intervals while rendering 632px images,
  //   adjacent tiles automatically overlap by 72px (632-560), creating the interlocking effect
  // - Example: Tile 1 at x=0 spans 0-632, Tile 2 at x=560 spans 560-1192
  //   This creates a 72px overlap zone (560-632) where connectors interlock
  //
  // VERTICAL ADJUSTMENT:
  // - Start tile has asymmetric vertical borders (38px north, 37px south vs 36px for normal tiles)
  // - North tiles need 2px adjustment, south tiles need 1px adjustment
  function getTilePixelPosition(
    tile: PlacedTile,
    bounds: ReturnType<typeof getMapBoundsFromDungeon>,
  ): { x: number; y: number } {
    // X position: position at grid width intervals to create automatic overlap
    // Since images are wider than grid, this creates the connector overlap
    const x = (tile.position.col - bounds.minCol) * TILE_WIDTH;

    // Y position depends on the row
    // Row layout: [north tiles...] [start tile at row 0] [south tiles...]
    // Same overlap principle applies vertically, with asymmetric adjustment for start tile
    let y = 0;

    if (tile.position.row < 0) {
      // North tiles: positioned above the start tile
      // Each row is spaced by NORMAL_TILE_HEIGHT (grid height, not image height)
      y = (tile.position.row - bounds.minRow) * NORMAL_TILE_HEIGHT;
    } else if (tile.position.row === 0) {
      // Start tile: positioned after all north tiles
      const northTileCount = Math.max(0, -bounds.minRow);
      // Move start tile 2px closer to north tiles to close the gap
      // caused by start tile's 38px north border vs normal tile's 36px border
      y = northTileCount * NORMAL_TILE_HEIGHT - START_TILE_NORTH_OFFSET_DIFF;
    } else {
      // South tiles: positioned after north tiles + start tile
      const northTileCount = Math.max(0, -bounds.minRow);
      
      // Special case: tiles at col=±1, row=1 are adjacent to the start tile's south sub-tile
      // They should align with y: 4-7 (south sub-tile), not be placed below the entire start tile
      if ((tile.position.col === 1 || tile.position.col === -1) && tile.position.row === 1) {
        // Position to align with south sub-tile which starts at y=4 (NORMAL_TILE_HEIGHT in pixels)
        // The south sub-tile occupies y: 4-7, equivalent to the second half of the start tile
        y = northTileCount * NORMAL_TILE_HEIGHT + NORMAL_TILE_HEIGHT;
      } else {
        // Other south tiles: positioned after the full start tile
        // Don't subtract START_TILE_NORTH_OFFSET_DIFF for south tiles.
        // That adjustment is for aligning the start tile with north tiles,
        // but south tiles should align with the start tile's south edge.
        y =
          northTileCount * NORMAL_TILE_HEIGHT +
          START_TILE_HEIGHT +
          (tile.position.row - 1) * NORMAL_TILE_HEIGHT;
      }
    }

    return { x, y };
  }

  // Get the image path for a tile
  function getTileImagePath(tile: PlacedTile): string {
    if (tile.tileType === "start") {
      return "assets/StartTile.png";
    }
    const tileDef = TILE_DEFINITIONS.find((t) => t.tileType === tile.tileType);
    return tileDef?.imagePath || "assets/Tile_Black_x2_01.png";
  }

  // Get tile dimensions (actual image dimensions, not grid dimensions)
  function getTileDimensions(tile: PlacedTile): {
    width: number;
    height: number;
  } {
    if (tile.tileType === "start") {
      return { width: TILE_IMAGE_WIDTH, height: START_TILE_IMAGE_HEIGHT };
    }
    return { width: TILE_IMAGE_WIDTH, height: NORMAL_TILE_IMAGE_HEIGHT };
  }

  // Base scale calculated to fit the map in the available space
  let baseScale: number = $state(1);
  
  // Combined scale = baseScale * manualZoom (computed as derived for efficiency)
  let mapScale = $derived(baseScale * manualZoom);
  
  // Computed pan offset adjusted for current scale (to apply in transform)
  let scaledPanOffset = $derived({
    x: panOffset.x / mapScale,
    y: panOffset.y / mapScale
  });
  
  // Combined map transform style
  let mapTransformStyle = $derived(
    `transform: scale(${mapScale}) translate(${scaledPanOffset.x}px, ${scaledPanOffset.y}px); width: ${mapBounds.width}px; height: ${mapBounds.height}px;`
  );
  
  /**
   * Calculates dynamic padding based on actual rendered panel sizes.
   * Measures player panel overlays and board controls to determine the unobscured space
   * available for map content. Called during map scale calculation and on resize events.
   * 
   * @returns Object with padding values in pixels for each edge (top, right, bottom, left)
   */
  function calculateDynamicPadding(): { top: number; right: number; bottom: number; left: number } {
    // Default padding if panels aren't rendered yet
    const defaultPadding = { top: CONTAINER_PADDING, right: CONTAINER_PADDING, bottom: CONTAINER_PADDING, left: CONTAINER_PADDING };
    
    if (typeof document === 'undefined') return defaultPadding;
    
    const padding = { top: 0, right: 0, bottom: 0, left: 0 };
    
    // Measure player panel overlays
    document.querySelectorAll('.player-panel-overlay').forEach((panel) => {
      const rect = panel.getBoundingClientRect();
      const classList = Array.from(panel.classList);
      
      if (classList.includes('player-panel-top')) {
        padding.top = Math.max(padding.top, rect.bottom + PANEL_GAP_BUFFER);
      } else if (classList.includes('player-panel-bottom')) {
        padding.bottom = Math.max(padding.bottom, window.innerHeight - rect.top + PANEL_GAP_BUFFER);
      } else if (classList.includes('player-panel-left')) {
        padding.left = Math.max(padding.left, rect.right + PANEL_GAP_BUFFER);
      } else if (classList.includes('player-panel-right')) {
        padding.right = Math.max(padding.right, window.innerWidth - rect.left + PANEL_GAP_BUFFER);
      }
    });
    
    // Measure board controls overlay
    const boardControls = document.querySelector('.board-controls');
    if (boardControls) {
      const rect = boardControls.getBoundingClientRect();
      padding.bottom = Math.max(padding.bottom, window.innerHeight - rect.top + PANEL_GAP_BUFFER);
      padding.right = Math.max(padding.right, window.innerWidth - rect.left + PANEL_GAP_BUFFER);
    }
    
    // Use default padding if no panels measured (fallback)
    if (padding.top === 0 && padding.right === 0 && padding.bottom === 0 && padding.left === 0) {
      return defaultPadding;
    }
    
    // Add minimum padding to ensure some buffer
    padding.top = Math.max(padding.top, MIN_PANEL_PADDING);
    padding.right = Math.max(padding.right, MIN_PANEL_PADDING);
    padding.bottom = Math.max(padding.bottom, MIN_PANEL_PADDING);
    padding.left = Math.max(padding.left, MIN_PANEL_PADDING);
    
    return padding;
  }
  
  // Calculate base scale to fit the map in the available unobscured space
  $effect(() => {
    if (boardContainerRef) {
      const calculateBaseScale = () => {
        const container = boardContainerRef;
        if (!container) return;

        // Calculate dynamic padding based on panel sizes
        const padding = calculateDynamicPadding();
        
        // Get available space (accounting for dynamic padding)
        const availableWidth = container.clientWidth - padding.left - padding.right;
        const availableHeight = container.clientHeight - padding.top - padding.bottom;

        // Use the derived mapBounds
        const bounds = mapBounds;

        // Calculate scale to fit both dimensions
        const scaleX = availableWidth / bounds.width;
        const scaleY = availableHeight / bounds.height;

        // Use the smaller scale to ensure it fits, capped between MIN and MAX
        const newScale = Math.min(scaleX, scaleY, MAX_SCALE);
        baseScale = Math.max(newScale, MIN_SCALE);
      };

      calculateBaseScale();

      // Recalculate on resize
      const resizeObserver = new ResizeObserver(calculateBaseScale);
      resizeObserver.observe(boardContainerRef);

      return () => resizeObserver.disconnect();
    }
  });

  function getHeroInfo(heroId: string): Hero | undefined {
    return selectedHeroes.find((h) => h.id === heroId);
  }

  function getCurrentHeroId(): string | undefined {
    const currentToken = heroTokens[turnState.currentHeroIndex];
    return currentToken?.heroId;
  }

  function formatPhase(phase: GamePhase): string {
    switch (phase) {
      case "hero-phase":
        return "Hero Phase";
      case "exploration-phase":
        return "Exploration Phase";
      case "villain-phase":
        return "Villain Phase";
    }
  }

  // Get current HP for a hero
  function getHeroCurrentHp(heroId: string): number {
    const hp = heroHp.find((h) => h.heroId === heroId);
    return hp?.currentHp ?? 0;
  }

  // Get max HP for a hero
  function getHeroMaxHp(heroId: string): number {
    const hp = heroHp.find((h) => h.heroId === heroId);
    return hp?.maxHp ?? 0;
  }

  // Get hero level (1 or 2)
  function getHeroLevel(heroId: string): number {
    const hp = heroHp.find((h) => h.heroId === heroId);
    return hp?.level ?? 1;
  }

  // Get full HeroHpState for a hero
  function getHeroHpState(heroId: string): HeroHpState | undefined {
    return heroHp.find((h) => h.heroId === heroId);
  }

  // Check if current hero is dazed
  function isCurrentHeroDazed(): boolean {
    const currentHeroId = getCurrentHeroId();
    if (!currentHeroId) return false;
    const heroHpState = getHeroHpState(currentHeroId);
    return heroHpState?.statuses ? isDazed(heroHpState.statuses) : false;
  }

  // Helper to check if a hero has the cage curse
  function hasHeroCageCurse(heroId: string): boolean {
    const heroHpState = getHeroHpState(heroId);
    return heroHpState?.statuses?.some(s => s.type === 'curse-cage') ?? false;
  }

  // Check if there's a caged hero on the same tile as current hero
  function getCagedHeroOnSameTile(): string | null {
    const currentHeroId = getCurrentHeroId();
    if (!currentHeroId) return null;
    
    const currentToken = heroTokens.find(t => t.heroId === currentHeroId);
    if (!currentToken) return null;
    
    // Check if current hero is caged (can escape themselves)
    if (hasHeroCageCurse(currentHeroId)) {
      return currentHeroId;
    }
    
    // Find other heroes on the same tile with cage curse
    for (const token of heroTokens) {
      if (token.heroId === currentHeroId) continue; // Skip self
      
      if (hasHeroCageCurse(token.heroId) && areOnSameTile(currentToken.position, token.position, dungeon)) {
        return token.heroId;
      }
    }
    
    return null;
  }
  
  // Helper to check if the current hero is caged
  function isCurrentHeroCaged(): boolean {
    const currentHeroId = getCurrentHeroId();
    if (!currentHeroId) return false;
    return hasHeroCageCurse(currentHeroId);
  }
  
  // Handle cage escape attempt
  function handleAttemptCageEscape() {
    const cagedHeroId = getCagedHeroOnSameTile();
    if (!cagedHeroId) return;
    
    const rescuerHeroId = getCurrentHeroId();
    if (!rescuerHeroId) return;
    
    store.dispatch(attemptCageEscape({ cagedHeroId, rescuerHeroId }));
  }

  // Get monsters controlled by the current hero
  function getControlledMonsters(): MonsterState[] {
    const currentHeroId = getCurrentHeroId();
    if (!currentHeroId) return [];
    return monsters.filter((m) => m.controllerId === currentHeroId);
  }

  // Get monsters controlled by a specific hero
  function getMonstersForHero(heroId: string): MonsterState[] {
    return monsters.filter((m) => m.controllerId === heroId);
  }

  // Get the currently activating monster during villain phase (memoized)
  let activatingMonsterId = $derived.by(() => {
    if (turnState.currentPhase !== 'villain-phase') return null;
    const currentHeroId = getCurrentHeroId();
    if (!currentHeroId) return null;
    
    const controlledMonsters = getMonstersForHero(currentHeroId);
    if (villainPhaseMonsterIndex >= controlledMonsters.length) return null;
    
    return controlledMonsters[villainPhaseMonsterIndex]?.instanceId ?? null;
  });

  // Check if all controlled monsters have been activated
  function allMonstersActivated(): boolean {
    const controlled = getControlledMonsters();
    return villainPhaseMonsterIndex >= controlled.length;
  }

  function handleReset() {
    store.dispatch(resetGame());
  }

  // Calculate pixel position from grid position relative to a tile
  function getTokenStyle(position: { x: number; y: number }): string {
    const cellCenterOffset = TILE_CELL_SIZE / 2;
    return `left: ${TOKEN_OFFSET_X + position.x * TILE_CELL_SIZE + cellCenterOffset}px; top: ${TOKEN_OFFSET_Y + position.y * TILE_CELL_SIZE + cellCenterOffset}px;`;
  }

  // Calculate full hero token style including tile offset
  function getHeroTokenStyle(
    tokenPosition: { x: number; y: number },
    tileOffset: { x: number; y: number },
  ): string {
    const cellCenterOffset = TILE_CELL_SIZE / 2;
    const absoluteLeft =
      tileOffset.x +
      TOKEN_OFFSET_X +
      tokenPosition.x * TILE_CELL_SIZE +
      cellCenterOffset;
    const absoluteTop =
      tileOffset.y +
      TOKEN_OFFSET_Y +
      tokenPosition.y * TILE_CELL_SIZE +
      cellCenterOffset;
    return `left: ${absoluteLeft}px; top: ${absoluteTop}px;`;
  }

  // Get the edge for the active player based on the edge they selected their hero from.
  // Falls back to cycling through edges based on player index if no edge is recorded.
  function getActivePlayerEdge(): string {
    const currentHeroId = getCurrentHeroId();
    if (currentHeroId && heroEdgeMap[currentHeroId]) {
      return heroEdgeMap[currentHeroId];
    }
    // Fallback: cycle through edges based on player index (legacy behavior)
    const edgeIndex = turnState.currentHeroIndex % 4;
    const edges = ["bottom", "right", "top", "left"];
    return edges[edgeIndex];
  }

  // Check if a specific hero is the current active hero
  function isActiveHero(heroId: string): boolean {
    return getCurrentHeroId() === heroId;
  }

  // Get the rotation angle for a hero token based on the edge they were selected from.
  // This makes the token face the player who controls it.
  function getHeroTokenRotation(heroId: string): number {
    const edge = heroEdgeMap[heroId];
    if (!edge) return 0;
    
    switch (edge) {
      case "bottom":
        return 0;
      case "top":
        return 180;
      case "left":
        return 90;
      case "right":
        return -90;
      default:
        return 0;
    }
  }

  // Convert edge position to dialog rotation (0, 90, 180, 270)
  // Used for dialog components that need to face the current player
  function getDialogRotationFromEdge(edge: string): 0 | 90 | 180 | 270 {
    switch (edge) {
      case "bottom":
        return 0;
      case "left":
        return 90;
      case "top":
        return 180;
      case "right":
        return 270;
      default:
        return 0;
    }
  }

  // Handle tile click to show movement options
  function handleTileClick(event: MouseEvent) {
    // Only respond to clicks during hero phase
    if (turnState.currentPhase !== "hero-phase") {
      return;
    }

    const currentHeroId = getCurrentHeroId();
    if (!currentHeroId) return;

    const currentHero = getHeroInfo(currentHeroId);
    if (!currentHero) return;

    // If movement is already showing, hide it (toggle behavior)
    if (showingMovement) {
      store.dispatch(hideMovement());
    } else {
      // Show movement options for the current hero (including item speed bonuses)
      store.dispatch(
        showMovement({ heroId: currentHeroId, speed: getTotalSpeed(currentHeroId) }),
      );
    }
  }

  // Handle click on a valid movement square
  function handleMoveSquareClick(position: Position) {
    // When in move-after-attack mode, move the selected hero instead of current hero
    let heroId: string;
    if (pendingMoveAfterAttack?.selectedHeroId) {
      heroId = pendingMoveAfterAttack.selectedHeroId;
    } else {
      heroId = getCurrentHeroId();
      if (!heroId) return;
    }

    const hero = getHeroInfo(heroId);
    if (!hero) return;

    // Use total speed including item bonuses
    store.dispatch(moveHero({ heroId, position, speed: getTotalSpeed(heroId) }));
    
    // Note: For charging movement, we keep the movement overlay visible
    // so the player can continue moving. The overlay will remain until:
    // 1. Player attacks a monster, or
    // 2. Player cancels the charge, or
    // 3. Player runs out of movement points
  }

  // Handle completing the current move action early
  function handleCompleteMove() {
    store.dispatch(completeMove());
  }

  // Handle undoing the last reversible action
  function handleUndo() {
    store.dispatch(undoAction());
  }

  // Handle keyboard events for accessibility
  function handleTileKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleTileClick(event as unknown as MouseEvent);
    }
  }

  // Get unexplored edges for the start tile
  function getStartTileUnexploredEdges(): TileEdge[] {
    return dungeon.unexploredEdges.filter((e) => e.tileId === "start-tile");
  }

  // Handle end phase button click
  function handleEndPhase() {
    switch (turnState.currentPhase) {
      case "hero-phase":
        // Don't end hero phase if attack result is still displayed
        // The player should dismiss the attack result first
        if (attackResult !== null) {
          return;
        }
        
        // Check if current hero is poisoned and attempt recovery before ending phase
        const currentHeroId = heroTokens[turnState.currentHeroIndex]?.heroId;
        if (currentHeroId) {
          const heroHpState = heroHp.find(h => h.heroId === currentHeroId);
          if (heroHpState?.statuses?.some(s => s.type === 'poisoned')) {
            // Attempt poison recovery - this will show notification
            store.dispatch(attemptPoisonRecovery());
            // Note: Phase will end when player dismisses the recovery notification
            // Don't call endHeroPhase here yet
            return;
          }
        }
        
        store.dispatch(endHeroPhase());
        break;
      case "exploration-phase":
        store.dispatch(endExplorationPhase());
        break;
      case "villain-phase":
        store.dispatch(endVillainPhase());
        break;
    }
  }

  // Handle placing exploration tile
  function handlePlaceTile() {
    store.dispatch(placeExplorationTile());
  }

  // Handle adding exploration monster
  function handleAddMonster() {
    store.dispatch(addExplorationMonster());
  }

  // Get button text based on current phase
  function getEndPhaseButtonText(): string {
    switch (turnState.currentPhase) {
      case "hero-phase":
        return "End Hero Phase";
      case "exploration-phase":
        return "End Exploration";
      case "villain-phase":
        return "End Villain Phase";
    }
  }

  // Handle dismissing the monster card
  function handleDismissMonsterCard() {
    store.dispatch(dismissMonsterCard());
  }

  // Handle dismissing the scenario introduction modal
  function handleDismissScenarioIntroduction() {
    store.dispatch(dismissScenarioIntroduction());
  }

  // Handle showing the scenario introduction modal (when clicking objective panel)
  function handleShowScenarioIntroduction() {
    store.dispatch(showScenarioIntroductionModal());
  }

  // Get the tile pixel offset for a given tile ID (for positioning tokens on that tile)
  function getTilePixelOffsetById(tileId: string): { x: number; y: number } {
    const tile = dungeon.tiles.find((t) => t.id === tileId);
    if (!tile) {
      return { x: 0, y: 0 };
    }
    return getTilePixelPosition(tile, mapBounds);
  }

  // Default tile ID for heroes (start tile) - fallback when position can't be determined
  const DEFAULT_HERO_TILE_ID = "start-tile";

  // Get the current hero's tile ID (for adjacency checks)
  // Dynamically determines which tile the hero is on based on position
  function getCurrentHeroTileId(): string {
    const currentHeroId = getCurrentHeroId();
    if (!currentHeroId) return DEFAULT_HERO_TILE_ID;

    const currentToken = heroTokens.find((t) => t.heroId === currentHeroId);
    if (!currentToken) return DEFAULT_HERO_TILE_ID;

    // Find which tile the hero is on based on their position
    const tile = findTileAtPosition(currentToken.position, dungeon);
    return tile?.id ?? DEFAULT_HERO_TILE_ID;
  }

  // Get monsters adjacent to the current hero
  function getAdjacentMonstersForCurrentHero(): MonsterState[] {
    const currentHeroId = getCurrentHeroId();
    if (!currentHeroId) return [];

    const currentToken = heroTokens.find((t) => t.heroId === currentHeroId);
    if (!currentToken) return [];

    const tileId = getCurrentHeroTileId();
    return getAdjacentMonsters(currentToken.position, monsters, tileId, dungeon);
  }

  // Get all monsters that can be targeted by available power cards
  // This includes adjacent monsters and monsters within range of ranged power cards
  // For movement-before-attack cards (like Charge), includes monsters within movement+attack range
  function getTargetableMonstersForCurrentHero(): MonsterState[] {
    const currentHeroId = getCurrentHeroId();
    if (!currentHeroId) return [];

    const currentToken = heroTokens.find((t) => t.heroId === currentHeroId);
    if (!currentToken) return [];

    const currentHeroPowerCards = heroPowerCards[currentHeroId];
    if (!currentHeroPowerCards) return [];

    // Get the maximum range from all available (unflipped) power cards
    let maxRange = 0;
    let hasOnTileAttack = false;
    let hasMovementBeforeAttackCard = false;
    let hasNonMovementAttackCard = false;
    let heroSpeed = getTotalSpeed(currentHeroId);
    
    for (const cardState of currentHeroPowerCards.cardStates) {
      if (cardState.isFlipped) continue; // Skip used cards
      
      const card = getPowerCardById(cardState.cardId);
      if (!card || card.attackBonus === undefined) continue;
      
      const parsed = parseActionCard(card);
      
      // Check if this is a movement-before-attack card
      if (requiresMovementFirst(parsed)) {
        hasMovementBeforeAttackCard = true;
      } else if (parsed.attack) {
        // This is a regular attack card (not movement-before-attack)
        hasNonMovementAttackCard = true;
      }
      
      if (parsed.attack) {
        if (parsed.attack.targetType === 'tile') {
          hasOnTileAttack = true;
        } else if (parsed.attack.targetType === 'within-tiles') {
          maxRange = Math.max(maxRange, parsed.attack.range);
        } else {
          // Adjacent/melee attacks (range 0)
          maxRange = Math.max(maxRange, 0);
        }
      }
    }

    // If there's an "on your tile" attack available, include all monsters on the same tile
    if (hasOnTileAttack) {
      return getMonstersOnSameTile(currentToken.position, monsters, dungeon);
    }

    // For movement-before-attack cards ONLY (when no adjacent monsters for regular attacks)
    // show monsters within movement+attack range
    if (hasMovementBeforeAttackCard && heroTurnActions.canMove) {
      // Calculate monsters within movement range (hero can move, then attack adjacent)
      // For simplicity, use Manhattan distance: movement squares + 1 for adjacent attack
      const movementPlusAttackRange = heroSpeed + 1;
      const reachableMonsters: MonsterState[] = [];
      
      for (const monster of monsters) {
        const monsterGlobalPos = getMonsterGlobalPosition(monster, dungeon);
        if (!monsterGlobalPos) continue;
        
        // Calculate Manhattan distance
        const distance = Math.abs(currentToken.position.x - monsterGlobalPos.x) + 
                        Math.abs(currentToken.position.y - monsterGlobalPos.y);
        
        if (distance <= movementPlusAttackRange) {
          reachableMonsters.push(monster);
        }
      }
      
      // If we found reachable monsters via movement, return them
      // But ONLY if there are no adjacent monsters for regular attacks
      if (reachableMonsters.length > 0) {
        // Check if any monsters are actually adjacent (for regular attack cards)
        const tileId = getCurrentHeroTileId();
        const adjacentMonsters = getAdjacentMonsters(currentToken.position, monsters, tileId, dungeon);
        
        // If there are adjacent monsters AND we have regular attack cards, show only adjacent
        // Otherwise show the reachable monsters for movement-before-attack cards
        if (adjacentMonsters.length > 0 && hasNonMovementAttackCard) {
          return adjacentMonsters;
        }
        
        // No adjacent monsters, show reachable monsters for Charge
        return reachableMonsters;
      }
      
      // No monsters within movement range, check if there are any adjacent for regular attacks
      // If no adjacent either, return empty (no attack panel)
      if (!hasNonMovementAttackCard) {
        return [];
      }
      // If we have non-movement attack cards, fall through to check for adjacent/ranged monsters
    }

    // Instead of returning all monsters within max range, return only monsters
    // that can be targeted by at least one available attack card.
    // This prevents cards like "Righteous Advance" (adjacent only) from being
    // shown as available when the only monsters are within ranged attack range
    // but not adjacent.
    const targetableMonsters: MonsterState[] = [];
    
    for (const monster of monsters) {
      const monsterGlobalPos = getMonsterGlobalPosition(monster, dungeon);
      if (!monsterGlobalPos) continue;
      
      // Check if this monster can be targeted by at least one attack card
      let canBeTargeted = false;
      
      for (const cardState of currentHeroPowerCards.cardStates) {
        if (cardState.isFlipped) continue;
        
        const card = getPowerCardById(cardState.cardId);
        if (!card || card.attackBonus === undefined) continue;
        
        const parsed = parseActionCard(card);
        if (!parsed.attack) continue;
        
        // Skip movement-before-attack cards (they're handled separately above)
        if (requiresMovementFirst(parsed)) continue;
        
        // Check if this card can target this monster
        let cardCanTarget = false;
        
        switch (parsed.attack.targetType) {
          case 'adjacent':
            cardCanTarget = arePositionsAdjacent(currentToken.position, monsterGlobalPos);
            break;
          case 'tile':
            const heroTile = findTileAtPosition(currentToken.position, dungeon);
            cardCanTarget = heroTile !== null && monster.tileId === heroTile.id;
            break;
          case 'within-tiles':
            cardCanTarget = isWithinTileRange(currentToken.position, monsterGlobalPos, parsed.attack.range);
            break;
          default:
            // Default to adjacent
            cardCanTarget = arePositionsAdjacent(currentToken.position, monsterGlobalPos);
        }
        
        if (cardCanTarget) {
          canBeTargeted = true;
          break; // No need to check other cards for this monster
        }
      }
      
      if (canBeTargeted) {
        targetableMonsters.push(monster);
      }
    }
    
    return targetableMonsters;
  }

  // Get the full hero object from AVAILABLE_HEROES by ID
  function getFullHeroInfo(heroId: string): Hero | undefined {
    return AVAILABLE_HEROES.find((h) => h.id === heroId);
  }

  // Calculate total speed for a hero including item bonuses
  function getTotalSpeed(heroId: string): number {
    const hero = getHeroInfo(heroId);
    if (!hero) return 0;
    
    return calculateTotalSpeed(hero.speed, heroInventories[heroId]);
  }

  // Default damage for power cards without explicit damage value
  const DEFAULT_POWER_CARD_DAMAGE = 1;

  // Helper function to determine if a daily power card should be flipped
  function shouldFlipDailyCard(powerCard: PowerCard, parsedAction: any, attackResult: any): boolean {
    // At-Will powers should NEVER be flipped - they can be used repeatedly
    if (powerCard.type === 'at-will') return false;
    
    // Utility powers should NEVER be flipped when used as attacks
    // (they may be flipped when activated as utility powers via handleActivatePowerCard)
    if (powerCard.type === 'utility') return false;
    
    // At this point, we know it's a daily power
    // Check if this card has special miss behavior (don't flip on miss)
    const hasMissNoFlip = parsedAction.missEffects?.some((effect: any) => effect.type === 'no-flip');
    
    // Flip the card if attack hit, or if it missed but card doesn't have no-flip behavior
    return attackResult.isHit || !hasMissNoFlip;
  }

  // Handle attack action using a power card
  function handleAttackWithCard(cardId: number, targetInstanceId: string) {
    const currentHeroId = getCurrentHeroId();
    if (!currentHeroId) return;

    const powerCard = getPowerCardById(cardId);
    if (!powerCard || powerCard.attackBonus === undefined) return;

    const monster = monsters.find((m) => m.instanceId === targetInstanceId);
    if (!monster) return;

    // Parse the card once to avoid redundant parsing
    const parsedAction = parseActionCard(powerCard);
    const isAreaAttack = parsedAction.attack?.maxTargets === -1;
    
    // Check if this is a multi-attack card AND we're not already in a multi-attack
    const isMultiHitAttack = parsedAction.attack && parsedAction.attack.attackCount > 1;
    if (isMultiHitAttack && !multiAttackState) {
      // Start the multi-attack sequence for multi-hit attacks (e.g., Tornado Strike)
      store.dispatch(startMultiAttack({ 
        cardId, 
        totalAttacks: parsedAction.attack.attackCount, 
        sameTarget: parsedAction.attack.sameTarget, 
        maxTargets: parsedAction.attack.maxTargets,
        targetInstanceId: parsedAction.attack.sameTarget ? targetInstanceId : undefined 
      }));
    }
    
    // For area attacks, find all monsters on the same tile
    const targetsToAttack = isAreaAttack 
      ? monsters.filter(m => m.tileId === monster.tileId)
      : [monster];
    
    // If this is an area attack, start a multi-attack sequence
    if (isAreaAttack && targetsToAttack.length > 1) {
      store.dispatch(startMultiAttack({ 
        cardId, 
        totalAttacks: targetsToAttack.length, 
        sameTarget: false, 
        maxTargets: -1,
        targetInstanceId: undefined 
      }));
    }
    
    // Attack the first target immediately
    const firstTarget = targetsToAttack[0];
    const monsterAC = getMonsterAC(firstTarget.monsterId);
    if (monsterAC === undefined) return;

    // Create base attack from power card
    const baseAttack = {
      name: powerCard.name,
      attackBonus: powerCard.attackBonus,
      damage: powerCard.damage ?? DEFAULT_POWER_CARD_DAMAGE,
      range: 1,
    };

    // Apply item bonuses from hero's inventory
    const attackWithBonuses = applyItemBonusesToAttack(baseAttack, heroInventories[currentHeroId]);

    // Apply curse modifiers (e.g., Terrifying Roar -4 attack)
    const heroHpState = heroHp.find(h => h.heroId === currentHeroId);
    const finalAttackBonus = getModifiedAttackBonusWithCurses(
      heroHpState?.statuses ?? [],
      attackWithBonuses.attackBonus
    );
    
    const finalAttack = {
      ...attackWithBonuses,
      attackBonus: finalAttackBonus,
    };

    const result = resolveAttack(finalAttack, monsterAC);
    store.dispatch(setAttackResult({ result, targetInstanceId: firstTarget.instanceId, attackName: powerCard.name, cardId }));
    
    // If this was a charge attack, clear the move-attack state and hide movement
    if (pendingMoveAttack && pendingMoveAttack.cardId === cardId) {
      store.dispatch(clearMoveAttack());
      store.dispatch(hideMovement());
    }
    
    // Flip the power card only if it's a daily power (at-wills and utilities should NEVER be flipped)
    // For area attacks, don't flip yet - wait until all targets are attacked
    // For multi-attacks in progress, don't flip yet - wait until last attack completes
    const isMultiAttackInProgress = multiAttackState && multiAttackState.attacksCompleted > 0;
    if (!isMultiAttackInProgress && !isAreaAttack) {
      if (shouldFlipDailyCard(powerCard, parsedAction, result)) {
        store.dispatch(usePowerCard({ heroId: currentHeroId, cardId }));
      }
    }
    
    // For area attacks, store remaining targets to attack after dismissing first result
    if (isAreaAttack && targetsToAttack.length > 1) {
      // Store remaining targets in a variable accessible by handleDismissAttackResult
      pendingAreaAttackTargets = targetsToAttack.slice(1);
    }
  }

  // Handle dismissing the attack result - also handles multi-attack progression
  function handleDismissAttackResult() {
    // First dismiss the current attack result
    store.dispatch(dismissAttackResult());
    
    // Check if there are pending area attack targets to process
    if (pendingAreaAttackTargets.length > 0 && multiAttackState) {
      const nextTarget = pendingAreaAttackTargets[0];
      pendingAreaAttackTargets = pendingAreaAttackTargets.slice(1);
      
      // Get the power card and current hero
      const currentHeroId = getCurrentHeroId();
      if (!currentHeroId) return;
      
      const powerCard = getPowerCardById(multiAttackState.cardId);
      if (!powerCard || powerCard.attackBonus === undefined) return;
      
      const monsterAC = getMonsterAC(nextTarget.monsterId);
      if (monsterAC === undefined) return;
      
      // Create base attack from power card
      const baseAttack = {
        name: powerCard.name,
        attackBonus: powerCard.attackBonus,
        damage: powerCard.damage ?? DEFAULT_POWER_CARD_DAMAGE,
        range: 1,
      };
      
      // Apply item bonuses
      const attackWithBonuses = applyItemBonusesToAttack(baseAttack, heroInventories[currentHeroId]);
      
      // Resolve attack
      const result = resolveAttack(attackWithBonuses, monsterAC);
      store.dispatch(setAttackResult({ 
        result, 
        targetInstanceId: nextTarget.instanceId, 
        attackName: powerCard.name, 
        cardId: multiAttackState.cardId 
      }));
      
      // Record the attack in the multi-attack sequence
      store.dispatch(recordMultiAttackHit());
      
      // If this was the last target, flip the card if it's a daily
      if (pendingAreaAttackTargets.length === 0) {
        const parsedAction = parseActionCard(powerCard);
        if (shouldFlipDailyCard(powerCard, parsedAction, result)) {
          store.dispatch(usePowerCard({ heroId: currentHeroId, cardId: multiAttackState.cardId }));
        }
      }
      
      return; // Don't run the normal dismiss logic below
    }
    
    // Check if we're in a multi-attack sequence
    if (multiAttackState) {
      // Save values we need before dispatching (dispatching may clear multiAttackState)
      const targetStillAlive = monsters.some(m => m.instanceId === attackTargetId);
      const wasSameTarget = multiAttackState.sameTarget;
      
      // Record the attack hit
      store.dispatch(recordMultiAttackHit());
      
      // If target died and this was a same-target attack, clear the multi-attack and deselect the target
      if (!targetStillAlive && wasSameTarget) {
        store.dispatch(clearMultiAttack());
        // Deselect the target since it's been defeated
        store.dispatch(deselectTarget());
      }
    } else {
      // Single attack completed, deselect the target
      store.dispatch(deselectTarget());
    }
  }

  // Handle starting a multi-attack sequence
  function handleStartMultiAttack(
    cardId: number, 
    totalAttacks: number, 
    sameTarget: boolean, 
    maxTargets: number, 
    targetInstanceId?: string
  ) {
    store.dispatch(startMultiAttack({ cardId, totalAttacks, sameTarget, maxTargets, targetInstanceId }));
  }

  // Handle canceling a multi-attack sequence
  function handleCancelMultiAttack() {
    store.dispatch(clearMultiAttack());
  }

  // Handle starting a move-then-attack sequence
  function handleStartMoveAttack(cardId: number) {
    // Start the move-attack sequence
    store.dispatch(startMoveAttack({ cardId }));
    
    // Show movement UI so player can move
    const currentHeroId = getCurrentHeroId();
    if (currentHeroId) {
      store.dispatch(
        showMovement({ heroId: currentHeroId, speed: getTotalSpeed(currentHeroId) })
      );
    }
  }

  // Handle canceling a move-then-attack sequence
  function handleCancelMoveAttack() {
    store.dispatch(cancelMoveAttack());
  }
  
  // Handle completing a move-after-attack sequence
  function handleCompleteMoveAfterAttack() {
    store.dispatch(completeMoveAfterAttack());
  }

  // Handle canceling a move-after-attack sequence (skip movement portion)
  function handleCancelMoveAfterAttack() {
    store.dispatch(cancelMoveAfterAttack());
  }

  // Handle selecting a hero for move-after-attack
  function handleSelectHeroForMoveAfterAttack(heroId: string) {
    store.dispatch(selectHeroForMoveAfterAttack(heroId));
  }

  // Handle dismissing the trap disable result
  function handleDismissTrapDisableResult() {
    store.dispatch(dismissTrapDisableResult());
  }

  // Get monster name from instance
  function getMonsterName(monsterId: string): string {
    const monster = MONSTERS.find((m) => m.id === monsterId);
    return monster?.name || "Monster";
  }

  // Get attack target monster info for display
  function getAttackTargetMonster(): MonsterState | undefined {
    if (!attackTargetId) return undefined;
    return monsters.find((m) => m.instanceId === attackTargetId);
  }

  // Handle activating the next monster in villain phase
  function handleActivateMonster() {
    store.dispatch(activateNextMonster({}));
  }

  // Handle dismissing the monster attack result
  function handleDismissMonsterAttackResult() {
    store.dispatch(dismissMonsterAttackResult());
  }

  // Handle dismissing the monster move action display
  function handleDismissMonsterMoveAction() {
    store.dispatch(dismissMonsterMoveAction());
  }

  // Get the hero name for monster attack target
  function getMonsterAttackTargetName(): string {
    if (!monsterAttackTargetId) return "Hero";
    const hero = AVAILABLE_HEROES.find((h) => h.id === monsterAttackTargetId);
    return hero?.name || "Hero";
  }

  // Get the monster name for the attacker
  function getMonsterAttackerName(): string {
    if (!monsterAttackerId) return "Monster";
    const monster = monsters.find((m) => m.instanceId === monsterAttackerId);
    if (!monster) return "Monster";
    return getMonsterName(monster.monsterId);
  }

  // Get the monster name for move action display
  function getMonsterMoveActionName(): string {
    if (!monsterMoveActionId) return "Monster";
    const monster = monsters.find((m) => m.instanceId === monsterMoveActionId);
    if (!monster) return "Monster";
    return getMonsterName(monster.monsterId);
  }

  // Get the edge position for the monster's controlling player.
  // Used to orient monster action dialogs (e.g., move without attack) toward the controller.
  // Returns 'bottom' as fallback if monster or controller not found.
  function getMonsterControllerEdge(): EdgePosition {
    if (!monsterMoveActionId) return "bottom";
    const monster = monsters.find((m) => m.instanceId === monsterMoveActionId);
    if (!monster) return "bottom";
    return heroEdgeMap[monster.controllerId] || "bottom";
  }

  // Handle dismissing the defeat notification
  function handleDismissDefeatNotification() {
    store.dispatch(dismissDefeatNotification());
  }

  // Handle dismissing the level up notification
  function handleDismissLevelUpNotification() {
    store.dispatch(dismissLevelUpNotification());
  }

  // Handle dismissing the healing surge notification
  function handleDismissHealingSurgeNotification() {
    store.dispatch(dismissHealingSurgeNotification());
  }

  // Handle dismissing the encounter effect notification
  function handleDismissEncounterEffectMessage() {
    store.dispatch(dismissEncounterEffectMessage());
  }

  function handleDismissExplorationPhaseMessage() {
    store.dispatch(dismissExplorationPhaseMessage());
  }

  // Handle dismissing the poisoned damage notification
  function handleDismissPoisonedDamageNotification() {
    store.dispatch(dismissPoisonedDamageNotification());
  }

  // Handle dismissing the poison recovery notification
  function handleDismissPoisonRecoveryNotification() {
    store.dispatch(dismissPoisonRecoveryNotification());
    // After recovery notification is dismissed, end the hero phase
    if (turnState.currentPhase === "hero-phase") {
      store.dispatch(endHeroPhase());
    }
  }

  // Handle dismissing the encounter card and applying its effect
  function handleDismissEncounterCard() {
    store.dispatch(dismissEncounterCard());
  }

  // Handle dismissing the encounter result popup
  function handleDismissEncounterResult() {
    store.dispatch(dismissEncounterResult());
  }

  // Handle canceling the encounter card (spend 5 XP to skip the effect)
  function handleCancelEncounterCard() {
    store.dispatch(cancelEncounterCard());
  }

  // Handle showing the environment card detail
  function handleShowEnvironmentDetail() {
    showEnvironmentDetail = true;
  }

  // Handle dismissing the environment card detail
  function handleDismissEnvironmentDetail() {
    showEnvironmentDetail = false;
  }

  // Handle using an action surge voluntarily at start of turn
  function handleUseActionSurge() {
    store.dispatch(useVoluntaryActionSurge());
  }

  // Handle skipping the action surge prompt
  function handleSkipActionSurge() {
    store.dispatch(skipActionSurge());
  }

  // Get current hero's surge value for display
  function getCurrentHeroSurgeValue(): number {
    const currentHeroId = getCurrentHeroId();
    if (!currentHeroId) return 0;
    const hp = heroHp.find(h => h.heroId === currentHeroId);
    return hp?.surgeValue ?? 0;
  }

  // Get new stats for leveled up hero
  function getLeveledUpHeroStats(): HeroHpState | undefined {
    if (!leveledUpHeroId) return undefined;
    return heroHp.find(h => h.heroId === leveledUpHeroId);
  }

  // Handle assigning treasure to a hero
  function handleAssignTreasure(heroId: string) {
    store.dispatch(assignTreasureToHero({ heroId }));
  }

  // Handle dismissing/discarding the treasure card
  function handleDismissTreasure() {
    store.dispatch(dismissTreasureCard());
  }

  // Handle hero placement selection
  function handleHeroPlacementSelect(position: Position) {
    store.dispatch(completeHeroPlacement({ position }));
  }

  // Handle canceling hero placement
  function handleCancelHeroPlacement() {
    store.dispatch(cancelHeroPlacement());
  }

  // Handle selecting a target (monster, trap, treasure)
  function handleTargetClick(targetId: string, targetType: 'monster' | 'trap' | 'treasure') {
    // Only allow target selection during hero phase and when not in map control mode
    if (turnState.currentPhase !== "hero-phase" || mapControlMode) {
      return;
    }
    
    // Select the target (existing behavior)
    store.dispatch(selectTarget({ targetId, targetType }));
  }

  // Handle selecting a monster for an encounter effect
  function handleSelectMonster(monsterInstanceId: string) {
    store.dispatch(selectMonsterForEncounter({ monsterInstanceId }));
  }

  // Handle cancelling monster selection
  function handleCancelMonsterChoice() {
    store.dispatch(cancelMonsterChoice());
  }

  // Handle using a treasure item (consumable or action)
  function handleUseTreasureItem(heroId: string, cardId: number) {
    store.dispatch(useTreasureItem({ heroId, cardId }));
  }

  // Helper function to get tiles in range for Blade Barrier
  function getBladeBarrierSelectableTiles(heroPosition: Position): PlacedTile[] {
    const TILE_WIDTH = 4;
    const NORMAL_TILE_HEIGHT = 4;
    const START_TILE_HEIGHT = 8;
    const MAX_RANGE = 2; // Blade Barrier range is 2 tiles

    // Get hero's tile position
    const heroTileX = Math.floor(heroPosition.x / TILE_WIDTH);
    const heroTileY = heroPosition.y < START_TILE_HEIGHT 
      ? 0 
      : Math.floor((heroPosition.y - START_TILE_HEIGHT) / NORMAL_TILE_HEIGHT) + 1;

    return dungeon.tiles.filter(tile => {
      const tilePosX = tile.position.col;
      const tilePosY = tile.position.row;
      
      // Calculate tile distance (Manhattan distance)
      const distance = Math.abs(tilePosX - heroTileX) + Math.abs(tilePosY - heroTileY);
      
      return distance <= MAX_RANGE;
    });
  }

  // Helper function to get valid squares on a tile
  function getBladeBarrierSelectableSquares(tileId: string, subTileId?: string): Position[] {
    const tile = dungeon.tiles.find(t => t.id === tileId);
    if (!tile) return [];

    const squares: Position[] = [];
    const TILE_WIDTH = 4;
    const NORMAL_TILE_HEIGHT = 4;
    const START_TILE_HEIGHT = 8;

    if (tile.tileType === 'start') {
      // Start tile spans 2 sub-tiles - only show squares for the selected sub-tile
      const subY = subTileId === '1' ? 1 : 0; // Default to top (0) if not specified
      for (let x = 0; x < TILE_WIDTH; x++) {
        for (let y = 0; y < NORMAL_TILE_HEIGHT; y++) {
          squares.push({ 
            x: tile.position.col * TILE_WIDTH + x, 
            y: subY * NORMAL_TILE_HEIGHT + y 
          });
        }
      }
    } else {
      // Regular tile
      const baseY = tile.position.row < 0
        ? tile.position.row * NORMAL_TILE_HEIGHT
        : tile.position.row === 0
          ? 0
          : START_TILE_HEIGHT + (tile.position.row - 1) * NORMAL_TILE_HEIGHT;

      for (let x = 0; x < TILE_WIDTH; x++) {
        for (let y = 0; y < NORMAL_TILE_HEIGHT; y++) {
          squares.push({ 
            x: tile.position.col * TILE_WIDTH + x, 
            y: baseY + y 
          });
        }
      }
    }

    return squares;
  }

  // Handle activating a power card from the player dashboard
  function handleActivatePowerCard(heroId: string, cardId: number) {
    // Get the power card details
    const card = POWER_CARDS.find((c) => c.id === cardId);
    
    if (!card) return;
    
    // At-Will powers should never be flipped via this function
    // They are attack powers and should go through handleAttackWithCard instead
    if (card.type === 'at-will') {
      console.error('At-Will power card should not be activated via handleActivatePowerCard:', card.name);
      return;
    }
    
    // Get game state for context
    const state = store.getState();
    const heroToken = state.game.heroTokens.find(t => t.heroId === heroId);
    if (!heroToken) return;
    
    // Blade Barrier (card ID 5) - Special UI for token placement
    // TODO: Import POWER_CARD_IDS and use POWER_CARD_IDS.BLADE_BARRIER constant
    if (cardId === 5) {
      // Start the tile selection process
      pendingBladeBarrier = {
        heroId,
        cardId,
        step: 'tile-selection'
      };
      return;
    }
    
    // Flaming Sphere (card ID 45) - Special UI for token placement
    if (cardId === 45) {
      // Start the square selection process (within 1 tile of hero)
      pendingFlamingSphere = {
        heroId,
        cardId,
        action: 'placement',
        step: 'square-selection'
      };
      return;
    }
    
    // Command (card ID 9) - Move monster on your tile to a tile within 2 tiles
    if (cardId === 9) {
      pendingMonsterRelocation = {
        heroId,
        cardId,
        step: 'monster-selection',
        maxTileRange: 2
      };
      
      // Expose for testing - clone to avoid Svelte state descriptor issues
      if (typeof window !== 'undefined') {
        (window as any).__PENDING_MONSTER_RELOCATION__ = JSON.parse(JSON.stringify(pendingMonsterRelocation));
      }
      return;
    }
    
    // Distant Diversion (card ID 38) - Move monster within 3 tiles to an adjacent tile
    if (cardId === 38) {
      pendingMonsterRelocation = {
        heroId,
        cardId,
        step: 'monster-selection',
        maxTileRange: 1 // Adjacent tiles only (from monster's position)
      };
      
      // Expose for testing - clone to avoid Svelte state descriptor issues
      if (typeof window !== 'undefined') {
        (window as any).__PENDING_MONSTER_RELOCATION__ = JSON.parse(JSON.stringify(pendingMonsterRelocation));
      }
      return;
    }
    
    // Implement healing power cards
    switch (cardId) {
      case 1: // Healing Hymn - Heal self and one ally on tile 2 HP
        {
          // Find the tile/sub-tile the hero is on
          const heroTileId = getTileOrSubTileId(heroToken.position, state.game.dungeon);
          
          // Find all heroes on the same tile
          const heroesOnTile = state.game.heroTokens.filter(t => {
            const tileId = getTileOrSubTileId(t.position, state.game.dungeon);
            return tileId === heroTileId;
          });
          
          // Heal all heroes on the tile (including self)
          heroesOnTile.forEach(token => {
            store.dispatch(applyHealing({ heroId: token.heroId, amount: 2 }));
          });
          
          // Flip the card to mark it as used
          store.dispatch(usePowerCard({ heroId, cardId }));
        }
        break;
        
      case 11: // Dwarven Resilience - Heal self 4 HP
        {
          // Heal the hero
          store.dispatch(applyHealing({ heroId, amount: 4 }));
          
          // Flip the card to mark it as used
          store.dispatch(usePowerCard({ heroId, cardId }));
        }
        break;
        
      case 21: // Lay On Hands - Heal adjacent ally 2 HP
        {
          // Find adjacent heroes
          const adjacentHeroes = state.game.heroTokens.filter(t => {
            if (t.heroId === heroId) return false; // Don't include self
            const dx = Math.abs(t.position.x - heroToken.position.x);
            const dy = Math.abs(t.position.y - heroToken.position.y);
            return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
          });
          
          if (adjacentHeroes.length === 0) {
            // No adjacent heroes to heal - don't activate the card
            return;
          } else {
            // Sort heroes by ID for deterministic behavior
            adjacentHeroes.sort((a, b) => a.heroId.localeCompare(b.heroId));
            
            // Heal the first adjacent hero (sorted by heroId)
            // TODO: Add UI for target selection when multiple targets available
            store.dispatch(applyHealing({ heroId: adjacentHeroes[0].heroId, amount: 2 }));
            store.dispatch(usePowerCard({ heroId, cardId }));
          }
        }
        break;
        
      default:
        // For other cards, just flip them for now
        // TODO: Implement other utility cards
        store.dispatch(usePowerCard({ heroId, cardId }));
        break;
    }
  }

  // Blade Barrier modal handlers
  function handleBladeBarrierTileSelected(tileId: string, event: MouseEvent) {
    if (!pendingBladeBarrier) return;
    
    const tile = dungeon.tiles.find(t => t.id === tileId);
    if (!tile) return;
    
    let subTileId: string | undefined;
    
    // For start tile, determine which half was clicked
    if (tile.tileType === 'start') {
      const target = event.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const clickY = event.clientY - rect.top;
      const halfHeight = rect.height / 2;
      
      // Top half is subtile 0, bottom half is subtile 1
      subTileId = clickY < halfHeight ? '0' : '1';
    }
    
    // Move to square selection step
    pendingBladeBarrier = {
      ...pendingBladeBarrier,
      selectedTileId: tileId,
      selectedSubTileId: subTileId,
      step: 'square-selection',
      selectedSquares: []
    };
    
    // Expose for testing - clone to avoid Svelte state descriptor issues
    if (typeof window !== 'undefined') {
      (window as any).__PENDING_BLADE_BARRIER__ = JSON.parse(JSON.stringify(pendingBladeBarrier));
    }
  }

  function handleBladeBarrierSquareClicked(position: Position) {
    if (!pendingBladeBarrier || pendingBladeBarrier.step !== 'square-selection') return;
    if (!pendingBladeBarrier.selectedSquares) return;
    
    const key = `${position.x},${position.y}`;
    const selectedKeys = pendingBladeBarrier.selectedSquares.map(s => `${s.x},${s.y}`);
    
    // Toggle selection
    if (selectedKeys.includes(key)) {
      // Deselect
      pendingBladeBarrier = {
        ...pendingBladeBarrier,
        selectedSquares: pendingBladeBarrier.selectedSquares.filter(s => `${s.x},${s.y}` !== key)
      };
    } else if (pendingBladeBarrier.selectedSquares.length < 5) {
      // Select if under limit
      pendingBladeBarrier = {
        ...pendingBladeBarrier,
        selectedSquares: [...pendingBladeBarrier.selectedSquares, position]
      };
    }
    
    // Expose for testing - clone to avoid Svelte state descriptor issues
    if (typeof window !== 'undefined') {
      (window as any).__PENDING_BLADE_BARRIER__ = JSON.parse(JSON.stringify(pendingBladeBarrier));
    }
  }

  function handleBladeBarrierConfirm() {
    if (!pendingBladeBarrier || !pendingBladeBarrier.selectedTileId || !pendingBladeBarrier.selectedSquares) return;
    if (pendingBladeBarrier.selectedSquares.length !== 5) return;
    
    handleBladeBarrierTokensPlaced(pendingBladeBarrier.selectedSquares);
  }

  function handleBladeBarrierTokensPlaced(positions: Position[]) {
    if (!pendingBladeBarrier || !pendingBladeBarrier.selectedTileId) return;
    
    const { heroId, cardId } = pendingBladeBarrier;
    
    // Get current board token counter
    const state = store.getState();
    const currentTokens = state.game.boardTokens || [];
    // Generate unique IDs using timestamp and index to avoid parsing fragility
    const timestamp = Date.now();
    
    // Create board tokens for each selected position
    // Clone positions to avoid Svelte state descriptor issues
    const newTokens = positions.map((position, index) => ({
      id: `token-blade-barrier-${timestamp}-${index}`,
      type: 'blade-barrier' as const,
      powerCardId: cardId,
      ownerId: heroId,
      position: { x: position.x, y: position.y }
    }));
    
    // Dispatch action to add tokens to the board
    store.dispatch({
      type: 'game/setBoardTokens',
      payload: [...currentTokens, ...newTokens]
    });
    
    // Mark the power card as used
    store.dispatch(usePowerCard({ heroId, cardId }));
    
    // Clear the pending state
    pendingBladeBarrier = null;
  }

  function handleBladeBarrierCancel() {
    pendingBladeBarrier = null;
  }

  // ========== Flaming Sphere Handlers ==========
  
  function handleFlamingSphereSquareClicked(position: Position) {
    if (!pendingFlamingSphere || pendingFlamingSphere.step !== 'square-selection') return;
    
    // Set the selected square
    pendingFlamingSphere = {
      ...pendingFlamingSphere,
      selectedSquare: position
    };
    
    // Expose for testing - clone to avoid Svelte state descriptor issues
    if (typeof window !== 'undefined') {
      (window as any).__PENDING_FLAMING_SPHERE__ = JSON.parse(JSON.stringify(pendingFlamingSphere));
    }
    
    // For movement action (initiated from control panel), auto-confirm the selection
    // For placement action (initiated from power card), wait for explicit confirm button click
    if (pendingFlamingSphere.action === 'movement') {
      handleFlamingSphereConfirm();
    }
  }
  
  function handleFlamingSphereConfirm() {
    if (!pendingFlamingSphere || !pendingFlamingSphere.selectedSquare) return;
    
    if (pendingFlamingSphere.action === 'placement') {
      handleFlamingSphereTokenPlaced(pendingFlamingSphere.selectedSquare);
    } else if (pendingFlamingSphere.action === 'movement') {
      handleFlamingSphereTokenMoved(pendingFlamingSphere.selectedSquare);
    }
  }
  
  function handleFlamingSphereTokenPlaced(position: Position) {
    if (!pendingFlamingSphere) return;
    
    const { heroId, cardId } = pendingFlamingSphere;
    
    // Get current board token state
    const state = store.getState();
    const currentTokens = state.game.boardTokens || [];
    const timestamp = Date.now();
    
    // Create Flaming Sphere token with 3 charges
    const newToken = {
      id: `token-flaming-sphere-${timestamp}`,
      type: 'flaming-sphere' as const,
      powerCardId: cardId,
      ownerId: heroId,
      position: { x: position.x, y: position.y },
      charges: 3,
      canMove: true
    };
    
    // Dispatch action to add token to the board
    store.dispatch({
      type: 'game/setBoardTokens',
      payload: [...currentTokens, newToken]
    });
    
    // Mark the power card as used
    store.dispatch(usePowerCard({ heroId, cardId }));
    
    // Clear the pending state
    pendingFlamingSphere = null;
  }
  
  function handleFlamingSphereTokenMoved(newPosition: Position) {
    if (!pendingFlamingSphere) return;
    
    // Find the Flaming Sphere token owned by this hero
    const state = store.getState();
    const currentTokens = state.game.boardTokens || [];
    const flamingSphereToken = currentTokens.find(
      token => token.type === 'flaming-sphere' && token.ownerId === pendingFlamingSphere!.heroId
    );
    
    if (!flamingSphereToken) {
      pendingFlamingSphere = null;
      return;
    }
    
    // Update token position
    const updatedTokens = currentTokens.map(token =>
      token.id === flamingSphereToken.id
        ? { ...token, position: { x: newPosition.x, y: newPosition.y } }
        : token
    );
    
    store.dispatch({
      type: 'game/setBoardTokens',
      payload: updatedTokens
    });
    
    // Movement counts as the hero's movement action
    // We need to dispatch a custom action to record this
    store.dispatch({
      type: 'game/recordFlamingSphereMovement',
      payload: { heroId: pendingFlamingSphere.heroId }
    });
    
    // Clear the pending state
    pendingFlamingSphere = null;
  }
  
  function handleFlamingSphereCancel() {
    pendingFlamingSphere = null;
  }
  
  // ========== Monster Relocation Handlers ==========
  
  function handleMonsterRelocationMonsterClicked(monsterInstanceId: string) {
    if (!pendingMonsterRelocation || pendingMonsterRelocation.step !== 'monster-selection') return;
    
    // Set the selected monster and move to tile selection
    pendingMonsterRelocation = {
      ...pendingMonsterRelocation,
      selectedMonsterInstanceId: monsterInstanceId,
      step: 'tile-selection'
    };
    
    // Expose for testing - clone to avoid Svelte state descriptor issues
    if (typeof window !== 'undefined') {
      (window as any).__PENDING_MONSTER_RELOCATION__ = JSON.parse(JSON.stringify(pendingMonsterRelocation));
    }
  }
  
  function handleMonsterRelocationTileClicked(tileId: string) {
    if (!pendingMonsterRelocation || pendingMonsterRelocation.step !== 'tile-selection') return;
    if (!pendingMonsterRelocation.selectedMonsterInstanceId) return;
    
    // Get the monster and find a valid spawn position on the target tile
    const state = store.getState();
    const monster = state.game.monsters.find(m => m.instanceId === pendingMonsterRelocation!.selectedMonsterInstanceId);
    if (!monster) {
      console.error('Monster not found for relocation:', pendingMonsterRelocation.selectedMonsterInstanceId);
      pendingMonsterRelocation = null;
      return;
    }
    
    // Find the target tile
    const targetTile = dungeon.tiles.find(t => t.id === tileId);
    if (!targetTile) {
      console.error('Target tile not found:', tileId);
      pendingMonsterRelocation = null;
      return;
    }
    
    // Find a valid spawn position on the target tile
    // Use the same logic as monster spawning - find an empty square
    const tileWidth = 4;
    const tileHeight = targetTile.tileType === 'start' ? 8 : 4;
    const tileBaseX = targetTile.position.col * tileWidth;
    const tileBaseY = targetTile.position.row === 0 
      ? 0 
      : 8 + (targetTile.position.row - 1) * 4;
    
    // For start tile, respect walkable bounds and staircase
    const isStartTile = targetTile.tileType === 'start';
    const minX = isStartTile ? 1 : 0;
    const maxX = isStartTile ? 3 : tileWidth - 1;
    const staircase = isStartTile ? [
      { x: 1, y: 3 },
      { x: 2, y: 3 },
      { x: 1, y: 4 },
      { x: 2, y: 4 },
    ] : [];
    
    // Check all squares on the tile for an empty one
    let newPosition: Position | null = null;
    for (let y = 0; y < tileHeight; y++) {
      for (let x = minX; x <= maxX; x++) {
        const pos = { x: tileBaseX + x, y: tileBaseY + y };
        
        // Skip staircase squares
        if (staircase.some(s => s.x === pos.x && s.y === pos.y)) {
          continue;
        }
        
        // Check if square is empty (no hero, no monster)
        const hasHero = state.game.heroTokens.some(h => h.position.x === pos.x && h.position.y === pos.y);
        const hasMonster = state.game.monsters.some(m => 
          m.instanceId !== pendingMonsterRelocation!.selectedMonsterInstanceId && 
          m.position.x === pos.x && 
          m.position.y === pos.y
        );
        
        if (!hasHero && !hasMonster) {
          newPosition = pos;
          break;
        }
      }
      if (newPosition) break;
    }
    
    if (!newPosition) {
      // No valid position found - cancel
      console.error('No valid position found on tile:', tileId);
      pendingMonsterRelocation = null;
      return;
    }
    
    console.log('Relocating monster to:', newPosition, 'on tile:', tileId);
    
    // Update monster position
    const updatedMonsters = state.game.monsters.map(m =>
      m.instanceId === pendingMonsterRelocation!.selectedMonsterInstanceId
        ? { ...m, position: newPosition!, tileId }
        : m
    );
    
    store.dispatch({
      type: 'game/setMonsters',
      payload: updatedMonsters
    });
    
    // Mark the power card as used
    store.dispatch(usePowerCard({ 
      heroId: pendingMonsterRelocation.heroId, 
      cardId: pendingMonsterRelocation.cardId 
    }));
    
    // Clear the pending state
    pendingMonsterRelocation = null;
  }
  
  function handleMonsterRelocationCancel() {
    pendingMonsterRelocation = null;
  }
  
  // Helper function to get selectable monsters for relocation
  function getSelectableMonsters(): string[] {
    if (!pendingMonsterRelocation || pendingMonsterRelocation.step !== 'monster-selection') return [];
    
    const state = store.getState();
    const heroToken = state.game.heroTokens.find(t => t.heroId === pendingMonsterRelocation!.heroId);
    if (!heroToken) return [];
    
    const cardId = pendingMonsterRelocation.cardId;
    
    if (cardId === 9) {
      // Command: Choose one Monster on your tile (same tile, ignoring sub-tiles)
      const heroTile = findTileAtPosition(heroToken.position, state.game.dungeon);
      if (!heroTile) return [];
      
      return state.game.monsters
        .filter(m => {
          const monsterTile = findTileAtPosition(m.position, state.game.dungeon);
          return monsterTile && monsterTile.id === heroTile.id;
        })
        .map(m => m.instanceId);
    } else if (cardId === 38) {
      // Distant Diversion: Choose one Monster within 3 tiles of you
      const heroTile = findTileAtPosition(heroToken.position, state.game.dungeon);
      if (!heroTile) return [];
      
      return state.game.monsters
        .filter(m => {
          const monsterTile = findTileAtPosition(m.position, state.game.dungeon);
          if (!monsterTile) return false;
          
          // Calculate tile distance (Manhattan distance)
          const distance = Math.abs(monsterTile.position.col - heroTile.position.col) + 
                          Math.abs(monsterTile.position.row - heroTile.position.row);
          
          return distance <= 3;
        })
        .map(m => m.instanceId);
    }
    
    return [];
  }
  
  // Helper function to get selectable tiles for monster relocation destination
  function getSelectableTilesForRelocation(): string[] {
    if (!pendingMonsterRelocation || pendingMonsterRelocation.step !== 'tile-selection') return [];
    if (!pendingMonsterRelocation.selectedMonsterInstanceId) return [];
    
    const state = store.getState();
    const monster = state.game.monsters.find(m => m.instanceId === pendingMonsterRelocation!.selectedMonsterInstanceId);
    const heroToken = state.game.heroTokens.find(t => t.heroId === pendingMonsterRelocation!.heroId);
    if (!monster || !heroToken) return [];
    
    const cardId = pendingMonsterRelocation.cardId;
    
    if (cardId === 9) {
      // Command: Place that Monster on a tile within 2 tiles of you
      const heroTile = findTileAtPosition(heroToken.position, state.game.dungeon);
      if (!heroTile) return [];
      
      return dungeon.tiles
        .filter(tile => {
          const distance = Math.abs(tile.position.col - heroTile.position.col) + 
                          Math.abs(tile.position.row - heroTile.position.row);
          return distance <= 2;
        })
        .map(tile => tile.id);
    } else if (cardId === 38) {
      // Distant Diversion: Place that Monster onto an adjacent tile
      const monsterTile = findTileAtPosition(monster.position, state.game.dungeon);
      if (!monsterTile) return [];
      
      return dungeon.tiles
        .filter(tile => {
          const distance = Math.abs(tile.position.col - monsterTile.position.col) + 
                          Math.abs(tile.position.row - monsterTile.position.row);
          return distance === 1; // Adjacent tiles only
        })
        .map(tile => tile.id);
    }
    
    return [];
  }
  
  // Helper function to get squares within N tiles of a position (excluding wall borders)
  function getSquaresWithinRange(position: Position, maxRange: number): Position[] {
    const TILE_WIDTH = 4;
    const NORMAL_TILE_HEIGHT = 4;
    const START_TILE_HEIGHT = 8;
    
    // Get position's tile
    const posTileX = Math.floor(position.x / TILE_WIDTH);
    const posTileY = position.y < START_TILE_HEIGHT 
      ? 0 
      : Math.floor((position.y - START_TILE_HEIGHT) / NORMAL_TILE_HEIGHT) + 1;
    
    // Get all tiles within range
    const tilesInRange = dungeon.tiles.filter(tile => {
      const tilePosX = tile.position.col;
      const tilePosY = tile.position.row;
      
      // Calculate tile distance (Manhattan distance)
      const distance = Math.abs(tilePosX - posTileX) + Math.abs(tilePosY - posTileY);
      
      return distance <= maxRange;
    });
    
    // Get all valid squares from these tiles (excluding wall borders)
    const allSquares: Position[] = [];
    for (const tile of tilesInRange) {
      const tileWidth = TILE_WIDTH;
      const tileHeight = tile.id === 'start-tile' ? START_TILE_HEIGHT : NORMAL_TILE_HEIGHT;
      
      const minX = tile.position.col * tileWidth;
      const maxX = minX + tileWidth - 1;
      const minY = tile.position.row < 0 
        ? tile.position.row * tileHeight
        : tile.position.row === 0 
          ? 0 
          : START_TILE_HEIGHT + (tile.position.row - 1) * tileHeight;
      const maxY = minY + tileHeight - 1;
      
      // Add interior squares (excluding borders)
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          const localX = x - minX;
          const localY = y - minY;
          
          // Exclude wall squares (outer border)
          if (localX >= 1 && localX < tileWidth - 1 && localY >= 1 && localY < tileHeight - 1) {
            allSquares.push({ x, y });
          }
        }
      }
    }
    
    return allSquares;
  }
  
  // Helper function to get squares in range for Flaming Sphere placement
  function getFlamingSphereSelectableSquares(heroPosition: Position): Position[] {
    return getSquaresWithinRange(heroPosition, 1); // Flaming Sphere range is 1 tile
  }
  
  // Helper function to get squares for moving an existing Flaming Sphere token
  function getFlamingSphereMovementSquares(currentPosition: Position): Position[] {
    return getSquaresWithinRange(currentPosition, 1); // Can move 1 tile
  }

  // Handle clicking on a board token (for Flaming Sphere movement/activation)
  function handleBoardTokenClick(token: BoardTokenState) {
    // Only handle Flaming Sphere tokens
    if (token.type !== 'flaming-sphere') return;
    
    // Only allow interaction during hero phase
    if (turnState.currentPhase !== 'hero-phase') return;
    
    // Only allow interaction if it's the owner's turn
    const currentHeroId = getCurrentHeroId();
    if (token.ownerId !== currentHeroId) return;
    
    // Check if we're already in a selection mode
    if (pendingFlamingSphere) return;
    
    // Show a simple context menu or dialog with options
    // For now, let's start the movement mode directly
    // TODO: In the future, add a context menu with "Move" and "Activate Damage" options
    handleMoveFlamingSphere();
  }
  
  // Start movement mode for Flaming Sphere
  function handleMoveFlamingSphere() {
    // Find the current hero's Flaming Sphere token
    const state = store.getState();
    const currentHeroId = getCurrentHeroId();
    const flamingSphereToken = state.game.boardTokens.find(
      token => token.type === 'flaming-sphere' && token.ownerId === currentHeroId
    );
    
    if (!flamingSphereToken) return;
    
    // Check if hero has already moved
    const heroTurnActions = state.game.heroTurnActions;
    if (heroTurnActions.actionsTaken.includes('move')) {
      // Already moved, can't move sphere
      return;
    }
    
    // Start movement selection
    pendingFlamingSphere = {
      heroId: currentHeroId,
      cardId: 45, // Flaming Sphere card ID
      action: 'movement',
      step: 'square-selection'
    };
  }
  
  // Activate Flaming Sphere damage
  function handleActivateFlamingSphereDamage() {
    // Find the current hero's Flaming Sphere token
    const state = store.getState();
    const currentHeroId = getCurrentHeroId();
    const flamingSphereToken = state.game.boardTokens.find(
      token => token.type === 'flaming-sphere' && token.ownerId === currentHeroId
    );
    
    if (!flamingSphereToken || !flamingSphereToken.charges) return;
    
    // Find all monsters on the same tile as the token
    const tileMonsters = state.game.monsters.filter(monster => {
      // Get the tile for both token and monster
      const tokenTileX = Math.floor(flamingSphereToken.position.x / 4);
      const tokenTileY = flamingSphereToken.position.y < 8 
        ? 0 
        : Math.floor((flamingSphereToken.position.y - 8) / 4) + 1;
      
      const monsterTileX = Math.floor(monster.position.x / 4);
      const monsterTileY = monster.position.y < 8 
        ? 0 
        : Math.floor((monster.position.y - 8) / 4) + 1;
      
      return tokenTileX === monsterTileX && tokenTileY === monsterTileY;
    });
    
    // Apply 1 damage to each monster by updating the entire monsters array
    const updatedMonsters = state.game.monsters.map(monster => {
      const isOnTile = tileMonsters.some(m => m.instanceId === monster.instanceId);
      if (isOnTile) {
        return {
          ...monster,
          currentHp: Math.max(0, monster.currentHp - 1)
        };
      }
      return monster;
    }).filter(monster => monster.currentHp > 0); // Remove defeated monsters
    
    store.dispatch({
      type: 'game/setMonsters',
      payload: updatedMonsters
    });
    
    // Decrement the charge
    const updatedTokens = state.game.boardTokens.map(token =>
      token.id === flamingSphereToken.id
        ? { ...token, charges: (token.charges || 1) - 1 }
        : token
    ).filter(token => {
      // Remove tokens with 0 charges
      if (token.charges !== undefined && token.charges <= 0) {
        return false;
      }
      return true;
    });
    
    store.dispatch({
      type: 'game/setBoardTokens',
      payload: updatedTokens
    });
  }

  // Get hero inventory item count for display
  function getHeroInventoryCount(heroId: string): number {
    const inventory = heroInventories[heroId];
    return inventory?.items?.length ?? 0;
  }

  // Map control constants
  const MAP_ZOOM_MIN = 0.5;  // Minimum zoom (50% of base scale)
  const MAP_ZOOM_MAX = 3;    // Maximum zoom (300% of base scale)
  const MAP_ZOOM_STEP = 0.1; // Zoom step for buttons
  const PINCH_ZOOM_SENSITIVITY = 0.01; // Sensitivity for pinch-to-zoom gesture

  // Toggle map control mode
  function toggleMapControlMode() {
    mapControlMode = !mapControlMode;
    // Map modifications (zoom and pan) are now permanent and persist after exiting control mode
  }

  // Handle zoom in
  function handleZoomIn() {
    manualZoom = Math.min(MAP_ZOOM_MAX, manualZoom + MAP_ZOOM_STEP);
  }

  // Handle zoom out
  function handleZoomOut() {
    manualZoom = Math.max(MAP_ZOOM_MIN, manualZoom - MAP_ZOOM_STEP);
  }

  // Handle zoom slider change
  function handleZoomSlider(event: Event) {
    const target = event.target as HTMLInputElement;
    manualZoom = parseFloat(target.value);
  }

  // Helper to update pan offset based on delta movement
  function updatePanOffset(deltaX: number, deltaY: number) {
    panOffset = { x: panOffset.x + deltaX, y: panOffset.y + deltaY };
  }

  // Mouse/touch pan handlers
  function handlePanStart(event: MouseEvent | TouchEvent) {
    // For touch events, check if it's a pinch gesture (2+ touches)
    if (event instanceof TouchEvent && event.touches.length >= 2) {
      // Auto-enable map control mode when pinch gesture is detected
      if (!mapControlMode) {
        mapControlMode = true;
      }
      
      // Start pinch-to-zoom
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      lastPinchDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      isPanning = true;
      event.preventDefault();
      return;
    }
    
    // For single-finger touch events, only enable panning if map control mode is already active
    // This allows normal gameplay interactions (taps) to work when map control is off
    // For mouse events, still require manual activation
    if (event instanceof TouchEvent && event.touches.length === 1 && !mapControlMode) {
      // Don't auto-enable map control mode for single-finger touches
      // Let the tap go through to handleTileClick or move square clicks
      return;
    } else if (event instanceof MouseEvent && !mapControlMode) {
      // Mouse events still require map control mode to be manually enabled
      return;
    }
    
    isPanning = true;
    
    if (event instanceof MouseEvent) {
      lastPanPoint = { x: event.clientX, y: event.clientY };
    } else if (event.touches.length === 1) {
      lastPanPoint = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }
    
    event.preventDefault();
  }

  function handlePanMove(event: MouseEvent | TouchEvent) {
    // For touch events with 2+ touches (pinch gesture), always handle
    if (event instanceof TouchEvent && event.touches.length >= 2) {
      // Handle pinch-to-zoom
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const currentDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      
      if (lastPinchDistance > 0) {
        const zoomDelta = (currentDistance - lastPinchDistance) * PINCH_ZOOM_SENSITIVITY;
        manualZoom = Math.max(MAP_ZOOM_MIN, Math.min(MAP_ZOOM_MAX, manualZoom + zoomDelta));
      }
      
      lastPinchDistance = currentDistance;
      event.preventDefault();
      return;
    }
    
    // For mouse events, still require map control mode
    if (event instanceof MouseEvent && !mapControlMode) return;
    
    // For single-finger touch events, require map control mode to be active
    // (only pinch gestures auto-enable map control mode)
    if (event instanceof TouchEvent && event.touches.length === 1 && !mapControlMode) return;
    
    // Only proceed with panning if a pan gesture is currently active
    if (!isPanning) return;
    
    if (event instanceof MouseEvent) {
      const deltaX = event.clientX - lastPanPoint.x;
      const deltaY = event.clientY - lastPanPoint.y;
      updatePanOffset(deltaX, deltaY);
      lastPanPoint = { x: event.clientX, y: event.clientY };
    } else if (event.touches.length === 1) {
      const deltaX = event.touches[0].clientX - lastPanPoint.x;
      const deltaY = event.touches[0].clientY - lastPanPoint.y;
      updatePanOffset(deltaX, deltaY);
      lastPanPoint = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }
    
    event.preventDefault();
  }

  function handlePanEnd() {
    isPanning = false;
    lastPinchDistance = 0;
  }

  // Reset map view to default
  function resetMapView() {
    manualZoom = 1;
    panOffset = { x: 0, y: 0 };
  }
</script>

<div class="game-board" data-testid="game-board">
  <!-- Corner Controls - NW and SE for accessibility from different player positions -->
  <CornerControls 
    position="nw" 
    {mapControlMode}
    onReset={handleReset}
    onToggleMapControl={toggleMapControlMode}
  />
  <CornerControls 
    position="se" 
    {mapControlMode}
    onReset={handleReset}
    onToggleMapControl={toggleMapControlMode}
  />
  
  <!-- Fullscreen board container - map fills entire viewport -->
    <div class="board-container" bind:this={boardContainerRef}>
      <div
        class="dungeon-map"
        class:map-control-active={mapControlMode}
        bind:this={dungeonMapRef}
        data-testid="dungeon-map"
        style={mapTransformStyle}
        onclick={mapControlMode ? undefined : handleTileClick}
        onkeydown={mapControlMode ? undefined : handleTileKeydown}
        onmousedown={mapControlMode ? handlePanStart : undefined}
        onmousemove={mapControlMode ? handlePanMove : undefined}
        onmouseup={mapControlMode ? handlePanEnd : undefined}
        onmouseleave={mapControlMode ? handlePanEnd : undefined}
        ontouchstart={handlePanStart}
        ontouchmove={handlePanMove}
        ontouchend={handlePanEnd}
        role="button"
        tabindex="0"
        aria-label={mapControlMode
          ? "Map control mode: drag to pan, use controls to zoom"
          : showingMovement
            ? "Click to hide movement options"
            : "Click to show movement options for current hero"}
      >
        <!-- Render all tiles -->
        {#each dungeon.tiles as tile (tile.id)}
          {@const tilePos = getTilePixelPosition(tile, mapBounds)}
          {@const tileDims = getTileDimensions(tile)}
          {@const currentHero = pendingBladeBarrier ? heroTokens.find(t => t.heroId === pendingBladeBarrier.heroId) : null}
          {@const selectableTiles = pendingBladeBarrier && pendingBladeBarrier.step === 'tile-selection' && currentHero 
            ? getBladeBarrierSelectableTiles(currentHero.position) 
            : []}
          {@const isTileSelectableForBladeBarrier = selectableTiles.some(t => t.id === tile.id)}
          {@const isTileSelectableForRelocation = pendingMonsterRelocation?.step === 'tile-selection' && 
                                                   getSelectableTilesForRelocation().includes(tile.id)}
          {@const isTileSelectable = isTileSelectableForBladeBarrier || isTileSelectableForRelocation}
          {@const hasSelectableSquares = pendingBladeBarrier && pendingBladeBarrier.step === 'square-selection' && pendingBladeBarrier.selectedTileId === tile.id}
          <div
            class="placed-tile"
            class:start-tile={tile.tileType === "start"}
            class:newly-placed={tile.id === recentlyPlacedTileId}
            class:selectable-tile={isTileSelectable}
            class:has-selectable-squares={hasSelectableSquares}
            data-testid={tile.tileType === "start"
              ? "start-tile"
              : "dungeon-tile"}
            data-tile-id={tile.id}
            style="left: {tilePos.x}px; top: {tilePos.y}px; width: {tileDims.width}px; height: {tileDims.height}px;"
            onclick={(e) => {
              if (isTileSelectableForBladeBarrier) {
                handleBladeBarrierTileSelected(tile.id, e);
              } else if (isTileSelectableForRelocation) {
                handleMonsterRelocationTileClicked(tile.id);
              }
            }}
            role={isTileSelectable ? "button" : undefined}
            tabindex={isTileSelectable ? 0 : undefined}
          >
            <img
              src={assetPath(getTileImagePath(tile))}
              alt={tile.tileType}
              class="tile-image"
              style={tile.rotation !== 0
                ? `transform: rotate(${tile.rotation}deg);`
                : ""}
            />

            <!-- Tile selection overlay -->
            {#if isTileSelectable}
              <div class="tile-selection-overlay"></div>
            {/if}

            <!-- Unexplored edge indicators for this tile -->
            {#each dungeon.unexploredEdges.filter((e) => e.tileId === tile.id) as edge (`${edge.direction}-${edge.subTileId || 'default'}`)}
              <UnexploredEdgeIndicator
                direction={edge.direction}
                cellSize={TILE_CELL_SIZE}
                tileWidth={tileDims.width}
                tileHeight={tileDims.height}
                subTileId={edge.subTileId}
              />
            {/each}
          </div>
        {/each}

        <!-- Movement overlay (only on start tile for now) -->
        <!-- Disabled during map control mode to prevent hero movement while editing -->
        <!-- Disabled during Blade Barrier selection to prevent interference -->
        {#if showingMovement && validMoveSquares.length > 0 && !mapControlMode && !pendingBladeBarrier}
          {@const startTile = dungeon.tiles.find((t) => t.tileType === "start")}
          {#if startTile}
            {@const startTilePos = getTilePixelPosition(startTile, mapBounds)}
            {@const startTileDims = getTileDimensions(startTile)}
            <div
              class="movement-overlay-container"
              style="left: {startTilePos.x}px; top: {startTilePos.y}px; width: {startTileDims.width}px; height: {startTileDims.height}px;"
            >
              <MovementOverlay
                {validMoveSquares}
                tileOffsetX={TOKEN_OFFSET_X}
                tileOffsetY={TOKEN_OFFSET_Y}
                cellSize={TILE_CELL_SIZE}
                onSquareClick={handleMoveSquareClick}
              />
            </div>
          {/if}
        {/if}

        <!-- Hero Placement Overlay (for cards like Tornado Strike) -->
        {#if pendingHeroPlacement && validPlacementSquares.length > 0}
          {@const placementTile = dungeon.tiles.find(t => t.id === pendingHeroPlacement.tileId)}
          {#if placementTile}
            {@const placementTilePos = getTilePixelPosition(placementTile, mapBounds)}
            {@const placementTileDims = getTileDimensions(placementTile)}
            <div
              class="placement-overlay-container"
              style="left: {placementTilePos.x}px; top: {placementTilePos.y}px; width: {placementTileDims.width}px; height: {placementTileDims.height}px;"
            >
              <MovementOverlay
                validMoveSquares={validPlacementSquares}
                tileOffsetX={TOKEN_OFFSET_X}
                tileOffsetY={TOKEN_OFFSET_Y}
                cellSize={TILE_CELL_SIZE}
                onSquareClick={handleHeroPlacementSelect}
              />
            </div>
          {/if}
        {/if}

        <!-- Blade Barrier Square Selection Overlay -->
        {#if pendingBladeBarrier && pendingBladeBarrier.step === 'square-selection' && pendingBladeBarrier.selectedTileId}
          {@const selectedTile = dungeon.tiles.find(t => t.id === pendingBladeBarrier.selectedTileId)}
          {#if selectedTile}
            {@const tilePos = getTilePixelPosition(selectedTile, mapBounds)}
            {@const tileDims = getTileDimensions(selectedTile)}
            {@const selectableSquares = getBladeBarrierSelectableSquares(selectedTile.id, pendingBladeBarrier.selectedSubTileId)}
            {@const selectedSquares = pendingBladeBarrier.selectedSquares || []}
            <div
              class="square-selection-overlay-container"
              style="left: {tilePos.x}px; top: {tilePos.y}px; width: {tileDims.width}px; height: {tileDims.height}px;"
            >
              {#each selectableSquares as square (square.x + '-' + square.y)}
                {@const isSelected = selectedSquares.some(s => s.x === square.x && s.y === square.y)}
                {@const selectionIndex = selectedSquares.findIndex(s => s.x === square.x && s.y === square.y)}
                {@const relX = square.x - (selectedTile.position.col * 4)}
                {@const relY = selectedTile.tileType === 'start' ? square.y : (square.y - (selectedTile.position.row < 0 ? selectedTile.position.row * 4 : selectedTile.position.row === 0 ? 0 : 8 + (selectedTile.position.row - 1) * 4))}
                <button
                  class="selectable-square"
                  class:selected={isSelected}
                  data-testid="selectable-square-{square.x}-{square.y}"
                  style="left: {TOKEN_OFFSET_X + relX * TILE_CELL_SIZE}px; top: {TOKEN_OFFSET_Y + relY * TILE_CELL_SIZE}px; width: {TILE_CELL_SIZE}px; height: {TILE_CELL_SIZE}px;"
                  onclick={() => handleBladeBarrierSquareClicked(square)}
                >
                  {#if isSelected}
                    <div class="token-preview" aria-label="Blade Barrier token {selectionIndex + 1}">
                      <span class="token-emoji" aria-hidden="true">⚔️</span>
                      <span class="selection-number">{selectionIndex + 1}</span>
                    </div>
                  {/if}
                </button>
              {/each}
            </div>
          {/if}
        {/if}

        <!-- Flaming Sphere Square Selection Overlay -->
        {#if pendingFlamingSphere && pendingFlamingSphere.step === 'square-selection'}
          {@const currentHero = heroTokens.find(t => t.heroId === pendingFlamingSphere.heroId)}
          {#if currentHero}
            {@const state = store.getState()}
            {@const flamingSphereToken = state.game.boardTokens.find(t => t.type === 'flaming-sphere' && t.ownerId === pendingFlamingSphere.heroId)}
            {@const selectableSquares = pendingFlamingSphere.action === 'placement' 
              ? getFlamingSphereSelectableSquares(currentHero.position)
              : flamingSphereToken 
                ? getFlamingSphereMovementSquares(flamingSphereToken.position)
                : []}
            {@const selectedSquare = pendingFlamingSphere.selectedSquare}
            {@const startTile = dungeon.tiles.find(t => t.tileType === 'start')}
            {#if startTile}
              {@const startTilePos = getTilePixelPosition(startTile, mapBounds)}
              <div
                class="square-selection-overlay-container"
                style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; z-index: 15;"
              >
                {#each selectableSquares as square (square.x + '-' + square.y)}
                  {@const isSelected = selectedSquare && selectedSquare.x === square.x && selectedSquare.y === square.y}
                  {@const relX = square.x}
                  {@const relY = square.y}
                  <button
                    class="selectable-square flaming-sphere-square"
                    class:selected={isSelected}
                    data-testid="selectable-square-{square.x}-{square.y}"
                    style="left: {startTilePos.x + TOKEN_OFFSET_X + relX * TILE_CELL_SIZE}px; top: {startTilePos.y + TOKEN_OFFSET_Y + relY * TILE_CELL_SIZE}px; width: {TILE_CELL_SIZE}px; height: {TILE_CELL_SIZE}px;"
                    onclick={() => handleFlamingSphereSquareClicked(square)}
                  >
                    {#if isSelected}
                      <div class="token-preview" aria-label="Flaming Sphere position">
                        <span class="token-emoji" aria-hidden="true">🔥</span>
                      </div>
                    {/if}
                  </button>
                {/each}
              </div>
            {/if}
          {/if}
        {/if}

        <!-- Hero tokens (positioned relative to start tile) -->
        {#each heroTokens as token (token.heroId)}
          {@const hero = getHeroInfo(token.heroId)}
          {@const isActive = token.heroId === getCurrentHeroId()}
          {@const startTile = dungeon.tiles.find((t) => t.tileType === "start")}
          {@const tokenRotation = getHeroTokenRotation(token.heroId)}
          {@const heroHpState = heroHp.find((h) => h.heroId === token.heroId)}
          {@const isRemovedFromPlay = heroHpState?.removedFromPlay ?? false}
          {#if hero && startTile && !isRemovedFromPlay}
            {@const startTilePos = getTilePixelPosition(startTile, mapBounds)}
            <div
              class="hero-token"
              class:active={isActive}
              data-testid="hero-token"
              data-hero-id={token.heroId}
              style="{getHeroTokenStyle(token.position, startTilePos)} --token-rotation: {tokenRotation}deg;"
            >
              <img
                src={assetPath(hero.imagePath)}
                alt={hero.name}
                class="token-image"
              />
              <span class="token-label">{hero.name}</span>
            </div>
          {/if}
        {/each}

        <!-- Monster tokens -->
        {#each monsters as monsterState (monsterState.instanceId)}
          {@const isTargetable = turnState.currentPhase === "hero-phase" && 
                                 !mapControlMode && 
                                 getTargetableMonstersForCurrentHero().some(m => m.instanceId === monsterState.instanceId)}
          {@const isSelected = selectedTargetId === monsterState.instanceId && selectedTargetType === 'monster'}
          {@const isSelectableForRelocation = pendingMonsterRelocation?.step === 'monster-selection' && 
                                               getSelectableMonsters().includes(monsterState.instanceId)}
          <MonsterToken
            monster={monsterState}
            cellSize={TILE_CELL_SIZE}
            tileOffsetX={TOKEN_OFFSET_X}
            tileOffsetY={TOKEN_OFFSET_Y}
            tilePixelOffset={getTilePixelOffsetById(monsterState.tileId)}
            isTargetable={isTargetable || isSelectableForRelocation}
            isSelected={isSelected || (pendingMonsterRelocation?.selectedMonsterInstanceId === monsterState.instanceId)}
            onClick={() => {
              if (isSelectableForRelocation) {
                handleMonsterRelocationMonsterClicked(monsterState.instanceId);
              } else {
                handleTargetClick(monsterState.instanceId, 'monster');
              }
            }}
          />
        {/each}
        
        <!-- Trap markers -->
        {#each traps as trap (trap.id)}
          <TrapMarker
            trap={trap}
            cellSize={TILE_CELL_SIZE}
            tileOffsetX={TOKEN_OFFSET_X}
            tileOffsetY={TOKEN_OFFSET_Y}
            tilePixelOffset={{ x: 0, y: 0 }}
          />
        {/each}
        
        <!-- Hazard markers -->
        {#each hazards as hazard (hazard.id)}
          <HazardMarker
            hazard={hazard}
            cellSize={TILE_CELL_SIZE}
            tileOffsetX={TOKEN_OFFSET_X}
            tileOffsetY={TOKEN_OFFSET_Y}
            tilePixelOffset={{ x: 0, y: 0 }}
          />
        {/each}
        
        <!-- Treasure token markers -->
        {#each treasureTokens as treasureToken (treasureToken.id)}
          <TreasureTokenMarker
            treasureToken={treasureToken}
            cellSize={TILE_CELL_SIZE}
            tileOffsetX={TOKEN_OFFSET_X}
            tileOffsetY={TOKEN_OFFSET_Y}
            tilePixelOffset={{ x: 0, y: 0 }}
          />
        {/each}
        
        <!-- Board tokens (Blade Barrier, Flaming Sphere, etc.) -->
        {#each boardTokens as token (token.id)}
          <BoardTokenMarker
            {token}
            cellSize={TILE_CELL_SIZE}
            tileOffsetX={TOKEN_OFFSET_X}
            tileOffsetY={TOKEN_OFFSET_Y}
            tilePixelOffset={{ x: 0, y: 0 }}
            onClick={token.type === 'flaming-sphere' && token.ownerId === getCurrentHeroId() && turnState.currentPhase === 'hero-phase' 
              ? handleBoardTokenClick 
              : undefined}
          />
        {/each}
      </div>

      <!-- Board controls -->
      <div class="board-controls">
        <!-- Active Environment Indicator -->
        {#if activeEnvironmentId}
          {@const environmentCard = ENCOUNTER_CARDS.find(c => c.id === activeEnvironmentId)}
          <button 
            class="environment-indicator" 
            data-testid="environment-indicator"
            onclick={handleShowEnvironmentDetail}
            aria-label="View environment card details"
          >
            <div class="environment-icon">🌫️</div>
            <div class="environment-name">
              {environmentCard?.name ?? 'Environment'}
            </div>
          </button>
        {/if}
        
        <!-- Objective Display -->
        <button 
          class="objective-display" 
          data-testid="objective-display"
          onclick={handleShowScenarioIntroduction}
          aria-label="View scenario details"
        >
          <span class="objective-label">
            <TargetIcon size={16} ariaLabel="Objective" /> Objective:
          </span>
          <span class="objective-text">{scenario.objective}</span>
          <span class="objective-progress" data-testid="objective-progress">
            {scenario.monstersDefeated} / {scenario.monstersToDefeat} defeated
          </span>
        </button>
        
        <!-- Party Resources (XP & Healing Surges) -->
        <div class="party-resources">
          <XPCounter xp={partyResources.xp} />
          <HealingSurgeCounter surges={partyResources.healingSurges} />
          <TileDeckCounter tileCount={dungeon.tileDeck.length} />
        </div>

        <!-- Zoom Controls (only shown when in map control mode) -->
        {#if mapControlMode}
          <div class="map-zoom-controls" data-testid="map-zoom-controls">
            <button
              class="zoom-button"
              data-testid="zoom-out-button"
              onclick={handleZoomOut}
              disabled={manualZoom <= MAP_ZOOM_MIN}
              aria-label="Zoom out"
            >
              −
            </button>
            <input
              type="range"
              class="zoom-slider"
              data-testid="zoom-slider"
              min={MAP_ZOOM_MIN}
              max={MAP_ZOOM_MAX}
              step={MAP_ZOOM_STEP}
              value={manualZoom}
              oninput={handleZoomSlider}
              aria-label="Zoom level"
            />
            <button
              class="zoom-button"
              data-testid="zoom-in-button"
              onclick={handleZoomIn}
              disabled={manualZoom >= MAP_ZOOM_MAX}
              aria-label="Zoom in"
            >
              +
            </button>
            <span class="zoom-level" data-testid="zoom-level">
              {Math.round(manualZoom * 100)}%
            </span>
            <button
              class="reset-view-button"
              data-testid="reset-view-button"
              onclick={resetMapView}
              aria-label="Reset map view"
            >
              ↺
            </button>
          </div>
        {/if}

        <!-- Dazed Status Warning (shown during hero phase when hero is Dazed) -->
        {#if turnState.currentPhase === "hero-phase" && isCurrentHeroDazed() && !mapControlMode}
          <div class="dazed-warning" data-testid="dazed-warning">
            <div class="dazed-warning-header">
              <span class="dazed-icon">{STATUS_EFFECT_DEFINITIONS.dazed.icon}</span>
              <span class="dazed-title">DAZED</span>
            </div>
            <div class="dazed-message">
              {#if heroTurnActions.actionsTaken.length === 0}
                Choose ONE action: Move OR Attack
              {:else}
                Action limit reached (Dazed)
              {/if}
            </div>
          </div>
        {/if}

        <!-- Move-After-Attack Hero Selection (shown when multiple heroes on tile) -->
        {#if pendingMoveAfterAttack && !pendingMoveAfterAttack.selectedHeroId && pendingMoveAfterAttack.availableHeroes.length > 1 && !attackResult && !mapControlMode}
          <div class="hero-selection-overlay" data-testid="hero-selection-overlay">
            <div class="hero-selection-dialog">
              <div class="hero-selection-message">
                ⚔️ Choose which hero moves {pendingMoveAfterAttack.moveDistance} squares
              </div>
              <div class="hero-selection-buttons">
                {#each pendingMoveAfterAttack.availableHeroes as heroId (heroId)}
                  {@const hero = getHeroInfo(heroId)}
                  {#if hero}
                    <button
                      class="hero-selection-button"
                      data-testid="select-hero-{heroId}"
                      onclick={() => handleSelectHeroForMoveAfterAttack(heroId)}
                    >
                      <img src={assetPath(hero.imagePath)} alt={hero.name} class="hero-portrait" />
                      <span>{hero.name}</span>
                    </button>
                  {/if}
                {/each}
              </div>
              <button
                class="cancel-button"
                data-testid="cancel-hero-selection"
                onclick={handleCancelMoveAfterAttack}
              >
                Skip Movement
              </button>
            </div>
          </div>
        {/if}

        <!-- Move-After-Attack Controls (shown when hero selected or only one hero) -->
        {#if pendingMoveAfterAttack && pendingMoveAfterAttack.selectedHeroId && !mapControlMode}
          <div class="move-after-attack-controls" data-testid="move-after-attack-controls">
            <div class="move-after-attack-message" data-testid="move-after-attack-message">
              ⚔️ After attack: Move ally up to {pendingMoveAfterAttack.moveDistance} squares
            </div>
            <button
              class="complete-move-button"
              data-testid="complete-move-after-attack"
              onclick={handleCompleteMoveAfterAttack}
            >
              <CheckIcon size={14} ariaLabel="Complete" /> Complete Move
            </button>
            <button
              class="cancel-button"
              data-testid="cancel-move-after-attack"
              onclick={handleCancelMoveAfterAttack}
            >
              Skip Movement
            </button>
          </div>
        {/if}

      </div>
    </div>

  <!-- Player panels as overlays positioned in corners based on edge -->
  {#each selectedHeroes as hero (hero.id)}
    {@const heroHpState = getHeroHpState(hero.id)}
    {@const controlledMonsters = getMonstersForHero(hero.id)}
    {@const isHeroActive = isActiveHero(hero.id)}
    {@const edge = heroEdgeMap[hero.id] || 'bottom'}
    {@const sidePreference = heroSidePreferences[hero.id] || 'left'}
    {@const heroesOnSameEdge = selectedHeroes.filter(h => (heroEdgeMap[h.id] || 'bottom') === edge).length}
    {@const isSinglePlayerOnEdge = heroesOnSameEdge === 1}
    {#if heroHpState}
      <div 
        class="player-panel-overlay player-panel-{edge}" 
        class:player-panel-side-left={!isSinglePlayerOnEdge && sidePreference === 'left'}
        class:player-panel-side-right={!isSinglePlayerOnEdge && sidePreference === 'right'}
        class:single-player-on-edge={isSinglePlayerOnEdge}
        class:blade-barrier-selection-active={pendingBladeBarrier?.heroId === hero.id}
        data-testid="player-panel-{edge}"
        data-hero-id={hero.id}
        data-side-preference={sidePreference}
      >
        <div class="hero-with-monsters-container" data-testid="hero-container-{hero.id}">
          <!-- Monster cards to the left of player card -->
          {#if controlledMonsters.length > 0}
            <div class="monster-cards-left" data-testid="monster-cards-{hero.id}">
              {#each controlledMonsters as monster (monster.instanceId)}
                <MonsterCardMini 
                  {monster}
                  isActivating={activatingMonsterId === monster.instanceId}
                />
              {/each}
            </div>
          {/if}
          <PlayerCard
            {hero}
            {heroHpState}
            heroInventory={heroInventories[hero.id]}
            isActive={isHeroActive}
            turnPhase={isHeroActive ? formatPhase(turnState.currentPhase) : undefined}
            turnNumber={isHeroActive ? turnState.turnNumber : undefined}
            conditions={getStatusDisplayData(heroHpState.statuses ?? [])}
            onUseTreasureItem={(cardId) => handleUseTreasureItem(hero.id, cardId)}
            boardPosition={edge}
          />
          <!-- Turn Progress Card (shown only for active player) -->
          {#if isHeroActive}
            <TurnProgressCard
              currentPhase={turnState.currentPhase}
              turnNumber={turnState.turnNumber}
              heroTurnActions={heroTurnActions}
              monstersToActivate={getMonstersForHero(hero.id).length}
              monstersActivated={villainPhaseMonsterIndex}
              onEndPhase={handleEndPhase}
              endPhaseButtonText={getEndPhaseButtonText()}
              endPhaseButtonDisabled={mapControlMode}
              incrementalMovement={incrementalMovement}
              undoSnapshot={undoSnapshot}
              onCompleteMove={handleCompleteMove}
              onUndo={handleUndo}
              explorationPhaseState={explorationPhase}
              onPlaceTile={handlePlaceTile}
              onAddMonster={handleAddMonster}
            />
          {/if}
          <!-- Power cards to the right of player card -->
          <PlayerPowerCards
            heroPowerCards={heroPowerCards[hero.id]}
            boardPosition={edge}
            {gameState}
            onActivatePowerCard={(cardId) => handleActivatePowerCard(hero.id, cardId)}
            targetableMonsters={isHeroActive ? getTargetableMonstersForCurrentHero() : []}
            onAttackWithCard={isHeroActive ? handleAttackWithCard : undefined}
            bladeBarrierState={pendingBladeBarrier?.heroId === hero.id ? pendingBladeBarrier : null}
            onCancelBladeBarrier={handleBladeBarrierCancel}
            onConfirmBladeBarrier={handleBladeBarrierConfirm}
            flamingSphereState={pendingFlamingSphere?.heroId === hero.id ? pendingFlamingSphere : null}
            onCancelFlamingSphere={handleFlamingSphereCancel}
            onConfirmFlamingSphere={handleFlamingSphereConfirm}
            monsterRelocationState={pendingMonsterRelocation?.heroId === hero.id ? pendingMonsterRelocation : null}
            onCancelMonsterRelocation={handleMonsterRelocationCancel}
            flamingSphereToken={isHeroActive ? boardTokens.find(t => t.type === 'flaming-sphere' && t.ownerId === hero.id) : null}
            heroHasMoved={isHeroActive ? heroTurnActions?.actionsTaken.includes('move') : false}
            onMoveFlamingSphere={isHeroActive ? handleMoveFlamingSphere : undefined}
            onActivateFlamingSphereDamage={isHeroActive ? handleActivateFlamingSphereDamage : undefined}
            cagedAllyInfo={isHeroActive && turnState.currentPhase === "hero-phase" ? (() => {
              const cagedHeroId = getCagedHeroOnSameTile();
              if (!cagedHeroId) return null;
              const cagedHero = AVAILABLE_HEROES.find(h => h.id === cagedHeroId);
              return { heroId: cagedHeroId, heroName: cagedHero?.name || cagedHeroId };
            })() : null}
            onAttemptCageEscape={isHeroActive ? handleAttemptCageEscape : undefined}
            isCurrentHeroCaged={isHeroActive && turnState.currentPhase === "hero-phase" ? isCurrentHeroCaged() : false}
          />
        </div>
      </div>
    {/if}
  {/each}

  <!-- Monster Card Display (shown when monster spawns) -->
  {#if recentlySpawnedMonsterId}
    {@const monsterState = monsters.find(
      (m) => m.instanceId === recentlySpawnedMonsterId,
    )}
    {#if monsterState}
      <MonsterCard
        monsterId={monsterState.monsterId}
        onDismiss={handleDismissMonsterCard}
        edge={getActivePlayerEdge()}
      />
    {/if}
  {/if}

  <!-- Trap Disable Result Display (shown after trap disable attempt) -->
  {#if trapDisableResult}
    <TrapDisableResultDisplay
      result={trapDisableResult}
      onDismiss={handleDismissTrapDisableResult}
    />
  {/if}

  <!-- Combat Result Display (shown after attack) -->
  {#if attackResult}
    {@const currentHeroId = getCurrentHeroId()}
    {@const fullHero = currentHeroId
      ? getFullHeroInfo(currentHeroId)
      : undefined}
    {@const targetMonster = getAttackTargetMonster()}
    {#if fullHero && attackName}
      <CombatResultDisplay
        result={attackResult}
        attackerName={fullHero.name}
        attackName={attackName}
        targetName={targetMonster
          ? getMonsterName(targetMonster.monsterId)
          : "Monster"}
        onDismiss={handleDismissAttackResult}
        edge={getActivePlayerEdge()}
      />
    {:else if !fullHero && attackName}
      <!-- Fallback: Show combat result even if hero info not found (shouldn't happen but defensive) -->
      <CombatResultDisplay
        result={attackResult}
        attackerName={currentHeroId || "Hero"}
        attackName={attackName}
        targetName={targetMonster
          ? getMonsterName(targetMonster.monsterId)
          : "Monster"}
        onDismiss={handleDismissAttackResult}
        edge={getActivePlayerEdge()}
      />
    {/if}
  {/if}

  <!-- Monster Attack Result Display (shown during villain phase) -->
  {#if monsterAttackResult}
    <CombatResultDisplay
      result={monsterAttackResult}
      attackerName={getMonsterAttackerName()}
      attackName="Attack"
      targetName={getMonsterAttackTargetName()}
      onDismiss={handleDismissMonsterAttackResult}
      edge={getActivePlayerEdge()}
    />
  {/if}

  <!-- Monster Move Action Display (shown when monster moves but can't attack) -->
  {#if monsterMoveActionId}
    <MonsterMoveDisplay
      monsterName={getMonsterMoveActionName()}
      onDismiss={handleDismissMonsterMoveAction}
      edge={getMonsterControllerEdge()}
    />
  {/if}

  <!-- Defeat Animation/Notification (shown when monster is defeated and XP is gained) -->
  {#if defeatedMonsterXp !== null && defeatedMonsterName !== null}
    <DefeatAnimation
      monsterName={defeatedMonsterName}
      xpGained={defeatedMonsterXp}
      onDismiss={handleDismissDefeatNotification}
    />
  {/if}

  <!-- Level Up Animation/Notification (shown when hero levels up on nat 20 with 5+ XP) -->
  <!-- Only show after combat result and defeat notification are dismissed -->
  {#if leveledUpHeroId && levelUpOldStats && !attackResult && !defeatedMonsterXp}
    {@const newStats = getLeveledUpHeroStats()}
    {#if newStats}
      <LevelUpAnimation
        heroId={leveledUpHeroId}
        oldStats={levelUpOldStats}
        {newStats}
        onDismiss={handleDismissLevelUpNotification}
      />
    {/if}
  {/if}

  <!-- Healing Surge Animation/Notification (shown when hero uses surge at turn start) -->
  {#if healingSurgeUsedHeroId && healingSurgeHpRestored !== null}
    <HealingSurgeAnimation
      heroId={healingSurgeUsedHeroId}
      hpRestored={healingSurgeHpRestored}
      onDismiss={handleDismissHealingSurgeNotification}
    />
  {/if}

  <!-- Poisoned Damage Notification (shown at start of turn if poisoned) -->
  {#if poisonedDamageNotification}
    {@const hero = AVAILABLE_HEROES.find(h => h.id === poisonedDamageNotification.heroId)}
    {@const heroEdge = heroEdgeMap[poisonedDamageNotification.heroId] || 'bottom'}
    {#if hero}
      <PoisonedDamageNotification
        heroName={hero.name}
        damage={poisonedDamageNotification.damage}
        onDismiss={handleDismissPoisonedDamageNotification}
        edge={heroEdge}
      />
    {/if}
  {/if}

  <!-- Poison Recovery Notification (shown at end of turn for poisoned heroes) -->
  {#if poisonRecoveryNotification}
    {@const hero = AVAILABLE_HEROES.find(h => h.id === poisonRecoveryNotification.heroId)}
    {@const heroEdge = heroEdgeMap[poisonRecoveryNotification.heroId] || 'bottom'}
    {#if hero}
      <PoisonRecoveryNotification
        heroName={hero.name}
        roll={poisonRecoveryNotification.roll}
        recovered={poisonRecoveryNotification.recovered}
        onDismiss={handleDismissPoisonRecoveryNotification}
        edge={heroEdge}
      />
    {/if}
  {/if}

  <!-- Encounter Effect Notification (shown after special encounter card effects) -->
  {#if encounterEffectMessage}
    {@const activeEdge = getActivePlayerEdge()}
    {@const initialRotation = getDialogRotationFromEdge(activeEdge)}
    <EncounterEffectNotification
      message={encounterEffectMessage}
      onDismiss={handleDismissEncounterEffectMessage}
      initialRotation={initialRotation}
    />
  {/if}

  <!-- Exploration Phase Notification (shown when transitioning to exploration phase) -->
  {#if explorationPhaseMessage}
    <ExplorationPhaseNotification
      message={explorationPhaseMessage}
      onDismiss={handleDismissExplorationPhaseMessage}
      edge={getActivePlayerEdge()}
    />
  {/if}

  <!-- Encounter Card Display (shown during villain phase when no exploration occurred) -->
  {#if drawnEncounter}
    <EncounterCard
      encounter={drawnEncounter}
      partyXp={partyResources.xp}
      onDismiss={handleDismissEncounterCard}
      onCancel={handleCancelEncounterCard}
      edge={getActivePlayerEdge()}
    />
  {/if}

  <!-- Encounter Result Popup (shown after encounter card is dismissed to show effect results) -->
  {#if encounterResult && !drawnEncounter}
    {@const encounterCard = ENCOUNTER_CARDS.find(e => e.id === encounterResult.encounterId)}
    {#if encounterCard}
      <EncounterResultPopup
        encounter={encounterCard}
        targets={encounterResult.targets}
        onDismiss={handleDismissEncounterResult}
      />
    {/if}
  {/if}

  <!-- Environment Card Detail Popup (shown when environment indicator is clicked) -->
  {#if showEnvironmentDetail && activeEnvironmentId}
    {@const environmentCard = ENCOUNTER_CARDS.find(c => c.id === activeEnvironmentId)}
    {#if environmentCard}
      <EncounterCard
        encounter={environmentCard}
        partyXp={partyResources.xp}
        onDismiss={handleDismissEnvironmentDetail}
        edge={getActivePlayerEdge()}
      />
    {/if}
  {/if}

  <!-- Action Surge Prompt (shown at start of hero's turn when HP = 0 with surges available) -->
  {#if showActionSurgePrompt}
    {@const currentHeroId = getCurrentHeroId()}
    {@const currentHeroHp = currentHeroId ? heroHp.find(h => h.heroId === currentHeroId) : undefined}
    {#if currentHeroId && currentHeroHp}
      <ActionSurgePrompt
        heroId={currentHeroId}
        maxHp={currentHeroHp.maxHp}
        surgeValue={currentHeroHp.surgeValue}
        surgesToRemaining={partyResources.healingSurges}
        onUse={handleUseActionSurge}
        onSkip={handleSkipActionSurge}
      />
    {/if}
  {/if}

  <!-- Treasure Card Display (shown when treasure is drawn on monster defeat) -->
  <!-- Only show after combat result and defeat notification are dismissed -->
  {#if drawnTreasure && !attackResult && defeatedMonsterXp === null}
    <TreasureCard
      treasure={drawnTreasure}
      heroes={selectedHeroes.map(h => ({ id: h.id, name: h.name }))}
      onAssign={handleAssignTreasure}
      onDismiss={handleDismissTreasure}
      edge={getActivePlayerEdge()}
    />
  {/if}

  <!-- Monster Choice Modal (shown when encounter effect requires player to choose a monster) -->
  {#if pendingMonsterChoice && monsters.length > 0}
    <MonsterChoiceModal
      monsters={monsters}
      encounterName={pendingMonsterChoice.encounterName}
      context={pendingMonsterChoice.context}
      onSelect={handleSelectMonster}
      onCancel={handleCancelMonsterChoice}
      edge={getActivePlayerEdge()}
    />
  {/if}

  <!-- Scenario Introduction (shown when map is first displayed or when clicking objective panel) -->
  {#if showScenarioIntroduction}
    <ScenarioIntroduction
      title={scenario.title}
      description={scenario.description}
      objective={scenario.objective}
      instructions={scenario.instructions}
      onDismiss={handleDismissScenarioIntroduction}
    />
  {/if}
</div>

<style>
  /* CSS Custom Properties */
  :root {
    --placement-color-r: 255;
    --placement-color-g: 215;
    --placement-color-b: 0;
  }

  .game-board {
    position: relative;
    height: 100vh;
    width: 100vw;
    background: #1a1a2e;
    color: #fff;
    overflow: hidden;
  }

  /* Container for hero with monsters to the left */
  .hero-with-monsters-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  /* Rotate hero containers based on edge position */
  .player-panel-top .hero-with-monsters-container {
    transform: rotate(180deg);
    transform-origin: center;
  }

  .player-panel-left .hero-with-monsters-container {
    transform: rotate(90deg);
    transform-origin: center;
  }

  .player-panel-right .hero-with-monsters-container {
    transform: rotate(-90deg);
    transform-origin: center;
  }

  /* Monster cards positioned to the left of player card */
  .monster-cards-left {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  /* Player panel overlays - positioned along edges */
  .player-panel-overlay {
    position: absolute;
    z-index: 100;
    background: rgba(0, 0, 0, 0.5);
    padding: 0.75rem;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    backdrop-filter: blur(4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
    max-width: calc(100vw - 1.5rem); /* Prevent horizontal overflow */
    max-height: calc(100vh - 1.5rem); /* Prevent vertical overflow */
    overflow: visible; /* Allow child components to handle their own overflow */
  }

  /* When blade barrier selection is active, keep everything clickable */
  /* The board tiles will still be clickable because they are positioned above in z-index */
  .player-panel-overlay.blade-barrier-selection-active {
    /* Don't disable pointer events - let everything be clickable */
  }

  /* Top edge - at top center */
  .player-panel-top {
    top: 0.75rem;
    left: 0;
    right: 0;
    margin: 0 auto;
    width: fit-content;
  }

  /* Bottom edge - at bottom center */
  .player-panel-bottom {
    bottom: 0.75rem;
    left: 0;
    right: 0;
    margin: 0 auto;
    width: fit-content;
  }

  /* Left edge - at left center */
  .player-panel-left {
    left: 0.75rem;
    top: 0;
    bottom: 0;
    margin: auto 0;
    height: fit-content;
  }

  /* Right edge - at right center */
  .player-panel-right {
    right: 0.75rem;
    top: 0;
    bottom: 0;
    margin: auto 0;
    height: fit-content;
  }
  
  /* Side-by-side positioning for top/bottom edges */
  .player-panel-top.player-panel-side-left {
    left: 0.75rem;
    right: auto;
    margin: 0;
  }
  
  .player-panel-top.player-panel-side-right {
    left: auto;
    right: 0.75rem;
    margin: 0;
  }
  
  .player-panel-bottom.player-panel-side-left {
    left: 0.75rem;
    right: auto;
    margin: 0;
  }
  
  .player-panel-bottom.player-panel-side-right {
    left: auto;
    right: 0.75rem;
    margin: 0;
  }
  
  /* Side-by-side positioning for left/right edges */
  .player-panel-left.player-panel-side-left {
    top: 0.75rem;
    bottom: auto;
    margin: 0;
  }
  
  .player-panel-left.player-panel-side-right {
    top: auto;
    bottom: 0.75rem;
    margin: 0;
  }
  
  .player-panel-right.player-panel-side-left {
    top: 0.75rem;
    bottom: auto;
    margin: 0;
  }
  
  .player-panel-right.player-panel-side-right {
    top: auto;
    bottom: 0.75rem;
    margin: 0;
  }
  
  /* Single player positioning - more central with space for sub-panels */
  /* For single players on left/right edges, position more centrally (not at extremes) */
  .player-panel-left.single-player-on-edge {
    top: 15vh;  /* Position away from top edge with room for expansion */
    bottom: auto;
    margin: 0;
  }
  
  .player-panel-right.single-player-on-edge {
    top: 15vh;  /* Position away from top edge with room for expansion */
    bottom: auto;
    margin: 0;
  }
  
  /* For single players on top/bottom edges, ensure they stay centered but visible */
  /* The default centering (margin: 0 auto) works well for top/bottom single players */
  /* No override needed - they're already well-positioned */

  /* Board container - fullscreen, map fills entire viewport */
  .board-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
  }

  .dungeon-map {
    position: relative;
    transition: transform 0.3s ease-out;
    transform-origin: center center;
    /* Prevent default browser touch zoom/pan behavior */
    touch-action: none;
  }

  .placed-tile {
    position: absolute;
    display: inline-block;
  }

  .placed-tile.start-tile {
    z-index: 1;
  }

  .placed-tile.newly-placed {
    animation: tileAppear 2s ease-out;
  }

  /* Disable pointer events on tile when squares are being selected */
  .placed-tile.has-selectable-squares {
    pointer-events: none;
  }

  /* But re-enable on the selectable squares themselves */
  .placed-tile.has-selectable-squares .selectable-square {
    pointer-events: all;
  }

  @keyframes tileAppear {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .tile-image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  /* Disable pointer events on tile image when squares are being selected */
  .has-selectable-squares .tile-image {
    pointer-events: none;
  }

  .movement-overlay-container {
    position: absolute;
    z-index: 5;
  }

  .placement-overlay-container {
    position: absolute;
    z-index: 5;
  }

  /* Override MovementOverlay styling for placement mode */
  .placement-overlay-container :global(.move-square) {
    background: rgba(var(--placement-color-r), var(--placement-color-g), var(--placement-color-b), 0.4);
    border-color: rgba(var(--placement-color-r), var(--placement-color-g), var(--placement-color-b), 0.8);
  }

  .placement-overlay-container :global(.move-square:hover) {
    background: rgba(var(--placement-color-r), var(--placement-color-g), var(--placement-color-b), 0.6);
    border-color: rgba(var(--placement-color-r), var(--placement-color-g), var(--placement-color-b), 1);
    box-shadow: 0 0 10px rgba(var(--placement-color-r), var(--placement-color-g), var(--placement-color-b), 0.6);
  }

  .hero-token {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    transform: translate(-50%, -50%) rotate(var(--token-rotation, 0deg));
    z-index: 10;
    transition: all 0.3s ease-out;
  }

  .hero-token.active .token-image {
    box-shadow: 0 0 10px 3px gold;
  }

  .token-image {
    width: 40px;
    height: 40px;
    object-fit: contain;
    border-radius: 50%;
    border: 2px solid #ffd700;
    background: rgba(0, 0, 0, 0.7);
    transition: box-shadow 0.3s ease-out;
  }

  .token-label {
    font-size: 0.75rem;
    background: rgba(0, 0, 0, 0.8);
    padding: 2px 6px;
    border-radius: 4px;
    margin-top: 2px;
    white-space: nowrap;
  }

  /* Board controls container */
  .board-controls {
    position: absolute;
    bottom: 0.5rem;
    right: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-end;
  }

  /* Objective display */
  .objective-display {
    background: rgba(0, 0, 0, 0.7);
    padding: 0.5rem 1rem;
    border-radius: 8px;
    border: 1px solid #ffd700;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
    text-align: right;
  }

  .objective-display:hover {
    background: rgba(0, 0, 0, 0.85);
    border-color: #ffed4e;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
  }

  .objective-display:active {
    transform: translateY(0);
  }

  .objective-label {
    font-size: 0.75rem;
    color: #ffd700;
    font-weight: bold;
  }

  .objective-text {
    font-size: 0.85rem;
    color: #fff;
  }

  .objective-progress {
    font-size: 0.75rem;
    color: #4ade80;
    font-weight: bold;
  }

  /* Party resources container */
  .party-resources {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
  }


  /* Map control styles */
  .dungeon-map.map-control-active {
    cursor: grab;
  }

  .dungeon-map.map-control-active:active {
    cursor: grabbing;
  }

  /* Zoom controls container */
  .map-zoom-controls {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    background: rgba(0, 0, 0, 0.7);
    padding: 0.5rem;
    border-radius: 8px;
    border: 1px solid #ffa500;
  }

  /* Zoom buttons */
  .zoom-button {
    width: 32px;
    height: 32px;
    font-size: 1.25rem;
    font-weight: bold;
    background: rgba(100, 100, 150, 0.8);
    color: #fff;
    border: 1px solid #7777aa;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease-out;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .zoom-button:hover:not(:disabled) {
    background: rgba(120, 120, 180, 0.9);
  }

  .zoom-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Zoom slider */
  .zoom-slider {
    width: 100px;
    height: 8px;
    appearance: none;
    background: rgba(100, 100, 150, 0.5);
    border-radius: 4px;
    cursor: pointer;
  }

  .zoom-slider::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    background: #ffa500;
    border-radius: 50%;
    cursor: pointer;
    transition: transform 0.2s ease-out;
  }

  .zoom-slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
  }

  .zoom-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: #ffa500;
    border: none;
    border-radius: 50%;
    cursor: pointer;
  }

  /* Zoom level display */
  .zoom-level {
    font-size: 0.75rem;
    color: #fff;
    min-width: 40px;
    text-align: center;
  }

  /* Reset view button */
  .reset-view-button {
    width: 32px;
    height: 32px;
    font-size: 1rem;
    background: rgba(68, 68, 68, 0.8);
    color: #ccc;
    border: 1px solid #555;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease-out;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .reset-view-button:hover {
    background: rgba(85, 85, 85, 0.9);
    color: #fff;
  }

  /* Dazed warning display */
  .dazed-warning {
    background: rgba(220, 53, 69, 0.15);
    border: 2px solid rgba(220, 53, 69, 0.6);
    border-radius: 8px;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
    animation: dazed-pulse 2s ease-in-out infinite;
  }

  @keyframes dazed-pulse {
    0%, 100% {
      border-color: rgba(220, 53, 69, 0.6);
      box-shadow: 0 0 0 rgba(220, 53, 69, 0.3);
    }
    50% {
      border-color: rgba(220, 53, 69, 0.9);
      box-shadow: 0 0 10px rgba(220, 53, 69, 0.5);
    }
  }

  .dazed-warning-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .dazed-icon {
    font-size: 1.5rem;
  }

  .dazed-title {
    font-size: 1rem;
    font-weight: bold;
    color: #dc3545;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .dazed-message {
    font-size: 0.85rem;
    color: #fff;
    text-align: center;
    line-height: 1.3;
  }

  /* Move-after-attack controls */
  .move-after-attack-controls {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-end;
    margin-bottom: 0.5rem;
  }

  .move-after-attack-message {
    background: rgba(0, 0, 0, 0.7);
    padding: 0.5rem 1rem;
    border-radius: 6px;
    border: 1px solid #ffa500;
    font-size: 0.85rem;
    color: #ffa500;
    text-align: center;
  }

  .cancel-button {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
    background: rgba(255, 69, 0, 0.8);
    color: #fff;
    border: 1px solid #ff4500;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s ease-out;
    min-width: 44px;
    min-height: 44px;
  }

  .cancel-button:hover {
    background: rgba(255, 69, 0, 0.95);
    box-shadow: 0 0 10px rgba(255, 69, 0, 0.4);
  }

  /* Hero selection overlay for move-after-attack */
  .hero-selection-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .hero-selection-dialog {
    background: rgba(20, 20, 30, 0.95);
    border: 2px solid #ffa500;
    border-radius: 12px;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 600px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
  }

  .hero-selection-message {
    font-size: 1.1rem;
    color: #ffa500;
    text-align: center;
    font-weight: bold;
  }

  .hero-selection-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    justify-content: center;
  }

  .hero-selection-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: rgba(30, 144, 255, 0.2);
    border: 2px solid #1e90ff;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease-out;
    min-width: 120px;
  }

  .hero-selection-button:hover {
    background: rgba(30, 144, 255, 0.4);
    border-color: #4fa3ff;
    box-shadow: 0 4px 16px rgba(30, 144, 255, 0.5);
    transform: translateY(-2px);
  }

  .hero-selection-button .hero-portrait {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    border: 2px solid #1e90ff;
  }

  .hero-selection-button span {
    color: #fff;
    font-size: 0.9rem;
    font-weight: bold;
  }

  /* Environment indicator */
  .environment-indicator {
    background: rgba(139, 92, 246, 0.9);
    border: 2px solid #8b5cf6;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    display: flex;
    gap: 0.75rem;
    align-items: center;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
    min-width: 150px;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s ease;
  }

  .environment-indicator:hover {
    background: rgba(139, 92, 246, 1);
    border-color: #a78bfa;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(139, 92, 246, 0.6);
  }

  .environment-icon {
    font-size: 1.5rem;
  }

  .environment-name {
    font-size: 0.9rem;
    font-weight: bold;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  .selectable-tile {
    cursor: pointer;
  }

  .selectable-tile .tile-selection-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(123, 31, 162, 0.4);
    border: 3px solid #bb86fc;
    pointer-events: none;
    animation: pulse-border 2s ease-in-out infinite;
  }

  @keyframes pulse-border {
    0%, 100% {
      border-color: #bb86fc;
      box-shadow: 0 0 20px rgba(123, 31, 162, 0.6);
    }
    50% {
      border-color: #9c27b0;
      box-shadow: 0 0 40px rgba(123, 31, 162, 0.9);
    }
  }

  .square-selection-overlay-container {
    position: absolute;
    pointer-events: none;
    z-index: 5; /* Same as movement overlay to ensure visibility above tiles */
  }

  .selectable-square {
    position: absolute;
    background: rgba(30, 144, 255, 0.5);
    border: 3px solid rgba(30, 144, 255, 0.9);
    border-radius: 4px;
    cursor: pointer;
    pointer-events: all;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: bold;
    font-size: 1.2rem;
    animation: pulseHighlight 2s ease-in-out infinite;
    box-shadow: 0 0 15px rgba(30, 144, 255, 0.7), inset 0 0 10px rgba(30, 144, 255, 0.3);
  }

  @keyframes pulseHighlight {
    0%, 100% {
      border-color: rgba(30, 144, 255, 0.9);
      box-shadow: 0 0 15px rgba(30, 144, 255, 0.7), inset 0 0 10px rgba(30, 144, 255, 0.3);
    }
    50% {
      border-color: rgba(30, 144, 255, 1);
      box-shadow: 0 0 25px rgba(30, 144, 255, 1), inset 0 0 15px rgba(30, 144, 255, 0.5);
    }
  }

  /* Respect user's motion preferences */
  @media (prefers-reduced-motion: reduce) {
    .selectable-square {
      animation: none;
    }
  }

  .selectable-square:hover {
    background: rgba(30, 144, 255, 0.7);
    border-color: rgba(30, 144, 255, 1);
    transform: scale(1.05);
    animation: none;
    box-shadow: 0 0 25px rgba(30, 144, 255, 1), inset 0 0 15px rgba(30, 144, 255, 0.6);
  }

  .selectable-square.selected {
    background: rgba(30, 144, 255, 0.85);
    border-color: rgba(30, 144, 255, 1);
    border-width: 4px;
    animation: none;
    box-shadow: 0 0 20px rgba(30, 144, 255, 1), inset 0 0 10px rgba(0, 0, 0, 0.5);
  }

  /* Flaming Sphere specific square styling */
  .selectable-square.flaming-sphere-square {
    background: rgba(255, 102, 0, 0.5);
    border-color: rgba(255, 102, 0, 0.9);
    animation: flaming-sphere-pulse 2s ease-in-out infinite;
  }

  @keyframes flaming-sphere-pulse {
    0%, 100% {
      border-color: rgba(255, 102, 0, 0.9);
      box-shadow: 0 0 15px rgba(255, 102, 0, 0.7), inset 0 0 10px rgba(255, 102, 0, 0.3);
    }
    50% {
      border-color: rgba(255, 102, 0, 1);
      box-shadow: 0 0 25px rgba(255, 102, 0, 1), inset 0 0 15px rgba(255, 102, 0, 0.5);
    }
  }

  .selectable-square.flaming-sphere-square:hover {
    background: rgba(255, 102, 0, 0.7);
    border-color: rgba(255, 102, 0, 1);
    animation: none;
    box-shadow: 0 0 25px rgba(255, 102, 0, 1), inset 0 0 15px rgba(255, 102, 0, 0.6);
  }

  .selectable-square.flaming-sphere-square.selected {
    background: rgba(255, 102, 0, 0.85);
    border-color: rgba(255, 102, 0, 1);
    border-width: 4px;
    animation: none;
    box-shadow: 0 0 20px rgba(255, 102, 0, 1), inset 0 0 10px rgba(0, 0, 0, 0.5);
  }

  .token-preview {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .token-preview .token-emoji {
    font-size: 2.5rem;
    filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.9));
    user-select: none;
    position: absolute;
    aria-hidden: true;
  }

  .selection-number {
    background: #7b1fa2;
    border: 2px solid white;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
    position: absolute;
    bottom: 5%;
    right: 5%;
    z-index: 2;
  }
</style>
