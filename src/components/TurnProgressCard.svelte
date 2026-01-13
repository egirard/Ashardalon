<script lang="ts">
  import type { GamePhase, HeroTurnActions, IncrementalMovementState, UndoSnapshot } from '../store/types';
  import type { ExplorationPhaseState } from '../store/gameSlice';
  import { CheckIcon, CircleIcon, UndoIcon } from './icons';

  interface Props {
    currentPhase: GamePhase;
    turnNumber: number;
    heroTurnActions?: HeroTurnActions;
    monstersToActivate?: number;
    monstersActivated?: number;
    /** Callback when the end phase button is clicked */
    onEndPhase?: () => void;
    /** Text to display on the end phase button */
    endPhaseButtonText?: string;
    /** Whether the end phase button should be disabled */
    endPhaseButtonDisabled?: boolean;
    /** Incremental movement state for displaying movement progress */
    incrementalMovement?: IncrementalMovementState | null;
    /** Undo snapshot for showing undo button */
    undoSnapshot?: UndoSnapshot | null;
    /** Callback when the complete move button is clicked */
    onCompleteMove?: () => void;
    /** Callback when the undo button is clicked */
    onUndo?: () => void;
    /** Exploration phase state for displaying interactive steps */
    explorationPhaseState?: ExplorationPhaseState | null;
    /** Callback when placing tile step is clicked */
    onPlaceTile?: () => void;
    /** Callback when adding monster step is clicked */
    onAddMonster?: () => void;
  }

  let { 
    currentPhase, 
    turnNumber, 
    heroTurnActions, 
    monstersToActivate = 0, 
    monstersActivated = 0,
    onEndPhase,
    endPhaseButtonText,
    endPhaseButtonDisabled = false,
    incrementalMovement = null,
    undoSnapshot = null,
    onCompleteMove,
    onUndo,
    explorationPhaseState = null,
    onPlaceTile,
    onAddMonster
  }: Props = $props();

  // Define phase information
  const phases = [
    {
      id: 'hero-phase' as GamePhase,
      name: 'Hero Phase',
      description: '', // Removed description as per user request
    },
    {
      id: 'exploration-phase' as GamePhase,
      name: 'Exploration Phase',
      description: '', // Removed static description
    },
    {
      id: 'villain-phase' as GamePhase,
      name: 'Villain Phase',
      description: 'Monsters activate and attack',
    },
  ];

  // Check if a phase is completed (appears before current phase in the list)
  function isPhaseCompleted(phaseId: GamePhase): boolean {
    const phaseOrder: GamePhase[] = ['hero-phase', 'exploration-phase', 'villain-phase'];
    const currentIndex = phaseOrder.indexOf(currentPhase);
    const checkIndex = phaseOrder.indexOf(phaseId);
    return checkIndex < currentIndex;
  }

  // Get phase name with action count for hero phase
  function getPhaseName(phaseId: GamePhase): string {
    // Only show action counter when:
    // 1. Rendering the hero phase item
    // 2. Currently IN the hero phase
    if (phaseId === 'hero-phase' && currentPhase === 'hero-phase' && heroTurnActions) {
      const actionsTaken = heroTurnActions.actionsTaken.length;
      const totalActions = 2;
      return `Hero Phase (${actionsTaken} of ${totalActions} actions)`;
    }
    return phases.find(p => p.id === phaseId)?.name || '';
  }

  // Get phase-specific detail text
  function getPhaseDetail(phaseId: GamePhase): string | null {
    if (phaseId !== currentPhase) return null;

    switch (phaseId) {
      case 'hero-phase':
        // Removed "Ready to act" text as per user request
        return null;

      case 'exploration-phase':
        // Don't show detail text for exploration phase (handled by steps)
        return null;

      case 'villain-phase':
        if (monstersToActivate > 0) {
          return `${monstersActivated}/${monstersToActivate} monsters`;
        }
        return null;

      default:
        return null;
    }
  }
</script>

<div class="turn-progress-card" data-testid="turn-progress-card">
  <div class="phases-list">
    {#each phases as phase (phase.id)}
      <div 
        class="phase-item" 
        class:active={phase.id === currentPhase}
        data-testid="phase-{phase.id}"
      >
        <div class="phase-indicator">
          {#if phase.id === currentPhase}
            <div class="active-indicator" data-testid="active-phase-indicator">
              <CircleIcon size={16} color="#ffd700" ariaLabel="Active" />
            </div>
          {:else if isPhaseCompleted(phase.id)}
            <div class="completed-indicator" data-testid="completed-phase-indicator">
              <CheckIcon size={16} color="#4caf50" ariaLabel="Complete" />
            </div>
          {:else}
            <div class="inactive-indicator">
              <CircleIcon size={12} color="#666" ariaLabel="Inactive" />
            </div>
          {/if}
        </div>
        
        <div class="phase-content">
          <div class="phase-name">{getPhaseName(phase.id)}</div>
          {#if phase.description}
            <div class="phase-description">{phase.description}</div>
          {/if}
          {#if getPhaseDetail(phase.id)}
            <div class="phase-detail" data-testid="phase-detail-{phase.id}">
              {getPhaseDetail(phase.id)}
            </div>
          {/if}
          
          <!-- Exploration Steps (shown only for active exploration phase) -->
          {#if phase.id === currentPhase && currentPhase === 'exploration-phase' && explorationPhaseState}
            {#if explorationPhaseState.step === 'skipped'}
              <div class="exploration-step skipped" data-testid="exploration-skipped">
                Not on edge - phase skipped
              </div>
            {:else if explorationPhaseState.step === 'awaiting-tile' || explorationPhaseState.step === 'awaiting-monster' || explorationPhaseState.step === 'complete'}
              <!-- Tile step -->
              {#if explorationPhaseState.step === 'awaiting-tile'}
                <button
                  class="exploration-step clickable active"
                  data-testid="exploration-step-place-tile"
                  onclick={onPlaceTile}
                >
                  <CircleIcon size={12} color="#4caf50" ariaLabel="Pending" />
                  <span>Add new tile</span>
                </button>
              {:else}
                <div class="exploration-step completed" data-testid="exploration-step-tile-placed">
                  <CheckIcon size={12} color="#4caf50" ariaLabel="Complete" />
                  <span>New tile placed</span>
                </div>
              {/if}
              
              <!-- Monster step -->
              {#if explorationPhaseState.step === 'awaiting-tile'}
                <div class="exploration-step pending-inactive" data-testid="exploration-step-monster-pending">
                  <CircleIcon size={12} color="#666" ariaLabel="Not ready" />
                  <span>Add monster</span>
                </div>
              {:else if explorationPhaseState.step === 'awaiting-monster'}
                <button
                  class="exploration-step clickable active"
                  data-testid="exploration-step-add-monster"
                  onclick={onAddMonster}
                >
                  <CircleIcon size={12} color="#4caf50" ariaLabel="Pending" />
                  <span>Add monster</span>
                </button>
              {:else if explorationPhaseState.step === 'complete'}
                <div class="exploration-step completed" data-testid="exploration-step-monster-added">
                  <CheckIcon size={12} color="#4caf50" ariaLabel="Complete" />
                  <span>Monster added</span>
                </div>
              {/if}
            {/if}
          {/if}
          
          <!-- Movement Controls (shown only for active hero phase with incremental movement) -->
          {#if phase.id === currentPhase && currentPhase === 'hero-phase' && incrementalMovement?.inProgress}
            <div class="movement-info" data-testid="movement-info">
              <span class="movement-icon">🏃</span>
              <span class="movement-text">{incrementalMovement.remainingMovement} of {incrementalMovement.totalSpeed};</span>
              {#if onCompleteMove}
                <button
                  class="movement-action-button"
                  data-testid="complete-move-button"
                  onclick={onCompleteMove}
                  aria-label="Complete Move"
                >
                  <CheckIcon size={12} color="#fff" ariaLabel="" />
                </button>
              {/if}
              {#if undoSnapshot && onUndo}
                <button
                  class="movement-action-button undo-button"
                  data-testid="undo-button"
                  onclick={onUndo}
                  aria-label="Undo"
                >
                  <UndoIcon size={12} color="#fff" ariaLabel="" />
                </button>
              {/if}
            </div>
          {/if}
          
          <!-- End Phase Button (shown only for active phase, but NOT for exploration phase) -->
          {#if phase.id === currentPhase && phase.id !== 'exploration-phase' && onEndPhase && endPhaseButtonText}
            <button
              class="end-phase-button"
              data-testid="end-phase-button"
              onclick={onEndPhase}
              disabled={endPhaseButtonDisabled}
            >
              {endPhaseButtonText}
            </button>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .turn-progress-card {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.6rem;
    border-radius: 6px;
    background: rgba(30, 30, 50, 0.95);
    border: 2px solid rgba(100, 100, 130, 0.5);
    min-width: 200px;
    max-width: 280px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .phases-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .phase-item {
    display: flex;
    align-items: flex-start;
    gap: 0.4rem;
    padding: 0.4rem;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.2);
    transition: all 0.3s ease;
  }

  .phase-item.active {
    background: rgba(255, 215, 0, 0.15);
    border: 1px solid rgba(255, 215, 0, 0.4);
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.2);
  }

  .phase-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    padding-top: 0.1rem;
  }

  .active-indicator {
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.7;
      transform: scale(1.1);
    }
  }

  .phase-content {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    flex: 1;
    min-width: 0;
  }

  .phase-name {
    font-size: 0.75rem;
    font-weight: bold;
    color: #fff;
  }

  .phase-item.active .phase-name {
    color: #ffd700;
  }

  .phase-description {
    font-size: 0.6rem;
    color: #aaa;
    line-height: 1.3;
  }

  .phase-item.active .phase-description {
    color: #ccc;
  }

  .phase-detail {
    font-size: 0.6rem;
    color: #8ecae6;
    font-weight: bold;
    margin-top: 0.2rem;
    padding: 0.2rem 0.3rem;
    background: rgba(142, 202, 230, 0.1);
    border-radius: 3px;
  }

  /* Exploration steps */
  .exploration-step {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.65rem;
    padding: 0.3rem 0.4rem;
    margin-top: 0.2rem;
    border-radius: 3px;
    color: #fff;
  }

  .exploration-step.skipped {
    background: rgba(128, 128, 128, 0.2);
    color: #999;
    border: 1px solid rgba(128, 128, 128, 0.3);
  }

  .exploration-step.clickable {
    cursor: pointer;
    transition: all 0.2s ease-out;
    text-align: left;
    font-family: inherit;
    font-weight: bold;
    width: 100%;
    border: 1px solid rgba(76, 175, 80, 0.5);
  }

  /* Active clickable step - bright green */
  .exploration-step.clickable.active {
    background: rgba(76, 175, 80, 0.4);
    border-color: #4caf50;
  }

  .exploration-step.clickable.active:hover {
    background: rgba(76, 175, 80, 0.6);
    border-color: #66bb6a;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(76, 175, 80, 0.4);
  }

  /* Pending inactive step - dim */
  .exploration-step.pending-inactive {
    background: rgba(46, 125, 50, 0.15);
    border: 1px solid rgba(76, 175, 80, 0.2);
    color: #888;
    opacity: 0.6;
  }

  .exploration-step.completed {
    background: rgba(46, 125, 50, 0.2);
    border: 1px solid rgba(76, 175, 80, 0.4);
    color: #4caf50;
    font-weight: bold;
  }

  /* Movement controls */
  .movement-info {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    margin-top: 0.3rem;
    padding: 0.3rem 0.4rem;
    background: rgba(30, 144, 255, 0.15);
    border: 1px solid rgba(30, 144, 255, 0.4);
    border-radius: 3px;
    font-size: 0.65rem;
  }

  .movement-icon {
    font-size: 0.8rem;
  }

  .movement-text {
    color: #1e90ff;
    font-weight: bold;
    flex: 1;
  }

  .movement-action-button {
    padding: 0.25rem;
    font-size: 0.6rem;
    font-weight: bold;
    background: rgba(30, 144, 255, 0.8);
    color: #fff;
    border: 1px solid #1e90ff;
    border-radius: 3px;
    cursor: pointer;
    transition: all 0.2s ease-out;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    min-height: 20px;
  }

  .movement-action-button:hover {
    background: rgba(30, 144, 255, 0.95);
    box-shadow: 0 0 5px rgba(30, 144, 255, 0.4);
  }

  .movement-action-button.undo-button {
    background: rgba(255, 165, 0, 0.8);
    border-color: #ffa500;
  }

  .movement-action-button.undo-button:hover {
    background: rgba(255, 165, 0, 0.95);
    box-shadow: 0 0 5px rgba(255, 165, 0, 0.4);
  }

  /* End phase button */
  .end-phase-button {
    width: 100%;
    padding: 0.4rem 0.5rem;
    margin-top: 0.3rem;
    font-size: 0.7rem;
    font-weight: bold;
    background: rgba(46, 125, 50, 0.9);
    color: #fff;
    border: 1px solid #4caf50;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s ease-out;
  }

  .end-phase-button:hover:not(:disabled) {
    background: rgba(76, 175, 80, 0.9);
    border-color: #66bb6a;
    box-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
  }

  .end-phase-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Respect user's reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    .active-indicator {
      animation: none;
    }
    
    .phase-item {
      transition: none;
    }
  }
</style>
