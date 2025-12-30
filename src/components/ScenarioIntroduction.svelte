<script lang="ts">
  /**
   * Scenario Introduction Modal
   * Displays scenario information when the map is first shown
   * Now supports rotation for multi-player scenarios
   */
  import RotationControls from './RotationControls.svelte';
  
  // Rotation animation duration (must match CSS transition)
  const ROTATION_DURATION = 300; // milliseconds
  
  interface Props {
    title: string;
    description: string;
    objective: string;
    instructions?: string;
    onDismiss: () => void;
  }
  
  let { title, description, objective, instructions, onDismiss }: Props = $props();
  
  let overlayElement: HTMLDivElement | undefined = $state();
  let rotation = $state<0 | 90 | 180 | 270>(0);
  let isRotating = $state(false);
  
  // Auto-focus the overlay when it's mounted
  $effect(() => {
    if (overlayElement) {
      overlayElement.focus();
    }
  });
  
  function handleDismiss() {
    onDismiss();
  }
  
  function handleRotate(newRotation: 0 | 90 | 180 | 270) {
    if (newRotation !== rotation) {
      isRotating = true;
      rotation = newRotation;
      
      // Reset rotation animation flag after animation completes
      setTimeout(() => {
        isRotating = false;
      }, ROTATION_DURATION);
    }
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' || event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      handleDismiss();
    }
  }
  
  function handleDialogKeydown(event: KeyboardEvent) {
    // Stop propagation of handled keys to prevent interference
    if (event.key === 'Escape' || event.key === 'Enter') {
      event.stopPropagation();
    }
  }
</script>

<div 
  bind:this={overlayElement}
  class="scenario-overlay"
  onkeydown={handleKeydown}
  role="dialog"
  aria-modal="true"
  aria-labelledby="scenario-title"
  aria-describedby="scenario-description"
  tabindex="0"
  data-testid="scenario-introduction-overlay"
>
  <div class="modal-wrapper">
    <RotationControls currentRotation={rotation} onRotate={handleRotate} />
    
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div 
      class="scenario-modal"
      class:rotating={isRotating}
      style="transform: rotate({rotation}deg);"
      onclick={(e) => e.stopPropagation()}
      onkeydown={handleDialogKeydown}
      role="document"
      data-testid="scenario-introduction-modal"
    >
      <div class="modal-header">
        <h1 id="scenario-title" class="scenario-title" data-testid="scenario-title">{title}</h1>
      </div>
      
      <div class="modal-content">
        <p id="scenario-description" class="scenario-description" data-testid="scenario-description">{description}</p>
        
        <div class="objective-section">
          <h2 class="section-label">Objective:</h2>
          <p class="objective-text" data-testid="scenario-objective">{objective}</p>
        </div>
        
        {#if instructions}
          <div class="instructions-section">
            <h2 class="section-label">Instructions:</h2>
            <p class="instructions-text" data-testid="scenario-instructions">{instructions}</p>
          </div>
        {/if}
      </div>
      
      <div class="modal-actions">
        <button 
          class="start-button"
          onclick={handleDismiss}
          data-testid="start-scenario-button"
          aria-label="Begin scenario"
        >
          Begin Adventure
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .scenario-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2100;
    backdrop-filter: blur(6px);
    animation: fadeIn 0.3s ease-out;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  .modal-wrapper {
    position: relative;
  }
  
  .scenario-modal {
    background: linear-gradient(135deg, #2d2020 0%, #1a1010 100%);
    border: 3px solid rgba(184, 134, 11, 0.5);
    border-radius: 16px;
    padding: 0;
    max-width: 700px;
    width: 90%;
    max-height: 85vh;
    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.8), 0 0 20px rgba(184, 134, 11, 0.3);
    display: flex;
    flex-direction: column;
    animation: slideIn 0.4s ease-out;
    transition: transform 0.3s ease-out;
  }
  
  .scenario-modal.rotating {
    transition: transform 0.3s ease-out;
  }
  
  @keyframes slideIn {
    from {
      transform: translateY(-30px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  .modal-header {
    background: linear-gradient(135deg, rgba(184, 134, 11, 0.2) 0%, rgba(139, 69, 19, 0.2) 100%);
    border-bottom: 2px solid rgba(184, 134, 11, 0.4);
    padding: 2rem;
    border-radius: 14px 14px 0 0;
  }
  
  .scenario-title {
    margin: 0;
    font-size: 2.5rem;
    color: #f4d03f;
    text-align: center;
    font-weight: 700;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    letter-spacing: 0.5px;
  }
  
  .modal-content {
    padding: 2rem;
    overflow-y: auto;
    flex: 1;
  }
  
  .scenario-description {
    margin: 0 0 1.5rem 0;
    font-size: 1.125rem;
    color: #e5e5e5;
    line-height: 1.7;
    text-align: left;
  }
  
  .objective-section,
  .instructions-section {
    margin-top: 1.5rem;
    padding: 1.25rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(184, 134, 11, 0.3);
    border-radius: 8px;
  }
  
  .section-label {
    margin: 0 0 0.75rem 0;
    font-size: 1.25rem;
    color: #f4d03f;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  
  .objective-text,
  .instructions-text {
    margin: 0;
    font-size: 1rem;
    color: #d0d0d0;
    line-height: 1.6;
  }
  
  .modal-actions {
    padding: 1.5rem 2rem;
    border-top: 2px solid rgba(184, 134, 11, 0.3);
    display: flex;
    justify-content: center;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 0 0 14px 14px;
  }
  
  .start-button {
    padding: 1rem 3rem;
    font-size: 1.25rem;
    font-weight: 700;
    background: linear-gradient(135deg, #b8860b 0%, #8b4513 100%);
    color: #fff;
    border: 2px solid #f4d03f;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-transform: uppercase;
    letter-spacing: 1px;
    box-shadow: 0 4px 12px rgba(184, 134, 11, 0.4);
  }
  
  .start-button:hover {
    background: linear-gradient(135deg, #d4a017 0%, #a0522d 100%);
    border-color: #ffd700;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(184, 134, 11, 0.6);
  }
  
  .start-button:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(184, 134, 11, 0.4);
  }
  
  /* Scrollbar styling */
  .modal-content::-webkit-scrollbar {
    width: 8px;
  }
  
  .modal-content::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }
  
  .modal-content::-webkit-scrollbar-thumb {
    background: rgba(184, 134, 11, 0.5);
    border-radius: 4px;
  }
  
  .modal-content::-webkit-scrollbar-thumb:hover {
    background: rgba(184, 134, 11, 0.7);
  }
</style>
