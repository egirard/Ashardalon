<script lang="ts">
  import { HeartIcon } from './icons';
  
  interface Props {
    surges: number;
  }
  
  let { surges }: Props = $props();
  let showPopover = $state(false);
  
  function togglePopover() {
    showPopover = !showPopover;
  }
  
  function closePopover() {
    showPopover = false;
  }
  
  function handleBackdropKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
      closePopover();
    }
  }
</script>

<div class="surge-counter-container">
  <button 
    class="healing-surge-counter" 
    data-testid="healing-surge-counter"
    title="Healing Surges - Click for details"
    onclick={togglePopover}
  >
    <span class="icon-wrapper">
      <HeartIcon size={20} ariaLabel="Healing Surges" />
      <span class="surge-badge" data-testid="surge-value">{surges}</span>
    </span>
  </button>

  {#if showPopover}
    <div 
      class="popover-backdrop" 
      onclick={closePopover} 
      onkeydown={handleBackdropKeydown}
      role="button"
      tabindex="0"
      aria-label="Close popover"
      data-testid="surge-popover-backdrop"
    ></div>
    <div class="popover" data-testid="surge-popover" role="dialog" aria-label="Healing Surges Information">
      <div class="popover-header">
        <HeartIcon size={24} ariaLabel="Healing Surges" />
        <h3>Healing Surges</h3>
        <button class="close-button" onclick={closePopover} aria-label="Close">×</button>
      </div>
      <div class="popover-content">
        <p class="current-value">Remaining Surges: <strong>{surges}</strong></p>
        <div class="info-section">
          <h4>How Healing Surges Work</h4>
          <ul>
            <li>When a hero starts their turn at <strong>0 HP</strong>, a healing surge is automatically used</li>
            <li>The downed hero is healed for their <strong>surge value</strong> (shown on their hero card)</li>
            <li>The party starts with <strong>2 healing surges</strong></li>
            <li>If a hero is at 0 HP when surges run out, the party is defeated</li>
          </ul>
        </div>
        <div class="info-section">
          <h4>Tips</h4>
          <ul>
            <li>Healing surges are a shared party resource</li>
            <li>Use them wisely - they don't regenerate during the adventure</li>
            <li>Try to avoid getting knocked down to conserve surges</li>
            <li>Treasure cards and powers may provide alternative healing</li>
          </ul>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .surge-counter-container {
    position: relative;
    display: inline-block;
  }

  .healing-surge-counter {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(231, 76, 60, 0.15);
    padding: 0.4rem;
    border-radius: 8px;
    border: 1px solid rgba(231, 76, 60, 0.3);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .healing-surge-counter:hover {
    background: rgba(231, 76, 60, 0.25);
    border-color: rgba(231, 76, 60, 0.5);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(231, 76, 60, 0.3);
  }
  
  .healing-surge-counter:active {
    transform: translateY(0);
  }
  
  .icon-wrapper {
    position: relative;
    display: inline-block;
  }
  
  .surge-badge {
    position: absolute;
    top: -4px;
    right: -8px;
    background: #e74c3c;
    color: #fff;
    font-size: 0.65rem;
    font-weight: bold;
    padding: 0.1rem 0.3rem;
    border-radius: 10px;
    min-width: 18px;
    text-align: center;
    border: 2px solid rgba(30, 30, 50, 0.95);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
  
  .popover-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
    animation: fadeIn 0.2s ease;
    cursor: pointer;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .popover {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(30, 30, 50, 0.98);
    border: 2px solid rgba(231, 76, 60, 0.6);
    border-radius: 12px;
    padding: 1.5rem;
    max-width: 400px;
    width: 90vw;
    max-height: 80vh;
    overflow-y: auto;
    z-index: 1000;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
    animation: slideIn 0.3s ease;
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translate(-50%, -45%);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%);
    }
  }
  
  .popover-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 2px solid rgba(231, 76, 60, 0.3);
  }
  
  .popover-header h3 {
    flex: 1;
    margin: 0;
    font-size: 1.2rem;
    color: #e74c3c;
  }
  
  .close-button {
    background: none;
    border: none;
    color: #fff;
    font-size: 1.8rem;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s ease;
  }
  
  .close-button:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #e74c3c;
  }
  
  .popover-content {
    color: #fff;
  }
  
  .current-value {
    font-size: 1.1rem;
    color: #e74c3c;
    margin-bottom: 1rem;
    padding: 0.5rem;
    background: rgba(231, 76, 60, 0.1);
    border-radius: 6px;
    text-align: center;
  }
  
  .current-value strong {
    font-size: 1.3rem;
  }
  
  .info-section {
    margin-bottom: 1rem;
  }
  
  .info-section:last-child {
    margin-bottom: 0;
  }
  
  .info-section h4 {
    color: #8ecae6;
    font-size: 1rem;
    margin: 0 0 0.5rem 0;
  }
  
  .info-section ul {
    margin: 0;
    padding-left: 1.2rem;
    list-style-type: disc;
  }
  
  .info-section li {
    margin-bottom: 0.4rem;
    line-height: 1.4;
    font-size: 0.9rem;
  }
  
  .info-section strong {
    color: #e74c3c;
  }
  
  /* Respect user's reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    .healing-surge-counter,
    .popover,
    .popover-backdrop {
      animation: none;
      transition: none;
    }
    
    .healing-surge-counter:hover {
      transform: none;
    }
  }
</style>
