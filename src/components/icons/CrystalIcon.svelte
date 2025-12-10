<script lang="ts">
  /**
   * Crystal/orb icon - represents mystical effects
   * Replaces: 🔮
   */
  import Icon from './Icon.svelte';
  
  interface Props {
    size?: number | string;
    color?: string;
    class?: string;
    ariaLabel?: string;
  }
  
  let { size = 16, color = '#9c27b0', class: className = '', ariaLabel = 'Mystical' }: Props = $props();
</script>

<Icon {size} {color} class={className} {ariaLabel}>
  <svg viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" opacity="0.8"/>
    <circle cx="12" cy="12" r="7" fill="white" opacity="0.3"/>
    <circle cx="9" cy="9" r="2" fill="white" opacity="0.6"/>
  </svg>
</Icon>
