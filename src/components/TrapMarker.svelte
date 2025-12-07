<script lang="ts">
  import type { TrapState } from '../store/types';
  import { assetPath } from '../utils';
  import { getEncounterById } from '../store/encounters';
  
  interface Props {
    trap: TrapState;
    cellSize: number;
    tileOffsetX: number;
    tileOffsetY: number;
    tilePixelOffset: { x: number; y: number };
  }
  
  let { trap, cellSize, tileOffsetX, tileOffsetY, tilePixelOffset }: Props = $props();
  
  // Calculate pixel position
  let pixelX = $derived(trap.position.x * cellSize + tileOffsetX + tilePixelOffset.x);
  let pixelY = $derived(trap.position.y * cellSize + tileOffsetY + tilePixelOffset.y);
  
  // Get trap icon
  const encounter = getEncounterById(trap.encounterId);
  const trapIcon = encounter?.imagePath || '';
</script>

<div
  class="trap-marker"
  style="left: {pixelX}px; top: {pixelY}px; width: {cellSize}px; height: {cellSize}px;"
  data-testid="trap-marker"
  data-trap-id={trap.id}
  title={encounter?.name || 'Trap'}
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
    <span class="trap-emoji">⚠️</span>
  {/if}
</div>

<style>
  .trap-marker {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 5;
  }
  
  .trap-icon {
    width: 90%;
    height: 90%;
    object-fit: contain;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
  }
  
  .trap-emoji {
    font-size: 2rem;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
  }
</style>
