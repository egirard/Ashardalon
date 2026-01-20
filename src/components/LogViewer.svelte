<script lang="ts">
  import type { LogEntry } from '../store/types';
  import { XIcon } from './icons';

  interface Props {
    logEntries: LogEntry[];
    onDismiss?: () => void;
  }

  let { logEntries, onDismiss }: Props = $props();

  // Derive reversed log entries (most recent first)
  let reversedLogEntries = $derived([...logEntries].reverse());

  // Function to format timestamp
  function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  }

  // Get icon/emoji for log type
  function getLogTypeIcon(type: string): string {
    switch (type) {
      case 'game-event':
        return '🎮';
      case 'hero-action':
        return '⚔️';
      case 'combat':
        return '💥';
      case 'exploration':
        return '🗺️';
      case 'encounter':
        return '📜';
      case 'system':
        return 'ℹ️';
      default:
        return '📝';
    }
  }

  // Get CSS class for log type
  function getLogTypeClass(type: string): string {
    return `log-entry-${type}`;
  }
</script>

<div class="log-viewer-overlay" onclick={onDismiss}>
  <div class="log-viewer-panel" onclick={(e) => e.stopPropagation()}>
    <!-- Header -->
    <div class="log-header">
      <h2>Game Log</h2>
      <button class="close-button" onclick={onDismiss} aria-label="Close log">
        <XIcon size={20} ariaLabel="Close" />
      </button>
    </div>

    <!-- Log Entries -->
    <div class="log-entries" data-testid="log-entries">
      {#if reversedLogEntries.length === 0}
        <div class="log-empty">
          <p>No log entries yet. Game events will appear here.</p>
        </div>
      {:else}
        {#each reversedLogEntries as entry (entry.id)}
          <div class="log-entry {getLogTypeClass(entry.type)}" data-testid="log-entry">
            <div class="log-entry-header">
              <span class="log-type-icon">{getLogTypeIcon(entry.type)}</span>
              <span class="log-timestamp">{formatTimestamp(entry.timestamp)}</span>
            </div>
            <div class="log-message">{entry.message}</div>
            {#if entry.details}
              <div class="log-details">{entry.details}</div>
            {/if}
          </div>
        {/each}
      {/if}
    </div>

    <!-- Footer with entry count -->
    <div class="log-footer">
      <span>{logEntries.length} {logEntries.length === 1 ? 'entry' : 'entries'}</span>
    </div>
  </div>
</div>

<style>
  .log-viewer-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .log-viewer-panel {
    background: rgba(30, 30, 50, 0.98);
    border: 3px solid #ffd700;
    border-radius: 12px;
    width: 100%;
    max-width: 600px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  }

  .log-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    border-bottom: 2px solid rgba(255, 215, 0, 0.3);
  }

  .log-header h2 {
    margin: 0;
    color: #ffd700;
    font-size: 1.5rem;
  }

  .close-button {
    background: transparent;
    border: none;
    color: #fff;
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
  }

  .close-button:hover {
    color: #ffd700;
  }

  .log-entries {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .log-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #888;
    font-style: italic;
  }

  .log-entry {
    background: rgba(0, 0, 0, 0.3);
    border-left: 3px solid #888;
    border-radius: 4px;
    padding: 0.75rem;
    transition: transform 0.2s;
  }

  .log-entry:hover {
    transform: translateX(2px);
    background: rgba(0, 0, 0, 0.4);
  }

  .log-entry-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .log-type-icon {
    font-size: 1rem;
  }

  .log-timestamp {
    font-size: 0.7rem;
    color: #888;
    font-family: monospace;
  }

  .log-message {
    color: #fff;
    font-size: 0.9rem;
    margin-bottom: 0.25rem;
  }

  .log-details {
    color: #aaa;
    font-size: 0.8rem;
    font-style: italic;
    margin-top: 0.25rem;
    padding-left: 1.5rem;
  }

  /* Type-specific styling */
  .log-entry-game-event {
    border-left-color: #4caf50;
  }

  .log-entry-hero-action {
    border-left-color: #2196f3;
  }

  .log-entry-combat {
    border-left-color: #f44336;
  }

  .log-entry-exploration {
    border-left-color: #ff9800;
  }

  .log-entry-encounter {
    border-left-color: #9c27b0;
  }

  .log-entry-system {
    border-left-color: #607d8b;
  }

  .log-footer {
    padding: 0.75rem 1rem;
    border-top: 2px solid rgba(255, 215, 0, 0.3);
    text-align: center;
    color: #888;
    font-size: 0.8rem;
  }

  /* Scrollbar styling */
  .log-entries::-webkit-scrollbar {
    width: 8px;
  }

  .log-entries::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }

  .log-entries::-webkit-scrollbar-thumb {
    background: rgba(255, 215, 0, 0.3);
    border-radius: 4px;
  }

  .log-entries::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 215, 0, 0.5);
  }
</style>
