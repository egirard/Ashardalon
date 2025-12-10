<script lang="ts">
  /**
   * Circle icon - represents incomplete/unselected
   * Replaces: ○
   */
  import Icon from './Icon.svelte';
  
  interface Props {
    size?: number | string;
    color?: string;
    class?: string;
    ariaLabel?: string;
  }
  
  let { size = 16, color = 'currentColor', class: className = '', ariaLabel = 'Incomplete' }: Props = $props();
</script>

<Icon {size} {color} class={className} {ariaLabel}>
  <svg viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" />
  </svg>
</Icon>
