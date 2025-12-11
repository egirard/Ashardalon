<script lang="ts">
  import html2canvas from 'html2canvas';

  // Repository configuration
  const REPO_OWNER = 'egirard';
  const REPO_NAME = 'Ashardalon';
  const GAME_VERSION = '1.0.0'; // From package.json

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
   * Creates an issue body with screenshot instructions or thumbnail.
   * @param timestamp - ISO timestamp string
   * @param screenshotMessage - Message explaining screenshot status
   * @param userAgent - Browser user agent string
   * @param thumbnailDataUrl - Optional low-res thumbnail data URL
   * @returns Formatted issue body markdown
   */
  function createIssueBody(
    timestamp: string, 
    screenshotMessage: string, 
    userAgent: string, 
    thumbnailDataUrl?: string
  ): string {
    const screenshotSection = thumbnailDataUrl
      ? `${screenshotMessage}\n\n_Low-resolution preview:_\n![Screenshot Preview](${thumbnailDataUrl})`
      : screenshotMessage;

    return `
## Feedback / Bug Report

**Timestamp:** ${timestamp}

### Description
**👉 PLEASE DESCRIBE YOUR FEEDBACK OR ISSUE HERE:**

_What happened? What did you expect? Any suggestions?_



### Screenshot
${screenshotSection}

### System Information
- **Browser/User Agent:** ${userAgent}
- **Game Version:** ${GAME_VERSION}
- **Screen Resolution:** ${window.screen.width}x${window.screen.height}
- **Viewport Size:** ${window.innerWidth}x${window.innerHeight}
    `.trim();
  }

  /**
   * Generates a lower resolution thumbnail from a canvas.
   * @param sourceCanvas - The original canvas
   * @param maxWidth - Maximum width for the thumbnail
   * @param maxHeight - Maximum height for the thumbnail
   * @returns Data URL of the thumbnail
   */
  function generateThumbnail(sourceCanvas: HTMLCanvasElement, maxWidth: number = 800, maxHeight: number = 600): string {
    const scale = Math.min(maxWidth / sourceCanvas.width, maxHeight / sourceCanvas.height, 1);
    
    if (scale >= 1) {
      // No need to downscale
      return sourceCanvas.toDataURL('image/jpeg', 0.7);
    }

    const thumbnailCanvas = document.createElement('canvas');
    thumbnailCanvas.width = sourceCanvas.width * scale;
    thumbnailCanvas.height = sourceCanvas.height * scale;
    
    const ctx = thumbnailCanvas.getContext('2d');
    if (!ctx) {
      // If we can't get a 2D context, return the original canvas as JPEG
      return sourceCanvas.toDataURL('image/jpeg', 0.7);
    }
    
    ctx.drawImage(sourceCanvas, 0, 0, thumbnailCanvas.width, thumbnailCanvas.height);
    return thumbnailCanvas.toDataURL('image/jpeg', 0.7);
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
   * Captures a screenshot of the current game screen and opens a pre-filled GitHub issue.
   * Attempts to copy full-resolution screenshot to clipboard and includes a low-res thumbnail.
   */
  async function handleFeedbackClick() {
    try {
      // Capture the entire page as a screenshot
      const canvas = await html2canvas(document.body, {
        backgroundColor: '#000000',
        scale: 1, // Use 1:1 scale to keep file size reasonable
        logging: false,
      });

      // Get system information
      const userAgent = navigator.userAgent;
      const date = new Date();
      const timestamp = date.toISOString();
      const humanReadableTimestamp = createHumanReadableTimestamp(date);

      // Try to copy full-resolution screenshot to clipboard
      const copiedToClipboard = await copyCanvasToClipboard(canvas);

      // Generate a low-resolution thumbnail for the issue body
      const thumbnailDataUrl = generateThumbnail(canvas, 800, 600);

      // Determine the screenshot message based on clipboard success
      let screenshotMessage: string;
      if (copiedToClipboard) {
        screenshotMessage = '_Screenshot copied to clipboard! **Please paste it here** (Ctrl+V or Cmd+V)._';
      } else {
        screenshotMessage = '_Screenshot could not be copied to clipboard automatically. Please attach manually if needed._';
      }

      // Create the issue body with thumbnail
      const issueBody = createIssueBody(
        timestamp,
        screenshotMessage,
        userAgent,
        thumbnailDataUrl
      );

      // Create the GitHub issue URL with pre-filled content
      const issueTitle = encodeURIComponent('User Feedback - ' + humanReadableTimestamp);
      const issueBodyEncoded = encodeURIComponent(issueBody);
      const labels = 'UserGenerated';

      const githubIssueUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/issues/new?title=${issueTitle}&body=${issueBodyEncoded}&labels=${labels}`;

      // Check if URL is within reasonable length limits (most browsers support ~8000 characters)
      // If too long, try without thumbnail
      if (githubIssueUrl.length > 8000) {
        console.warn('Issue body with thumbnail too large, trying without thumbnail');
        const bodyWithoutThumbnail = createIssueBody(
          timestamp,
          screenshotMessage,
          userAgent
        );
        const bodyWithoutThumbnailEncoded = encodeURIComponent(bodyWithoutThumbnail);
        const fallbackUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/issues/new?title=${issueTitle}&body=${bodyWithoutThumbnailEncoded}&labels=${labels}`;
        window.open(fallbackUrl, '_blank');
      } else {
        // Open the GitHub issue page in a new tab
        window.open(githubIssueUrl, '_blank');
      }
    } catch (error) {
      console.error('Failed to capture screenshot or create feedback:', error);
      // Fallback: open GitHub issues page with basic information but without screenshot
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
