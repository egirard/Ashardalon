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

  // Preview panel state – which card is shown in the detail panel
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

  // Smart one-line stat summary for mini-cards: "+8 D2", "rng +6 D1", "+4 D1×2"
  // "ranged" is detected by "within N tile(s)" in the rule (e.g. "within 1 tile of you")
  // "twice" is detected by "attack ... twice" in the rule (e.g. "Attack one adjacent Monster twice")
  function getStatSummary(card: PowerCard): string {
    if (card.attackBonus === undefined) return '';
    const dmg = card.damage ?? 1;
    const ranged = /within \d+ tiles?/i.test(card.rule);
    const twice = /attack.*twice/i.test(card.rule);
    return `${ranged ? 'rng ' : ''}+${card.attackBonus} D${dmg}${twice ? '×2' : ''}`;
  }

  function handleCardPreview(card: PowerCard, type: 'utility' | 'atWill' | 'daily') {
    previewCard = previewCard?.card.id === card.id ? null : { card, type };
  }

  function toggleCardSelection(cardId: number, type: 'utility' | 'atWill' | 'daily') {
    if (type === 'utility') {
      store.dispatch(selectUtilityCard({ heroId: hero.id, cardId }));
    } else if (type === 'atWill') {
      store.dispatch(toggleAtWillCard({ heroId: hero.id, cardId }));
    } else if (type === 'daily') {
      store.dispatch(selectDailyCard({ heroId: hero.id, cardId }));
    }
  }

  function isCardSelected(cardId: number, type: 'utility' | 'atWill' | 'daily'): boolean {
    if (type === 'utility') return selection.utility === cardId;
    if (type === 'atWill') return selection.atWills.includes(cardId);
    if (type === 'daily') return selection.daily === cardId;
    return false;
  }

  function isPreviewCardSelected(): boolean {
    return previewCard ? isCardSelected(previewCard.card.id, previewCard.type) : false;
  }
</script>

<div class="power-card-selection" data-testid="power-card-selection" data-edge={edge}>
  <div class="modal-content" style="transform: rotate({getEdgeRotation(edge)}deg);">
    <div class="modal-header">
      <h2>Select Power Cards for {hero.name}</h2>
      <button class="close-button" onclick={onClose} data-testid="close-power-selection">×</button>
    </div>

    <div class="card-layout">
      <!-- Two-column card list: Col 1 = Custom+Utility, Col 2 = At-Will+Daily -->
      <div class="card-columns-area">

        <!-- Column 1: Custom Ability + Utility -->
        <div class="card-col">
          {#if customAbility}
            <div class="section-label">Custom</div>
            <div class="mini-card custom-ability" data-testid="custom-ability-card">
              <input type="checkbox" class="card-checkbox" checked disabled aria-label="Custom ability (auto-selected)" />
              <span class="card-name">{customAbility.name}</span>
            </div>
          {/if}

          <div class="section-label">Utility (1)</div>
          {#each utilityCards as card (card.id)}
            <div
              class="mini-card"
              class:selected={isCardSelected(card.id, 'utility')}
              class:previewing={previewCard?.card.id === card.id}
              style="--cc: {getPowerCardColor(card.type)};"
              data-testid="utility-card-{card.id}"
            >
              <input
                type="checkbox"
                class="card-checkbox"
                checked={isCardSelected(card.id, 'utility')}
                onchange={() => toggleCardSelection(card.id, 'utility')}
                aria-label="Select {card.name}"
              />
              <button
                class="card-info-btn"
                onclick={() => handleCardPreview(card, 'utility')}
                aria-label="Details: {card.name}"
              >
                <span class="card-name">{card.name}</span>
                {#if getStatSummary(card)}<span class="card-stat">{getStatSummary(card)}</span>{/if}
              </button>
            </div>
          {/each}
        </div>

        <!-- Column 2: At-Will + Daily -->
        <div class="card-col">
          <div class="section-label">At-Will ({selection.atWills.length}/2)</div>
          {#each atWillCards as card (card.id)}
            <div
              class="mini-card"
              class:selected={isCardSelected(card.id, 'atWill')}
              class:previewing={previewCard?.card.id === card.id}
              style="--cc: {getPowerCardColor(card.type)};"
              data-testid="atwill-card-{card.id}"
            >
              <input
                type="checkbox"
                class="card-checkbox"
                checked={isCardSelected(card.id, 'atWill')}
                onchange={() => toggleCardSelection(card.id, 'atWill')}
                aria-label="Select {card.name}"
              />
              <button
                class="card-info-btn"
                onclick={() => handleCardPreview(card, 'atWill')}
                aria-label="Details: {card.name}"
              >
                <span class="card-name">{card.name}</span>
                {#if getStatSummary(card)}<span class="card-stat">{getStatSummary(card)}</span>{/if}
              </button>
            </div>
          {/each}

          <div class="section-label">Daily (1)</div>
          {#each dailyCards as card (card.id)}
            <div
              class="mini-card"
              class:selected={isCardSelected(card.id, 'daily')}
              class:previewing={previewCard?.card.id === card.id}
              style="--cc: {getPowerCardColor(card.type)};"
              data-testid="daily-card-{card.id}"
            >
              <input
                type="checkbox"
                class="card-checkbox"
                checked={isCardSelected(card.id, 'daily')}
                onchange={() => toggleCardSelection(card.id, 'daily')}
                aria-label="Select {card.name}"
              />
              <button
                class="card-info-btn"
                onclick={() => handleCardPreview(card, 'daily')}
                aria-label="Details: {card.name}"
              >
                <span class="card-name">{card.name}</span>
                {#if getStatSummary(card)}<span class="card-stat">{getStatSummary(card)}</span>{/if}
              </button>
            </div>
          {/each}
        </div>
      </div>

      <!-- Right: Detail panel shown when a card info button is clicked -->
      {#if previewCard}
        {@const pc = previewCard}
        <div class="power-detail-panel" data-testid="power-detail-panel">
          <div class="detail-header">
            <span
              class="detail-type-badge"
              style="background-color: {getPowerCardColor(pc.card.type)}33; border-color: {getPowerCardColor(pc.card.type)}; color: {getPowerCardColor(pc.card.type)};"
            >
              {pc.card.type} Power
            </span>
            <strong class="detail-name" data-testid="detail-card-name">{pc.card.name}</strong>
          </div>

          {#if pc.card.attackBonus !== undefined}
            <div class="detail-stats">
              <span class="stat-item"><strong>Attack:</strong> +{pc.card.attackBonus}</span>
              <span class="stat-item"><strong>Damage:</strong> {pc.card.damage ?? 1}</span>
            </div>
          {/if}

          <p class="detail-description" data-testid="detail-card-description">{pc.card.description}</p>

          <div class="detail-rule" data-testid="detail-card-rule">
            <strong>Rule:</strong> {pc.card.rule}
          </div>

          <label class="detail-checkbox-label" data-testid="detail-select-button">
            <input
              type="checkbox"
              class="detail-checkbox"
              checked={isPreviewCardSelected()}
              onchange={() => toggleCardSelection(pc.card.id, pc.type)}
            />
            <span class="detail-checkbox-text">
              {isPreviewCardSelected() ? 'Deselect Power' : 'Select Power'}
            </span>
          </label>
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
    padding: 0.75rem 1rem;
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
    margin-bottom: 0.4rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 0.4rem;
    flex-shrink: 0;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 0.9rem;
  }

  .close-button {
    background: none;
    border: none;
    color: #fff;
    font-size: 1.4rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    line-height: 1;
  }

  .close-button:hover {
    color: #ffd700;
  }

  .card-layout {
    display: flex;
    flex-direction: row;
    gap: 0.6rem;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  /* Two-column area: each column ~135px */
  .card-columns-area {
    display: flex;
    flex-direction: row;
    gap: 0.4rem;
    max-height: 100%;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 215, 0, 0.4) transparent;
  }

  .card-columns-area::-webkit-scrollbar {
    width: 4px;
  }

  .card-columns-area::-webkit-scrollbar-thumb {
    background: rgba(255, 215, 0, 0.4);
    border-radius: 2px;
  }

  .card-col {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    width: 135px;
    flex-shrink: 0;
  }

  .section-label {
    font-size: 0.6rem;
    color: #ffd700;
    font-weight: bold;
    text-transform: uppercase;
    white-space: nowrap;
    margin-top: 0.35rem;
    margin-bottom: 0.05rem;
  }

  .card-col > .section-label:first-child {
    margin-top: 0;
  }

  /* Mini-card row: [checkbox] [info button] */
  .mini-card {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.2rem;
    padding: 0.2rem 0.3rem;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid var(--cc, #555);
    border-radius: 3px;
  }

  .mini-card.selected {
    border-color: #ffd700 !important;
    background: rgba(255, 215, 0, 0.12);
  }

  .mini-card.previewing {
    border-width: 2px;
    background: rgba(255, 255, 255, 0.08);
  }

  .mini-card.custom-ability {
    border-color: #9c27b0;
    background: rgba(156, 39, 176, 0.12);
  }

  /* Checkbox – small, accent-colored */
  .card-checkbox {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
    cursor: pointer;
    accent-color: #ffd700;
    margin: 0;
  }

  /* Button that opens the detail panel on click */
  .card-info-btn {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    text-align: left;
    padding: 0;
    flex: 1;
    min-width: 0;
    font-family: inherit;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
  }

  .card-info-btn:hover {
    color: #ffd700;
  }

  .card-name {
    font-size: 0.65rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
    line-height: 1.25;
    font-weight: 500;
  }

  .card-stat {
    font-size: 0.55rem;
    color: rgba(255, 255, 255, 0.55);
    line-height: 1.15;
    font-family: monospace;
    white-space: nowrap;
  }

  .card-info-btn:hover .card-stat {
    color: #ffd700;
  }

  /* ── Detail / preview panel ─────────────────────────────── */
  .power-detail-panel {
    width: 220px;
    flex-shrink: 0;
    background: rgba(0, 0, 0, 0.45);
    border: 1px solid rgba(255, 215, 0, 0.3);
    border-radius: 8px;
    padding: 0.7rem;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    font-size: 0.7rem;
    color: #ddd;
    overflow-y: auto;
    max-height: 100%;
    animation: panel-fade-in 0.15s ease-out;
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
    gap: 0.25rem;
  }

  .detail-type-badge {
    display: inline-block;
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    font-size: 0.55rem;
    font-weight: bold;
    text-transform: uppercase;
    width: fit-content;
    border: 1px solid;
  }

  .detail-name {
    font-size: 0.82rem;
    color: #fff;
    line-height: 1.3;
  }

  .detail-stats {
    display: flex;
    gap: 0.75rem;
    padding: 0.3rem 0.45rem;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 4px;
  }

  .stat-item {
    font-size: 0.62rem;
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
    font-size: 0.67rem;
  }

  .detail-rule {
    line-height: 1.45;
    padding: 0.4rem 0.45rem;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 4px;
    border-left: 3px solid #ffd700;
    font-size: 0.67rem;
    white-space: pre-line;
  }

  .detail-rule strong {
    color: #ffd700;
  }

  /* Checkbox row at the bottom of the detail panel */
  .detail-checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    margin-top: auto;
    cursor: pointer;
    padding: 0.38rem 0.5rem;
    border-radius: 4px;
    border: 1px solid rgba(255, 215, 0, 0.4);
    background: rgba(0, 0, 0, 0.3);
    transition: background 0.2s;
    user-select: none;
  }

  .detail-checkbox-label:hover {
    background: rgba(255, 215, 0, 0.1);
  }

  .detail-checkbox {
    width: 14px;
    height: 14px;
    accent-color: #ffd700;
    cursor: pointer;
    margin: 0;
    flex-shrink: 0;
  }

  .detail-checkbox-text {
    font-size: 0.65rem;
    font-weight: bold;
    text-transform: uppercase;
    color: #fff;
  }

  /* Respect user's reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    .power-detail-panel {
      animation: none;
    }
  }
</style>

