<script lang="ts">
  import { HeartIcon } from './icons';
  
  interface Props {
    surges: number;
  }
  
  let { surges }: Props = $props();
</script>

<div class="healing-surge-counter" data-testid="healing-surge-counter">
  <HeartIcon size={16} ariaLabel="Healing Surges" />
  <span class="surge-label">Surges:</span>
  <span class="surge-value" data-testid="surge-value">{surges}</span>
</div>

<style>
  .healing-surge-counter {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: rgba(231, 76, 60, 0.15);
    padding: 0.4rem 0.8rem;
    border-radius: 8px;
    border: 1px solid rgba(231, 76, 60, 0.3);
  }
  

  
  .surge-label {
    font-size: 0.8rem;
    font-weight: bold;
    color: #e74c3c;
  }
  
  .surge-value {
    font-size: 1rem;
    font-weight: bold;
    color: #fff;
    min-width: 1.5rem;
    text-align: center;
  }
</style>
