<script lang="ts">
  /**
   * Rotate Arrow Icon
   * Triangle/arrow icon pointing away from center for dialog rotation controls
   */
  import Icon from './Icon.svelte';
  
  interface Props {
    size?: number | string;
    color?: string;
    class?: string;
    ariaLabel?: string;
  }
  
  let { size = 16, color = 'currentColor', class: className = '', ariaLabel = 'Rotate' }: Props = $props();
</script>

<Icon {size} {color} class={className} {ariaLabel}>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <!-- Triangle pointing up (will be rotated via CSS for different positions) -->
    <path d="M12 5 L19 16 L5 16 Z" fill="currentColor" stroke="currentColor"/>
  </svg>
</Icon>
