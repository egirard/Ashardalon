<script lang="ts">
  import type { Position } from '../store/types';
  
  interface Props {
    validMoveSquares: Position[];
    tileOffsetX: number;
    tileOffsetY: number;
    cellSize: number;
    onSquareClick: (position: Position) => void;
  }
  
  let { validMoveSquares, tileOffsetX, tileOffsetY, cellSize, onSquareClick }: Props = $props();
  
  function getSquareStyle(position: Position): string {
    const left = tileOffsetX + position.x * cellSize;
    const top = tileOffsetY + position.y * cellSize;
    return `left: ${left}px; top: ${top}px; width: ${cellSize}px; height: ${cellSize}px;`;
  }
  
  function handleSquareClick(event: MouseEvent, position: Position) {
    event.stopPropagation();
    onSquareClick(position);
  }
</script>

<div class="movement-overlay" data-testid="movement-overlay">
  {#each validMoveSquares as square (`${square.x},${square.y}`)}
    <button
      class="move-square"
      data-testid="move-square"
      data-position-x={square.x}
      data-position-y={square.y}
      style={getSquareStyle(square)}
      onclick={(e) => handleSquareClick(e, square)}
    >
      <span class="sr-only">Move to ({square.x}, {square.y})</span>
    </button>
  {/each}
</div>

<style>
  .movement-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 5;
  }
  
  .move-square {
    position: absolute;
    background: rgba(30, 144, 255, 0.4);
    border: 2px solid rgba(30, 144, 255, 0.8);
    border-radius: 4px;
    cursor: pointer;
    pointer-events: auto;
    transition: all 0.2s ease-out;
    padding: 0;
    margin: 0;
  }
  
  .move-square:hover {
    background: rgba(30, 144, 255, 0.6);
    border-color: rgba(30, 144, 255, 1);
    box-shadow: 0 0 10px rgba(30, 144, 255, 0.6);
  }
  
  .move-square:focus {
    outline: 2px solid #fff;
    outline-offset: 2px;
  }
  
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
