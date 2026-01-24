# 098 - Both Map Control and UI Scale Controls

## User Story

As a player, I need access to both map zoom controls (for zooming/panning the game board) and UI scale controls (for adjusting player panel sizes), and these should work independently without interfering with each other.

## Test Scenario

This test demonstrates that both control systems are present and functional:

1. **Initial State**: Both control buttons visible in corner (map icon and font size icon)
2. **Map Controls Active**: Map zoom controls appear when map button is clicked
3. **Map Zoomed In**: Map zoom functionality works (zooms to 120%)
4. **Map Controls Closed**: Map controls hide when button is clicked again
5. **UI Scale Active**: UI scale controls appear when font size button is clicked
6. **UI Scaled**: UI scaling works independently (scales to 130%)
7. **Both Closed**: Both control systems can be closed independently

## Key Features

### Two Independent Control Systems

1. **Map Control** (2nd icon from left)
   - Toggles map zoom/pan controls
   - Allows zooming the game board (dungeon map) from 50% to 300%
   - Provides pan/drag functionality for navigating large maps
   - Located in center of screen when active

2. **UI Scale** (3rd icon from left)
   - Toggles UI font scaling controls
   - Allows scaling player panels and UI elements from 80% to 150%
   - Changes text size and UI dimensions
   - Located in bottom-right corner when active

### Button Layout in Corner Controls (SE corner)

From left to right:
1. Home icon - Return to character select
2. Map icon - Toggle map zoom controls
3. Font size icon - Toggle UI scale controls
4. Bug icon - Submit feedback

## Screenshots

### 001 - Map Controls Active
Shows the map zoom controls visible with zoom slider and +/- buttons. The map icon button is highlighted in orange/yellow indicating active state.

### 004 - UI Scale Controls Active
Shows the UI scale controls visible with +/- buttons and percentage display. The font size icon button is highlighted in green indicating active state.

## Technical Details

- Both controls use the same corner button infrastructure
- Map controls affect `manualZoom` state and transform the `.dungeon-map` element
- UI scale controls affect CSS custom property `--ui-font-scale` and scale player panels
- Controls operate independently and do not interfere with each other
- Only one control panel can be open at a time (closing one before opening the other)

## Verification Checklist

- [x] Both control buttons are visible in SE corner
- [x] Map control button works and shows map zoom controls
- [x] Map zoom controls function correctly (zoom in/out)
- [x] UI scale button works and shows UI scale controls
- [x] UI scale controls function correctly (increase/decrease)
- [x] Controls don't interfere with each other
- [x] Both buttons can be toggled independently
- [x] Active states are visually distinct (map=orange, UI scale=green)
