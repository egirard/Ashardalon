<script lang="ts">
  /**
   * Bandage icon - represents healing surge
   * Replaces: ❤️‍🩹
   */
  import Icon from './Icon.svelte';
  
  interface Props {
    size?: number | string;
    color?: string;
    class?: string;
    ariaLabel?: string;
  }
  
  let { size = 16, color = '#e53935', class: className = '', ariaLabel = 'Healing Surge' }: Props = $props();
</script>

<Icon {size} {color} class={className} {ariaLabel}>
  <svg viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
    <path d="M20.8 5.2L18.8 3.2c-.4-.4-1-.4-1.4 0L6 14.6l-2.8-2.8c-.4-.4-1-.4-1.4 0l-1.4 1.4c-.4.4-.4 1 0 1.4l4.2 4.2c.4.4 1 .4 1.4 0L20.8 6.6c.4-.4.4-1 0-1.4zM9 16l-2-2 9-9 2 2-9 9z"/>
    <rect x="4" y="10" width="16" height="4" fill="white" opacity="0.9"/>
    <rect x="10" y="4" width="4" height="16" fill="white" opacity="0.9"/>
  </svg>
</Icon>
