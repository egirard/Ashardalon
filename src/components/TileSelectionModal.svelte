<script lang="ts">
  import type { Position, DungeonState, PlacedTile } from '../store/types';
  import { getPowerCardById } from '../store/powerCards';

  interface Props {
    cardId: number;
    heroPosition: Position;
    dungeon: DungeonState;
    maxRange: number; // in tiles
    onSelect: (tileId: string) => void;
    onCancel: () => void;
  }

  const { cardId, heroPosition, dungeon, maxRange, onSelect, onCancel }: Props = $props();

  // Get power card details
  const powerCard = getPowerCardById(cardId);

  // Calculate which tiles are within range
  const tilesInRange = $derived.by(() => {
    const TILE_WIDTH = 4;
    const NORMAL_TILE_HEIGHT = 4;
    const START_TILE_HEIGHT = 8;

    // Get hero's tile position
    const heroTileX = Math.floor(heroPosition.x / TILE_WIDTH);
    const heroTileY = heroPosition.y < START_TILE_HEIGHT 
      ? 0 
      : Math.floor((heroPosition.y - START_TILE_HEIGHT) / NORMAL_TILE_HEIGHT) + 1;

    return dungeon.tiles.filter(tile => {
      const tilePosX = tile.position.col;
      const tilePosY = tile.position.row;
      
      // Calculate tile distance (Manhattan distance)
      const distance = Math.abs(tilePosX - heroTileX) + Math.abs(tilePosY - heroTileY);
      
      return distance <= maxRange;
    });
  });

  // Track selected tile
  let selectedTile: PlacedTile | null = $state(null);

  function handleTileClick(tile: PlacedTile) {
    selectedTile = tile;
  }

  function handleConfirm() {
    if (selectedTile) {
      onSelect(selectedTile.id);
    }
  }

  function handleCancel() {
    onCancel();
  }

  function getTileDisplayName(tile: PlacedTile): string {
    if (tile.id === 'start-tile') {
      return 'Start Tile';
    }
    return `Tile (${tile.position.col}, ${tile.position.row})`;
  }
</script>

<div class="tile-selection-overlay" data-testid="tile-selection-modal">
  <div class="tile-selection-card" data-testid="tile-selection-card">
    <div class="tile-selection-header">
      <h2 class="tile-selection-title" data-testid="tile-selection-title">
        {powerCard?.name || 'Tile Selection'}
      </h2>
      <p class="tile-selection-context" data-testid="tile-selection-context">
        Choose a tile within {maxRange} tile{maxRange > 1 ? 's' : ''} of your position
      </p>
    </div>

    <div class="tile-selection-content">
      {#if tilesInRange.length > 0}
        <div class="tile-grid">
          {#each tilesInRange as tile (tile.id)}
            {@const isSelected = selectedTile && selectedTile.id === tile.id}
            <button
              class="tile-option"
              class:selected={isSelected}
              data-testid="tile-option-{tile.id}"
              onclick={() => handleTileClick(tile)}
            >
              <div class="tile-name">{getTileDisplayName(tile)}</div>
              <div class="tile-coords">Position: ({tile.position.col}, {tile.position.row})</div>
            </button>
          {/each}
        </div>
      {:else}
        <div class="no-tiles-message">
          <p>No tiles found within range</p>
        </div>
      {/if}
    </div>

    <div class="tile-selection-actions">
      <button
        class="cancel-button"
        data-testid="cancel-tile-selection"
        onclick={handleCancel}
      >
        Cancel
      </button>
      <button
        class="confirm-button"
        data-testid="confirm-tile-selection"
        disabled={!selectedTile}
        onclick={handleConfirm}
      >
        Select Tile
      </button>
    </div>
  </div>
</div>

<style>
  .tile-selection-overlay {
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

  .tile-selection-card {
    background: linear-gradient(145deg, #1a1a2e 0%, #0f0f1a 100%);
    border: 3px solid #7b1fa2;
    border-radius: 12px;
    padding: 24px;
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 10px 40px rgba(123, 31, 162, 0.6);
  }

  .tile-selection-header {
    margin-bottom: 24px;
    text-align: center;
  }

  .tile-selection-title {
    color: #7b1fa2;
    font-size: 24px;
    margin: 0 0 8px 0;
    font-weight: bold;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  }

  .tile-selection-context {
    color: #e0e0e0;
    font-size: 16px;
    margin: 0;
  }

  .tile-selection-content {
    margin-bottom: 24px;
  }

  .tile-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
    justify-items: center;
  }

  .tile-option {
    background: linear-gradient(145deg, #2a2a3e 0%, #1a1a2e 100%);
    border: 2px solid #444;
    border-radius: 8px;
    padding: 16px;
    width: 100%;
    min-height: 80px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .tile-option:hover {
    border-color: #7b1fa2;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(123, 31, 162, 0.3);
  }

  .tile-option.selected {
    background: linear-gradient(145deg, #4a2a5a 0%, #3a1a4a 100%);
    border-color: #ab47bc;
    box-shadow: 0 0 20px rgba(171, 71, 188, 0.5);
  }

  .tile-name {
    color: #e0e0e0;
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 4px;
  }

  .tile-coords {
    color: #999;
    font-size: 14px;
  }

  .no-tiles-message {
    text-align: center;
    color: #999;
    padding: 20px;
  }

  .tile-selection-actions {
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
