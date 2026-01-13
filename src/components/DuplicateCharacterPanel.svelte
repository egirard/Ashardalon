<script lang="ts">
  import type { Hero } from '../store/types';
  import type { EdgePosition, SidePreference } from '../store/heroesSlice';
  import { assetPath } from '../utils';
  
  interface Props {
    hero: Hero;
    side: SidePreference;
    edge: EdgePosition;
    onSwap: () => void;
    powerCountText: string;
  }
  
  let { hero, side, edge, onSwap, powerCountText }: Props = $props();
  
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
  <button 
    class="swap-arrow" 
    onclick={onSwap}
    aria-label="Swap {hero.name} to {side === 'left' ? 'right' : 'left'} side"
    data-testid="swap-arrow-{hero.id}-{side}"
  >
    <span class="arrow-icon">{arrowDirection}</span>
  </button>
  
  <div class="panel-content">
    <div class="power-count">{powerCountText}</div>
    <div class="hero-preview">
      <img src={assetPath(hero.imagePath)} alt={hero.name} class="hero-image" />
      <div class="hero-label">
        <span class="hero-name">{hero.name}</span>
      </div>
    </div>
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
    padding-top: 3rem;
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
    transform: scale(1.05);
  }
  
  .panel-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
  }
  
  .power-count {
    font-size: 0.75rem;
    font-weight: 600;
    color: #4ade80;
    background: rgba(34, 197, 94, 0.2);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    border: 1px solid rgba(34, 197, 94, 0.4);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  }
  
  .hero-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
  }
  
  .hero-image {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    border: 2px solid rgba(255, 215, 0, 0.8);
    object-fit: cover;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  }
  
  .hero-label {
    text-align: center;
  }
  
  .hero-name {
    font-size: 0.85rem;
    font-weight: bold;
    color: #ffd700;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
  }
  
  .swap-arrow {
    position: absolute;
    top: -20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 215, 0, 0.2);
    border: 2px solid rgba(255, 215, 0, 0.6);
    border-radius: 6px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 0;
    z-index: 1;
  }
  
  .swap-arrow:hover {
    background: rgba(255, 215, 0, 0.4);
    border-color: rgba(255, 215, 0, 1);
    transform: translateX(-50%) scale(1.1);
  }
  
  .swap-arrow:active {
    transform: translateX(-50%) scale(0.95);
  }
  
  .arrow-icon {
    font-size: 1.3rem;
    font-weight: bold;
    color: #ffd700;
    text-shadow: 0 0 6px rgba(255, 215, 0, 0.8);
  }
</style>
