<script lang="ts">
  import { store } from "../store";
  import {
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
    activateNextMonster,
    dismissMonsterAttackResult,
    dismissMonsterMoveAction,
    shouldAutoEndHeroTurn,
  } from "../store/gameSlice";
  import type { EdgePosition } from "../store/heroesSlice";
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
  } from "../store/types";
  import { TILE_DEFINITIONS, MONSTERS, AVAILABLE_HEROES } from "../store/types";
  import { assetPath } from "../utils";
  import MovementOverlay from "./MovementOverlay.svelte";
  import TileDeckCounter from "./TileDeckCounter.svelte";
  import UnexploredEdgeIndicator from "./UnexploredEdgeIndicator.svelte";
  import MonsterToken from "./MonsterToken.svelte";
  import MonsterCard from "./MonsterCard.svelte";
  import AttackButton from "./AttackButton.svelte";
  import CombatResultDisplay from "./CombatResultDisplay.svelte";
  import MonsterMoveDisplay from "./MonsterMoveDisplay.svelte";
  import {
    resolveAttack,
    getAdjacentMonsters,
    getMonsterAC,
  } from "../store/combat";
  import { findTileAtPosition } from "../store/movement";

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
  let boardContainerRef: HTMLDivElement | null = $state(null);
  let mapScale: number = $state(1);

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

    return unsubscribe;
  });

  // Auto-advance hero phase when valid action sequence is complete
  // Turn ends when: move+attack, attack+move, or move+move
  $effect(() => {
    if (turnState.currentPhase !== "hero-phase") return;
    
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
    
    // Auto-show movement options for the current hero
    store.dispatch(
      showMovement({ heroId: currentHeroId, speed: currentHero.speed }),
    );
  });

  // Auto-activate monsters during villain phase
  // This effect triggers when:
  // 1. Entering villain phase (to start the first monster)
  // 2. After dismissing a monster action result (attack or move)
  $effect(() => {
    if (turnState.currentPhase !== "villain-phase") return;
    
    // Don't auto-activate if there's an action result being displayed
    if (monsterAttackResult !== null || monsterMoveActionId !== null) return;
    
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
      // Account for start tile's 37px south border vs normal tile's 36px border
      // North adjustment affects base position, south adjustment affects south tiles
      y =
        northTileCount * NORMAL_TILE_HEIGHT +
        START_TILE_HEIGHT +
        (tile.position.row - 1) * NORMAL_TILE_HEIGHT -
        START_TILE_NORTH_OFFSET_DIFF -
        START_TILE_SOUTH_OFFSET_DIFF;
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

  // Calculate scale to fit the map in the available space
  $effect(() => {
    if (boardContainerRef) {
      const calculateScale = () => {
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
        mapScale = Math.max(newScale, MIN_SCALE);
      };

      calculateScale();

      // Recalculate on resize
      const resizeObserver = new ResizeObserver(calculateScale);
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

  // Get monsters controlled by the current hero
  function getControlledMonsters(): MonsterState[] {
    const currentHeroId = getCurrentHeroId();
    if (!currentHeroId) return [];
    return monsters.filter((m) => m.controllerId === currentHeroId);
  }

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
      // Show movement options for the current hero
      store.dispatch(
        showMovement({ heroId: currentHeroId, speed: currentHero.speed }),
      );
    }
  }

  // Handle click on a valid movement square
  function handleMoveSquareClick(position: Position) {
    const currentHeroId = getCurrentHeroId();
    if (!currentHeroId) return;

    store.dispatch(moveHero({ heroId: currentHeroId, position }));
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

  // Get the full hero object from AVAILABLE_HEROES by ID
  function getFullHeroInfo(heroId: string): Hero | undefined {
    return AVAILABLE_HEROES.find((h) => h.id === heroId);
  }

  // Handle attack action
  function handleAttack(targetInstanceId: string) {
    const currentHeroId = getCurrentHeroId();
    if (!currentHeroId) return;

    const hero = getFullHeroInfo(currentHeroId);
    if (!hero) return;

    const monster = monsters.find((m) => m.instanceId === targetInstanceId);
    if (!monster) return;

    const monsterAC = getMonsterAC(monster.monsterId);
    if (monsterAC === undefined) return;

    const result = resolveAttack(hero.attack, monsterAC);
    store.dispatch(setAttackResult({ result, targetInstanceId }));
  }

  // Handle dismissing the attack result
  function handleDismissAttackResult() {
    store.dispatch(dismissAttackResult());
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
</script>

<div class="game-board" data-testid="game-board">
  <!-- Top edge player zone -->
  <div
    class="edge-zone edge-top"
    class:active-edge={getActivePlayerEdge() === "top"}
    data-testid="player-zone-top"
  >
    {#if getActivePlayerEdge() === "top"}
      {@const currentHeroId = getCurrentHeroId()}
      {@const currentHero = currentHeroId
        ? getHeroInfo(currentHeroId)
        : undefined}
      {#if currentHero && currentHeroId}
        <div class="player-info" data-testid="turn-indicator">
          <img
            src={assetPath(currentHero.imagePath)}
            alt={currentHero.name}
            class="player-avatar"
          />
          <div class="turn-details">
            <span class="player-name">{currentHero.name}'s Turn</span>
            <span class="turn-phase" data-testid="turn-phase"
              >{formatPhase(turnState.currentPhase)}</span
            >
            <span class="turn-number">Turn {turnState.turnNumber}</span>
            <span class="hero-hp" data-testid="hero-hp">HP: {getHeroCurrentHp(currentHeroId)}/{getHeroMaxHp(currentHeroId)}</span>
          </div>
        </div>
      {/if}
    {/if}
  </div>

  <!-- Middle section with left edge, center board, and right edge -->
  <div class="middle-section">
    <!-- Left edge player zone -->
    <div
      class="edge-zone edge-left"
      class:active-edge={getActivePlayerEdge() === "left"}
      data-testid="player-zone-left"
    >
      {#if getActivePlayerEdge() === "left"}
        {@const currentHeroId = getCurrentHeroId()}
        {@const currentHero = currentHeroId
          ? getHeroInfo(currentHeroId)
          : undefined}
        {#if currentHero && currentHeroId}
          <div class="player-info">
            <img
              src={assetPath(currentHero.imagePath)}
              alt={currentHero.name}
              class="player-avatar"
            />
            <div class="turn-details">
              <span class="player-name">{currentHero.name}'s Turn</span>
              <span class="turn-phase"
                >{formatPhase(turnState.currentPhase)}</span
              >
              <span class="turn-number">Turn {turnState.turnNumber}</span>
              <span class="hero-hp">HP: {getHeroCurrentHp(currentHeroId)}/{getHeroMaxHp(currentHeroId)}</span>
            </div>
          </div>
        {/if}
      {/if}
    </div>

    <!-- Center board area -->
    <div class="board-container" bind:this={boardContainerRef}>
      <div
        class="dungeon-map"
        data-testid="dungeon-map"
        style="transform: scale({mapScale}); width: {mapBounds.width}px; height: {mapBounds.height}px;"
        onclick={handleTileClick}
        onkeydown={handleTileKeydown}
        role="button"
        tabindex="0"
        aria-label={showingMovement
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
            {#each dungeon.unexploredEdges.filter((e) => e.tileId === tile.id) as edge (edge.direction)}
              <UnexploredEdgeIndicator
                direction={edge.direction}
                cellSize={TILE_CELL_SIZE}
                tileWidth={tileDims.width}
                tileHeight={tileDims.height}
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
      </div>

      <!-- Board controls -->
      <div class="board-controls">
        <!-- Objective Display -->
        <div class="objective-display" data-testid="objective-display">
          <span class="objective-label">🎯 Objective:</span>
          <span class="objective-text">{scenario.objective}</span>
          <span class="objective-progress" data-testid="objective-progress">
            {scenario.monstersDefeated} / {scenario.monstersToDefeat} defeated
          </span>
        </div>
        
        <TileDeckCounter tileCount={dungeon.tileDeck.length} />

        <button
          class="end-phase-button"
          data-testid="end-phase-button"
          onclick={handleEndPhase}
        >
          {getEndPhaseButtonText()}
        </button>
        <button
          class="reset-button"
          data-testid="reset-button"
          onclick={handleReset}
        >
          ↩ Return to Character Select
        </button>

        <!-- Attack Button - only show during hero phase when adjacent to monster and can attack -->
        {#if turnState.currentPhase === "hero-phase" && heroTurnActions.canAttack}
          {@const currentHeroId = getCurrentHeroId()}
          {@const fullHero = currentHeroId
            ? getFullHeroInfo(currentHeroId)
            : undefined}
          {@const adjacentMonsters = getAdjacentMonstersForCurrentHero()}
          {#if fullHero && adjacentMonsters.length > 0}
            <AttackButton
              {adjacentMonsters}
              heroAttack={fullHero.attack}
              onAttack={handleAttack}
            />
          {/if}
        {/if}
      </div>
    </div>

    <!-- Right edge player zone -->
    <div
      class="edge-zone edge-right"
      class:active-edge={getActivePlayerEdge() === "right"}
      data-testid="player-zone-right"
    >
      {#if getActivePlayerEdge() === "right"}
        {@const currentHeroId = getCurrentHeroId()}
        {@const currentHero = currentHeroId
          ? getHeroInfo(currentHeroId)
          : undefined}
        {#if currentHero && currentHeroId}
          <div class="player-info">
            <img
              src={assetPath(currentHero.imagePath)}
              alt={currentHero.name}
              class="player-avatar"
            />
            <div class="turn-details">
              <span class="player-name">{currentHero.name}'s Turn</span>
              <span class="turn-phase"
                >{formatPhase(turnState.currentPhase)}</span
              >
              <span class="turn-number">Turn {turnState.turnNumber}</span>
              <span class="hero-hp">HP: {getHeroCurrentHp(currentHeroId)}/{getHeroMaxHp(currentHeroId)}</span>
            </div>
          </div>
        {/if}
      {/if}
    </div>
  </div>

  <!-- Bottom edge player zone -->
  <div
    class="edge-zone edge-bottom"
    class:active-edge={getActivePlayerEdge() === "bottom"}
    data-testid="player-zone-bottom"
  >
    {#if getActivePlayerEdge() === "bottom"}
      {@const currentHeroId = getCurrentHeroId()}
      {@const currentHero = currentHeroId
        ? getHeroInfo(currentHeroId)
        : undefined}
      {#if currentHero && currentHeroId}
        <div class="player-info" data-testid="turn-indicator">
          <img
            src={assetPath(currentHero.imagePath)}
            alt={currentHero.name}
            class="player-avatar"
          />
          <div class="turn-details">
            <span class="player-name">{currentHero.name}'s Turn</span>
            <span class="turn-phase" data-testid="turn-phase"
              >{formatPhase(turnState.currentPhase)}</span
            >
            <span class="turn-number">Turn {turnState.turnNumber}</span>
            <span class="hero-hp" data-testid="hero-hp">HP: {getHeroCurrentHp(currentHeroId)}/{getHeroMaxHp(currentHeroId)}</span>
          </div>
        </div>
      {/if}
    {/if}
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
    {#if fullHero}
      <CombatResultDisplay
        result={attackResult}
        attackerName={fullHero.name}
        attackName={fullHero.attack.name}
        targetName={targetMonster
          ? getMonsterName(targetMonster.monsterId)
          : "Monster"}
        onDismiss={handleDismissAttackResult}
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
    />
  {/if}

  <!-- Monster Move Action Display (shown when monster moves but can't attack) -->
  {#if monsterMoveActionId}
    <MonsterMoveDisplay
      monsterName={getMonsterMoveActionName()}
      onDismiss={handleDismissMonsterMoveAction}
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
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.3);
    min-height: 80px;
    transition: all 0.3s ease-out;
  }

  .edge-zone.active-edge {
    background: rgba(255, 215, 0, 0.15);
    box-shadow: inset 0 0 20px rgba(255, 215, 0, 0.2);
  }

  /* Rotate edge zones so content faces players at each edge */
  .edge-top {
    transform: rotate(180deg);
    border-bottom: 2px solid #333;
  }

  .edge-left {
    border-right: 2px solid #333;
    min-width: 80px;
    min-height: auto;
  }

  .edge-left .player-info {
    transform: rotate(90deg);
  }

  .edge-right {
    border-left: 2px solid #333;
    min-width: 80px;
    min-height: auto;
  }

  .edge-right .player-info {
    transform: rotate(-90deg);
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
  }

  .placed-tile {
    position: absolute;
    display: inline-block;
  }

  .placed-tile.start-tile {
    z-index: 1;
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

  /* Player info display in edge zones */
  .player-info {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem;
  }

  .player-avatar {
    width: 50px;
    height: 50px;
    object-fit: contain;
    border-radius: 50%;
    border: 2px solid #ffd700;
    background: rgba(0, 0, 0, 0.5);
  }

  .turn-details {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .player-name {
    font-size: 1rem;
    font-weight: bold;
    color: #ffd700;
  }

  .turn-phase {
    font-size: 0.85rem;
    color: #8ecae6;
  }

  .turn-number {
    font-size: 0.75rem;
    color: #aaa;
  }

  .hero-hp {
    font-size: 0.8rem;
    font-weight: bold;
    color: #e76f51;
    background: rgba(231, 111, 81, 0.15);
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    border: 1px solid rgba(231, 111, 81, 0.3);
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

  /* Reset button - positioned subtly */
  .reset-button {
    padding: 0.4rem 0.8rem;
    font-size: 0.75rem;
    background: rgba(68, 68, 68, 0.8);
    color: #ccc;
    border: 1px solid #555;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s ease-out;
    min-width: 44px;
    min-height: 44px;
  }

  .reset-button:hover {
    background: rgba(85, 85, 85, 0.9);
    color: #fff;
  }
</style>
