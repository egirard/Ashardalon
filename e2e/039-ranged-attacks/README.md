# E2E Test 039 - Ranged Attacks

## User Story

As a player using a Wizard hero (Haskan), I want to attack monsters at range using ranged power cards like Ray of Frost and Arc Lightning, so that I can defeat enemies without being adjacent to them.

## Test Scenario

This test demonstrates the ranged attack system by:

1. **Selecting Haskan (Wizard)** from the character selection screen (selected from bottom/south)
2. **Starting the game** with Haskan's power cards including ranged attacks
3. **Positioning monsters** at various distances from the hero
4. **Using Ray of Frost** (2 tile range) to attack a monster at distance
5. **Using Arc Lightning** (1 tile range) to attack another monster
6. **Verifying** that range indicators appear on power cards
7. **Verifying** that only valid targets within range are shown

## Key Features Demonstrated

### Ranged Attack Cards

- **Ray of Frost** (Wizard, At-Will): Attack one Monster within 2 tiles
- **Arc Lightning** (Wizard, At-Will): Attack up to two Monsters within 1 tile

### Range Calculation

- Uses Chebyshev distance (chessboard metric) for tile counting
- Properly handles cross-tile attacks
- Visual range indicators on power cards (e.g., "Range: 2 tiles")

### UI Behavior

- Power card attack panel shows available ranged attacks
- Target selection filters to only show monsters within range of selected card
- Range indicators help players understand which cards can reach which targets

## Screenshot Gallery

### Character Selection

![Screenshot 000 - Character Select Screen](039-ranged-attacks.spec.ts-snapshots/000-character-select-screen-chromium-linux.png)
*Character selection screen with Haskan available*

![Screenshot 001 - Haskan Selected](039-ranged-attacks.spec.ts-snapshots/001-haskan-selected-chromium-linux.png)
*Haskan (Wizard) selected from bottom of screen with power cards chosen*

![Screenshot 002 - Game Started](039-ranged-attacks.spec.ts-snapshots/002-game-started-chromium-linux.png)
*Game board with Haskan positioned and ready to demonstrate ranged attacks*

## Note on Screenshots

This e2e test currently generates 3 baseline screenshots demonstrating the initial setup for ranged attacks. The test validates that:
- Haskan (Wizard) can be selected from the character screen
- Power cards are properly selected including ranged attack cards (Ray of Frost, Arc Lightning)
- The game starts successfully with Haskan positioned on the board

The complete test flow including monster targeting and ranged attack execution is implemented in the test specification, but full screenshot capture requires the complete game flow to be working end-to-end.

## Manual Verification Checklist

- [ ] Haskan is selected from the bottom (south) portion of character select screen
- [ ] Power cards show range indicators (e.g., "Range: 1 tile", "Range: 2 tiles")
- [ ] Ray of Frost can target monsters within 2 tiles
- [ ] Arc Lightning can target monsters within 1 tile
- [ ] Melee cards (if any selected) only show adjacent monsters as targets
- [ ] Target selection properly filters based on card range
- [ ] Combat results correctly show ranged attack names
- [ ] Monsters at various distances are correctly identified as in/out of range
- [ ] Screenshots clearly show all UI elements from player perspective

## Implementation Details

### Range Calculation Functions

- `getChebyshevDistance()` - Calculates chessboard distance between positions
- `getManhattanDistance()` - Calculates Manhattan distance for square-based range
- `isWithinTileRange()` - Checks if position is within N tiles (uses Chebyshev)
- `getMonstersWithinRange()` - Finds all monsters within tile range

### UI Components Modified

- `GameBoard.svelte` - Added `getTargetableMonstersForCurrentHero()` function
- `PowerCardAttackPanel.svelte` - Added range filtering and indicators
- Added visual range indicators to power card display

### Power Cards with Ranged Attacks

From the game's power card list:

**Cleric:**
- Sacred Flame (id: 4) - Within 1 tile

**Rogue:**
- Lucky Strike (id: 33) - Within 1 tile
- Positioning Shot (id: 34) - Within 2 tiles

**Wizard:**
- Arc Lightning (id: 42) - Within 1 tile (up to 2 targets)
- Ray of Frost (id: 44) - Within 2 tiles

**Dragonborn (Haskan's race):**
- Hurled Breath (id: 41) - Choose tile within 2 tiles

## Test Data

- **Hero**: Haskan (Wizard)
- **Power Cards**: Ray of Frost (44), Arc Lightning (42)
- **Monsters**: Kobold (adjacent range), Snake (1 tile range)
- **Dice Rolls**: Seeded for deterministic results (18 and 16)

## Related Features

- Attack system (combat.ts)
- Power card system (powerCards.ts)
- Action card parser (actionCardParser.ts)
- Monster targeting
- Global coordinate system for cross-tile calculations
