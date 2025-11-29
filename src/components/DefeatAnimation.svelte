<script lang="ts">
  interface Props {
    monsterName: string;
    xpGained: number;
    onDismiss?: () => void;
  }
  
  let { monsterName, xpGained, onDismiss }: Props = $props();
  
  function handleDismiss() {
    if (onDismiss) {
      onDismiss();
    }
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleDismiss();
    }
  }
</script>

<div 
  class="defeat-overlay"
  onclick={handleDismiss}
  onkeydown={handleKeydown}
  role="dialog"
  aria-modal="true"
  aria-label="Monster defeated notification"
  tabindex="0"
  data-testid="defeat-notification-overlay"
>
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div 
    class="defeat-notification" 
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
    role="document"
    data-testid="defeat-notification"
  >
    <div class="defeat-header">
      <span class="defeat-icon">💀</span>
      <h3 class="defeat-title" data-testid="defeat-title">{monsterName} Defeated!</h3>
      <button 
        class="dismiss-button" 
        onclick={handleDismiss}
        aria-label="Dismiss notification"
        data-testid="dismiss-defeat-notification"
      >
        ✕
      </button>
    </div>
    
    <div class="xp-gain-section" data-testid="xp-gain-section">
      <span class="xp-icon">⭐</span>
      <span class="xp-amount" data-testid="xp-amount">+{xpGained} XP</span>
    </div>
    
    <p class="dismiss-hint">Click anywhere to dismiss</p>
  </div>
</div>

<style>
  .defeat-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 90;
    cursor: pointer;
  }
  
  .defeat-notification {
    background: linear-gradient(145deg, #1a2e1a 0%, #162b16 100%);
    border: 3px solid #4caf50;
    border-radius: 12px;
    padding: 1.5rem;
    min-width: 280px;
    max-width: 340px;
    cursor: default;
    animation: bounceIn 0.4s ease-out;
    box-shadow: 0 8px 32px rgba(76, 175, 80, 0.4);
  }
  
  @keyframes bounceIn {
    0% {
      opacity: 0;
      transform: scale(0.8) translateY(-20px);
    }
    60% {
      transform: scale(1.05) translateY(0);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  
  .defeat-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    border-bottom: 1px solid rgba(76, 175, 80, 0.3);
    padding-bottom: 0.75rem;
  }
  
  .defeat-icon {
    font-size: 1.5rem;
  }
  
  .defeat-title {
    margin: 0;
    font-size: 1.1rem;
    color: #4caf50;
    font-weight: bold;
    flex: 1;
  }
  
  .dismiss-button {
    background: transparent;
    border: none;
    color: #666;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0.25rem;
    line-height: 1;
    transition: color 0.2s;
  }
  
  .dismiss-button:hover {
    color: #fff;
  }
  
  .xp-gain-section {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(255, 215, 0, 0.1);
    border-radius: 8px;
    border: 1px solid rgba(255, 215, 0, 0.3);
    margin-bottom: 1rem;
  }
  
  .xp-icon {
    font-size: 2rem;
    animation: pulse 1s ease-in-out infinite;
  }
  
  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.15);
    }
  }
  
  .xp-amount {
    font-size: 1.75rem;
    font-weight: bold;
    color: #ffd700;
    text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  }
  
  .dismiss-hint {
    text-align: center;
    color: #555;
    font-size: 0.75rem;
    margin: 0;
  }
</style>
