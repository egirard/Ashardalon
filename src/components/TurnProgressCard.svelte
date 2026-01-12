<script lang="ts">
  import type { GamePhase, HeroTurnActions, IncrementalMovementState, UndoSnapshot } from '../store/types';
  import { CheckIcon, CircleIcon } from './icons';

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
    onUndo
  }: Props = $props();

  // Define phase information
  const phases = [
    {
      id: 'hero-phase' as GamePhase,
      name: 'Hero Phase',
      description: 'Move and attack with your hero',
    },
    {
      id: 'exploration-phase' as GamePhase,
      name: 'Exploration',
      description: 'Explore unexplored edges',
    },
    {
      id: 'villain-phase' as GamePhase,
      name: 'Villain Phase',
      description: 'Monsters activate and attack',
    },
  ];

  // Get phase-specific detail text
  function getPhaseDetail(phaseId: GamePhase): string | null {
    if (phaseId !== currentPhase) return null;

    switch (phaseId) {
      case 'hero-phase':
        if (heroTurnActions) {
          const actions = heroTurnActions.actionsTaken;
          if (actions.length === 0) {
            return 'Ready to act';
          }
          const actionText = actions.map(a => a === 'move' ? 'Moved' : 'Attacked').join(', ');
          return actionText;
        }
        return null;

      case 'exploration-phase':
        return 'Check for unexplored edges';

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
          {:else}
            <div class="inactive-indicator">
              <CircleIcon size={12} color="#666" ariaLabel="Inactive" />
            </div>
          {/if}
        </div>
        
        <div class="phase-content">
          <div class="phase-name">{phase.name}</div>
          <div class="phase-description">{phase.description}</div>
          {#if getPhaseDetail(phase.id)}
            <div class="phase-detail" data-testid="phase-detail-{phase.id}">
              {getPhaseDetail(phase.id)}
            </div>
          {/if}
          
          <!-- Movement Controls (shown only for active hero phase with incremental movement) -->
          {#if phase.id === 'hero-phase' && phase.id === currentPhase && incrementalMovement?.inProgress}
            <div class="movement-info" data-testid="movement-info">
              <span class="movement-icon">🏃</span>
              <span class="movement-text">{incrementalMovement.remainingMovement} of {incrementalMovement.speed}</span>
              {#if onCompleteMove}
                <button
                  class="movement-action-button"
                  data-testid="complete-move-button"
                  onclick={onCompleteMove}
                  title="Complete Move"
                >
                  End
                </button>
              {/if}
              {#if undoSnapshot && onUndo}
                <button
                  class="movement-action-button undo-button"
                  data-testid="undo-button"
                  onclick={onUndo}
                  title="Undo"
                >
                  Undo
                </button>
              {/if}
            </div>
          {/if}
          
          <!-- End Phase Button (shown only for active phase) -->
          {#if phase.id === currentPhase && onEndPhase && endPhaseButtonText}
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
    padding: 0.2rem 0.4rem;
    font-size: 0.6rem;
    font-weight: bold;
    background: rgba(30, 144, 255, 0.8);
    color: #fff;
    border: 1px solid #1e90ff;
    border-radius: 3px;
    cursor: pointer;
    transition: all 0.2s ease-out;
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
