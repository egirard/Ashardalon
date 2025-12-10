<script lang="ts">
  import type { Monster, MonsterState } from '../store/types';
  import { MONSTERS } from '../store/types';
  import { assetPath } from '../utils';
  
  interface Props {
    monster: MonsterState;
    isActivating?: boolean;
  }
  
  let { monster, isActivating = false }: Props = $props();
  
  // Get monster definition
  const monsterDef = $derived(MONSTERS.find(m => m.id === monster.monsterId));
  
  // Calculate HP percentage for health bar
  let hpPercentage = $derived.by(() => {
    if (!monsterDef || monsterDef.hp === 0) return 0;
    return Math.max(0, Math.min(100, (monster.currentHp / monsterDef.hp) * 100));
  });
  
  // HP bar color based on health percentage
  let hpBarColor = $derived.by(() => {
    if (hpPercentage <= 25) return '#e53935'; // Red
    if (hpPercentage <= 50) return '#ff9800'; // Orange
    return '#4caf50'; // Green
  });
</script>

{#if monsterDef}
  <div 
    class="monster-card-mini"
    class:activating={isActivating}
    data-testid="monster-card-mini"
    data-monster-id={monster.instanceId}
  >
    <div class="mini-header">
      <img 
        src={assetPath(monsterDef.imagePath)} 
        alt={monsterDef.name}
        class="mini-portrait"
      />
      <div class="mini-info">
        <span class="mini-name" data-testid="monster-mini-name">{monsterDef.name}</span>
        <div class="mini-stats">
          <span class="mini-stat" title="Armor Class" aria-label="Armor Class {monsterDef.ac}">🛡️ {monsterDef.ac}</span>
          <span class="mini-stat" title="Experience Points" aria-label="Experience Points {monsterDef.xp}">⭐ {monsterDef.xp}</span>
        </div>
      </div>
    </div>
    
    <!-- HP Bar -->
    <div class="mini-hp" data-testid="monster-mini-hp">
      <div class="mini-hp-bar-background">
        <div 
          class="mini-hp-bar-fill" 
          style="width: {hpPercentage}%; background-color: {hpBarColor};"
        ></div>
      </div>
      <span class="mini-hp-text">
        {monster.currentHp}/{monsterDef.hp}
      </span>
    </div>
  </div>
{/if}

<style>
  .monster-card-mini {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0.4rem;
    background: rgba(45, 20, 20, 0.8);
    border: 2px solid rgba(204, 51, 51, 0.6);
    border-radius: 6px;
    transition: all 0.3s ease;
    min-width: 140px;
  }
  
  .monster-card-mini.activating {
    border-color: #ff6666;
    background: rgba(60, 25, 25, 0.95);
    box-shadow: 0 0 15px rgba(255, 100, 100, 0.5);
    animation: pulse-glow 1.5s ease-in-out infinite;
  }
  
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 15px rgba(255, 100, 100, 0.5); }
    50% { box-shadow: 0 0 25px rgba(255, 100, 100, 0.8); }
  }
  
  .mini-header {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  
  .mini-portrait {
    width: 32px;
    height: 32px;
    object-fit: contain;
    border: 1px solid #cc3333;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.5);
    flex-shrink: 0;
  }
  
  .mini-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }
  
  .mini-name {
    font-size: 0.7rem;
    font-weight: bold;
    color: #ff6666;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .mini-stats {
    display: flex;
    gap: 0.4rem;
    font-size: 0.6rem;
  }
  
  .mini-stat {
    color: #ccc;
    white-space: nowrap;
  }
  
  .mini-hp {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }
  
  .mini-hp-bar-background {
    flex: 1;
    height: 6px;
    background: rgba(100, 100, 100, 0.4);
    border-radius: 3px;
    overflow: hidden;
  }
  
  .mini-hp-bar-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease-out, background-color 0.3s ease-out;
  }
  
  .mini-hp-text {
    font-size: 0.65rem;
    font-weight: bold;
    color: #fff;
    min-width: 35px;
    text-align: right;
  }
  
  /* Respect user's reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    .monster-card-mini.activating {
      animation: none;
    }
  }
</style>
