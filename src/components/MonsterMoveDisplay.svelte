<script lang="ts">
  interface Props {
    monsterName: string;
    onDismiss?: () => void;
  }
  
  let { monsterName, onDismiss }: Props = $props();
  
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
  class="monster-move-overlay"
  onclick={handleDismiss}
  onkeydown={handleKeydown}
  role="dialog"
  aria-modal="true"
  aria-label="Monster move result"
  tabindex="0"
  data-testid="monster-move-overlay"
>
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div 
    class="monster-move-card"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
    role="document"
    data-testid="monster-move-card"
  >
    <div class="move-header">
      <h3 class="monster-name" data-testid="monster-name">
        {monsterName}
      </h3>
      <button 
        class="dismiss-button" 
        onclick={handleDismiss}
        aria-label="Dismiss monster move result"
        data-testid="dismiss-monster-move"
      >
        ✕
      </button>
    </div>
    
    <div class="move-content">
      <span class="move-icon">🏃</span>
      <p class="move-text" data-testid="move-text">
        Moved but could not attack
      </p>
    </div>
    
    <p class="dismiss-hint">Click anywhere to continue</p>
  </div>
</div>

<style>
  .monster-move-overlay {
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
    cursor: pointer;
  }
  
  .monster-move-card {
    background: linear-gradient(145deg, #1a1a2e 0%, #16162b 100%);
    border: 3px solid #8b4513;
    border-radius: 12px;
    padding: 1.5rem;
    min-width: 280px;
    max-width: 340px;
    cursor: default;
    animation: slideIn 0.3s ease-out;
    box-shadow: 0 8px 32px rgba(139, 69, 19, 0.3);
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .move-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
    border-bottom: 1px solid #4a4a6a;
    padding-bottom: 0.75rem;
  }
  
  .monster-name {
    margin: 0;
    font-size: 1.1rem;
    color: #cd853f;
    font-weight: bold;
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
  
  .move-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    margin-bottom: 1rem;
  }
  
  .move-icon {
    font-size: 2.5rem;
  }
  
  .move-text {
    margin: 0;
    font-size: 1rem;
    color: #aaa;
    text-align: center;
  }
  
  .dismiss-hint {
    text-align: center;
    color: #555;
    font-size: 0.75rem;
    margin: 0;
  }
</style>
