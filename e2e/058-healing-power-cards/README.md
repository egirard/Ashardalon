# 058 - Healing Power Cards (Healing Hymn, Dwarven Resilience, Lay On Hands)

## User Story

As a player, I want to use healing power cards to restore HP to myself and my allies during my hero phase, so that I can keep my party alive and continue adventuring.

## Test Scenario

This test validates the implementation of three healing utility power cards:

1. **Healing Hymn (ID 1)** - Cleric custom ability
   - Heals self and one other hero on the same tile for 2 HP each
   - Used during hero phase
   
2. **Dwarven Resilience (ID 11)** - Dwarf custom ability
   - Heals self for 4 HP
   - Used during hero phase instead of moving
   
3. **Lay On Hands (ID 21)** - Paladin custom ability
   - Heals one adjacent ally for 2 HP
   - Used during hero phase

## Test Steps

1. **Setup**: Select three heroes (Quinn/Cleric, Vistra/Dwarf, Keyleth/Paladin)
2. **Scenario Setup**: Position heroes strategically and damage them
3. **Healing Hymn**: Quinn uses Healing Hymn to heal self and Vistra (same tile)
4. **Dwarven Resilience**: Vistra uses Dwarven Resilience to heal self
5. **Lay On Hands**: Keyleth uses Lay On Hands to heal adjacent ally (Quinn)
6. **Validation**: Verify all healing applied correctly and cards are flipped/disabled

## Screenshots

### 1. Initial Setup

![000 - Three Heroes Selected](screenshots/000-three-heroes-selected-chromium-linux.png)
*Quinn (Cleric), Vistra (Dwarf), and Keyleth (Paladin) selected for the adventure*

### 2. Heroes Damaged and Ready

![001 - Setup Heroes Damaged](screenshots/001-setup-heroes-damaged-chromium-linux.png)
*Heroes positioned and damaged: Quinn (4 HP), Vistra (5 HP), Keyleth (6 HP). Healing Hymn card is eligible and highlighted.*

### 3. Healing Hymn Used

![002 - Healing Hymn Used](screenshots/002-healing-hymn-used-chromium-linux.png)
*Quinn activates Healing Hymn, healing both Quinn (4→6 HP) and Vistra (5→7 HP) for 2 HP each. The card is now disabled.*

### 4. Vistra's Turn

![003 - Vistra Turn](screenshots/003-vistra-turn-chromium-linux.png)
*Vistra's turn begins with 7 HP. Dwarven Resilience card is eligible and can be activated.*

### 5. Dwarven Resilience Used

![004 - Dwarven Resilience Used](screenshots/004-dwarven-resilience-used-chromium-linux.png)
*Vistra activates Dwarven Resilience, healing herself for 4 HP (7→10 HP, reaching max HP). The card is now disabled.*

### 6. Keyleth's Turn

![005 - Keyleth Turn](screenshots/005-keyleth-turn-chromium-linux.png)
*Keyleth's turn begins with 6 HP. Lay On Hands card is eligible and can be activated to heal an adjacent ally.*

### 7. Lay On Hands Used

![006 - Lay On Hands Used](screenshots/006-lay-on-hands-used-chromium-linux.png)
*Keyleth activates Lay On Hands, healing adjacent ally Quinn for 2 HP (6→8 HP, reaching max HP). The card is now disabled.*

### 8. All Healing Complete

![007 - All Healing Complete](screenshots/007-all-healing-complete-chromium-linux.png)
*Final state: All three healing power cards have been used and are disabled. Quinn and Vistra are at max HP, Keyleth remains at 6 HP.*

## Verification Points

- ✅ Healing Hymn heals all heroes on the same tile (Quinn and Vistra)
- ✅ Dwarven Resilience heals only the hero using it (Vistra)
- ✅ Lay On Hands heals an adjacent ally (not self)
- ✅ HP is capped at max HP (no overhealing)
- ✅ Power cards are properly flipped/disabled after use
- ✅ Power cards show correct eligible/ineligible/disabled visual states
- ✅ Healing integrates with game state and persists across turns

## Implementation Details

### Game State Actions
- `applyHealing({ heroId, amount })` - Applies healing to a hero, respecting HP cap
- `usePowerCard({ heroId, cardId })` - Flips the power card to mark it as used

### Power Card Eligibility
- Cards are eligible during the active hero's turn in hero phase
- Cards show visual feedback (highlighted when eligible, grayed when ineligible, disabled when used)

### Healing Logic
- **Healing Hymn (ID 1)**: Finds all heroes on the same tile/sub-tile and heals them
- **Dwarven Resilience (ID 11)**: Heals only the hero using the card
- **Lay On Hands (ID 21)**: Finds adjacent heroes (excluding self) and heals one of them

## Related Documentation
- [POWER_CARDS_IMPLEMENTATION.md](../../POWER_CARDS_IMPLEMENTATION.md) - Power card system overview
- [E2E_TEST_GUIDELINES.md](../../E2E_TEST_GUIDELINES.md) - Testing guidelines
