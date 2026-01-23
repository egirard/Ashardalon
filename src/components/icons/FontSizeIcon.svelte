<script lang="ts">
  /**
   * FontSizeIcon Component
   * SVG icon representing text/font size adjustment
   */
  import Icon from './Icon.svelte';
  
  interface Props {
    size?: number;
    color?: string;
    ariaLabel?: string;
  }
  
  let { size = 24, color = 'currentColor', ariaLabel = 'Font Size' }: Props = $props();
</script>

<Icon {size} {color} {ariaLabel} viewBox="0 0 24 24">
  <!-- Large "A" for font size -->
  <path
    d="M9 4L6 14h2l0.75-2.5h3.5L13 14h2L12 4H9zm0.85 2h1.3l1.35 4.5h-4L9.85 6z"
    fill={color}
  />
  <!-- Small "a" for contrast -->
  <path
    d="M16 11c-1.1 0-2 0.9-2 2v4h1.5v-1.5h1v1.5H18v-4c0-1.1-0.9-2-2-2zm-0.5 3.5v-1c0-0.28 0.22-0.5 0.5-0.5s0.5 0.22 0.5 0.5v1h-1z"
    fill={color}
  />
</Icon>
