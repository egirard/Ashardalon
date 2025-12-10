<script lang="ts">
  /**
   * Lightning bolt icon - represents speed/energy/stunning
   * Replaces: ⚡
   */
  import Icon from './Icon.svelte';
  
  interface Props {
    size?: number | string;
    color?: string;
    class?: string;
    ariaLabel?: string;
  }
  
  let { size = 16, color = '#ffc107', class: className = '', ariaLabel = 'Speed' }: Props = $props();
</script>

<Icon {size} {color} class={className} {ariaLabel}>
  <svg viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
    <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
  </svg>
</Icon>
