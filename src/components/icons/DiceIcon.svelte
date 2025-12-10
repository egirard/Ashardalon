<script lang="ts">
  /**
   * Dice icon - represents reroll/luck
   * Replaces: 🎲
   */
  import Icon from './Icon.svelte';
  
  interface Props {
    size?: number | string;
    color?: string;
    class?: string;
    ariaLabel?: string;
  }
  
  let { size = 16, color = 'currentColor', class: className = '', ariaLabel = 'Reroll' }: Props = $props();
</script>

<Icon {size} {color} class={className} {ariaLabel}>
  <svg viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="7.5" cy="7.5" r="1" fill={color} />
    <circle cx="16.5" cy="7.5" r="1" fill={color} />
    <circle cx="12" cy="12" r="1" fill={color} />
    <circle cx="7.5" cy="16.5" r="1" fill={color} />
    <circle cx="16.5" cy="16.5" r="1" fill={color} />
  </svg>
</Icon>
