<script lang="ts">
  /**
   * Home Icon Component
   * Simple house/home icon for "Return to Character Select"
   */
  
  interface Props {
    size?: number;
    color?: string;
    ariaLabel?: string;
  }
  
  let { size = 20, color = 'currentColor', ariaLabel = 'Home' }: Props = $props();
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
  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
  <polyline points="9 22 9 12 15 12 15 22"></polyline>
</svg>
