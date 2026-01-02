<script lang="ts">
  import type { PowerCard } from '../store/powerCards';
  import { getPowerCardById } from '../store/powerCards';
  import type { MonsterState } from '../store/types';
  import type { MultiAttackState, PendingMoveAttackState } from '../store/gameSlice';
  import { MONSTERS } from '../store/types';
  import { parseActionCard } from '../store/actionCardParser';
  import { XIcon } from './icons';

  interface Props {
    cardId: number;
    availableTargets: MonsterState[];
    onAttackWithCard: (cardId: number, targetInstanceId: string) => void;
    onDismiss: () => void;
    multiAttackState?: MultiAttackState | null;
    pendingMoveAttack?: PendingMoveAttackState | null;
    onCancelMultiAttack?: () => void;
  }

  let { cardId, availableTargets, onAttackWithCard, onDismiss, multiAttackState, pendingMoveAttack, onCancelMultiAttack }: Props = $props();

  const card = $derived(getPowerCardById(cardId));
  const parsed = $derived(card ? parseActionCard(card) : null);

  function getMonsterName(monsterId: string): string {
    const monster = MONSTERS.find(m => m.id === monsterId);
    return monster?.name || 'Unknown';
  }

  function handleAttack(targetInstanceId: string) {
    onAttackWithCard(cardId, targetInstanceId);
  }

  function handleDismiss() {
    onDismiss();
  }
  
  function handleCancelMultiAttack() {
    if (onCancelMultiAttack) {
      onCancelMultiAttack();
    }
  }
</script>

{#if card}
  <div 
    class="attack-card-detail-panel" 
    data-testid="attack-card-detail-panel"
    role="dialog"
    aria-label="Attack card details"
  >
    <div class="detail-header">
      <h3 class="detail-title">{card.name}</h3>
      <button 
        class="close-button" 
        onclick={handleDismiss}
        aria-label="Close details"
      >
        <XIcon size={16} ariaLabel="Close" />
      </button>
    </div>

    <div class="detail-content">
      <div class="card-type-badge power" data-testid="card-type">
        {card.type} Power
      </div>
      
      <div class="power-stats">
        <div class="stat-item">
          <strong>Attack Bonus:</strong> +{card.attackBonus}
        </div>
        <div class="stat-item">
          <strong>Damage:</strong> {card.damage || 1}
        </div>
      </div>

      <div class="description" data-testid="card-description">
        {card.description}
      </div>

      <div class="rule" data-testid="card-rule">
        <strong>Rule:</strong> {card.rule}
      </div>

      {#if multiAttackState}
        <div class="multi-attack-progress" data-testid="multi-attack-progress">
          <strong>Multi-Attack Progress:</strong> Attack {multiAttackState.attacksCompleted + 1} of {multiAttackState.totalAttacks}
        </div>
      {/if}

      {#if availableTargets.length > 0}
        <div class="target-selection" data-testid="target-selection">
          <div class="target-header">
            {#if multiAttackState}
              Attack {multiAttackState.attacksCompleted + 1}/{multiAttackState.totalAttacks}:
            {:else if pendingMoveAttack}
              Charging attack - Select target:
            {:else}
              Select a target to attack:
            {/if}
          </div>
          <div class="target-list">
            {#each availableTargets as monster (monster.instanceId)}
              {@const isValidTarget = !multiAttackState?.sameTarget || 
                                      multiAttackState.targetInstanceId === monster.instanceId ||
                                      multiAttackState.attacksCompleted === 0}
              {#if isValidTarget}
                <button 
                  class="attack-button"
                  onclick={() => handleAttack(monster.instanceId)}
                  data-testid="attack-target-{monster.instanceId}"
                  aria-label="Attack {getMonsterName(monster.monsterId)} with {card.name}"
                >
                  Attack {getMonsterName(monster.monsterId)}
                  {#if parsed?.attack?.attackCount && parsed.attack.attackCount > 1 && parsed.attack.sameTarget}
                    <span class="attack-multiplier">×{parsed.attack.attackCount}</span>
                  {/if}
                </button>
              {/if}
            {/each}
            {#if multiAttackState && onCancelMultiAttack}
              <button 
                class="cancel-button"
                onclick={handleCancelMultiAttack}
                data-testid="cancel-multi-attack"
                aria-label="Cancel remaining attacks"
              >
                Cancel Remaining Attacks
              </button>
            {/if}
          </div>
        </div>
      {:else}
        <div class="no-targets-message">
          No valid targets in range
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .attack-card-detail-panel {
    position: absolute;
    top: 0;
    left: calc(100% + 0.5rem);
    width: 280px;
    max-width: 90vw;
    max-height: 80vh;
    overflow-y: auto;
    background: rgba(20, 20, 35, 0.98);
    border: 2px solid #ffd700;
    border-radius: 8px;
    padding: 0.75rem;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 215, 0, 0.4);
    z-index: 100;
    animation: slide-in 0.2s ease-out;
  }

  @keyframes slide-in {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255, 215, 0, 0.3);
  }

  .detail-title {
    font-size: 1rem;
    color: #ffd700;
    margin: 0;
    font-weight: bold;
  }

  .close-button {
    background: none;
    border: none;
    color: #aaa;
    cursor: pointer;
    padding: 0.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s ease;
  }

  .close-button:hover {
    color: #fff;
  }

  .detail-content {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    font-size: 0.75rem;
    color: #ddd;
  }

  .card-type-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.65rem;
    font-weight: bold;
    text-transform: uppercase;
    width: fit-content;
  }

  .card-type-badge.power {
    background: rgba(46, 125, 50, 0.3);
    border: 1px solid #4caf50;
    color: #4caf50;
  }

  .power-stats {
    display: flex;
    gap: 1rem;
    padding: 0.4rem;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 4px;
  }

  .stat-item {
    font-size: 0.7rem;
    color: #ffd700;
  }

  .stat-item strong {
    color: #fff;
  }

  .description {
    line-height: 1.4;
    font-style: italic;
    color: #bbb;
  }

  .rule {
    line-height: 1.4;
    padding: 0.5rem;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 4px;
    border-left: 3px solid #ffd700;
  }

  .rule strong {
    color: #ffd700;
  }

  .multi-attack-progress {
    padding: 0.5rem;
    background: rgba(255, 152, 0, 0.2);
    border: 1px solid #ff9800;
    border-radius: 4px;
    font-size: 0.75rem;
    color: #ff9800;
    margin-top: 0.5rem;
  }

  .multi-attack-progress strong {
    color: #ffcc80;
  }

  .target-selection {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: rgba(139, 69, 19, 0.3);
    border: 1px solid #d4a574;
    border-radius: 6px;
  }

  .target-header {
    font-size: 0.75rem;
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
    padding: 0.6rem 0.75rem;
    font-size: 0.8rem;
    background: linear-gradient(145deg, #8b4513 0%, #654321 100%);
    color: #fff;
    border: 2px solid #d4a574;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease-out;
    font-weight: bold;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
    text-align: left;
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

  .attack-multiplier {
    font-size: 0.7rem;
    background: rgba(255, 152, 0, 0.3);
    color: #ff9800;
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    margin-left: 0.5rem;
  }

  .cancel-button {
    padding: 0.6rem 0.75rem;
    font-size: 0.8rem;
    background: linear-gradient(145deg, #5a5a5a 0%, #3a3a3a 100%);
    color: #fff;
    border: 2px solid #888;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease-out;
    font-weight: bold;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
    text-align: center;
  }

  .cancel-button:hover {
    background: linear-gradient(145deg, #6a6a6a 0%, #4a4a4a 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }

  .cancel-button:active {
    transform: translateY(0);
    box-shadow: none;
  }

  .no-targets-message {
    text-align: center;
    color: #888;
    font-size: 0.75rem;
    font-style: italic;
    padding: 0.5rem;
  }

  /* Respect user's reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    .attack-card-detail-panel {
      animation: none;
    }
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .attack-card-detail-panel {
      width: 240px;
      font-size: 0.7rem;
    }

    .detail-title {
      font-size: 0.9rem;
    }
  }
</style>
