<script lang="ts">
  interface Props {
    xp: number;
  }
  
  let { xp }: Props = $props();
</script>

<div class="xp-counter" data-testid="xp-counter">
  <span class="xp-icon" aria-label="Experience Points">⭐</span>
  <span class="xp-label">XP:</span>
  <span class="xp-value" data-testid="xp-value">{xp}</span>
</div>

<style>
  .xp-counter {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: rgba(255, 215, 0, 0.15);
    padding: 0.4rem 0.8rem;
    border-radius: 8px;
    border: 1px solid rgba(255, 215, 0, 0.3);
  }
  
  .xp-icon {
    font-size: 1rem;
  }
  
  .xp-label {
    font-size: 0.8rem;
    font-weight: bold;
    color: #ffd700;
  }
  
  .xp-value {
    font-size: 1rem;
    font-weight: bold;
    color: #fff;
    min-width: 1.5rem;
    text-align: center;
  }
</style>
