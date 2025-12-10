<script lang="ts">
  import type { HeroHpState } from '../store/types';
  import { AVAILABLE_HEROES } from '../store/types';
  import { assetPath } from '../utils';
  import { StarIcon, SwordIcon } from './icons';
  
  interface Props {
    heroId: string;
    oldStats: HeroHpState;
    newStats: HeroHpState;
    onDismiss?: () => void;
  }
  
  let { heroId, oldStats, newStats, onDismiss }: Props = $props();
  
  // Get hero info for display
  const hero = AVAILABLE_HEROES.find(h => h.id === heroId);
  
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
</script>

<div 
  class="level-up-overlay"
  onclick={handleDismiss}
  onkeydown={handleKeydown}
  role="dialog"
  aria-modal="true"
  aria-label="Level up notification"
  tabindex="0"
  data-testid="level-up-overlay"
>
  <div 
    class="level-up-notification" 
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => {
      // Only stop propagation for keys that are handled by the parent overlay
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.stopPropagation();
      }
    }}
    role="dialog"
    aria-labelledby="level-up-title"
    tabindex="-1"
    data-testid="level-up-notification"
  >
    <div class="level-up-header">
      <span class="level-up-icon">✨</span>
      <h3 class="level-up-title" id="level-up-title" data-testid="level-up-title">LEVEL UP!</h3>
      <span class="level-up-icon">✨</span>
      <button 
        class="dismiss-button" 
        onclick={handleDismiss}
        aria-label="Dismiss notification"
        data-testid="dismiss-level-up"
      >
        ✕
      </button>
    </div>
    
    {#if hero}
      <div class="hero-section">
        <img src={assetPath(hero.imagePath)} alt={hero.name} class="hero-avatar" />
        <div class="hero-level-info">
          <span class="hero-name" data-testid="level-up-hero-name">{hero.name}</span>
          <span class="level-badge" data-testid="level-badge">Level {newStats.level}</span>
        </div>
      </div>
    {/if}
    
    <div class="stats-section" data-testid="stats-section">
      <div class="stat-change">
        <span class="stat-label">HP</span>
        <span class="stat-old" data-testid="old-hp">{oldStats.maxHp}</span>
        <span class="stat-arrow">→</span>
        <span class="stat-new" data-testid="new-hp">{newStats.maxHp}</span>
      </div>
      <div class="stat-change">
        <span class="stat-label">AC</span>
        <span class="stat-old" data-testid="old-ac">{oldStats.ac}</span>
        <span class="stat-arrow">→</span>
        <span class="stat-new" data-testid="new-ac">{newStats.ac}</span>
      </div>
      <div class="stat-change">
        <span class="stat-label">Surge</span>
        <span class="stat-old" data-testid="old-surge">{oldStats.surgeValue}</span>
        <span class="stat-arrow">→</span>
        <span class="stat-new" data-testid="new-surge">{newStats.surgeValue}</span>
      </div>
      <div class="stat-change">
        <span class="stat-label">Attack</span>
        <span class="stat-old" data-testid="old-attack">+{oldStats.attackBonus}</span>
        <span class="stat-arrow">→</span>
        <span class="stat-new" data-testid="new-attack">+{newStats.attackBonus}</span>
      </div>
    </div>
    
    <div class="xp-spent-section" data-testid="xp-spent-section">
      <StarIcon size={20} ariaLabel="Experience spent" />
      <span class="xp-text">5 XP spent</span>
    </div>
    
    <div class="critical-bonus-section" data-testid="critical-bonus">
      <SwordIcon size={20} ariaLabel="Critical bonus" />
      <span class="bonus-text">Critical attacks now deal +1 damage!</span>
    </div>
    
    <button 
      class="continue-button"
      onclick={handleDismiss}
      data-testid="continue-button"
    >
      Continue
    </button>
    
    <p class="dismiss-hint">Click anywhere to dismiss</p>
  </div>
</div>

<style>
  .level-up-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 110;
    cursor: pointer;
  }
  
  .level-up-notification {
    background: linear-gradient(145deg, #2e2a1a 0%, #2b2616 100%);
    border: 3px solid #ffd700;
    border-radius: 12px;
    padding: 1.5rem;
    min-width: 320px;
    max-width: 400px;
    cursor: default;
    animation: levelUpBounce 0.5s ease-out;
    box-shadow: 0 0 40px rgba(255, 215, 0, 0.5), 0 8px 32px rgba(0, 0, 0, 0.5);
  }
  
  @keyframes levelUpBounce {
    0% {
      opacity: 0;
      transform: scale(0.5);
    }
    60% {
      transform: scale(1.1);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  .level-up-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    position: relative;
  }
  
  .level-up-icon {
    font-size: 1.5rem;
    animation: sparkle 1s ease-in-out infinite;
  }
  
  @keyframes sparkle {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.7;
      transform: scale(1.2);
    }
  }
  
  .level-up-title {
    margin: 0;
    font-size: 1.5rem;
    color: #ffd700;
    font-weight: bold;
    text-shadow: 0 0 15px rgba(255, 215, 0, 0.7);
    letter-spacing: 0.1em;
  }
  
  .dismiss-button {
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
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
  
  .hero-section {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: rgba(255, 215, 0, 0.1);
    border-radius: 8px;
    border: 1px solid rgba(255, 215, 0, 0.3);
  }
  
  .hero-avatar {
    width: 60px;
    height: 60px;
    object-fit: contain;
    border-radius: 50%;
    border: 2px solid #ffd700;
    background: rgba(0, 0, 0, 0.5);
    animation: glowPulse 2s ease-in-out infinite;
  }
  
  @keyframes glowPulse {
    0%, 100% {
      box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
    }
    50% {
      box-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
    }
  }
  
  .hero-level-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .hero-name {
    font-size: 1.25rem;
    font-weight: bold;
    color: #fff;
  }
  
  .level-badge {
    font-size: 0.9rem;
    color: #ffd700;
    font-weight: bold;
    background: rgba(255, 215, 0, 0.2);
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    text-align: center;
  }
  
  .stats-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
  }
  
  .stat-change {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
  }
  
  .stat-label {
    color: #888;
    min-width: 50px;
  }
  
  .stat-old {
    color: #999;
    text-decoration: line-through;
  }
  
  .stat-arrow {
    color: #ffd700;
  }
  
  .stat-new {
    color: #4ade80;
    font-weight: bold;
  }
  
  .xp-spent-section {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    font-size: 0.9rem;
    color: #f4a261;
  }
  
  .xp-text {
    font-weight: bold;
  }
  
  .critical-bonus-section {
    text-align: center;
    margin-bottom: 1rem;
    padding: 0.5rem;
    background: rgba(255, 100, 100, 0.1);
    border-radius: 4px;
    border: 1px solid rgba(255, 100, 100, 0.3);
  }
  
  .bonus-text {
    color: #ff6464;
    font-size: 0.85rem;
    font-weight: bold;
  }
  
  .continue-button {
    width: 100%;
    padding: 0.75rem;
    font-size: 1rem;
    font-weight: bold;
    background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
    color: #1a1a2e;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease-out;
    margin-bottom: 0.5rem;
  }
  
  .continue-button:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
  }
  
  .dismiss-hint {
    text-align: center;
    color: #555;
    font-size: 0.7rem;
    margin: 0;
  }
</style>
