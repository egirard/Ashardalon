<script lang="ts">
  import type { Hero, HeroHpState, HeroCondition, MonsterState } from '../store/types';
  import type { HeroInventory, TreasureCard } from '../store/treasure';
  import { getTreasureById } from '../store/treasure';
  import { assetPath } from '../utils';
  import { HeartIcon, SkullIcon, SwordIcon, ShieldIcon, LightningIcon, DiceIcon, TargetIcon, StarIcon, XIcon } from './icons';
  import CardDetailView, { type CardDetail } from './CardDetailView.svelte';
  import LogViewer from './LogViewer.svelte';
  import type { LogEntry } from '../store/types';

  // Condition type constant for consistency
  const DAZED_CONDITION = 'dazed';

  // State for selected card to show in detail view
  let selectedCardDetail: CardDetail | null = $state(null);

  // State for showing log viewer
  let showLogViewer = $state(false);

  interface Props {
    hero: Hero;
    heroHpState: HeroHpState;
    heroInventory?: HeroInventory;
    isActive: boolean;
    turnPhase?: string;
    turnNumber?: number;
    /** Active conditions affecting this hero (e.g., poisoned, dazed) */
    conditions?: HeroCondition[];
    /** Callback when a treasure item is used */
    onUseTreasureItem?: (cardId: number) => void;
    /** Monsters controlled by this hero */
    controlledMonsters?: MonsterState[];
    /** ID of the monster currently activating during villain phase */
    activatingMonsterId?: string | null;
    /** Board position for orientation (top, bottom, left, right) */
    boardPosition?: 'top' | 'bottom' | 'left' | 'right';
    /** Message to display for pending treasure placement */
    treasurePlacementMessage?: string;
    /** Log entries for the game */
    logEntries?: LogEntry[];
  }

  let { hero, heroHpState, heroInventory, isActive, turnPhase, turnNumber, conditions = [], onUseTreasureItem, controlledMonsters = [], activatingMonsterId = null, boardPosition = 'bottom', treasurePlacementMessage, logEntries = [] }: Props = $props();
  
  // Check if hero is knocked out (0 HP)
  let isKnockedOut = $derived(heroHpState.currentHp === 0);

  // Calculate HP percentage for health bar
  let hpPercentage = $derived(Math.max(0, Math.min(100, (heroHpState.currentHp / heroHpState.maxHp) * 100)));
  
  // HP bar color based on health percentage
  let hpBarColor = $derived.by(() => {
    if (hpPercentage <= 25) return '#e53935'; // Red
    if (hpPercentage <= 50) return '#ff9800'; // Orange
    return '#4caf50'; // Green
  });

  // Get treasure items for display
  let treasureItems = $derived.by(() => {
    if (!heroInventory || !heroInventory.items) return [];
    
    const items: { card: TreasureCard; isFlipped: boolean }[] = [];
    
    for (const item of heroInventory.items) {
      const card = getTreasureById(item.cardId);
      if (card) {
        items.push({ card, isFlipped: item.isFlipped });
      }
    }
    
    return items;
  });

  // Get treasure item effect icon component based on type
  function getTreasureIconComponent(effectType: string) {
    switch (effectType) {
      case 'attack-bonus':
      case 'damage-bonus':
        return SwordIcon;
      case 'ac-bonus':
        return ShieldIcon;
      case 'healing':
        return HeartIcon;
      case 'reroll':
        return DiceIcon;
      case 'attack-action':
        return TargetIcon;
      case 'level-up':
        return StarIcon;
      case 'speed-bonus':
      case 'flip-power':
      case 'monster-control':
      case 'movement':
      case 'trap-disable':
      case 'condition-removal':
      default:
        return StarIcon; // Default icon for less common effects
    }
  }

  // Check if a treasure item can be actively used (clicked by player)
  function isItemUsable(card: TreasureCard, isFlipped: boolean): boolean {
    // Can't use already-flipped items
    if (isFlipped) return false;
    
    // Only consumable and action items can be used directly by clicking
    // Immediate (passive) items are always active and don't need to be "used"
    // Reaction items need specific triggers (not implemented yet)
    return card.usage === 'consumable' || card.usage === 'action';
  }

  // Handle using a treasure item - validates usability before invoking callback
  function handleUseTreasureItem(card: TreasureCard, isFlipped: boolean) {
    if (onUseTreasureItem && isActive && isItemUsable(card, isFlipped)) {
      onUseTreasureItem(card.id);
    }
  }

  // Handle clicking on a treasure item mini-card to show details
  function handleTreasureItemClick(card: TreasureCard, isFlipped: boolean, event: MouseEvent) {
    // Prevent triggering the use action if this is a detail view click
    event.stopPropagation();
    
    // If clicking the same card, dismiss the detail view
    if (selectedCardDetail?.type === 'treasure' && (selectedCardDetail.card as TreasureCard).id === card.id) {
      selectedCardDetail = null;
      return;
    }
    
    // Show detail view for this treasure card
    selectedCardDetail = {
      type: 'treasure',
      card: card,
      isFlipped: isFlipped,
      isClickable: isItemUsable(card, isFlipped) && isActive,
      ineligibilityReason: !isActive ? 'Not your turn' : isFlipped ? 'Already used' : undefined
    };
  }

  // Handle clicking on a condition badge to show details
  function handleConditionClick(condition: HeroCondition) {
    // If clicking the same condition, dismiss the detail view
    if (selectedCardDetail?.type === 'condition' && (selectedCardDetail.card as HeroCondition).id === condition.id) {
      selectedCardDetail = null;
      return;
    }
    
    // Show detail view for this condition
    selectedCardDetail = {
      type: 'condition',
      card: condition,
      isClickable: false
    };
  }

  // Handle dismissing the card detail view
  function handleDismissDetail() {
    selectedCardDetail = null;
  }

  // Handle opening the log viewer
  function handleOpenLog() {
    showLogViewer = true;
  }

  // Handle closing the log viewer
  function handleCloseLog() {
    showLogViewer = false;
  }
</script>

<div 
  class="player-card" 
  class:active={isActive}
  class:knocked-out={isKnockedOut}
  class:position-top={boardPosition === 'top'}
  class:position-left={boardPosition === 'left'}
  class:position-right={boardPosition === 'right'}
  data-testid={isActive ? "turn-indicator" : `player-dashboard-${hero.id}`}
  data-hero-id={hero.id}
>
  <!-- KO Overlay (shown when hero is at 0 HP) -->
  {#if isKnockedOut}
    <div class="ko-overlay" data-testid="ko-overlay">
      <span class="ko-text">
        <SkullIcon size={20} color="#fff" ariaLabel="Downed" /> DOWNED
      </span>
    </div>
  {/if}

  <!-- Header with portrait and name -->
  <div class="card-header">
    <img
      src={assetPath(hero.imagePath)}
      alt={hero.name}
      class="hero-portrait"
      class:portrait-ko={isKnockedOut}
    />
    <div class="hero-identity">
      <span class="hero-name" data-testid="player-card-name">{isActive ? `${hero.name}'s Turn` : hero.name}</span>
      <span class="hero-class">{hero.heroClass}</span>
      {#if heroHpState.level === 2}
        <span class="hero-level" data-testid="hero-level">
          Level 2 <StarIcon size={14} ariaLabel="Level 2" />
        </span>
      {/if}
      <button 
        class="view-log-button" 
        onclick={handleOpenLog}
        title="View game log"
        data-testid="view-log-button"
      >
        📜
      </button>
    </div>
    {#if isActive && turnPhase}
      <div class="turn-badge" data-testid="turn-badge">
        <span class="turn-phase" data-testid="turn-phase">{turnPhase}</span>
        {#if turnNumber}
          <span class="turn-number">T{turnNumber}</span>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Conditions Section (shown when hero has active conditions) -->
  {#if conditions.length > 0}
    <div class="conditions-section" data-testid="player-card-conditions">
      {#each conditions as condition (condition.id)}
        <button
          class="condition-badge"
          class:condition-dazed={condition.id === DAZED_CONDITION}
          class:selected={selectedCardDetail?.type === 'condition' && (selectedCardDetail.card as HeroCondition).id === condition.id}
          title="{condition.name}: {condition.description}"
          data-testid={`condition-${condition.id}`}
          onclick={() => handleConditionClick(condition)}
        >
          <span class="condition-icon">{condition.icon}</span>
          <span class="condition-name">{condition.name}</span>
          {#if condition.id === DAZED_CONDITION && isActive}
            <span class="condition-detail-dazed">1 action only</span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
  
  <!-- Treasure Placement Prompt (shown when player needs to select a square) -->
  {#if treasurePlacementMessage}
    <div class="treasure-placement-prompt" data-testid="treasure-placement-prompt">
      <div class="prompt-icon">💎</div>
      <div class="prompt-text">{treasurePlacementMessage}</div>
    </div>
  {/if}

  <!-- Stats Section -->
  <div class="stats-section">
    <!-- HP Bar -->
    <div class="hp-container" class:hp-ko={isKnockedOut} data-testid="hero-hp">
      <div class="hp-bar-background">
        <div 
          class="hp-bar-fill" 
          style="width: {hpPercentage}%; background-color: {hpBarColor};"
        ></div>
      </div>
      <span class="hp-text">
        {#if isKnockedOut}
          <SkullIcon size={16} ariaLabel="Knocked out" />
        {:else}
          <HeartIcon size={16} ariaLabel="Health" />
        {/if}
        HP: {heroHpState.currentHp}/{heroHpState.maxHp}
      </span>
    </div>

    <!-- Core Stats -->
    <div class="core-stats">
      <div class="stat" data-testid="player-card-ac">
        <ShieldIcon size={16} ariaLabel="Armor Class" />
        <span class="stat-label">AC</span>
        <span class="stat-value">{heroHpState.ac}</span>
      </div>
      <div class="stat" data-testid="player-card-surge">
        <LightningIcon size={16} ariaLabel="Surge" />
        <span class="stat-label">Surge</span>
        <span class="stat-value">{heroHpState.surgeValue}</span>
      </div>
      <div class="stat" data-testid="player-card-speed">
        <LightningIcon size={16} ariaLabel="Speed" />
        <span class="stat-label">Spd</span>
        <span class="stat-value">{hero.speed}</span>
      </div>
    </div>

  </div>

  <!-- Treasure Items Section -->
  {#if treasureItems.length > 0}
    <div class="treasure-items-section" data-testid="player-card-items">
      {#each treasureItems as { card, isFlipped } (card.id)}
        {#if isItemUsable(card, isFlipped) && isActive}
          <button 
            class="treasure-item-mini usable"
            class:flipped={isFlipped}
            class:selected={selectedCardDetail?.type === 'treasure' && (selectedCardDetail.card as TreasureCard).id === card.id}
            title="{card.name}: {card.effect.description} (Click to view details)"
            onclick={(e) => handleTreasureItemClick(card, isFlipped, e)}
            ondblclick={() => handleUseTreasureItem(card, isFlipped)}
            data-testid={`treasure-item-${card.id}`}
          >
            <span class="treasure-icon">
              <svelte:component this={getTreasureIconComponent(card.effect.type)} size={14} ariaLabel={card.effect.type} />
            </span>
            <span class="treasure-name">{card.name}</span>
            {#if isFlipped}
              <span class="flipped-indicator">
                <XIcon size={14} ariaLabel="Used" />
              </span>
            {/if}
          </button>
        {:else}
          <button
            class="treasure-item-mini"
            class:flipped={isFlipped}
            class:selected={selectedCardDetail?.type === 'treasure' && (selectedCardDetail.card as TreasureCard).id === card.id}
            title="{card.name}: {card.effect.description} (Click to view details)"
            onclick={(e) => handleTreasureItemClick(card, isFlipped, e)}
            data-testid={`treasure-item-${card.id}`}
          >
            <span class="treasure-icon">
              <svelte:component this={getTreasureIconComponent(card.effect.type)} size={14} ariaLabel={card.effect.type} />
            </span>
            <span class="treasure-name">{card.name}</span>
            {#if isFlipped}
              <span class="flipped-indicator">
                <XIcon size={14} ariaLabel="Used" />
              </span>
            {/if}
          </button>
        {/if}
      {/each}
    </div>
  {/if}

  <!-- Card Detail View (shows enlarged card details) -->
  {#if selectedCardDetail}
    <CardDetailView 
      detail={selectedCardDetail}
      onDismiss={handleDismissDetail}
    />
  {/if}

</div>

<!-- Log Viewer (shown as overlay) -->
{#if showLogViewer}
  <LogViewer 
    logEntries={logEntries}
    onDismiss={handleCloseLog}
  />
{/if}

<style>
  .player-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: calc(0.5rem * var(--ui-font-scale));
    padding: calc(0.6rem * var(--ui-font-scale));
    border-radius: 6px;
    background: rgba(30, 30, 50, 0.95);
    border: 2px solid rgba(100, 100, 130, 0.5);
    min-width: calc(180px * var(--ui-font-scale));
    max-width: calc(300px * var(--ui-font-scale));
    transition: all 0.3s ease-out;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  /* Orientation is now handled by the parent container in GameBoard */

  .player-card.active {
    border-color: #ffd700;
    border-width: 4px;
    background: rgba(40, 40, 60, 0.95);
    box-shadow: 0 0 30px rgba(255, 215, 0, 0.6), 0 0 15px rgba(255, 215, 0, 0.4);
  }

  /* Header */
  .card-header {
    display: flex;
    align-items: center;
    gap: calc(0.5rem * var(--ui-font-scale));
  }

  .hero-portrait {
    width: calc(48px * var(--ui-font-scale));
    height: calc(48px * var(--ui-font-scale));
    object-fit: contain;
    border-radius: 50%;
    border: 2px solid #888;
    background: rgba(0, 0, 0, 0.5);
    flex-shrink: 0;
  }

  .player-card.active .hero-portrait {
    border-color: #ffd700;
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  }

  .hero-identity {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: calc(0.15rem * var(--ui-font-scale));
    min-width: 0;
  }

  .hero-name {
    font-size: calc(1rem * var(--ui-font-scale));
    font-weight: bold;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .player-card.active .hero-name {
    color: #ffd700;
  }

  .hero-class {
    font-size: calc(0.8rem * var(--ui-font-scale));
    color: #aaa;
  }

  .hero-level {
    font-size: calc(0.75rem * var(--ui-font-scale));
    font-weight: bold;
    color: #ffd700;
    background: rgba(255, 215, 0, 0.2);
    padding: calc(0.15rem * var(--ui-font-scale)) calc(0.35rem * var(--ui-font-scale));
    border-radius: 3px;
    width: fit-content;
  }

  .view-log-button {
    background: rgba(255, 215, 0, 0.2);
    border: 1px solid rgba(255, 215, 0, 0.4);
    border-radius: 4px;
    padding: calc(0.3rem * var(--ui-font-scale)) calc(0.6rem * var(--ui-font-scale));
    font-size: calc(1.1rem * var(--ui-font-scale));
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
    margin-left: auto;
  }

  .view-log-button:hover {
    background: rgba(255, 215, 0, 0.3);
    border-color: rgba(255, 215, 0, 0.6);
    transform: translateY(-1px);
  }

  .view-log-button:active {
    transform: translateY(0);
  }

  .turn-badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: calc(0.3rem * var(--ui-font-scale)) calc(0.5rem * var(--ui-font-scale));
    background: rgba(255, 215, 0, 0.2);
    border: 1px solid rgba(255, 215, 0, 0.4);
    border-radius: 4px;
    flex-shrink: 0;
  }

  .turn-phase {
    font-size: calc(0.7rem * var(--ui-font-scale));
    color: #8ecae6;
    font-weight: bold;
  }

  .turn-number {
    font-size: calc(0.65rem * var(--ui-font-scale));
    color: #aaa;
  }

  /* Stats Section */
  .stats-section {
    display: flex;
    flex-direction: column;
    gap: calc(0.4rem * var(--ui-font-scale));
  }

  /* HP Container */
  .hp-container {
    display: flex;
    align-items: center;
    gap: calc(0.5rem * var(--ui-font-scale));
  }

  .hp-bar-background {
    flex: 1;
    height: calc(7px * var(--ui-font-scale));
    background: rgba(100, 100, 100, 0.4);
    border-radius: 3px;
    overflow: hidden;
  }

  .hp-bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease-out, background-color 0.3s ease-out;
  }

  .hp-text {
    font-size: calc(0.85rem * var(--ui-font-scale));
    font-weight: bold;
    color: #fff;
    display: flex;
    align-items: center;
    gap: calc(0.25rem * var(--ui-font-scale));
    min-width: calc(55px * var(--ui-font-scale));
    justify-content: flex-end;
  }

  /* Core Stats */
  .core-stats {
    display: flex;
    justify-content: space-between;
    gap: calc(0.3rem * var(--ui-font-scale));
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: calc(0.25rem * var(--ui-font-scale)) calc(0.4rem * var(--ui-font-scale));
    background: rgba(0, 0, 0, 0.3);
    border-radius: 3px;
    flex: 1;
  }

  .stat-label {
    font-size: calc(0.6rem * var(--ui-font-scale));
    color: #888;
    text-transform: uppercase;
  }

  .stat-value {
    font-size: calc(0.9rem * var(--ui-font-scale));
    font-weight: bold;
    color: #fff;
  }

  /* Treasure Items Section */
  .treasure-items-section {
    display: flex;
    flex-wrap: wrap;
    gap: calc(0.25rem * var(--ui-font-scale));
    border-top: 1px solid rgba(255, 215, 0, 0.3);
    padding-top: calc(0.4rem * var(--ui-font-scale));
  }

  .treasure-item-mini {
    display: flex;
    align-items: center;
    gap: calc(0.2rem * var(--ui-font-scale));
    padding: calc(0.15rem * var(--ui-font-scale)) calc(0.35rem * var(--ui-font-scale));
    background: rgba(139, 115, 85, 0.3);
    border: 1px solid rgba(255, 215, 0, 0.5);
    border-radius: 2px;
    font-size: calc(0.65rem * var(--ui-font-scale));
    max-width: 100%;
    overflow: hidden;
    transition: all 0.2s ease;
    font-family: inherit;
    color: inherit;
  }

  /* Reset button styles for usable items */
  button.treasure-item-mini {
    text-align: left;
    cursor: pointer;
  }

  button.treasure-item-mini:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  button.treasure-item-mini.usable {
    background: rgba(46, 125, 50, 0.3);
    border-color: rgba(76, 175, 80, 0.7);
  }

  button.treasure-item-mini.usable:hover {
    background: rgba(46, 125, 50, 0.5);
    border-color: #4caf50;
  }

  .treasure-item-mini.selected {
    border-color: #ffd700;
    border-width: 2px;
    box-shadow: 0 0 8px rgba(255, 215, 0, 0.6);
  }

  .treasure-item-mini.flipped {
    opacity: 0.4;
    border-style: dashed;
  }

  .treasure-icon {
    font-size: calc(0.75rem * var(--ui-font-scale));
    flex-shrink: 0;
  }

  .treasure-name {
    color: #ffd700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .treasure-item-mini.flipped .treasure-name {
    text-decoration: line-through;
    color: #999;
  }



  /* KO State Styles */
  .player-card.knocked-out {
    border-color: #b71c1c;
    background: rgba(50, 20, 20, 0.95);
    box-shadow: 0 0 15px rgba(183, 28, 28, 0.4);
  }

  .ko-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    border-radius: 6px;
    pointer-events: none;
  }

  .ko-text {
    font-size: calc(1.4rem * var(--ui-font-scale));
    font-weight: bold;
    color: #ff5252;
    text-shadow: 0 0 10px rgba(255, 82, 82, 0.8);
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.05); }
  }

  .portrait-ko {
    filter: grayscale(80%) brightness(0.6);
    border-color: #b71c1c !important;
  }

  .hp-ko {
    background: rgba(183, 28, 28, 0.3);
    border-radius: 4px;
    padding: calc(0.15rem * var(--ui-font-scale));
  }

  /* Conditions Section */
  .conditions-section {
    display: flex;
    flex-wrap: wrap;
    gap: calc(0.25rem * var(--ui-font-scale));
    padding: calc(0.25rem * var(--ui-font-scale)) 0;
  }

  .condition-badge {
    display: flex;
    align-items: center;
    gap: calc(0.2rem * var(--ui-font-scale));
    padding: calc(0.15rem * var(--ui-font-scale)) calc(0.4rem * var(--ui-font-scale));
    background: rgba(156, 39, 176, 0.3);
    border: 1px solid rgba(156, 39, 176, 0.6);
    border-radius: 10px;
    font-size: calc(0.65rem * var(--ui-font-scale));
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .condition-badge:hover {
    background: rgba(156, 39, 176, 0.5);
  }

  .condition-badge.selected {
    border-color: #ffd700;
    border-width: 2px;
    box-shadow: 0 0 8px rgba(255, 215, 0, 0.6);
  }

  .condition-badge.condition-dazed {
    background: rgba(220, 53, 69, 0.2);
    border: 1px solid rgba(220, 53, 69, 0.6);
    animation: dazed-badge-pulse 2s ease-in-out infinite;
  }

  @keyframes dazed-badge-pulse {
    0%, 100% {
      border-color: rgba(220, 53, 69, 0.6);
    }
    50% {
      border-color: rgba(220, 53, 69, 0.9);
    }
  }

  .condition-badge.condition-dazed:hover {
    background: rgba(220, 53, 69, 0.4);
  }

  .condition-icon {
    font-size: calc(0.8rem * var(--ui-font-scale));
  }

  .condition-name {
    color: #ce93d8;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .condition-badge.condition-dazed .condition-name {
    color: #ff6b6b;
  }

  .condition-detail-dazed {
    color: #ffb3ba;
    font-size: calc(0.6rem * var(--ui-font-scale));
    font-weight: normal;
    margin-left: calc(0.15rem * var(--ui-font-scale));
  }

  /* Respect user's reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    .ko-text {
      animation: none;
    }
  }

  /* Treasure Placement Prompt */
  .treasure-placement-prompt {
    background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
    border: 2px solid #ffb74d;
    border-radius: 8px;
    padding: calc(0.85rem * var(--ui-font-scale));
    margin: calc(0.6rem * var(--ui-font-scale)) 0;
    display: flex;
    align-items: center;
    gap: calc(0.85rem * var(--ui-font-scale));
    box-shadow: 0 4px 12px rgba(245, 124, 0, 0.4);
    animation: pulse-prompt 2s ease-in-out infinite;
  }

  @keyframes pulse-prompt {
    0%, 100% { 
      transform: scale(1);
      box-shadow: 0 4px 12px rgba(245, 124, 0, 0.4);
    }
    50% { 
      transform: scale(1.02);
      box-shadow: 0 6px 16px rgba(245, 124, 0, 0.6);
    }
  }

  .prompt-icon {
    font-size: calc(1.7rem * var(--ui-font-scale));
    line-height: 1;
    animation: bounce-gem 1s ease-in-out infinite;
  }

  @keyframes bounce-gem {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }

  .prompt-text {
    flex: 1;
    color: #fff;
    font-weight: 600;
    font-size: calc(0.95rem * var(--ui-font-scale));
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }
</style>
