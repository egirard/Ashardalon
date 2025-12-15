<script lang="ts">
  import type { EdgePosition } from '../store/heroesSlice';
  import { getEdgeRotation } from '../utils';
  
  interface Props {
    message: string;
    onDismiss: () => void;
    edge?: EdgePosition;
  }

  let { message, onDismiss, edge = 'bottom' }: Props = $props();
  
  // Auto-dismiss timing: visible for 1 second, then 2-second fade-out (3 seconds total)
  let fadeOut = $state(false);
  
  $effect(() => {
    // Wait 1 second, then start fade out
    const fadeTimer = setTimeout(() => {
      fadeOut = true;
    }, 1000);
    
    // After fade completes (2 more seconds), dismiss
    const dismissTimer = setTimeout(() => {
      onDismiss();
    }, 3000);
    
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  });
</script>

<div 
  class="exploration-notification" 
  class:fade-out={fadeOut}
  data-testid="exploration-phase-notification"
  style="transform: translate(-50%, -50%) rotate({getEdgeRotation(edge)}deg);"
>
  <div class="notification-content">
    <div class="notification-icon">🗺️</div>
    <div class="notification-text">{message}</div>
  </div>
</div>

<style>
  .exploration-notification {
    position: fixed;
    top: 50%;
    left: 50%;
    /* transform is set inline to include rotation */
    z-index: 1000;
    background: rgba(20, 30, 50, 0.95);
    border: 3px solid #4a90e2;
    border-radius: 12px;
    padding: 1.5rem 2rem;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(74, 144, 226, 0.3);
    opacity: 1;
    transition: opacity 2s ease-out;
    animation: slideIn 0.3s ease-out;
  }
  
  .exploration-notification.fade-out {
    opacity: 0;
  }
  
  @keyframes slideIn {
    from {
      transform: translate(-50%, -60%);
      opacity: 0;
    }
    to {
      transform: translate(-50%, -50%);
      opacity: 1;
    }
  }
  
  .notification-content {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .notification-icon {
    font-size: 2rem;
    flex-shrink: 0;
  }
  
  .notification-text {
    font-size: 1.1rem;
    color: #8ecae6;
    font-weight: bold;
    text-align: left;
    max-width: 500px;
  }
  
  /* Respect user's reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    .exploration-notification {
      animation: none;
    }
  }
</style>
