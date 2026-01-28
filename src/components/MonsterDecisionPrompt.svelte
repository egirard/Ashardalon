<script lang="ts">
  import { store } from '../store';
  import type { PendingMonsterDecision } from '../store/types';
  import type { EdgePosition } from '../store/heroesSlice';
  import { MONSTERS } from '../store/types';
  import { getEdgeRotation } from '../utils';
  
  export let decision: PendingMonsterDecision;
  export let edge: EdgePosition = 'bottom';
  
  // Get hero names for display
  $: heroes = decision.options.heroIds || [];
  
  function selectHero(heroId: string) {
    store.dispatch({
      type: 'game/selectMonsterTarget',
      payload: { decisionId: decision.decisionId, targetHeroId: heroId }
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

<div 
  class="monster-decision-prompt"
  class:edge-top={edge === 'top'}
  class:edge-bottom={edge === 'bottom'}
  class:edge-left={edge === 'left'}
  class:edge-right={edge === 'right'}
  data-testid="monster-decision-prompt"
  style="transform: rotate({getEdgeRotation(edge)}deg);"
>
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
      <div class="position-hint">
        <p class="hint-text">Click on a highlighted square on the map</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .monster-decision-prompt {
    position: fixed;
    background: linear-gradient(135deg, rgba(20, 20, 40, 0.98), rgba(40, 20, 60, 0.98));
    border: 3px solid #ffd700;
    padding: 30px;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
    z-index: 2000;
    min-width: 400px;
    max-width: 600px;
    /* transform is set inline to include rotation */
  }
  
  /* Bottom edge - at bottom center (default) */
  .monster-decision-prompt.edge-bottom {
    bottom: 20px;
    left: 50%;
    transform-origin: center bottom;
    margin-left: calc(-200px); /* Half of min-width */
  }
  
  /* Top edge - at top center */
  .monster-decision-prompt.edge-top {
    top: 20px;
    left: 50%;
    transform-origin: center top;
    margin-left: calc(-200px); /* Half of min-width */
  }
  
  /* Left edge - at left center */
  .monster-decision-prompt.edge-left {
    left: 20px;
    top: 50%;
    transform-origin: left center;
    margin-top: calc(-100px);
  }
  
  /* Right edge - at right center */
  .monster-decision-prompt.edge-right {
    right: 20px;
    top: 50%;
    transform-origin: right center;
    margin-top: calc(-100px);
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
  
  .hero-options {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .position-hint {
    margin-top: 10px;
  }
  
  .hero-button {
    padding: 12px 24px;
    font-size: 16px;
    background: linear-gradient(135deg, #2a4a7a, #1a3a5a);
    border: 2px solid #4a7aaa;
    color: white;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .hero-button:hover {
    background: linear-gradient(135deg, #3a5a8a, #2a4a6a);
    border-color: #6a9aca;
    transform: scale(1.05);
    box-shadow: 0 0 15px rgba(106, 154, 202, 0.5);
  }
  
  .hero-button:active {
    transform: scale(0.98);
  }
  
  .hint-text {
    font-size: 16px;
    color: #ffd700;
    font-style: italic;
    margin: 0;
    text-align: center;
  }
</style>
