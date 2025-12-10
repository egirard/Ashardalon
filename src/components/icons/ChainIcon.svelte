<script lang="ts">
  /**
   * Chain icon - represents immobilized/cage condition
   * Replaces: ⛓️
   */
  import Icon from './Icon.svelte';
  
  interface Props {
    size?: number | string;
    color?: string;
    class?: string;
    ariaLabel?: string;
  }
  
  let { size = 16, color = 'currentColor', class: className = '', ariaLabel = 'Immobilized' }: Props = $props();
</script>

<Icon {size} {color} class={className} {ariaLabel}>
  <svg viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="2" width="6" height="8" rx="1" />
    <rect x="14" y="14" width="6" height="8" rx="1" />
    <path d="M7 10v4M17 10v4M7 10c0 2.21-1.79 4-4 4M17 10c0 2.21 1.79 4 4 4M7 14c0-2.21-1.79-4-4-4M17 14c0-2.21 1.79-4 4-4"/>
  </svg>
</Icon>
