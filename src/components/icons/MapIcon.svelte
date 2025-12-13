<script lang="ts">
  /**
   * Map Icon Component
   * Map/navigation icon for "Control Map"
   */
  
  interface Props {
    size?: number;
    color?: string;
    ariaLabel?: string;
  }
  
  let { size = 20, color = 'currentColor', ariaLabel = 'Map' }: Props = $props();
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
  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
  <line x1="8" y1="2" x2="8" y2="18"></line>
  <line x1="16" y1="6" x2="16" y2="22"></line>
</svg>
