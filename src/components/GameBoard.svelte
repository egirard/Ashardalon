<script lang="ts">
  import { store } from '../store';
  import { resetGame } from '../store/gameSlice';
  import type { HeroToken, Hero, TurnState, GamePhase } from '../store/types';
  import { assetPath } from '../utils';
  
  let heroTokens: HeroToken[] = $state([]);
  let selectedHeroes: Hero[] = $state([]);
  let turnState: TurnState = $state({ currentHeroIndex: 0, currentPhase: 'hero-phase', turnNumber: 1 });
  
  // Subscribe to store updates
  $effect(() => {
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      heroTokens = state.game.heroTokens;
      selectedHeroes = state.heroes.selectedHeroes;
      turnState = state.game.turnState;
    });
    
    // Initialize state
    const state = store.getState();
    heroTokens = state.game.heroTokens;
    selectedHeroes = state.heroes.selectedHeroes;
    turnState = state.game.turnState;
    
    return unsubscribe;
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
    const tileSize = 140; // Size of each grid square in pixels (140x140)
    const offsetX = 36; // Offset from left edge of start tile
    const offsetY = 36; // Offset from top edge of start tile
    // Position token at the center of the grid cell
    const cellCenterOffset = tileSize / 2;
    return `left: ${offsetX + position.x * tileSize + cellCenterOffset}px; top: ${offsetY + position.y * tileSize + cellCenterOffset}px;`;
  }
  
  // Get the edge index for the active player (0=bottom, 1=right, 2=top, 3=left)
  // For now, map player index to edge: player 0->bottom, player 1->right, etc.
  function getActivePlayerEdge(): string {
    const edgeIndex = turnState.currentHeroIndex % 4;
    const edges = ['bottom', 'right', 'top', 'left'];
    return edges[edgeIndex];
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
    <div class="board-container">
      <div class="start-tile" data-testid="start-tile">
        <img src={assetPath('assets/StartTile.png')} alt="Start Tile" class="tile-image" />
        
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
  }
  
  .start-tile {
    position: relative;
    display: inline-block;
    transition: transform 0.3s ease-out;
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
