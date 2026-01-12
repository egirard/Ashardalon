<script lang="ts">
  import type { Hero } from '../store/types';
  import type { EdgePosition, SidePreference } from '../store/heroesSlice';
  import { assetPath } from '../utils';
  
  interface Props {
    hero: Hero;
    side: SidePreference;
    edge: EdgePosition;
    onSwap: () => void;
  }
  
  let { hero, side, edge, onSwap }: Props = $props();
  
  // Determine arrow direction - arrow points to the opposite side
  const arrowDirection = $derived(side === 'left' ? '→' : '←');
  
  // Determine rotation based on edge
  const getRotation = () => {
    switch (edge) {
      case 'top': return 180;
      case 'left': return 90;
      case 'right': return -90;
      case 'bottom': return 0;
      default: return 0;
    }
  };
  
  const rotation = getRotation();
</script>

<div 
  class="duplicate-panel" 
  class:left={side === 'left'}
  class:right={side === 'right'}
  style="transform: rotate({rotation}deg);"
  data-testid="duplicate-panel-{hero.id}-{side}"
>
  <div class="panel-content">
    <div class="hero-preview">
      <img src={assetPath(hero.imagePath)} alt={hero.name} class="hero-image" />
      <div class="hero-label">
        <span class="hero-name">{hero.name}</span>
      </div>
    </div>
    <button 
      class="swap-arrow" 
      onclick={onSwap}
      aria-label="Swap {hero.name} to {side === 'left' ? 'right' : 'left'} side"
      data-testid="swap-arrow-{hero.id}-{side}"
    >
      <span class="arrow-icon">{arrowDirection}</span>
    </button>
  </div>
</div>

<style>
  .duplicate-panel {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(20, 20, 40, 0.95);
    border: 2px solid rgba(255, 215, 0, 0.6);
    border-radius: 12px;
    padding: 0.75rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 215, 0, 0.3);
    z-index: 10;
    transition: all 0.3s ease;
  }
  
  .duplicate-panel.left {
    left: -140px;
  }
  
  .duplicate-panel.right {
    right: -140px;
  }
  
  .duplicate-panel:hover {
    border-color: rgba(255, 215, 0, 0.9);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.7), 0 0 30px rgba(255, 215, 0, 0.5);
    transform: scale(1.05) rotate(var(--rotation));
  }
  
  .panel-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  
  .hero-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }
  
  .hero-image {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    border: 3px solid rgba(255, 215, 0, 0.8);
    object-fit: cover;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  }
  
  .hero-label {
    text-align: center;
  }
  
  .hero-name {
    font-size: 0.9rem;
    font-weight: bold;
    color: #ffd700;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
  }
  
  .swap-arrow {
    background: rgba(255, 215, 0, 0.2);
    border: 2px solid rgba(255, 215, 0, 0.6);
    border-radius: 8px;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 0;
  }
  
  .swap-arrow:hover {
    background: rgba(255, 215, 0, 0.4);
    border-color: rgba(255, 215, 0, 1);
    transform: scale(1.1);
  }
  
  .swap-arrow:active {
    transform: scale(0.95);
  }
  
  .arrow-icon {
    font-size: 1.5rem;
    font-weight: bold;
    color: #ffd700;
    text-shadow: 0 0 6px rgba(255, 215, 0, 0.8);
  }
</style>
