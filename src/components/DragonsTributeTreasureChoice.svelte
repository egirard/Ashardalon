<script lang="ts">
  import type { TreasureCard } from '../store/treasure';
  import { assetPath } from '../utils';

  interface Props {
    treasure1: TreasureCard;
    treasure2: TreasureCard;
    onSelect: (keepFirst: boolean) => void;
    edge?: string;
  }

  const { treasure1, treasure2, onSelect, edge = 'bottom' }: Props = $props();

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

  // Determine which treasure has higher value
  const higherValue = $derived(
    treasure1.goldPrice > treasure2.goldPrice ? 1 :
    treasure2.goldPrice > treasure1.goldPrice ? 2 :
    0 // Equal values
  );

  function handleSelect(keepFirst: boolean) {
    if (onSelect) {
      onSelect(keepFirst);
    }
  }
</script>

<div 
  class="dragons-tribute-overlay" 
  class:edge-top={edge === 'top'}
  class:edge-bottom={edge === 'bottom'}
  class:edge-left={edge === 'left'}
  class:edge-right={edge === 'right'}
  data-testid="dragons-tribute-modal"
>
  <div class="dragons-tribute-container">
    <div class="header">
      <h2 class="title" data-testid="dragons-tribute-title">🐉 Dragon's Tribute</h2>
      <p class="instruction" data-testid="dragons-tribute-instruction">
        Choose one treasure to keep. The other will be discarded.
        {#if higherValue === 0}
          <br /><span class="note">(Both treasures have equal value)</span>
        {:else}
          <br /><span class="note">(Higher value treasure should be discarded)</span>
        {/if}
      </p>
    </div>

    <div class="treasures">
      <!-- First Treasure -->
      <div class="treasure-option" data-testid="treasure-option-1">
        <div class="treasure-card" class:higher-value={higherValue === 1}>
          <div class="treasure-image-container">
            <img
              src={assetPath('assets/Token_TreasureTreasure.png')}
              alt={treasure1.name}
              class="treasure-image"
            />
          </div>

          <div class="treasure-info">
            <h3 class="treasure-name" data-testid="treasure-1-name">{treasure1.name}</h3>
            
            <div class="treasure-type">
              <span class="type-badge">{getUsageText(treasure1.usage)}</span>
            </div>

            <div class="treasure-value" data-testid="treasure-1-value">
              <span class="gold-value">💰 {treasure1.goldPrice.toLocaleString()} Gold</span>
              {#if higherValue === 1}
                <span class="higher-badge">HIGHER</span>
              {/if}
            </div>

            <p class="treasure-description">{treasure1.description}</p>

            <div class="treasure-rule">
              <strong>Rule:</strong> {treasure1.rule}
            </div>
          </div>
        </div>

        <button
          class="select-button"
          class:recommended={higherValue === 2}
          data-testid="select-treasure-1"
          onclick={() => handleSelect(true)}
        >
          {higherValue === 2 ? '✓ Keep This (Recommended)' : 'Keep This'}
        </button>
      </div>

      <!-- Second Treasure -->
      <div class="treasure-option" data-testid="treasure-option-2">
        <div class="treasure-card" class:higher-value={higherValue === 2}>
          <div class="treasure-image-container">
            <img
              src={assetPath('assets/Token_TreasureTreasure.png')}
              alt={treasure2.name}
              class="treasure-image"
            />
          </div>

          <div class="treasure-info">
            <h3 class="treasure-name" data-testid="treasure-2-name">{treasure2.name}</h3>
            
            <div class="treasure-type">
              <span class="type-badge">{getUsageText(treasure2.usage)}</span>
            </div>

            <div class="treasure-value" data-testid="treasure-2-value">
              <span class="gold-value">💰 {treasure2.goldPrice.toLocaleString()} Gold</span>
              {#if higherValue === 2}
                <span class="higher-badge">HIGHER</span>
              {/if}
            </div>

            <p class="treasure-description">{treasure2.description}</p>

            <div class="treasure-rule">
              <strong>Rule:</strong> {treasure2.rule}
            </div>
          </div>
        </div>

        <button
          class="select-button"
          class:recommended={higherValue === 1}
          data-testid="select-treasure-2"
          onclick={() => handleSelect(false)}
        >
          {higherValue === 1 ? '✓ Keep This (Recommended)' : 'Keep This'}
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .dragons-tribute-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.90);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 1rem;
  }

  /* Edge rotations for multi-player view */
  .dragons-tribute-overlay.edge-top {
    transform: rotate(180deg);
  }

  .dragons-tribute-overlay.edge-left {
    transform: rotate(90deg);
  }

  .dragons-tribute-overlay.edge-right {
    transform: rotate(-90deg);
  }

  .dragons-tribute-container {
    background: linear-gradient(135deg, #2a1f1a 0%, #3d2f28 50%, #2a1f1a 100%);
    border: 3px solid #c9a227;
    border-radius: 16px;
    padding: 1.5rem;
    max-width: 1200px;
    width: 100%;
    color: #fff;
    box-shadow: 
      0 0 30px rgba(201, 162, 39, 0.4),
      inset 0 1px 1px rgba(255, 255, 255, 0.1);
    animation: appear 0.3s ease-out;
  }

  @keyframes appear {
    from {
      transform: scale(0.9);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  .header {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .title {
    font-size: 1.8rem;
    color: #c9a227;
    margin: 0 0 0.5rem 0;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  }

  .instruction {
    font-size: 1rem;
    color: #f5deb3;
    margin: 0;
  }

  .note {
    font-size: 0.9rem;
    color: #d4a574;
    font-style: italic;
  }

  .treasures {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }

  @media (max-width: 768px) {
    .treasures {
      grid-template-columns: 1fr;
    }
  }

  .treasure-option {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .treasure-card {
    background: rgba(0, 0, 0, 0.3);
    border: 2px solid #8b7355;
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    flex: 1;
  }

  .treasure-card.higher-value {
    border-color: #ff6b6b;
    box-shadow: 0 0 15px rgba(255, 107, 107, 0.3);
  }

  .treasure-image-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 80px;
  }

  .treasure-image {
    max-width: 80px;
    max-height: 80px;
    object-fit: contain;
  }

  .treasure-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .treasure-name {
    font-size: 1.2rem;
    color: #f5deb3;
    margin: 0;
    text-align: center;
  }

  .treasure-type {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
  }

  .type-badge {
    background: rgba(139, 115, 85, 0.5);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    color: #d4a574;
    border: 1px solid #8b7355;
  }

  .treasure-value {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .gold-value {
    font-size: 1rem;
    color: #ffd700;
    font-weight: bold;
  }

  .higher-badge {
    background: rgba(255, 107, 107, 0.3);
    color: #ff6b6b;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: bold;
    border: 1px solid #ff6b6b;
  }

  .treasure-description {
    font-size: 0.85rem;
    color: #c4b69c;
    font-style: italic;
    margin: 0;
    text-align: center;
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

  .select-button {
    width: 100%;
    padding: 0.75rem;
    background: linear-gradient(180deg, #3d5a3d 0%, #2d4a2d 100%);
    color: #fff;
    border: 2px solid #4ade80;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: bold;
    transition: all 0.2s ease;
  }

  .select-button:hover {
    background: linear-gradient(180deg, #4d6a4d 0%, #3d5a3d 100%);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }

  .select-button.recommended {
    border-color: #ffd700;
    box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
  }
</style>
