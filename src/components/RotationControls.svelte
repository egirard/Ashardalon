<script lang="ts">
  /**
   * Rotation Controls Component
   * Provides rotation arrows on all four sides of a dialog
   * Allows players at different sides of the board to rotate dialog content to face them
   */
  import { RotateArrowIcon } from './icons';
  
  interface Props {
    currentRotation: 0 | 90 | 180 | 270; // Rotation in degrees
    onRotate: (rotation: 0 | 90 | 180 | 270) => void;
  }
  
  let { currentRotation = 0, onRotate }: Props = $props();
  
  // Map rotation to edge position
  const rotationToEdge = {
    0: 'bottom',
    90: 'left',
    180: 'top',
    270: 'right'
  } as const;
  
  // Map edge to rotation
  const edgeToRotation = {
    bottom: 0,
    left: 90,
    top: 180,
    right: 270
  } as const;
  
  // Current edge based on rotation
  let currentEdge = $derived(rotationToEdge[currentRotation]);
  
  function handleRotateTop() {
    onRotate(180);
  }
  
  function handleRotateBottom() {
    onRotate(0);
  }
  
  function handleRotateLeft() {
    onRotate(90);
  }
  
  function handleRotateRight() {
    onRotate(270);
  }
</script>

<div class="rotation-controls" data-testid="rotation-controls">
  <!-- Top arrow -->
  <button
    class="rotation-arrow rotation-arrow-top"
    class:active={currentEdge === 'top'}
    onclick={handleRotateTop}
    aria-label="Rotate to top"
    data-testid="rotate-to-top"
    title="Rotate to face top"
  >
    <RotateArrowIcon size={20} ariaLabel="Rotate to top" />
  </button>
  
  <!-- Right arrow -->
  <button
    class="rotation-arrow rotation-arrow-right"
    class:active={currentEdge === 'right'}
    onclick={handleRotateRight}
    aria-label="Rotate to right"
    data-testid="rotate-to-right"
    title="Rotate to face right"
  >
    <RotateArrowIcon size={20} ariaLabel="Rotate to right" />
  </button>
  
  <!-- Bottom arrow -->
  <button
    class="rotation-arrow rotation-arrow-bottom"
    class:active={currentEdge === 'bottom'}
    onclick={handleRotateBottom}
    aria-label="Rotate to bottom"
    data-testid="rotate-to-bottom"
    title="Rotate to face bottom"
  >
    <RotateArrowIcon size={20} ariaLabel="Rotate to bottom" />
  </button>
  
  <!-- Left arrow -->
  <button
    class="rotation-arrow rotation-arrow-left"
    class:active={currentEdge === 'left'}
    onclick={handleRotateLeft}
    aria-label="Rotate to left"
    data-testid="rotate-to-left"
    title="Rotate to face left"
  >
    <RotateArrowIcon size={20} ariaLabel="Rotate to left" />
  </button>
</div>

<style>
  .rotation-controls {
    position: absolute;
    inset: -40px;
    pointer-events: none;
  }
  
  .rotation-arrow {
    position: absolute;
    background: rgba(255, 255, 255, 0.15);
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    color: rgba(255, 255, 255, 0.5);
    pointer-events: auto;
    backdrop-filter: blur(4px);
  }
  
  .rotation-arrow:hover {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.5);
    color: rgba(255, 255, 255, 0.8);
    transform: scale(1.1);
  }
  
  .rotation-arrow.active {
    background: rgba(255, 215, 0, 0.3);
    border-color: #ffd700;
    color: #ffd700;
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.4);
  }
  
  .rotation-arrow.active:hover {
    background: rgba(255, 215, 0, 0.4);
    border-color: #ffd700;
    transform: scale(1.05);
  }
  
  /* Position arrows on each side */
  .rotation-arrow-top {
    top: 0;
    left: 50%;
    transform: translateX(-50%);
  }
  
  .rotation-arrow-bottom {
    bottom: 0;
    left: 50%;
    transform: translateX(-50%) rotate(180deg);
  }
  
  .rotation-arrow-left {
    left: 0;
    top: 50%;
    transform: translateY(-50%) rotate(-90deg);
  }
  
  .rotation-arrow-right {
    right: 0;
    top: 50%;
    transform: translateY(-50%) rotate(90deg);
  }
  
  /* Hover state adjustments to maintain rotation */
  .rotation-arrow-top:hover {
    transform: translateX(-50%) scale(1.1);
  }
  
  .rotation-arrow-bottom:hover {
    transform: translateX(-50%) rotate(180deg) scale(1.1);
  }
  
  .rotation-arrow-left:hover {
    transform: translateY(-50%) rotate(-90deg) scale(1.1);
  }
  
  .rotation-arrow-right:hover {
    transform: translateY(-50%) rotate(90deg) scale(1.1);
  }
  
  /* Active state adjustments to maintain rotation */
  .rotation-arrow-top.active:hover {
    transform: translateX(-50%) scale(1.05);
  }
  
  .rotation-arrow-bottom.active:hover {
    transform: translateX(-50%) rotate(180deg) scale(1.05);
  }
  
  .rotation-arrow-left.active:hover {
    transform: translateY(-50%) rotate(-90deg) scale(1.05);
  }
  
  .rotation-arrow-right.active:hover {
    transform: translateY(-50%) rotate(90deg) scale(1.05);
  }
</style>
