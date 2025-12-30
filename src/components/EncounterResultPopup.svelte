<script lang="ts">
  /**
   * Encounter Result Popup Component
   * Displays the outcome of an encounter card's effect on players
   * Shows card name/image, affected players, and results (damage, status, misses)
   * Now supports rotation for multi-player scenarios
   */
  
  import type { EncounterCard, EncounterResultTarget } from '../store/types';
  import { assetPath } from '../utils';
  import { LightningIcon, WarningIcon, CrystalIcon } from './icons';
  import RotationControls from './RotationControls.svelte';
  
  // Rotation animation duration (must match CSS transition)
  const ROTATION_DURATION = 300; // milliseconds
  
  interface Props {
    encounter: EncounterCard;
    targets: EncounterResultTarget[];
    onDismiss: () => void;
  }
  
  let { encounter, targets, onDismiss }: Props = $props();
  
  let overlayElement: HTMLDivElement | undefined = $state();
  let imageError = $state(false);
  let rotation = $state<0 | 90 | 180 | 270>(0);
  let isRotating = $state(false);
  
  // Auto-focus the overlay when it's mounted
  $effect(() => {
    if (overlayElement) {
      overlayElement.focus();
    }
  });
  
  function handleDismiss() {
    onDismiss();
  }
  
  function handleRotate(newRotation: 0 | 90 | 180 | 270) {
    if (newRotation !== rotation) {
      isRotating = true;
      rotation = newRotation;
      
      // Reset rotation animation flag after animation completes
      setTimeout(() => {
        isRotating = false;
      }, ROTATION_DURATION);
    }
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      handleDismiss();
    }
  }
  
  function handleDialogKeydown(event: KeyboardEvent) {
    // Only stop propagation of handled keys
    if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
      event.stopPropagation();
    }
  }
  
  // Get the type icon component for the encounter
  function getTypeIconComponent(type: string) {
    switch (type) {
      case 'event':
        return LightningIcon;
      case 'trap':
      case 'hazard':
        return WarningIcon;
      case 'curse':
        return CrystalIcon;
      case 'environment':
      default:
        return LightningIcon;
    }
  }
  
  // Format status effect name for display
  function formatStatusName(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }
</script>

<div 
  bind:this={overlayElement}
  class="result-overlay"
  onclick={handleDismiss}
  onkeydown={handleKeydown}
  role="dialog"
  aria-modal="true"
  aria-labelledby="result-title"
  aria-describedby="result-content"
  tabindex="0"
  data-testid="encounter-result-popup"
>
  <div class="dialog-wrapper">
    <RotationControls currentRotation={rotation} onRotate={handleRotate} />
    
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div 
      class="result-dialog"
      class:rotating={isRotating}
      style="transform: rotate({rotation}deg);"
      onclick={(e) => e.stopPropagation()}
      onkeydown={handleDialogKeydown}
      role="document"
      data-testid="encounter-result-dialog"
    >
    <div class="dialog-header">
      <span class="type-badge" data-testid="encounter-result-type">
        <svelte:component this={getTypeIconComponent(encounter.type)} size={16} ariaLabel={encounter.type} />
        {encounter.type.toUpperCase()}
      </span>
      <button 
        class="close-button" 
        onclick={handleDismiss}
        aria-label="Close result popup"
        data-testid="close-result-popup"
      >
        ✕
      </button>
    </div>
    
    <h2 id="result-title" class="result-title" data-testid="encounter-result-title">
      {encounter.name}
    </h2>
    
    <div class="card-image">
      {#if encounter.imagePath}
        <img 
          src={assetPath(encounter.imagePath)} 
          alt={encounter.name}
          class="encounter-image"
          class:hidden={imageError}
          onerror={() => { imageError = true; }}
        />
      {/if}
    </div>
    
    <div id="result-content" class="result-content" data-testid="encounter-result-content">
      {#if targets.length === 0}
        <div class="no-effect-message">
          No heroes were affected by this encounter.
        </div>
      {:else if targets.length === 1}
        <!-- Single target display -->
        {#each targets as target}
          <div class="single-target-result">
            <div class="hero-name" data-testid="result-hero-name">{target.heroName}</div>
            
            {#if target.wasHit !== undefined}
              <!-- Attack with roll -->
              <div class="attack-result" data-testid="result-attack-outcome">
                {#if target.wasHit}
                  <div class="hit-indicator">
                    <span class="result-label">Attack Hit!</span>
                    {#if target.attackRoll !== undefined && target.attackTotal !== undefined && target.targetAC !== undefined}
                      <span class="attack-details">
                        Roll: {target.attackRoll} + bonus = {target.attackTotal} vs AC {target.targetAC}
                      </span>
                    {/if}
                  </div>
                {:else}
                  <div class="miss-indicator">
                    <span class="result-label">Attack Missed</span>
                    {#if target.attackRoll !== undefined && target.attackTotal !== undefined && target.targetAC !== undefined}
                      <span class="attack-details">
                        Roll: {target.attackRoll} + bonus = {target.attackTotal} vs AC {target.targetAC}
                      </span>
                    {/if}
                  </div>
                {/if}
              </div>
            {/if}
            
            {#if target.damageTaken > 0}
              <div class="damage-result" data-testid="result-damage">
                <span class="damage-label">Damage:</span>
                <span class="damage-value">{target.damageTaken} HP</span>
              </div>
            {/if}
            
            {#if target.statusesApplied && target.statusesApplied.length > 0}
              <div class="status-result" data-testid="result-statuses">
                <span class="status-label">Status Effects:</span>
                <div class="status-list">
                  {#each target.statusesApplied as status}
                    <span class="status-badge">{formatStatusName(status)}</span>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/each}
      {:else}
        <!-- Multiple targets display (table format) -->
        <div class="multi-target-results">
          <table class="results-table" data-testid="results-table">
            <thead>
              <tr>
                <th>Hero</th>
                <th>Result</th>
                <th>Damage</th>
                {#if targets.some(t => t.statusesApplied && t.statusesApplied.length > 0)}
                  <th>Status</th>
                {/if}
              </tr>
            </thead>
            <tbody>
              {#each targets as target}
                <tr data-testid="result-row-{target.heroId}">
                  <td class="hero-cell">{target.heroName}</td>
                  <td class="result-cell">
                    {#if target.wasHit !== undefined}
                      {#if target.wasHit}
                        <span class="hit-badge">Hit</span>
                        {#if target.attackRoll !== undefined && target.attackTotal !== undefined && target.targetAC !== undefined}
                          <span class="roll-details">({target.attackTotal} vs {target.targetAC})</span>
                        {/if}
                      {:else}
                        <span class="miss-badge">Miss</span>
                        {#if target.attackRoll !== undefined && target.attackTotal !== undefined && target.targetAC !== undefined}
                          <span class="roll-details">({target.attackTotal} vs {target.targetAC})</span>
                        {/if}
                      {/if}
                    {:else}
                      <span class="direct-badge">Direct</span>
                    {/if}
                  </td>
                  <td class="damage-cell">{target.damageTaken > 0 ? `${target.damageTaken} HP` : '-'}</td>
                  {#if targets.some(t => t.statusesApplied && t.statusesApplied.length > 0)}
                    <td class="status-cell">
                      {#if target.statusesApplied && target.statusesApplied.length > 0}
                        {target.statusesApplied.map(formatStatusName).join(', ')}
                      {:else}
                        -
                      {/if}
                    </td>
                  {/if}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
    
    <button 
      class="continue-button"
      onclick={handleDismiss}
      data-testid="continue-button"
      aria-label="Continue game"
    >
      Continue
    </button>
    
    <p class="hint-text">Press Enter or Space to continue</p>
  </div>
  </div>
</div>

<style>
  .result-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    backdrop-filter: blur(4px);
  }
  
  .dialog-wrapper {
    position: relative;
  }
  
  .result-dialog {
    background: linear-gradient(145deg, #1a1a2e 0%, #0f0f1a 100%);
    border: 3px solid #8b5cf6;
    border-radius: 12px;
    padding: 1.5rem;
    min-width: 360px;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 8px 32px rgba(139, 92, 246, 0.4), 0 0 0 20px rgba(0, 0, 0, 0.9); /* Extra shadow to visually cover arrows */
    transition: transform 0.3s ease-out;
    position: relative;
  }
  
  .result-dialog.rotating {
    transition: transform 0.3s ease-out;
  }
  
  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }
  
  .type-badge {
    background: rgba(139, 92, 246, 0.2);
    border: 1px solid #8b5cf6;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    font-size: 0.7rem;
    color: #a78bfa;
    font-weight: bold;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  
  .close-button {
    background: transparent;
    border: none;
    color: #8b5cf6;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0.25rem;
    line-height: 1;
    transition: color 0.2s;
  }
  
  .close-button:hover {
    color: #a78bfa;
  }
  
  .result-title {
    margin: 0 0 1rem 0;
    font-size: 1.5rem;
    color: #fff;
    text-align: center;
    text-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
  }
  
  .card-image {
    display: flex;
    justify-content: center;
    margin-bottom: 1rem;
  }
  
  .encounter-image {
    width: 100px;
    height: 100px;
    object-fit: contain;
    border: 2px solid #8b5cf6;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.5);
  }
  
  .encounter-image.hidden {
    display: none;
  }
  
  .result-content {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
    color: #e2e8f0;
  }
  
  .no-effect-message {
    text-align: center;
    font-size: 1rem;
    color: #cbd5e0;
  }
  
  /* Single target styles */
  .single-target-result {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .hero-name {
    font-size: 1.25rem;
    font-weight: bold;
    color: #fbbf24;
    text-align: center;
    margin-bottom: 0.5rem;
  }
  
  .attack-result {
    background: rgba(139, 92, 246, 0.1);
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 6px;
    padding: 0.75rem;
  }
  
  .hit-indicator,
  .miss-indicator {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .hit-indicator .result-label {
    color: #f87171;
    font-weight: bold;
    font-size: 1.1rem;
  }
  
  .miss-indicator .result-label {
    color: #4ade80;
    font-weight: bold;
    font-size: 1.1rem;
  }
  
  .attack-details {
    font-size: 0.85rem;
    color: #cbd5e0;
  }
  
  .damage-result {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    background: rgba(220, 38, 38, 0.1);
    border: 1px solid rgba(220, 38, 38, 0.3);
    border-radius: 6px;
  }
  
  .damage-label {
    color: #cbd5e0;
    font-size: 0.9rem;
  }
  
  .damage-value {
    color: #f87171;
    font-weight: bold;
    font-size: 1.1rem;
  }
  
  .status-result {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem;
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.3);
    border-radius: 6px;
  }
  
  .status-label {
    color: #cbd5e0;
    font-size: 0.9rem;
  }
  
  .status-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .status-badge {
    background: rgba(251, 191, 36, 0.2);
    border: 1px solid #fbbf24;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    font-size: 0.85rem;
    color: #fbbf24;
    font-weight: bold;
  }
  
  /* Multi-target table styles */
  .multi-target-results {
    overflow-x: auto;
  }
  
  .results-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }
  
  .results-table th {
    background: rgba(139, 92, 246, 0.2);
    color: #a78bfa;
    padding: 0.5rem;
    text-align: left;
    font-weight: bold;
    border-bottom: 2px solid #8b5cf6;
  }
  
  .results-table td {
    padding: 0.5rem;
    border-bottom: 1px solid rgba(139, 92, 246, 0.2);
  }
  
  .results-table tbody tr:last-child td {
    border-bottom: none;
  }
  
  .hero-cell {
    color: #fbbf24;
    font-weight: bold;
  }
  
  .result-cell {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .hit-badge {
    background: rgba(220, 38, 38, 0.2);
    border: 1px solid #dc2626;
    color: #f87171;
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: bold;
    display: inline-block;
  }
  
  .miss-badge {
    background: rgba(34, 197, 94, 0.2);
    border: 1px solid #22c55e;
    color: #4ade80;
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: bold;
    display: inline-block;
  }
  
  .direct-badge {
    background: rgba(139, 92, 246, 0.2);
    border: 1px solid #8b5cf6;
    color: #a78bfa;
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: bold;
    display: inline-block;
  }
  
  .roll-details {
    font-size: 0.75rem;
    color: #94a3b8;
  }
  
  .damage-cell {
    color: #f87171;
    font-weight: bold;
  }
  
  .status-cell {
    color: #fbbf24;
    font-size: 0.85rem;
  }
  
  .continue-button {
    width: 100%;
    padding: 0.75rem 1rem;
    background: linear-gradient(145deg, #8b5cf6 0%, #6d28d9 100%);
    border: 2px solid #a78bfa;
    border-radius: 8px;
    color: #fff;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
    min-height: 44px;
  }
  
  .continue-button:hover {
    background: linear-gradient(145deg, #a78bfa 0%, #7c3aed 100%);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
  }
  
  .hint-text {
    text-align: center;
    color: #64748b;
    font-size: 0.75rem;
    margin: 0.5rem 0 0 0;
  }
</style>
