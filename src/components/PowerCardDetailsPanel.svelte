<script lang="ts">
  import type { PowerCard } from '../store/powerCards';
  import type { PendingBladeBarrierState } from './PlayerPowerCards.svelte';
  import { XIcon } from './icons';

  export interface PendingFlamingSphereState {
    heroId: string;
    cardId: number;
    action: 'placement' | 'movement' | 'damage';
    step: 'square-selection';
    selectedSquare?: { x: number; y: number };
  }

  interface Props {
    card: PowerCard;
    isFlipped?: boolean;
    isClickable?: boolean;
    ineligibilityReason?: string;
    bladeBarrierState?: PendingBladeBarrierState | null;
    flamingSphereState?: PendingFlamingSphereState | null;
    onDismiss?: () => void;
    onActivate?: () => void;
    onCancelBladeBarrier?: () => void;
    onConfirmBladeBarrier?: () => void;
    onCancelFlamingSphere?: () => void;
    onConfirmFlamingSphere?: () => void;
  }

  let {
    card,
    isFlipped = false,
    isClickable = false,
    ineligibilityReason,
    bladeBarrierState = null,
    flamingSphereState = null,
    onDismiss,
    onActivate,
    onCancelBladeBarrier,
    onConfirmBladeBarrier,
    onCancelFlamingSphere,
    onConfirmFlamingSphere
  }: Props = $props();

  // Power card ID constants
  const BLADE_BARRIER_CARD_ID = 5;
  const FLAMING_SPHERE_CARD_ID = 45;
  const isBladeBarrier = $derived(card.id === BLADE_BARRIER_CARD_ID);
  const isFlamingSphere = $derived(card.id === FLAMING_SPHERE_CARD_ID);

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

  function handleCancelFlamingSphere() {
    if (onCancelFlamingSphere) {
      onCancelFlamingSphere();
    }
  }

  function handleConfirmFlamingSphere() {
    if (onConfirmFlamingSphere) {
      onConfirmFlamingSphere();
    }
  }
</script>

<div 
  class="power-card-details-panel" 
  data-testid="power-card-details-panel"
  role="dialog"
  aria-label="Power card details"
>
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
    {:else if isFlamingSphere && flamingSphereState}
      <!-- Flaming Sphere Selection State Display -->
      <div class="flaming-sphere-selection" data-testid="flaming-sphere-selection">
        {#if flamingSphereState.step === 'square-selection'}
          <div class="selection-instructions">
            {#if flamingSphereState.action === 'placement'}
              <h4>Place Flaming Sphere</h4>
              <p>Click a square within 1 tile of your position</p>
            {:else if flamingSphereState.action === 'movement'}
              <h4>Move Flaming Sphere</h4>
              <p>Click a square to move the sphere to (1 tile range)</p>
            {/if}
          </div>
          {#if flamingSphereState.selectedSquare}
            <button 
              class="confirm-placement-button"
              onclick={handleConfirmFlamingSphere}
              data-testid="confirm-placement-button"
            >
              {flamingSphereState.action === 'placement' ? 'Confirm Placement' : 'Confirm Movement'}
            </button>
          {/if}
        {/if}
        <button 
          class="cancel-selection-button"
          onclick={handleCancelFlamingSphere}
          data-testid="cancel-selection-button"
        >
          Cancel
        </button>
      </div>
    {:else}
      <div class="clickability-info" data-testid="clickability-info">
        {#if isClickable && onActivate && !isFlipped}
          {#if isBladeBarrier}
            <button 
              class="activate-button compact"
              onclick={handleActivate}
              data-testid="activate-blade-barrier-button"
              aria-label="Activate Blade Barrier power"
            >
              ACTIVATE
            </button>
          {:else if isFlamingSphere}
            <button 
              class="activate-button compact"
              onclick={handleActivate}
              data-testid="activate-flaming-sphere-button"
              aria-label="Activate Flaming Sphere power"
            >
              ACTIVATE
            </button>
          {:else}
            <button 
              class="activate-button compact"
              onclick={handleActivate}
              data-testid="activate-power-button"
              aria-label="Activate {card.name} power"
            >
              Activate Power
            </button>
          {/if}
        {:else if isFlipped}
          <button 
            class="activate-button compact" 
            disabled 
            data-testid="disabled-reason"
            aria-label="Card cannot be activated: Card has been used"
          >
            Card has been used
          </button>
        {:else if ineligibilityReason}
          <button 
            class="activate-button compact" 
            disabled 
            data-testid="disabled-reason"
            aria-label="Card cannot be activated: {ineligibilityReason}"
          >
            {ineligibilityReason}
          </button>
        {:else}
          <button 
            class="activate-button compact" 
            disabled 
            data-testid="disabled-reason"
            aria-label="Card cannot be activated: Not currently available"
          >
            Not currently available
          </button>
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

  .activate-button {
    width: 100%;
    padding: 0.4rem 0.6rem;
    margin-top: 0;
    background: linear-gradient(135deg, #7b1fa2 0%, #9c27b0 100%);
    border: 2px solid #bb86fc;
    border-radius: 4px;
    color: #fff;
    font-size: 0.65rem;
    font-weight: bold;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 6px rgba(123, 31, 162, 0.3);
    font-family: inherit;
  }

  .activate-button:not(:disabled):hover {
    background: linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%);
    border-color: #ce93d8;
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(123, 31, 162, 0.5);
  }

  .activate-button:not(:disabled):active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(123, 31, 162, 0.3);
  }

  .activate-button:disabled {
    background: rgba(100, 100, 100, 0.3);
    border: 1px solid #666;
    color: #999;
    cursor: not-allowed;
    box-shadow: none;
    text-transform: none;
    font-weight: normal;
  }

  .activate-button.compact {
    font-size: 0.65rem;
    padding: 0.4rem 0.6rem;
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

  /* Flaming Sphere Selection Styles */
  .flaming-sphere-selection {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem;
    background: rgba(255, 102, 0, 0.2);
    border: 2px solid #ff6600;
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
  }
</style>
