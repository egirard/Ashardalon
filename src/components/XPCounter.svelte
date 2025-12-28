<script lang="ts">
  import { StarIcon } from './icons';
  
  interface Props {
    xp: number;
  }
  
  let { xp }: Props = $props();
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

<div class="xp-counter-container">
  <button 
    class="xp-counter" 
    data-testid="xp-counter"
    title="Experience Points (XP) - Click for details"
    onclick={togglePopover}
  >
    <span class="icon-wrapper">
      <StarIcon size={44} ariaLabel="Experience Points" />
      <span class="xp-badge" data-testid="xp-value">{xp}</span>
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
      data-testid="xp-popover-backdrop"
    ></div>
    <div class="popover" data-testid="xp-popover" role="dialog" aria-label="Experience Points Information">
      <div class="popover-header">
        <StarIcon size={24} ariaLabel="Experience Points" />
        <h3>Experience Points (XP)</h3>
        <button class="close-button" onclick={closePopover} aria-label="Close">×</button>
      </div>
      <div class="popover-content">
        <p class="current-value">Current XP: <strong>{xp}</strong></p>
        <div class="info-section">
          <h4>How XP Works</h4>
          <ul>
            <li>The party gains <strong>1 XP</strong> for each monster defeated</li>
            <li>When a hero rolls a <strong>natural 20</strong> and the party has <strong>5+ XP</strong>, that hero levels up to Level 2</li>
            <li>Leveling up costs <strong>5 XP</strong> and only that individual hero gains the level</li>
            <li>Level 2 heroes gain enhanced abilities and can flip their daily power cards</li>
            <li>The <strong>Battlefield Promotion</strong> treasure card also allows a hero to level up</li>
          </ul>
        </div>
        <div class="info-section">
          <h4>Tips</h4>
          <ul>
            <li>XP is shared across the entire party</li>
            <li>Only one hero levels up at a time (the one who rolled the natural 20)</li>
            <li>Plan your strategy to defeat monsters and gain XP for leveling opportunities</li>
          </ul>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .xp-counter-container {
    position: relative;
    display: inline-block;
  }

  .xp-counter {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    padding: 0.25rem;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    width: 52px;
    height: 52px;
  }
  
  .xp-counter:hover {
    transform: translateY(-1px);
    filter: brightness(1.2);
  }
  
  .xp-counter:active {
    transform: translateY(0);
  }
  
  .icon-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }
  
  .xp-badge {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #000;
    font-size: 0.9rem;
    font-weight: bold;
    text-align: center;
    pointer-events: none;
    text-shadow: 0 1px 2px rgba(255, 255, 255, 0.3);
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
    border: 2px solid rgba(255, 215, 0, 0.6);
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
    border-bottom: 2px solid rgba(255, 215, 0, 0.3);
  }
  
  .popover-header h3 {
    flex: 1;
    margin: 0;
    font-size: 1.2rem;
    color: #ffd700;
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
    color: #ffd700;
  }
  
  .popover-content {
    color: #fff;
  }
  
  .current-value {
    font-size: 1.1rem;
    color: #ffd700;
    margin-bottom: 1rem;
    padding: 0.5rem;
    background: rgba(255, 215, 0, 0.1);
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
    color: #ffd700;
  }
  
  /* Respect user's reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    .xp-counter,
    .popover,
    .popover-backdrop {
      animation: none;
      transition: none;
    }
    
    .xp-counter:hover {
      transform: none;
    }
  }
</style>
