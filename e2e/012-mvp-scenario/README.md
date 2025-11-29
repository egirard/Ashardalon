# 012 - MVP Scenario: Defeat Two Monsters

## User Story

As a player, I want to win the game by defeating two monsters, so that I can experience a complete game session with a clear victory condition.

As a player, if my party is eliminated before defeating two monsters, I want to see a defeat screen so I know the game has ended.

## Test Coverage

This test suite verifies the MVP scenario implementation:

1. **Objective Display** - Shows current progress "0 / 2 defeated" on the game board
2. **Victory Condition** - Game ends with victory screen after defeating 2 monsters
3. **Defeat Condition** - Game ends with defeat screen when all heroes reach 0 HP
4. **Monster Counter** - Correctly tracks number of monsters defeated

## Screenshots

### Victory Screen
![Victory Screen](012-mvp-scenario.spec.ts-snapshots/000-victory-screen-chromium-linux.png)

Victory screen displayed after defeating 2 monsters, showing:
- 🏆 Victory! heading
- Completion message
- Monsters defeated count
- Return to Character Select button

### Return to Character Select (from Victory)
![Return to Character Select](012-mvp-scenario.spec.ts-snapshots/001-return-to-character-select-chromium-linux.png)

Character selection screen after returning from victory, with scenario state reset.

### Defeat Screen
![Defeat Screen](012-mvp-scenario.spec.ts-snapshots/000-defeat-screen-chromium-linux.png)

Defeat screen displayed when all heroes are eliminated, showing:
- 💀 Defeat heading
- Progress made before defeat
- Return to Character Select button

### Return to Character Select (from Defeat)
![Return from Defeat](012-mvp-scenario.spec.ts-snapshots/001-return-from-defeat-chromium-linux.png)

Character selection screen after returning from defeat, with scenario state reset.

## Automated Test Coverage

All items are verified programmatically by the test suite:

| Verification Item | Test |
|-------------------|------|
| Objective display shows "🎯 Objective: Defeat 2 monsters" | `Objective display shows current progress` |
| Progress shows "0 / 2 defeated" at game start | `Objective display shows current progress` |
| Progress updates to "1 / 2 defeated" after first monster kill | `Monster defeat counter increments correctly` |
| Victory screen appears after defeating second monster | `Victory screen appears after defeating 2 monsters` |
| Victory screen shows 🏆 icon and "Victory!" title | `Victory screen appears after defeating 2 monsters` |
| Defeat screen appears when all heroes reach 0 HP | `Defeat screen appears when all heroes are eliminated` |
| Defeat screen shows 💀 icon and "Defeat" title | `Defeat screen appears when all heroes are eliminated` |
| Both screens have "Return to Character Select" button | Victory and Defeat tests |
| Returning to menu resets game state | Victory and Defeat tests |
