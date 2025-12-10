<script lang="ts">
  import html2canvas from 'html2canvas';

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
      const gameVersion = '1.0.0'; // From package.json
      const timestamp = new Date().toISOString();

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
- **Game Version:** ${gameVersion}
- **Screen Resolution:** ${window.screen.width}x${window.screen.height}
- **Viewport Size:** ${window.innerWidth}x${window.innerHeight}
      `.trim();

      // Create the GitHub issue URL with pre-filled content
      const repoOwner = 'egirard';
      const repoName = 'Ashardalon';
      const issueTitle = encodeURIComponent('User Feedback - ' + timestamp);
      const issueBodyEncoded = encodeURIComponent(issueBody);
      const labels = 'UserGenerated';

      const githubIssueUrl = `https://github.com/${repoOwner}/${repoName}/issues/new?title=${issueTitle}&body=${issueBodyEncoded}&labels=${labels}`;

      // Open the GitHub issue page in a new tab
      window.open(githubIssueUrl, '_blank');
    } catch (error) {
      console.error('Failed to capture screenshot or create feedback:', error);
      // Fallback: open GitHub issues page without screenshot
      const repoOwner = 'egirard';
      const repoName = 'Ashardalon';
      const fallbackUrl = `https://github.com/${repoOwner}/${repoName}/issues/new?labels=UserGenerated`;
      window.open(fallbackUrl, '_blank');
    }
  }
</script>

<button
  class="feedback-button"
  data-testid="feedback-button"
  onclick={handleFeedbackClick}
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
