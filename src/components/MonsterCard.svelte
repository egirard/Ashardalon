<script lang="ts">
  import type { Monster } from '../store/types';
  import { MONSTERS } from '../store/types';
  import { assetPath, getEdgeRotation } from '../utils';
  import type { EdgePosition } from '../store/heroesSlice';
  
  interface Props {
    monsterId: string;
    onDismiss?: () => void;
    edge?: EdgePosition;
    autoDismiss?: boolean;
  }
  
  let { monsterId, onDismiss, edge = 'bottom', autoDismiss = true }: Props = $props();
  
  // Get monster definition
  const monster = $derived(MONSTERS.find(m => m.id === monsterId));
  
  // Auto-dismiss state
  let fadeOut = $state(false);
  
  // Auto-dismiss after 3 seconds (1s visible + 2s fade) if enabled
  $effect(() => {
    if (!autoDismiss || !onDismiss) return;
    
    // Wait 1 second, then start fade out
    const fadeTimer = setTimeout(() => {
      fadeOut = true;
    }, 1000);
    
    // After fade completes (2 more seconds), dismiss
    const dismissTimer = setTimeout(() => {
      onDismiss();
    }, 3000);
    
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  });
  
  function handleDismiss() {
    if (onDismiss) {
      onDismiss();
    }
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleDismiss();
    }
  }
</script>

{#if monster}
  <div 
    class="monster-card-overlay"
    class:fade-out={fadeOut}
    onclick={handleDismiss}
    onkeydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-label="Monster spawned"
    tabindex="0"
    data-testid="monster-card-overlay"
  >
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div 
      class="monster-card" 
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="article"
      data-testid="monster-card"
      style="transform: rotate({getEdgeRotation(edge)}deg);"
    >
      <div class="card-header">
        <h3 class="monster-name" data-testid="monster-name">{monster.name}</h3>
        <button 
          class="dismiss-button" 
          onclick={handleDismiss}
          aria-label="Dismiss monster card"
          data-testid="dismiss-monster-card"
        >
          ✕
        </button>
      </div>
      
      <div class="card-image">
        <img 
          src={assetPath(monster.imagePath)} 
          alt={monster.name}
          class="monster-image"
        />
      </div>
      
      <div class="card-stats">
        <div class="stat">
          <span class="stat-label">AC</span>
          <span class="stat-value" data-testid="monster-ac">{monster.ac}</span>
        </div>
        <div class="stat">
          <span class="stat-label">HP</span>
          <span class="stat-value" data-testid="monster-hp">{monster.hp}</span>
        </div>
        <div class="stat">
          <span class="stat-label">XP</span>
          <span class="stat-value" data-testid="monster-xp">{monster.xp}</span>
        </div>
      </div>
      
      <p class="card-hint">Click anywhere to dismiss</p>
    </div>
  </div>
{/if}

<style>
  .monster-card-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
    cursor: pointer;
    opacity: 1;
    transition: opacity 2s ease-out;
  }
  
  .monster-card-overlay.fade-out {
    opacity: 0;
  }
  
  .monster-card {
    background: linear-gradient(145deg, #2d1414 0%, #1a0a0a 100%);
    border: 3px solid #cc3333;
    border-radius: 12px;
    padding: 1.5rem;
    min-width: 280px;
    max-width: 320px;
    box-shadow: 0 8px 32px rgba(200, 0, 0, 0.3);
    cursor: default;
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    border-bottom: 1px solid #cc3333;
    padding-bottom: 0.75rem;
  }
  
  .monster-name {
    margin: 0;
    font-size: 1.25rem;
    color: #ff6666;
    text-shadow: 0 0 10px rgba(255, 100, 100, 0.5);
  }
  
  .dismiss-button {
    background: transparent;
    border: none;
    color: #cc3333;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0.25rem;
    line-height: 1;
    transition: color 0.2s;
  }
  
  .dismiss-button:hover {
    color: #ff6666;
  }
  
  .card-image {
    display: flex;
    justify-content: center;
    margin-bottom: 1rem;
  }
  
  .monster-image {
    width: 100px;
    height: 100px;
    object-fit: contain;
    border: 2px solid #cc3333;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.5);
  }
  
  .card-stats {
    display: flex;
    justify-content: space-around;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
  }
  
  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }
  
  .stat-label {
    font-size: 0.75rem;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .stat-value {
    font-size: 1.5rem;
    font-weight: bold;
    color: #fff;
  }
  
  .card-hint {
    text-align: center;
    color: #666;
    font-size: 0.75rem;
    margin: 0;
  }
</style>
