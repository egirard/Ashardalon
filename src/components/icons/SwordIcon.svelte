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
    <path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7.7 15.3l-1.4 1.4-4.9-4.9 1.4-1.4 3.5 3.5 9.5-9.5 1.4 1.4-10.5 10.5z"/>
    <path d="M6 2l10 10-1.4 1.4L4 2.6V2h2zm12 20l-10-10 1.4-1.4L20 21.4V22h-2z"/>
  </svg>
</Icon>
