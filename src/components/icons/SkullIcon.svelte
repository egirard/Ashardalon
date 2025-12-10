<script lang="ts">
  /**
   * Skull icon - represents death/knocked out
   * Replaces: 💀
   */
  import Icon from './Icon.svelte';
  
  interface Props {
    size?: number | string;
    color?: string;
    class?: string;
    ariaLabel?: string;
  }
  
  let { size = 16, color = 'currentColor', class: className = '', ariaLabel = 'Downed' }: Props = $props();
</script>

<Icon {size} {color} class={className} {ariaLabel}>
  <svg viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C7.59 2 4 5.59 4 10c0 2.79 1.42 5.23 3.57 6.67l-.57 2.33h2.5l.5 2h4l.5-2h2.5l-.57-2.33C18.58 15.23 20 12.79 20 10c0-4.41-3.59-8-8-8zm-3 11c-.83 0-1.5-.67-1.5-1.5S8.17 10 9 10s1.5.67 1.5 1.5S9.83 13 9 13zm6 0c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67 1.5 1.5S15.83 13 15 13z"/>
  </svg>
</Icon>
