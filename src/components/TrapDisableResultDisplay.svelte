<script lang="ts">
  import type { TrapDisableResult } from '../store/types';
  import { WarningIcon } from './icons';
  
  interface Props {
    result: TrapDisableResult;
    onDismiss?: () => void;
  }
  
  let { result, onDismiss }: Props = $props();
  
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
  class="trap-result-overlay"
  onclick={handleDismiss}
  onkeydown={handleKeydown}
  role="dialog"
  aria-modal="true"
  aria-label="Trap disable result"
  tabindex="0"
  data-testid="trap-disable-result-overlay"
>
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div 
    class="trap-result" 
    class:success={result.success}
    class:failure={!result.success}
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
    role="document"
    data-testid="trap-disable-result"
  >
    <div class="result-header">
      <h3 class="trap-info" data-testid="trap-info">
        Disable {result.trapName}
      </h3>
      <button 
        class="dismiss-button" 
        onclick={handleDismiss}
        aria-label="Dismiss trap disable result"
        data-testid="dismiss-trap-result"
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
        {#if result.penalty !== 0}
          <div class="breakdown-row penalty">
            <span class="breakdown-label">Penalty:</span>
            <span class="breakdown-value" data-testid="penalty-value">{result.penalty}</span>
          </div>
        {/if}
        <div class="breakdown-divider"></div>
        <div class="breakdown-row total">
          <span class="breakdown-label">Modified:</span>
          <span class="breakdown-value" data-testid="modified-roll">{result.modifiedRoll}</span>
        </div>
        <div class="breakdown-row target">
          <span class="breakdown-label">vs DC:</span>
          <span class="breakdown-value" data-testid="disable-dc">{result.disableDC}</span>
        </div>
      </div>
    </div>
    
    <div class="result-section">
      {#if result.success}
        <span class="result-text success" data-testid="result-text">
          TRAP DISABLED!
        </span>
        <p class="result-description">The trap has been successfully disabled and removed.</p>
      {:else}
        <span class="result-text failure" data-testid="result-text">
          <WarningIcon size={20} ariaLabel="Failed" /> FAILED TO DISABLE
        </span>
        <p class="result-description">The trap remains active.</p>
      {/if}
    </div>
    
    {#if result.penalty < 0}
      <div class="penalty-notice">
        <WarningIcon size={16} ariaLabel="Warning" />
        <span>Kobold Trappers: {result.penalty} to disable rolls</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .trap-result-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease-out;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .trap-result {
    background: linear-gradient(145deg, #2d2d2d, #1a1a1a);
    border: 3px solid #999;
    border-radius: 16px;
    padding: 1.5rem;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    animation: slideIn 0.3s ease-out;
  }
  
  .trap-result.success {
    border-color: #27ae60;
    box-shadow: 0 8px 32px rgba(39, 174, 96, 0.3);
  }
  
  .trap-result.failure {
    border-color: #e74c3c;
    box-shadow: 0 8px 32px rgba(231, 76, 60, 0.3);
  }
  
  @keyframes slideIn {
    from { 
      transform: scale(0.9) translateY(-20px);
      opacity: 0;
    }
    to { 
      transform: scale(1) translateY(0);
      opacity: 1;
    }
  }
  
  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .trap-info {
    color: #fff;
    font-size: 1.2rem;
    margin: 0;
    flex: 1;
  }
  
  .dismiss-button {
    background: none;
    border: none;
    color: #999;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.25rem;
    line-height: 1;
    transition: color 0.2s;
    min-width: 44px;
    min-height: 44px;
  }
  
  .dismiss-button:hover {
    color: #fff;
  }
  
  .dice-roll-section {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
  }
  
  .dice-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  
  .d20-icon {
    background: linear-gradient(145deg, #555, #333);
    color: #fff;
    width: 50px;
    height: 50px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    font-weight: bold;
    border: 2px solid #666;
  }
  
  .roll-value {
    color: #fff;
    font-size: 1.5rem;
    font-weight: bold;
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
    color: #ccc;
    font-size: 0.9rem;
  }
  
  .breakdown-row.penalty {
    color: #e74c3c;
  }
  
  .breakdown-row.total {
    font-weight: bold;
    color: #fff;
    font-size: 1rem;
  }
  
  .breakdown-row.target {
    color: #999;
  }
  
  .breakdown-divider {
    height: 1px;
    background: #555;
    margin: 0.25rem 0;
  }
  
  .breakdown-label {
    opacity: 0.8;
  }
  
  .breakdown-value {
    font-weight: bold;
  }
  
  .result-section {
    text-align: center;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    margin-bottom: 1rem;
  }
  
  .result-text {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-size: 1.3rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }
  
  .result-text.success {
    color: #27ae60;
  }
  
  .result-text.failure {
    color: #e74c3c;
  }
  
  .result-description {
    color: #aaa;
    font-size: 0.9rem;
    margin: 0;
  }
  
  .penalty-notice {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: rgba(231, 76, 60, 0.2);
    border: 1px solid #e74c3c;
    border-radius: 8px;
    color: #e74c3c;
    font-size: 0.9rem;
    font-weight: bold;
  }
</style>
