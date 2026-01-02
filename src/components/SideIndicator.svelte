<script lang="ts">
  import type { EdgePosition, SidePreference } from '../store/heroesSlice';
  
  interface Props {
    edge: EdgePosition;
    currentSide: SidePreference;
    heroesOnSameEdge: number;
    onSwap: () => void;
  }
  
  let { edge, currentSide, heroesOnSameEdge, onSwap }: Props = $props();
  
  // Only show the indicator if there are 2 or more heroes on the same edge
  const shouldShow = $derived(heroesOnSameEdge >= 2);
  
  // Determine arrow direction based on current side
  const arrowDirection = $derived(currentSide === 'left' ? '→' : '←');
</script>

{#if shouldShow}
  <div class="side-indicator" data-testid="side-indicator">
    <div class="side-squares">
      <!-- Left square -->
      <div 
        class="side-square"
        class:selected={currentSide === 'left'}
        data-testid="side-square-left"
        role="status"
        aria-label={currentSide === 'left' ? 'Left side position (selected)' : 'Left side position'}
      >
        {#if currentSide === 'left'}
          <div class="glow"></div>
        {/if}
      </div>
      
      <!-- Right square -->
      <button
        class="side-square arrow-square"
        class:selected={currentSide === 'right'}
        onclick={onSwap}
        data-testid="side-square-right"
        aria-label={currentSide === 'right' ? 'Right side position (selected)' : 'Swap to right side'}
      >
        {#if currentSide === 'right'}
          <div class="glow"></div>
        {:else}
          <span class="arrow">{arrowDirection}</span>
        {/if}
      </button>
    </div>
  </div>
{/if}

<style>
  .side-indicator {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 0.3rem;
  }
  
  .side-squares {
    display: flex;
    gap: 0.25rem;
  }
  
  .side-square {
    width: 32px;
    height: 28px;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    transition: all 0.2s ease;
  }
  
  .side-square.selected {
    border-color: #ffd700;
    background: rgba(255, 215, 0, 0.15);
  }
  
  .arrow-square {
    cursor: pointer;
    padding: 0;
  }
  
  .arrow-square:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.5);
    transform: scale(1.05);
  }
  
  .arrow-square.selected:hover {
    background: rgba(255, 215, 0, 0.25);
  }
  
  .glow {
    position: absolute;
    inset: -2px;
    border-radius: 4px;
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.6), inset 0 0 8px rgba(255, 215, 0, 0.4);
    pointer-events: none;
  }
  
  .arrow {
    font-size: 1rem;
    font-weight: bold;
    color: #fff;
    text-shadow: 0 0 4px rgba(255, 255, 255, 0.8);
  }
</style>
