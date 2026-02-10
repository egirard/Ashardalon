/**
 * Animation helper utilities for screenshot capture
 */

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
 * @param timeout - Maximum time to wait in milliseconds. Defaults to 3000ms.
 * @returns Promise that resolves when all animations are complete or timeout is reached
 */
export async function waitForAnimations(
  container: HTMLElement = document.body,
  timeout: number = 3000
): Promise<void> {
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
