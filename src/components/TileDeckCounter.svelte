<script lang="ts">
  import { TileIcon } from './icons';
  
  interface Props {
    tileCount: number;
  }
  
  let { tileCount }: Props = $props();
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

<div class="tile-counter-container">
  <button 
    class="tile-deck-counter" 
    data-testid="tile-deck-counter"
    title="Tiles Remaining - Click for details"
    onclick={togglePopover}
  >
    <span class="icon-wrapper">
      <TileIcon size={44} color="#8B7355" ariaLabel="Tiles Remaining" />
      <span class="tile-badge" data-testid="tile-deck-count">{tileCount}</span>
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
      data-testid="tile-popover-backdrop"
    ></div>
    <div class="popover" data-testid="tile-popover" role="dialog" aria-label="Tiles Remaining Information">
      <div class="popover-header">
        <TileIcon size={24} color="#8B7355" ariaLabel="Tiles Remaining" />
        <h3>Tiles Remaining</h3>
        <button class="close-button" onclick={closePopover} aria-label="Close">×</button>
      </div>
      <div class="popover-content">
        <p class="current-value">Tiles in Deck: <strong>{tileCount}</strong></p>
        <div class="info-section">
          <h4>How Tiles Work</h4>
          <ul>
            <li>The dungeon is built as you explore by drawing tiles from the deck</li>
            <li>When exploring an <strong>unexplored edge</strong>, draw a tile from the deck and place it</li>
            <li>Tiles reveal new rooms, corridors, and chambers to explore</li>
            <li>Each tile may trigger encounters with monsters or other events</li>
            <li>The game has a <strong>limited number of tiles</strong> in the deck</li>
          </ul>
        </div>
        <div class="info-section">
          <h4>Tips</h4>
          <ul>
            <li>Keep track of tiles remaining to plan your exploration strategy</li>
            <li>Some adventures have special rules when tiles run out</li>
            <li>Explore strategically to maximize your chances of finding the objective</li>
          </ul>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .tile-counter-container {
    position: relative;
    display: inline-block;
  }

  .tile-deck-counter {
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
  
  .tile-deck-counter:hover {
    transform: translateY(-1px);
    filter: brightness(1.2);
  }
  
  .tile-deck-counter:active {
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
  
  .tile-badge {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #fff;
    font-size: 0.9rem;
    font-weight: bold;
    text-align: center;
    pointer-events: none;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
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
    border: 2px solid rgba(139, 115, 85, 0.6);
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
    border-bottom: 2px solid rgba(139, 115, 85, 0.3);
  }
  
  .popover-header h3 {
    flex: 1;
    margin: 0;
    font-size: 1.2rem;
    color: #8B7355;
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
    color: #8B7355;
  }
  
  .popover-content {
    color: #fff;
  }
  
  .current-value {
    font-size: 1.1rem;
    color: #8B7355;
    margin-bottom: 1rem;
    padding: 0.5rem;
    background: rgba(139, 115, 85, 0.1);
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
    color: #8B7355;
  }
  
  /* Respect user's reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    .tile-deck-counter,
    .popover,
    .popover-backdrop {
      animation: none;
      transition: none;
    }
    
    .tile-deck-counter:hover {
      transform: none;
    }
  }
</style>
