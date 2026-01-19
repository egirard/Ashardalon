<script lang="ts">
  import type { TreasureTokenState } from '../store/types';
  import { assetPath } from '../utils';
  
  interface Props {
    treasureToken: TreasureTokenState;
    cellSize: number;
    tileOffsetX: number;
    tileOffsetY: number;
    tilePixelOffset: { x: number; y: number };
  }
  
  let { treasureToken, cellSize, tileOffsetX, tileOffsetY, tilePixelOffset }: Props = $props();
  
  // Calculate pixel position
  let pixelX = $derived(treasureToken.position.x * cellSize + tileOffsetX + tilePixelOffset.x);
  let pixelY = $derived(treasureToken.position.y * cellSize + tileOffsetY + tilePixelOffset.y);
  
  // Use the treasure token icon
  const treasureIcon = 'assets/Token_TreasureTreasure.png';
</script>

<div
  class="treasure-token-marker"
  style="left: {pixelX}px; top: {pixelY}px; width: {cellSize}px; height: {cellSize}px;"
  data-testid="treasure-token-marker"
  data-treasure-token-id={treasureToken.id}
  title="Treasure Token"
>
  <img 
    src={assetPath(treasureIcon)} 
    alt="Treasure Token"
    class="treasure-token-icon"
    onerror={(e) => {
      const img = e.target as HTMLImageElement;
      if (img) {
        img.style.display = 'none';
      }
    }}
  />
</div>

<style>
  .treasure-token-marker {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 5;
    animation: pulse 2s ease-in-out infinite;
  }
  
  .treasure-token-icon {
    width: 90%;
    height: 90%;
    object-fit: contain;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.05);
    }
  }
</style>
