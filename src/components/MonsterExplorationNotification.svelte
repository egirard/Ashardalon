<script lang="ts">
  import type { EdgePosition } from '../store/heroesSlice';
  import { getEdgeRotation } from '../utils';
  import type { Direction } from '../store/types';
  
  interface Props {
    monsterName: string;
    direction: Direction;
    tileType: string;
    onDismiss: () => void;
    edge?: EdgePosition;
    testDismiss?: boolean; // Test-only prop to skip auto-dismiss
  }

  let { monsterName, direction, tileType, onDismiss, edge = 'bottom', testDismiss = false }: Props = $props();
  
  // Auto-dismiss timing: visible for 2 seconds, then 1-second fade-out (3 seconds total)
  let fadeOut = $state(false);
  
  $effect(() => {
    // Skip auto-dismiss in test mode
    if (testDismiss) {
      return;
    }
    
    // Wait 2 seconds, then start fade out
    const fadeTimer = setTimeout(() => {
      fadeOut = true;
    }, 2000);
    
    // After fade completes (1 more second), dismiss
    const dismissTimer = setTimeout(() => {
      onDismiss();
    }, 3000);
    
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  });
  
  // Format direction for display
  const directionDisplay = direction.charAt(0).toUpperCase() + direction.slice(1);
  
  // Determine if tile is black or white based on naming
  const isBlackTile = tileType.includes('black');
  const tileColor = isBlackTile ? 'Black' : 'White';
</script>

<div 
  class="monster-exploration-notification" 
  class:fade-out={fadeOut}
  data-testid="monster-exploration-notification"
  data-test-dismiss={testDismiss}
  style="transform: translate(-50%, -50%) rotate({getEdgeRotation(edge)}deg);"
>
  <div class="notification-content">
    <div class="notification-icon">🛡️</div>
    <div class="notification-text">
      <div class="monster-name">{monsterName}</div>
      <div class="action-text">explored {directionDisplay} edge</div>
      <div class="tile-info">{tileColor} arrow tile placed</div>
    </div>
  </div>
</div>

<style>
  .monster-exploration-notification {
    position: fixed;
    top: 50%;
    left: 50%;
    /* transform is set inline to include rotation */
    z-index: 1000;
    background: linear-gradient(135deg, rgba(50, 20, 20, 0.95), rgba(80, 30, 30, 0.95));
    border: 3px solid #e24a4a;
    border-radius: 12px;
    padding: 1.5rem 2rem;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(226, 74, 74, 0.3);
    opacity: 1;
    transition: opacity 1s ease-out;
  }
  
  .monster-exploration-notification.fade-out {
    opacity: 0;
  }
  
  .notification-content {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .notification-icon {
    font-size: 2.5rem;
    flex-shrink: 0;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
  }
  
  .notification-text {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    text-align: left;
  }
  
  .monster-name {
    font-size: 1.2rem;
    color: #ffb3b3;
    font-weight: bold;
  }
  
  .action-text {
    font-size: 1rem;
    color: #e6b38e;
  }
  
  .tile-info {
    font-size: 0.9rem;
    color: #a0a0a0;
    font-style: italic;
  }
</style>
