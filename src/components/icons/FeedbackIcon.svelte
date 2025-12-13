<script lang="ts">
  /**
   * Feedback Icon Component
   * Message/feedback icon for "Submit Feedback"
   */
  
  interface Props {
    size?: number;
    color?: string;
    ariaLabel?: string;
  }
  
  let { size = 20, color = 'currentColor', ariaLabel = 'Feedback' }: Props = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke={color}
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  role={ariaLabel ? 'img' : undefined}
  aria-label={ariaLabel}
>
  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
</svg>
