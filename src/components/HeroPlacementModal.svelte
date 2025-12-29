<script lang="ts">
  import type { Position, DungeonState } from '../store/types';
  import { getTileSquares } from '../store/powerCardEffects';
  import { getPowerCardById } from '../store/powerCards';

  interface Props {
    cardId: number;
    heroId: string;
    tileId: string;
    currentPosition: Position;
    dungeon: DungeonState;
    onSelect: (position: Position) => void;
    onCancel: () => void;
  }

  const { cardId, heroId, tileId, currentPosition, dungeon, onSelect, onCancel }: Props = $props();

  // Get all valid squares on the tile (derived)
  const validSquares = $derived(getTileSquares(tileId, dungeon));
  
  // Get power card details
  const powerCard = getPowerCardById(cardId);

  // Debug logging
  $effect(() => {
    console.log('HeroPlacementModal:', {
      tileId,
      dungeonTiles: dungeon.tiles.length,
      validSquares: validSquares.length,
      currentPosition,
    });
  });

  // Track selected square
  let selectedSquare: Position | null = $state(null);

  function handleSquareClick(square: Position) {
    selectedSquare = square;
  }

  function handleConfirm() {
    if (selectedSquare) {
      onSelect(selectedSquare);
    }
  }

  function handleCancel() {
    onCancel();
  }

  function isSamePosition(pos1: Position, pos2: Position): boolean {
    return pos1.x === pos2.x && pos1.y === pos2.y;
  }
</script>

<div class="hero-placement-overlay" data-testid="hero-placement-modal">
  <div class="hero-placement-card" data-testid="hero-placement-card">
    <div class="hero-placement-header">
      <h2 class="hero-placement-title" data-testid="hero-placement-title">
        {powerCard?.name || 'Hero Placement'}
      </h2>
      <p class="hero-placement-context" data-testid="hero-placement-context">
        Choose a square on your tile to place your hero
      </p>
    </div>

    <div class="hero-placement-content">
      {#if validSquares.length > 0}
        <div class="square-grid">
          {#each validSquares as square (square.x + '-' + square.y)}
            {@const isSelected = selectedSquare && isSamePosition(selectedSquare, square)}
            {@const isCurrent = isSamePosition(currentPosition, square)}
            <button
              class="square-option"
              class:selected={isSelected}
              class:current={isCurrent}
              data-testid="square-option-{square.x}-{square.y}"
              onclick={() => handleSquareClick(square)}
            >
              <div class="square-coords">({square.x}, {square.y})</div>
              {#if isCurrent}
                <div class="current-label">Current</div>
              {/if}
            </button>
          {/each}
        </div>
      {:else}
        <div class="no-squares-message">
          <p>No valid squares found on tile: {tileId}</p>
          <p>Dungeon has {dungeon.tiles.length} tiles</p>
        </div>
      {/if}
    </div>

    <div class="hero-placement-actions">
      <button
        class="cancel-button"
        data-testid="cancel-hero-placement"
        onclick={handleCancel}
      >
        Cancel
      </button>
      <button
        class="confirm-button"
        data-testid="confirm-hero-placement"
        disabled={!selectedSquare}
        onclick={handleConfirm}
      >
        Confirm Position
      </button>
    </div>
  </div>
</div>

<style>
  .hero-placement-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    animation: fadeIn 0.3s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .hero-placement-card {
    background: linear-gradient(145deg, #1a1a2e 0%, #0f0f1a 100%);
    border: 3px solid #d4af37;
    border-radius: 12px;
    padding: 24px;
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
  }

  .hero-placement-header {
    margin-bottom: 24px;
    text-align: center;
  }

  .hero-placement-title {
    color: #d4af37;
    font-size: 24px;
    margin: 0 0 8px 0;
    font-weight: bold;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  }

  .hero-placement-context {
    color: #e0e0e0;
    font-size: 16px;
    margin: 0;
  }

  .hero-placement-content {
    margin-bottom: 24px;
  }

  .square-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
    justify-items: center;
  }

  .square-option {
    background: linear-gradient(145deg, #2a2a3e 0%, #1a1a2e 100%);
    border: 2px solid #444;
    border-radius: 8px;
    padding: 16px;
    width: 120px;
    height: 100px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .square-option:hover {
    border-color: #d4af37;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
  }

  .square-option.selected {
    background: linear-gradient(145deg, #3a5a3a 0%, #2a4a2a 100%);
    border-color: #4caf50;
    box-shadow: 0 0 20px rgba(76, 175, 80, 0.5);
  }

  .square-option.current {
    border-color: #2196f3;
  }

  .square-coords {
    color: #e0e0e0;
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 4px;
  }

  .current-label {
    color: #2196f3;
    font-size: 12px;
    font-weight: bold;
    position: absolute;
    bottom: 8px;
  }

  .hero-placement-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .cancel-button,
  .confirm-button {
    padding: 12px 24px;
    border: 2px solid;
    border-radius: 6px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .cancel-button {
    background: transparent;
    border-color: #999;
    color: #e0e0e0;
  }

  .cancel-button:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: #ccc;
  }

  .confirm-button {
    background: linear-gradient(145deg, #4caf50 0%, #388e3c 100%);
    border-color: #4caf50;
    color: white;
  }

  .confirm-button:hover:not(:disabled) {
    background: linear-gradient(145deg, #66bb6a 0%, #4caf50 100%);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
  }

  .confirm-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
