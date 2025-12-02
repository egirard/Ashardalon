<script lang="ts">
  import type { MonsterState } from '../store/types';
  import { MONSTERS } from '../store/types';
  import type { PowerCard, HeroPowerCards, PowerCardState } from '../store/powerCards';
  import { getPowerCardById } from '../store/powerCards';
  import { parseActionCard, requiresMultiAttack, requiresMovementFirst, getActionDescription } from '../store/actionCardParser';
  import type { MultiAttackState, PendingMoveAttackState } from '../store/gameSlice';
  
  interface Props {
    heroPowerCards: HeroPowerCards;
    adjacentMonsters: MonsterState[];
    onAttackWithCard: (cardId: number, targetInstanceId: string) => void;
    /** For multi-attack cards, callbacks to manage the sequence */
    multiAttackState?: MultiAttackState | null;
    onStartMultiAttack?: (cardId: number, totalAttacks: number, sameTarget: boolean, maxTargets: number, targetInstanceId?: string) => void;
    /** For move-then-attack cards like Charge */
    pendingMoveAttack?: PendingMoveAttackState | null;
    onStartMoveAttack?: (cardId: number) => void;
    /** Whether hero can currently move (for move-then-attack cards) */
    canMove?: boolean;
  }
  
  let { 
    heroPowerCards, 
    adjacentMonsters, 
    onAttackWithCard,
    multiAttackState = null,
    onStartMultiAttack,
    pendingMoveAttack = null,
    onStartMoveAttack,
    canMove = true,
  }: Props = $props();
  
  // State for selected card
  let selectedCardId: number | null = $state(null);
  
  // Get all available (unflipped) attack power cards
  const availableAttackCards = $derived(() => {
    const cards: { card: PowerCard; state: PowerCardState; parsed: ReturnType<typeof parseActionCard> }[] = [];
    
    for (const cardState of heroPowerCards.cardStates) {
      // Skip flipped cards
      if (cardState.isFlipped) continue;
      
      const card = getPowerCardById(cardState.cardId);
      if (!card) continue;
      
      // Only include cards that have attack capabilities (attackBonus defined)
      if (card.attackBonus !== undefined) {
        const parsed = parseActionCard(card);
        cards.push({ card, state: cardState, parsed });
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
    if (selectedCardId === null) return;
    
    const card = getPowerCardById(selectedCardId);
    if (!card) return;
    
    const parsed = parseActionCard(card);
    
    // Check if this is a move-then-attack card
    if (requiresMovementFirst(parsed) && onStartMoveAttack && !pendingMoveAttack) {
      // Start the move-attack sequence
      onStartMoveAttack(selectedCardId);
      selectedCardId = null;
      return;
    }
    
    // Check if this is a multi-attack card
    if (requiresMultiAttack(parsed) && parsed.attack && onStartMultiAttack) {
      // Start the multi-attack sequence
      onStartMultiAttack(
        selectedCardId,
        parsed.attack.attackCount > 1 ? parsed.attack.attackCount : 1,
        parsed.attack.sameTarget,
        parsed.attack.maxTargets,
        parsed.attack.sameTarget ? targetInstanceId : undefined
      );
      // Execute the first attack
      onAttackWithCard(selectedCardId, targetInstanceId);
      // For same-target attacks (e.g., Reaping Strike), keep the card selected
      // so the player can see which card they're using for subsequent attacks.
      // For multi-target attacks, clear the selection since they need to pick new targets.
      if (!parsed.attack.sameTarget) {
        selectedCardId = null;
      }
      return;
    }
    
    // Standard single attack
    onAttackWithCard(selectedCardId, targetInstanceId);
    selectedCardId = null;
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
  
  function getSpecialBadge(parsed: ReturnType<typeof parseActionCard>): string | null {
    if (requiresMovementFirst(parsed)) return 'Move+Attack';
    if (parsed.attack?.attackCount === 2) return 'x2';
    if (parsed.attack?.attackCount === 4) return 'x4';
    if (parsed.attack?.maxTargets === 2) return '2 targets';
    if (parsed.attack?.maxTargets === -1) return 'All targets';
    return null;
  }
  
  // Check if a card can be used right now
  function canUseCard(cardId: number): boolean {
    const card = getPowerCardById(cardId);
    if (!card) return false;
    
    const parsed = parseActionCard(card);
    
    // Move-then-attack cards need movement ability and no pending move-attack
    if (requiresMovementFirst(parsed)) {
      return canMove && !pendingMoveAttack;
    }
    
    return true;
  }
</script>

{#if adjacentMonsters.length > 0 && availableAttackCards().length > 0}
  <div class="power-card-attack-panel" data-testid="power-card-attack-panel">
    <div class="panel-header">
      {#if multiAttackState}
        <span class="panel-title">Multi-Attack: {multiAttackState.attacksCompleted + 1}/{multiAttackState.totalAttacks}</span>
      {:else if pendingMoveAttack && !pendingMoveAttack.movementCompleted}
        <span class="panel-title">Move First, Then Attack</span>
      {:else}
        <span class="panel-title">Select Attack Power</span>
      {/if}
    </div>
    
    <!-- Multi-attack in progress indicator -->
    {#if multiAttackState}
      {@const multiCard = getPowerCardById(multiAttackState.cardId)}
      <div class="multi-attack-info" data-testid="multi-attack-info">
        <span class="multi-attack-card">{multiCard?.name}</span>
        <span class="multi-attack-progress">
          Attack {multiAttackState.attacksCompleted + 1} of {multiAttackState.totalAttacks}
        </span>
      </div>
    {/if}
    
    <!-- Power Card Selection (hidden during multi-attack) -->
    {#if !multiAttackState}
      <div class="card-list" data-testid="attack-card-list">
        {#each availableAttackCards() as { card, state, parsed } (card.id)}
          {@const specialBadge = getSpecialBadge(parsed)}
          {@const isUsable = canUseCard(card.id)}
          <button
            class="power-card-option {getCardTypeClass(card.type)}"
            class:selected={selectedCardId === card.id}
            class:disabled={!isUsable}
            onclick={() => isUsable && handleCardSelect(card.id)}
            data-testid="attack-card-{card.id}"
            data-card-type={card.type}
            disabled={!isUsable}
          >
            <div class="card-header">
              <span class="card-name">{card.name}</span>
              <div class="card-badges">
                {#if specialBadge}
                  <span class="special-badge" data-testid="special-badge-{card.id}">{specialBadge}</span>
                {/if}
                <span class="card-type-badge">{getCardTypeLabel(card.type)}</span>
              </div>
            </div>
            <div class="card-stats">
              <span class="attack-bonus">+{card.attackBonus}</span>
              <span class="damage">{card.damage} dmg</span>
            </div>
            {#if parsed.attack && (parsed.attack.attackCount > 1 || parsed.attack.maxTargets > 1)}
              <div class="card-effect" data-testid="card-effect-{card.id}">
                {getActionDescription(parsed)}
              </div>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
    
    <!-- Target Selection -->
    {#if selectedCardId !== null || multiAttackState}
      {@const activeCardId = multiAttackState?.cardId ?? selectedCardId}
      {@const selectedCard = activeCardId ? getPowerCardById(activeCardId) : null}
      {@const parsed = selectedCard ? parseActionCard(selectedCard) : null}
      <div class="target-selection" data-testid="target-selection">
        <div class="target-header">
          {#if multiAttackState}
            <span>Attack {multiAttackState.attacksCompleted + 1}/{multiAttackState.totalAttacks} with {selectedCard?.name}</span>
          {:else}
            <span>Attack with {selectedCard?.name}</span>
          {/if}
        </div>
        <div class="target-list">
          {#each adjacentMonsters as monster (monster.instanceId)}
            {@const isValidTarget = !multiAttackState?.sameTarget || 
                                    multiAttackState.targetInstanceId === monster.instanceId ||
                                    multiAttackState.attacksCompleted === 0}
            {#if isValidTarget}
              <button 
                class="attack-button"
                onclick={() => handleAttack(monster.instanceId)}
                data-testid="attack-target-{monster.instanceId}"
                aria-label="Attack {getMonsterName(monster.monsterId)} with {selectedCard?.name}"
              >
                Attack {getMonsterName(monster.monsterId)}
                {#if parsed?.attack?.attackCount && parsed.attack.attackCount > 1 && parsed.attack.sameTarget}
                  <span class="attack-multiplier">×{parsed.attack.attackCount}</span>
                {/if}
              </button>
            {/if}
          {/each}
        </div>
      </div>
    {:else if !multiAttackState}
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
  
  /* Multi-attack indicator */
  .multi-attack-info {
    background: rgba(255, 152, 0, 0.2);
    border: 1px solid #ff9800;
    border-radius: 6px;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .multi-attack-card {
    font-weight: bold;
    color: #ff9800;
    font-size: 0.85rem;
  }
  
  .multi-attack-progress {
    font-size: 0.75rem;
    color: #ffcc80;
  }
  
  /* Card badges container */
  .card-badges {
    display: flex;
    gap: 0.25rem;
    align-items: center;
  }
  
  /* Special badge for multi-attack/move-attack cards */
  .special-badge {
    font-size: 0.6rem;
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    text-transform: uppercase;
    font-weight: bold;
    background: rgba(255, 152, 0, 0.3);
    color: #ff9800;
    border: 1px solid rgba(255, 152, 0, 0.5);
  }
  
  /* Card effect description */
  .card-effect {
    font-size: 0.7rem;
    color: #aaa;
    font-style: italic;
    margin-top: 0.25rem;
    padding-top: 0.25rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  /* Attack multiplier badge on attack button */
  .attack-multiplier {
    font-size: 0.7rem;
    background: rgba(255, 152, 0, 0.3);
    color: #ff9800;
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    margin-left: 0.5rem;
  }
  
  /* Disabled card styling */
  .power-card-option.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .power-card-option.disabled:hover {
    transform: none;
    background: rgba(255, 255, 255, 0.1);
  }
</style>
