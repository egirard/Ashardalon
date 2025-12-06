<script lang="ts">
  import type { Hero, HeroHpState, HeroCondition } from '../store/types';
  import type { HeroPowerCards, PowerCard } from '../store/powerCards';
  import { getPowerCardById } from '../store/powerCards';
  import type { HeroInventory, TreasureCard } from '../store/treasure';
  import { getTreasureById } from '../store/treasure';
  import { assetPath } from '../utils';

  interface Props {
    hero: Hero;
    heroHpState: HeroHpState;
    heroPowerCards?: HeroPowerCards;
    heroInventory?: HeroInventory;
    isActive: boolean;
    turnPhase?: string;
    turnNumber?: number;
    /** Active conditions affecting this hero (e.g., poisoned, dazed) */
    conditions?: HeroCondition[];
    /** Number of healing surges available to the party */
    partySurges?: number;
  }

  let { hero, heroHpState, heroPowerCards, heroInventory, isActive, turnPhase, turnNumber, conditions = [], partySurges }: Props = $props();
  
  // Check if hero is knocked out (0 HP)
  let isKnockedOut = $derived(heroHpState.currentHp === 0);
  
  // Check if no party surges remain (for warning display)
  let noSurgesRemaining = $derived(partySurges === 0);

  // Get power cards for display
  let powerCards = $derived.by(() => {
    if (!heroPowerCards) return [];
    
    const cards: { card: PowerCard; isFlipped: boolean }[] = [];
    
    // Add custom ability
    const customAbility = getPowerCardById(heroPowerCards.customAbility);
    if (customAbility) {
      const state = heroPowerCards.cardStates.find(s => s.cardId === customAbility.id);
      cards.push({ card: customAbility, isFlipped: state?.isFlipped ?? false });
    }
    
    // Add utility
    const utility = getPowerCardById(heroPowerCards.utility);
    if (utility) {
      const state = heroPowerCards.cardStates.find(s => s.cardId === utility.id);
      cards.push({ card: utility, isFlipped: state?.isFlipped ?? false });
    }
    
    // Add at-wills
    for (const atWillId of heroPowerCards.atWills) {
      const atWill = getPowerCardById(atWillId);
      if (atWill) {
        const state = heroPowerCards.cardStates.find(s => s.cardId === atWill.id);
        cards.push({ card: atWill, isFlipped: state?.isFlipped ?? false });
      }
    }
    
    // Add daily
    const daily = getPowerCardById(heroPowerCards.daily);
    if (daily) {
      const state = heroPowerCards.cardStates.find(s => s.cardId === daily.id);
      cards.push({ card: daily, isFlipped: state?.isFlipped ?? false });
    }
    
    // Add level 2 daily if present
    if (heroPowerCards.dailyLevel2) {
      const dailyL2 = getPowerCardById(heroPowerCards.dailyLevel2);
      if (dailyL2) {
        const state = heroPowerCards.cardStates.find(s => s.cardId === dailyL2.id);
        cards.push({ card: dailyL2, isFlipped: state?.isFlipped ?? false });
      }
    }
    
    return cards;
  });

  // Calculate HP percentage for health bar
  let hpPercentage = $derived(Math.max(0, Math.min(100, (heroHpState.currentHp / heroHpState.maxHp) * 100)));
  
  // HP bar color based on health percentage
  let hpBarColor = $derived.by(() => {
    if (hpPercentage <= 25) return '#e53935'; // Red
    if (hpPercentage <= 50) return '#ff9800'; // Orange
    return '#4caf50'; // Green
  });

  // Power card type colors
  function getPowerCardColor(type: string): string {
    switch (type) {
      case 'at-will': return '#2e7d32'; // Green
      case 'daily': return '#7b1fa2'; // Purple
      case 'utility': return '#1565c0'; // Blue
      default: return '#666';
    }
  }

  // Power card type abbreviation
  function getPowerCardAbbrev(type: string): string {
    switch (type) {
      case 'at-will': return 'AW';
      case 'daily': return 'D';
      case 'utility': return 'U';
      default: return '';
    }
  }

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

  // Get treasure item effect icon based on type
  function getTreasureIcon(effectType: string): string {
    switch (effectType) {
      case 'attack-bonus': return '⚔️';
      case 'damage-bonus': return '💥';
      case 'ac-bonus': return '🛡️';
      case 'speed-bonus': return '🏃';
      case 'healing': return '❤️';
      case 'reroll': return '🎲';
      case 'flip-power': return '🔄';
      case 'attack-action': return '🎯';
      case 'monster-control': return '👹';
      case 'movement': return '✈️';
      case 'level-up': return '⭐';
      case 'trap-disable': return '🔓';
      case 'condition-removal': return '💊';
      default: return '📦';
    }
  }
</script>

<div 
  class="player-card" 
  class:active={isActive}
  class:knocked-out={isKnockedOut}
  data-testid={isActive ? "turn-indicator" : `player-dashboard-${hero.id}`}
  data-hero-id={hero.id}
>
  <!-- KO Overlay (shown when hero is at 0 HP) -->
  {#if isKnockedOut}
    <div class="ko-overlay" data-testid="ko-overlay">
      <span class="ko-text">💀 DOWNED</span>
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
        <span class="hero-level" data-testid="hero-level">Level 2 ⭐</span>
      {/if}
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
        <div 
          class="condition-badge"
          title="{condition.name}: {condition.description}"
          data-testid={`condition-${condition.id}`}
        >
          <span class="condition-icon">{condition.icon}</span>
          <span class="condition-name">{condition.name}</span>
        </div>
      {/each}
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
        <span class="hp-icon">{isKnockedOut ? '💀' : '❤️'}</span>
        HP: {heroHpState.currentHp}/{heroHpState.maxHp}
      </span>
    </div>

    <!-- Core Stats -->
    <div class="core-stats">
      <div class="stat" data-testid="player-card-ac">
        <span class="stat-icon">🛡️</span>
        <span class="stat-label">AC</span>
        <span class="stat-value">{heroHpState.ac}</span>
      </div>
      <div class="stat" data-testid="player-card-surge">
        <span class="stat-icon">⚡</span>
        <span class="stat-label">Surge</span>
        <span class="stat-value">{heroHpState.surgeValue}</span>
      </div>
      <div class="stat" data-testid="player-card-speed">
        <span class="stat-icon">🏃</span>
        <span class="stat-label">Spd</span>
        <span class="stat-value">{hero.speed}</span>
      </div>
    </div>

    <!-- Attack Info -->
    <div class="attack-info" data-testid="player-card-attack">
      <span class="attack-icon">⚔️</span>
      <span class="attack-name">{hero.attack.name}</span>
      <span class="attack-bonus">+{heroHpState.attackBonus}</span>
      <span class="attack-damage">{hero.attack.damage} dmg</span>
    </div>
  </div>

  <!-- Power Cards Section -->
  {#if powerCards.length > 0}
    <div class="power-cards-section" data-testid="player-card-powers">
      {#each powerCards as { card, isFlipped } (card.id)}
        <div 
          class="power-card-mini"
          class:flipped={isFlipped}
          title="{card.name} ({card.type})"
          style="border-color: {getPowerCardColor(card.type)};"
        >
          <span class="power-type" style="background-color: {getPowerCardColor(card.type)};">
            {getPowerCardAbbrev(card.type)}
          </span>
          <span class="power-name">{card.name}</span>
          {#if isFlipped}
            <span class="flipped-indicator">✗</span>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <!-- Treasure Items Section -->
  {#if treasureItems.length > 0}
    <div class="treasure-items-section" data-testid="player-card-items">
      {#each treasureItems as { card, isFlipped } (card.id)}
        <div 
          class="treasure-item-mini"
          class:flipped={isFlipped}
          title="{card.name}: {card.effect.description}"
        >
          <span class="treasure-icon">{getTreasureIcon(card.effect.type)}</span>
          <span class="treasure-name">{card.name}</span>
          {#if isFlipped}
            <span class="flipped-indicator">✗</span>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <!-- Party Surge Counter (shown when surges are available) -->
  {#if partySurges !== undefined}
    <div class="party-surge-section" data-testid="player-card-surges">
      <span class="surge-icon">❤️‍🩹</span>
      <span class="surge-label">Party Surges:</span>
      <span class="surge-count" class:no-surges={noSurgesRemaining}>{partySurges}</span>
      {#if noSurgesRemaining}
        <span class="surge-warning">⚠️</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .player-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
    border-radius: 8px;
    background: rgba(30, 30, 50, 0.95);
    border: 2px solid rgba(100, 100, 130, 0.5);
    min-width: 180px;
    max-width: 280px;
    transition: all 0.3s ease-out;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .player-card.active {
    border-color: #ffd700;
    background: rgba(40, 40, 60, 0.95);
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
  }

  /* Header */
  .card-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .hero-portrait {
    width: 48px;
    height: 48px;
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
    gap: 0.1rem;
    min-width: 0;
  }

  .hero-name {
    font-size: 0.95rem;
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
    font-size: 0.7rem;
    color: #aaa;
  }

  .hero-level {
    font-size: 0.65rem;
    font-weight: bold;
    color: #ffd700;
    background: rgba(255, 215, 0, 0.2);
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    width: fit-content;
  }

  .turn-badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.25rem 0.4rem;
    background: rgba(255, 215, 0, 0.2);
    border: 1px solid rgba(255, 215, 0, 0.4);
    border-radius: 4px;
    flex-shrink: 0;
  }

  .turn-phase {
    font-size: 0.6rem;
    color: #8ecae6;
    font-weight: bold;
  }

  .turn-number {
    font-size: 0.55rem;
    color: #aaa;
  }

  /* Stats Section */
  .stats-section {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  /* HP Container */
  .hp-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .hp-bar-background {
    flex: 1;
    height: 8px;
    background: rgba(100, 100, 100, 0.4);
    border-radius: 4px;
    overflow: hidden;
  }

  .hp-bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease-out, background-color 0.3s ease-out;
  }

  .hp-text {
    font-size: 0.75rem;
    font-weight: bold;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 0.2rem;
    min-width: 50px;
    justify-content: flex-end;
  }

  .hp-icon {
    font-size: 0.65rem;
  }

  /* Core Stats */
  .core-stats {
    display: flex;
    justify-content: space-between;
    gap: 0.25rem;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.25rem 0.4rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    flex: 1;
  }

  .stat-icon {
    font-size: 0.7rem;
  }

  .stat-label {
    font-size: 0.55rem;
    color: #888;
    text-transform: uppercase;
  }

  .stat-value {
    font-size: 0.85rem;
    font-weight: bold;
    color: #fff;
  }

  /* Attack Info */
  .attack-info {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.25rem 0.4rem;
    background: rgba(139, 69, 19, 0.3);
    border: 1px solid rgba(139, 69, 19, 0.5);
    border-radius: 4px;
    font-size: 0.7rem;
  }

  .attack-icon {
    font-size: 0.75rem;
  }

  .attack-name {
    color: #fff;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .attack-bonus {
    color: #4ade80;
    font-weight: bold;
  }

  .attack-damage {
    color: #f97316;
    font-weight: bold;
  }

  /* Power Cards Section */
  .power-cards-section {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    border-top: 1px solid rgba(100, 100, 130, 0.3);
    padding-top: 0.4rem;
  }

  .power-card-mini {
    display: flex;
    align-items: center;
    gap: 0.2rem;
    padding: 0.15rem 0.3rem;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid;
    border-radius: 3px;
    font-size: 0.55rem;
    max-width: 100%;
    overflow: hidden;
    transition: opacity 0.2s ease;
  }

  .power-card-mini.flipped {
    opacity: 0.4;
  }

  .power-type {
    font-size: 0.5rem;
    font-weight: bold;
    color: #fff;
    padding: 0.1rem 0.2rem;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .power-name {
    color: #ddd;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .flipped-indicator {
    color: #e53935;
    font-weight: bold;
    flex-shrink: 0;
  }

  /* Treasure Items Section */
  .treasure-items-section {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    border-top: 1px solid rgba(255, 215, 0, 0.3);
    padding-top: 0.4rem;
  }

  .treasure-item-mini {
    display: flex;
    align-items: center;
    gap: 0.2rem;
    padding: 0.15rem 0.3rem;
    background: rgba(139, 115, 85, 0.3);
    border: 1px solid rgba(255, 215, 0, 0.5);
    border-radius: 3px;
    font-size: 0.55rem;
    max-width: 100%;
    overflow: hidden;
    transition: opacity 0.2s ease;
  }

  .treasure-item-mini.flipped {
    opacity: 0.4;
    border-style: dashed;
  }

  .treasure-icon {
    font-size: 0.6rem;
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
    font-size: 1.2rem;
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
    padding: 0.1rem;
  }

  /* Conditions Section */
  .conditions-section {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    padding: 0.25rem 0;
  }

  .condition-badge {
    display: flex;
    align-items: center;
    gap: 0.2rem;
    padding: 0.15rem 0.4rem;
    background: rgba(156, 39, 176, 0.3);
    border: 1px solid rgba(156, 39, 176, 0.6);
    border-radius: 12px;
    font-size: 0.6rem;
    cursor: help;
    transition: all 0.2s ease;
  }

  .condition-badge:hover {
    background: rgba(156, 39, 176, 0.5);
  }

  .condition-icon {
    font-size: 0.7rem;
  }

  .condition-name {
    color: #ce93d8;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* Party Surge Section */
  .party-surge-section {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.3rem 0.4rem;
    background: rgba(231, 76, 60, 0.15);
    border: 1px solid rgba(231, 76, 60, 0.3);
    border-radius: 4px;
    font-size: 0.65rem;
  }

  .party-surge-section .surge-icon {
    font-size: 0.75rem;
  }

  .party-surge-section .surge-label {
    color: #e74c3c;
    font-weight: bold;
  }

  .party-surge-section .surge-count {
    color: #fff;
    font-weight: bold;
    font-size: 0.8rem;
    min-width: 1rem;
    text-align: center;
  }

  .party-surge-section .surge-count.no-surges {
    color: #ff5252;
  }

  .party-surge-section .surge-warning {
    font-size: 0.7rem;
    animation: blink 1s ease-in-out infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  /* Respect user's reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    .ko-text {
      animation: none;
    }

    .party-surge-section .surge-warning {
      animation: none;
    }
  }
</style>
