# 022 - Multi-Player UI Orientation

## User Story

As a player sitting at different sides of a tabletop display, I want my hero dashboard (status, HP, turn indicator) to be oriented toward my side of the screen so that I can easily read and interact with it from my physical position.

## Test Scenario

This test verifies that when multiple players join from different edges of the screen:
1. Each player's hero dashboard appears at their chosen edge
2. Dashboards are properly rotated to face the player at that edge
3. The active player's turn indicator shows full turn information
4. Non-active players see a simplified dashboard with their hero's name and HP
5. The shared game board in the center remains upright for all players

## Screenshots

### 000 - Character Selection Complete
Players have selected heroes from three different edges:
- Quinn from the bottom edge (standard orientation)
- Vistra from the top edge (180° rotation)
- Keyleth from the left edge (90° rotation)

![Character Selection Complete](022-multi-player-ui-orientation.spec.ts-snapshots/000-character-selection-complete-chromium-linux.png)

### 001 - Game Board with Multi-Player UI
The game board shows all three players' dashboards oriented toward their respective edges:
- **Bottom edge (Quinn)**: Active player with full turn indicator showing "Quinn's Turn", "Hero Phase", "Turn 1", and HP
- **Top edge (Vistra)**: Dashboard rotated 180° showing "Vistra" and "HP: 10/10"
- **Left edge (Keyleth)**: Dashboard rotated 90° showing "Keyleth" and "HP: 10/10"
- **Right edge**: Empty (no player joined from this side)

![Game Board Multi-Player](022-multi-player-ui-orientation.spec.ts-snapshots/001-game-board-multi-player-chromium-linux.png)

## Verification Checklist

- [ ] Quinn's turn indicator appears at the bottom edge with full turn information
- [ ] Vistra's dashboard appears at the top edge, rotated 180° to face the top player
- [ ] Keyleth's dashboard appears at the left edge, rotated 90° to face the left player
- [ ] The right edge zone is empty (no player joined from there)
- [ ] The game board in the center is not rotated
- [ ] Non-active players see only name and HP (not turn phase info)
- [ ] Active player's dashboard is highlighted with a gold glow effect
