<script lang="ts">
  /**
   * Corner Controls Component
   * Displays icon-only controls for Return to Character Select, Control Map, and Submit Feedback
   * Positioned in corners (NW and SE) for accessibility from different player positions
   */
  import { HomeIcon, MapIcon, BugIcon } from './icons';
  import html2canvas from 'html2canvas';
  
  interface Props {
    position: 'nw' | 'se';
    mapControlMode: boolean;
    onReset: () => void;
    onToggleMapControl: () => void;
  }
  
  let { position, mapControlMode, onReset, onToggleMapControl }: Props = $props();
  
  // Repository configuration for feedback
  const REPO_OWNER = 'egirard';
  const REPO_NAME = 'Ashardalon';
  const GAME_VERSION = '1.0.0';
  
  /**
   * Creates a human-readable timestamp string from a Date object.
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
<!-- Please describe the issue or feedback here -->


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
   */
  function generateThumbnail(sourceCanvas: HTMLCanvasElement, maxWidth: number = 800, maxHeight: number = 600): string {
    const scale = Math.min(maxWidth / sourceCanvas.width, maxHeight / sourceCanvas.height, 1);
    
    if (scale >= 1) {
      return sourceCanvas.toDataURL('image/jpeg', 0.7);
    }

    const thumbnailCanvas = document.createElement('canvas');
    thumbnailCanvas.width = sourceCanvas.width * scale;
    thumbnailCanvas.height = sourceCanvas.height * scale;
    
    const ctx = thumbnailCanvas.getContext('2d');
    if (!ctx) {
      return sourceCanvas.toDataURL('image/jpeg', 0.7);
    }
    
    ctx.drawImage(sourceCanvas, 0, 0, thumbnailCanvas.width, thumbnailCanvas.height);
    return thumbnailCanvas.toDataURL('image/jpeg', 0.7);
  }
  
  /**
   * Copies a canvas to clipboard as a PNG blob.
   */
  async function copyCanvasToClipboard(canvas: HTMLCanvasElement): Promise<boolean> {
    try {
      if (!navigator.clipboard || !navigator.clipboard.write) {
        return false;
      }

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        }, 'image/png');
      });

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
   * Handles the feedback button click
   */
  async function handleFeedbackClick() {
    try {
      const canvas = await html2canvas(document.body, {
        backgroundColor: '#000000',
        scale: 1,
        logging: false,
      });

      const userAgent = navigator.userAgent;
      const date = new Date();
      const timestamp = date.toISOString();
      const humanReadableTimestamp = createHumanReadableTimestamp(date);

      const copiedToClipboard = await copyCanvasToClipboard(canvas);
      const thumbnailDataUrl = generateThumbnail(canvas, 800, 600);

      let screenshotMessage: string;
      if (copiedToClipboard) {
        screenshotMessage = '_Screenshot copied to clipboard! **Please paste it here** (Ctrl+V or Cmd+V)._';
      } else {
        screenshotMessage = '_Screenshot could not be copied to clipboard automatically. Please attach manually if needed._';
      }

      const issueBody = createIssueBody(
        timestamp,
        screenshotMessage,
        userAgent,
        thumbnailDataUrl
      );

      const issueTitle = encodeURIComponent('User Feedback - ' + humanReadableTimestamp);
      const issueBodyEncoded = encodeURIComponent(issueBody);
      const labels = 'UserGenerated';

      const githubIssueUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/issues/new?title=${issueTitle}&body=${issueBodyEncoded}&labels=${labels}`;

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
        window.open(githubIssueUrl, '_blank');
      }
    } catch (error) {
      console.error('Failed to capture screenshot or create feedback:', error);
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

<div class="corner-controls corner-{position}" data-testid="corner-controls-{position}">
  <button
    class="icon-button home-button"
    data-testid="corner-home-button"
    onclick={onReset}
    aria-label="Return to Character Select"
    title="Return to Character Select"
  >
    <HomeIcon size={20} color="currentColor" ariaLabel="Return to Character Select" />
  </button>
  
  <button
    class="icon-button map-button"
    class:active={mapControlMode}
    data-testid="corner-map-button"
    onclick={onToggleMapControl}
    aria-label="Control Map"
    aria-pressed={mapControlMode}
    title="Control Map"
  >
    <MapIcon size={20} color="currentColor" ariaLabel="Control Map" />
  </button>
  
  <button
    class="icon-button feedback-button"
    data-testid="corner-feedback-button"
    onclick={handleFeedbackClick}
    aria-label="Submit Feedback"
    title="Submit Feedback"
  >
    <BugIcon size={20} color="currentColor" ariaLabel="Submit Feedback" />
  </button>
</div>

<style>
  .corner-controls {
    position: absolute;
    display: flex;
    gap: 0.25rem;
    z-index: 1000;
  }
  
  .corner-nw {
    top: 0.5rem;
    left: 0.5rem;
    transform: rotate(180deg);
  }
  
  .corner-se {
    bottom: 0.5rem;
    right: 0.5rem;
  }
  
  .icon-button {
    width: 40px;
    height: 40px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease-out;
    backdrop-filter: blur(4px);
  }
  
  .icon-button:hover {
    background: rgba(0, 0, 0, 0.8);
    border-color: rgba(255, 255, 255, 0.4);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }
  
  .icon-button:active {
    transform: translateY(0);
  }
  
  /* Home button - subtle gray */
  .home-button:hover {
    border-color: #999;
    color: #ccc;
  }
  
  /* Map button - blue when inactive, orange when active */
  .map-button:hover {
    border-color: #7777aa;
    color: #8888ff;
  }
  
  .map-button.active {
    background: rgba(255, 165, 0, 0.6);
    border-color: #ffa500;
    color: #fff;
  }
  
  .map-button.active:hover {
    background: rgba(255, 165, 0, 0.8);
    border-color: #ffa500;
  }
  
  /* Feedback button - purple */
  .feedback-button:hover {
    border-color: #8b5cf6;
    color: #a78bfa;
  }
</style>
