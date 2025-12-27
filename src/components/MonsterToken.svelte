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
    isTargetable?: boolean;
    isSelected?: boolean;
    onClick?: () => void;
  }
  
  let { 
    monster, 
    cellSize, 
    tileOffsetX, 
    tileOffsetY, 
    tilePixelOffset,
    isTargetable = false,
    isSelected = false,
    onClick,
  }: Props = $props();
  
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
  
  function handleClick(e: Event) {
    if (onClick && isTargetable) {
      e.stopPropagation();
      onClick();
    }
  }
</script>

{#if monsterDef}
  {#snippet tokenContent()}
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
  {/snippet}
  
  {#if isTargetable}
    <button
      class="monster-token"
      class:targetable={true}
      class:selected={isSelected}
      data-testid="monster-token"
      data-monster-id={monster.instanceId}
      data-targetable={true}
      data-selected={isSelected}
      style={style()}
      onclick={handleClick}
      aria-label={`Select ${monsterDef.name}`}
    >
      {@render tokenContent()}
    </button>
  {:else}
    <div 
      class="monster-token"
      data-testid="monster-token"
      data-monster-id={monster.instanceId}
      data-targetable={false}
      data-selected={false}
      style={style()}
    >
      {@render tokenContent()}
    </div>
  {/if}
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
    transition: all 0.2s ease-out;
    background: none;
    border: none;
    padding: 0;
    font-family: inherit;
    cursor: default;
  }
  
  /* Targetable state - shows a glow to indicate monster can be selected */
  .monster-token.targetable {
    cursor: pointer;
  }
  
  .monster-token.targetable .token-image {
    box-shadow: 0 0 10px 2px rgba(255, 215, 0, 0.6);
    animation: targetable-pulse 2s ease-in-out infinite;
  }
  
  @keyframes targetable-pulse {
    0%, 100% {
      box-shadow: 0 0 10px 2px rgba(255, 215, 0, 0.6);
    }
    50% {
      box-shadow: 0 0 16px 4px rgba(255, 215, 0, 0.9);
    }
  }
  
  .monster-token.targetable:hover .token-image {
    transform: scale(1.1);
    box-shadow: 0 0 16px 4px rgba(255, 215, 0, 0.9);
  }
  
  /* Selected state - shows a strong highlight ring */
  .monster-token.selected .token-image {
    box-shadow: 0 0 16px 4px rgba(0, 255, 0, 0.9);
    transform: scale(1.15);
    animation: none;
  }
  
  .token-image {
    width: 36px;
    height: 36px;
    object-fit: contain;
    border-radius: 4px;
    border: 2px solid var(--monster-color-primary);
    background: var(--monster-color-dark);
    transition: all 0.2s ease-out;
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
