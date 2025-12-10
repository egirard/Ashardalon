<script lang="ts">
  /**
   * Sword icon - represents attack
   * Replaces: ⚔️
   */
  import Icon from './Icon.svelte';
  
  interface Props {
    size?: number | string;
    color?: string;
    class?: string;
    ariaLabel?: string;
  }
  
  let { size = 16, color = 'currentColor', class: className = '', ariaLabel = 'Attack' }: Props = $props();
</script>

<Icon {size} {color} class={className} {ariaLabel}>
  <svg viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
    <path d="M20 2L4 18l-2 4 4-2L22 4l-2-2zM5.5 20.5l-1-1 2-2 1 1-2 2z"/>
    <path d="M19 3L21 5" stroke={color} stroke-width="2" stroke-linecap="round"/>
  </svg>
</Icon>
