<script lang="ts">
  import { AVAILABLE_HEROES } from "../store/types";
  import { assetPath } from "../utils";

  interface Props {
    heroId: string;
    hpRestored: number;
    onDismiss: () => void;
  }
  
  let { heroId, hpRestored, onDismiss }: Props = $props();
  
  function getHeroName(id: string): string {
    return AVAILABLE_HEROES.find(h => h.id === id)?.name ?? "Hero";
  }
  
  function getHeroImage(id: string): string {
    return AVAILABLE_HEROES.find(h => h.id === id)?.imagePath ?? "";
  }
</script>

<div class="healing-surge-overlay" data-testid="healing-surge-notification">
  <div class="healing-surge-card">
    <h2 class="healing-title" data-testid="healing-title">Healing Surge!</h2>
    
    <div class="hero-section">
      <img 
        src={assetPath(getHeroImage(heroId))} 
        alt={getHeroName(heroId)} 
        class="hero-avatar"
      />
      <span class="hero-name" data-testid="healed-hero-name">{getHeroName(heroId)}</span>
    </div>
    
    <div class="healing-message">
      <span class="was-text">was at 0 HP</span>
    </div>
    
    <div class="hp-restored-section" data-testid="hp-restored-section">
      <span class="hp-icon">❤️</span>
      <span class="hp-value">+{hpRestored} HP</span>
      <span class="hp-text">restored</span>
    </div>
    
    <button 
      class="continue-button"
      data-testid="dismiss-healing-surge"
      onclick={onDismiss}
    >
      Continue
    </button>
  </div>
</div>

<style>
  .healing-surge-overlay {
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
  
  .healing-surge-card {
    background: linear-gradient(145deg, #2d2d2d, #1a1a1a);
    border: 3px solid #e74c3c;
    border-radius: 16px;
    padding: 2rem;
    text-align: center;
    min-width: 320px;
    box-shadow: 0 0 30px rgba(231, 76, 60, 0.4);
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
  
  .healing-title {
    color: #e74c3c;
    font-size: 1.8rem;
    margin: 0 0 1.5rem 0;
    text-transform: uppercase;
    letter-spacing: 2px;
    text-shadow: 0 0 10px rgba(231, 76, 60, 0.5);
  }
  
  .hero-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  
  .hero-avatar {
    width: 80px;
    height: 80px;
    object-fit: contain;
    border-radius: 50%;
    border: 3px solid #e74c3c;
    background: rgba(231, 76, 60, 0.2);
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 10px rgba(231, 76, 60, 0.4); }
    50% { box-shadow: 0 0 20px rgba(231, 76, 60, 0.8); }
  }
  
  .hero-name {
    color: #fff;
    font-size: 1.2rem;
    font-weight: bold;
  }
  
  .healing-message {
    margin-bottom: 1.5rem;
  }
  
  .was-text {
    color: #aaa;
    font-size: 1rem;
  }
  
  .hp-restored-section {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    background: rgba(231, 76, 60, 0.2);
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
  }
  
  .hp-icon {
    font-size: 1.5rem;
  }
  
  .hp-value {
    font-size: 1.5rem;
    font-weight: bold;
    color: #e74c3c;
  }
  
  .hp-text {
    color: #fff;
    font-size: 1rem;
  }
  
  .continue-button {
    background: linear-gradient(145deg, #3a7c3a, #2d5c2d);
    color: #fff;
    border: 2px solid #4caf50;
    border-radius: 8px;
    padding: 0.75rem 2rem;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease-out;
    min-width: 44px;
    min-height: 44px;
  }
  
  .continue-button:hover {
    background: linear-gradient(145deg, #4caf50, #3a8c3a);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
  }
</style>
