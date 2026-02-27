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

  // Preview panel state - which card is currently shown in the detail panel
  let previewCard: { card: PowerCard; type: 'utility' | 'atWill' | 'daily' } | null = $state(null);

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

  // Click on a mini-card opens the detail/preview panel instead of immediately selecting
  function handleCardPreview(card: PowerCard, type: 'utility' | 'atWill' | 'daily') {
    if (previewCard?.card.id === card.id) {
      previewCard = null; // toggle off if same card clicked again
    } else {
      previewCard = { card, type };
    }
  }

  // Select or deselect the card currently shown in the preview panel
  function handleSelectFromPreview() {
    if (!previewCard) return;
    selectCard(previewCard.card.id, previewCard.type);
  }

  function isPreviewCardSelected(): boolean {
    if (!previewCard) return false;
    const { card, type } = previewCard;
    if (type === 'utility') return isUtilitySelected(card.id);
    if (type === 'atWill') return isAtWillSelected(card.id);
    if (type === 'daily') return isDailySelected(card.id);
    return false;
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

  // Truncate description for the mini-card one-liner
  const SHORT_DESCRIPTION_LIMIT = 48;
  const DEFAULT_DAMAGE = 1;
  function getShortDescription(description: string): string {
    if (description.length <= SHORT_DESCRIPTION_LIMIT) return description;
    return description.substring(0, SHORT_DESCRIPTION_LIMIT - 1) + '…';
  }
</script>

<div class="power-card-selection" data-testid="power-card-selection" data-edge={edge}>
  <div class="modal-content" style="transform: rotate({getEdgeRotation(edge)}deg);">
    <div class="modal-header">
      <h2>Select Power Cards for {hero.name}</h2>
      <button class="close-button" onclick={onClose} data-testid="close-power-selection">×</button>
    </div>

    <div class="card-layout">
      <!-- Left: Compact mini-card list organised by section -->
      <div class="mini-cards-columns">
        <!-- Custom Ability Column -->
        {#if customAbility}
          <div class="card-column">
            <div class="section-label">Custom Ability</div>
            <div class="mini-card custom-ability" data-testid="custom-ability-card">
              <span class="card-type-badge" style="background-color: {getPowerCardColor('utility')};">
                {getPowerCardAbbrev('utility')}
              </span>
              <span class="card-text">
                <span class="card-name-mini">{customAbility.name}</span>
                <span class="card-desc-mini">{getShortDescription(customAbility.description)}</span>
              </span>
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
              class:previewing={previewCard?.card.id === card.id}
              style="border-color: {getPowerCardColor(card.type)};"
              onclick={() => handleCardPreview(card, 'utility')}
              data-testid="utility-card-{card.id}"
            >
              <span class="card-type-badge" style="background-color: {getPowerCardColor(card.type)};">
                {getPowerCardAbbrev(card.type)}
              </span>
              <span class="card-text">
                <span class="card-name-mini">{card.name}</span>
                <span class="card-desc-mini">{getShortDescription(card.description)}</span>
              </span>
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
              class:previewing={previewCard?.card.id === card.id}
              style="border-color: {getPowerCardColor(card.type)};"
              onclick={() => handleCardPreview(card, 'atWill')}
              data-testid="atwill-card-{card.id}"
            >
              <span class="card-type-badge" style="background-color: {getPowerCardColor(card.type)};">
                {getPowerCardAbbrev(card.type)}
              </span>
              <span class="card-text">
                <span class="card-name-mini">{card.name}</span>
                <span class="card-desc-mini">{getShortDescription(card.description)}</span>
              </span>
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
              class:previewing={previewCard?.card.id === card.id}
              style="border-color: {getPowerCardColor(card.type)};"
              onclick={() => handleCardPreview(card, 'daily')}
              data-testid="daily-card-{card.id}"
            >
              <span class="card-type-badge" style="background-color: {getPowerCardColor(card.type)};">
                {getPowerCardAbbrev(card.type)}
              </span>
              <span class="card-text">
                <span class="card-name-mini">{card.name}</span>
                <span class="card-desc-mini">{getShortDescription(card.description)}</span>
              </span>
              {#if isDailySelected(card.id)}
                <CheckIcon size={12} ariaLabel="Selected" />
              {/if}
            </button>
          {/each}
        </div>
      </div>

      <!-- Right: Detail panel shown when a power card is clicked -->
      {#if previewCard}
        <div class="power-detail-panel" data-testid="power-detail-panel">
          <div class="detail-header">
            <span
              class="detail-type-badge"
              style="background-color: {getPowerCardColor(previewCard.card.type)}33; border-color: {getPowerCardColor(previewCard.card.type)}; color: {getPowerCardColor(previewCard.card.type)};"
            >
              {previewCard.card.type} Power
            </span>
            <strong class="detail-name" data-testid="detail-card-name">{previewCard.card.name}</strong>
          </div>

          {#if previewCard.card.attackBonus !== undefined}
            <div class="detail-stats">
              <span class="stat-item"><strong>Attack:</strong> +{previewCard.card.attackBonus}</span>
              <span class="stat-item"><strong>Damage:</strong> {previewCard.card.damage ?? DEFAULT_DAMAGE}</span>
            </div>
          {/if}

          <p class="detail-description" data-testid="detail-card-description">{previewCard.card.description}</p>

          <div class="detail-rule" data-testid="detail-card-rule">
            <strong>Rule:</strong> {previewCard.card.rule}
          </div>

          <button
            class="detail-select-button"
            class:deselect={isPreviewCardSelected()}
            onclick={handleSelectFromPreview}
            data-testid="detail-select-button"
            aria-label="{isPreviewCardSelected() ? 'Deselect' : 'Select'} {previewCard.card.name}"
          >
            {isPreviewCardSelected() ? 'Deselect' : 'Select'} Power
          </button>
        </div>
      {/if}
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
    flex-direction: row;
    gap: 0.75rem;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  /* Compact mini-card list – narrowed to ~50% of the previous width */
  .mini-cards-columns {
    width: 280px;
    flex-shrink: 0;
    max-height: 100%;
    overflow-y: auto;
    padding-right: 0.25rem;
    /* Custom scrollbar styling */
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 215, 0, 0.4) transparent;
  }

  .mini-cards-columns::-webkit-scrollbar {
    width: 4px;
  }

  .mini-cards-columns::-webkit-scrollbar-thumb {
    background: rgba(255, 215, 0, 0.4);
    border-radius: 2px;
  }

  .card-column {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .card-column:last-child {
    margin-bottom: 0;
  }

  .section-label {
    font-size: 0.65rem;
    color: #ffd700;
    font-weight: bold;
    margin-bottom: 0.15rem;
    text-transform: uppercase;
  }

  .mini-card {
    display: flex;
    align-items: flex-start;
    gap: 0.25rem;
    padding: 0.3rem 0.4rem;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid;
    border-radius: 4px;
    font-size: 0.65rem;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #fff;
    text-align: left;
    font-family: inherit;
    width: 100%;
  }

  .mini-card:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.12);
    transform: translateX(2px);
  }

  .mini-card.selected {
    border-width: 2px;
    border-color: #ffd700 !important;
    background: rgba(255, 215, 0, 0.15);
    box-shadow: 0 0 6px rgba(255, 215, 0, 0.35);
  }

  .mini-card.previewing {
    border-width: 2px;
    background: rgba(255, 255, 255, 0.1);
    box-shadow: 0 0 6px rgba(255, 255, 255, 0.3);
  }

  .mini-card.custom-ability {
    border-color: #9c27b0;
    background: rgba(156, 39, 176, 0.15);
    cursor: default;
  }

  .card-type-badge {
    font-size: 0.55rem;
    font-weight: bold;
    color: #fff;
    padding: 0.15rem 0.25rem;
    border-radius: 3px;
    flex-shrink: 0;
    margin-top: 0.1rem;
  }

  /* Wrapper for card name + one-line description */
  .card-text {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    gap: 0.05rem;
  }

  .card-name-mini {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 600;
    line-height: 1.2;
  }

  .card-desc-mini {
    font-size: 0.58rem;
    color: rgba(255, 255, 255, 0.5);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.2;
    font-style: italic;
  }

  .auto-label {
    font-size: 0.55rem;
    color: #9c27b0;
    font-weight: bold;
    flex-shrink: 0;
  }

  /* ── Detail / preview panel ─────────────────────────────── */
  .power-detail-panel {
    width: 260px;
    flex-shrink: 0;
    background: rgba(0, 0, 0, 0.45);
    border: 1px solid rgba(255, 215, 0, 0.3);
    border-radius: 8px;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.72rem;
    color: #ddd;
    overflow-y: auto;
    max-height: 100%;
    animation: panel-fade-in 0.15s ease-out;
    /* Custom scrollbar */
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 215, 0, 0.4) transparent;
  }

  .power-detail-panel::-webkit-scrollbar {
    width: 4px;
  }

  .power-detail-panel::-webkit-scrollbar-thumb {
    background: rgba(255, 215, 0, 0.4);
    border-radius: 2px;
  }

  @keyframes panel-fade-in {
    from { opacity: 0; transform: translateX(6px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  .detail-header {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .detail-type-badge {
    display: inline-block;
    padding: 0.2rem 0.45rem;
    border-radius: 4px;
    font-size: 0.6rem;
    font-weight: bold;
    text-transform: uppercase;
    width: fit-content;
    border: 1px solid;
  }

  .detail-name {
    font-size: 0.85rem;
    color: #fff;
    line-height: 1.3;
  }

  .detail-stats {
    display: flex;
    gap: 0.75rem;
    padding: 0.35rem 0.5rem;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 4px;
  }

  .stat-item {
    font-size: 0.65rem;
    color: #ffd700;
  }

  .stat-item strong {
    color: #fff;
  }

  .detail-description {
    margin: 0;
    line-height: 1.4;
    font-style: italic;
    color: #bbb;
    font-size: 0.7rem;
  }

  .detail-rule {
    line-height: 1.45;
    padding: 0.45rem 0.5rem;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 4px;
    border-left: 3px solid #ffd700;
    font-size: 0.7rem;
    white-space: pre-line;
  }

  .detail-rule strong {
    color: #ffd700;
  }

  .detail-select-button {
    margin-top: auto;
    padding: 0.45rem 0.6rem;
    background: linear-gradient(135deg, #2e7d32 0%, #388e3c 100%);
    border: 2px solid #66bb6a;
    border-radius: 6px;
    color: #fff;
    font-size: 0.7rem;
    font-weight: bold;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
  }

  .detail-select-button:hover {
    background: linear-gradient(135deg, #388e3c 0%, #43a047 100%);
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(46, 125, 50, 0.5);
  }

  .detail-select-button.deselect {
    background: linear-gradient(135deg, #c62828 0%, #d32f2f 100%);
    border-color: #ef5350;
  }

  .detail-select-button.deselect:hover {
    background: linear-gradient(135deg, #d32f2f 0%, #e53935 100%);
    box-shadow: 0 3px 8px rgba(198, 40, 40, 0.5);
  }

  /* Respect user's reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    .power-detail-panel {
      animation: none;
    }
  }
</style>
