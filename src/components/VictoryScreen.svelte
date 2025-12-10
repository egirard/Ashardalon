<script lang="ts">
  import { store } from '../store';
  import { resetGame } from '../store/gameSlice';
  import type { ScenarioState } from '../store/types';
  import { TrophyIcon } from './icons';
  
  let scenario: ScenarioState = $state({ 
    monstersDefeated: 0, 
    monstersToDefeat: 2, 
    objective: "Defeat 2 monsters" 
  });
  
  // Subscribe to store updates
  $effect(() => {
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      scenario = state.game.scenario;
    });
    
    // Initialize state
    const state = store.getState();
    scenario = state.game.scenario;
    
    return unsubscribe;
  });
  
  function handleReturnToMenu() {
    store.dispatch(resetGame());
  }
</script>

<div class="victory-screen" data-testid="victory-screen">
  <div class="victory-content">
    <div class="victory-icon">
      <TrophyIcon size={80} ariaLabel="Victory" />
    </div>
    <h1 class="victory-title">Victory!</h1>
    <p class="victory-message">You have defeated {scenario.monstersDefeated} monsters and completed the objective!</p>
    <div class="victory-objective">
      <span class="objective-label">Objective Complete:</span>
      <span class="objective-text">{scenario.objective}</span>
    </div>
    <button 
      class="return-button" 
      data-testid="return-to-menu-button"
      onclick={handleReturnToMenu}
    >
      Return to Character Select
    </button>
  </div>
</div>

<style>
  .victory-screen {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    color: #fff;
  }
  
  .victory-content {
    text-align: center;
    padding: 3rem;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 16px;
    border: 2px solid #ffd700;
    box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
    max-width: 500px;
  }
  
  .victory-icon {
    margin-bottom: 1rem;
    display: flex;
    justify-content: center;
  }
  
  .victory-title {
    font-size: 3rem;
    color: #ffd700;
    margin: 0 0 1rem 0;
    text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
  }
  
  .victory-message {
    font-size: 1.25rem;
    color: #ddd;
    margin-bottom: 1.5rem;
  }
  
  .victory-objective {
    background: rgba(255, 215, 0, 0.1);
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 2rem;
    border: 1px solid rgba(255, 215, 0, 0.3);
  }
  
  .objective-label {
    display: block;
    font-size: 0.9rem;
    color: #aaa;
    margin-bottom: 0.5rem;
  }
  
  .objective-text {
    font-size: 1.1rem;
    color: #4ade80;
    font-weight: bold;
  }
  
  .return-button {
    padding: 1rem 2rem;
    font-size: 1.1rem;
    background: #ffd700;
    color: #1a1a2e;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.3s ease-out;
    min-width: 44px;
    min-height: 44px;
  }
  
  .return-button:hover {
    background: #ffed4a;
    transform: scale(1.05);
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
  }
</style>
