<script lang="ts">
  import type { HeroPowerCards, PowerCard } from '../store/powerCards';
  import { getPowerCardById } from '../store/powerCards';
  import { XIcon, TargetIcon } from './icons';
  import type { GameState } from '../store/gameSlice';
  import type { MonsterState, Position } from '../store/types';
  import { MONSTERS } from '../store/types';
  import { getPowerCardHighlightState, getPowerCardIneligibilityReason } from '../store/powerCardEligibility';
  import CardDetailView, { type CardDetail } from './CardDetailView.svelte';

  // Blade Barrier card ID constant
  const BLADE_BARRIER_CARD_ID = 5;

  export interface PendingBladeBarrierState {
    heroId: string;
    cardId: number;
    step: 'tile-selection' | 'square-selection';
    selectedSquares?: Position[];
  }

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
    bladeBarrierState?: PendingBladeBarrierState | null;
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
  
  // State for expanded Blade Barrier card (shows control panel before activation)
  let expandedBladeBarrierCardId: number | null = $state(null);
  
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
   * For Blade Barrier: Shows the control panel inline on first click with description and "Activate" button.
   * For attack cards: Shows detail view and expands inline to show monster selection.
   * For other cards: Shows detail view with activation button.
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
    const isBladeBarrier = cardId === BLADE_BARRIER_CARD_ID;
    
    // If Blade Barrier is already in selection mode, don't toggle anything
    if (isBladeBarrier && bladeBarrierState) {
      return;
    }
    
    // If Blade Barrier and eligible, show inline control panel instead of detail view
    if (isBladeBarrier && highlightState === 'eligible') {
      // Toggle expanded state
      if (expandedBladeBarrierCardId === cardId) {
        expandedBladeBarrierCardId = null;
      } else {
        expandedBladeBarrierCardId = cardId;
        // Close detail view and attack expansion if open
        selectedCardDetail = null;
        expandedAttackCardId = null;
      }
      return;
    }
    
    // For non-Blade Barrier cards, use existing behavior
    // If clicking the same card, dismiss the detail view
    if (selectedCardDetail?.type === 'power' && (selectedCardDetail.card as PowerCard).id === cardId) {
      selectedCardDetail = null;
      // Also collapse attack card expansion if expanded
      if (expandedAttackCardId === cardId) {
        expandedAttackCardId = null;
      }
      return;
    }
    
    // Close Blade Barrier expansion if opening detail view
    expandedBladeBarrierCardId = null;
    
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
   * Handle activating a non-attack power card (utility, custom ability, Blade Barrier)
   * This is called from a button in the detail view or inline control panel
   */
  function handleActivatePowerCard(cardId: number) {
    if (onActivatePowerCard) {
      onActivatePowerCard(cardId);
      // For Blade Barrier, keep the inline panel open (it will show selection UI)
      // For other cards, dismiss detail view
      if (cardId !== BLADE_BARRIER_CARD_ID) {
        selectedCardDetail = null;
      } else {
        // Blade Barrier activation - don't close the expansion, just hide the control panel
        // The selection UI will appear in its place
        expandedBladeBarrierCardId = null;
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

  // Handle cancel - call parent handler
  function handleCancelBladeBarrier() {
    if (onCancelBladeBarrier) {
      onCancelBladeBarrier();
    }
  }

  // Handle confirm - call parent handler
  function handleConfirmBladeBarrier() {
    if (onConfirmBladeBarrier) {
      onConfirmBladeBarrier();
    }
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
      {@const isBladeBarrier = card.id === BLADE_BARRIER_CARD_ID}
      {@const isBladeBarrierExpanded = expandedBladeBarrierCardId === card.id}
      {@const isBladeBarrierInSelection = bladeBarrierState && bladeBarrierState.cardId === card.id}
      
      <div 
        class="power-card-wrapper"
        class:expanded={isExpanded || isBladeBarrierExpanded || isBladeBarrierInSelection}
      >
        <button 
          class="power-card-mini"
          class:eligible={highlightState === 'eligible'}
          class:ineligible={highlightState === 'ineligible'}
          class:disabled={highlightState === 'disabled'}
          class:expanded={isExpanded || isBladeBarrierExpanded || isBladeBarrierInSelection}
          class:selected={selectedCardDetail?.type === 'power' && (selectedCardDetail.card as PowerCard).id === card.id}
          title="{card.name} ({card.type}){ineligibilityReason ? ` - ${ineligibilityReason}` : ''}\n\n{card.description}\n\n{card.rule}"
          style="border-color: {getPowerCardColor(card.type)};"
          onclick={() => handlePowerCardClick(card.id, highlightState, card, isFlipped, ineligibilityReason)}
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
        
        <!-- Blade Barrier Control Panel (shown on first click, before activation) -->
        {#if isBladeBarrierExpanded && isBladeBarrier && !bladeBarrierState}
          <div class="blade-barrier-control-panel" data-testid="blade-barrier-control-panel">
            <div class="blade-barrier-description">
              {card.description}
            </div>
            <div class="blade-barrier-rule">
              {card.rule}
            </div>
            <button 
              class="activate-blade-barrier-btn"
              onclick={() => handleActivatePowerCard(card.id)}
              data-testid="activate-blade-barrier-button"
            >
              Activate
            </button>
          </div>
        {/if}
        
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
        
        <!-- Expanded Blade Barrier card view -->
        {#if bladeBarrierState && bladeBarrierState.cardId === card.id && card.id === BLADE_BARRIER_CARD_ID}
          <div class="blade-barrier-expanded" data-testid="blade-barrier-expanded">
            <div class="blade-barrier-rule">
              {card.rule}
            </div>
            
            {#if bladeBarrierState.step === 'tile-selection'}
              <div class="selection-section">
                <div class="selection-header">
                  <span>Select Tile</span>
                </div>
                <div class="selection-instruction">
                  Click a highlighted tile within 2 tiles of your position
                </div>
                <button 
                  class="cancel-btn"
                  onclick={handleCancelBladeBarrier}
                  data-testid="cancel-selection-button"
                >
                  Cancel
                </button>
              </div>
            {:else if bladeBarrierState.step === 'square-selection'}
              <div class="selection-section">
                <div class="selection-header">
                  <span>Select Squares</span>
                </div>
                <div class="selection-instruction">
                  Click 5 different squares on the tile
                </div>
                <div class="progress-display" data-testid="progress-counter">
                  {bladeBarrierState.selectedSquares?.length || 0} / 5
                </div>
                {#if (bladeBarrierState.selectedSquares?.length || 0) === 5}
                  <button 
                    class="confirm-btn"
                    onclick={handleConfirmBladeBarrier}
                    data-testid="confirm-placement-button"
                    type="button"
                  >
                    Confirm Placement
                  </button>
                {/if}
                <button 
                  class="cancel-btn"
                  onclick={handleCancelBladeBarrier}
                  data-testid="cancel-selection-button"
                >
                  Cancel
                </button>
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

  /* Blade Barrier Control Panel styles (shown before activation) */
  .blade-barrier-control-panel {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.4rem;
    background: rgba(123, 31, 162, 0.3);
    border-radius: 4px;
    font-size: 0.6rem;
    color: #ddd;
    border: 1px solid #bb86fc;
  }

  .blade-barrier-description {
    font-size: 0.55rem;
    color: #ddd;
    line-height: 1.3;
    padding-bottom: 0.3rem;
    border-bottom: 1px solid rgba(187, 134, 252, 0.3);
  }

  .activate-blade-barrier-btn {
    padding: 0.6rem;
    background: linear-gradient(135deg, #7b1fa2 0%, #9c27b0 100%);
    border: 2px solid #bb86fc;
    border-radius: 4px;
    color: #fff;
    font-size: 0.65rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
    width: 100%;
    text-align: center;
    text-transform: uppercase;
  }

  .activate-blade-barrier-btn:hover {
    background: linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%);
    border-color: #ce93d8;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(123, 31, 162, 0.6);
  }

  .activate-blade-barrier-btn:active {
    transform: translateY(0);
  }

  /* Blade Barrier expanded view styles (shown during selection) */
  .blade-barrier-expanded {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.4rem;
    background: rgba(123, 31, 162, 0.3);
    border-radius: 4px;
    font-size: 0.6rem;
    color: #ddd;
    border: 1px solid #bb86fc;
  }

  .blade-barrier-rule {
    font-size: 0.55rem;
    color: #bbb;
    font-style: italic;
    line-height: 1.3;
    padding-bottom: 0.3rem;
    border-bottom: 1px solid rgba(187, 134, 252, 0.3);
  }

  .selection-section {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .selection-instruction {
    font-size: 0.55rem;
    color: #bbb;
    line-height: 1.3;
  }

  .progress-display {
    font-size: 0.75rem;
    font-weight: bold;
    color: #bb86fc;
    text-align: center;
    padding: 0.4rem;
    background: rgba(123, 31, 162, 0.4);
    border-radius: 4px;
  }

  .confirm-btn {
    padding: 0.5rem;
    background: linear-gradient(135deg, #7b1fa2 0%, #9c27b0 100%);
    border: 2px solid #bb86fc;
    border-radius: 4px;
    color: #fff;
    font-size: 0.6rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
    width: 100%;
    text-align: center;
  }

  .confirm-btn:hover {
    background: linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%);
    border-color: #ce93d8;
    transform: translateY(-1px);
  }

  .confirm-btn:active {
    transform: translateY(0);
  }

  .cancel-btn {
    padding: 0.4rem;
    background: rgba(100, 100, 100, 0.3);
    border: 1px solid #666;
    border-radius: 4px;
    color: #999;
    font-size: 0.55rem;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
    width: 100%;
    text-align: center;
  }

  .cancel-btn:hover {
    background: rgba(150, 150, 150, 0.3);
    border-color: #888;
    color: #ccc;
  }

  .cancel-btn:active {
    transform: translateY(0);
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
