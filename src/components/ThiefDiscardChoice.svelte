<script lang="ts">
  import type { TreasureCard } from '../store/treasure';
  import type { TreasureTokenState } from '../store/types';
  import { assetPath } from '../utils';

  interface Props {
    treasureCards: TreasureCard[];
    treasureTokens: TreasureTokenState[];
    onSelect: (cardId?: number, tokenId?: string) => void;
    edge?: string;
  }

  const { treasureCards, treasureTokens, onSelect, edge = 'bottom' }: Props = $props();

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

  function handleSelectCard(cardId: number) {
    onSelect(cardId, undefined);
  }

  function handleSelectToken(tokenId: string) {
    onSelect(undefined, tokenId);
  }
</script>

<div 
  class="thief-discard-overlay" 
  class:edge-top={edge === 'top'}
  class:edge-bottom={edge === 'bottom'}
  class:edge-left={edge === 'left'}
  class:edge-right={edge === 'right'}
  data-testid="thief-discard-modal"
>
  <div class="thief-discard-container">
    <div class="header">
      <h2 class="title" data-testid="thief-discard-title">🗡️ Thief in the Dark</h2>
      <p class="instruction" data-testid="thief-discard-instruction">
        Choose an item to discard
      </p>
    </div>

    <div class="treasures">
      <!-- Treasure Cards -->
      {#each treasureCards as treasureCard, index}
        <button
          class="treasure-item clickable"
          data-testid="treasure-card-option-{index}"
          onclick={() => handleSelectCard(treasureCard.id)}
        >
          <div class="treasure-image-container">
            <img
              src={assetPath('assets/Token_TreasureTreasure.png')}
              alt={treasureCard.name}
              class="treasure-image"
            />
          </div>

          <div class="treasure-info">
            <h3 class="treasure-name" data-testid="treasure-card-{index}-name">{treasureCard.name}</h3>
            
            <div class="treasure-type">
              <span class="type-badge">{getUsageText(treasureCard.usage)}</span>
            </div>

            <div class="treasure-value" data-testid="treasure-card-{index}-value">
              <span class="gold-value">💰 {treasureCard.goldPrice.toLocaleString()} Gold</span>
            </div>

            <p class="treasure-description">{treasureCard.description}</p>

            <div class="treasure-rule">
              <strong>Rule:</strong> {treasureCard.rule}
            </div>
          </div>
        </button>
      {/each}

      <!-- Treasure Tokens -->
      {#each treasureTokens as token, index}
        <button
          class="treasure-item clickable"
          data-testid="treasure-token-option-{index}"
          onclick={() => handleSelectToken(token.id)}
        >
          <div class="treasure-image-container">
            <img
              src={assetPath('assets/Token_TreasureTreasure.png')}
              alt="Treasure Token"
              class="treasure-image"
            />
          </div>

          <div class="treasure-info">
            <h3 class="treasure-name" data-testid="treasure-token-{index}-name">Treasure Token</h3>
            
            <div class="treasure-type">
              <span class="type-badge">Token</span>
            </div>

            <p class="treasure-description">
              A treasure token on your tile. Can be drawn later when a monster is defeated on this tile.
            </p>
          </div>
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .thief-discard-overlay {
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
  .thief-discard-overlay.edge-top {
    transform: rotate(180deg);
  }

  .thief-discard-overlay.edge-left {
    transform: rotate(90deg);
  }

  .thief-discard-overlay.edge-right {
    transform: rotate(-90deg);
  }

  .thief-discard-container {
    background: linear-gradient(135deg, #1a1a2a 0%, #2a2a3d 50%, #1a1a2a 100%);
    border: 3px solid #8b4513;
    border-radius: 16px;
    padding: 1.5rem;
    max-width: 1200px;
    width: 100%;
    color: #fff;
    box-shadow: 
      0 0 30px rgba(139, 69, 19, 0.4),
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
    color: #ff6b6b;
    margin: 0 0 0.5rem 0;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  }

  .instruction {
    font-size: 1rem;
    color: #f5deb3;
    margin: 0;
  }

  .treasures {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  @media (max-width: 768px) {
    .treasures {
      grid-template-columns: 1fr;
    }
  }

  .treasure-item {
    background: rgba(0, 0, 0, 0.3);
    border: 2px solid #8b7355;
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    text-align: left;
    width: 100%;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .treasure-item.clickable:hover {
    background: rgba(255, 107, 107, 0.2);
    border-color: #ff6b6b;
    transform: translateY(-4px) scale(1.02);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 107, 107, 0.3);
  }

  .treasure-item.clickable:active {
    transform: translateY(-2px) scale(1.01);
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
    color: #ff6b6b;
  }
</style>
