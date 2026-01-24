<script lang="ts">
  import { store } from '../store';
  import type { PendingMonsterDecision } from '../store/types';
  import { MONSTERS } from '../store/types';
  
  export let decision: PendingMonsterDecision;
  
  // Get hero names for display
  $: heroes = decision.options.heroIds || [];
  
  function selectHero(heroId: string) {
    store.dispatch({
      type: 'game/selectMonsterTarget',
      payload: { decisionId: decision.decisionId, targetHeroId: heroId }
    });
  }
  
  function selectPosition(position: { x: number; y: number }) {
    store.dispatch({
      type: 'game/selectMonsterPosition',
      payload: { decisionId: decision.decisionId, position }
    });
  }
  
  // Get monster name for display using centralized monster definitions
  $: monsterName = (() => {
    const state = store.getState();
    const monster = state.game.monsters.find(m => m.instanceId === decision.monsterId);
    if (monster) {
      // Look up monster definition from centralized MONSTERS array
      const monsterDef = MONSTERS.find(m => m.id === monster.monsterId);
      return monsterDef?.name || monster.monsterId;
    }
    return 'Monster';
  })();
  
  $: promptText = (() => {
    switch (decision.type) {
      case 'choose-hero-target':
      case 'choose-adjacent-target':
        return `Select which hero the ${monsterName} should target:`;
      case 'choose-move-destination':
        return `Select where the ${monsterName} should move:`;
      case 'choose-spawn-position':
        return `Select where to place the ${monsterName}:`;
      default:
        return 'Select an option:';
    }
  })();
</script>

<div class="monster-decision-prompt" data-testid="monster-decision-prompt">
  <div class="prompt-content">
    <h3>Monster Decision Required</h3>
    <p class="prompt-text">{promptText}</p>
    
    {#if decision.type === 'choose-hero-target' || decision.type === 'choose-adjacent-target'}
      <div class="hero-options">
        {#each heroes as heroId}
          <button 
            class="hero-button"
            data-testid="monster-decision-hero-{heroId}"
            on:click={() => selectHero(heroId)}
          >
            {heroId.charAt(0).toUpperCase() + heroId.slice(1)}
          </button>
        {/each}
      </div>
    {/if}
    
    {#if decision.type === 'choose-move-destination' || decision.type === 'choose-spawn-position'}
      <div class="position-options">
        <p class="hint">Click on a highlighted square on the map</p>
        {#if decision.options.positions}
          {#each decision.options.positions as position}
            <button 
              class="position-button"
              data-testid="monster-decision-position-{position.x}-{position.y}"
              on:click={() => selectPosition(position)}
            >
              ({position.x}, {position.y})
            </button>
          {/each}
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .monster-decision-prompt {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, rgba(20, 20, 40, 0.98), rgba(40, 20, 60, 0.98));
    border: 3px solid #ffd700;
    padding: 30px;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
    z-index: 2000;
    min-width: 400px;
    max-width: 600px;
  }
  
  .prompt-content {
    text-align: center;
  }
  
  h3 {
    margin: 0 0 15px 0;
    color: #ffd700;
    font-size: 24px;
    text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  }
  
  .prompt-text {
    color: #ffffff;
    font-size: 18px;
    margin-bottom: 20px;
  }
  
  .hero-options, .position-options {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .hero-button, .position-button {
    padding: 12px 24px;
    font-size: 16px;
    background: linear-gradient(135deg, #2a4a7a, #1a3a5a);
    border: 2px solid #4a7aaa;
    color: white;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .hero-button:hover, .position-button:hover {
    background: linear-gradient(135deg, #3a5a8a, #2a4a6a);
    border-color: #6a9aca;
    transform: scale(1.05);
    box-shadow: 0 0 15px rgba(106, 154, 202, 0.5);
  }
  
  .hero-button:active, .position-button:active {
    transform: scale(0.98);
  }
  
  .hint {
    font-size: 14px;
    color: #aaaaaa;
    font-style: italic;
    margin-bottom: 10px;
  }
</style>
