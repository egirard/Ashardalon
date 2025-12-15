<script lang="ts">
  import { store } from "../store";
  import {
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
    shouldAutoEndHeroTurn,
    dismissLevelUpNotification,
    dismissHealingSurgeNotification,
    dismissEncounterEffectMessage,
    dismissExplorationPhaseMessage,
    showPendingMonster,
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
    type MultiAttackState,
    type PendingMoveAttackState,
    type IncrementalMovementState,
    type UndoSnapshot,
  } from "../store/gameSlice";
  import type { EdgePosition } from "../store/heroesSlice";
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
  import TrapMarker from "./TrapMarker.svelte";
  import HazardMarker from "./HazardMarker.svelte";
  import BoardTokenMarker from "./BoardTokenMarker.svelte";
  import PowerCardAttackPanel from "./PowerCardAttackPanel.svelte";
  import CombatResultDisplay from "./CombatResultDisplay.svelte";
  import MonsterMoveDisplay from "./MonsterMoveDisplay.svelte";
  import XPCounter from "./XPCounter.svelte";
  import HealingSurgeCounter from "./HealingSurgeCounter.svelte";
  import DefeatAnimation from "./DefeatAnimation.svelte";
  import LevelUpAnimation from "./LevelUpAnimation.svelte";
  import HealingSurgeAnimation from "./HealingSurgeAnimation.svelte";
  import EncounterEffectNotification from "./EncounterEffectNotification.svelte";
  import ExplorationPhaseNotification from "./ExplorationPhaseNotification.svelte";
  import ActionSurgePrompt from "./ActionSurgePrompt.svelte";
  import TreasureCard from "./TreasureCard.svelte";
  import PlayerCard from "./PlayerCard.svelte";
  import PlayerPowerCards from "./PlayerPowerCards.svelte";
  import FeedbackButton from "./FeedbackButton.svelte";
  import CornerControls from "./CornerControls.svelte";
  import {
    resolveAttack,
    getAdjacentMonsters,
    getMonsterAC,
    applyItemBonusesToAttack,
    calculateTotalSpeed,
    getMonstersWithinRange,
    getMonstersOnSameTile,
  } from "../store/combat";
  import { findTileAtPosition } from "../store/movement";
  import { getPowerCardById, type HeroPowerCards } from "../store/powerCards";
  import { usePowerCard } from "../store/heroesSlice";
  import { parseActionCard, requiresMultiAttack } from "../store/actionCardParser";
  import type { TreasureCard as TreasureCardType, HeroInventory } from "../store/treasure";
  import { getStatusDisplayData } from "../store/statusEffects";

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
  let scenario: ScenarioState = $state({ monstersDefeated: 0, monstersToDefeat: 2, objective: "Defeat 2 monsters" });
  let partyResources: PartyResources = $state({ xp: 0, healingSurges: 2 });
  let defeatedMonsterXp: number | null = $state(null);
  let defeatedMonsterName: string | null = $state(null);
  let leveledUpHeroId: string | null = $state(null);
  let levelUpOldStats: HeroHpState | null = $state(null);
  let healingSurgeUsedHeroId: string | null = $state(null);
  let healingSurgeHpRestored: number | null = $state(null);
  let encounterEffectMessage: string | null = $state(null);
  let explorationPhaseMessage: string | null = $state(null);
  let recentlyPlacedTileId: string | null = $state(null);
  let pendingMonsterDisplayId: string | null = $state(null);
  let boardContainerRef: HTMLDivElement | null = $state(null);
  let heroPowerCards: Record<string, HeroPowerCards> = $state({});
  let attackName: string | null = $state(null);
  let drawnEncounter: EncounterCardType | null = $state(null);
  let activeEnvironmentId: string | null = $state(null);
  let traps: import("../store/types").TrapState[] = $state([]);
  let hazards: import("../store/types").HazardState[] = $state([]);
  let boardTokens: import("../store/types").BoardTokenState[] = $state([]);
  let showActionSurgePrompt: boolean = $state(false);
  let multiAttackState: MultiAttackState | null = $state(null);
  let pendingMoveAttack: PendingMoveAttackState | null = $state(null);
  let drawnTreasure: TreasureCardType | null = $state(null);
  let heroInventories: Record<string, HeroInventory> = $state({});
  let incrementalMovement: IncrementalMovementState | null = $state(null);
  let undoSnapshot: UndoSnapshot | null = $state(null);

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
      heroTokens = state.game.heroTokens;
      selectedHeroes = state.heroes.selectedHeroes;
      heroEdgeMap = state.heroes.heroEdgeMap;
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
      recentlyPlacedTileId = state.game.recentlyPlacedTileId;
      pendingMonsterDisplayId = state.game.pendingMonsterDisplayId;
      heroPowerCards = state.heroes.heroPowerCards;
      attackName = state.game.attackName;
      drawnEncounter = state.game.drawnEncounter;
      activeEnvironmentId = state.game.activeEnvironmentId;
      traps = state.game.traps;
      hazards = state.game.hazards;
      boardTokens = state.game.boardTokens;
      showActionSurgePrompt = state.game.showActionSurgePrompt;
      multiAttackState = state.game.multiAttackState;
      pendingMoveAttack = state.game.pendingMoveAttack;
      drawnTreasure = state.game.drawnTreasure;
      heroInventories = state.game.heroInventories;
      incrementalMovement = state.game.incrementalMovement;
      undoSnapshot = state.game.undoSnapshot;
    });

    // Initialize state
    const state = store.getState();
    heroTokens = state.game.heroTokens;
    selectedHeroes = state.heroes.selectedHeroes;
    heroEdgeMap = state.heroes.heroEdgeMap;
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
    recentlyPlacedTileId = state.game.recentlyPlacedTileId;
    pendingMonsterDisplayId = state.game.pendingMonsterDisplayId;
    heroPowerCards = state.heroes.heroPowerCards;
    attackName = state.game.attackName;
    drawnEncounter = state.game.drawnEncounter;
    activeEnvironmentId = state.game.activeEnvironmentId;
    traps = state.game.traps;
    hazards = state.game.hazards;
    boardTokens = state.game.boardTokens;
    showActionSurgePrompt = state.game.showActionSurgePrompt;
    multiAttackState = state.game.multiAttackState;
    pendingMoveAttack = state.game.pendingMoveAttack;
    drawnTreasure = state.game.drawnTreasure;
    heroInventories = state.game.heroInventories;
    incrementalMovement = state.game.incrementalMovement;
    undoSnapshot = state.game.undoSnapshot;

    return unsubscribe;
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
  // This creates a sequential animation: tile fades in (2s), then monster card shows (1s + 2s fade)
  $effect(() => {
    if (!pendingMonsterDisplayId) return;
    
    // Wait 2 seconds for tile fade-in animation to complete
    const timer = setTimeout(() => {
      store.dispatch(showPendingMonster());
    }, 2000);
    
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
      // Don't subtract START_TILE_NORTH_OFFSET_DIFF for south tiles.
      // That adjustment is for aligning the start tile with north tiles,
      // but south tiles should align with the start tile's south edge.
      y =
        northTileCount * NORMAL_TILE_HEIGHT +
        START_TILE_HEIGHT +
        (tile.position.row - 1) * NORMAL_TILE_HEIGHT;
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
  
  // Calculate base scale to fit the map in the available space
  $effect(() => {
    if (boardContainerRef) {
      const calculateBaseScale = () => {
        const container = boardContainerRef;
        if (!container) return;

        // Get available space (accounting for padding)
        const availableWidth = container.clientWidth - CONTAINER_PADDING;
        const availableHeight = container.clientHeight - CONTAINER_PADDING;

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

  // Get all heroes that joined from a specific edge
  function getHeroesForEdge(edge: EdgePosition): Hero[] {
    return selectedHeroes.filter(hero => heroEdgeMap[hero.id] === edge);
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
    const currentHeroId = getCurrentHeroId();
    if (!currentHeroId) return;

    const currentHero = getHeroInfo(currentHeroId);
    if (!currentHero) return;

    // Use total speed including item bonuses
    store.dispatch(moveHero({ heroId: currentHeroId, position, speed: getTotalSpeed(currentHeroId) }));
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
    
    for (const cardState of currentHeroPowerCards.cardStates) {
      if (cardState.isFlipped) continue; // Skip used cards
      
      const card = getPowerCardById(cardState.cardId);
      if (!card || card.attackBonus === undefined) continue;
      
      const parsed = parseActionCard(card);
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

    // If maxRange is 0, only return adjacent monsters (melee only)
    if (maxRange === 0) {
      const tileId = getCurrentHeroTileId();
      return getAdjacentMonsters(currentToken.position, monsters, tileId, dungeon);
    }

    // Return monsters within the maximum range
    return getMonstersWithinRange(currentToken.position, monsters, maxRange, dungeon);
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

  // Handle attack action using a power card
  function handleAttackWithCard(cardId: number, targetInstanceId: string) {
    const currentHeroId = getCurrentHeroId();
    if (!currentHeroId) return;

    const powerCard = getPowerCardById(cardId);
    if (!powerCard || powerCard.attackBonus === undefined) return;

    const monster = monsters.find((m) => m.instanceId === targetInstanceId);
    if (!monster) return;

    const monsterAC = getMonsterAC(monster.monsterId);
    if (monsterAC === undefined) return;

    // Create base attack from power card
    // TODO: Some power cards like 'Ray of Frost' have range > 1 - implement ranged targeting
    const baseAttack = {
      name: powerCard.name,
      attackBonus: powerCard.attackBonus,
      damage: powerCard.damage ?? DEFAULT_POWER_CARD_DAMAGE,
      range: 1,
    };

    // Apply item bonuses from hero's inventory
    const attackWithBonuses = applyItemBonusesToAttack(baseAttack, heroInventories[currentHeroId]);

    const result = resolveAttack(attackWithBonuses, monsterAC);
    store.dispatch(setAttackResult({ result, targetInstanceId, attackName: powerCard.name }));
    
    // Flip the power card if it's a daily (at-wills can be used repeatedly)
    // But only flip on the first attack of a multi-attack sequence
    const isMultiAttackInProgress = multiAttackState && multiAttackState.attacksCompleted > 0;
    if (powerCard.type === 'daily' && !isMultiAttackInProgress) {
      store.dispatch(usePowerCard({ heroId: currentHeroId, cardId }));
    }
  }

  // Handle dismissing the attack result - also handles multi-attack progression
  function handleDismissAttackResult() {
    // Check if we're in a multi-attack sequence
    if (multiAttackState) {
      // Check if the target was defeated
      const targetStillAlive = monsters.some(m => m.instanceId === attackTargetId);
      
      // Record the attack hit
      store.dispatch(recordMultiAttackHit());
      
      // If target died and this was a same-target attack, clear the multi-attack
      if (!targetStillAlive && multiAttackState.sameTarget) {
        store.dispatch(clearMultiAttack());
      }
    }
    
    store.dispatch(dismissAttackResult());
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
    store.dispatch(startMoveAttack({ cardId }));
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

  // Get the edge for the monster's controller (used for monster action dialogs)
  function getMonsterControllerEdge(): EdgePosition {
    if (!monsterMoveActionId) return "bottom";
    const monster = monsters.find((m) => m.instanceId === monsterMoveActionId);
    if (!monster) return "bottom";
    const controllerId = monster.controllerId;
    if (controllerId && heroEdgeMap[controllerId]) {
      return heroEdgeMap[controllerId];
    }
    return "bottom";
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

  // Handle dismissing the encounter card and applying its effect
  function handleDismissEncounterCard() {
    store.dispatch(dismissEncounterCard());
  }

  // Handle canceling the encounter card (spend 5 XP to skip the effect)
  function handleCancelEncounterCard() {
    store.dispatch(cancelEncounterCard());
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

  // Handle using a treasure item (consumable or action)
  function handleUseTreasureItem(heroId: string, cardId: number) {
    store.dispatch(useTreasureItem({ heroId, cardId }));
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
    
    // For touch events, auto-enable map control mode for better UX
    // For mouse events, still require manual activation
    if (event instanceof TouchEvent && event.touches.length === 1 && !mapControlMode) {
      mapControlMode = true;
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
    
    // For single touch or mouse events, proceed if panning is active
    // Touch events auto-enabled map control mode in handlePanStart
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
  
  <!-- Top edge player zone - shows all heroes who joined from top -->
  <div
    class="edge-zone edge-top"
    class:has-players={getHeroesForEdge('top').length > 0}
    data-testid="player-zone-top"
  >
    {#each getHeroesForEdge('top') as hero (hero.id)}
      {@const heroHpState = getHeroHpState(hero.id)}
      {@const controlledMonsters = getMonstersForHero(hero.id)}
      {#if heroHpState}
        <div class="hero-with-monsters-container" data-testid="hero-container-{hero.id}">
          <!-- Power cards appear to the right of player card after 180° rotation -->
          <PlayerPowerCards
            heroPowerCards={heroPowerCards[hero.id]}
            boardPosition="top"
          />
          <PlayerCard
            {hero}
            {heroHpState}
            heroInventory={heroInventories[hero.id]}
            isActive={isActiveHero(hero.id)}
            turnPhase={isActiveHero(hero.id) ? formatPhase(turnState.currentPhase) : undefined}
            turnNumber={isActiveHero(hero.id) ? turnState.turnNumber : undefined}
            conditions={getStatusDisplayData(heroHpState.statuses ?? [])}
            onUseTreasureItem={(cardId) => handleUseTreasureItem(hero.id, cardId)}
            boardPosition="top"
          />
          <!-- Monster cards appear to the left of player card after 180° rotation -->
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
        </div>
      {/if}
    {/each}
  </div>

  <!-- Middle section with left edge, center board, and right edge -->
  <div class="middle-section">
    <!-- Left edge player zone - shows all heroes who joined from left -->
    <div
      class="edge-zone edge-left"
      class:has-players={getHeroesForEdge('left').length > 0}
      data-testid="player-zone-left"
    >
      {#each getHeroesForEdge('left') as hero (hero.id)}
        {@const heroHpState = getHeroHpState(hero.id)}
        {@const controlledMonsters = getMonstersForHero(hero.id)}
        {#if heroHpState}
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
              isActive={isActiveHero(hero.id)}
              turnPhase={isActiveHero(hero.id) ? formatPhase(turnState.currentPhase) : undefined}
              turnNumber={isActiveHero(hero.id) ? turnState.turnNumber : undefined}
              conditions={getStatusDisplayData(heroHpState.statuses ?? [])}
              onUseTreasureItem={(cardId) => handleUseTreasureItem(hero.id, cardId)}
              boardPosition="left"
            />
            <!-- Power cards to the right of player card -->
            <PlayerPowerCards
              heroPowerCards={heroPowerCards[hero.id]}
              boardPosition="left"
            />
          </div>
        {/if}
      {/each}
    </div>

    <!-- Center board area -->
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
          <div
            class="placed-tile"
            class:start-tile={tile.tileType === "start"}
            class:newly-placed={tile.id === recentlyPlacedTileId}
            data-testid={tile.tileType === "start"
              ? "start-tile"
              : "dungeon-tile"}
            data-tile-id={tile.id}
            style="left: {tilePos.x}px; top: {tilePos.y}px; width: {tileDims.width}px; height: {tileDims.height}px;"
          >
            <img
              src={assetPath(getTileImagePath(tile))}
              alt={tile.tileType}
              class="tile-image"
              style={tile.rotation !== 0
                ? `transform: rotate(${tile.rotation}deg);`
                : ""}
            />

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
        {#if showingMovement && validMoveSquares.length > 0}
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

        <!-- Hero tokens (positioned relative to start tile) -->
        {#each heroTokens as token (token.heroId)}
          {@const hero = getHeroInfo(token.heroId)}
          {@const isActive = token.heroId === getCurrentHeroId()}
          {@const startTile = dungeon.tiles.find((t) => t.tileType === "start")}
          {@const tokenRotation = getHeroTokenRotation(token.heroId)}
          {#if hero && startTile}
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
          <MonsterToken
            monster={monsterState}
            cellSize={TILE_CELL_SIZE}
            tileOffsetX={TOKEN_OFFSET_X}
            tileOffsetY={TOKEN_OFFSET_Y}
            tilePixelOffset={getTilePixelOffsetById(monsterState.tileId)}
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
        
        <!-- Board tokens (Blade Barrier, Flaming Sphere, etc.) -->
        {#each boardTokens as token (token.id)}
          <BoardTokenMarker
            {token}
            cellSize={TILE_CELL_SIZE}
            tileOffsetX={TOKEN_OFFSET_X}
            tileOffsetY={TOKEN_OFFSET_Y}
            tilePixelOffset={{ x: 0, y: 0 }}
          />
        {/each}
      </div>

      <!-- Board controls -->
      <div class="board-controls">
        <!-- Objective Display -->
        <div class="objective-display" data-testid="objective-display">
          <span class="objective-label">
            <TargetIcon size={16} ariaLabel="Objective" /> Objective:
          </span>
          <span class="objective-text">{scenario.objective}</span>
          <span class="objective-progress" data-testid="objective-progress">
            {scenario.monstersDefeated} / {scenario.monstersToDefeat} defeated
          </span>
        </div>
        
        <!-- XP Counter -->
        <XPCounter xp={partyResources.xp} />
        
        <!-- Healing Surge Counter -->
        <HealingSurgeCounter surges={partyResources.healingSurges} />
        
        <!-- Active Environment Indicator -->
        {#if activeEnvironmentId}
          {@const environmentCard = ENCOUNTER_CARDS.find(c => c.id === activeEnvironmentId)}
          <div class="environment-indicator" data-testid="environment-indicator">
            <div class="environment-icon">🌫️</div>
            <div class="environment-name">
              {environmentCard?.name ?? 'Environment'}
            </div>
          </div>
        {/if}
        
        <TileDeckCounter tileCount={dungeon.tileDeck.length} />

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

        <!-- Movement Controls (shown during hero phase with incremental movement) -->
        {#if turnState.currentPhase === "hero-phase"}
          <div class="movement-controls" data-testid="movement-controls">
            <!-- Remaining Movement Display -->
            {#if incrementalMovement?.inProgress}
              <div class="remaining-movement" data-testid="remaining-movement">
                <span class="movement-label">🏃 Movement:</span>
                <span class="movement-value">{incrementalMovement.remainingMovement} remaining</span>
              </div>
            {/if}
            
            <!-- Complete Move Button (shown when movement in progress) -->
            {#if incrementalMovement?.inProgress}
              <button
                class="complete-move-button"
                data-testid="complete-move-button"
                onclick={handleCompleteMove}
              >
                <CheckIcon size={14} ariaLabel="Complete" /> Complete Move
              </button>
            {/if}
            
            <!-- Undo Button (shown when undo is available) -->
            {#if undoSnapshot}
              <button
                class="undo-button"
                data-testid="undo-button"
                onclick={handleUndo}
              >
                ↩ Undo
              </button>
            {/if}
          </div>
        {/if}

        <button
          class="end-phase-button"
          data-testid="end-phase-button"
          onclick={handleEndPhase}
        >
          {getEndPhaseButtonText()}
        </button>

        <!-- Power Card Attack Panel - only show during hero phase when adjacent to monster and can attack -->
        {#if turnState.currentPhase === "hero-phase" && (heroTurnActions.canAttack || multiAttackState)}
          {@const currentHeroId = getCurrentHeroId()}
          {@const currentHeroPowerCards = currentHeroId
            ? heroPowerCards[currentHeroId]
            : undefined}
          {@const targetableMonsters = getTargetableMonstersForCurrentHero()}
          {#if currentHeroPowerCards && targetableMonsters.length > 0}
            <PowerCardAttackPanel
              heroPowerCards={currentHeroPowerCards}
              adjacentMonsters={targetableMonsters}
              onAttackWithCard={handleAttackWithCard}
              {multiAttackState}
              onStartMultiAttack={handleStartMultiAttack}
              onCancelMultiAttack={handleCancelMultiAttack}
              {pendingMoveAttack}
              onStartMoveAttack={handleStartMoveAttack}
              canMove={heroTurnActions.canMove}
            />
          {/if}
        {/if}
      </div>
    </div>

    <!-- Right edge player zone - shows all heroes who joined from right -->
    <div
      class="edge-zone edge-right"
      class:has-players={getHeroesForEdge('right').length > 0}
      data-testid="player-zone-right"
    >
      {#each getHeroesForEdge('right') as hero (hero.id)}
        {@const heroHpState = getHeroHpState(hero.id)}
        {@const controlledMonsters = getMonstersForHero(hero.id)}
        {#if heroHpState}
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
              isActive={isActiveHero(hero.id)}
              turnPhase={isActiveHero(hero.id) ? formatPhase(turnState.currentPhase) : undefined}
              turnNumber={isActiveHero(hero.id) ? turnState.turnNumber : undefined}
              conditions={getStatusDisplayData(heroHpState.statuses ?? [])}
              onUseTreasureItem={(cardId) => handleUseTreasureItem(hero.id, cardId)}
              boardPosition="right"
            />
            <!-- Power cards to the right of player card -->
            <PlayerPowerCards
              heroPowerCards={heroPowerCards[hero.id]}
              boardPosition="right"
            />
          </div>
        {/if}
      {/each}
    </div>
  </div>

  <!-- Bottom edge player zone - shows all heroes who joined from bottom -->
  <div
    class="edge-zone edge-bottom"
    class:has-players={getHeroesForEdge('bottom').length > 0}
    data-testid="player-zone-bottom"
  >
    {#each getHeroesForEdge('bottom') as hero (hero.id)}
      {@const heroHpState = getHeroHpState(hero.id)}
      {@const controlledMonsters = getMonstersForHero(hero.id)}
      {#if heroHpState}
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
            isActive={isActiveHero(hero.id)}
            turnPhase={isActiveHero(hero.id) ? formatPhase(turnState.currentPhase) : undefined}
            turnNumber={isActiveHero(hero.id) ? turnState.turnNumber : undefined}
            conditions={getStatusDisplayData(heroHpState.statuses ?? [])}
            onUseTreasureItem={(cardId) => handleUseTreasureItem(hero.id, cardId)}
            boardPosition="bottom"
          />
          <!-- Power cards to the right of player card -->
          <PlayerPowerCards
            heroPowerCards={heroPowerCards[hero.id]}
            boardPosition="bottom"
          />
        </div>
      {/if}
    {/each}
  </div>

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

  <!-- Encounter Effect Notification (shown after special encounter card effects) -->
  {#if encounterEffectMessage}
    <EncounterEffectNotification
      message={encounterEffectMessage}
      onDismiss={handleDismissEncounterEffectMessage}
    />
  {/if}

  <!-- Exploration Phase Notification (shown when transitioning to exploration phase) -->
  {#if explorationPhaseMessage}
    <ExplorationPhaseNotification
      message={explorationPhaseMessage}
      onDismiss={handleDismissExplorationPhaseMessage}
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
</div>

<style>
  .game-board {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #1a1a2e;
    color: #fff;
    overflow: hidden;
  }

  /* Edge zones for player UI */
  .edge-zone {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.3);
    min-height: 80px;
    transition: all 0.3s ease-out;
  }

  .edge-zone.has-players {
    background: rgba(0, 0, 0, 0.4);
  }

  /* Container for hero with monsters to the left */
  .hero-with-monsters-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  /* Rotate hero containers based on edge position */
  .edge-top .hero-with-monsters-container {
    transform: rotate(180deg);
    transform-origin: center;
  }

  .edge-left .hero-with-monsters-container {
    transform: rotate(90deg);
    transform-origin: center;
  }

  .edge-right .hero-with-monsters-container {
    transform: rotate(-90deg);
    transform-origin: center;
  }

  /* Monster cards positioned to the left of player card */
  .monster-cards-left {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  /* Edge zones layout - rotation handled by hero-with-monsters-container */
  .edge-top {
    border-bottom: 2px solid #333;
  }

  .edge-left {
    border-right: 2px solid #333;
    min-width: 80px;
    min-height: auto;
    flex-direction: column;
  }

  .edge-right {
    border-left: 2px solid #333;
    min-width: 80px;
    min-height: auto;
    flex-direction: column;
  }

  .edge-bottom {
    border-top: 2px solid #333;
  }

  /* Middle section layout */
  .middle-section {
    flex: 1;
    display: flex;
    flex-direction: row;
    min-height: 0;
    overflow: hidden;
  }

  /* Board container */
  .board-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 1rem;
    position: relative;
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
    border: 3px solid #444;
    border-radius: 8px;
  }

  .movement-overlay-container {
    position: absolute;
    z-index: 5;
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

  /* End phase button */
  .end-phase-button {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
    background: rgba(46, 125, 50, 0.9);
    color: #fff;
    border: 1px solid #4caf50;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s ease-out;
    min-width: 44px;
    min-height: 44px;
  }

  .end-phase-button:hover {
    background: rgba(76, 175, 80, 0.9);
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

  /* Movement controls container */
  .movement-controls {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-end;
  }

  /* Remaining movement display */
  .remaining-movement {
    background: rgba(0, 0, 0, 0.7);
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    border: 1px solid #1e90ff;
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .movement-label {
    font-size: 0.8rem;
    color: #8ecae6;
  }

  .movement-value {
    font-size: 0.9rem;
    font-weight: bold;
    color: #1e90ff;
  }

  /* Complete move button */
  .complete-move-button {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
    background: rgba(30, 144, 255, 0.8);
    color: #fff;
    border: 1px solid #1e90ff;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s ease-out;
    min-width: 44px;
    min-height: 44px;
  }

  .complete-move-button:hover {
    background: rgba(30, 144, 255, 0.95);
    box-shadow: 0 0 10px rgba(30, 144, 255, 0.4);
  }

  /* Undo button */
  .undo-button {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
    background: rgba(255, 165, 0, 0.8);
    color: #fff;
    border: 1px solid #ffa500;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s ease-out;
    min-width: 44px;
    min-height: 44px;
  }

  .undo-button:hover {
    background: rgba(255, 165, 0, 0.95);
    box-shadow: 0 0 10px rgba(255, 165, 0, 0.4);
  }

  /* Environment indicator */
  .environment-indicator {
    position: absolute;
    top: 10rem;
    right: 1rem;
    background: rgba(139, 92, 246, 0.9);
    border: 2px solid #8b5cf6;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    display: flex;
    gap: 0.75rem;
    align-items: center;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
    z-index: 15;
    min-width: 150px;
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
</style>
