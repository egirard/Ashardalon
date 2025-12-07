<script lang="ts">
  import type { MonsterState, Monster, HeroCondition } from '../store/types';
  import { MONSTERS } from '../store/types';
  import { assetPath } from '../utils';
  import { getStatusDisplayData } from '../store/statusEffects';
  
  interface Props {
    monster: MonsterState;
    cellSize: number;
    tileOffsetX: number;
    tileOffsetY: number;
    tilePixelOffset: { x: number; y: number };
  }
  
  let { monster, cellSize, tileOffsetX, tileOffsetY, tilePixelOffset }: Props = $props();
  
  // Get monster definition
  const monsterDef = $derived(MONSTERS.find(m => m.id === monster.monsterId));
  
  // Get status display data
  const statusConditions = $derived.by(() => {
    if (!monster.statuses || monster.statuses.length === 0) return [];
    return getStatusDisplayData(monster.statuses);
  });
  
  // Calculate pixel position
  const style = $derived(() => {
    const cellCenterOffset = cellSize / 2;
    const absoluteLeft = tilePixelOffset.x + tileOffsetX + monster.position.x * cellSize + cellCenterOffset;
    const absoluteTop = tilePixelOffset.y + tileOffsetY + monster.position.y * cellSize + cellCenterOffset;
    return `left: ${absoluteLeft}px; top: ${absoluteTop}px;`;
  });
</script>

{#if monsterDef}
  <div 
    class="monster-token"
    data-testid="monster-token"
    data-monster-id={monster.instanceId}
    style={style()}
  >
    <img 
      src={assetPath(monsterDef.imagePath)} 
      alt={monsterDef.name} 
      class="token-image"
    />
    <span class="token-label">{monsterDef.name}</span>
    
    <!-- Status effects badges -->
    {#if statusConditions.length > 0}
      <div class="status-badges" data-testid="monster-status-badges">
        {#each statusConditions as condition (condition.id)}
          <span 
            class="status-badge"
            title="{condition.name}: {condition.description}"
            data-testid={`monster-status-${condition.id}`}
          >
            {condition.icon}
          </span>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  /* Monster token color scheme */
  .monster-token {
    --monster-color-primary: #cc3333;
    --monster-color-dark: rgba(60, 0, 0, 0.8);
    --monster-label-bg: rgba(100, 20, 20, 0.9);
    
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    transform: translate(-50%, -50%);
    z-index: 8;
  }
  
  .token-image {
    width: 36px;
    height: 36px;
    object-fit: contain;
    border-radius: 4px;
    border: 2px solid var(--monster-color-primary);
    background: var(--monster-color-dark);
  }
  
  .token-label {
    font-size: 0.65rem;
    background: var(--monster-label-bg);
    color: #fff;
    padding: 2px 6px;
    border-radius: 4px;
    margin-top: 2px;
    white-space: nowrap;
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    border: 1px solid var(--monster-color-primary);
  }
  
  .status-badges {
    display: flex;
    gap: 2px;
    margin-top: 2px;
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .status-badge {
    font-size: 0.75rem;
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 3px;
    padding: 1px 3px;
    cursor: help;
  }
</style>
