<script lang="ts">
  import type { EdgePosition } from '../store/heroesSlice';
  import { getEdgeRotation } from '../utils';
  
  interface Props {
    heroName: string;
    damage: number;
    onDismiss: () => void;
    edge?: EdgePosition;
  }
  
  let { heroName, damage, onDismiss, edge = 'bottom' }: Props = $props();
</script>

<div class="notification-overlay" data-testid="poisoned-damage-notification">
  <div class="notification-card" style="transform: rotate({getEdgeRotation(edge)}deg);">
    <h2 class="notification-title" data-testid="notification-title">Poisoned!</h2>
    
    <div class="icon-section">
      <span class="poison-icon">🤢</span>
    </div>
    
    <div class="message-section" data-testid="poison-message">
      {heroName} takes {damage} damage from poison at the start of their turn.
    </div>
    
    <button 
      class="continue-button"
      data-testid="dismiss-poisoned-notification"
      onclick={onDismiss}
    >
      Continue
    </button>
  </div>
</div>

<style>
  .notification-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
    animation: fadeIn 0.3s ease-out;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .notification-card {
    background: linear-gradient(145deg, #1a2e1a 0%, #0f1a0f 100%);
    border: 3px solid #4caf50;
    border-radius: 16px;
    padding: 2rem;
    text-align: center;
    min-width: 320px;
    max-width: 400px;
    box-shadow: 0 8px 32px rgba(76, 175, 80, 0.4);
    animation: slideIn 0.3s ease-out;
  }
  
  @keyframes slideIn {
    from { 
      transform: scale(0.9) translateY(-20px);
      opacity: 0;
    }
    to { 
      transform: scale(1) translateY(0);
      opacity: 1;
    }
  }
  
  .notification-title {
    color: #4caf50;
    font-size: 1.5rem;
    margin: 0 0 1.5rem 0;
    text-transform: uppercase;
    letter-spacing: 2px;
    text-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
  }
  
  .icon-section {
    margin-bottom: 1.5rem;
  }
  
  .poison-icon {
    font-size: 3rem;
    display: inline-block;
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0%, 100% { 
      transform: scale(1);
      filter: drop-shadow(0 0 10px rgba(76, 175, 80, 0.4));
    }
    50% { 
      transform: scale(1.1);
      filter: drop-shadow(0 0 20px rgba(76, 175, 80, 0.8));
    }
  }
  
  .message-section {
    background: rgba(76, 175, 80, 0.1);
    border: 1px solid rgba(76, 175, 80, 0.3);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    color: #e2e8f0;
    font-size: 1.1rem;
    line-height: 1.6;
  }
  
  .continue-button {
    background: linear-gradient(145deg, #4caf50 0%, #388e3c 100%);
    color: #fff;
    border: 2px solid #66bb6a;
    border-radius: 8px;
    padding: 0.75rem 2rem;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease-out;
    min-width: 44px;
    min-height: 44px;
  }
  
  .continue-button:hover {
    background: linear-gradient(145deg, #66bb6a 0%, #43a047 100%);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
  }
</style>
