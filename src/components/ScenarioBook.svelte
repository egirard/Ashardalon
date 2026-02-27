<script lang="ts">
  /**
   * ScenarioBook – lobby scenario selector.
   *
   * Displays a "book" whose current page shows one scenario at a time.
   * Players navigate between scenarios with corner-fold controls (back / forward).
   * The book can be rotated so the player on any side of the table can read it.
   * The "Start Adventure" button is enabled once at least one hero with full power
   * cards is ready.
   */
  import { store } from '../store';
  import { selectScenario } from '../store/gameSlice';
  import { SCENARIOS } from '../store/scenarios';
  import { assetPath } from '../utils';

  interface Props {
    /** Whether the start button should be enabled */
    canStart: boolean;
    onStart: () => void;
  }

  let { canStart, onStart }: Props = $props();

  // Current page index into SCENARIOS
  let pageIndex = $state(0);
  // Current book rotation (facing which side of the table)
  let rotation = $state<0 | 90 | 180 | 270>(0);
  let isRotating = $state(false);

  const ROTATION_DURATION = 500; // ms — slightly slower than modal for a "book" feel

  let currentScenario = $derived(SCENARIOS[pageIndex]);

  const hasPrev = $derived(pageIndex > 0);
  const hasNext = $derived(pageIndex < SCENARIOS.length - 1);

  function navigate(delta: number) {
    const next = pageIndex + delta;
    if (next >= 0 && next < SCENARIOS.length) {
      pageIndex = next;
      store.dispatch(selectScenario(SCENARIOS[next].id));
    }
  }

  function rotateTo(r: 0 | 90 | 180 | 270) {
    if (r === rotation) return;
    isRotating = true;
    rotation = r;
    setTimeout(() => {
      isRotating = false;
    }, ROTATION_DURATION);
  }
</script>

<div
  class="book-wrapper"
  style="transform: rotate({rotation}deg);"
  class:rotating={isRotating}
  data-testid="scenario-book"
>
  <!-- Directional rotation arrows (subtle, on the four sides) -->
  <button
    class="rotate-arrow rotate-top"
    class:disabled={rotation === 180}
    onclick={() => rotateTo(180)}
    aria-label="Rotate book to face top"
    data-testid="book-rotate-top"
    disabled={rotation === 180}
  >▲</button>
  <button
    class="rotate-arrow rotate-bottom"
    class:disabled={rotation === 0}
    onclick={() => rotateTo(0)}
    aria-label="Rotate book to face bottom"
    data-testid="book-rotate-bottom"
    disabled={rotation === 0}
  >▼</button>
  <button
    class="rotate-arrow rotate-left"
    class:disabled={rotation === 90}
    onclick={() => rotateTo(90)}
    aria-label="Rotate book to face left"
    data-testid="book-rotate-left"
    disabled={rotation === 90}
  >◀</button>
  <button
    class="rotate-arrow rotate-right"
    class:disabled={rotation === 270}
    onclick={() => rotateTo(270)}
    aria-label="Rotate book to face right"
    data-testid="book-rotate-right"
    disabled={rotation === 270}
  >▶</button>

  <!-- Book page -->
  <div class="book-page" data-testid="scenario-book-page">
    <!-- Page content -->
    <div class="page-content">
      {#if currentScenario.splashImage}
        <img
          src={assetPath(currentScenario.splashImage)}
          alt={currentScenario.title}
          class="splash-image"
          data-testid="scenario-splash"
        />
      {/if}

      <h2 class="scenario-title" data-testid="scenario-book-title">
        {currentScenario.title}
      </h2>

      <p class="scenario-goal" data-testid="scenario-book-goal">
        <strong>Goal:</strong> {currentScenario.goal}
      </p>

      <p class="scenario-intro" data-testid="scenario-book-intro">
        {currentScenario.intro}
      </p>

      <div class="villain-line" data-testid="scenario-book-villain">
        <span class="villain-label">Villain:</span>
        <span class="villain-name">{currentScenario.villain}</span>
      </div>

      <button
        class="start-button"
        class:ready={canStart}
        onclick={onStart}
        disabled={!canStart}
        data-testid="start-game-button"
        aria-label="Start adventure"
      >
        {canStart ? 'Start Adventure' : 'Choose Heroes to Begin'}
      </button>

      <!-- Page navigation row -->
      <div class="page-nav">
        <button
          class="page-turn prev"
          onclick={() => navigate(-1)}
          disabled={!hasPrev}
          aria-label="Previous scenario"
          data-testid="scenario-prev"
        >◂</button>

        <!-- Page indicator dots -->
        <div class="page-dots" aria-label="Scenario page {pageIndex + 1} of {SCENARIOS.length}">
          {#each SCENARIOS as _, i (i)}
            <span class="dot" class:active={i === pageIndex}></span>
          {/each}
        </div>

        <button
          class="page-turn next"
          onclick={() => navigate(1)}
          disabled={!hasNext}
          aria-label="Next scenario"
          data-testid="scenario-next"
        >▸</button>
      </div>
    </div>
  </div>
</div>

<style>
  .book-wrapper {
    position: relative;
    width: 100%;
    max-width: min(480px, 100%);
    transition: transform 0.5s ease-in-out;
  }

  .book-wrapper.rotating {
    transition: transform 0.5s ease-in-out;
  }

  /* ---- Rotation arrows ---- */
  .rotate-arrow {
    position: absolute;
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.25);
    font-size: 1rem;
    cursor: pointer;
    padding: 0.2rem;
    transition: color 0.2s;
    z-index: 10;
    line-height: 1;
  }

  .rotate-arrow:hover:not(:disabled) {
    color: rgba(255, 255, 255, 0.7);
  }

  .rotate-arrow.disabled,
  .rotate-arrow:disabled {
    color: rgba(255, 255, 255, 0.08);
    cursor: default;
  }

  .rotate-top    { top: -1.4rem; left: 50%; transform: translateX(-50%); }
  .rotate-bottom { bottom: -1.4rem; left: 50%; transform: translateX(-50%); }
  .rotate-left   { left: -1.4rem; top: 50%; transform: translateY(-50%); }
  .rotate-right  { right: -1.4rem; top: 50%; transform: translateY(-50%); }

  /* ---- Book page ---- */
  .book-page {
    position: relative;
    background: linear-gradient(160deg, #2a1f14 0%, #1a1208 100%);
    border: 2px solid rgba(184, 134, 11, 0.4);
    border-radius: 4px 12px 12px 4px;
    padding: 1rem 1rem 0.75rem;
    box-shadow:
      inset -3px 0 8px rgba(0, 0, 0, 0.4),
      4px 4px 16px rgba(0, 0, 0, 0.6);
    overflow: hidden;
  }

  /* ---- Page content (scrollable area) ---- */
  .page-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    max-height: 40vh;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(184, 134, 11, 0.4) transparent;
  }

  .page-content::-webkit-scrollbar {
    width: 5px;
  }

  .page-content::-webkit-scrollbar-thumb {
    background: rgba(184, 134, 11, 0.4);
    border-radius: 3px;
  }

  /* ---- Page navigation row ---- */
  .page-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    margin-top: 0.25rem;
    gap: 0.5rem;
  }

  .page-turn {
    background: none;
    border: 1px solid rgba(184, 134, 11, 0.3);
    border-radius: 4px;
    color: rgba(244, 208, 63, 0.7);
    font-size: 1.1rem;
    cursor: pointer;
    padding: 0.2rem 0.5rem;
    transition: all 0.2s;
    line-height: 1;
  }

  .page-turn:hover:not(:disabled) {
    background: rgba(184, 134, 11, 0.2);
    color: #f4d03f;
    border-color: rgba(184, 134, 11, 0.6);
  }

  .page-turn:disabled {
    opacity: 0.2;
    cursor: default;
  }

  .splash-image {
    width: 100%;
    max-height: 70px;
    object-fit: cover;
    border-radius: 4px;
    border: 1px solid rgba(184, 134, 11, 0.3);
  }

  .scenario-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: #f4d03f;
    text-align: center;
    text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.8);
    line-height: 1.3;
  }

  .scenario-goal {
    margin: 0;
    font-size: 0.75rem;
    color: #d4b896;
    text-align: center;
    line-height: 1.4;
  }

  .scenario-intro {
    margin: 0;
    font-size: 0.72rem;
    color: #b0a090;
    text-align: left;
    line-height: 1.5;
  }

  .villain-line {
    font-size: 0.75rem;
    color: #d4b896;
    text-align: center;
  }

  .villain-label {
    color: rgba(244, 208, 63, 0.7);
    font-weight: 600;
    margin-right: 0.3rem;
  }

  .villain-name {
    font-style: italic;
  }

  /* ---- Start button ---- */
  .start-button {
    margin-top: 0.4rem;
    padding: 0.6rem 1.4rem;
    font-size: 0.85rem;
    font-weight: 700;
    border-radius: 6px;
    border: 2px solid rgba(100, 100, 100, 0.5);
    cursor: not-allowed;
    background: #444;
    color: #888;
    transition: all 0.25s ease;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    width: 100%;
  }

  .start-button.ready {
    background: linear-gradient(135deg, #b8860b 0%, #8b4513 100%);
    border-color: #f4d03f;
    color: #fff;
    cursor: pointer;
    box-shadow: 0 3px 10px rgba(184, 134, 11, 0.4);
  }

  .start-button.ready:hover {
    background: linear-gradient(135deg, #d4a017 0%, #a0522d 100%);
    border-color: #ffd700;
    transform: translateY(-1px);
    box-shadow: 0 5px 15px rgba(184, 134, 11, 0.6);
  }

  .start-button.ready:active {
    transform: translateY(0);
  }

  /* ---- Page dots ---- */
  .page-dots {
    display: flex;
    gap: 0.35rem;
    margin-top: 0.25rem;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    transition: background 0.2s;
  }

  .dot.active {
    background: rgba(244, 208, 63, 0.8);
  }
</style>
