<script lang="ts">
  import type { HazardState } from '../store/types';
  import { assetPath } from '../utils';
  import { getEncounterById } from '../store/encounters';
  
  interface Props {
    hazard: HazardState;
    cellSize: number;
    tileOffsetX: number;
    tileOffsetY: number;
    tilePixelOffset: { x: number; y: number };
  }
  
  let { hazard, cellSize, tileOffsetX, tileOffsetY, tilePixelOffset }: Props = $props();
  
  // Calculate pixel position
  let pixelX = $derived(hazard.position.x * cellSize + tileOffsetX + tilePixelOffset.x);
  let pixelY = $derived(hazard.position.y * cellSize + tileOffsetY + tilePixelOffset.y);
  
  // Get hazard icon
  const encounter = getEncounterById(hazard.encounterId);
  const hazardIcon = encounter?.imagePath || '';
</script>

<div
  class="hazard-marker"
  style="left: {pixelX}px; top: {pixelY}px; width: {cellSize}px; height: {cellSize}px;"
  data-testid="hazard-marker"
  data-hazard-id={hazard.id}
  title={encounter?.name || 'Hazard'}
>
  {#if hazardIcon}
    <img 
      src={assetPath(hazardIcon)} 
      alt={encounter?.name || 'Hazard'}
      class="hazard-icon"
      onerror={(e) => {
        const img = e.target as HTMLImageElement;
        if (img) {
          img.style.display = 'none';
        }
      }}
    />
  {:else}
    <span class="hazard-emoji">☠️</span>
  {/if}
</div>

<style>
  .hazard-marker {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 5;
  }
  
  .hazard-icon {
    width: 90%;
    height: 90%;
    object-fit: contain;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
  }
  
  .hazard-emoji {
    font-size: 2rem;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
  }
</style>
