# 030 - Player Card Display

## User Story

As a player, I want to see my hero's complete status on my player card including HP, stats (AC, Surge, Speed), attack info, power cards, and treasure items so that I can make informed decisions during gameplay.

## Test Scenario

This test verifies that player cards:
1. Display all core hero stats (HP, AC, Surge, Speed)
2. Show the hero's basic attack information
3. Display power cards with their types and usage state
4. Update dynamically when HP changes (e.g., after taking damage)
5. Display treasure items when equipped
6. Show when power cards are flipped/used

## Screenshots

### 000 - Player Card Initial State
The player card showing Vistra's complete stats at game start:
- Name and class
- HP bar with current/max HP
- Core stats (AC: 18, Surge: 5, Speed: 5)
- Attack info (Warhammer +8, 2 dmg)
- Power cards (utility, at-wills, daily)

![Player Card Initial State](030-player-card-display.spec.ts-snapshots/000-player-card-initial-state-chromium-linux.png)

### 001 - Player Card After Damage
The player card after the hero takes 3 damage:
- HP updated from 10/10 to 7/10
- HP bar visually reflects the damage (70% fill)

![Player Card After Damage](030-player-card-display.spec.ts-snapshots/001-player-card-after-damage-chromium-linux.png)

### 002 - Player Card With Treasure
The player card after equipping a +1 Magic Sword:
- Treasure items section appears
- Item displays with appropriate icon and name

![Player Card With Treasure](030-player-card-display.spec.ts-snapshots/002-player-card-with-treasure-chromium-linux.png)

### 003 - Player Card With Flipped Power
The player card after using the daily power:
- Daily power card shows as flipped/used
- Visual indicator (dimmed, with ✗) shows the card is spent

![Player Card With Flipped Power](030-player-card-display.spec.ts-snapshots/003-player-card-with-flipped-power-chromium-linux.png)

## Verification Checklist

- [ ] Hero name and class display correctly
- [ ] HP shows current and max values
- [ ] HP bar fills proportionally and changes color at thresholds
- [ ] AC, Surge, and Speed stats are visible and accurate
- [ ] Attack info shows name, bonus, and damage
- [ ] Power cards display with type indicators (AW, D, U)
- [ ] Flipped power cards appear dimmed with ✗ indicator
- [ ] Treasure items appear in a separate section when equipped
- [ ] Player card updates reactively when state changes
