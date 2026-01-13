<script lang="ts">
  import type { Hero } from '../store/types';
  import type { EdgePosition, SidePreference } from '../store/heroesSlice';
  import { assetPath } from '../utils';
  
  interface Props {
    hero: Hero;
    side: SidePreference;
    edge: EdgePosition;
    onSwap: () => void;
    onPowerSelect: () => void;
    onDeselect: () => void;
    powerCountText: string;
    isPowerSelectionComplete: boolean;
  }
  
  let { hero, side, edge, onSwap, onPowerSelect, onDeselect, powerCountText, isPowerSelectionComplete }: Props = $props();
  
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
    <button
      class="power-button"
      class:complete={isPowerSelectionComplete}
      onclick={onPowerSelect}
      data-testid="power-button-{hero.id}-{side}"
      aria-label="{isPowerSelectionComplete ? 'Powers selected for' : 'Select powers for'} {hero.name}"
      title="Click to change powers"
    >
      {powerCountText}
    </button>
    
    <button 
      class="hero-preview"
      onclick={onDeselect}
      data-testid="deselect-{hero.id}-{side}"
      aria-label="Deselect {hero.name}"
      title="Click to deselect character"
    >
      <img src={assetPath(hero.imagePath)} alt={hero.name} class="hero-image" />
      <div class="hero-label">
        <span class="hero-name">{hero.name}</span>
      </div>
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
  }
  
  .panel-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
  }
  
  .power-button {
    font-size: 0.75rem;
    font-weight: 600;
    color: #000;
    background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
    padding: 0.3rem 0.6rem;
    border-radius: 4px;
    border: 2px solid rgba(255, 165, 0, 0.5);
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }
  
  .power-button:hover {
    background: linear-gradient(135deg, #ffed4e 0%, #ff9c1a 100%);
    transform: scale(1.05);
    box-shadow: 0 0 15px rgba(255, 165, 0, 0.5);
  }
  
  .power-button.complete {
    border-color: #4caf50;
    background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
    color: #fff;
  }
  
  .power-button.complete:hover {
    background: linear-gradient(135deg, #5cb85c 0%, #4caf50 100%);
    box-shadow: 0 0 15px rgba(76, 175, 80, 0.5);
  }
  
  .hero-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0.4rem;
    border-radius: 8px;
    transition: all 0.2s ease;
  }
  
  .hero-preview:hover {
    background: rgba(255, 50, 50, 0.2);
    transform: scale(1.05);
  }
  
  .hero-preview:hover .hero-name {
    color: #ff6b6b;
  }
  
  .hero-image {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    border: 2px solid rgba(255, 215, 0, 0.8);
    object-fit: cover;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
    transition: all 0.2s ease;
  }
  
  .hero-preview:hover .hero-image {
    border-color: rgba(255, 50, 50, 0.8);
  }
  
  .hero-label {
    text-align: center;
  }
  
  .hero-name {
    font-size: 0.85rem;
    font-weight: bold;
    color: #ffd700;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
    transition: color 0.2s ease;
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
