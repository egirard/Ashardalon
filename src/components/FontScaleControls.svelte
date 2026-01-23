<script lang="ts">
  /**
   * Font Scale Controls Component
   * Provides UI for adjusting font scale for player panels
   * Displays as a compact control panel with +/- buttons and current scale
   */
  import { store } from '../store';
  import { increaseFontScale, decreaseFontScale, resetFontScale } from '../store/uiSlice';
  
  interface Props {
    /** Position where controls are displayed */
    position: 'nw' | 'se';
    /** Callback when font scale changes */
    onScaleChange?: (scale: number) => void;
  }
  
  let { position, onScaleChange }: Props = $props();
  
  // Subscribe to font scale from Redux store
  let fontScale = $derived(store.getState().ui.fontScale);
  
  // Update whenever store changes
  store.subscribe(() => {
    fontScale = store.getState().ui.fontScale;
  });
  
  function handleIncrease() {
    store.dispatch(increaseFontScale());
    if (onScaleChange) {
      onScaleChange(store.getState().ui.fontScale);
    }
  }
  
  function handleDecrease() {
    store.dispatch(decreaseFontScale());
    if (onScaleChange) {
      onScaleChange(store.getState().ui.fontScale);
    }
  }
  
  function handleReset() {
    store.dispatch(resetFontScale());
    if (onScaleChange) {
      onScaleChange(store.getState().ui.fontScale);
    }
  }
  
  // Format scale as percentage
  const scalePercentage = $derived(Math.round(fontScale * 100));
</script>

<div 
  class="font-scale-controls" 
  class:position-nw={position === 'nw'}
  class:position-se={position === 'se'}
  data-testid="font-scale-controls"
>
  <div class="controls-header">
    <span class="controls-title">UI Scale</span>
    <button 
      class="reset-button"
      onclick={handleReset}
      title="Reset to 100%"
      disabled={fontScale === 1.0}
      data-testid="font-scale-reset"
    >
      Reset
    </button>
  </div>
  
  <div class="controls-body">
    <button 
      class="scale-button decrease"
      onclick={handleDecrease}
      disabled={fontScale <= 0.8}
      aria-label="Decrease UI scale"
      title="Decrease UI scale"
      data-testid="font-scale-decrease"
    >
      −
    </button>
    
    <div class="scale-display" data-testid="font-scale-value">
      {scalePercentage}%
    </div>
    
    <button 
      class="scale-button increase"
      onclick={handleIncrease}
      disabled={fontScale >= 1.5}
      aria-label="Increase UI scale"
      title="Increase UI scale"
      data-testid="font-scale-increase"
    >
      +
    </button>
  </div>
</div>

<style>
  .font-scale-controls {
    position: absolute;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.85);
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    backdrop-filter: blur(4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    z-index: 1000;
    min-width: 140px;
  }
  
  .font-scale-controls.position-nw {
    top: 3.5rem;
    left: 0.5rem;
    transform: rotate(180deg);
  }
  
  .font-scale-controls.position-se {
    bottom: 3.5rem;
    right: 0.5rem;
  }
  
  .controls-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }
  
  .controls-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: #fff;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .reset-button {
    font-size: 0.65rem;
    padding: 0.2rem 0.4rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    color: #fff;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .reset-button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.4);
  }
  
  .reset-button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  
  .controls-body {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .scale-button {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    color: #fff;
    font-size: 1.2rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .scale-button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.4);
    transform: translateY(-1px);
  }
  
  .scale-button:active:not(:disabled) {
    transform: translateY(0);
  }
  
  .scale-button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  
  .scale-display {
    flex: 1;
    text-align: center;
    font-size: 1rem;
    font-weight: bold;
    color: #ffd700;
    padding: 0.25rem;
  }
</style>
