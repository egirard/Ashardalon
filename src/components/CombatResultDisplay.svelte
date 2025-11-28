<script lang="ts">
  import type { AttackResult } from '../store/types';
  
  interface Props {
    result: AttackResult;
    targetName: string;
    attackerName: string;
    attackName: string;
    onDismiss?: () => void;
  }
  
  let { result, targetName, attackerName, attackName, onDismiss }: Props = $props();
  
  function handleDismiss() {
    if (onDismiss) {
      onDismiss();
    }
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleDismiss();
    }
  }
</script>

<div 
  class="combat-result-overlay"
  onclick={handleDismiss}
  onkeydown={handleKeydown}
  role="dialog"
  aria-modal="true"
  aria-label="Combat result"
  tabindex="0"
  data-testid="combat-result-overlay"
>
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div 
    class="combat-result" 
    class:hit={result.isHit}
    class:miss={!result.isHit}
    class:critical={result.isCritical}
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
    role="document"
    data-testid="combat-result"
  >
    <div class="result-header">
      <h3 class="attacker-info" data-testid="attacker-info">
        {attackerName} attacks with {attackName}!
      </h3>
      <button 
        class="dismiss-button" 
        onclick={handleDismiss}
        aria-label="Dismiss combat result"
        data-testid="dismiss-combat-result"
      >
        ✕
      </button>
    </div>
    
    <div class="dice-roll-section">
      <div class="dice-container">
        <span class="d20-icon" aria-label="D20 die">D20</span>
        <span class="roll-value" data-testid="roll-value">{result.roll}</span>
      </div>
      
      <div class="roll-breakdown">
        <div class="breakdown-row">
          <span class="breakdown-label">Roll:</span>
          <span class="breakdown-value" data-testid="dice-roll">{result.roll}</span>
        </div>
        <div class="breakdown-row">
          <span class="breakdown-label">+ Bonus:</span>
          <span class="breakdown-value" data-testid="attack-bonus">{result.attackBonus}</span>
        </div>
        <div class="breakdown-divider"></div>
        <div class="breakdown-row total">
          <span class="breakdown-label">Total:</span>
          <span class="breakdown-value" data-testid="attack-total">{result.total}</span>
        </div>
        <div class="breakdown-row target">
          <span class="breakdown-label">vs AC:</span>
          <span class="breakdown-value" data-testid="target-ac">{result.targetAC}</span>
        </div>
      </div>
    </div>
    
    <div class="result-section">
      {#if result.isCritical}
        <span class="result-text critical" data-testid="result-text">⚔️ CRITICAL HIT!</span>
      {:else if result.isHit}
        <span class="result-text hit" data-testid="result-text">✅ HIT!</span>
      {:else}
        <span class="result-text miss" data-testid="result-text">❌ MISS!</span>
      {/if}
      
      {#if result.isHit}
        <div class="damage-info" data-testid="damage-info">
          <span class="damage-value">{result.damage}</span>
          <span class="damage-label">damage to {targetName}</span>
        </div>
      {/if}
    </div>
    
    <p class="dismiss-hint">Click anywhere to dismiss</p>
  </div>
</div>

<style>
  .combat-result-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
    cursor: pointer;
  }
  
  .combat-result {
    background: linear-gradient(145deg, #1a1a2e 0%, #16162b 100%);
    border: 3px solid #4a4a6a;
    border-radius: 12px;
    padding: 1.5rem;
    min-width: 300px;
    max-width: 360px;
    cursor: default;
    animation: slideIn 0.3s ease-out;
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .combat-result.hit {
    border-color: #4caf50;
    box-shadow: 0 8px 32px rgba(76, 175, 80, 0.3);
  }
  
  .combat-result.miss {
    border-color: #666;
    box-shadow: 0 8px 32px rgba(100, 100, 100, 0.2);
  }
  
  .combat-result.critical {
    border-color: #ffd700;
    box-shadow: 0 8px 32px rgba(255, 215, 0, 0.4);
  }
  
  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
    border-bottom: 1px solid #4a4a6a;
    padding-bottom: 0.75rem;
  }
  
  .attacker-info {
    margin: 0;
    font-size: 1rem;
    color: #8ecae6;
    font-weight: normal;
  }
  
  .dismiss-button {
    background: transparent;
    border: none;
    color: #666;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0.25rem;
    line-height: 1;
    transition: color 0.2s;
  }
  
  .dismiss-button:hover {
    color: #fff;
  }
  
  .dice-roll-section {
    display: flex;
    gap: 1.5rem;
    align-items: center;
    margin-bottom: 1rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
  }
  
  .dice-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }
  
  .d20-icon {
    font-size: 0.875rem;
    font-weight: bold;
    color: #8ecae6;
    background: rgba(142, 202, 230, 0.15);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    border: 1px solid rgba(142, 202, 230, 0.3);
  }
  
  .roll-value {
    font-size: 2rem;
    font-weight: bold;
    color: #fff;
  }
  
  .roll-breakdown {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .breakdown-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
  }
  
  .breakdown-label {
    color: #888;
  }
  
  .breakdown-value {
    color: #fff;
    font-weight: bold;
  }
  
  .breakdown-divider {
    border-top: 1px solid #4a4a6a;
    margin: 0.25rem 0;
  }
  
  .breakdown-row.total .breakdown-value {
    color: #8ecae6;
    font-size: 1.1rem;
  }
  
  .breakdown-row.target .breakdown-label,
  .breakdown-row.target .breakdown-value {
    color: #f4a261;
  }
  
  .result-section {
    text-align: center;
    margin-bottom: 1rem;
  }
  
  .result-text {
    font-size: 1.5rem;
    font-weight: bold;
    display: block;
    margin-bottom: 0.5rem;
  }
  
  .result-text.hit {
    color: #4caf50;
  }
  
  .result-text.miss {
    color: #888;
  }
  
  .result-text.critical {
    color: #ffd700;
    text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  }
  
  .damage-info {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
  
  .damage-value {
    font-size: 1.5rem;
    font-weight: bold;
    color: #e76f51;
  }
  
  .damage-label {
    color: #aaa;
    font-size: 0.9rem;
  }
  
  .dismiss-hint {
    text-align: center;
    color: #555;
    font-size: 0.75rem;
    margin: 0;
  }
</style>
