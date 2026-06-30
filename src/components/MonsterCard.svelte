<script lang="ts">
  import type { Monster } from '../store/types';
  import { MONSTERS, MONSTER_TACTICS } from '../store/types';
  import { assetPath, getEdgeRotation } from '../utils';
  import type { EdgePosition } from '../store/heroesSlice';
  
  interface Props {
    monsterId: string;
    onDismiss?: () => void;
    edge?: EdgePosition;
    autoDismiss?: boolean;
  }
  
  let { monsterId, onDismiss, edge = 'bottom', autoDismiss = false }: Props = $props();
  
  // Get monster definition and tactics
  const monster = $derived(MONSTERS.find(m => m.id === monsterId));
  const tactics = $derived(MONSTER_TACTICS[monsterId]);
  
  // Auto-dismiss state
  let fadeOut = $state(false);
  
  // Auto-dismiss timing: visible for 1 second, then 2-second fade-out (3 seconds total) if enabled
  $effect(() => {
    if (!autoDismiss || !onDismiss) return;
    
    // Wait 1 second, then start fade out
    const fadeTimer = setTimeout(() => {
      fadeOut = true;
    }, 1000);
    
    // After fade completes (2 more seconds), dismiss
    const dismissTimer = setTimeout(() => {
      onDismiss();
    }, 3000);
    
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  });
  
  function handleDismiss() {
    if (onDismiss) {
      onDismiss();
    }
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleDismiss();
    }
  }

  function formatTacticType(type: string): string {
    return type.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  function describeBehavior(type: string): string {
    switch (type) {
      case 'attack-only': return 'If adjacent, attack. Otherwise move toward closest hero.';
      case 'move-and-attack': return 'Move adjacent to a hero then attack.';
      case 'explore-or-attack': return 'If adjacent to hero, attack. Otherwise explore or move toward hero.';
      case 'ranged-attack': return 'Attack from range; punch if adjacent.';
      case 'area-attack': return 'Attacks all valid targets simultaneously.';
      default: return type;
    }
  }

  function formatStatus(s: string | undefined): string {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
</script>

{#if monster}
  <div 
    class="monster-card-overlay"
    class:fade-out={fadeOut}
    onclick={handleDismiss}
    onkeydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-label="Monster spawned"
    tabindex="0"
    data-testid="monster-card-overlay"
  >
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div 
      class="monster-card" 
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="article"
      data-testid="monster-card"
      style="transform: rotate({getEdgeRotation(edge)}deg);"
    >
      <div class="card-header">
        <h3 class="monster-name" data-testid="monster-name">{monster.name}</h3>
        <button 
          class="dismiss-button" 
          onclick={handleDismiss}
          aria-label="Dismiss monster card"
          data-testid="dismiss-monster-card"
        >
          ✕
        </button>
      </div>
      
      <div class="card-image">
        <img 
          src={assetPath(monster.imagePath)} 
          alt={monster.name}
          class="monster-image"
        />
      </div>
      
      <div class="card-stats">
        <div class="stat">
          <span class="stat-label">AC</span>
          <span class="stat-value" data-testid="monster-ac">{monster.ac}</span>
        </div>
        <div class="stat">
          <span class="stat-label">HP</span>
          <span class="stat-value" data-testid="monster-hp">{monster.hp}</span>
        </div>
        <div class="stat">
          <span class="stat-label">XP</span>
          <span class="stat-value" data-testid="monster-xp">{monster.xp}</span>
        </div>
      </div>

      {#if tactics}
        <div class="card-tactics">
          <div class="tactics-section">
            <span class="tactics-label">Behavior</span>
            <span class="tactics-type">{formatTacticType(tactics.type)}</span>
          </div>

          {#if tactics.cardInstructions && tactics.cardInstructions.length > 0}
            <ol class="card-instructions" data-testid="card-instructions">
              {#each tactics.cardInstructions as instruction, i}
                <li class="card-instruction">{instruction}</li>
              {/each}
            </ol>
          {:else}
            <p class="tactics-behavior">{describeBehavior(tactics.type)}</p>
          {/if}

          <div class="tactics-attacks">
            <div class="attack-row" data-testid="monster-adjacent-attack">
              <span class="attack-label">⚔ Adjacent</span>
              <span class="attack-name">{tactics.adjacentAttack.name}</span>
              <span class="attack-bonus">+{tactics.adjacentAttack.attackBonus}</span>
              <span class="attack-damage">{tactics.adjacentAttack.damage} dmg</span>
              {#if tactics.adjacentAttack.missDamage}
                <span class="attack-miss">miss: {tactics.adjacentAttack.missDamage}</span>
              {/if}
              {#if tactics.adjacentAttack.statusEffect}
                <span class="attack-status">{formatStatus(tactics.adjacentAttack.statusEffect)}</span>
              {/if}
            </div>

            {#if tactics.adjacentAttack.targetsAllOnTile}
              <p class="attack-note" data-testid="attack-note-all-on-tile">Hits all heroes on same tile</p>
            {/if}
            {#if tactics.adjacentAttack.targetsAllInRange}
              <p class="attack-note" data-testid="attack-note-all-in-range">Hits all heroes within {tactics.moveAttackRange ?? 1} tile(s)</p>
            {/if}

            {#if tactics.moveAttack}
              <div class="attack-row" data-testid="monster-move-attack">
                <span class="attack-label">{tactics.type === 'ranged-attack' ? `🏹 Range ${tactics.moveAttackRange ?? 1}` : `⚔ Move+Atk`}</span>
                <span class="attack-name">{tactics.moveAttack.name}</span>
                <span class="attack-bonus">+{tactics.moveAttack.attackBonus}</span>
                <span class="attack-damage">{tactics.moveAttack.damage} dmg</span>
                {#if tactics.moveAttack.missDamage}
                  <span class="attack-miss">miss: {tactics.moveAttack.missDamage}</span>
                {/if}
                {#if tactics.moveAttack.statusEffect}
                  <span class="attack-status">{formatStatus(tactics.moveAttack.statusEffect)}</span>
                {/if}
              </div>
            {/if}
          </div>
        </div>
      {/if}
      
      <p class="card-hint">Click anywhere to dismiss</p>
    </div>
  </div>
{/if}

<style>
  .monster-card-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1100;
    cursor: pointer;
    opacity: 1;
    transition: opacity 2s ease-out;
    animation: overlay-fade-in 0.4s ease-out forwards;
  }

  @keyframes overlay-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .monster-card-overlay.fade-out {
    opacity: 0;
  }
  
  .monster-card {
    background: linear-gradient(145deg, #2d1414 0%, #1a0a0a 100%);
    border: 3px solid #cc3333;
    border-radius: 12px;
    padding: 1.5rem;
    min-width: 300px;
    max-width: 380px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 8px 32px rgba(200, 0, 0, 0.3);
    cursor: default;
    animation: card-materialize 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  }

  @keyframes card-materialize {
    0% {
      opacity: 0;
      transform: scale(0.5) rotate(-3deg);
    }
    60% {
      transform: scale(1.05) rotate(1deg);
    }
    100% {
      opacity: 1;
      transform: scale(1) rotate(0deg);
    }
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    border-bottom: 1px solid #cc3333;
    padding-bottom: 0.75rem;
  }
  
  .monster-name {
    margin: 0;
    font-size: 1.25rem;
    color: #ff6666;
    text-shadow: 0 0 10px rgba(255, 100, 100, 0.5);
  }
  
  .dismiss-button {
    background: transparent;
    border: none;
    color: #cc3333;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0.25rem;
    line-height: 1;
    transition: color 0.2s;
  }
  
  .dismiss-button:hover {
    color: #ff6666;
  }
  
  .card-image {
    display: flex;
    justify-content: center;
    margin-bottom: 1rem;
  }
  
  .monster-image {
    width: 100px;
    height: 100px;
    object-fit: contain;
    border: 2px solid #cc3333;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.5);
  }
  
  .card-stats {
    display: flex;
    justify-content: space-around;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
  }
  
  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }
  
  .stat-label {
    font-size: 0.75rem;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .stat-value {
    font-size: 1.5rem;
    font-weight: bold;
    color: #fff;
  }
  
  .card-tactics {
    margin-bottom: 1rem;
    border: 1px solid rgba(204, 51, 51, 0.3);
    border-radius: 8px;
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.25);
  }

  .tactics-section {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.3rem;
  }

  .tactics-label {
    font-size: 0.65rem;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .tactics-type {
    font-size: 0.75rem;
    font-weight: bold;
    color: #ff9966;
  }

  .tactics-behavior {
    font-size: 0.65rem;
    color: #ccc;
    margin: 0 0 0.6rem;
    line-height: 1.4;
  }

  .card-instructions {
    margin: 0.2rem 0 0.6rem;
    padding-left: 1.2rem;
    list-style: decimal;
  }

  .card-instruction {
    font-size: 0.65rem;
    color: #ccc;
    line-height: 1.5;
    padding: 0.05rem 0;
  }

  .tactics-attacks {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .attack-row {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-wrap: wrap;
    padding: 0.25rem 0.4rem;
    background: rgba(139, 69, 19, 0.25);
    border: 1px solid rgba(139, 69, 19, 0.4);
    border-radius: 4px;
    font-size: 0.65rem;
  }

  .attack-label {
    color: #ff9966;
    font-weight: bold;
    min-width: 70px;
  }

  .attack-name {
    color: #fff;
    flex: 1;
  }

  .attack-bonus {
    color: #4ade80;
    font-weight: bold;
  }

  .attack-damage {
    color: #f97316;
    font-weight: bold;
  }

  .attack-miss {
    color: #facc15;
    font-size: 0.6rem;
  }

  .attack-status {
    color: #c084fc;
    font-size: 0.6rem;
    font-style: italic;
  }

  .attack-note {
    font-size: 0.6rem;
    color: #ff9966;
    margin: 0.2rem 0 0;
    font-style: italic;
  }

  .card-hint {
    text-align: center;
    color: #666;
    font-size: 0.75rem;
    margin: 0;
  }

  /* Respect user's reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    .monster-card-overlay {
      animation: none;
    }
    .monster-card {
      animation: none;
    }
  }
</style>
