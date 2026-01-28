<script lang="ts">
  /**
   * FontSizeIcon Component
   * SVG icon representing text/font size adjustment
   * Shows "Aa" to represent font/text scaling
   */
  
  interface Props {
    size?: number;
    color?: string;
    ariaLabel?: string;
  }
  
  let { size = 20, color = 'currentColor', ariaLabel = 'Font Size' }: Props = $props();
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
  <!-- Large "A" -->
  <path d="M4 18L8 6h2l4 12"></path>
  <line x1="5" y1="14" x2="13" y2="14"></line>
  <!-- Small "a" -->
  <path d="M15 18v-6"></path>
  <circle cx="17.5" cy="14" r="2.5"></circle>
  <path d="M15 18h5"></path>
</svg>
