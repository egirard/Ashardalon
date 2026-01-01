<script lang="ts">
  import type { Position, DungeonState } from '../store/types';
  import { getTileSquares } from '../store/powerCardEffects';
  import { getPowerCardById } from '../store/powerCards';

  interface Props {
    cardId: number;
    tileId: string;
    dungeon: DungeonState;
    requiredTokens: number;
    onConfirm: (positions: Position[]) => void;
    onCancel: () => void;
  }

  const { cardId, tileId, dungeon, requiredTokens, onConfirm, onCancel }: Props = $props();

  // Get all valid squares on the tile
  const validSquares = $derived(getTileSquares(tileId, dungeon));
  
  // Get power card details
  const powerCard = getPowerCardById(cardId);

  // Track selected squares using Set for O(1) lookups
  let selectedSquares: Position[] = $state([]);
  let selectedSquaresSet = $derived(new Set(selectedSquares.map(s => `${s.x},${s.y}`)));

  function handleSquareClick(square: Position) {
    const key = `${square.x},${square.y}`;
    
    if (selectedSquaresSet.has(key)) {
      // Deselect
      selectedSquares = selectedSquares.filter(s => `${s.x},${s.y}` !== key);
    } else if (selectedSquares.length < requiredTokens) {
      // Select if under limit
      selectedSquares = [...selectedSquares, square];
    }
  }

  function isSquareSelected(square: Position): boolean {
    return selectedSquaresSet.has(`${square.x},${square.y}`);
  }

  function getSelectionNumber(square: Position): number | null {
    const key = `${square.x},${square.y}`;
    const index = selectedSquares.findIndex(s => `${s.x},${s.y}` === key);
    return index >= 0 ? index + 1 : null;
  }

  function handleConfirm() {
    if (selectedSquares.length === requiredTokens) {
      onConfirm(selectedSquares);
    }
  }

  function handleCancel() {
    onCancel();
  }
</script>

<div class="token-placement-overlay" data-testid="token-placement-modal">
  <div class="token-placement-card" data-testid="token-placement-card">
    <div class="token-placement-header">
      <h2 class="token-placement-title" data-testid="token-placement-title">
        {powerCard?.name || 'Token Placement'}
      </h2>
      <p class="token-placement-context" data-testid="token-placement-context">
        Select {requiredTokens} different squares on this tile for token placement
      </p>
      <p class="token-placement-progress" data-testid="token-placement-progress">
        Selected: {selectedSquares.length} / {requiredTokens}
      </p>
    </div>

    <div class="token-placement-content">
      {#if validSquares.length > 0}
        <div class="square-grid">
          {#each validSquares as square (square.x + '-' + square.y)}
            {@const isSelected = isSquareSelected(square)}
            {@const selectionNumber = getSelectionNumber(square)}
            <button
              class="square-option"
              class:selected={isSelected}
              class:disabled={!isSelected && selectedSquares.length >= requiredTokens}
              data-testid="square-option-{square.x}-{square.y}"
              onclick={() => handleSquareClick(square)}
            >
              <div class="square-coords">({square.x}, {square.y})</div>
              {#if selectionNumber}
                <div class="selection-number">{selectionNumber}</div>
              {/if}
            </button>
          {/each}
        </div>
      {:else}
        <div class="no-squares-message">
          <p>No valid squares found on this tile</p>
        </div>
      {/if}
    </div>

    <div class="token-placement-actions">
      <button
        class="cancel-button"
        data-testid="cancel-token-placement"
        onclick={handleCancel}
      >
        Cancel
      </button>
      <button
        class="confirm-button"
        data-testid="confirm-token-placement"
        disabled={selectedSquares.length !== requiredTokens}
        onclick={handleConfirm}
      >
        Place Tokens
      </button>
    </div>
  </div>
</div>

<style>
  .token-placement-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1001;
    animation: fadeIn 0.3s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .token-placement-card {
    background: linear-gradient(145deg, #1a1a2e 0%, #0f0f1a 100%);
    border: 3px solid #7b1fa2;
    border-radius: 12px;
    padding: 24px;
    max-width: 700px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 10px 40px rgba(123, 31, 162, 0.6);
  }

  .token-placement-header {
    margin-bottom: 24px;
    text-align: center;
  }

  .token-placement-title {
    color: #7b1fa2;
    font-size: 24px;
    margin: 0 0 8px 0;
    font-weight: bold;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  }

  .token-placement-context {
    color: #e0e0e0;
    font-size: 16px;
    margin: 0 0 8px 0;
  }

  .token-placement-progress {
    color: #ab47bc;
    font-size: 18px;
    font-weight: bold;
    margin: 0;
  }

  .token-placement-content {
    margin-bottom: 24px;
  }

  .square-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 12px;
    justify-items: center;
  }

  .square-option {
    background: linear-gradient(145deg, #2a2a3e 0%, #1a1a2e 100%);
    border: 2px solid #444;
    border-radius: 8px;
    padding: 12px;
    width: 100px;
    height: 90px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .square-option:hover:not(.disabled) {
    border-color: #7b1fa2;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(123, 31, 162, 0.3);
  }

  .square-option.selected {
    background: linear-gradient(145deg, #4a2a5a 0%, #3a1a4a 100%);
    border-color: #ab47bc;
    box-shadow: 0 0 20px rgba(171, 71, 188, 0.5);
  }

  .square-option.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .square-coords {
    color: #e0e0e0;
    font-size: 14px;
    margin-bottom: 4px;
  }

  .selection-number {
    position: absolute;
    top: 8px;
    right: 8px;
    background: #ab47bc;
    color: white;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: bold;
  }

  .no-squares-message {
    text-align: center;
    color: #999;
    padding: 20px;
  }

  .token-placement-actions {
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
    background: linear-gradient(145deg, #ab47bc 0%, #7b1fa2 100%);
    border-color: #ab47bc;
    color: white;
  }

  .confirm-button:hover:not(:disabled) {
    background: linear-gradient(145deg, #ba68c8 0%, #ab47bc 100%);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(171, 71, 188, 0.4);
  }

  .confirm-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
