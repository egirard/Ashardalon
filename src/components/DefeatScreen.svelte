<script lang="ts">
  import { store } from '../store';
  import { resetGame } from '../store/gameSlice';
  import type { ScenarioState } from '../store/types';
  import { SkullIcon } from './icons';
  
  let scenario: ScenarioState = $state({ 
    monstersDefeated: 0, 
    monstersToDefeat: 12, 
    objective: "Defeat 12 monsters" 
  });
  let defeatReason: string | null = $state(null);
  
  // Subscribe to store updates
  $effect(() => {
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      scenario = state.game.scenario;
      defeatReason = state.game.defeatReason;
    });
    
    // Initialize state
    const state = store.getState();
    scenario = state.game.scenario;
    defeatReason = state.game.defeatReason;
    
    return unsubscribe;
  });
  
  function handleNewGame() {
    store.dispatch(resetGame());
  }
</script>

<div class="defeat-screen" data-testid="defeat-screen">
  <div class="defeat-content">
    <div class="defeat-icon">
      <SkullIcon size={80} color="#dc2626" ariaLabel="Defeat" />
    </div>
    <h1 class="defeat-title">Defeat</h1>
    <p class="defeat-message" data-testid="defeat-message">
      {#if defeatReason}
        {defeatReason}
      {:else}
        Your party has been eliminated before completing the objective.
      {/if}
    </p>
    <div class="defeat-progress">
      <span class="progress-label">Progress:</span>
      <span class="progress-text" data-testid="defeat-progress">{scenario.monstersDefeated} / {scenario.monstersToDefeat} monsters defeated</span>
    </div>
    <div class="defeat-objective">
      <span class="objective-label">Objective:</span>
      <span class="objective-text">{scenario.objective}</span>
    </div>
    <button 
      class="new-game-button" 
      data-testid="new-game-button"
      onclick={handleNewGame}
    >
      New Game
    </button>
  </div>
</div>

<style>
  .defeat-screen {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: linear-gradient(135deg, #1a1a2e 0%, #2d1b1b 50%, #3d1f1f 100%);
    color: #fff;
  }
  
  .defeat-content {
    text-align: center;
    padding: 3rem;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 16px;
    border: 2px solid #dc2626;
    box-shadow: 0 0 30px rgba(220, 38, 38, 0.3);
    max-width: 500px;
  }
  
  .defeat-icon {
    margin-bottom: 1rem;
    display: flex;
    justify-content: center;
  }
  
  .defeat-title {
    font-size: 3rem;
    color: #dc2626;
    margin: 0 0 1rem 0;
    text-shadow: 0 0 20px rgba(220, 38, 38, 0.5);
  }
  
  .defeat-message {
    font-size: 1.25rem;
    color: #ddd;
    margin-bottom: 1.5rem;
  }
  
  .defeat-progress {
    background: rgba(220, 38, 38, 0.1);
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    border: 1px solid rgba(220, 38, 38, 0.3);
  }
  
  .progress-label {
    display: block;
    font-size: 0.9rem;
    color: #aaa;
    margin-bottom: 0.5rem;
  }
  
  .progress-text {
    font-size: 1.1rem;
    color: #fbbf24;
    font-weight: bold;
  }
  
  .defeat-objective {
    background: rgba(100, 100, 100, 0.1);
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 2rem;
    border: 1px solid rgba(100, 100, 100, 0.3);
  }
  
  .objective-label {
    display: block;
    font-size: 0.9rem;
    color: #aaa;
    margin-bottom: 0.5rem;
  }
  
  .objective-text {
    font-size: 1.1rem;
    color: #f87171;
    font-weight: bold;
  }
  
  .new-game-button {
    padding: 1rem 2rem;
    font-size: 1.1rem;
    background: #dc2626;
    color: #fff;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.3s ease-out;
    min-width: 44px;
    min-height: 44px;
  }
  
  .new-game-button:hover {
    background: #ef4444;
    transform: scale(1.05);
    box-shadow: 0 0 20px rgba(220, 38, 38, 0.5);
  }
</style>
