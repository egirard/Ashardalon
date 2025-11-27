<script lang="ts">
  import { store } from '../store';
  import { toggleHeroSelection } from '../store/heroesSlice';
  import { startGame } from '../store/gameSlice';
  import type { Hero } from '../store/types';
  
  let selectedHeroes: Hero[] = $state([]);
  let availableHeroes: Hero[] = $state([]);
  
  // Subscribe to store updates
  $effect(() => {
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      selectedHeroes = state.heroes.selectedHeroes;
      availableHeroes = state.heroes.availableHeroes;
    });
    
    // Initialize state
    const state = store.getState();
    selectedHeroes = state.heroes.selectedHeroes;
    availableHeroes = state.heroes.availableHeroes;
    
    return unsubscribe;
  });
  
  function isSelected(heroId: string): boolean {
    return selectedHeroes.some(h => h.id === heroId);
  }
  
  function handleHeroClick(heroId: string) {
    store.dispatch(toggleHeroSelection(heroId));
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
  <h1>Select Your Heroes</h1>
  <p class="instructions">Choose 1-5 heroes for your adventure</p>
  
  <div class="hero-grid" data-testid="hero-grid">
    {#each availableHeroes as hero (hero.id)}
      <button
        class="hero-card"
        class:selected={isSelected(hero.id)}
        data-testid="hero-{hero.id}"
        onclick={() => handleHeroClick(hero.id)}
      >
        <img src={hero.imagePath} alt={hero.name} class="hero-image" />
        <div class="hero-info">
          <span class="hero-name" data-testid="hero-name">{hero.name}</span>
          <span class="hero-class">{hero.heroClass}</span>
        </div>
      </button>
    {/each}
  </div>
  
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

<style>
  .character-select {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem;
    min-height: 100vh;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    color: #fff;
  }
  
  h1 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  }
  
  .instructions {
    color: #aaa;
    margin-bottom: 2rem;
  }
  
  .hero-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1.5rem;
    max-width: 900px;
    width: 100%;
    margin-bottom: 2rem;
  }
  
  .hero-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.1);
    border: 3px solid transparent;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .hero-card:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-4px);
  }
  
  .hero-card.selected {
    border-color: #ffd700;
    background: rgba(255, 215, 0, 0.2);
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.4);
  }
  
  .hero-image {
    width: 100px;
    height: 100px;
    object-fit: contain;
    margin-bottom: 0.5rem;
  }
  
  .hero-info {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .hero-name {
    font-weight: bold;
    font-size: 1.1rem;
  }
  
  .hero-class {
    color: #aaa;
    font-size: 0.9rem;
  }
  
  .selection-info {
    margin-bottom: 1.5rem;
    color: #aaa;
  }
  
  .start-button {
    padding: 1rem 3rem;
    font-size: 1.2rem;
    font-weight: bold;
    background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
    color: #1a1a2e;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
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
