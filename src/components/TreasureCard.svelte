<script lang="ts">
  import type { TreasureCard } from '../store/treasure';
  import { getEffectImplementationStatus, getImplementationMessage } from '../store/treasure';
  import { assetPath } from '../utils';
  import { WarningIcon } from './icons';

  interface Props {
    treasure: TreasureCard;
    onAssign?: (heroId: string) => void;
    onDismiss?: () => void;
    heroes?: { id: string; name: string }[];
    edge?: string;
  }

  const { treasure, onAssign, onDismiss, heroes = [], edge = 'bottom' }: Props = $props();

  // Get the usage type display text
  function getUsageText(usage: string): string {
    switch (usage) {
      case 'immediate':
        return 'Play Immediately';
      case 'action':
        return 'Use Action';
      case 'reaction':
        return 'Reaction';
      case 'consumable':
        return 'Consumable';
      default:
        return usage;
    }
  }

  // Get the effect type display
  function getEffectSummary(): string {
    const effect = treasure.effect;
    if (effect.value) {
      switch (effect.type) {
        case 'attack-bonus':
          return `+${effect.value} Attack`;
        case 'ac-bonus':
          return `+${effect.value} AC`;
        case 'speed-bonus':
          return `+${effect.value} Speed`;
        case 'damage-bonus':
          return `+${effect.value} Damage`;
        case 'healing':
          return `Heal ${effect.value} HP`;
        default:
          return '';
      }
    }
    return '';
  }

  // Get implementation status and message for display
  const implementationStatus = $derived(getEffectImplementationStatus(treasure));
  const implementationMessage = $derived(getImplementationMessage(treasure));

  function handleAssign(heroId: string) {
    if (onAssign) {
      onAssign(heroId);
    }
  }

  function handleDismiss() {
    if (onDismiss) {
      onDismiss();
    }
  }
</script>

<div 
  class="treasure-card-overlay" 
  class:edge-top={edge === 'top'}
  class:edge-bottom={edge === 'bottom'}
  class:edge-left={edge === 'left'}
  class:edge-right={edge === 'right'}
  data-testid="treasure-card-modal"
>
  <div class="treasure-card" data-testid="treasure-card">
    <div class="treasure-header">
      <h2 class="treasure-title" data-testid="treasure-title">🎁 Treasure!</h2>
    </div>

    <div class="treasure-content">
      <div class="treasure-image-container">
        <img
          src={assetPath('assets/Token_TreasureTreasure.png')}
          alt={treasure.name}
          class="treasure-image"
        />
      </div>

      <div class="treasure-info">
        <h3 class="treasure-name" data-testid="treasure-name">{treasure.name}</h3>
        
        <div class="treasure-type" data-testid="treasure-type">
          <span class="type-badge">{getUsageText(treasure.usage)}</span>
          {#if getEffectSummary()}
            <span class="effect-badge" data-testid="treasure-effect">{getEffectSummary()}</span>
          {/if}
        </div>

        <p class="treasure-description" data-testid="treasure-description">
          {treasure.description}
        </p>

        <div class="treasure-rule" data-testid="treasure-rule">
          <strong>Rule:</strong> {treasure.rule}
        </div>

        {#if implementationMessage}
          <div 
            class="implementation-status" 
            class:partial={implementationStatus === 'partial'}
            class:not-implemented={implementationStatus === 'not-implemented'}
            data-testid="implementation-status"
          >
            {#if implementationStatus === 'partial'}
              <WarningIcon size={16} ariaLabel="Partially implemented" />
            {/if}
            <span class="status-message">{implementationMessage}</span>
          </div>
        {/if}

        {#if treasure.goldPrice}
          <div class="treasure-value">
            <span class="gold-value">💰 {treasure.goldPrice.toLocaleString()} Gold</span>
          </div>
        {/if}
      </div>
    </div>

    {#if heroes.length > 0}
      <div class="treasure-actions">
        <p class="assign-prompt">Give this treasure to:</p>
        <div class="hero-buttons">
          {#each heroes as hero (hero.id)}
            <button
              class="assign-button"
              data-testid="assign-to-{hero.id}"
              onclick={() => handleAssign(hero.id)}
            >
              Give to {hero.name}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    {#if onDismiss}
      <button
        class="dismiss-button"
        data-testid="dismiss-treasure-card"
        onclick={handleDismiss}
      >
        {heroes.length > 0 ? 'Discard Treasure' : 'Close'}
      </button>
    {/if}
  </div>
</div>

<style>
  .treasure-card-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 1rem;
  }

  /* Edge rotations for multi-player view */
  .treasure-card-overlay.edge-top {
    transform: rotate(180deg);
  }

  .treasure-card-overlay.edge-left {
    transform: rotate(90deg);
  }

  .treasure-card-overlay.edge-right {
    transform: rotate(-90deg);
  }

  .treasure-card {
    background: linear-gradient(135deg, #2a1f1a 0%, #3d2f28 50%, #2a1f1a 100%);
    border: 3px solid #c9a227;
    border-radius: 16px;
    padding: 1.5rem;
    max-width: 500px;
    width: 100%;
    color: #fff;
    box-shadow: 
      0 0 30px rgba(201, 162, 39, 0.4),
      inset 0 1px 1px rgba(255, 255, 255, 0.1);
    animation: treasure-appear 0.3s ease-out;
  }

  @keyframes treasure-appear {
    from {
      transform: scale(0.9);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  .treasure-header {
    text-align: center;
    margin-bottom: 1rem;
  }

  .treasure-title {
    font-size: 1.5rem;
    color: #c9a227;
    margin: 0;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  }

  .treasure-content {
    display: flex;
    gap: 1.5rem;
    margin-bottom: 1rem;
  }

  .treasure-image-container {
    flex-shrink: 0;
    width: 120px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.3);
    border: 2px solid #8b7355;
    border-radius: 8px;
  }

  .treasure-image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .treasure-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .treasure-name {
    font-size: 1.2rem;
    color: #f5deb3;
    margin: 0;
  }

  .treasure-type {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .type-badge {
    background: rgba(139, 115, 85, 0.5);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    color: #d4a574;
    border: 1px solid #8b7355;
  }

  .effect-badge {
    background: rgba(46, 125, 50, 0.5);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    color: #4ade80;
    border: 1px solid #2e7d32;
    font-weight: bold;
  }

  .treasure-description {
    font-size: 0.85rem;
    color: #c4b69c;
    font-style: italic;
    margin: 0;
  }

  .treasure-rule {
    font-size: 0.8rem;
    color: #ddd;
    background: rgba(0, 0, 0, 0.3);
    padding: 0.5rem;
    border-radius: 4px;
    line-height: 1.4;
  }

  .treasure-rule strong {
    color: #c9a227;
  }

  .implementation-status {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    line-height: 1.4;
    margin-top: 0.25rem;
  }

  .implementation-status.partial {
    background: rgba(255, 193, 7, 0.2);
    border: 1px solid rgba(255, 193, 7, 0.5);
    color: #ffc107;
  }

  .implementation-status.not-implemented {
    background: rgba(100, 149, 237, 0.2);
    border: 1px solid rgba(100, 149, 237, 0.5);
    color: #87ceeb;
  }

  .status-message {
    flex: 1;
  }

  .treasure-value {
    margin-top: 0.25rem;
  }

  .gold-value {
    font-size: 0.8rem;
    color: #ffd700;
  }

  .treasure-actions {
    margin-top: 1rem;
    text-align: center;
  }

  .assign-prompt {
    color: #c9a227;
    margin-bottom: 0.75rem;
    font-weight: bold;
  }

  .hero-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
  }

  .assign-button {
    background: linear-gradient(180deg, #3d5a3d 0%, #2d4a2d 100%);
    color: #fff;
    border: 2px solid #4ade80;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;
    min-width: 120px;
  }

  .assign-button:hover {
    background: linear-gradient(180deg, #4d6a4d 0%, #3d5a3d 100%);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }

  .dismiss-button {
    display: block;
    width: 100%;
    margin-top: 1rem;
    padding: 0.75rem;
    background: rgba(100, 100, 100, 0.5);
    color: #aaa;
    border: 1px solid #666;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s ease;
  }

  .dismiss-button:hover {
    background: rgba(120, 120, 120, 0.5);
    color: #fff;
  }
</style>
