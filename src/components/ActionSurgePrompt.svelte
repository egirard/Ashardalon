<script lang="ts">
  import { AVAILABLE_HEROES } from "../store/types";
  import { assetPath } from "../utils";
  import { HeartIcon, LightningIcon, WarningIcon } from './icons';

  interface Props {
    heroId: string;
    maxHp: number;
    surgeValue: number;
    surgesToRemaining: number;
    onUse: () => void;
    onSkip: () => void;
  }
  
  let { heroId, maxHp, surgeValue, surgesToRemaining, onUse, onSkip }: Props = $props();
  
  function getHeroName(id: string): string {
    return AVAILABLE_HEROES.find(h => h.id === id)?.name ?? "Hero";
  }
  
  function getHeroImage(id: string): string {
    return AVAILABLE_HEROES.find(h => h.id === id)?.imagePath ?? "";
  }
  
  // HP restored is the surge value capped at maxHp (hero is at 0 HP)
  function getActualHpRestored(): number {
    return Math.min(surgeValue, maxHp);
  }
</script>

<div class="action-surge-overlay" data-testid="action-surge-prompt">
  <div class="action-surge-card">
    <h2 class="action-surge-title" data-testid="action-surge-title">Use Healing Surge?</h2>
    
    <div class="hero-section">
      <img 
        src={assetPath(getHeroImage(heroId))} 
        alt={getHeroName(heroId)} 
        class="hero-avatar"
      />
      <span class="hero-name" data-testid="action-surge-hero-name">{getHeroName(heroId)}</span>
    </div>
    
    <div class="hp-status hp-status-danger">
      <WarningIcon size={16} ariaLabel="Warning" />
      <span class="hp-label">Hero is at 0 HP!</span>
    </div>
    
    <div class="surge-info">
      <div class="surge-row">
        <HeartIcon size={20} ariaLabel="Healing" />
        <span class="surge-text">Heal <strong data-testid="heal-amount">+{getActualHpRestored()} HP</strong></span>
      </div>
      <div class="surge-row">
        <LightningIcon size={20} ariaLabel="Surges" />
        <span class="surge-text">Surges remaining: <strong data-testid="surges-remaining">{surgesToRemaining}</strong></span>
      </div>
    </div>
    
    <p class="description warning-text">
      Skipping will result in defeat!
    </p>
    
    <div class="button-row">
      <button 
        class="use-button"
        data-testid="use-action-surge-button"
        onclick={onUse}
      >
        Use Surge
      </button>
      <button 
        class="skip-button skip-danger"
        data-testid="skip-action-surge-button"
        onclick={onSkip}
      >
        Skip (Defeat)
      </button>
    </div>
  </div>
</div>

<style>
  .action-surge-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
    animation: fadeIn 0.3s ease-out;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .action-surge-card {
    background: linear-gradient(145deg, #2d2d2d, #1a1a1a);
    border: 3px solid #f39c12;
    border-radius: 16px;
    padding: 2rem;
    text-align: center;
    min-width: 340px;
    box-shadow: 0 0 30px rgba(243, 156, 18, 0.4);
    animation: slideIn 0.3s ease-out;
  }
  
  @keyframes slideIn {
    from { 
      transform: scale(0.9) translateY(-20px);
      opacity: 0;
    }
    to { 
      transform: scale(1) translateY(0);
      opacity: 1;
    }
  }
  
  .action-surge-title {
    color: #f39c12;
    font-size: 1.6rem;
    margin: 0 0 1.5rem 0;
    text-transform: uppercase;
    letter-spacing: 2px;
    text-shadow: 0 0 10px rgba(243, 156, 18, 0.5);
  }
  
  .hero-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  
  .hero-avatar {
    width: 70px;
    height: 70px;
    object-fit: contain;
    border-radius: 50%;
    border: 3px solid #f39c12;
    background: rgba(243, 156, 18, 0.2);
  }
  
  .hero-name {
    color: #fff;
    font-size: 1.1rem;
    font-weight: bold;
  }
  
  .hp-status {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding: 0.5rem;
    background: rgba(231, 76, 60, 0.2);
    border-radius: 8px;
  }
  
  .hp-label {
    color: #aaa;
    font-size: 0.9rem;
  }
  
  .surge-info {
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: rgba(243, 156, 18, 0.15);
    border-radius: 8px;
    border: 1px solid rgba(243, 156, 18, 0.3);
  }
  
  .surge-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.25rem 0;
  }
  
  .surge-text {
    color: #fff;
    font-size: 1rem;
  }
  
  .surge-text strong {
    color: #f39c12;
  }
  
  .description {
    color: #aaa;
    font-size: 0.85rem;
    margin-bottom: 1.5rem;
    font-style: italic;
  }
  
  .button-row {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }
  
  .use-button {
    background: linear-gradient(145deg, #e74c3c, #c0392b);
    color: #fff;
    border: 2px solid #e74c3c;
    border-radius: 8px;
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease-out;
    min-width: 44px;
    min-height: 44px;
  }
  
  .use-button:hover {
    background: linear-gradient(145deg, #f15a4c, #d44435);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
  }
  
  .skip-button {
    background: linear-gradient(145deg, #444, #333);
    color: #ccc;
    border: 2px solid #555;
    border-radius: 8px;
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease-out;
    min-width: 44px;
    min-height: 44px;
  }
  
  .skip-button:hover {
    background: linear-gradient(145deg, #555, #444);
    color: #fff;
    transform: translateY(-2px);
  }
  
  .hp-status-danger {
    background: rgba(231, 76, 60, 0.3);
    border: 1px solid #e74c3c;
  }
  
  .hp-status-danger .hp-label {
    color: #e74c3c;
    font-size: 1rem;
    font-weight: bold;
  }
  
  .warning-text {
    color: #e74c3c;
    font-weight: bold;
    font-style: normal;
  }
  
  .skip-danger {
    background: linear-gradient(145deg, #8e2020, #6b1818);
    color: #ff9999;
    border: 2px solid #8e2020;
  }
  
  .skip-danger:hover {
    background: linear-gradient(145deg, #a52a2a, #8b1a1a);
    color: #fff;
  }
</style>
