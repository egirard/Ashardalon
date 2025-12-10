<script lang="ts">
  import { store } from '../store';
  import {
    selectUtilityCard,
    toggleAtWillCard,
    selectDailyCard,
    type HeroPowerCardSelection,
    type EdgePosition,
  } from '../store/heroesSlice';
  import type { Hero } from '../store/types';
  import {
    type PowerCard,
    getShuffledAtWillCards,
    getShuffledDailyCards,
    getShuffledUtilityCards,
    getPowerCardById,
    HERO_CUSTOM_ABILITIES,
  } from '../store/powerCards';
  import { getEdgeRotation } from '../utils';
  import { CheckIcon, CircleIcon } from './icons';

  interface Props {
    hero: Hero;
    selection: HeroPowerCardSelection;
    onClose: () => void;
    edge?: EdgePosition;
  }

  let { hero, selection, onClose, edge = 'bottom' }: Props = $props();

  // Get randomized cards for this hero's class (deterministic per hero)
  const atWillCards = $derived(getShuffledAtWillCards(hero.heroClass, hero.id));
  const dailyCards = $derived(getShuffledDailyCards(hero.heroClass, hero.id));
  const utilityCards = $derived(getShuffledUtilityCards(hero.heroClass, hero.id));
  const customAbilityId = $derived(HERO_CUSTOM_ABILITIES[hero.id]);
  const customAbility = $derived(customAbilityId ? getPowerCardById(customAbilityId) : null);
  
  // Progress text for at-will selection
  const atWillProgressText = $derived(
    selection.atWills.length === 0
      ? 'Pick first of two'
      : selection.atWills.length === 1
        ? 'Pick second of two'
        : 'Complete'
  );

  // Check if selection is complete
  const isSelectionComplete = $derived(
    selection.utility !== null &&
    selection.atWills.length === 2 &&
    selection.daily !== null
  );

  function handleUtilitySelect(cardId: number) {
    store.dispatch(selectUtilityCard({ heroId: hero.id, cardId }));
  }

  function handleAtWillToggle(cardId: number) {
    store.dispatch(toggleAtWillCard({ heroId: hero.id, cardId }));
  }

  function handleDailySelect(cardId: number) {
    store.dispatch(selectDailyCard({ heroId: hero.id, cardId }));
  }

  function isUtilitySelected(cardId: number): boolean {
    return selection.utility === cardId;
  }

  function isAtWillSelected(cardId: number): boolean {
    return selection.atWills.includes(cardId);
  }

  function isDailySelected(cardId: number): boolean {
    return selection.daily === cardId;
  }

  function canSelectAtWill(cardId: number): boolean {
    return selection.atWills.includes(cardId) || selection.atWills.length < 2;
  }
</script>

<div class="power-card-selection" data-testid="power-card-selection">
  <div 
    class="modal-overlay" 
    onclick={onClose} 
    onkeydown={(e) => e.key === 'Escape' && onClose()}
    role="button"
    tabindex="-1"
    aria-label="Close modal"
  ></div>
  <div class="modal-content" style="transform: rotate({getEdgeRotation(edge)}deg);">
    <div class="modal-header">
      <h2>Select Power Cards for {hero.name}</h2>
      <button class="close-button" onclick={onClose} data-testid="close-power-selection">×</button>
    </div>
    
    <div class="selection-status" data-testid="selection-status">
      {#if isSelectionComplete}
        <span class="status-complete">
          <CheckIcon size={14} ariaLabel="Complete" /> Selection Complete
        </span>
      {:else}
        <span class="status-incomplete">
          Select: 1 Utility ({#if selection.utility}<CheckIcon size={12} ariaLabel="Selected" />{:else}<CircleIcon size={12} ariaLabel="Not selected" />{/if}), 
          2 At-Wills ({selection.atWills.length}/2), 
          1 Daily ({#if selection.daily}<CheckIcon size={12} ariaLabel="Selected" />{:else}<CircleIcon size={12} ariaLabel="Not selected" />{/if})
        </span>
      {/if}
    </div>

    <div class="card-sections">
      <!-- Custom Ability (automatic) -->
      <div class="card-section">
        <h3>Custom Ability (Automatic)</h3>
        <div class="card-grid">
          {#if customAbility}
            <div class="power-card custom-ability" data-testid="custom-ability-card">
              <div class="card-header">
                <span class="card-name">{customAbility.name}</span>
                <span class="card-type">{customAbility.type}</span>
              </div>
              <p class="card-description">{customAbility.description}</p>
              <p class="card-rule">{customAbility.rule}</p>
              {#if customAbility.attackBonus !== undefined}
                <div class="card-stats">
                  <span>Attack: +{customAbility.attackBonus}</span>
                  {#if customAbility.damage !== undefined}
                    <span>Damage: {customAbility.damage}</span>
                  {/if}
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>

      <!-- Utility Cards -->
      <div class="card-section">
        <h3>Utility Power (Select 1)</h3>
        <div class="card-grid" data-testid="utility-cards">
          {#each utilityCards as card (card.id)}
            <button
              class="power-card"
              class:selected={isUtilitySelected(card.id)}
              onclick={() => handleUtilitySelect(card.id)}
              data-testid="utility-card-{card.id}"
            >
              <div class="card-header">
                <span class="card-name">{card.name}</span>
                <span class="card-type">{card.type}</span>
              </div>
              <p class="card-description">{card.description}</p>
              <p class="card-rule">{card.rule}</p>
            </button>
          {/each}
        </div>
      </div>

      <!-- At-Will Cards -->
      <div class="card-section">
        <h3>At-Will Powers — <span class="pick-progress" data-testid="atwill-progress">{atWillProgressText}</span></h3>
        <div class="card-grid" data-testid="atwill-cards">
          {#each atWillCards as card (card.id)}
            <button
              class="power-card"
              class:selected={isAtWillSelected(card.id)}
              class:disabled={!canSelectAtWill(card.id)}
              onclick={() => handleAtWillToggle(card.id)}
              disabled={!canSelectAtWill(card.id)}
              data-testid="atwill-card-{card.id}"
            >
              <div class="card-header">
                <span class="card-name">{card.name}</span>
                <span class="card-type">{card.type}</span>
              </div>
              <p class="card-description">{card.description}</p>
              <p class="card-rule">{card.rule}</p>
              {#if card.attackBonus !== undefined}
                <div class="card-stats">
                  <span>Attack: +{card.attackBonus}</span>
                  {#if card.damage !== undefined}
                    <span>Damage: {card.damage}</span>
                  {/if}
                </div>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      <!-- Daily Cards -->
      <div class="card-section">
        <h3>Daily Power (Select 1)</h3>
        <div class="card-grid" data-testid="daily-cards">
          {#each dailyCards as card (card.id)}
            <button
              class="power-card"
              class:selected={isDailySelected(card.id)}
              onclick={() => handleDailySelect(card.id)}
              data-testid="daily-card-{card.id}"
            >
              <div class="card-header">
                <span class="card-name">{card.name}</span>
                <span class="card-type">{card.type}</span>
              </div>
              <p class="card-description">{card.description}</p>
              <p class="card-rule">{card.rule}</p>
              {#if card.attackBonus !== undefined}
                <div class="card-stats">
                  <span>Attack: +{card.attackBonus}</span>
                  {#if card.damage !== undefined}
                    <span>Damage: {card.damage}</span>
                  {/if}
                </div>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    </div>

    <div class="modal-footer">
      <button
        class="done-button"
        onclick={onClose}
        disabled={!isSelectionComplete}
        data-testid="done-power-selection"
      >
        Done
      </button>
    </div>
  </div>
</div>

<style>
  .power-card-selection {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .modal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
  }

  .modal-content {
    position: relative;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border-radius: 12px;
    padding: 1.5rem;
    max-width: 90vw;
    max-height: 90vh;
    overflow-y: auto;
    color: #fff;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 1rem;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
  }

  .close-button {
    background: none;
    border: none;
    color: #fff;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.5rem;
    line-height: 1;
  }

  .close-button:hover {
    color: #ffd700;
  }

  .selection-status {
    text-align: center;
    margin-bottom: 1rem;
    padding: 0.5rem;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.1);
  }

  .status-complete {
    color: #4caf50;
    font-weight: bold;
  }

  .status-incomplete {
    color: #ffa726;
  }

  .card-sections {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .card-section h3 {
    margin: 0 0 0.75rem 0;
    font-size: 1.1rem;
    color: #ffd700;
  }

  .pick-progress {
    font-weight: normal;
    color: #ffa726;
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.75rem;
  }

  .power-card {
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid transparent;
    border-radius: 8px;
    padding: 0.75rem;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #fff;
  }

  .power-card:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-2px);
  }

  .power-card.selected {
    border-color: #ffd700;
    background: rgba(255, 215, 0, 0.2);
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
  }

  .power-card.custom-ability {
    border-color: #9c27b0;
    background: rgba(156, 39, 176, 0.2);
    cursor: default;
  }

  .power-card.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
  }

  .card-name {
    font-weight: bold;
    font-size: 0.9rem;
  }

  .card-type {
    font-size: 0.7rem;
    color: #aaa;
    text-transform: uppercase;
  }

  .card-description {
    font-size: 0.75rem;
    color: #ccc;
    margin: 0 0 0.5rem 0;
    font-style: italic;
  }

  .card-rule {
    font-size: 0.75rem;
    margin: 0;
    white-space: pre-line;
    line-height: 1.4;
  }

  .card-stats {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    gap: 1rem;
    font-size: 0.8rem;
    color: #ffd700;
  }

  .modal-footer {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    text-align: center;
  }

  .done-button {
    padding: 0.75rem 2rem;
    font-size: 1rem;
    font-weight: bold;
    background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
    color: #1a1a2e;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .done-button:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
  }

  .done-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #666;
  }
</style>
