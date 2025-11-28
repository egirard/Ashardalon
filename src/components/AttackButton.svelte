<script lang="ts">
  import type { MonsterState, HeroAttack } from '../store/types';
  import { MONSTERS } from '../store/types';
  
  interface Props {
    adjacentMonsters: MonsterState[];
    heroAttack: HeroAttack;
    onAttack: (targetInstanceId: string) => void;
  }
  
  let { adjacentMonsters, heroAttack, onAttack }: Props = $props();
  
  function getMonsterName(monsterId: string): string {
    const monster = MONSTERS.find(m => m.id === monsterId);
    return monster?.name || 'Unknown';
  }
  
  function handleAttack(targetInstanceId: string) {
    onAttack(targetInstanceId);
  }
</script>

{#if adjacentMonsters.length > 0}
  <div class="attack-panel" data-testid="attack-panel">
    <div class="attack-header">
      <span class="attack-label">Attack with {heroAttack.name}</span>
      <span class="attack-stats">+{heroAttack.attackBonus} / {heroAttack.damage} dmg</span>
    </div>
    
    <div class="attack-targets">
      {#each adjacentMonsters as monster (monster.instanceId)}
        <button 
          class="attack-button"
          onclick={() => handleAttack(monster.instanceId)}
          data-testid="attack-button"
          data-target-id={monster.instanceId}
          aria-label="Attack {getMonsterName(monster.monsterId)}"
        >
          Attack {getMonsterName(monster.monsterId)}
        </button>
      {/each}
    </div>
  </div>
{/if}

<style>
  .attack-panel {
    background: rgba(139, 69, 19, 0.3);
    border: 2px solid #d4a574;
    border-radius: 8px;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .attack-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(212, 165, 116, 0.3);
  }
  
  .attack-label {
    font-weight: bold;
    color: #d4a574;
    font-size: 0.9rem;
  }
  
  .attack-stats {
    font-size: 0.8rem;
    color: #aaa;
  }
  
  .attack-targets {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .attack-button {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
    background: linear-gradient(145deg, #8b4513 0%, #654321 100%);
    color: #fff;
    border: 2px solid #d4a574;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease-out;
    min-height: 44px;
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
</style>
