/**
 * Animation helper utilities for screenshot capture
 */

/**
 * Default timeout for waiting for animations to complete.
 * Set to 3000ms (3 seconds) to provide a safety margin beyond the
 * 2-second tile fade-in animation, accounting for potential delays or stacked animations.
 */
const DEFAULT_ANIMATION_TIMEOUT = 3000;

/**
 * Fallback timeout for browsers that don't support the Web Animations API.
 * Set to 2500ms to ensure most animations (typically 2 seconds) complete.
 */
const FALLBACK_ANIMATION_TIMEOUT = 2500;

/**
 * Gets the game board container element for scoping animation queries.
 * Falls back to document.body if game board is not found.
 * 
 * @returns The game board container or document.body
 */
export function getGameBoardContainer(): HTMLElement {
  const gameBoard = document.querySelector('[data-testid="game-board"]') as HTMLElement;
  return gameBoard || document.body;
}

/**
 * Waits for all CSS animations within a container to complete.
 * This ensures that newly placed tiles with fade-in animations are fully visible.
 * 
 * @param container - The container element to check for animations. Defaults to document.body.
 * @param timeout - Maximum time to wait in milliseconds. Defaults to DEFAULT_ANIMATION_TIMEOUT.
 * @returns Promise that resolves when all animations are complete or timeout is reached
 */
export async function waitForAnimations(
  container: HTMLElement = document.body,
  timeout: number = DEFAULT_ANIMATION_TIMEOUT
): Promise<void> {
  // Check if the Web Animations API is supported
  // The getAnimations() method is supported in modern browsers (Chrome 84+, Firefox 75+, Safari 13.1+)
  if (typeof container.getAnimations !== 'function') {
    // Fallback: wait for a fixed duration if API is not supported
    // Cap the wait time at FALLBACK_ANIMATION_TIMEOUT to ensure reasonable behavior
    // even if a longer timeout is requested, since we can't detect actual animations
    await new Promise<void>(resolve => setTimeout(resolve, Math.min(timeout, FALLBACK_ANIMATION_TIMEOUT)));
    return;
  }

  // Get all animations in the container's subtree
  // This is more efficient than querying all elements
  const animations = container.getAnimations({ subtree: true });
  
  // Filter for running animations and collect their finished promises
  const animationPromises = animations
    .filter(animation => animation.playState === 'running')
    .map(animation => animation.finished);

  // Wait for all animations to complete (with a timeout)
  // Use allSettled to handle cancelled animations gracefully
  if (animationPromises.length > 0) {
    await Promise.race([
      Promise.allSettled(animationPromises),
      new Promise<void>(resolve => setTimeout(resolve, timeout))
    ]);
  }
}
