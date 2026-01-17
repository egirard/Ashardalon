<script lang="ts">
  import type { HeroPowerCards, PowerCard } from '../store/powerCards';
  import { getPowerCardById } from '../store/powerCards';
  import { XIcon, TargetIcon } from './icons';
  import type { GameState } from '../store/gameSlice';
  import type { MonsterState, Position } from '../store/types';
  import { MONSTERS } from '../store/types';
  import { getPowerCardHighlightState, getPowerCardIneligibilityReason } from '../store/powerCardEligibility';
  import PowerCardDetailsPanel from './PowerCardDetailsPanel.svelte';
  import type { PendingFlamingSphereState, PendingMonsterRelocationState } from './PowerCardDetailsPanel.svelte';
  import { parseActionCard, requiresMovementFirst } from '../store/actionCardParser';

  // Card ID constants
  const BLADE_BARRIER_CARD_ID = 5;
  const FLAMING_SPHERE_CARD_ID = 45;

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
    /**
     * Flaming Sphere selection state (if active)
     */
    flamingSphereState?: PendingFlamingSphereState | null;
    /**
     * Callbacks for Flaming Sphere actions
     */
    onCancelFlamingSphere?: () => void;
    onConfirmFlamingSphere?: () => void;
    /**
     * Monster Relocation selection state (if active)
     */
    monsterRelocationState?: PendingMonsterRelocationState | null;
    /**
     * Callback for Monster Relocation cancel
     */
    onCancelMonsterRelocation?: () => void;
    /**
     * Flaming Sphere token info (if active)
     */
    flamingSphereToken?: { id: string; charges: number; position: { x: number; y: number } } | null;
    /**
     * Whether the hero has already moved this turn
     */
    heroHasMoved?: boolean;
    /**
     * Callbacks for Flaming Sphere movement and damage
     */
    onMoveFlamingSphere?: () => void;
    onActivateFlamingSphereDamage?: () => void;
    /**
     * Caged ally info (if there's a caged hero on the same tile)
     */
    cagedAllyInfo?: { heroId: string; heroName: string } | null;
    /**
     * Callback when attempting cage escape
     */
    onAttemptCageEscape?: () => void;
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
    onConfirmBladeBarrier,
    flamingSphereState = null,
    onCancelFlamingSphere,
    onConfirmFlamingSphere,
    monsterRelocationState = null,
    onCancelMonsterRelocation,
    flamingSphereToken = null,
    heroHasMoved = false,
    onMoveFlamingSphere,
    onActivateFlamingSphereDamage,
    cagedAllyInfo = null,
    onAttemptCageEscape
  }: Props = $props();

  // State for expanded attack card
  let expandedAttackCardId: number | null = $state(null);
  
  // State for selected card to show in details panel (replaces inline expansion and CardDetailView)
  let selectedCardForDetailsPanel: PowerCard | null = $state(null);
  
  // State for showing cage escape details panel
  let showCageEscapeDetails: boolean = $state(false);

  // Determine if Flaming Sphere card should be auto-selected
  let shouldAutoSelectFlamingSphere = $derived.by(() => {
    if (!heroPowerCards || !flamingSphereToken) return false;
    
    // Check if Flaming Sphere card is flipped (placed)
    const flamingSphereCardState = heroPowerCards.cardStates.find(s => s.cardId === FLAMING_SPHERE_CARD_ID);
    if (!flamingSphereCardState?.isFlipped) return false;
    
    // Only auto-select if not already showing another card or if showing Flaming Sphere
    if (selectedCardForDetailsPanel && selectedCardForDetailsPanel.id !== FLAMING_SPHERE_CARD_ID) {
      return false;
    }
    
    return true;
  });

  // Auto-open Flaming Sphere card details when token is active
  $effect(() => {
    if (!shouldAutoSelectFlamingSphere || !heroPowerCards) return;
    
    // Find the Flaming Sphere card
    const flamingSphereCard = heroPowerCards.powerCards.find(c => c.id === FLAMING_SPHERE_CARD_ID);
    if (!flamingSphereCard) return;
    
    // Auto-select the Flaming Sphere card
    selectedCardForDetailsPanel = flamingSphereCard;
  });

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

  // Get special badge text for a power card
  function getSpecialBadge(card: PowerCard): string | null {
    const parsed = parseActionCard(card);
    if (requiresMovementFirst(parsed)) return 'Move+Attack';
    if (parsed.attack?.attackCount === 2) return 'X2';
    if (parsed.attack?.attackCount === 4) return 'X4';
    if (parsed.attack?.maxTargets === 2) return '2 targets';
    if (parsed.attack?.maxTargets === -1) return 'All targets';
    return null;
  }

  /**
   * Handle power card click
   * 
   * Shows the Power Card Details Panel to the right of the Power Card Panel.
   * The clicked card remains selected/highlighted in the Power Card Panel.
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
    const isFlamingSphere = cardId === FLAMING_SPHERE_CARD_ID;
    
    // If Blade Barrier is already in selection mode, don't toggle anything
    if (isBladeBarrier && bladeBarrierState) {
      return;
    }
    
    // If Flaming Sphere is already in selection mode, don't toggle anything
    if (isFlamingSphere && flamingSphereState) {
      return;
    }
    
    // If clicking the same card, dismiss the details panel
    if (selectedCardForDetailsPanel && selectedCardForDetailsPanel.id === cardId) {
      selectedCardForDetailsPanel = null;
      // Also collapse attack card expansion if expanded
      if (expandedAttackCardId === cardId) {
        expandedAttackCardId = null;
      }
      return;
    }
    
    // Close cage escape details when opening a power card
    showCageEscapeDetails = false;
    
    // Show details panel for this power card
    selectedCardForDetailsPanel = card;
    
    // For attack cards, also expand to show monster selection if eligible
    if (card.attackBonus !== undefined && highlightState === 'eligible') {
      expandedAttackCardId = cardId;
    } else {
      // Close attack expansion for non-attack cards
      expandedAttackCardId = null;
    }
  }
  
  /**
   * Handle activating a non-attack power card (utility, custom ability, Blade Barrier, Flaming Sphere)
   * This is called from a button in the details panel
   */
  function handleActivatePowerCard(cardId: number) {
    if (onActivatePowerCard) {
      onActivatePowerCard(cardId);
      // For Blade Barrier, Flaming Sphere, and Monster Relocation cards, keep the details panel open (it will show selection UI)
      // For other cards, dismiss details panel
      const COMMAND_CARD_ID = 9;
      const DISTANT_DIVERSION_CARD_ID = 38;
      if (cardId !== BLADE_BARRIER_CARD_ID && 
          cardId !== FLAMING_SPHERE_CARD_ID &&
          cardId !== COMMAND_CARD_ID &&
          cardId !== DISTANT_DIVERSION_CARD_ID) {
        selectedCardForDetailsPanel = null;
      }
    }
  }

  // Handle selecting a monster target for attack
  function handleSelectMonsterTarget(cardId: number, targetInstanceId: string) {
    if (onAttackWithCard) {
      onAttackWithCard(cardId, targetInstanceId);
      // Collapse after attacking and dismiss details panel
      expandedAttackCardId = null;
      selectedCardForDetailsPanel = null;
    }
  }

  // Handle dismissing the details panel
  function handleDismissDetailsPanel() {
    selectedCardForDetailsPanel = null;
    expandedAttackCardId = null;
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

  // Handle Flaming Sphere cancel - call parent handler
  function handleCancelFlamingSphere() {
    if (onCancelFlamingSphere) {
      onCancelFlamingSphere();
    }
  }

  // Handle Flaming Sphere confirm - call parent handler
  function handleConfirmFlamingSphere() {
    if (onConfirmFlamingSphere) {
      onConfirmFlamingSphere();
    }
  }

  // Handle cage escape click - show details panel
  function handleCageEscapeClick() {
    // Toggle details panel
    if (showCageEscapeDetails) {
      showCageEscapeDetails = false;
    } else {
      // Close any open power card details
      selectedCardForDetailsPanel = null;
      expandedAttackCardId = null;
      // Open cage escape details
      showCageEscapeDetails = true;
    }
  }
  
  // Handle cage escape action - execute the escape attempt
  function handleCageEscapeAction() {
    if (onAttemptCageEscape) {
      onAttemptCageEscape();
      // Keep details panel open to see the result
    }
  }

</script>

{#if powerCards.length > 0 || cagedAllyInfo}
  <div class="power-cards-container">
    <div 
      class="player-power-cards"
      class:position-top={boardPosition === 'top'}
      class:position-left={boardPosition === 'left'}
      class:position-right={boardPosition === 'right'}
      data-testid="player-power-cards"
    >
      <!-- Cage Escape Action (shown when ally is caged on same tile) -->
      {#if cagedAllyInfo}
        <button 
          class="power-card-mini special-action"
          class:eligible={true}
          class:selected={showCageEscapeDetails}
          title="Free {cagedAllyInfo.heroName} from cage (Roll 10+ to escape)"
          onclick={handleCageEscapeClick}
          data-testid="cage-escape-action"
          aria-label="Attempt to free {cagedAllyInfo.heroName} from cage"
        >
          <div class="card-header-mini">
            <span class="power-type special-action-type">
              ⛓️
            </span>
            <span class="power-name">Free Ally</span>
          </div>
          <div class="card-stats-mini special-action-detail">
            Roll 10+
          </div>
        </button>
      {/if}

      {#each powerCards as { card, isFlipped, highlightState, ineligibilityReason } (card.id)}
      {@const isExpanded = expandedAttackCardId === card.id}
      {@const isAttackCard = card.attackBonus !== undefined}
      {@const isBladeBarrier = card.id === BLADE_BARRIER_CARD_ID}
      {@const isFlamingSphere = card.id === FLAMING_SPHERE_CARD_ID}
      {@const isBladeBarrierInSelection = bladeBarrierState && bladeBarrierState.cardId === card.id}
      {@const isFlamingSphereInSelection = flamingSphereState && flamingSphereState.cardId === card.id}
      {@const isSelected = selectedCardForDetailsPanel && selectedCardForDetailsPanel.id === card.id}
      {@const specialBadge = getSpecialBadge(card)}
      
      <div 
        class="power-card-wrapper"
        class:expanded={isExpanded || isBladeBarrierInSelection || isFlamingSphereInSelection}
      >
        <button 
          class="power-card-mini"
          class:eligible={highlightState === 'eligible'}
          class:ineligible={highlightState === 'ineligible'}
          class:disabled={highlightState === 'disabled'}
          class:expanded={isExpanded || isBladeBarrierInSelection || isFlamingSphereInSelection}
          class:selected={isSelected}
          title="{card.name} ({card.type}){ineligibilityReason ? ` - ${ineligibilityReason}` : ''}\n\n{card.description}\n\n{card.rule}"
          style="border-color: {getPowerCardColor(card.type)};"
          onclick={() => handlePowerCardClick(card.id, highlightState, card, isFlipped, ineligibilityReason)}
          data-testid="power-card-{card.id}"
          aria-label={getAriaLabel(card, highlightState, ineligibilityReason)}
        >
          <div class="card-header-mini">
            <span class="power-type" style="background-color: {getPowerCardColor(card.type)};">
              {getPowerCardAbbrev(card.type)}
            </span>
            <span class="power-name">{card.name}</span>
            {#if specialBadge}
              <span class="special-badge-mini" data-testid="special-badge-{card.id}">{specialBadge}</span>
            {/if}
            {#if isFlipped}
              <span class="flipped-indicator">
                <XIcon size={14} ariaLabel="Used" />
              </span>
            {/if}
          </div>
          {#if isAttackCard}
            <div class="card-stats-mini">
              <span class="attack-bonus-mini">+{card.attackBonus}</span>
              <span class="damage-mini">{card.damage || 1} dmg</span>
            </div>
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
    </div>
    
    <!-- Power Card Details Panel (shows full card details to the right) -->
    {#if selectedCardForDetailsPanel}
      {@const selectedCardState = heroPowerCards?.cardStates.find(s => s.cardId === selectedCardForDetailsPanel.id)}
      {@const isFlipped = selectedCardState?.isFlipped ?? false}
      {@const highlightState = gameState 
        ? getPowerCardHighlightState(selectedCardForDetailsPanel, isFlipped, gameState, heroPowerCards?.heroId || '', targetableMonsters)
        : 'ineligible'}
      {@const ineligibilityReason = gameState && highlightState !== 'eligible'
        ? getPowerCardIneligibilityReason(selectedCardForDetailsPanel, isFlipped, gameState, heroPowerCards?.heroId || '', targetableMonsters)
        : ''}
      <PowerCardDetailsPanel
        card={selectedCardForDetailsPanel}
        isFlipped={isFlipped}
        isClickable={highlightState === 'eligible'}
        ineligibilityReason={ineligibilityReason}
        bladeBarrierState={bladeBarrierState}
        flamingSphereState={flamingSphereState}
        monsterRelocationState={monsterRelocationState}
        flamingSphereToken={flamingSphereToken}
        heroHasMoved={heroHasMoved}
        onMoveFlamingSphere={onMoveFlamingSphere}
        onActivateFlamingSphereDamage={onActivateFlamingSphereDamage}
        onDismiss={handleDismissDetailsPanel}
        onActivate={() => handleActivatePowerCard(selectedCardForDetailsPanel.id)}
        onCancelBladeBarrier={onCancelBladeBarrier}
        onConfirmBladeBarrier={onConfirmBladeBarrier}
        onCancelFlamingSphere={onCancelFlamingSphere}
        onConfirmFlamingSphere={onConfirmFlamingSphere}
        onCancelMonsterRelocation={onCancelMonsterRelocation}
      />
    {/if}
    
    <!-- Cage Escape Details Panel (shown when cage escape action is selected) -->
    {#if showCageEscapeDetails && cagedAllyInfo}
      <div 
        class="power-card-details-panel cage-escape-details" 
        data-testid="cage-escape-details-panel"
        role="dialog"
        aria-label="Cage escape action details"
      >
        <div class="detail-content">
          <div class="card-type-badge cage-escape-badge">
            Special Action
          </div>
          
          <div class="cage-escape-info">
            <div class="cage-icon-large">⛓️</div>
            <h3>Free Caged Ally</h3>
            <p class="caged-hero-name">{cagedAllyInfo.heroName} is trapped in a cage!</p>
          </div>
          
          <div class="description">
            Your ally is trapped in a cage and cannot move. You can attempt to free them by rolling the dice.
          </div>
          
          <div class="rule">
            <strong>Escape Mechanic:</strong> Roll 1d20. On a result of 10 or higher, the cage curse is removed and your ally is freed.
          </div>
          
          <div class="clickability-info">
            <button 
              class="activate-button compact"
              onclick={handleCageEscapeAction}
              data-testid="attempt-cage-escape-button"
              aria-label="Attempt to free {cagedAllyInfo.heroName} from cage"
            >
              🔓 Attempt Escape (Roll 10+)
            </button>
          </div>
          
          <button 
            class="dismiss-button" 
            onclick={() => showCageEscapeDetails = false}
            data-testid="dismiss-cage-escape-button"
            aria-label="Close details panel"
          >
            <XIcon size={16} ariaLabel="Close" />
          </button>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  /* Container that holds both the power cards list and the details panel */
  .power-cards-container {
    position: relative;
    display: flex;
    gap: 0.5rem;
  }

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
    flex-direction: column;
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

  /* Special action styling for cage escape */
  .power-card-mini.special-action {
    background: rgba(180, 100, 30, 0.3);
    border-color: #d4a574;
  }

  .power-card-mini.special-action.eligible {
    background: rgba(180, 100, 30, 0.4);
    border-color: #ffd700;
    box-shadow: 0 0 8px rgba(212, 165, 116, 0.6);
  }

  .power-card-mini.special-action.eligible:hover {
    background: rgba(200, 120, 50, 0.5);
    border-color: #ffd700;
    box-shadow: 0 0 12px rgba(255, 215, 0, 0.7);
  }

  .special-action-type {
    background: rgba(180, 100, 30, 0.8);
    font-size: 0.6rem;
  }

  .special-action-detail {
    color: #ffd700;
    font-weight: bold;
  }

  /* Cage escape details panel styling */
  .cage-escape-details {
    background: linear-gradient(135deg, rgba(40, 25, 10, 0.98) 0%, rgba(60, 40, 20, 0.98) 100%);
    border-color: rgba(212, 165, 116, 0.8);
  }

  .cage-escape-badge {
    background-color: rgba(180, 100, 30, 0.3);
    border-color: #d4a574;
    color: #d4a574;
  }

  .cage-escape-info {
    text-align: center;
    margin: 1rem 0;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    border: 1px solid rgba(212, 165, 116, 0.3);
  }

  .cage-icon-large {
    font-size: 3rem;
    margin-bottom: 0.5rem;
  }

  .cage-escape-info h3 {
    color: #ffd700;
    font-size: 1.1rem;
    margin: 0.5rem 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .caged-hero-name {
    color: #fff;
    font-size: 0.95rem;
    margin: 0.5rem 0 0 0;
    font-weight: 600;
  }

  .flipped-indicator {
    color: #e53935;
    font-weight: bold;
    flex-shrink: 0;
  }

  /* Card header in mini view */
  .card-header-mini {
    display: flex;
    align-items: center;
    gap: 0.15rem;
    width: 100%;
  }

  /* Special badge in mini view */
  .special-badge-mini {
    font-size: 0.45rem;
    padding: 0.1rem 0.25rem;
    border-radius: 2px;
    text-transform: uppercase;
    font-weight: bold;
    background: rgba(255, 152, 0, 0.3);
    color: #ff9800;
    border: 1px solid rgba(255, 152, 0, 0.5);
    flex-shrink: 0;
    margin-left: auto;
  }

  /* Card stats in mini view */
  .card-stats-mini {
    display: flex;
    gap: 0.5rem;
    font-size: 0.5rem;
    color: #aaa;
    margin-left: 1.5rem; /* Align with card name after type badge */
  }

  .attack-bonus-mini {
    color: #ffd700;
    font-weight: bold;
  }

  .damage-mini {
    color: #e76f51;
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
