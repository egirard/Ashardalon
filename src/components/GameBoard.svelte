<script lang="ts">
  import { store } from '../store';
  import { resetGame, showMovement, hideMovement, moveHero } from '../store/gameSlice';
  import type { HeroToken, Hero, TurnState, GamePhase, Position } from '../store/types';
  import { assetPath } from '../utils';
  import MovementOverlay from './MovementOverlay.svelte';
  
  // Tile dimension constants (based on 140px grid cells)
  const TILE_CELL_SIZE = 140; // Size of each grid square in pixels
  const TILE_GRID_WIDTH = 4;  // Number of cells wide
  const TILE_GRID_HEIGHT = 8; // Number of cells tall
  const TILE_WIDTH = TILE_CELL_SIZE * TILE_GRID_WIDTH;   // 560px
  const TILE_HEIGHT = TILE_CELL_SIZE * TILE_GRID_HEIGHT; // 1120px
  const CONTAINER_PADDING = 32; // 1rem padding on each side (16px * 2)
  const MIN_SCALE = 0.3; // Minimum scale for legibility
  const MAX_SCALE = 1;   // Maximum scale (no upscaling)
  
  // Token positioning constants
  const TOKEN_OFFSET_X = 36; // Offset from left edge of start tile
  const TOKEN_OFFSET_Y = 36; // Offset from top edge of start tile
  
  let heroTokens: HeroToken[] = $state([]);
  let selectedHeroes: Hero[] = $state([]);
  let turnState: TurnState = $state({ currentHeroIndex: 0, currentPhase: 'hero-phase', turnNumber: 1 });
  let validMoveSquares: Position[] = $state([]);
  let showingMovement: boolean = $state(false);
  let boardContainerRef: HTMLDivElement | null = $state(null);
  let mapScale: number = $state(1);
  
  // Subscribe to store updates
  $effect(() => {
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      heroTokens = state.game.heroTokens;
      selectedHeroes = state.heroes.selectedHeroes;
      turnState = state.game.turnState;
      validMoveSquares = state.game.validMoveSquares;
      showingMovement = state.game.showingMovement;
    });
    
    // Initialize state
    const state = store.getState();
    heroTokens = state.game.heroTokens;
    selectedHeroes = state.heroes.selectedHeroes;
    turnState = state.game.turnState;
    validMoveSquares = state.game.validMoveSquares;
    showingMovement = state.game.showingMovement;
    
    return unsubscribe;
  });
  
  // Calculate scale to fit the map in the available space
  $effect(() => {
    if (boardContainerRef) {
      const calculateScale = () => {
        const container = boardContainerRef;
        if (!container) return;
        
        // Get available space (accounting for padding)
        const availableWidth = container.clientWidth - CONTAINER_PADDING;
        const availableHeight = container.clientHeight - CONTAINER_PADDING;
        
        // Calculate scale to fit both dimensions
        const scaleX = availableWidth / TILE_WIDTH;
        const scaleY = availableHeight / TILE_HEIGHT;
        
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
    return selectedHeroes.find(h => h.id === heroId);
  }
  
  function getCurrentHeroId(): string | undefined {
    const currentToken = heroTokens[turnState.currentHeroIndex];
    return currentToken?.heroId;
  }
  
  function formatPhase(phase: GamePhase): string {
    switch (phase) {
      case 'hero-phase':
        return 'Hero Phase';
      case 'exploration-phase':
        return 'Exploration Phase';
      case 'villain-phase':
        return 'Villain Phase';
    }
  }
  
  function handleReset() {
    store.dispatch(resetGame());
  }
  
  // Calculate pixel position from grid position
  function getTokenStyle(position: { x: number; y: number }): string {
    const cellCenterOffset = TILE_CELL_SIZE / 2;
    return `left: ${TOKEN_OFFSET_X + position.x * TILE_CELL_SIZE + cellCenterOffset}px; top: ${TOKEN_OFFSET_Y + position.y * TILE_CELL_SIZE + cellCenterOffset}px;`;
  }
  
  // Get the edge index for the active player (0=bottom, 1=right, 2=top, 3=left)
  // For now, map player index to edge: player 0->bottom, player 1->right, etc.
  function getActivePlayerEdge(): string {
    const edgeIndex = turnState.currentHeroIndex % 4;
    const edges = ['bottom', 'right', 'top', 'left'];
    return edges[edgeIndex];
  }
  
  // Handle tile click to show movement options
  function handleTileClick(event: MouseEvent) {
    // Only respond to clicks during hero phase
    if (turnState.currentPhase !== 'hero-phase') {
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
      store.dispatch(showMovement({ heroId: currentHeroId, speed: currentHero.speed }));
    }
  }
  
  // Handle click on a valid movement square
  function handleMoveSquareClick(position: Position) {
    const currentHeroId = getCurrentHeroId();
    if (!currentHeroId) return;
    
    store.dispatch(moveHero({ heroId: currentHeroId, position }));
  }
</script>

<div class="game-board" data-testid="game-board">
  <!-- Top edge player zone -->
  <div class="edge-zone edge-top" class:active-edge={getActivePlayerEdge() === 'top'} data-testid="player-zone-top">
    {#if getActivePlayerEdge() === 'top'}
      {@const currentHeroId = getCurrentHeroId()}
      {@const currentHero = currentHeroId ? getHeroInfo(currentHeroId) : undefined}
      {#if currentHero}
        <div class="player-info" data-testid="turn-indicator">
          <img src={assetPath(currentHero.imagePath)} alt={currentHero.name} class="player-avatar" />
          <div class="turn-details">
            <span class="player-name">{currentHero.name}'s Turn</span>
            <span class="turn-phase" data-testid="turn-phase">{formatPhase(turnState.currentPhase)}</span>
            <span class="turn-number">Turn {turnState.turnNumber}</span>
          </div>
        </div>
      {/if}
    {/if}
  </div>

  <!-- Middle section with left edge, center board, and right edge -->
  <div class="middle-section">
    <!-- Left edge player zone -->
    <div class="edge-zone edge-left" class:active-edge={getActivePlayerEdge() === 'left'} data-testid="player-zone-left">
      {#if getActivePlayerEdge() === 'left'}
        {@const currentHeroId = getCurrentHeroId()}
        {@const currentHero = currentHeroId ? getHeroInfo(currentHeroId) : undefined}
        {#if currentHero}
          <div class="player-info">
            <img src={assetPath(currentHero.imagePath)} alt={currentHero.name} class="player-avatar" />
            <div class="turn-details">
              <span class="player-name">{currentHero.name}'s Turn</span>
              <span class="turn-phase">{formatPhase(turnState.currentPhase)}</span>
              <span class="turn-number">Turn {turnState.turnNumber}</span>
            </div>
          </div>
        {/if}
      {/if}
    </div>

    <!-- Center board area -->
    <div class="board-container" bind:this={boardContainerRef}>
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div 
        class="start-tile" 
        data-testid="start-tile" 
        style="transform: scale({mapScale});"
        onclick={handleTileClick}
      >
        <img src={assetPath('assets/StartTile.png')} alt="Start Tile" class="tile-image" />
        
        <!-- Movement overlay -->
        {#if showingMovement && validMoveSquares.length > 0}
          <MovementOverlay
            validMoveSquares={validMoveSquares}
            tileOffsetX={TOKEN_OFFSET_X}
            tileOffsetY={TOKEN_OFFSET_Y}
            cellSize={TILE_CELL_SIZE}
            onSquareClick={handleMoveSquareClick}
          />
        {/if}
        
        {#each heroTokens as token (token.heroId)}
          {@const hero = getHeroInfo(token.heroId)}
          {@const isActive = token.heroId === getCurrentHeroId()}
          {#if hero}
            <div 
              class="hero-token" 
              class:active={isActive}
              data-testid="hero-token"
              data-hero-id={token.heroId}
              style={getTokenStyle(token.position)}
            >
              <img src={assetPath(hero.imagePath)} alt={hero.name} class="token-image" />
              <span class="token-label">{hero.name}</span>
            </div>
          {/if}
        {/each}
      </div>
      
      <!-- Reset button positioned centrally but small and unobtrusive -->
      <button class="reset-button" data-testid="reset-button" onclick={handleReset}>
        ↩ Return to Character Select
      </button>
    </div>

    <!-- Right edge player zone -->
    <div class="edge-zone edge-right" class:active-edge={getActivePlayerEdge() === 'right'} data-testid="player-zone-right">
      {#if getActivePlayerEdge() === 'right'}
        {@const currentHeroId = getCurrentHeroId()}
        {@const currentHero = currentHeroId ? getHeroInfo(currentHeroId) : undefined}
        {#if currentHero}
          <div class="player-info">
            <img src={assetPath(currentHero.imagePath)} alt={currentHero.name} class="player-avatar" />
            <div class="turn-details">
              <span class="player-name">{currentHero.name}'s Turn</span>
              <span class="turn-phase">{formatPhase(turnState.currentPhase)}</span>
              <span class="turn-number">Turn {turnState.turnNumber}</span>
            </div>
          </div>
        {/if}
      {/if}
    </div>
  </div>

  <!-- Bottom edge player zone -->
  <div class="edge-zone edge-bottom" class:active-edge={getActivePlayerEdge() === 'bottom'} data-testid="player-zone-bottom">
    {#if getActivePlayerEdge() === 'bottom'}
      {@const currentHeroId = getCurrentHeroId()}
      {@const currentHero = currentHeroId ? getHeroInfo(currentHeroId) : undefined}
      {#if currentHero}
        <div class="player-info" data-testid="turn-indicator">
          <img src={assetPath(currentHero.imagePath)} alt={currentHero.name} class="player-avatar" />
          <div class="turn-details">
            <span class="player-name">{currentHero.name}'s Turn</span>
            <span class="turn-phase" data-testid="turn-phase">{formatPhase(turnState.currentPhase)}</span>
            <span class="turn-number">Turn {turnState.turnNumber}</span>
          </div>
        </div>
      {/if}
    {/if}
  </div>
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
    transform: rotate(90deg);
    border-right: 2px solid #333;
    min-width: 80px;
    min-height: auto;
    writing-mode: vertical-lr;
  }
  
  .edge-right {
    transform: rotate(-90deg);
    border-left: 2px solid #333;
    min-width: 80px;
    min-height: auto;
    writing-mode: vertical-lr;
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
  
  .start-tile {
    position: relative;
    display: inline-block;
    transition: transform 0.3s ease-out;
    transform-origin: center center;
  }
  
  .tile-image {
    display: block;
    height: auto;
    border: 3px solid #444;
    border-radius: 8px;
  }
  
  .hero-token {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    transform: translate(-50%, -50%);
    z-index: 10;
    transition: all 0.3s ease-out;
  }
  
  .hero-token.active .token-image {
    box-shadow: 0 0 10px 3px gold;
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 10px 3px gold; }
    50% { box-shadow: 0 0 15px 5px gold; }
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
  
  /* Reset button - positioned subtly */
  .reset-button {
    position: absolute;
    bottom: 0.5rem;
    right: 0.5rem;
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
