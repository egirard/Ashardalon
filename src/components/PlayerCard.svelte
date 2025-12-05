<script lang="ts">
  import type { Hero, HeroHpState } from '../store/types';
  import type { HeroPowerCards, PowerCard } from '../store/powerCards';
  import { getPowerCardById } from '../store/powerCards';
  import { assetPath } from '../utils';

  interface Props {
    hero: Hero;
    heroHpState: HeroHpState;
    heroPowerCards?: HeroPowerCards;
    isActive: boolean;
    turnPhase?: string;
    turnNumber?: number;
  }

  let { hero, heroHpState, heroPowerCards, isActive, turnPhase, turnNumber }: Props = $props();

  // Get power cards for display
  let powerCards = $derived((): { card: PowerCard; isFlipped: boolean }[] => {
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
  let hpBarColor = $derived(() => {
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
</script>

<div 
  class="player-card" 
  class:active={isActive}
  data-testid={isActive ? "turn-indicator" : `player-dashboard-${hero.id}`}
  data-hero-id={hero.id}
>
  <!-- Header with portrait and name -->
  <div class="card-header">
    <img
      src={assetPath(hero.imagePath)}
      alt={hero.name}
      class="hero-portrait"
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

  <!-- Stats Section -->
  <div class="stats-section">
    <!-- HP Bar -->
    <div class="hp-container" data-testid="hero-hp">
      <div class="hp-bar-background">
        <div 
          class="hp-bar-fill" 
          style="width: {hpPercentage}%; background-color: {hpBarColor()};"
        ></div>
      </div>
      <span class="hp-text">
        <span class="hp-icon">❤️</span>
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
  {#if powerCards().length > 0}
    <div class="power-cards-section" data-testid="player-card-powers">
      {#each powerCards() as { card, isFlipped } (card.id)}
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
</div>

<style>
  .player-card {
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
</style>
