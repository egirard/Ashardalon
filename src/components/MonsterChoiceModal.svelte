<script lang="ts">
  import type { MonsterState } from '../store/types';
  import { getMonsterById } from '../store/monsters';
  import { assetPath } from '../utils';

  interface Props {
    monsters: MonsterState[];
    encounterName: string;
    context: string;
    onSelect: (monsterInstanceId: string) => void;
    onCancel: () => void;
    edge?: string;
  }

  const { monsters, encounterName, context, onSelect, onCancel, edge = 'bottom' }: Props = $props();

  function handleSelect(monsterInstanceId: string) {
    onSelect(monsterInstanceId);
  }

  function handleCancel() {
    onCancel();
  }
</script>

<div 
  class="monster-choice-overlay" 
  class:edge-top={edge === 'top'}
  class:edge-bottom={edge === 'bottom'}
  class:edge-left={edge === 'left'}
  class:edge-right={edge === 'right'}
  data-testid="monster-choice-modal"
>
  <div class="monster-choice-card" data-testid="monster-choice-card">
    <div class="monster-choice-header">
      <h2 class="monster-choice-title" data-testid="monster-choice-title">{encounterName}</h2>
      <p class="monster-choice-context" data-testid="monster-choice-context">{context}</p>
    </div>

    <div class="monster-choice-content">
      <div class="monster-list">
        {#each monsters as monster (monster.instanceId)}
          {@const monsterDef = getMonsterById(monster.monsterId)}
          {#if monsterDef}
            <button
              class="monster-option"
              data-testid="monster-option-{monster.instanceId}"
              onclick={() => handleSelect(monster.instanceId)}
            >
              <div class="monster-icon">
                <img
                  src={assetPath(monsterDef.imagePath)}
                  alt={monsterDef.name}
                  class="monster-image"
                />
              </div>
              <div class="monster-info">
                <div class="monster-name">{monsterDef.name}</div>
                <div class="monster-hp">HP: {monster.currentHp}/{monsterDef.maxHp}</div>
              </div>
            </button>
          {/if}
        {/each}
      </div>
    </div>

    <div class="monster-choice-actions">
      <button
        class="cancel-button"
        data-testid="cancel-monster-choice"
        onclick={handleCancel}
      >
        Cancel
      </button>
    </div>
  </div>
</div>

<style>
  .monster-choice-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    animation: fadeIn 0.3s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .monster-choice-card {
    background: linear-gradient(145deg, #1a1a2e 0%, #0f0f1a 100%);
    border: 3px solid #dc2626;
    border-radius: 16px;
    padding: 2rem;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 8px 32px rgba(220, 38, 38, 0.4);
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: scale(0.9) translateY(-20px);
      opacity: 0;
    }
    to {
      transform: scale(1) translateY(0);
      opacity: 1;
    }
  }

  .monster-choice-header {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .monster-choice-title {
    color: #dc2626;
    font-size: 1.5rem;
    margin: 0 0 0.5rem 0;
    text-transform: uppercase;
    letter-spacing: 2px;
    text-shadow: 0 0 10px rgba(220, 38, 38, 0.5);
  }

  .monster-choice-context {
    color: #e2e8f0;
    font-size: 1rem;
    margin: 0;
  }

  .monster-choice-content {
    margin-bottom: 1.5rem;
  }

  .monster-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .monster-option {
    background: rgba(220, 38, 38, 0.1);
    border: 2px solid rgba(220, 38, 38, 0.3);
    border-radius: 8px;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    cursor: pointer;
    transition: all 0.2s ease-out;
    min-height: 44px;
  }

  .monster-option:hover {
    background: rgba(220, 38, 38, 0.2);
    border-color: #dc2626;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
  }

  .monster-icon {
    width: 60px;
    height: 60px;
    border-radius: 8px;
    overflow: hidden;
    border: 2px solid rgba(220, 38, 38, 0.5);
    flex-shrink: 0;
  }

  .monster-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .monster-info {
    flex: 1;
    text-align: left;
  }

  .monster-name {
    color: #fff;
    font-size: 1.1rem;
    font-weight: bold;
    margin-bottom: 0.25rem;
  }

  .monster-hp {
    color: #94a3b8;
    font-size: 0.9rem;
  }

  .monster-choice-actions {
    display: flex;
    justify-content: center;
    gap: 1rem;
  }

  .cancel-button {
    background: linear-gradient(145deg, #475569 0%, #334155 100%);
    color: #fff;
    border: 2px solid #64748b;
    border-radius: 8px;
    padding: 0.75rem 2rem;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease-out;
    min-width: 44px;
    min-height: 44px;
  }

  .cancel-button:hover {
    background: linear-gradient(145deg, #64748b 0%, #475569 100%);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(100, 116, 139, 0.4);
  }

  /* Edge-based positioning */
  .edge-bottom {
    align-items: flex-end;
    padding-bottom: 2rem;
  }

  .edge-top {
    align-items: flex-start;
    padding-top: 2rem;
  }

  .edge-left {
    justify-content: flex-start;
    padding-left: 2rem;
  }

  .edge-right {
    justify-content: flex-end;
    padding-right: 2rem;
  }
</style>
