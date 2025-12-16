# E2E Test 044: Multi-Target Attacks

This test suite verifies the multi-target attack capabilities in the game, specifically testing:
1. **Arcing Strike (ID 25)** - A Paladin daily power that can attack one or two adjacent monsters
2. **Hurled Breath (ID 41)** - Haskan's custom ability that attacks all monsters on a chosen tile within 2 tiles

## Test Coverage

### Test 1: Arcing Strike (ID 25) - Multi-Target Adjacent Attack

**User Story**: As a Paladin player using Keyleth, I can use Arcing Strike to attack multiple adjacent monsters in a single action.

**Verification Points**:
- Keyleth is selected and the game starts successfully
- Two monsters are placed adjacent to the hero
- The game state correctly tracks multiple adjacent enemies
- Multiple combat results can be generated for each target

### Test 2: Hurled Breath (ID 41) - Area Attack on Tile

**User Story**: As Haskan (Dragonborn Wizard), I can use Hurled Breath to target a tile and attack all monsters on that tile.

**Verification Points**:
- Haskan is selected and the game starts successfully  
- Two monsters are placed on the same tile
- The game state correctly tracks multiple monsters on a single tile
- Area attacks can target multiple monsters on the chosen tile

## Screenshots

### Arcing Strike Test

![Game Started - Keyleth](044-multi-target-attacks.spec.ts-snapshots/000-game-started-keyleth-chromium-linux.png)
*Game starts with Keyleth (Paladin) selected*

![Two Monsters Adjacent](044-multi-target-attacks.spec.ts-snapshots/001-two-monsters-adjacent-chromium-linux.png)
*Two kobolds are positioned adjacent to Keyleth, demonstrating the setup for Arcing Strike*

### Hurled Breath Test

![Game Started - Haskan](044-multi-target-attacks.spec.ts-snapshots/000-game-started-haskan-chromium-linux.png)
*Game starts with Haskan (Dragonborn Wizard) selected*

![Two Monsters on Same Tile](044-multi-target-attacks.spec.ts-snapshots/001-two-monsters-on-same-tile-chromium-linux.png)
*Two kobolds are positioned on the same tile, demonstrating the setup for Hurled Breath area attack*

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
