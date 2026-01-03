<script lang="ts">
  import type { HeroPowerCards, PowerCard } from '../store/powerCards';
  import { getPowerCardById } from '../store/powerCards';
  import { XIcon, TargetIcon } from './icons';
  import type { GameState } from '../store/gameSlice';
  import type { MonsterState, Position } from '../store/types';
  import { MONSTERS } from '../store/types';
  import { getPowerCardHighlightState, getPowerCardIneligibilityReason } from '../store/powerCardEligibility';
  import CardDetailView, { type CardDetail, type BladeBarrierSelectionState } from './CardDetailView.svelte';

  interface Props {
    heroPowerCards?: HeroPowerCards;
    /** Board position for orientation (top, bottom, left, right) */
    boardPosition?: 'top' | 'bottom' | 'left' | 'right';
    /** Game state for checking card eligibility */
    gameState?: GameState;
    /** Callback when a power card is clicked */
    onActivatePowerCard?: (cardId: number) => void;
    /** 
     * Targetable monsters for attack powers.
     * Should only be provided for the active hero during hero phase.
     * Used to populate monster selection UI when attack cards are expanded.
     */
    targetableMonsters?: MonsterState[];
    /** 
     * Callback when attacking with a card.
     * Should only be provided for the active hero.
     * Integrates with existing handleAttackWithCard flow in GameBoard.
     */
    onAttackWithCard?: (cardId: number, targetInstanceId: string) => void;
    /**
     * Blade Barrier selection state (if active)
     */
    bladeBarrierState?: {
      heroId: string;
      cardId: number;
      step: 'tile-selection' | 'square-selection';
      selectedSquares?: Position[];
    } | null;
    /**
     * Callbacks for Blade Barrier actions
     */
    onCancelBladeBarrier?: () => void;
    onConfirmBladeBarrier?: () => void;
  }

  let { 
    heroPowerCards, 
    boardPosition = 'bottom', 
    gameState, 
    onActivatePowerCard,
    targetableMonsters = [],
    onAttackWithCard,
    bladeBarrierState = null,
    onCancelBladeBarrier,
    onConfirmBladeBarrier
  }: Props = $props();

  // State for expanded attack card
  let expandedAttackCardId: number | null = $state(null);
  
  // State for selected card to show in detail view
  let selectedCardDetail: CardDetail | null = $state(null);

  // Get power cards for display with highlight state
  let powerCards = $derived.by(() => {
    if (!heroPowerCards) return [];
    
    const cards: { 
      card: PowerCard; 
      isFlipped: boolean;
      highlightState: 'eligible' | 'ineligible' | 'disabled';
      ineligibilityReason: string;
    }[] = [];
    
    // Add custom ability
    const customAbility = getPowerCardById(heroPowerCards.customAbility);
    if (customAbility) {
      const state = heroPowerCards.cardStates.find(s => s.cardId === customAbility.id);
      const isFlipped = state?.isFlipped ?? false;
      const highlightState = gameState 
        ? getPowerCardHighlightState(customAbility, isFlipped, gameState, heroPowerCards.heroId, targetableMonsters)
        : 'ineligible';
      const ineligibilityReason = gameState && highlightState !== 'eligible'
        ? getPowerCardIneligibilityReason(customAbility, isFlipped, gameState, heroPowerCards.heroId, targetableMonsters)
        : '';
      cards.push({ card: customAbility, isFlipped, highlightState, ineligibilityReason });
    }
    
    // Add utility
    const utility = getPowerCardById(heroPowerCards.utility);
    if (utility) {
      const state = heroPowerCards.cardStates.find(s => s.cardId === utility.id);
      const isFlipped = state?.isFlipped ?? false;
      const highlightState = gameState 
        ? getPowerCardHighlightState(utility, isFlipped, gameState, heroPowerCards.heroId, targetableMonsters)
        : 'ineligible';
      const ineligibilityReason = gameState && highlightState !== 'eligible'
        ? getPowerCardIneligibilityReason(utility, isFlipped, gameState, heroPowerCards.heroId, targetableMonsters)
        : '';
      cards.push({ card: utility, isFlipped, highlightState, ineligibilityReason });
    }
    
    // Add at-wills
    for (const atWillId of heroPowerCards.atWills) {
      const atWill = getPowerCardById(atWillId);
      if (atWill) {
        const state = heroPowerCards.cardStates.find(s => s.cardId === atWill.id);
        const isFlipped = state?.isFlipped ?? false;
        const highlightState = gameState 
          ? getPowerCardHighlightState(atWill, isFlipped, gameState, heroPowerCards.heroId, targetableMonsters)
          : 'ineligible';
        const ineligibilityReason = gameState && highlightState !== 'eligible'
          ? getPowerCardIneligibilityReason(atWill, isFlipped, gameState, heroPowerCards.heroId, targetableMonsters)
          : '';
        cards.push({ card: atWill, isFlipped, highlightState, ineligibilityReason });
      }
    }
    
    // Add daily
    const daily = getPowerCardById(heroPowerCards.daily);
    if (daily) {
      const state = heroPowerCards.cardStates.find(s => s.cardId === daily.id);
      const isFlipped = state?.isFlipped ?? false;
      const highlightState = gameState 
        ? getPowerCardHighlightState(daily, isFlipped, gameState, heroPowerCards.heroId, targetableMonsters)
        : 'ineligible';
      const ineligibilityReason = gameState && highlightState !== 'eligible'
        ? getPowerCardIneligibilityReason(daily, isFlipped, gameState, heroPowerCards.heroId, targetableMonsters)
        : '';
      cards.push({ card: daily, isFlipped, highlightState, ineligibilityReason });
    }
    
    // Add level 2 daily if present
    if (heroPowerCards.dailyLevel2) {
      const dailyL2 = getPowerCardById(heroPowerCards.dailyLevel2);
      if (dailyL2) {
        const state = heroPowerCards.cardStates.find(s => s.cardId === dailyL2.id);
        const isFlipped = state?.isFlipped ?? false;
        const highlightState = gameState 
          ? getPowerCardHighlightState(dailyL2, isFlipped, gameState, heroPowerCards.heroId, targetableMonsters)
          : 'ineligible';
        const ineligibilityReason = gameState && highlightState !== 'eligible'
          ? getPowerCardIneligibilityReason(dailyL2, isFlipped, gameState, heroPowerCards.heroId, targetableMonsters)
          : '';
        cards.push({ card: dailyL2, isFlipped, highlightState, ineligibilityReason });
      }
    }
    
    return cards;
  });

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

  // Get aria label for power card based on type and state
  function getAriaLabel(card: PowerCard, highlightState: string, ineligibilityReason: string): string {
    if (card.attackBonus !== undefined) {
      return `${card.name} - Click to expand and select target`;
    }
    if (highlightState === 'eligible') {
      return `${card.name} - Click to activate`;
    }
    return `${card.name} - ${ineligibilityReason || 'Not available'}`;
  }

  // Get monster name by ID
  function getMonsterName(monsterId: string): string {
    const monster = MONSTERS.find(m => m.id === monsterId);
    return monster?.name || 'Unknown';
  }

  /**
   * Handle power card click
   * 
   * Shows the card detail view on click.
   * Attack cards also expand inline to show monster selection.
   * Utility and custom ability cards can be activated from the detail view or double-click.
   * 
   * @param cardId - The ID of the power card
   * @param highlightState - Current state: 'eligible', 'ineligible', or 'disabled'
   * @param card - The power card object
   * @param isFlipped - Whether the card is flipped/used
   * @param ineligibilityReason - Reason why card is not eligible
   */
  function handlePowerCardClick(
    cardId: number, 
    highlightState: string, 
    card: PowerCard, 
    isFlipped: boolean,
    ineligibilityReason: string
  ) {
    // If clicking the same card, dismiss the detail view
    if (selectedCardDetail?.type === 'power' && (selectedCardDetail.card as PowerCard).id === cardId) {
      selectedCardDetail = null;
      // Also collapse attack card expansion if expanded
      if (expandedAttackCardId === cardId) {
        expandedAttackCardId = null;
      }
      return;
    }
    
    // Show detail view for this power card
    selectedCardDetail = {
      type: 'power',
      card: card,
      isFlipped: isFlipped,
      isClickable: highlightState === 'eligible',
      ineligibilityReason: highlightState !== 'eligible' ? ineligibilityReason : undefined
    };
    
    // For attack cards, also expand to show monster selection if eligible
    if (card.attackBonus !== undefined && highlightState === 'eligible') {
      expandedAttackCardId = cardId;
    }
  }
  
  /**
   * Handle activating a non-attack power card (utility, custom ability)
   * This is called on double-click or from a button in the detail view
   */
  function handleActivatePowerCard(cardId: number) {
    if (onActivatePowerCard) {
      onActivatePowerCard(cardId);
      // Keep detail view open for Blade Barrier (card ID 5) since it needs selection UI
      // For other cards, dismiss the detail view immediately
      if (cardId !== 5) {
        selectedCardDetail = null;
      }
    }
  }

  // Handle selecting a monster target for attack
  function handleSelectMonsterTarget(cardId: number, targetInstanceId: string) {
    if (onAttackWithCard) {
      onAttackWithCard(cardId, targetInstanceId);
      // Collapse after attacking and dismiss detail view
      expandedAttackCardId = null;
      selectedCardDetail = null;
    }
  }

  // Handle dismissing the card detail view
  function handleDismissDetail() {
    selectedCardDetail = null;
    // Keep attack card expansion if it was expanded
  }

  // Compute the blade barrier state for the currently selected card
  let bladeBarrierSelectionState = $derived.by(() => {
    if (!bladeBarrierState) return null;
    if (!selectedCardDetail || selectedCardDetail.type !== 'power') return null;
    
    const selectedCard = selectedCardDetail.card as PowerCard;
    if (selectedCard.id !== bladeBarrierState.cardId) return null;
    
    // This card is the active Blade Barrier card
    return {
      step: bladeBarrierState.step,
      selectedSquaresCount: bladeBarrierState.selectedSquares?.length || 0,
      totalSquaresNeeded: 5
    } as BladeBarrierSelectionState;
  });

  // Handle cancel - dismiss detail view and call parent handler
  function handleCancelBladeBarrier() {
    if (onCancelBladeBarrier) {
      onCancelBladeBarrier();
    }
    // Dismiss the detail view when canceling
    selectedCardDetail = null;
  }

  // Handle confirm - call parent handler and dismiss detail view
  function handleConfirmBladeBarrier() {
    if (onConfirmBladeBarrier) {
      onConfirmBladeBarrier();
    }
    // Dismiss the detail view when confirming
    selectedCardDetail = null;
  }

</script>

{#if powerCards.length > 0}
  <div 
    class="player-power-cards"
    class:position-top={boardPosition === 'top'}
    class:position-left={boardPosition === 'left'}
    class:position-right={boardPosition === 'right'}
    data-testid="player-power-cards"
  >
    {#each powerCards as { card, isFlipped, highlightState, ineligibilityReason } (card.id)}
      {@const isExpanded = expandedAttackCardId === card.id}
      {@const isAttackCard = card.attackBonus !== undefined}
      
      <div 
        class="power-card-wrapper"
        class:expanded={isExpanded}
      >
        <button 
          class="power-card-mini"
          class:eligible={highlightState === 'eligible'}
          class:ineligible={highlightState === 'ineligible'}
          class:disabled={highlightState === 'disabled'}
          class:expanded={isExpanded}
          class:selected={selectedCardDetail?.type === 'power' && (selectedCardDetail.card as PowerCard).id === card.id}
          title="{card.name} ({card.type}){ineligibilityReason ? ` - ${ineligibilityReason}` : ''}\n\n{card.description}\n\n{card.rule}"
          style="border-color: {getPowerCardColor(card.type)};"
          onclick={() => handlePowerCardClick(card.id, highlightState, card, isFlipped, ineligibilityReason)}
          ondblclick={highlightState === 'eligible' && !isAttackCard ? () => handleActivatePowerCard(card.id) : undefined}
          data-testid="power-card-{card.id}"
          aria-label={getAriaLabel(card, highlightState, ineligibilityReason)}
        >
          <span class="power-type" style="background-color: {getPowerCardColor(card.type)};">
            {getPowerCardAbbrev(card.type)}
          </span>
          <span class="power-name">{card.name}</span>
          {#if isFlipped}
            <span class="flipped-indicator">
              <XIcon size={14} ariaLabel="Used" />
            </span>
          {/if}
        </button>
        
        <!-- Expanded attack card view -->
        {#if isExpanded && isAttackCard}
          <div class="attack-card-expanded" data-testid="attack-card-expanded-{card.id}">
            <div class="attack-stats">
              <span class="stat-item">
                <strong>Bonus:</strong> +{card.attackBonus}
              </span>
              <span class="stat-item">
                <strong>Damage:</strong> {card.damage || 1}
              </span>
            </div>
            <div class="attack-rule">
              {card.rule}
            </div>
            
            <!-- Monster selection -->
            {#if targetableMonsters.length > 0}
              <div class="monster-selection">
                <div class="selection-header">
                  <TargetIcon size={12} ariaLabel="Target" />
                  <span>Select Target:</span>
                </div>
                <div class="monster-buttons">
                  {#each targetableMonsters as monster (monster.instanceId)}
                    <button 
                      class="monster-target-btn"
                      onclick={() => handleSelectMonsterTarget(card.id, monster.instanceId)}
                      data-testid="attack-target-{monster.instanceId}"
                    >
                      <TargetIcon size={10} ariaLabel="Attack" />
                      {getMonsterName(monster.monsterId)}
                      <span class="monster-hp">HP: {monster.hp}</span>
                    </button>
                  {/each}
                </div>
              </div>
            {:else}
              <div class="no-targets">
                No valid targets in range
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
    
    <!-- Card Detail View (shows enlarged card details) -->
    {#if selectedCardDetail}
      <CardDetailView 
        detail={selectedCardDetail}
        onDismiss={handleDismissDetail}
        onActivate={selectedCardDetail.type === 'power' && selectedCardDetail.isClickable 
          ? () => handleActivatePowerCard((selectedCardDetail.card as PowerCard).id)
          : undefined}
        bladeBarrierState={bladeBarrierSelectionState}
        onCancelBladeBarrier={handleCancelBladeBarrier}
        onConfirmBladeBarrier={handleConfirmBladeBarrier}
      />
    {/if}
  </div>
{/if}

<style>
  .player-power-cards {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0.5rem;
    border-radius: 6px;
    background: rgba(30, 30, 50, 0.95);
    border: 2px solid rgba(100, 100, 130, 0.5);
    min-width: 140px;
    max-width: 200px;
    max-height: 400px; /* Prevent vertical overflow */
    overflow-y: auto; /* Enable scrolling when content exceeds max height */
    transition: all 0.3s ease-out;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    /* Improve scrollbar appearance */
    scrollbar-width: thin;
    scrollbar-color: rgba(100, 100, 130, 0.8) rgba(30, 30, 50, 0.5);
  }

  /* Webkit scrollbar styling for Chrome/Safari */
  .player-power-cards::-webkit-scrollbar {
    width: 6px;
  }

  .player-power-cards::-webkit-scrollbar-track {
    background: rgba(30, 30, 50, 0.5);
    border-radius: 3px;
  }

  .player-power-cards::-webkit-scrollbar-thumb {
    background: rgba(100, 100, 130, 0.8);
    border-radius: 3px;
  }

  .player-power-cards::-webkit-scrollbar-thumb:hover {
    background: rgba(120, 120, 150, 0.9);
  }

  /* Orientation is now handled by the parent container in GameBoard */

  .power-card-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    transition: all 0.3s ease;
  }

  .power-card-wrapper.expanded {
    background: rgba(40, 40, 60, 0.95);
    border-radius: 4px;
    padding: 0.3rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  }

  .power-card-mini {
    display: flex;
    align-items: center;
    gap: 0.15rem;
    padding: 0.15rem 0.3rem;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid;
    border-radius: 3px;
    font-size: 0.55rem;
    width: 100%;
    overflow: hidden;
    transition: all 0.2s ease;
    cursor: default;
    text-align: left;
    font-family: inherit;
    color: inherit;
  }

  .power-card-mini.expanded {
    border-width: 2px;
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.6);
    border-color: #ffd700 !important;
  }

  .power-card-mini.selected {
    border-width: 2px;
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.6);
    border-color: #ffd700 !important;
  }

  /* Eligible state - can be activated */
  .power-card-mini.eligible {
    cursor: pointer;
    background: rgba(46, 125, 50, 0.3);
    border-color: #4caf50;
    border-width: 2px;
    box-shadow: 0 0 8px rgba(76, 175, 80, 0.5);
    animation: pulse-glow 2s ease-in-out infinite;
  }

  .power-card-mini.eligible:hover {
    background: rgba(46, 125, 50, 0.5);
    border-color: #66bb6a;
    transform: translateY(-2px);
    box-shadow: 0 0 12px rgba(76, 175, 80, 0.7);
  }

  .power-card-mini.eligible:active {
    transform: translateY(0);
  }

  /* Ineligible state - cannot be activated right now */
  .power-card-mini.ineligible {
    opacity: 0.5;
    cursor: pointer; /* Allow clicking to see why it's not available */
  }

  /* Disabled state - already used/flipped */
  .power-card-mini.disabled {
    opacity: 0.4;
    cursor: pointer; /* Allow clicking to see details */
  }

  .power-type {
    font-size: 0.5rem;
    font-weight: bold;
    color: #fff;
    padding: 0.15rem 0.25rem;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .power-name {
    color: #ddd;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }

  .power-card-mini.eligible .power-name {
    color: #fff;
    font-weight: 600;
  }

  .flipped-indicator {
    color: #e53935;
    font-weight: bold;
    flex-shrink: 0;
  }

  /* Expanded attack card styles */
  .attack-card-expanded {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.4rem;
    background: rgba(0, 0, 0, 0.6);
    border-radius: 4px;
    font-size: 0.6rem;
    color: #ddd;
    border: 1px solid rgba(255, 215, 0, 0.3);
  }

  .attack-stats {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  .stat-item {
    color: #ffd700;
    font-size: 0.65rem;
  }

  .stat-item strong {
    color: #fff;
  }

  .attack-rule {
    font-size: 0.55rem;
    color: #bbb;
    font-style: italic;
    line-height: 1.3;
  }

  .monster-selection {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .selection-header {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.6rem;
    color: #ffd700;
    font-weight: bold;
  }

  .monster-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .monster-target-btn {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.3rem 0.4rem;
    background: rgba(255, 69, 0, 0.3);
    border: 1px solid #ff4500;
    border-radius: 3px;
    color: #fff;
    font-size: 0.55rem;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
    width: 100%;
    text-align: left;
  }

  .monster-target-btn:hover {
    background: rgba(255, 69, 0, 0.5);
    border-color: #ff6347;
    transform: translateX(2px);
  }

  .monster-target-btn:active {
    transform: translateX(0);
  }

  .monster-hp {
    margin-left: auto;
    font-size: 0.5rem;
    color: #ff6347;
  }

  .no-targets {
    padding: 0.4rem;
    text-align: center;
    color: #999;
    font-size: 0.55rem;
    font-style: italic;
  }

  /* Pulse animation for eligible cards */
  @keyframes pulse-glow {
    0%, 100% {
      box-shadow: 0 0 8px rgba(76, 175, 80, 0.5);
      border-color: #4caf50;
    }
    50% {
      box-shadow: 0 0 16px rgba(76, 175, 80, 0.8);
      border-color: #66bb6a;
    }
  }

  /* Respect user's reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    .power-card-mini.eligible {
      animation: none;
    }
    .power-card-mini {
      transition: none;
    }
  }

  /* Focus visible for keyboard navigation */
  .power-card-mini:focus-visible {
    outline: 2px solid #ffd700;
    outline-offset: 2px;
  }
</style>
