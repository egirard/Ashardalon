<script lang="ts">
  import type { EdgePosition } from '../store/heroesSlice';
  import { getEdgeRotation } from '../utils';
  
  interface Props {
    heroName: string;
    roll: number;
    recovered: boolean;
    onDismiss: () => void;
    edge?: EdgePosition;
  }
  
  let { heroName, roll, recovered, onDismiss, edge = 'bottom' }: Props = $props();
</script>

<div class="notification-overlay" data-testid="poison-recovery-notification">
  <div class="notification-card" class:success={recovered} class:failure={!recovered} style="transform: rotate({getEdgeRotation(edge)}deg);">
    <h2 class="notification-title" data-testid="notification-title">
      {recovered ? 'Poison Recovered!' : 'Still Poisoned'}
    </h2>
    
    <div class="icon-section">
      <span class="icon">{recovered ? '✨' : '🤢'}</span>
    </div>
    
    <div class="message-section" data-testid="recovery-message">
      <div class="roll-result">
        <span class="label">Recovery Roll:</span>
        <span class="roll-value" data-testid="roll-value">{roll}</span>
        <span class="dc">(Need 10+)</span>
      </div>
      <div class="outcome">
        {#if recovered}
          {heroName} shakes off the poison!
        {:else}
          {heroName} remains poisoned.
        {/if}
      </div>
    </div>
    
    <button 
      class="continue-button"
      data-testid="dismiss-recovery-notification"
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
    background: linear-gradient(145deg, #1a1a2e 0%, #0f0f1a 100%);
    border-radius: 16px;
    padding: 2rem;
    text-align: center;
    min-width: 320px;
    max-width: 400px;
    animation: slideIn 0.3s ease-out;
  }
  
  .notification-card.success {
    border: 3px solid #4caf50;
    box-shadow: 0 8px 32px rgba(76, 175, 80, 0.4);
  }
  
  .notification-card.failure {
    border: 3px solid #f44336;
    box-shadow: 0 8px 32px rgba(244, 67, 54, 0.4);
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
    font-size: 1.5rem;
    margin: 0 0 1.5rem 0;
    text-transform: uppercase;
    letter-spacing: 2px;
  }
  
  .success .notification-title {
    color: #4caf50;
    text-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
  }
  
  .failure .notification-title {
    color: #f44336;
    text-shadow: 0 0 10px rgba(244, 67, 54, 0.5);
  }
  
  .icon-section {
    margin-bottom: 1.5rem;
  }
  
  .icon {
    font-size: 3rem;
    display: inline-block;
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0%, 100% { 
      transform: scale(1);
    }
    50% { 
      transform: scale(1.1);
    }
  }
  
  .message-section {
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    color: #e2e8f0;
    font-size: 1.1rem;
    line-height: 1.6;
  }
  
  .success .message-section {
    background: rgba(76, 175, 80, 0.1);
    border: 1px solid rgba(76, 175, 80, 0.3);
  }
  
  .failure .message-section {
    background: rgba(244, 67, 54, 0.1);
    border: 1px solid rgba(244, 67, 54, 0.3);
  }
  
  .roll-result {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    font-size: 1.2rem;
  }
  
  .label {
    font-weight: bold;
  }
  
  .roll-value {
    font-size: 1.8rem;
    font-weight: bold;
    padding: 0.25rem 0.75rem;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.1);
  }
  
  .success .roll-value {
    color: #4caf50;
  }
  
  .failure .roll-value {
    color: #f44336;
  }
  
  .dc {
    font-size: 0.9rem;
    opacity: 0.7;
  }
  
  .outcome {
    font-weight: bold;
  }
  
  .continue-button {
    color: #fff;
    border-radius: 8px;
    padding: 0.75rem 2rem;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease-out;
    min-width: 44px;
    min-height: 44px;
  }
  
  .success .continue-button {
    background: linear-gradient(145deg, #4caf50 0%, #388e3c 100%);
    border: 2px solid #66bb6a;
  }
  
  .success .continue-button:hover {
    background: linear-gradient(145deg, #66bb6a 0%, #43a047 100%);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
  }
  
  .failure .continue-button {
    background: linear-gradient(145deg, #f44336 0%, #d32f2f 100%);
    border: 2px solid #e57373;
  }
  
  .failure .continue-button:hover {
    background: linear-gradient(145deg, #e57373 0%, #e53935 100%);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(244, 67, 54, 0.4);
  }
</style>
