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
   * Creates a fallback issue body when screenshot is not available.
   * @param timestamp - ISO timestamp string
   * @param screenshotMessage - Message explaining why screenshot is not included
   * @param userAgent - Browser user agent string
   * @returns Formatted issue body markdown
   */
  function createFallbackBody(timestamp: string, screenshotMessage: string, userAgent: string): string {
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
   * Captures a screenshot of the current game screen and opens a pre-filled GitHub issue.
   */
  async function handleFeedbackClick() {
    try {
      // Capture the entire page as a screenshot
      const canvas = await html2canvas(document.body, {
        backgroundColor: '#000000',
        scale: 1, // Use 1:1 scale to keep file size reasonable
        logging: false,
      });

      // Convert canvas to data URL (base64 encoded PNG)
      const screenshotDataUrl = canvas.toDataURL('image/png');

      // Get system information
      const userAgent = navigator.userAgent;
      const date = new Date();
      const timestamp = date.toISOString();
      const humanReadableTimestamp = createHumanReadableTimestamp(date);

      // Prepare the issue body with diagnostic information
      const issueBody = `
## Feedback / Bug Report

**Timestamp:** ${timestamp}

### Description
<!-- Please describe the issue or feedback here -->


### Screenshot
![Game Screenshot](${screenshotDataUrl})

### System Information
- **Browser/User Agent:** ${userAgent}
- **Game Version:** ${GAME_VERSION}
- **Screen Resolution:** ${window.screen.width}x${window.screen.height}
- **Viewport Size:** ${window.innerWidth}x${window.innerHeight}
      `.trim();

      // Create the GitHub issue URL with pre-filled content
      const issueTitle = encodeURIComponent('User Feedback - ' + humanReadableTimestamp);
      const issueBodyEncoded = encodeURIComponent(issueBody);
      const labels = 'UserGenerated';

      const githubIssueUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/issues/new?title=${issueTitle}&body=${issueBodyEncoded}&labels=${labels}`;

      // Check if URL is within reasonable length limits (most browsers support ~8000 characters)
      // If too long, open without screenshot
      if (githubIssueUrl.length > 8000) {
        console.warn('Screenshot data URI too large, opening issue form without screenshot');
        const fallbackBody = createFallbackBody(
          timestamp,
          '_Screenshot was too large to include automatically. Please attach manually if needed._',
          userAgent
        );
        const fallbackBodyEncoded = encodeURIComponent(fallbackBody);
        const fallbackUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/issues/new?title=${issueTitle}&body=${fallbackBodyEncoded}&labels=${labels}`;
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
      
      const fallbackBody = createFallbackBody(
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
