<script lang="ts">
  /**
   * Base Icon wrapper component
   * Provides consistent sizing and styling for all SVG icons
   */
  
  interface Props {
    size?: number | string;
    color?: string;
    class?: string;
    ariaLabel?: string;
  }
  
  let { size = 16, color = 'currentColor', class: className = '', ariaLabel }: Props = $props();
  
  // Convert size to string with px if it's a number
  let sizeStr = $derived(typeof size === 'number' ? `${size}px` : size);
</script>

<span 
  class="icon-wrapper {className}" 
  style="width: {sizeStr}; height: {sizeStr}; color: {color};"
  role={ariaLabel ? 'img' : undefined}
  aria-label={ariaLabel}
>
  {@render children?.()}
</span>

<style>
  .icon-wrapper {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    vertical-align: middle;
    flex-shrink: 0;
  }
  
  .icon-wrapper :global(svg) {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
