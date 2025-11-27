<script lang="ts">
  interface Props {
    tileCount: number;
  }
  
  let { tileCount }: Props = $props();
</script>

<div class="tile-deck-counter" data-testid="tile-deck-counter">
  <span class="deck-icon">📦</span>
  <span class="deck-count" data-testid="tile-deck-count">{tileCount}</span>
  <span class="deck-label">tiles</span>
</div>

<style>
  .tile-deck-counter {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.3rem 0.6rem;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 4px;
    border: 1px solid #444;
    font-size: 0.85rem;
  }
  
  .deck-icon {
    font-size: 1rem;
  }
  
  .deck-count {
    font-weight: bold;
    color: #ffd700;
    min-width: 1.5em;
    text-align: center;
  }
  
  .deck-label {
    color: #aaa;
  }
</style>
