<script lang="ts">
  /**
   * Check/checkmark icon - represents completion/success
   * Replaces: ✓
   */
  import Icon from './Icon.svelte';
  
  interface Props {
    size?: number | string;
    color?: string;
    class?: string;
    ariaLabel?: string;
  }
  
  let { size = 16, color = '#4caf50', class: className = '', ariaLabel = 'Complete' }: Props = $props();
</script>

<Icon {size} {color} class={className} {ariaLabel}>
  <svg viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="3" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
    <polyline points="20 6 9 17 4 12" />
  </svg>
</Icon>
