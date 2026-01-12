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

  // Power card type colors
  function getPowerCardColor(type: string): string {
    switch (type) {
      case 'at-will': return '#2e7d32'; // Green
      case 'daily': return '#7b1fa2'; // Purple
      case 'utility': return '#1565c0'; // Blue
      default: return '#666';
    }
  }

  // Power card type abbreviation
  function getPowerCardAbbrev(type: string): string {
    switch (type) {
      case 'at-will': return 'AW';
      case 'daily': return 'D';
      case 'utility': return 'U';
      default: return '';
    }
  }

  function handleCardClick(card: PowerCard, type: 'utility' | 'atWill' | 'daily') {
    // Clicking a card now immediately selects it
    selectCard(card.id, type);
  }

  function selectCard(cardId: number, type: 'utility' | 'atWill' | 'daily') {
    if (type === 'utility') {
      store.dispatch(selectUtilityCard({ heroId: hero.id, cardId }));
    } else if (type === 'atWill') {
      store.dispatch(toggleAtWillCard({ heroId: hero.id, cardId }));
    } else if (type === 'daily') {
      store.dispatch(selectDailyCard({ heroId: hero.id, cardId }));
    }
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
</script>

<div class="power-card-selection" data-testid="power-card-selection" data-edge={edge}>
  <div class="modal-content" style="transform: rotate({getEdgeRotation(edge)}deg);">
    <div class="modal-header">
      <h2>Select Power Cards for {hero.name}</h2>
      <button class="close-button" onclick={onClose} data-testid="close-power-selection">×</button>
    </div>

    <div class="card-layout">
      <!-- Left columns: Mini cards organized by section -->
      <div class="mini-cards-columns">
        <!-- Custom Ability Column -->
        {#if customAbility}
          <div class="card-column">
            <div class="section-label">Custom Ability</div>
            <div class="mini-card custom-ability" data-testid="custom-ability-card">
              <span class="card-type-badge" style="background-color: {getPowerCardColor('utility')};">
                {getPowerCardAbbrev('utility')}
              </span>
              <span class="card-name-mini">{customAbility.name}</span>
              <span class="auto-label">AUTO</span>
            </div>
          </div>
        {/if}

        <!-- Utility Cards Column -->
        <div class="card-column">
          <div class="section-label">Utility (Pick 1)</div>
          {#each utilityCards as card (card.id)}
            <button
              class="mini-card"
              class:selected={isUtilitySelected(card.id)}
              style="border-color: {getPowerCardColor(card.type)};"
              onclick={() => handleCardClick(card, 'utility')}
              data-testid="utility-card-{card.id}"
            >
              <span class="card-type-badge" style="background-color: {getPowerCardColor(card.type)};">
                {getPowerCardAbbrev(card.type)}
              </span>
              <span class="card-name-mini">{card.name}</span>
              {#if isUtilitySelected(card.id)}
                <CheckIcon size={12} ariaLabel="Selected" />
              {/if}
            </button>
          {/each}
        </div>

        <!-- At-Will Cards Column -->
        <div class="card-column">
          <div class="section-label">At-Will (Pick 2) - {selection.atWills.length}/2</div>
          {#each atWillCards as card (card.id)}
            <button
              class="mini-card"
              class:selected={isAtWillSelected(card.id)}
              style="border-color: {getPowerCardColor(card.type)};"
              onclick={() => handleCardClick(card, 'atWill')}
              data-testid="atwill-card-{card.id}"
            >
              <span class="card-type-badge" style="background-color: {getPowerCardColor(card.type)};">
                {getPowerCardAbbrev(card.type)}
              </span>
              <span class="card-name-mini">{card.name}</span>
              {#if isAtWillSelected(card.id)}
                <CheckIcon size={12} ariaLabel="Selected" />
              {/if}
            </button>
          {/each}
        </div>

        <!-- Daily Cards Column -->
        <div class="card-column">
          <div class="section-label">Daily (Pick 1)</div>
          {#each dailyCards as card (card.id)}
            <button
              class="mini-card"
              class:selected={isDailySelected(card.id)}
              style="border-color: {getPowerCardColor(card.type)};"
              onclick={() => handleCardClick(card, 'daily')}
              data-testid="daily-card-{card.id}"
            >
              <span class="card-type-badge" style="background-color: {getPowerCardColor(card.type)};">
                {getPowerCardAbbrev(card.type)}
              </span>
              <span class="card-name-mini">{card.name}</span>
              {#if isDailySelected(card.id)}
                <CheckIcon size={12} ariaLabel="Selected" />
              {/if}
            </button>
          {/each}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .power-card-selection {
    position: fixed;
    z-index: 1000;
    display: flex;
    pointer-events: none;
  }

  /* Position panel at the appropriate edge based on player position */
  .power-card-selection[data-edge="bottom"] {
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
  }

  .power-card-selection[data-edge="top"] {
    top: 0;
    left: 50%;
    transform: translateX(-50%);
  }

  .power-card-selection[data-edge="left"] {
    left: 0;
    top: 50%;
    transform: translateY(-50%);
  }

  .power-card-selection[data-edge="right"] {
    right: 0;
    top: 50%;
    transform: translateY(-50%);
  }

  .modal-content {
    position: relative;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border-radius: 12px;
    padding: 1rem;
    width: min(700px, 90vmin);
    max-height: min(85vh, 90vmin);
    color: #fff;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    pointer-events: auto;
    margin: 0.5rem;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 0.5rem;
    flex-shrink: 0;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1rem;
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

  .card-layout {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  /* Mini cards in CSS column layout (single column split in half) */
  .mini-cards-columns {
    column-count: 2;
    column-gap: 0.5rem;
    flex: 1;
    max-height: 100%;
    overflow-y: auto;
    padding-right: 0.5rem;
  }

  .card-column {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    break-inside: avoid;
    page-break-inside: avoid;
    margin-bottom: 0.5rem;
  }

  .card-column:last-child {
    margin-bottom: 0;
  }

  .section-label {
    font-size: 0.7rem;
    color: #ffd700;
    font-weight: bold;
    margin-bottom: 0.2rem;
    text-transform: uppercase;
  }

  .mini-card {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.4rem;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid;
    border-radius: 4px;
    font-size: 0.7rem;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #fff;
    text-align: left;
    font-family: inherit;
  }

  .mini-card:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
    transform: translateX(2px);
  }

  .mini-card.selected {
    border-width: 2px;
    border-color: #ffd700 !important;
    background: rgba(255, 215, 0, 0.2);
    box-shadow: 0 0 8px rgba(255, 215, 0, 0.4);
  }

  .mini-card.expanded {
    border-width: 2px;
    box-shadow: 0 0 8px rgba(255, 215, 0, 0.6);
  }

  .mini-card.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .mini-card.custom-ability {
    border-color: #9c27b0;
    background: rgba(156, 39, 176, 0.2);
    cursor: default;
  }

  .card-type-badge {
    font-size: 0.6rem;
    font-weight: bold;
    color: #fff;
    padding: 0.2rem 0.3rem;
    border-radius: 3px;
    flex-shrink: 0;
  }

  .card-name-mini {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .auto-label {
    font-size: 0.6rem;
    color: #9c27b0;
    font-weight: bold;
  }
</style>
