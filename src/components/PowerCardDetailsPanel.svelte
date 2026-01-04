<script lang="ts">
  import type { PowerCard } from '../store/powerCards';
  import type { PendingBladeBarrierState } from './PlayerPowerCards.svelte';
  import { XIcon } from './icons';

  interface Props {
    card: PowerCard;
    isFlipped?: boolean;
    isClickable?: boolean;
    ineligibilityReason?: string;
    bladeBarrierState?: PendingBladeBarrierState | null;
    onDismiss?: () => void;
    onActivate?: () => void;
    onCancelBladeBarrier?: () => void;
    onConfirmBladeBarrier?: () => void;
  }

  let {
    card,
    isFlipped = false,
    isClickable = false,
    ineligibilityReason,
    bladeBarrierState = null,
    onDismiss,
    onActivate,
    onCancelBladeBarrier,
    onConfirmBladeBarrier
  }: Props = $props();

  // Blade Barrier card ID constant
  const BLADE_BARRIER_CARD_ID = 5;
  const isBladeBarrier = $derived(card.id === BLADE_BARRIER_CARD_ID);

  // Power card type colors
  function getPowerCardColor(type: string): string {
    switch (type) {
      case 'at-will': return '#2e7d32'; // Green
      case 'daily': return '#7b1fa2'; // Purple
      case 'utility': return '#1565c0'; // Blue
      default: return '#666';
    }
  }

  function handleDismiss() {
    if (onDismiss) {
      onDismiss();
    }
  }

  function handleActivate() {
    if (onActivate) {
      onActivate();
    }
  }

  function handleCancelBladeBarrier() {
    if (onCancelBladeBarrier) {
      onCancelBladeBarrier();
    }
  }

  function handleConfirmBladeBarrier() {
    if (onConfirmBladeBarrier) {
      onConfirmBladeBarrier();
    }
  }
</script>

<div 
  class="power-card-details-panel" 
  data-testid="power-card-details-panel"
  role="dialog"
  aria-label="Power card details"
>
  <div class="detail-header">
    <h3 class="detail-title">{card.name}</h3>
    <button 
      class="close-button" 
      onclick={handleDismiss}
      aria-label="Close details"
      data-testid="close-details-button"
    >
      <XIcon size={16} ariaLabel="Close" />
    </button>
  </div>

  <div class="detail-content">
    <div 
      class="card-type-badge" 
      style="background-color: {getPowerCardColor(card.type)}33; border-color: {getPowerCardColor(card.type)}; color: {getPowerCardColor(card.type)};"
      data-testid="card-type"
    >
      {card.type} Power
    </div>
    
    {#if card.attackBonus !== undefined}
      <div class="power-stats">
        <div class="stat-item">
          <strong>Attack Bonus:</strong> +{card.attackBonus}
        </div>
        <div class="stat-item">
          <strong>Damage:</strong> {card.damage || 1}
        </div>
      </div>
    {/if}

    <div class="description" data-testid="card-description">
      {card.description}
    </div>

    <div class="rule" data-testid="card-rule">
      <strong>Rule:</strong> {card.rule}
    </div>

    {#if isFlipped}
      <div class="status-badge flipped">
        <XIcon size={14} ariaLabel="Used" />
        Card has been used
      </div>
    {/if}

    <!-- Blade Barrier Selection State Display -->
    {#if isBladeBarrier && bladeBarrierState}
      <div class="blade-barrier-selection" data-testid="blade-barrier-selection">
        {#if bladeBarrierState.step === 'tile-selection'}
          <div class="selection-instructions">
            <h4>Select Tile</h4>
            <p>Click a highlighted tile within 2 tiles of your position</p>
          </div>
        {:else if bladeBarrierState.step === 'square-selection'}
          <div class="selection-instructions">
            <h4>Select Squares</h4>
            <p>Click 5 different squares on the tile</p>
            <div class="progress-counter" data-testid="progress-counter">
              {bladeBarrierState.selectedSquares?.length || 0} / 5
            </div>
          </div>
          {#if (bladeBarrierState.selectedSquares?.length || 0) === 5}
            <button 
              class="confirm-placement-button"
              onclick={handleConfirmBladeBarrier}
              data-testid="confirm-placement-button"
            >
              Confirm Placement
            </button>
          {/if}
        {/if}
        <button 
          class="cancel-selection-button"
          onclick={handleCancelBladeBarrier}
          data-testid="cancel-selection-button"
        >
          Cancel
        </button>
      </div>
    {:else}
      <div class="clickability-info" data-testid="clickability-info">
        {#if isClickable}
          <div class="status-badge clickable">
            ✓ Available to use
          </div>
          {#if onActivate && !isFlipped && !isBladeBarrier}
            <button 
              class="activate-button"
              onclick={handleActivate}
              data-testid="activate-power-button"
            >
              Activate Power
            </button>
          {/if}
          {#if isBladeBarrier && onActivate && !isFlipped}
            <button 
              class="activate-blade-barrier-btn"
              onclick={handleActivate}
              data-testid="activate-blade-barrier-button"
            >
              ACTIVATE
            </button>
          {/if}
        {:else if ineligibilityReason}
          <div class="status-badge not-clickable">
            ✗ {ineligibilityReason}
          </div>
        {:else}
          <div class="status-badge not-clickable">
            ✗ Not currently available
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .power-card-details-panel {
    position: relative;
    width: 280px;
    max-width: 90vw;
    max-height: 80vh;
    overflow-y: auto;
    background: rgba(20, 20, 35, 0.98);
    border: 2px solid #ffd700;
    border-radius: 8px;
    padding: 0.75rem;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 215, 0, 0.4);
    z-index: 150;
    animation: slide-in 0.2s ease-out;
    flex-shrink: 0; /* Prevent shrinking when in flex container */
    /* Custom scrollbar styling */
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 215, 0, 0.6) rgba(20, 20, 35, 0.5);
  }

  /* Webkit scrollbar styling for Chrome/Safari */
  .power-card-details-panel::-webkit-scrollbar {
    width: 6px;
  }

  .power-card-details-panel::-webkit-scrollbar-track {
    background: rgba(20, 20, 35, 0.5);
    border-radius: 3px;
  }

  .power-card-details-panel::-webkit-scrollbar-thumb {
    background: rgba(255, 215, 0, 0.6);
    border-radius: 3px;
  }

  .power-card-details-panel::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 215, 0, 0.8);
  }

  @keyframes slide-in {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255, 215, 0, 0.3);
  }

  .detail-title {
    font-size: 1rem;
    color: #ffd700;
    margin: 0;
    font-weight: bold;
  }

  .close-button {
    background: none;
    border: none;
    color: #aaa;
    cursor: pointer;
    padding: 0.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s ease;
  }

  .close-button:hover {
    color: #fff;
  }

  .detail-content {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    font-size: 0.75rem;
    color: #ddd;
  }

  .card-type-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.65rem;
    font-weight: bold;
    text-transform: uppercase;
    width: fit-content;
    border: 1px solid;
  }

  .power-stats {
    display: flex;
    gap: 1rem;
    padding: 0.4rem;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 4px;
  }

  .stat-item {
    font-size: 0.7rem;
    color: #ffd700;
  }

  .stat-item strong {
    color: #fff;
  }

  .description {
    line-height: 1.4;
    font-style: italic;
    color: #bbb;
  }

  .rule {
    line-height: 1.4;
    padding: 0.5rem;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 4px;
    border-left: 3px solid #ffd700;
  }

  .rule strong {
    color: #ffd700;
  }

  .clickability-info {
    margin-top: 0.3rem;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.3rem 0.5rem;
    border-radius: 4px;
    font-size: 0.65rem;
    font-weight: bold;
    width: 100%;
  }

  .status-badge.clickable {
    background: rgba(46, 125, 50, 0.3);
    border: 1px solid #4caf50;
    color: #66bb6a;
  }

  .status-badge.not-clickable {
    background: rgba(100, 100, 100, 0.3);
    border: 1px solid #666;
    color: #999;
  }

  .status-badge.flipped {
    background: rgba(244, 67, 54, 0.3);
    border: 1px solid #f44336;
    color: #ff8a80;
  }

  .activate-button {
    width: 100%;
    padding: 0.6rem;
    margin-top: 0.5rem;
    background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
    border: 2px solid #66bb6a;
    border-radius: 6px;
    color: #fff;
    font-size: 0.75rem;
    font-weight: bold;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(76, 175, 80, 0.4);
  }

  .activate-button:hover {
    background: linear-gradient(135deg, #66bb6a 0%, #4caf50 100%);
    border-color: #81c784;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.6);
  }

  .activate-button:active {
    transform: translateY(0);
    box-shadow: 0 2px 6px rgba(76, 175, 80, 0.4);
  }

  .activate-blade-barrier-btn {
    width: 100%;
    padding: 0.6rem;
    margin-top: 0.5rem;
    background: linear-gradient(135deg, #7b1fa2 0%, #9c27b0 100%);
    border: 2px solid #bb86fc;
    border-radius: 6px;
    color: #fff;
    font-size: 0.75rem;
    font-weight: bold;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(123, 31, 162, 0.4);
  }

  .activate-blade-barrier-btn:hover {
    background: linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%);
    border-color: #ce93d8;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(123, 31, 162, 0.6);
  }

  .activate-blade-barrier-btn:active {
    transform: translateY(0);
    box-shadow: 0 2px 6px rgba(123, 31, 162, 0.4);
  }

  /* Blade Barrier Selection Styles */
  .blade-barrier-selection {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem;
    background: rgba(123, 31, 162, 0.2);
    border: 2px solid #7b1fa2;
    border-radius: 6px;
  }

  .selection-instructions {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .selection-instructions h4 {
    margin: 0;
    color: #bb86fc;
    font-size: 0.8rem;
    font-weight: bold;
  }

  .selection-instructions p {
    margin: 0;
    color: #ddd;
    font-size: 0.65rem;
    line-height: 1.3;
  }

  .progress-counter {
    font-size: 0.9rem;
    font-weight: bold;
    color: #bb86fc;
    text-align: center;
    padding: 0.3rem;
    background: rgba(123, 31, 162, 0.3);
    border-radius: 4px;
  }

  .confirm-placement-button {
    width: 100%;
    padding: 0.6rem;
    background: linear-gradient(135deg, #7b1fa2 0%, #9c27b0 100%);
    border: 2px solid #bb86fc;
    border-radius: 6px;
    color: #fff;
    font-size: 0.75rem;
    font-weight: bold;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(123, 31, 162, 0.4);
  }

  .confirm-placement-button:hover {
    background: linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%);
    border-color: #ce93d8;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(123, 31, 162, 0.6);
  }

  .confirm-placement-button:active {
    transform: translateY(0);
    box-shadow: 0 2px 6px rgba(123, 31, 162, 0.4);
  }

  .cancel-selection-button {
    width: 100%;
    padding: 0.5rem;
    background: rgba(100, 100, 100, 0.3);
    border: 2px solid #666;
    border-radius: 6px;
    color: #999;
    font-size: 0.7rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .cancel-selection-button:hover {
    background: rgba(150, 150, 150, 0.3);
    border-color: #888;
    color: #ccc;
  }

  .cancel-selection-button:active {
    transform: translateY(0);
  }

  /* Respect user's reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    .power-card-details-panel {
      animation: none;
    }
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .power-card-details-panel {
      width: 240px;
      font-size: 0.7rem;
    }

    .detail-title {
      font-size: 0.9rem;
    }
  }
</style>
