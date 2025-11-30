<script lang="ts">
  import type { EncounterCard, EncounterType, PartyResources } from '../store/types';
  import { ENCOUNTER_CANCEL_COST } from '../store/types';
  import { canCancelEncounter } from '../store/encounters';
  import { assetPath } from '../utils';
  
  interface Props {
    encounter: EncounterCard;
    partyResources: PartyResources;
    onDismiss?: () => void;
    onCancel?: () => void;
  }
  
  let { encounter, partyResources, onDismiss, onCancel }: Props = $props();
  
  // Check if cancel is available
  const canCancel = $derived(canCancelEncounter(partyResources));
  
  function handleDismiss() {
    if (onDismiss) {
      onDismiss();
    }
  }
  
  function handleCancel() {
    if (canCancel && onCancel) {
      onCancel();
    }
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleDismiss();
    }
  }
  
  // Get the type icon for the encounter
  function getTypeIcon(type: EncounterType): string {
    switch (type) {
      case 'event':
        return '⚡';
      case 'trap':
        return '⚠️';
      case 'hazard':
        return '☠️';
      case 'curse':
        return '🔮';
      case 'environment':
        return '🌫️';
      default:
        return '❓';
    }
  }
  
  // Get display name for effect type
  function getEffectSummary(eff: EncounterCard['effect']): string {
    switch (eff.type) {
      case 'damage':
        if (eff.target === 'active-hero') {
          return `Active hero takes ${eff.amount} damage`;
        } else {
          return `All heroes take ${eff.amount} damage`;
        }
      case 'environment':
        return 'Environment effect (not implemented)';
      case 'curse':
        return `Curse (${eff.duration} turns) (not implemented)`;
      case 'trap':
        return `Trap - DC ${eff.disableDC} to disable (not implemented)`;
      case 'hazard':
        return `Hazard - AC ${eff.ac}, ${eff.damage} damage (not implemented)`;
      default:
        return 'Unknown effect';
    }
  }
</script>

<div 
  class="encounter-card-overlay"
  onclick={handleDismiss}
  onkeydown={handleKeydown}
  role="dialog"
  aria-modal="true"
  aria-label="Encounter card drawn"
  tabindex="0"
  data-testid="encounter-card-overlay"
>
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div 
    class="encounter-card" 
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
    role="article"
    data-testid="encounter-card"
  >
    <div class="card-header">
      <span class="type-badge" data-testid="encounter-type">
        {getTypeIcon(encounter.type)} {encounter.type.toUpperCase()}
      </span>
      <button 
        class="dismiss-button" 
        onclick={handleDismiss}
        aria-label="Dismiss encounter card"
        data-testid="dismiss-encounter-card"
      >
        ✕
      </button>
    </div>
    
    <h3 class="encounter-name" data-testid="encounter-name">{encounter.name}</h3>
    
    <div class="card-image">
      <img 
        src={assetPath(encounter.imagePath)} 
        alt={encounter.name}
        class="encounter-image"
        onerror={(e) => { 
          const img = e.target as HTMLImageElement;
          if (img && encounter) {
            img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23333" width="100" height="100"/><text x="50" y="50" fill="%23fff" text-anchor="middle" dominant-baseline="central" font-size="40">' + getTypeIcon(encounter.type) + '</text></svg>';
          }
        }}
      />
    </div>
    
    <div class="card-description" data-testid="encounter-description">
      {encounter.description}
    </div>
    
    <div class="effect-summary" data-testid="encounter-effect">
      <span class="effect-label">Effect:</span>
      <span class="effect-value">{getEffectSummary(encounter.effect)}</span>
    </div>
    
    <div class="card-actions">
      <button 
        class="cancel-button"
        class:disabled={!canCancel}
        onclick={handleCancel}
        disabled={!canCancel}
        aria-label="Cancel encounter for {ENCOUNTER_CANCEL_COST} XP"
        data-testid="cancel-encounter-button"
      >
        Cancel ({ENCOUNTER_CANCEL_COST} XP)
      </button>
      <button 
        class="accept-button"
        onclick={handleDismiss}
        data-testid="accept-encounter-button"
      >
        Accept
      </button>
    </div>
    
    <p class="card-hint">Cancel costs {ENCOUNTER_CANCEL_COST} XP, Accept applies the effect</p>
  </div>
</div>

<style>
  .encounter-card-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
    cursor: pointer;
  }
  
  .encounter-card {
    background: linear-gradient(145deg, #1a1a2e 0%, #0f0f1a 100%);
    border: 3px solid #8b5cf6;
    border-radius: 12px;
    padding: 1.5rem;
    min-width: 300px;
    max-width: 360px;
    box-shadow: 0 8px 32px rgba(139, 92, 246, 0.3);
    cursor: default;
  }
  
  .card-header {
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
  }
  
  .dismiss-button {
    background: transparent;
    border: none;
    color: #8b5cf6;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0.25rem;
    line-height: 1;
    transition: color 0.2s;
  }
  
  .dismiss-button:hover {
    color: #a78bfa;
  }
  
  .encounter-name {
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
    width: 120px;
    height: 120px;
    object-fit: contain;
    border: 2px solid #8b5cf6;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.5);
  }
  
  .card-description {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
    color: #e2e8f0;
    font-size: 0.95rem;
    line-height: 1.5;
    text-align: center;
  }
  
  .effect-summary {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: rgba(139, 92, 246, 0.1);
    border-radius: 8px;
    border: 1px solid rgba(139, 92, 246, 0.3);
  }
  
  .effect-label {
    font-size: 0.75rem;
    color: #a78bfa;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .effect-value {
    font-size: 0.9rem;
    color: #fbbf24;
    font-weight: bold;
    text-align: center;
  }
  
  .card-actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }
  
  .cancel-button {
    width: 100%;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    font-weight: bold;
    background: rgba(255, 215, 0, 0.2);
    color: #ffd700;
    border: 2px solid #ffd700;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .cancel-button:hover:not(.disabled) {
    background: rgba(255, 215, 0, 0.3);
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.4);
  }
  
  .cancel-button.disabled {
    background: rgba(128, 128, 128, 0.2);
    color: #666;
    border-color: #666;
    cursor: not-allowed;
  }
  
  .accept-button {
    width: 100%;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    font-weight: bold;
    background: rgba(76, 175, 80, 0.2);
    color: #4caf50;
    border: 2px solid #4caf50;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .accept-button:hover {
    background: rgba(76, 175, 80, 0.3);
    box-shadow: 0 0 10px rgba(76, 175, 80, 0.4);
  }
  
  .card-hint {
    text-align: center;
    color: #666;
    font-size: 0.75rem;
    margin: 0;
  }
</style>
