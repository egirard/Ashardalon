<script lang="ts">
  /**
   * Tile Icon Component
   * Represents dungeon tiles/map pieces
   */
  
  interface Props {
    size?: number;
    color?: string;
    ariaLabel?: string;
  }
  
  let { size = 20, color = 'currentColor', ariaLabel = 'Tile' }: Props = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke={color}
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  role={ariaLabel ? 'img' : undefined}
  aria-label={ariaLabel}
>
  <!-- Grid pattern representing dungeon tiles -->
  <rect x="3" y="3" width="8" height="8" fill={color} fill-opacity="0.3" />
  <rect x="13" y="3" width="8" height="8" fill={color} fill-opacity="0.2" />
  <rect x="3" y="13" width="8" height="8" fill={color} fill-opacity="0.2" />
  <rect x="13" y="13" width="8" height="8" fill={color} fill-opacity="0.3" />
  <!-- Grid lines -->
  <line x1="11" y1="3" x2="11" y2="21" />
  <line x1="3" y1="11" x2="21" y2="11" />
</svg>
