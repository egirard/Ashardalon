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
  
  // Track which card is expanded for preview
  let expandedCardId: number | null = $state(null);
  let expandedCardType: 'utility' | 'atWill' | 'daily' | null = $state(null);

  // Check if selection is complete
  const isSelectionComplete = $derived(
    selection.utility !== null &&
    selection.atWills.length === 2 &&
    selection.daily !== null
  );

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
    // If clicking the same card that's expanded, select it
    if (expandedCardId === card.id && expandedCardType === type) {
      selectCard(card.id, type);
      expandedCardId = null;
      expandedCardType = null;
    } else {
      // Otherwise, expand it for preview
      expandedCardId = card.id;
      expandedCardType = type;
    }
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

  function canSelectAtWill(cardId: number): boolean {
    return selection.atWills.includes(cardId) || selection.atWills.length < 2;
  }

  function isCardExpanded(cardId: number): boolean {
    return expandedCardId === cardId;
  }

  function getExpandedCard(): { card: PowerCard; type: 'utility' | 'atWill' | 'daily' } | null {
    if (!expandedCardId || !expandedCardType) return null;
    
    let card: PowerCard | null = null;
    if (expandedCardType === 'utility') {
      card = utilityCards.find(c => c.id === expandedCardId) || null;
    } else if (expandedCardType === 'atWill') {
      card = atWillCards.find(c => c.id === expandedCardId) || null;
    } else if (expandedCardType === 'daily') {
      card = dailyCards.find(c => c.id === expandedCardId) || null;
    }
    
    return card ? { card, type: expandedCardType } : null;
  }
</script>

<div class="power-card-selection" data-testid="power-card-selection" data-edge={edge}>
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
              class:expanded={isCardExpanded(card.id)}
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
              class:expanded={isCardExpanded(card.id)}
              class:disabled={!canSelectAtWill(card.id)}
              style="border-color: {getPowerCardColor(card.type)};"
              onclick={() => handleCardClick(card, 'atWill')}
              disabled={!canSelectAtWill(card.id)}
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
              class:expanded={isCardExpanded(card.id)}
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

      <!-- Right column: Expanded card view + Done button -->
      <div class="expanded-card-column">
        {#if getExpandedCard()}
          {@const { card, type } = getExpandedCard()!}
          <div class="expanded-card" data-testid="expanded-card">
            <div class="expanded-header">
              <span class="card-type-badge large" style="background-color: {getPowerCardColor(card.type)};">
                {card.type}
              </span>
              <h3 class="expanded-card-name">{card.name}</h3>
            </div>
            
            <p class="expanded-description">{card.description}</p>
            <p class="expanded-rule">{card.rule}</p>
            
            {#if card.attackBonus !== undefined}
              <div class="expanded-stats">
                <span class="stat-item"><strong>Attack:</strong> +{card.attackBonus}</span>
                {#if card.damage !== undefined}
                  <span class="stat-item"><strong>Damage:</strong> {card.damage}</span>
                {/if}
              </div>
            {/if}

            <button
              class="select-button"
              onclick={() => selectCard(card.id, type)}
              data-testid="select-expanded-card"
            >
              {#if type === 'utility' && isUtilitySelected(card.id)}
                Selected
              {:else if type === 'atWill' && isAtWillSelected(card.id)}
                Selected
              {:else if type === 'daily' && isDailySelected(card.id)}
                Selected
              {:else}
                Select This Card
              {/if}
            </button>
          </div>
        {:else}
          <div class="no-selection">
            <p>Tap a card to preview</p>
            <p class="hint">Tap again to select</p>
          </div>
        {/if}

        <!-- Done button moved here -->
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
    pointer-events: none;
  }

  /* Position modal at the appropriate edge based on player position */
  .power-card-selection[data-edge="bottom"] {
    justify-content: center;
    align-items: flex-end;
  }

  .power-card-selection[data-edge="top"] {
    justify-content: center;
    align-items: flex-start;
  }

  .power-card-selection[data-edge="left"] {
    justify-content: flex-start;
    align-items: center;
  }

  .power-card-selection[data-edge="right"] {
    justify-content: flex-end;
    align-items: center;
  }

  .modal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.3);
    pointer-events: auto;
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

  /* Edge-specific spacing to keep modal away from edge zone */
  .power-card-selection[data-edge="bottom"] .modal-content {
    margin-bottom: 1rem;
  }

  .power-card-selection[data-edge="top"] .modal-content {
    margin-top: 1rem;
  }

  .power-card-selection[data-edge="left"] .modal-content {
    margin-left: 1rem;
  }

  .power-card-selection[data-edge="right"] .modal-content {
    margin-right: 1rem;
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
    gap: 0.75rem;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  /* Left: Mini cards organized in columns by section */
  .mini-cards-columns {
    display: flex;
    gap: 0.5rem;
    flex: 0 0 auto;
    max-height: 100%;
    overflow-x: auto;
    overflow-y: hidden;
  }

  .card-column {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    min-width: 160px;
    flex-shrink: 0;
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

  /* Right column: Expanded card view + Done button */
  .expanded-card-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-height: 0;
  }

  .expanded-card {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    background: rgba(0, 0, 0, 0.3);
    border: 2px solid rgba(255, 215, 0, 0.3);
    border-radius: 8px;
    padding: 0.75rem;
    max-height: 300px;
    overflow-y: auto;
  }

  .expanded-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .card-type-badge.large {
    font-size: 0.7rem;
    padding: 0.3rem 0.5rem;
    text-transform: uppercase;
  }

  .expanded-card-name {
    margin: 0;
    font-size: 0.95rem;
    font-weight: bold;
  }

  .expanded-description {
    font-size: 0.75rem;
    color: #ccc;
    margin: 0;
    font-style: italic;
    line-height: 1.3;
  }

  .expanded-rule {
    font-size: 0.75rem;
    margin: 0;
    white-space: pre-line;
    line-height: 1.4;
  }

  .expanded-stats {
    display: flex;
    gap: 0.75rem;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 0.75rem;
    color: #ffd700;
  }

  .stat-item strong {
    color: #fff;
  }

  .select-button {
    padding: 0.6rem 1rem;
    font-size: 0.85rem;
    font-weight: bold;
    background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
    color: #1a1a2e;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .select-button:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
  }

  .no-selection {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: #999;
    font-size: 0.85rem;
    text-align: center;
    gap: 0.5rem;
  }

  .no-selection p {
    margin: 0;
  }

  .no-selection .hint {
    font-size: 0.75rem;
    color: #666;
  }

  .done-button {
    padding: 0.6rem 1.5rem;
    font-size: 0.9rem;
    font-weight: bold;
    background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
    color: #1a1a2e;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    width: 100%;
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
