<script lang="ts">
  import type { AttackResult } from '../store/types';

  interface VillainActivation {
    villainName: string;
    actionType: 'attack' | 'move' | 'auto-damage' | 'spawn' | 'idle';
    tacticName: string;
    attackResult: AttackResult | null;
    targetHeroId: string | null;
    targetHeroIds: string[];
    autoDamage: number;
    remainingResults: AttackResult[];
    remainingTargetIds: string[];
  }

  interface Props {
    activation: VillainActivation;
    onDismiss?: () => void;
  }

  let { activation, onDismiss }: Props = $props();

  function handleDismiss() {
    if (onDismiss) onDismiss();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleDismiss();
    }
  }

  // Icon for each action type
  const actionIcon = $derived.by(() => {
    switch (activation.actionType) {
      case 'attack':    return '⚔️';
      case 'move':      return '🏃';
      case 'auto-damage': return '💥';
      case 'spawn':     return '🌑';
      default:          return '👁️';
    }
  });

  // Whether to show the dice roll breakdown
  const showDiceRoll = $derived(
    activation.actionType === 'attack' && activation.attackResult !== null
  );

  // Target hero display name (capitalize first letter)
  const targetDisplayName = $derived(
    activation.targetHeroId
      ? activation.targetHeroId.charAt(0).toUpperCase() + activation.targetHeroId.slice(1)
      : null
  );

  // Whether there are more area-attack targets remaining
  const hasMoreTargets = $derived(activation.remainingResults.length > 0);
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="villain-activation-overlay"
  onclick={handleDismiss}
  onkeydown={handleKeydown}
  role="dialog"
  aria-modal="true"
  aria-label="Villain activation"
  tabindex="0"
  data-testid="villain-activation-overlay"
>
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="villain-activation-card"
    class:hit={activation.actionType === 'attack' && activation.attackResult?.isHit}
    class:miss={activation.actionType === 'attack' && activation.attackResult !== null && !activation.attackResult.isHit}
    class:critical={activation.actionType === 'attack' && activation.attackResult?.isCritical}
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
    role="document"
    data-testid="villain-activation-card"
  >
    <!-- Header -->
    <div class="activation-header">
      <h3 class="villain-name" data-testid="villain-activation-name">
        {actionIcon} {activation.villainName}
      </h3>
      <button
        class="dismiss-button"
        onclick={handleDismiss}
        aria-label="Dismiss villain activation"
        data-testid="dismiss-villain-activation"
      >
        ✕
      </button>
    </div>

    <div class="tactic-label" data-testid="villain-tactic-label">
      {activation.tacticName}
    </div>

    <!-- Attack result: dice roll breakdown -->
    {#if showDiceRoll && activation.attackResult}
      {@const ar = activation.attackResult}
      <div class="dice-section">
        <div class="dice-container">
          <span class="d20-icon">D20</span>
          <span class="roll-value" data-testid="villain-roll-value">{ar.roll}</span>
        </div>

        <div class="roll-breakdown">
          <div class="breakdown-row">
            <span class="breakdown-label">Roll:</span>
            <span class="breakdown-value">{ar.roll}</span>
          </div>
          <div class="breakdown-row">
            <span class="breakdown-label">+ Bonus:</span>
            <span class="breakdown-value">{ar.attackBonus}</span>
          </div>
          <div class="breakdown-divider"></div>
          <div class="breakdown-row total">
            <span class="breakdown-label">Total:</span>
            <span class="breakdown-value">{ar.total}</span>
          </div>
          <div class="breakdown-row target">
            <span class="breakdown-label">vs AC:</span>
            <span class="breakdown-value">{ar.targetAC}</span>
          </div>
        </div>
      </div>

      <div class="result-section">
        {#if ar.isCritical}
          <span class="result-text critical" data-testid="villain-result-text">💥 CRITICAL HIT!</span>
        {:else if ar.isHit}
          <span class="result-text hit" data-testid="villain-result-text">HIT!</span>
        {:else}
          <span class="result-text miss" data-testid="villain-result-text">MISS!</span>
        {/if}

        {#if ar.isHit && targetDisplayName}
          <div class="damage-info" data-testid="villain-damage-info">
            <span class="damage-value">{ar.damage}</span>
            <span class="damage-label">damage to {targetDisplayName}</span>
          </div>
        {/if}
      </div>

    <!-- Auto-damage result -->
    {:else if activation.actionType === 'auto-damage'}
      <div class="auto-damage-section" data-testid="villain-auto-damage">
        <span class="auto-damage-icon">💥</span>
        <div class="auto-damage-text">
          <span class="auto-damage-value">{activation.autoDamage}</span>
          <span class="auto-damage-label">
            automatic damage to {activation.targetHeroIds.map(id => id.charAt(0).toUpperCase() + id.slice(1)).join(', ')}
          </span>
        </div>
      </div>

    <!-- Move result -->
    {:else if activation.actionType === 'move'}
      <div class="move-section" data-testid="villain-move-info">
        <span class="move-icon">🏃</span>
        <p class="move-text">Advances toward the party</p>
      </div>

    <!-- Spawn result -->
    {:else if activation.actionType === 'spawn'}
      <div class="spawn-section" data-testid="villain-spawn-info">
        <span class="spawn-icon">🌑</span>
        <p class="spawn-text">{activation.tacticName}</p>
      </div>
    {/if}

    {#if hasMoreTargets}
      <p class="more-targets-hint" data-testid="villain-more-targets">
        +{activation.remainingResults.length} more target(s) — click to continue
      </p>
    {:else}
      <p class="dismiss-hint">Click anywhere to continue</p>
    {/if}
  </div>
</div>

<style>
  .villain-activation-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.78);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
    cursor: pointer;
  }

  .villain-activation-card {
    background: linear-gradient(145deg, #1a0030 0%, #12001e 100%);
    border: 3px solid #7b2fbf;
    border-radius: 12px;
    padding: 1.5rem;
    min-width: 300px;
    max-width: 380px;
    cursor: default;
    animation: slideIn 0.3s ease-out;
    box-shadow: 0 8px 32px rgba(123, 47, 191, 0.45);
  }

  .villain-activation-card.hit {
    border-color: #c55cf7;
    box-shadow: 0 8px 32px rgba(197, 92, 247, 0.4);
  }

  .villain-activation-card.miss {
    border-color: #6a4a7a;
    box-shadow: 0 8px 32px rgba(100, 60, 130, 0.2);
  }

  .villain-activation-card.critical {
    border-color: #ff60ff;
    box-shadow: 0 8px 40px rgba(255, 96, 255, 0.55);
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateY(-20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .activation-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
    border-bottom: 1px solid #4a1a7a;
    padding-bottom: 0.75rem;
  }

  .villain-name {
    margin: 0;
    font-size: 1.05rem;
    color: #d09ef5;
    font-weight: bold;
  }

  .tactic-label {
    font-size: 0.85rem;
    color: #9060c0;
    margin-bottom: 1rem;
    font-style: italic;
  }

  .dismiss-button {
    background: transparent;
    border: none;
    color: #666;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0.25rem;
    line-height: 1;
    transition: color 0.2s;
  }

  .dismiss-button:hover {
    color: #fff;
  }

  /* Dice roll section (same layout as CombatResultDisplay) */
  .dice-section {
    display: flex;
    gap: 1.5rem;
    align-items: center;
    margin-bottom: 1rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
  }

  .dice-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .d20-icon {
    font-size: 0.875rem;
    font-weight: bold;
    color: #c080ff;
    background: rgba(192, 128, 255, 0.15);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    border: 1px solid rgba(192, 128, 255, 0.3);
  }

  .roll-value {
    font-size: 2rem;
    font-weight: bold;
    color: #fff;
  }

  .roll-breakdown {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .breakdown-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
  }

  .breakdown-label { color: #888; }
  .breakdown-value { color: #fff; font-weight: bold; }
  .breakdown-divider { border-top: 1px solid #4a1a7a; margin: 0.25rem 0; }
  .breakdown-row.total .breakdown-value { color: #c080ff; font-size: 1.1rem; }
  .breakdown-row.target .breakdown-label,
  .breakdown-row.target .breakdown-value { color: #f4a261; }

  /* Result section */
  .result-section {
    text-align: center;
    margin-bottom: 1rem;
  }

  .result-text {
    font-size: 1.5rem;
    font-weight: bold;
    display: block;
    margin-bottom: 0.5rem;
  }

  .result-text.hit { color: #c55cf7; }
  .result-text.miss { color: #888; }
  .result-text.critical { color: #ff60ff; text-shadow: 0 0 10px rgba(255, 96, 255, 0.5); }

  .damage-info {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .damage-value {
    font-size: 1.5rem;
    font-weight: bold;
    color: #e76f51;
  }

  .damage-label {
    color: #aaa;
    font-size: 0.9rem;
  }

  /* Auto-damage section */
  .auto-damage-section {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .auto-damage-icon { font-size: 2.5rem; }

  .auto-damage-text {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .auto-damage-value {
    font-size: 1.75rem;
    font-weight: bold;
    color: #e76f51;
  }

  .auto-damage-label { color: #aaa; font-size: 0.85rem; }

  /* Move section */
  .move-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .move-icon { font-size: 2.5rem; }
  .move-text { margin: 0; font-size: 1rem; color: #aaa; text-align: center; }

  /* Spawn section */
  .spawn-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .spawn-icon { font-size: 2.5rem; }
  .spawn-text { margin: 0; font-size: 1rem; color: #aaa; text-align: center; }

  /* Hints */
  .more-targets-hint {
    text-align: center;
    color: #c080ff;
    font-size: 0.8rem;
    margin: 0;
    font-style: italic;
  }

  .dismiss-hint {
    text-align: center;
    color: #555;
    font-size: 0.75rem;
    margin: 0;
  }
</style>
