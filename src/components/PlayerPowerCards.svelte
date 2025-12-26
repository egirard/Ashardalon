<script lang="ts">
  import type { HeroPowerCards, PowerCard } from '../store/powerCards';
  import { getPowerCardById } from '../store/powerCards';
  import { XIcon } from './icons';
  import type { GameState } from '../store/gameSlice';
  import { getPowerCardHighlightState, getPowerCardIneligibilityReason } from '../store/powerCardEligibility';

  interface Props {
    heroPowerCards?: HeroPowerCards;
    /** Board position for orientation (top, bottom, left, right) */
    boardPosition?: 'top' | 'bottom' | 'left' | 'right';
    /** Game state for checking card eligibility */
    gameState?: GameState;
    /** Callback when a power card is clicked */
    onActivatePowerCard?: (cardId: number) => void;
  }

  let { heroPowerCards, boardPosition = 'bottom', gameState, onActivatePowerCard }: Props = $props();

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
        ? getPowerCardHighlightState(customAbility, isFlipped, gameState, heroPowerCards.heroId)
        : 'ineligible';
      const ineligibilityReason = gameState && highlightState !== 'eligible'
        ? getPowerCardIneligibilityReason(customAbility, isFlipped, gameState, heroPowerCards.heroId)
        : '';
      cards.push({ card: customAbility, isFlipped, highlightState, ineligibilityReason });
    }
    
    // Add utility
    const utility = getPowerCardById(heroPowerCards.utility);
    if (utility) {
      const state = heroPowerCards.cardStates.find(s => s.cardId === utility.id);
      const isFlipped = state?.isFlipped ?? false;
      const highlightState = gameState 
        ? getPowerCardHighlightState(utility, isFlipped, gameState, heroPowerCards.heroId)
        : 'ineligible';
      const ineligibilityReason = gameState && highlightState !== 'eligible'
        ? getPowerCardIneligibilityReason(utility, isFlipped, gameState, heroPowerCards.heroId)
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
          ? getPowerCardHighlightState(atWill, isFlipped, gameState, heroPowerCards.heroId)
          : 'ineligible';
        const ineligibilityReason = gameState && highlightState !== 'eligible'
          ? getPowerCardIneligibilityReason(atWill, isFlipped, gameState, heroPowerCards.heroId)
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
        ? getPowerCardHighlightState(daily, isFlipped, gameState, heroPowerCards.heroId)
        : 'ineligible';
      const ineligibilityReason = gameState && highlightState !== 'eligible'
        ? getPowerCardIneligibilityReason(daily, isFlipped, gameState, heroPowerCards.heroId)
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
          ? getPowerCardHighlightState(dailyL2, isFlipped, gameState, heroPowerCards.heroId)
          : 'ineligible';
        const ineligibilityReason = gameState && highlightState !== 'eligible'
          ? getPowerCardIneligibilityReason(dailyL2, isFlipped, gameState, heroPowerCards.heroId)
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
      return `${card.name} - Available - use attack panel to select target`;
    }
    if (highlightState === 'eligible') {
      return `${card.name} - Click to activate`;
    }
    return `${card.name} - ${ineligibilityReason || 'Not available'}`;
  }

  /**
   * Handle power card click
   * 
   * Attack cards are shown as eligible but don't activate from mini cards.
   * They must be used via the PowerCardAttackPanel (Game State Panel).
   * Utility and custom ability cards can be activated directly from the dashboard.
   * 
   * @param cardId - The ID of the power card
   * @param highlightState - Current state: 'eligible', 'ineligible', or 'disabled'
   * @param card - The power card object
   */
  function handlePowerCardClick(cardId: number, highlightState: string, card: PowerCard) {
    // Attack cards are shown as eligible but don't activate from mini cards
    // They must be used via the PowerCardAttackPanel (Game State Panel)
    if (card.attackBonus !== undefined) {
      // Don't activate - just visual indicator
      return;
    }
    
    if (highlightState === 'eligible' && onActivatePowerCard) {
      onActivatePowerCard(cardId);
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
      <button 
        class="power-card-mini"
        class:eligible={highlightState === 'eligible'}
        class:ineligible={highlightState === 'ineligible'}
        class:disabled={highlightState === 'disabled'}
        title="{card.name} ({card.type}){ineligibilityReason ? ` - ${ineligibilityReason}` : ''}\n\n{card.description}\n\n{card.rule}"
        style="border-color: {getPowerCardColor(card.type)};"
        onclick={() => handlePowerCardClick(card.id, highlightState, card)}
        disabled={highlightState !== 'eligible'}
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
    {/each}
  </div>
{/if}

<style>
  .player-power-cards {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0.5rem;
    border-radius: 6px;
    background: rgba(30, 30, 50, 0.95);
    border: 2px solid rgba(100, 100, 130, 0.5);
    min-width: 140px;
    max-width: 200px;
    transition: all 0.3s ease-out;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  /* Orientation is now handled by the parent container in GameBoard */

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
    cursor: not-allowed;
  }

  /* Disabled state - already used/flipped */
  .power-card-mini.disabled {
    opacity: 0.4;
    cursor: not-allowed;
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
