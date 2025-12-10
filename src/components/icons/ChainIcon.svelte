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
  <svg viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="3" width="4" height="6" rx="1" />
    <rect x="6" y="15" width="4" height="6" rx="1" />
    <rect x="14" y="9" width="4" height="6" rx="1" />
    <line x1="8" y1="9" x2="8" y2="15" />
    <line x1="16" y1="9" x2="16" y2="3" />
    <line x1="16" y1="15" x2="16" y2="21" />
  </svg>
</Icon>
