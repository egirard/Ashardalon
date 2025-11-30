<script lang="ts">
  import type { EncounterCard, PartyResources, EncounterType } from '../store/types';
  import { ENCOUNTER_CARDS, ENCOUNTER_CANCEL_COST } from '../store/types';
  import { canCancelEncounter } from '../store/encounter';
  
  interface Props {
    encounterId: string;
    partyResources: PartyResources;
    onCancel?: () => void;
    onAccept?: () => void;
  }
  
  let { encounterId, partyResources, onCancel, onAccept }: Props = $props();
  
  // Get encounter definition
  const encounter = $derived(ENCOUNTER_CARDS.find(e => e.id === encounterId));
  
  // Check if cancel is available
  const canCancel = $derived(canCancelEncounter(partyResources));
  
  // Get type icon
  function getTypeIcon(type: EncounterType): string {
    switch (type) {
      case 'Event': return '🌋';
      case 'Trap': return '⚠️';
      case 'Attack': return '⚔️';
    }
  }
  
  function handleCancel() {
    if (canCancel && onCancel) {
      onCancel();
    }
  }
  
  function handleAccept() {
    if (onAccept) {
      onAccept();
    }
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleAccept();
    }
  }
</script>

{#if encounter}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div 
    class="encounter-card-overlay"
    onkeydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-label="Encounter drawn"
    tabindex="0"
    data-testid="encounter-card-overlay"
  >
    <div 
      class="encounter-card" 
      role="article"
      data-testid="encounter-card"
    >
      <div class="card-header">
        <h3 class="encounter-name" data-testid="encounter-name">{encounter.name}</h3>
      </div>
      
      <div class="card-image">
        <span class="type-icon">{getTypeIcon(encounter.type)}</span>
      </div>
      
      <div class="card-type" data-testid="encounter-type">
        Type: {encounter.type}
      </div>
      
      <p class="card-description" data-testid="encounter-description">
        {encounter.description}
      </p>
      
      <div class="card-actions">
        <button 
          class="cancel-button" 
          class:disabled={!canCancel}
          onclick={handleCancel}
          disabled={!canCancel}
          aria-label="Cancel encounter for 5 XP"
          data-testid="cancel-encounter-button"
        >
          Cancel ({ENCOUNTER_CANCEL_COST} XP)
        </button>
        <button 
          class="accept-button" 
          onclick={handleAccept}
          aria-label="Accept encounter"
          data-testid="accept-encounter-button"
        >
          Accept
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .encounter-card-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
  }
  
  .encounter-card {
    background: linear-gradient(145deg, #1a1a3e 0%, #0a0a1a 100%);
    border: 3px solid #8855dd;
    border-radius: 12px;
    padding: 1.5rem;
    min-width: 280px;
    max-width: 320px;
    box-shadow: 0 8px 32px rgba(136, 85, 221, 0.3);
  }
  
  .card-header {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 1rem;
    border-bottom: 1px solid #8855dd;
    padding-bottom: 0.75rem;
  }
  
  .encounter-name {
    margin: 0;
    font-size: 1.25rem;
    color: #bb88ff;
    text-shadow: 0 0 10px rgba(187, 136, 255, 0.5);
    text-align: center;
  }
  
  .card-image {
    display: flex;
    justify-content: center;
    margin-bottom: 1rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
  }
  
  .type-icon {
    font-size: 3rem;
  }
  
  .card-type {
    text-align: center;
    color: #999;
    font-size: 0.9rem;
    margin-bottom: 0.75rem;
  }
  
  .card-description {
    text-align: center;
    color: #ccc;
    font-size: 0.95rem;
    margin-bottom: 1.5rem;
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    line-height: 1.4;
  }
  
  .card-actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .cancel-button {
    padding: 0.75rem 1rem;
    font-size: 1rem;
    font-weight: bold;
    background: rgba(255, 215, 0, 0.2);
    color: #ffd700;
    border: 2px solid #ffd700;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    min-height: 48px;
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
    padding: 0.75rem 1rem;
    font-size: 1rem;
    font-weight: bold;
    background: rgba(76, 175, 80, 0.2);
    color: #4caf50;
    border: 2px solid #4caf50;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    min-height: 48px;
  }
  
  .accept-button:hover {
    background: rgba(76, 175, 80, 0.3);
    box-shadow: 0 0 10px rgba(76, 175, 80, 0.4);
  }
</style>
