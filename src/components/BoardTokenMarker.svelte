<script lang="ts">
  import type { BoardTokenState } from '../store/types';
  import { getTokenDisplayInfo } from '../store/boardTokens';
  
  interface Props {
    token: BoardTokenState;
    cellSize: number;
    tileOffsetX: number;
    tileOffsetY: number;
    tilePixelOffset: { x: number; y: number };
    onClick?: (token: BoardTokenState) => void;
  }
  
  let { token, cellSize, tileOffsetX, tileOffsetY, tilePixelOffset, onClick }: Props = $props();
  
  // Calculate pixel position
  let pixelX = $derived(token.position.x * cellSize + tileOffsetX + tilePixelOffset.x);
  let pixelY = $derived(token.position.y * cellSize + tileOffsetY + tilePixelOffset.y);
  
  // Get token display info
  const displayInfo = getTokenDisplayInfo(token.type);
  
  // Determine if token should show charges
  const showCharges = token.charges !== undefined && token.charges > 1;
  
  function handleClick() {
    if (onClick) {
      onClick(token);
    }
  }
</script>

{#if onClick}
  <button
    class="board-token"
    class:clickable={true}
    class:movable={token.canMove}
    style="left: {pixelX}px; top: {pixelY}px; width: {cellSize}px; height: {cellSize}px; --token-color: {displayInfo.color};"
    data-testid="board-token"
    data-token-id={token.id}
    data-token-type={token.type}
    title="{displayInfo.name}{showCharges ? ` (${token.charges} charges)` : ''}"
    onclick={handleClick}
  >
    <div class="token-content">
      <span class="token-emoji">{displayInfo.emoji}</span>
      {#if showCharges}
        <span class="token-charges">{token.charges}</span>
      {/if}
    </div>
  </button>
{:else}
  <div
    class="board-token"
    class:movable={token.canMove}
    style="left: {pixelX}px; top: {pixelY}px; width: {cellSize}px; height: {cellSize}px; --token-color: {displayInfo.color};"
    data-testid="board-token"
    data-token-id={token.id}
    data-token-type={token.type}
    title="{displayInfo.name}{showCharges ? ` (${token.charges} charges)` : ''}"
  >
    <div class="token-content">
      <span class="token-emoji">{displayInfo.emoji}</span>
      {#if showCharges}
        <span class="token-charges">{token.charges}</span>
      {/if}
    </div>
  </div>
{/if}

<style>
  .board-token {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 6;
    border-radius: 50%;
    background: radial-gradient(circle, var(--token-color) 0%, rgba(0, 0, 0, 0.3) 100%);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4), 0 0 12px var(--token-color);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    border: none;
    padding: 0;
  }
  
  .board-token.clickable {
    cursor: pointer;
  }
  
  .board-token.clickable:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6), 0 0 20px var(--token-color);
  }
  
  .board-token.movable {
    border: 2px solid rgba(255, 255, 255, 0.6);
  }
  
  .token-content {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .token-emoji {
    font-size: 2rem;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8));
    user-select: none;
  }
  
  .token-charges {
    position: absolute;
    bottom: 5%;
    right: 5%;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    border: 2px solid white;
    border-radius: 50%;
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    font-weight: bold;
    user-select: none;
  }
</style>
