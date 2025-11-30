<script lang="ts">
  import type { MonsterState } from '../store/types';
  import { MONSTERS } from '../store/types';
  import type { PowerCard, HeroPowerCards, PowerCardState } from '../store/powerCards';
  import { getPowerCardById } from '../store/powerCards';
  
  interface Props {
    heroPowerCards: HeroPowerCards;
    adjacentMonsters: MonsterState[];
    onAttackWithCard: (cardId: number, targetInstanceId: string) => void;
  }
  
  let { heroPowerCards, adjacentMonsters, onAttackWithCard }: Props = $props();
  
  // State for selected card
  let selectedCardId: number | null = $state(null);
  
  // Get all available (unflipped) attack power cards
  const availableAttackCards = $derived(() => {
    const cards: { card: PowerCard; state: PowerCardState }[] = [];
    
    for (const cardState of heroPowerCards.cardStates) {
      // Skip flipped cards
      if (cardState.isFlipped) continue;
      
      const card = getPowerCardById(cardState.cardId);
      if (!card) continue;
      
      // Only include cards that have attack capabilities (attackBonus defined)
      if (card.attackBonus !== undefined) {
        cards.push({ card, state: cardState });
      }
    }
    
    return cards;
  });
  
  function getMonsterName(monsterId: string): string {
    const monster = MONSTERS.find(m => m.id === monsterId);
    return monster?.name || 'Unknown';
  }
  
  function handleCardSelect(cardId: number) {
    selectedCardId = selectedCardId === cardId ? null : cardId;
  }
  
  function handleAttack(targetInstanceId: string) {
    if (selectedCardId !== null) {
      onAttackWithCard(selectedCardId, targetInstanceId);
      selectedCardId = null;
    }
  }
  
  function getCardTypeLabel(type: string): string {
    switch (type) {
      case 'at-will': return 'At-Will';
      case 'daily': return 'Daily';
      case 'utility': return 'Utility';
      default: return type;
    }
  }
  
  function getCardTypeClass(type: string): string {
    switch (type) {
      case 'at-will': return 'card-atwill';
      case 'daily': return 'card-daily';
      case 'utility': return 'card-utility';
      default: return '';
    }
  }
</script>

{#if adjacentMonsters.length > 0 && availableAttackCards().length > 0}
  <div class="power-card-attack-panel" data-testid="power-card-attack-panel">
    <div class="panel-header">
      <span class="panel-title">Select Attack Power</span>
    </div>
    
    <!-- Power Card Selection -->
    <div class="card-list" data-testid="attack-card-list">
      {#each availableAttackCards() as { card, state } (card.id)}
        <button
          class="power-card-option {getCardTypeClass(card.type)}"
          class:selected={selectedCardId === card.id}
          onclick={() => handleCardSelect(card.id)}
          data-testid="attack-card-{card.id}"
          data-card-type={card.type}
        >
          <div class="card-header">
            <span class="card-name">{card.name}</span>
            <span class="card-type-badge">{getCardTypeLabel(card.type)}</span>
          </div>
          <div class="card-stats">
            <span class="attack-bonus">+{card.attackBonus}</span>
            <span class="damage">{card.damage} dmg</span>
          </div>
        </button>
      {/each}
    </div>
    
    <!-- Target Selection (only shown when a card is selected) -->
    {#if selectedCardId !== null}
      {@const selectedCard = getPowerCardById(selectedCardId)}
      <div class="target-selection" data-testid="target-selection">
        <div class="target-header">
          <span>Attack with {selectedCard?.name}</span>
        </div>
        <div class="target-list">
          {#each adjacentMonsters as monster (monster.instanceId)}
            <button 
              class="attack-button"
              onclick={() => handleAttack(monster.instanceId)}
              data-testid="attack-target-{monster.instanceId}"
              aria-label="Attack {getMonsterName(monster.monsterId)} with {selectedCard?.name}"
            >
              Attack {getMonsterName(monster.monsterId)}
            </button>
          {/each}
        </div>
      </div>
    {:else}
      <div class="select-card-hint" data-testid="select-card-hint">
        Select a power card above to attack
      </div>
    {/if}
  </div>
{/if}

<style>
  .power-card-attack-panel {
    background: rgba(26, 26, 46, 0.95);
    border: 2px solid #ffd700;
    border-radius: 8px;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-width: 320px;
  }
  
  .panel-header {
    border-bottom: 1px solid rgba(255, 215, 0, 0.3);
    padding-bottom: 0.5rem;
  }
  
  .panel-title {
    font-weight: bold;
    color: #ffd700;
    font-size: 0.9rem;
  }
  
  .card-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .power-card-option {
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid transparent;
    border-radius: 6px;
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    color: #fff;
  }
  
  .power-card-option:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }
  
  .power-card-option.selected {
    border-color: #ffd700;
    background: rgba(255, 215, 0, 0.2);
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
  }
  
  .power-card-option.card-atwill {
    border-left: 4px solid #4caf50;
  }
  
  .power-card-option.card-daily {
    border-left: 4px solid #f44336;
  }
  
  .power-card-option.card-utility {
    border-left: 4px solid #2196f3;
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.25rem;
  }
  
  .card-name {
    font-weight: bold;
    font-size: 0.85rem;
  }
  
  .card-type-badge {
    font-size: 0.65rem;
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    text-transform: uppercase;
    font-weight: bold;
  }
  
  .card-atwill .card-type-badge {
    background: rgba(76, 175, 80, 0.3);
    color: #4caf50;
  }
  
  .card-daily .card-type-badge {
    background: rgba(244, 67, 54, 0.3);
    color: #f44336;
  }
  
  .card-utility .card-type-badge {
    background: rgba(33, 150, 243, 0.3);
    color: #2196f3;
  }
  
  .card-stats {
    display: flex;
    gap: 1rem;
    font-size: 0.8rem;
    color: #aaa;
  }
  
  .attack-bonus {
    color: #ffd700;
    font-weight: bold;
  }
  
  .damage {
    color: #e76f51;
  }
  
  .target-selection {
    background: rgba(139, 69, 19, 0.3);
    border: 1px solid #d4a574;
    border-radius: 6px;
    padding: 0.5rem;
  }
  
  .target-header {
    font-size: 0.8rem;
    color: #d4a574;
    margin-bottom: 0.5rem;
    font-weight: bold;
  }
  
  .target-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .attack-button {
    padding: 0.6rem 1rem;
    font-size: 0.85rem;
    background: linear-gradient(145deg, #8b4513 0%, #654321 100%);
    color: #fff;
    border: 2px solid #d4a574;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease-out;
    min-height: 40px;
    font-weight: bold;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
  }
  
  .attack-button:hover {
    background: linear-gradient(145deg, #a0522d 0%, #8b4513 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }
  
  .attack-button:active {
    transform: translateY(0);
    box-shadow: none;
  }
  
  .select-card-hint {
    text-align: center;
    color: #888;
    font-size: 0.8rem;
    font-style: italic;
    padding: 0.5rem;
  }
</style>
