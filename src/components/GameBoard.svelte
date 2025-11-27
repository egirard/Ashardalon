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
</script>

<div class="game-board" data-testid="game-board">
  <header class="game-header">
    <h1>Wrath of Ashardalon</h1>
    <button class="reset-button" data-testid="reset-button" onclick={handleReset}>
      Return to Character Select
    </button>
  </header>
  
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
  </div>
  
  <div class="turn-indicator" data-testid="turn-indicator">
    {#if heroTokens.length > 0}
      {@const currentHero = getHeroInfo(getCurrentHeroId() ?? '')}
      <div class="turn-info">
        <span class="turn-number">Turn {turnState.turnNumber}</span>
        <span class="turn-hero"><strong>{currentHero?.name}</strong>'s Turn</span>
        <span class="turn-phase" data-testid="turn-phase">Phase: {formatPhase(turnState.currentPhase)}</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .game-board {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: #1a1a2e;
    color: #fff;
  }
  
  .game-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 2px solid #333;
  }
  
  .game-header h1 {
    font-size: 1.5rem;
    margin: 0;
  }
  
  .reset-button {
    padding: 0.5rem 1rem;
    background: #444;
    color: #fff;
    border: 1px solid #666;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
  }
  
  .reset-button:hover {
    background: #555;
  }
  
  .board-container {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2rem;
  }
  
  .start-tile {
    position: relative;
    display: inline-block;
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
  }
  
  .token-label {
    font-size: 0.7rem;
    background: rgba(0, 0, 0, 0.8);
    padding: 2px 6px;
    border-radius: 4px;
    margin-top: 2px;
    white-space: nowrap;
  }
  
  .turn-indicator {
    padding: 1rem 2rem;
    background: rgba(0, 0, 0, 0.3);
    border-top: 2px solid #333;
    text-align: center;
  }
  
  .turn-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    align-items: center;
  }
  
  .turn-number {
    font-size: 0.9rem;
    color: #aaa;
  }
  
  .turn-hero {
    font-size: 1.1rem;
  }
  
  .turn-hero strong {
    color: #ffd700;
  }
  
  .turn-phase {
    font-size: 0.9rem;
    color: #8ecae6;
  }
</style>
