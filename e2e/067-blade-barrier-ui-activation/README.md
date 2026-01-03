# E2E Test 067: Blade Barrier UI Activation with Integrated Card UI

## Test Purpose

This E2E test demonstrates the complete user interaction flow for activating the Blade Barrier power card with an integrated, non-blocking selection UI. It validates that users can:

1. Select a hero with Blade Barrier
2. Access and click the power card
3. Activate the power through a button click
4. Select a tile directly on the map with instructions shown in the power card panel
5. Select 5 token placement squares on the map with progress shown in the power card panel
6. Confirm placement and see results

**Key Feature**: Selection instructions, progress counter, and action buttons are displayed in the active power card's detail panel, ensuring full game board visibility throughout the entire flow.

## Test Story

**User Story:** As a player controlling Quinn the Cleric, I want to activate my Blade Barrier daily power by clicking through the UI, with all selection instructions and controls integrated into the power card panel, maintaining full visibility of the game board throughout the entire selection process.

## Test Steps & Screenshots

### Step 1: Hero Selected with Blade Barrier
![Screenshot 000](067-blade-barrier-ui-activation.spec.ts-snapshots/000-hero-selected-with-blade-barrier-chromium-linux.png)

**What's verified:**
- Quinn (Cleric) is selected from character screen
- Blade Barrier (ID: 5) is chosen as the daily power
- Start Game button is enabled

**Programmatic checks:**
- Hero has "selected" class
- Start button is enabled

### Step 2: Game Started
![Screenshot 001](067-blade-barrier-ui-activation.spec.ts-snapshots/001-game-started-chromium-linux.png)

**What's verified:**
- Game board is visible
- Power cards panel is rendered
- Blade Barrier card (ID: 5) is visible in the dashboard

**Programmatic checks:**
- `[data-testid="player-power-cards"]` is visible
- `[data-testid="power-card-5"]` is visible

### Step 3: Blade Barrier Detail View
![Screenshot 002](067-blade-barrier-ui-activation.spec.ts-snapshots/002-blade-barrier-detail-view-chromium-linux.png)

**What's verified:**
- Clicking the Blade Barrier card opens the detail view
- Card details are displayed (name, type, description, rule)
- "Activate Power" button is visible and enabled
- Card shows as eligible (green highlight)

**Programmatic checks:**
- Card detail view is visible
- Rule text contains "Blade Barrier"
- Activate button is present and enabled

### Step 4: Tile Selection with Integrated UI
![Screenshot 003](067-blade-barrier-ui-activation.spec.ts-snapshots/003-tile-selection-on-map-chromium-linux.png)

**What's verified:**
- Clicking "Activate Power" highlights tiles on the map with purple overlay
- Selection instructions appear **in the power card detail panel** (not a blocking modal)
- Instructions show "Select Tile" with helpful text
- Start tile has purple border and is clickable
- **Full map visibility maintained** - no modal blocking the game board
- Cancel button available in the card panel

**Programmatic checks:**
- Blade Barrier selection UI is visible in card detail view
- Instruction text "Select Tile" is present
- Start tile has `selectable-tile` class
- Cancel button is present in card detail

**UX Improvement**: The selection UI is now part of the active power card's detail panel on the left, not a centered modal overlay. This keeps the entire game board visible and clickable.

### Step 5: Square Selection with Progress Display
![Screenshot 004](067-blade-barrier-ui-activation.spec.ts-snapshots/004-square-selection-on-map-chromium-linux.png)

**What's verified:**
- After clicking tile, squares become clickable directly on the map
- **Card panel updates** to show "Select Squares" instructions
- **Progress counter shows "0 / 5"** in the card panel
- Squares have yellow visual overlays
- Full map visibility maintained
- Cancel button remains accessible in card panel

**Programmatic checks:**
- Blade Barrier selection UI shows square selection mode
- Instruction text "Select Squares" is visible
- Selectable squares are visible on the map
- Progress counter shows "0 / 5"

**UX Improvement**: Progress is tracked and displayed directly in the power card panel, providing immediate feedback without obstructing the board.

### Step 6: Five Squares Selected with Confirm Action
![Screenshot 005](067-blade-barrier-ui-activation.spec.ts-snapshots/005-five-squares-selected-on-map-chromium-linux.png)

**What's verified:**
- User can click 5 different squares directly on the map
- Each selected square shows a numbered indicator (1-5)
- **Progress counter updates to "5 / 5"** in the card panel
- **"Confirm Placement" button appears** in the card panel
- Selected squares remain visible with their numbers
- Cancel button remains available

**Programmatic checks:**
- Progress shows "5 / 5" in card detail
- Confirm button is visible in card detail
- 5 selection number indicators are present on the map

**UX Improvement**: The confirm action is presented in the same card panel where the user has been tracking progress, creating a cohesive and intuitive flow.

### Step 7: Tokens Placed, Card Used
![Screenshot 006](067-blade-barrier-ui-activation.spec.ts-snapshots/006-tokens-placed-card-used-chromium-linux.png)

**What's verified:**
- Card detail panel dismisses after confirming placement
- 5 Blade Barrier tokens appear on the selected squares
- Blade Barrier card shows as "Used" (disabled/flipped state)
- Tokens are visible on the game board

**Programmatic checks:**
- Selection UI is dismissed (card detail closes)
- 5 board tokens exist
- Power card has disabled/flipped class

## UI Interaction Method

This test uses **ONLY UI events** (clicks) to drive the application with **integrated card panel selection**:
- ✅ Hero selection: `click()`
- ✅ Power selection: `click()`
- ✅ Card activation: `click()` on card then `click()` on "Activate Power" button
- ✅ Tile selection: `click()` directly on tile on the map (instructions shown in card panel)
- ✅ Square selection: `click()` directly on 5 squares on the map (progress shown in card panel)
- ✅ Confirm placement: `click()` on "Confirm Placement" button (in card panel)

**No programmatic workarounds** are used for the core functionality being demonstrated.

## Integrated Card Panel Benefits

- **Full Map Visibility:** No modals blocking the game board at any point
- **Contextual Instructions:** Selection guidance appears in the active power card's detail panel
- **Progress Tracking:** Real-time counter (e.g., "3 / 5") shows selection progress in the card panel
- **Consistent Location:** All controls (instructions, progress, cancel, confirm) in one panel location
- **Direct Interaction:** Click tiles and squares directly where they appear on the board
- **Visual Feedback:** Purple overlays, yellow highlights, numbered indicators on the map
- **Integrated Experience:** Selection feels part of the power card activation, not a separate dialog
- **Always Cancelable:** Cancel button accessible in the card panel at every step
- **Immersive Gameplay:** Maintains focus on the game board while providing clear guidance

## Test Metadata

- **Test ID:** 067
- **Category:** Power Card Activation
- **Complexity:** High (multi-step selection flow with integrated UI)
- **User Actions:** 10+ clicks
- **Screenshots:** 7
- **Selection Method:** Integrated card panel (no blocking modals)
- **UI Pattern:** Contextual power card detail panel with embedded selection controls

## Future Enhancements

- Test Blade Barrier tokens triggering damage when monsters move onto them
- Test canceling at each step (tile selection, token placement)
- Test edge cases (selecting same square twice, deselecting squares)
- Test with multiple tiles in range
- Test pointer-events handling for instruction panel

## Related Files

- Test: `e2e/067-blade-barrier-ui-activation/067-blade-barrier-ui-activation.spec.ts`
- Components:
  - `src/components/CardDetailView.svelte` (Integrated selection UI display)
  - `src/components/PlayerPowerCards.svelte` (Card panel and state management)
  - `src/components/GameBoard.svelte` (On-map selection logic, removed modal overlay)
