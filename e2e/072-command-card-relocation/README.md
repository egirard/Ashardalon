# 072 - Command Card Monster Relocation

## User Story

As a player controlling Quinn the Cleric with the Command utility power, I want to relocate a monster on my tile to a different tile within 2 tiles of my position, so that I can strategically reposition enemies for tactical advantage.

## Test Coverage

This E2E test verifies:
- Quinn (Cleric) can be selected with Command power card
- Game starts successfully with Command card visible
- Monster can be spawned on the same tile as hero
- Command card details panel appears when clicked
- **In Progress**: Activation triggers monster selection UI
- **In Progress**: Monster can be selected by tapping on map
- **In Progress**: Destination tile can be selected from highlighted options
- **In Progress**: Monster relocates to new tile after confirmation
- **In Progress**: Command card is marked as used after relocation
- **In Progress**: Cancel button dismisses selection at any step

## Test Flow

### Step 1: Quinn Selected
![Screenshot 000](072-command-card-relocation.spec.ts-snapshots/000-quinn-selected-chromium-linux.png)

**What's verified:**
- Quinn (Cleric) is selected from bottom edge
- Start Game button is enabled with pre-selected powers
- Hero selection uses tabletop layout

**Programmatic checks:**
- Hero has "selected" class
- Start button is enabled

### Step 2: Game Started
![Screenshot 001](072-command-card-relocation.spec.ts-snapshots/001-game-started-chromium-linux.png)

**What's verified:**
- Game board is visible
- Power cards panel is rendered
- Command card (ID: 9) is visible and programmatically assigned

**Programmatic checks:**
- `[data-testid="player-power-cards"]` is visible
- `[data-testid="power-card-9"]` is visible

### Step 3: Monster and Hero on Tile
![Screenshot 002](072-command-card-relocation.spec.ts-snapshots/002-monster-and-hero-on-tile-chromium-linux.png)

**What's verified:**
- Kobold monster spawned on same tile as hero
- Both hero and monster tokens visible
- North tile added for relocation destination

**Programmatic checks:**
- 1 monster exists in game state
- Hero at position (2, 3)
- Monster at position (2, 4) on same tile

### Step 4: Command Card Details Shown
![Screenshot 003](072-command-card-relocation.spec.ts-snapshots/003-command-card-details-shown-chromium-linux.png)

**What's verified:**
- Clicking Command card shows PowerCardDetailsPanel
- Details panel displays card name, description, and rule text
- "ACTIVATE" button is visible in the details panel
- Card information matches expected Command card text

**Programmatic checks:**
- Power Card Details Panel is visible
- Card description contains "You utter a single word"
- Activate button is present

### Step 5: Monster Selection Prompt
**Status**: Test implementation in progress

**Expected verification:**
- After clicking "ACTIVATE", monster relocation selection UI appears
- Instructions show "Select Monster"
- Text reads "Click a monster on your tile"
- Cancel button is available
- Monster on same tile is highlighted as selectable

### Step 6: Monster Selected, Tile Prompt
**Status**: Test implementation in progress

**Expected verification:**
- After clicking monster, UI updates to "Select Destination"
- Instructions show "Click a tile within 2 tiles of your position"
- Valid destination tiles (within 2 tiles of hero) are highlighted
- Selected monster remains highlighted
- Cancel button still available

### Step 7: Monster Relocated
**Status**: Test implementation in progress

**Expected verification:**
- After clicking destination tile, monster position updates
- Monster's `tileId` changes to selected tile
- Command card is marked as used (flipped)
- Selection UI dismisses
- Monster visible at new location on map

### Step 8: Cancel at Monster Selection
**Status**: Test in progress (second test scenario)

**Expected verification:**
- Cancel button works during monster selection step
- Selection UI dismisses when cancel is clicked
- Command card remains unused (not flipped)
- No monster relocation occurs

## Implementation Status

### Completed
- ✅ Monster relocation state management in GameBoard
- ✅ PowerCardDetailsPanel integration for relocation UI
- ✅ Monster and tile selection handlers
- ✅ Eligibility checks for Command and Distant Diversion
- ✅ Card activation routing for relocation cards
- ✅ Test setup with hero, monster, and multiple tiles

### In Progress
- 🔨 E2E test execution - currently debugging activation flow
- 🔨 Screenshot baseline generation - 4 of 7+ screenshots complete
- 🔨 Activation button integration with relocation flow

### Known Issues
- Activation button click does not trigger monster relocation selection UI
- Need to investigate PowerCardDetailsPanel → GameBoard event flow
- May need to add debugging to verify `onActivatePowerCard` callback

## Manual Verification Checklist

- [ ] Command card shows as eligible when monster on same tile
- [ ] Clicking card shows details panel with Activate button
- [ ] Clicking Activate starts monster selection
- [ ] Monsters on same tile are highlighted and clickable
- [ ] Clicking monster advances to tile selection
- [ ] Tiles within 2 tiles of hero are highlighted
- [ ] Clicking tile relocates monster
- [ ] Card flips to "used" state after relocation
- [ ] Cancel works at both selection steps

## Test Metadata

- **Test ID:** 072
- **Category:** Power Card Utility - Monster Relocation
- **Complexity:** High (two-step map selection with state management)
- **User Actions:** 7+ clicks (hero select, start game, card select, activate, monster select, tile select)
- **Screenshots:** 4 of 7+ generated (partial completion)
- **Selection Method:** Direct map interaction (tap monster, tap tile)
- **UI Pattern:** PowerCardDetailsPanel with inline selection instructions

## Related Files

- Test: `e2e/072-command-card-relocation/072-command-card-relocation.spec.ts`
- Components:
  - `src/components/GameBoard.svelte` (relocation state and handlers)
  - `src/components/PowerCardDetailsPanel.svelte` (relocation UI display)
  - `src/components/PlayerPowerCards.svelte` (card activation routing)
- State: `src/store/powerCardEligibility.ts` (Command card eligibility)

## Future Work

- Complete E2E test debugging and screenshot generation
- Create similar test 073 for Distant Diversion card
- Add edge cases: no valid destinations, cancel at tile selection
- Test with multiple monsters on tile
