<script lang="ts">
  /**
   * Confirmation Dialog Component
   * A modal dialog for confirming destructive actions
   * Follows the same pattern as MonsterCard and EncounterCard overlays
   * Now supports rotation for multi-player scenarios
   */
  import RotationControls from './RotationControls.svelte';
  
  // Rotation animation duration (must match CSS transition)
  const ROTATION_DURATION = 300; // milliseconds
  
  interface Props {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
  }
  
  let { 
    title, 
    message, 
    confirmText = 'Confirm', 
    cancelText = 'Cancel',
    onConfirm,
    onCancel 
  }: Props = $props();
  
  let overlayElement: HTMLDivElement | undefined = $state();
  let rotation = $state<0 | 90 | 180 | 270>(0);
  let isRotating = $state(false);
  
  // Auto-focus the overlay when it's mounted
  $effect(() => {
    if (overlayElement) {
      overlayElement.focus();
    }
  });
  
  function handleConfirm() {
    onConfirm();
  }
  
  function handleCancel() {
    onCancel();
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
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      handleCancel();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      handleConfirm();
    }
  }
  
  function handleDialogKeydown(event: KeyboardEvent) {
    // Only stop propagation of handled keys to prevent interference with unhandled keys
    if (event.key === 'Escape' || event.key === 'Enter') {
      event.stopPropagation();
    }
  }
</script>

<div 
  bind:this={overlayElement}
  class="confirmation-overlay"
  onkeydown={handleKeydown}
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-message"
  tabindex="0"
  data-testid="confirmation-dialog-overlay"
>
  <div class="dialog-wrapper">
    <RotationControls currentRotation={rotation} onRotate={handleRotate} />
    
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div 
      class="confirmation-dialog" 
      class:rotating={isRotating}
      style="transform: rotate({rotation}deg);"
      onclick={(e) => e.stopPropagation()}
      onkeydown={handleDialogKeydown}
      role="document"
      data-testid="confirmation-dialog"
    >
      <h2 id="dialog-title" class="dialog-title" data-testid="dialog-title">{title}</h2>
      <p id="dialog-message" class="dialog-message" data-testid="dialog-message">{message}</p>
      
      <div class="dialog-actions">
        <button 
          class="dialog-button cancel-button"
          onclick={handleCancel}
          data-testid="dialog-cancel-button"
          aria-label={cancelText}
        >
          {cancelText}
        </button>
        <button 
          class="dialog-button confirm-button"
          onclick={handleConfirm}
          data-testid="dialog-confirm-button"
          aria-label={confirmText}
        >
          {confirmText}
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .confirmation-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    backdrop-filter: blur(4px);
  }
  
  .dialog-wrapper {
    position: relative;
  }
  
  .confirmation-dialog {
    background: linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%);
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 12px;
    padding: 2rem;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 20px rgba(0, 0, 0, 0.9); /* Extra shadow to visually cover arrows */
    transition: transform 0.3s ease-out;
    position: relative;
  }
  
  .confirmation-dialog.rotating {
    transition: transform 0.3s ease-out;
  }
  
  .dialog-title {
    margin: 0 0 1rem 0;
    font-size: 1.5rem;
    color: #fff;
    text-align: center;
  }
  
  .dialog-message {
    margin: 0 0 2rem 0;
    font-size: 1rem;
    color: #ccc;
    text-align: center;
    line-height: 1.5;
  }
  
  .dialog-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }
  
  .dialog-button {
    padding: 0.75rem 2rem;
    font-size: 1rem;
    font-weight: 600;
    border: 2px solid;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 120px;
  }
  
  .cancel-button {
    background: transparent;
    color: #fff;
    border-color: rgba(255, 255, 255, 0.3);
  }
  
  .cancel-button:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-2px);
  }
  
  .confirm-button {
    background: rgba(220, 38, 38, 0.8);
    color: #fff;
    border-color: #dc2626;
  }
  
  .confirm-button:hover {
    background: rgba(220, 38, 38, 1);
    border-color: #ef4444;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
  }
  
  .dialog-button:active {
    transform: translateY(0);
  }
</style>
