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
    <rect x="4" y="9" width="16" height="6" rx="2" fill={color}/>
    <rect x="7" y="11" width="2" height="2" fill="rgba(255,255,255,0.8)"/>
    <rect x="11" y="11" width="2" height="2" fill="rgba(255,255,255,0.8)"/>
    <rect x="15" y="11" width="2" height="2" fill="rgba(255,255,255,0.8)"/>
  </svg>
</Icon>
