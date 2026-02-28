<script lang="ts">
  import type { VillainInstance } from '../store/types';
  import { VILLAIN_DEFINITIONS } from '../store/types';
  import { assetPath } from '../utils';
  import { getStatusDisplayData } from '../store/statusEffects';

  interface Props {
    villain: VillainInstance;
    cellSize: number;
    tileOffsetX: number;
    tileOffsetY: number;
    tilePixelOffset: { x: number; y: number };
    isTargetable?: boolean;
    isSelected?: boolean;
    isShielded?: boolean;
    onClick?: () => void;
  }

  let {
    villain,
    cellSize,
    tileOffsetX,
    tileOffsetY,
    tilePixelOffset,
    isTargetable = false,
    isSelected = false,
    isShielded = false,
    onClick,
  }: Props = $props();

  // Look up villain definition
  const villainDef = $derived(VILLAIN_DEFINITIONS.find(d => d.id === villain.villainId));

  // Status effect display
  const statusConditions = $derived.by(() => {
    if (!villain.statuses || villain.statuses.length === 0) return [];
    return getStatusDisplayData(villain.statuses);
  });

  // Pixel position of the villain token
  const style = $derived(() => {
    const cellCenterOffset = cellSize / 2;
    const absoluteLeft = tilePixelOffset.x + tileOffsetX + villain.position.x * cellSize + cellCenterOffset;
    const absoluteTop  = tilePixelOffset.y + tileOffsetY + villain.position.y * cellSize + cellCenterOffset;
    return `left: ${absoluteLeft}px; top: ${absoluteTop}px;`;
  });

  function handleClick(e: Event) {
    if (onClick && isTargetable) {
      e.stopPropagation();
      onClick();
    }
  }
</script>

{#if villainDef}
  {#snippet tokenContent()}
    <img
      src={assetPath(villainDef.tokenAsset)}
      alt={villainDef.name}
      class="token-image"
    />
    <span class="token-label">{villainDef.name}</span>
    <div class="hp-bar" data-testid="villain-hp-bar">
      <span class="hp-text">{villain.currentHp}/{villain.maxHp}</span>
    </div>

    <!-- Shield indicator -->
    {#if isShielded}
      <div class="shield-badge" data-testid="villain-shield-badge" title="Shielded by guards">🛡️</div>
    {/if}

    <!-- Status effects -->
    {#if statusConditions.length > 0}
      <div class="status-badges" data-testid="villain-status-badges">
        {#each statusConditions as condition (condition.id)}
          <span
            class="status-badge"
            title="{condition.name}: {condition.description}"
            data-testid={`villain-status-${condition.id}`}
          >
            {condition.icon}
          </span>
        {/each}
      </div>
    {/if}
  {/snippet}

  {#if isTargetable}
    <button
      class="villain-token targetable"
      class:selected={isSelected}
      class:shielded={isShielded}
      data-testid="villain-token"
      data-villain-id={villain.instanceId}
      data-targetable={isTargetable}
      style={style()}
      onclick={handleClick}
      aria-label={`Attack ${villainDef.name}`}
    >
      {@render tokenContent()}
    </button>
  {:else}
    <div
      class="villain-token"
      class:shielded={isShielded}
      data-testid="villain-token"
      data-villain-id={villain.instanceId}
      style={style()}
    >
      {@render tokenContent()}
    </div>
  {/if}
{/if}

<style>
  .villain-token {
    --villain-color-primary: #7b2fbf;
    --villain-color-dark: rgba(40, 0, 80, 0.85);
    --villain-label-bg: rgba(80, 0, 120, 0.9);

    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    transform: translate(-50%, -50%);
    z-index: 9; /* Above regular monsters */
    transition: all 0.2s ease-out;
    background: none;
    border: none;
    padding: 0;
    font-family: inherit;
    cursor: default;
  }

  .villain-token.targetable {
    cursor: pointer;
  }

  .villain-token.targetable .token-image {
    box-shadow: 0 0 12px 3px rgba(255, 100, 255, 0.7);
    animation: villain-targetable-pulse 2s ease-in-out infinite;
  }

  @keyframes villain-targetable-pulse {
    0%, 100% { box-shadow: 0 0 12px 3px rgba(255, 100, 255, 0.7); }
    50%       { box-shadow: 0 0 20px 6px rgba(255, 100, 255, 1); }
  }

  .villain-token.selected .token-image {
    box-shadow: 0 0 20px 6px rgba(0, 255, 0, 0.95);
    animation: none;
  }

  /* Shielded: purple-grey tint to signal blocked */
  .villain-token.shielded .token-image {
    filter: grayscale(40%) brightness(0.9);
    box-shadow: 0 0 10px 3px rgba(120, 100, 200, 0.7);
  }

  .token-image {
    width: 42px;
    height: 42px;
    object-fit: contain;
    border-radius: 6px;
    border: 3px solid var(--villain-color-primary);
    background: var(--villain-color-dark);
    transition: all 0.2s ease-out;
  }

  .token-label {
    font-size: 0.6rem;
    background: var(--villain-label-bg);
    color: #e0b0ff;
    padding: 2px 6px;
    border-radius: 4px;
    margin-top: 2px;
    white-space: nowrap;
    max-width: 90px;
    overflow: hidden;
    text-overflow: ellipsis;
    border: 1px solid var(--villain-color-primary);
  }

  .hp-bar {
    background: rgba(0, 0, 0, 0.75);
    border: 1px solid var(--villain-color-primary);
    border-radius: 3px;
    padding: 1px 4px;
    margin-top: 2px;
  }

  .hp-text {
    font-size: 0.6rem;
    color: #ff80ff;
    font-weight: bold;
  }

  .shield-badge {
    font-size: 0.85rem;
    position: absolute;
    top: -4px;
    right: -4px;
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
