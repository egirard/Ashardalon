<script lang="ts">
  import { store } from '../store';
  import { selectHeroFromEdge, type EdgePosition } from '../store/heroesSlice';
  import { startGame } from '../store/gameSlice';
  import type { Hero } from '../store/types';
  import { assetPath } from '../utils';
  
  let selectedHeroes: Hero[] = $state([]);
  let availableHeroes: Hero[] = $state([]);
  let heroEdgeMap: Record<string, EdgePosition> = $state({});
  
  // Subscribe to store updates
  $effect(() => {
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      selectedHeroes = state.heroes.selectedHeroes;
      availableHeroes = state.heroes.availableHeroes;
      heroEdgeMap = state.heroes.heroEdgeMap;
    });
    
    // Initialize state
    const state = store.getState();
    selectedHeroes = state.heroes.selectedHeroes;
    availableHeroes = state.heroes.availableHeroes;
    heroEdgeMap = state.heroes.heroEdgeMap;
    
    return unsubscribe;
  });
  
  function isSelected(heroId: string): boolean {
    return selectedHeroes.some(h => h.id === heroId);
  }
  
  function isSelectedOnEdge(heroId: string, edge: EdgePosition): boolean {
    return heroEdgeMap[heroId] === edge;
  }
  
  function isSelectedOnOtherEdge(heroId: string, currentEdge: EdgePosition): boolean {
    const selectedEdge = heroEdgeMap[heroId];
    return selectedEdge !== undefined && selectedEdge !== currentEdge;
  }
  
  function handleHeroClick(heroId: string, edge: EdgePosition) {
    // Don't allow clicking if hero is already selected on a different edge
    if (isSelectedOnOtherEdge(heroId, edge)) {
      return;
    }
    store.dispatch(selectHeroFromEdge({ heroId, edge }));
  }
  
  function handleStartGame() {
    if (selectedHeroes.length > 0) {
      store.dispatch(startGame({ heroIds: selectedHeroes.map(h => h.id) }));
    }
  }
  
  function canStartGame(): boolean {
    return selectedHeroes.length >= 1 && selectedHeroes.length <= 5;
  }
</script>

<div class="character-select" data-testid="character-select">
  <!-- Top edge - heroes rotated 180° for player sitting at top -->
  <div class="edge-zone edge-top" data-testid="edge-top">
    <div class="hero-row" data-testid="hero-grid">
      {#each availableHeroes as hero (hero.id)}
        <button
          class="hero-card"
          class:selected={isSelectedOnEdge(hero.id, 'top')}
          class:unavailable={isSelectedOnOtherEdge(hero.id, 'top')}
          data-testid="hero-{hero.id}-top"
          onclick={() => handleHeroClick(hero.id, 'top')}
          disabled={isSelectedOnOtherEdge(hero.id, 'top')}
        >
          <img src={assetPath(hero.imagePath)} alt={hero.name} class="hero-image" />
          <div class="hero-info">
            <span class="hero-name" data-testid="hero-name">{hero.name}</span>
            <span class="hero-class">{hero.heroClass}</span>
          </div>
        </button>
      {/each}
    </div>
  </div>

  <!-- Middle section with left and right edges and center content -->
  <div class="middle-section">
    <!-- Left edge - heroes rotated 270° (90° counter-clockwise) for player sitting at left -->
    <div class="edge-zone edge-left" data-testid="edge-left">
      <div class="hero-column">
        {#each availableHeroes as hero (hero.id)}
          <button
            class="hero-card"
            class:selected={isSelectedOnEdge(hero.id, 'left')}
            class:unavailable={isSelectedOnOtherEdge(hero.id, 'left')}
            data-testid="hero-{hero.id}-left"
            onclick={() => handleHeroClick(hero.id, 'left')}
            disabled={isSelectedOnOtherEdge(hero.id, 'left')}
          >
            <img src={assetPath(hero.imagePath)} alt={hero.name} class="hero-image" />
            <div class="hero-info">
              <span class="hero-name" data-testid="hero-name">{hero.name}</span>
              <span class="hero-class">{hero.heroClass}</span>
            </div>
          </button>
        {/each}
      </div>
    </div>

    <!-- Center area with instructions and start button -->
    <div class="center-zone" data-testid="center-zone">
      <h1>Select Your Heroes</h1>
      <p class="instructions">Choose 1-5 heroes for your adventure</p>
      <p class="instructions">Tap a hero from your edge of the table</p>
      
      <div class="selection-info">
        <span data-testid="selected-count">{selectedHeroes.length} heroes selected</span>
      </div>
      
      <button
        class="start-button"
        data-testid="start-game-button"
        onclick={handleStartGame}
        disabled={!canStartGame()}
      >
        Start Adventure
      </button>
    </div>

    <!-- Right edge - heroes rotated 90° clockwise for player sitting at right -->
    <div class="edge-zone edge-right" data-testid="edge-right">
      <div class="hero-column">
        {#each availableHeroes as hero (hero.id)}
          <button
            class="hero-card"
            class:selected={isSelectedOnEdge(hero.id, 'right')}
            class:unavailable={isSelectedOnOtherEdge(hero.id, 'right')}
            data-testid="hero-{hero.id}-right"
            onclick={() => handleHeroClick(hero.id, 'right')}
            disabled={isSelectedOnOtherEdge(hero.id, 'right')}
          >
            <img src={assetPath(hero.imagePath)} alt={hero.name} class="hero-image" />
            <div class="hero-info">
              <span class="hero-name" data-testid="hero-name">{hero.name}</span>
              <span class="hero-class">{hero.heroClass}</span>
            </div>
          </button>
        {/each}
      </div>
    </div>
  </div>

  <!-- Bottom edge - heroes at 0° for player sitting at bottom (standard orientation) -->
  <div class="edge-zone edge-bottom" data-testid="edge-bottom">
    <div class="hero-row">
      {#each availableHeroes as hero (hero.id)}
        <button
          class="hero-card"
          class:selected={isSelectedOnEdge(hero.id, 'bottom')}
          class:unavailable={isSelectedOnOtherEdge(hero.id, 'bottom')}
          data-testid="hero-{hero.id}"
          onclick={() => handleHeroClick(hero.id, 'bottom')}
          disabled={isSelectedOnOtherEdge(hero.id, 'bottom')}
        >
          <img src={assetPath(hero.imagePath)} alt={hero.name} class="hero-image" />
          <div class="hero-info">
            <span class="hero-name" data-testid="hero-name">{hero.name}</span>
            <span class="hero-class">{hero.heroClass}</span>
          </div>
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .character-select {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    color: #fff;
    overflow: hidden;
  }
  
  /* Edge zones for each side of the table */
  .edge-zone {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0.5rem;
    background: rgba(0, 0, 0, 0.2);
  }
  
  .edge-top {
    transform: rotate(180deg);
  }
  
  .edge-left {
    transform: rotate(90deg);
  }
  
  .edge-right {
    transform: rotate(-90deg);
  }
  
  .edge-bottom {
    /* No rotation - standard orientation */
  }
  
  /* Hero row for top and bottom edges */
  .hero-row {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    justify-content: center;
    align-items: center;
  }
  
  /* Hero column for left and right edges */
  .hero-column {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    justify-content: center;
    align-items: center;
  }
  
  /* Middle section containing left edge, center, and right edge */
  .middle-section {
    flex: 1;
    display: flex;
    flex-direction: row;
    min-height: 0;
  }
  
  /* Center zone for shared content */
  .center-zone {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 1rem;
  }
  
  h1 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  }
  
  .instructions {
    color: #aaa;
    margin: 0.25rem 0;
    text-align: center;
  }
  
  .hero-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease-out;
    min-width: 80px;
  }
  
  .hero-card:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
    transform: scale(1.05);
  }
  
  .hero-card.selected {
    border-color: #ffd700;
    background: rgba(255, 215, 0, 0.2);
    box-shadow: 0 0 15px rgba(255, 215, 0, 0.4);
  }
  
  .hero-card.unavailable {
    opacity: 0.3;
    cursor: not-allowed;
    filter: grayscale(100%);
  }
  
  .hero-card:disabled {
    cursor: not-allowed;
  }
  
  .hero-image {
    width: 60px;
    height: 60px;
    object-fit: contain;
    margin-bottom: 0.25rem;
    transition: transform 0.3s ease-out;
  }
  
  .hero-info {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .hero-name {
    font-weight: bold;
    font-size: 0.8rem;
  }
  
  .hero-class {
    color: #aaa;
    font-size: 0.7rem;
  }
  
  .selection-info {
    margin: 1rem 0;
    color: #aaa;
    font-size: 1.1rem;
  }
  
  .start-button {
    padding: 1rem 2rem;
    font-size: 1.1rem;
    font-weight: bold;
    background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
    color: #1a1a2e;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease-out;
    min-width: 44px;
    min-height: 44px;
  }
  
  .start-button:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 4px 20px rgba(255, 215, 0, 0.5);
  }
  
  .start-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #666;
  }
</style>
