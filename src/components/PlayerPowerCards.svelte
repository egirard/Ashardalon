<script lang="ts">
  import type { HeroPowerCards, PowerCard } from '../store/powerCards';
  import { getPowerCardById } from '../store/powerCards';
  import { XIcon } from './icons';

  interface Props {
    heroPowerCards?: HeroPowerCards;
    /** Board position for orientation (top, bottom, left, right) */
    boardPosition?: 'top' | 'bottom' | 'left' | 'right';
  }

  let { heroPowerCards, boardPosition = 'bottom' }: Props = $props();

  // Get power cards for display
  let powerCards = $derived.by(() => {
    if (!heroPowerCards) return [];
    
    const cards: { card: PowerCard; isFlipped: boolean }[] = [];
    
    // Add custom ability
    const customAbility = getPowerCardById(heroPowerCards.customAbility);
    if (customAbility) {
      const state = heroPowerCards.cardStates.find(s => s.cardId === customAbility.id);
      cards.push({ card: customAbility, isFlipped: state?.isFlipped ?? false });
    }
    
    // Add utility
    const utility = getPowerCardById(heroPowerCards.utility);
    if (utility) {
      const state = heroPowerCards.cardStates.find(s => s.cardId === utility.id);
      cards.push({ card: utility, isFlipped: state?.isFlipped ?? false });
    }
    
    // Add at-wills
    for (const atWillId of heroPowerCards.atWills) {
      const atWill = getPowerCardById(atWillId);
      if (atWill) {
        const state = heroPowerCards.cardStates.find(s => s.cardId === atWill.id);
        cards.push({ card: atWill, isFlipped: state?.isFlipped ?? false });
      }
    }
    
    // Add daily
    const daily = getPowerCardById(heroPowerCards.daily);
    if (daily) {
      const state = heroPowerCards.cardStates.find(s => s.cardId === daily.id);
      cards.push({ card: daily, isFlipped: state?.isFlipped ?? false });
    }
    
    // Add level 2 daily if present
    if (heroPowerCards.dailyLevel2) {
      const dailyL2 = getPowerCardById(heroPowerCards.dailyLevel2);
      if (dailyL2) {
        const state = heroPowerCards.cardStates.find(s => s.cardId === dailyL2.id);
        cards.push({ card: dailyL2, isFlipped: state?.isFlipped ?? false });
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
</script>

{#if powerCards.length > 0}
  <div 
    class="player-power-cards"
    class:position-top={boardPosition === 'top'}
    class:position-left={boardPosition === 'left'}
    class:position-right={boardPosition === 'right'}
    data-testid="player-power-cards"
  >
    {#each powerCards as { card, isFlipped } (card.id)}
      <div 
        class="power-card-mini"
        class:flipped={isFlipped}
        title="{card.name} ({card.type})"
        style="border-color: {getPowerCardColor(card.type)};"
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
      </div>
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

  /* Orientation for different board positions */
  .player-power-cards.position-top {
    transform: rotate(180deg);
    transform-origin: center;
    will-change: transform;
  }

  .player-power-cards.position-left {
    transform: rotate(90deg);
    transform-origin: center;
    will-change: transform;
  }

  .player-power-cards.position-right {
    transform: rotate(-90deg);
    transform-origin: center;
    will-change: transform;
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
    transition: opacity 0.2s ease;
  }

  .power-card-mini.flipped {
    opacity: 0.4;
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

  .flipped-indicator {
    color: #e53935;
    font-weight: bold;
    flex-shrink: 0;
  }
</style>
