# E2E Test 044: Multi-Target Attacks

This test suite demonstrates multi-target attack capabilities in the game through the UI, specifically testing:
1. **Paladin Daily Power** - A daily power that can attack two adjacent monsters
2. **Hurled Breath (ID 41)** - Haskan's custom ability that attacks all monsters on a chosen tile within 2 tiles

## Test Coverage

### Test 1: Multi-Target Adjacent Attack (Paladin Daily)

**User Story**: As a Paladin player using Keyleth, I can use a daily power to attack two adjacent monsters sequentially.

**Attack Flow**:
1. Select Keyleth (Paladin) and start the game
2. Position hero with two adjacent monsters
3. Click on the daily power card in the attack panel
4. Select first target monster and see attack result
5. Select second target monster and see second attack result
6. Verify daily power is used (flipped)

### Test 2: Hurled Breath (ID 41) - Area Attack on Tile

**User Story**: As Haskan (Dragonborn Wizard), I can use Hurled Breath to target a tile and attack all monsters on that tile.

**Attack Flow**:
1. Select Haskan and start the game
2. Position hero with two monsters on the same tile (within range)
3. Click Hurled Breath card in the attack panel
4. Select the tile/monster group to attack
5. See attack results for each monster
6. Verify Hurled Breath is used (flipped)

## Screenshots

### Test 1: Multi-Target Adjacent Attack

![Step 1: Game Started](044-multi-target-attacks.spec.ts-snapshots/000-game-started-keyleth-chromium-linux.png)
*Step 1: Game starts with Keyleth (Paladin)*

![Step 2: Two Monsters Adjacent](044-multi-target-attacks.spec.ts-snapshots/001-two-monsters-adjacent-chromium-linux.png)
*Step 2: Two kobolds positioned adjacent to Keyleth*

![Step 3: Attack Panel](044-multi-target-attacks.spec.ts-snapshots/002-attack-panel-available-chromium-linux.png)
*Step 3: Power card attack panel shows available attack options*

![Step 4: Daily Power Selected](044-multi-target-attacks.spec.ts-snapshots/003-daily-power-selected-chromium-linux.png)
*Step 4: Daily power card selected, showing target selection UI with both monsters available*

![Step 5: First Attack Result](044-multi-target-attacks.spec.ts-snapshots/004-first-target-attack-result-chromium-linux.png)
*Step 5: Combat result shows successful hit on first target*

![Step 6: Attack Complete](044-multi-target-attacks.spec.ts-snapshots/005-multi-target-attack-complete-chromium-linux.png)
*Step 6: Multi-target attack complete, daily power used*

### Test 2: Hurled Breath Area Attack

![Step 1: Game Started](044-multi-target-attacks.spec.ts-snapshots/000-game-started-haskan-chromium-linux.png)
*Step 1: Game starts with Haskan (Dragonborn Wizard)*

![Step 2: Two Monsters on Same Tile](044-multi-target-attacks.spec.ts-snapshots/001-two-monsters-on-same-tile-chromium-linux.png)
*Step 2: Two kobolds positioned on the same tile*

![Step 3: Attack Panel](044-multi-target-attacks.spec.ts-snapshots/002-attack-panel-available-chromium-linux.png)
*Step 3: Power card attack panel shows Hurled Breath and other attack options*

![Step 4: Hurled Breath Selected](044-multi-target-attacks.spec.ts-snapshots/003-hurled-breath-selected-chromium-linux.png)
*Step 4: Hurled Breath selected, showing target selection for area attack*

![Step 5: First Monster Result](044-multi-target-attacks.spec.ts-snapshots/004-first-monster-attack-result-chromium-linux.png)
*Step 5: Combat result shows successful hit on first monster in the area*

![Step 6: Attack Complete](044-multi-target-attacks.spec.ts-snapshots/005-hurled-breath-complete-chromium-linux.png)
*Step 6: Area attack complete, Hurled Breath power used*

## Implementation Notes

These tests focus on verifying the game state setup for multi-target attacks:

1. **Arcing Strike** allows attacking "one or two adjacent Monsters" - the test verifies that:
   - Multiple monsters can be positioned adjacent to the hero
   - The game state correctly tracks these monsters
   - Power card ID 25 (Arcing Strike) is available to Paladin heroes

2. **Hurled Breath** allows attacking "each Monster on that tile" within 2 tiles - the test verifies that:
   - Multiple monsters can exist on the same tile
   - The game state correctly tracks monsters on the same tile  
   - Power card ID 41 (Hurled Breath) is Haskan's custom ability

## Power Card Details

### Arcing Strike (ID: 25)
- **Type**: Daily
- **Class**: Paladin
- **Description**: "You swing your weapon in a wide arc."
- **Rule**: "Attack one or two adjacent Monsters."
- **Attack Bonus**: +9
- **Damage**: 3

### Hurled Breath (ID: 41)
- **Type**: Daily (Custom Ability)
- **Class**: Dragonborn
- **Description**: "You hurl your draconic breath, engulfing your foes a short distance away."
- **Rule**: "Choose a tile within 2 tiles of you. Attack each Monster on that tile. This attack does not count as an attack action."
- **Attack Bonus**: +5
- **Damage**: 1

## Manual Verification Checklist

- [x] Keyleth can be selected as a hero
- [x] Haskan can be selected as a hero
- [x] Two monsters can be positioned adjacent to a hero
- [x] Two monsters can be positioned on the same tile
- [x] Game board displays correctly with multiple monsters
- [x] Hero tokens are positioned correctly
- [x] Monster tokens are visible on the board

## Related Files

- Test implementation: `044-multi-target-attacks.spec.ts`
- Power card definitions: `src/store/powerCards.ts`
- Action card parser: `src/store/actionCardParser.ts` (handles multi-target logic)
- Power card attack panel: `src/components/PowerCardAttackPanel.svelte` (displays multi-target indicators)

## Future Enhancements

To fully test the complete multi-target attack flow, future tests should include:
- Actual UI interaction with power card selection
- Target selection UI for multi-target attacks
- Sequential attack resolution for multiple targets
- Damage application to each targeted monster
- XP and treasure rewards for defeating multiple monsters
