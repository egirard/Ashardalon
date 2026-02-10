/**
 * Animation helper utilities for screenshot capture
 */

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
  // Get all elements with running animations within the container
  const animatedElements = container.querySelectorAll('*');
  const animationPromises: Promise<void>[] = [];

  animatedElements.forEach((element) => {
    const animations = element.getAnimations();
    animations.forEach((animation) => {
      if (animation.playState === 'running') {
        animationPromises.push(animation.finished);
      }
    });
  });

  // Wait for all animations to complete (with a timeout)
  if (animationPromises.length > 0) {
    await Promise.race([
      Promise.all(animationPromises),
      new Promise<void>(resolve => setTimeout(resolve, timeout))
    ]);
  }
}
