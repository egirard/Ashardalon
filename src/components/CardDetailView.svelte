<script lang="ts">
  import type { PowerCard } from '../store/powerCards';
  import type { TreasureCard } from '../store/treasure';
  import type { HeroCondition } from '../store/types';
  import { SwordIcon, ShieldIcon, HeartIcon, DiceIcon, TargetIcon, StarIcon, XIcon } from './icons';

  export interface CardDetail {
    type: 'power' | 'treasure' | 'condition';
    card: PowerCard | TreasureCard | HeroCondition;
    isFlipped?: boolean;
    isClickable?: boolean;
    ineligibilityReason?: string;
  }

  interface Props {
    detail: CardDetail | null;
    onDismiss?: () => void;
  }

  let { detail, onDismiss }: Props = $props();

  // Get icon component based on treasure effect type
  function getTreasureIconComponent(effectType: string) {
    switch (effectType) {
      case 'attack-bonus':
      case 'damage-bonus':
        return SwordIcon;
      case 'ac-bonus':
        return ShieldIcon;
      case 'healing':
        return HeartIcon;
      case 'reroll':
        return DiceIcon;
      case 'attack-action':
        return TargetIcon;
      case 'level-up':
        return StarIcon;
      default:
        return StarIcon;
    }
  }

  function handleDismiss() {
    if (onDismiss) {
      onDismiss();
    }
  }
</script>

{#if detail}
  <div 
    class="card-detail-view" 
    data-testid="card-detail-view"
    role="dialog"
    aria-label="Card details"
  >
    <div class="detail-header">
      <h3 class="detail-title">
        {#if detail.type === 'power'}
          {(detail.card as PowerCard).name}
        {:else if detail.type === 'treasure'}
          {(detail.card as TreasureCard).name}
        {:else}
          {(detail.card as HeroCondition).name}
        {/if}
      </h3>
      <button 
        class="close-button" 
        onclick={handleDismiss}
        aria-label="Close details"
      >
        <XIcon size={16} ariaLabel="Close" />
      </button>
    </div>

    <div class="detail-content">
      {#if detail.type === 'power'}
        {@const powerCard = detail.card as PowerCard}
        <div class="card-type-badge power" data-testid="card-type">
          {powerCard.type} Power
        </div>
        
        {#if powerCard.attackBonus !== undefined}
          <div class="power-stats">
            <div class="stat-item">
              <strong>Attack Bonus:</strong> +{powerCard.attackBonus}
            </div>
            <div class="stat-item">
              <strong>Damage:</strong> {powerCard.damage || 1}
            </div>
          </div>
        {/if}

        <div class="description" data-testid="card-description">
          {powerCard.description}
        </div>

        <div class="rule" data-testid="card-rule">
          <strong>Rule:</strong> {powerCard.rule}
        </div>

        {#if detail.isFlipped}
          <div class="status-badge flipped">
            <XIcon size={14} ariaLabel="Used" />
            Card has been used
          </div>
        {/if}

        <div class="clickability-info" data-testid="clickability-info">
          {#if detail.isClickable}
            <div class="status-badge clickable">
              ✓ Available to use
            </div>
          {:else if detail.ineligibilityReason}
            <div class="status-badge not-clickable">
              ✗ {detail.ineligibilityReason}
            </div>
          {:else}
            <div class="status-badge not-clickable">
              ✗ Not currently available
            </div>
          {/if}
        </div>

      {:else if detail.type === 'treasure'}
        {@const treasureCard = detail.card as TreasureCard}
        <div class="card-type-badge treasure" data-testid="card-type">
          {treasureCard.usage} Treasure
        </div>

        <div class="treasure-effect">
          <svelte:component 
            this={getTreasureIconComponent(treasureCard.effect.type)} 
            size={20} 
            ariaLabel={treasureCard.effect.type} 
          />
          <span>{treasureCard.effect.description}</span>
        </div>

        <div class="description" data-testid="card-description">
          {treasureCard.description}
        </div>

        <div class="rule" data-testid="card-rule">
          <strong>Rule:</strong> {treasureCard.rule}
        </div>

        {#if detail.isFlipped}
          <div class="status-badge flipped">
            <XIcon size={14} ariaLabel="Used" />
            Item has been used
          </div>
        {/if}

        <div class="clickability-info" data-testid="clickability-info">
          {#if detail.isClickable}
            <div class="status-badge clickable">
              ✓ Click to use this item
            </div>
          {:else if detail.isFlipped}
            <div class="status-badge not-clickable">
              ✗ Already used
            </div>
          {:else if treasureCard.usage === 'immediate'}
            <div class="status-badge not-clickable">
              ✗ Passive effect (always active)
            </div>
          {:else if treasureCard.usage === 'reaction'}
            <div class="status-badge not-clickable">
              ✗ Activates automatically on trigger
            </div>
          {:else}
            <div class="status-badge not-clickable">
              ✗ Not currently available
            </div>
          {/if}
        </div>

      {:else if detail.type === 'condition'}
        {@const condition = detail.card as HeroCondition}
        <div class="card-type-badge condition" data-testid="card-type">
          Status Effect
        </div>

        <div class="condition-icon-large">
          {condition.icon}
        </div>

        <div class="description" data-testid="card-description">
          {condition.description}
        </div>

        <div class="clickability-info" data-testid="clickability-info">
          <div class="status-badge not-clickable">
            ✗ Status effects cannot be clicked
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .card-detail-view {
    position: absolute;
    top: 0;
    right: calc(100% + 0.5rem);
    width: 250px;
    max-width: 90vw;
    background: rgba(20, 20, 35, 0.98);
    border: 2px solid #ffd700;
    border-radius: 8px;
    padding: 0.75rem;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 215, 0, 0.4);
    z-index: 100;
    animation: slide-in 0.2s ease-out;
  }

  @keyframes slide-in {
    from {
      opacity: 0;
      transform: translateX(10px);
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
  }

  .card-type-badge.power {
    background: rgba(46, 125, 50, 0.3);
    border: 1px solid #4caf50;
    color: #4caf50;
  }

  .card-type-badge.treasure {
    background: rgba(139, 115, 85, 0.3);
    border: 1px solid #c9a227;
    color: #ffd700;
  }

  .card-type-badge.condition {
    background: rgba(156, 39, 176, 0.3);
    border: 1px solid #9c27b0;
    color: #ce93d8;
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

  .treasure-effect {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem;
    background: rgba(139, 115, 85, 0.2);
    border-radius: 4px;
    color: #ffd700;
    font-size: 0.7rem;
  }

  .condition-icon-large {
    font-size: 2rem;
    text-align: center;
    padding: 0.5rem;
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

  /* Respect user's reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    .card-detail-view {
      animation: none;
    }
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .card-detail-view {
      width: 200px;
      font-size: 0.7rem;
    }

    .detail-title {
      font-size: 0.9rem;
    }
  }
</style>
