<script lang="ts">
  import html2canvas from 'html2canvas';

  // Repository configuration
  const REPO_OWNER = 'egirard';
  const REPO_NAME = 'Ashardalon';
  const GAME_VERSION = __GIT_COMMIT__;

  /**
   * Creates a human-readable timestamp string from a Date object.
   * @param date - The date to format
   * @returns A human-readable timestamp string like "December 10, 2025 at 2:52 PM"
   */
  function createHumanReadableTimestamp(date: Date): string {
    const humanReadableDate = date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
    const humanReadableTime = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    return `${humanReadableDate} at ${humanReadableTime}`;
  }

  /**
   * Creates an issue body with screenshot instructions.
   * @param timestamp - ISO timestamp string
   * @param screenshotMessage - Message explaining screenshot status
   * @param userAgent - Browser user agent string
   * @returns Formatted issue body markdown
   */
  function createIssueBody(
    timestamp: string, 
    screenshotMessage: string, 
    userAgent: string
  ): string {
    return `
## Feedback / Bug Report

**Timestamp:** ${timestamp}

### Description
<!-- Please describe the issue or feedback here -->


### Screenshot
${screenshotMessage}

### System Information
- **Browser/User Agent:** ${userAgent}
- **Game Version:** ${GAME_VERSION}
- **Screen Resolution:** ${window.screen.width}x${window.screen.height}
- **Viewport Size:** ${window.innerWidth}x${window.innerHeight}
    `.trim();
  }

  /**
   * Copies a canvas to clipboard as a PNG blob.
   * @param canvas - The canvas to copy
   * @returns Promise that resolves to true if successful
   */
  async function copyCanvasToClipboard(canvas: HTMLCanvasElement): Promise<boolean> {
    try {
      // Check if Clipboard API is available
      if (!navigator.clipboard || !navigator.clipboard.write) {
        return false;
      }

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        }, 'image/png');
      });

      // Copy to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ]);

      return true;
    } catch (error) {
      console.warn('Failed to copy to clipboard:', error);
      return false;
    }
  }

  /**
   * Temporarily disables all CSS animations and transitions on the page.
   * This ensures that screenshots capture elements in their final state, not mid-animation.
   * @returns A cleanup function to restore animations
   */
  function disableAnimations(): () => void {
    // Add a CSS class that disables all animations and transitions
    document.body.classList.add('screenshot-mode');
    
    // Force a reflow to ensure styles are applied immediately before html2canvas runs.
    // This is necessary because html2canvas captures synchronously and may start before
    // the browser has fully processed the class-based style changes.
    void document.body.offsetHeight;
    
    // Return cleanup function to restore animations
    return () => {
      document.body.classList.remove('screenshot-mode');
    };
  }

  /**
   * Captures a screenshot of the current game screen and opens a pre-filled GitHub issue.
   * Attempts to copy full-resolution screenshot to clipboard.
   */
  async function handleFeedbackClick() {
    try {
      // Temporarily disable animations to ensure all elements are fully visible
      const restoreAnimations = disableAnimations();
      
      try {
        // Capture the entire page as a screenshot
        const canvas = await html2canvas(document.body, {
          backgroundColor: '#000000',
          scale: 1, // Use 1:1 scale to keep file size reasonable
          logging: false,
        });
        
        // Restore animations immediately after capture
        restoreAnimations();
        
        // Continue with the rest of the screenshot processing...
        await processScreenshot(canvas);
      } catch (error) {
        // Ensure animations are restored even if capture fails
        restoreAnimations();
        throw error;
      }
    } catch (error) {
      console.error('Failed to capture screenshot or create feedback:', error);
      // Fallback: open GitHub issues page with basic information but without screenshot
      openFallbackIssue();
    }
  }

  /**
   * Processes the captured screenshot canvas and opens GitHub issue.
   * @param canvas - The canvas containing the screenshot
   */
  async function processScreenshot(canvas: HTMLCanvasElement) {
    // Get system information
    const userAgent = navigator.userAgent;
    const date = new Date();
    const timestamp = date.toISOString();
    const humanReadableTimestamp = createHumanReadableTimestamp(date);

    // Try to copy full-resolution screenshot to clipboard
    const copiedToClipboard = await copyCanvasToClipboard(canvas);

    // Determine the screenshot message based on clipboard success
    let screenshotMessage: string;
    if (copiedToClipboard) {
      screenshotMessage = '_Screenshot copied to clipboard! **Please paste it here** (Ctrl+V or Cmd+V)._';
    } else {
      screenshotMessage = '_Screenshot could not be copied to clipboard automatically. Please attach manually if needed._';
    }

    // Create the issue body
    const issueBody = createIssueBody(
      timestamp,
      screenshotMessage,
      userAgent
    );

    // Create the GitHub issue URL with pre-filled content
    const issueTitle = encodeURIComponent('User Feedback - ' + humanReadableTimestamp);
    const issueBodyEncoded = encodeURIComponent(issueBody);
    const labels = 'UserGenerated';

    const githubIssueUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/issues/new?title=${issueTitle}&body=${issueBodyEncoded}&labels=${labels}`;
    // Open the GitHub issue page in a new tab
    window.open(githubIssueUrl, '_blank');
  }

  /**
   * Opens a GitHub issue with fallback content when screenshot capture fails.
   */
  function openFallbackIssue() {
    const date = new Date();
    const timestamp = date.toISOString();
    const humanReadableTimestamp = createHumanReadableTimestamp(date);
    const userAgent = navigator.userAgent;
    
    const fallbackBody = createIssueBody(
      timestamp,
      '_Screenshot could not be captured automatically. Please attach manually if needed._',
      userAgent
    );
    const fallbackTitle = encodeURIComponent('User Feedback - ' + humanReadableTimestamp);
    const fallbackBodyEncoded = encodeURIComponent(fallbackBody);
    const fallbackUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/issues/new?title=${fallbackTitle}&body=${fallbackBodyEncoded}&labels=UserGenerated`;
    window.open(fallbackUrl, '_blank');
  }
</script>

<button
  class="feedback-button"
  data-testid="feedback-button"
  on:click={handleFeedbackClick}
  aria-label="Submit feedback or report a bug"
>
  📣 Submit Feedback
</button>

<style>
  /* Global CSS rule to disable animations during screenshot capture */
  :global(body.screenshot-mode *),
  :global(body.screenshot-mode *::before),
  :global(body.screenshot-mode *::after) {
    animation: none !important;
    animation-delay: 0s !important;
    animation-duration: 0s !important;
    transition: none !important;
    transition-delay: 0s !important;
    transition-duration: 0s !important;
  }

  .feedback-button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.3);
    padding: 12px 20px;
    font-size: 14px;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s ease;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    white-space: nowrap;
  }

  .feedback-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(102, 126, 234, 0.4);
    border-color: rgba(255, 255, 255, 0.5);
  }

  .feedback-button:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
</style>
