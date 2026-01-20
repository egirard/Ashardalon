<script lang="ts">
  import type { TrapState } from '../store/types';
  import { assetPath } from '../utils';
  import { getEncounterById } from '../store/encounters';
  import { WarningIcon } from './icons';
  
  interface Props {
    trap: TrapState;
    cellSize: number;
    tileOffsetX: number;
    tileOffsetY: number;
    tilePixelOffset: { x: number; y: number };
    canDisable?: boolean;
    onClick?: (trapId: string) => void;
  }
  
  let { trap, cellSize, tileOffsetX, tileOffsetY, tilePixelOffset, canDisable = false, onClick }: Props = $props();
  
  // Calculate pixel position
  let pixelX = $derived(trap.position.x * cellSize + tileOffsetX + tilePixelOffset.x);
  let pixelY = $derived(trap.position.y * cellSize + tileOffsetY + tilePixelOffset.y);
  
  // Get trap icon
  const encounter = getEncounterById(trap.encounterId);
  const trapIcon = encounter?.imagePath || '';
  
  function handleClick() {
    if (canDisable && onClick) {
      onClick(trap.id);
    }
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (canDisable && onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick(trap.id);
    }
  }
</script>

<button
  class="trap-marker"
  class:clickable={canDisable}
  style="left: {pixelX}px; top: {pixelY}px; width: {cellSize}px; height: {cellSize}px;"
  data-testid="trap-marker"
  data-trap-id={trap.id}
  title={canDisable ? `${encounter?.name || 'Trap'} (Click to disable)` : (encounter?.name || 'Trap')}
  disabled={!canDisable}
  onclick={handleClick}
  onkeydown={handleKeydown}
  aria-label={canDisable ? `Disable ${encounter?.name || 'Trap'}` : `${encounter?.name || 'Trap'} (cannot disable from here)`}
>
  {#if trapIcon}
    <img 
      src={assetPath(trapIcon)} 
      alt={encounter?.name || 'Trap'}
      class="trap-icon"
      onerror={(e) => {
        const img = e.target as HTMLImageElement;
        if (img) {
          img.style.display = 'none';
        }
      }}
    />
  {:else}
    <WarningIcon size={32} ariaLabel="Trap" />
  {/if}
  {#if canDisable}
    <div class="disable-hint">Click to disable</div>
  {/if}
</button>

<style>
  .trap-marker {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 5;
    background: none;
    border: none;
    padding: 0;
    transition: transform 0.2s, filter 0.2s;
  }
  
  .trap-marker:not(.clickable) {
    pointer-events: none;
  }
  
  .trap-marker.clickable {
    pointer-events: auto;
    cursor: pointer;
  }
  
  .trap-marker.clickable:hover {
    transform: scale(1.1);
    filter: brightness(1.3);
  }
  
  .trap-marker.clickable:active {
    transform: scale(1.05);
  }
  
  .trap-marker.clickable:focus-visible {
    outline: 3px solid #ffd700;
    outline-offset: 4px;
    border-radius: 8px;
  }
  
  .trap-icon {
    width: 90%;
    height: 90%;
    object-fit: contain;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
    pointer-events: none;
  }
  
  .disable-hint {
    position: absolute;
    bottom: -20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.85);
    color: #ffd700;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: bold;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s;
    z-index: 10;
  }
  
  .trap-marker.clickable:hover .disable-hint {
    opacity: 1;
  }

</style>
