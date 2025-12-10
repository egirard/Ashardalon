<script lang="ts">
  /**
   * Broken heart icon - represents weakened condition
   * Replaces: 💔
   */
  import Icon from './Icon.svelte';
  
  interface Props {
    size?: number | string;
    color?: string;
    class?: string;
    ariaLabel?: string;
  }
  
  let { size = 16, color = 'currentColor', class: className = '', ariaLabel = 'Weakened' }: Props = $props();
</script>

<Icon {size} {color} class={className} {ariaLabel}>
  <svg viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09L13 3l-1 3 2-2 1 3-1 2 1 3-3 4.03L12 21.35zM16.5 3C19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L13 16l-1-3 1-2-1-3 2 2 1-3z"/>
  </svg>
</Icon>
