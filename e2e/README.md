# E2E Test Overview

This directory contains end-to-end tests for the Wrath of Ashardalon web application.

## Test Structure

Each E2E test is organized in its own directory with the naming convention `###-<testname>`:

```
e2e/
├── helpers/
│   └── screenshot-helper.ts    # Screenshot helper utility
├── 001-character-selection/
│   ├── 001-character-selection.spec.ts
│   ├── README.md
│   └── screenshots/
└── README.md                   # This file
```

## Available Tests

| Test | Description |
|------|-------------|
| [001-character-selection](001-character-selection/README.md) | Character selection to game board flow |
| [006-hero-movement](006-hero-movement/README.md) | Hero movement using the movement UI |
| [007-tile-exploration](007-tile-exploration/README.md) | Tile exploration mechanics (programmatic) |
| [008-movement-triggers-exploration](008-movement-triggers-exploration/README.md) | **Complete user experience**: movement UI triggers tile exploration |
| [011-hero-turn-structure](011-hero-turn-structure/README.md) | Hero turn action enforcement: valid move/attack sequences |
| [025-treasure-on-defeat](025-treasure-on-defeat/README.md) | Treasure drawing on monster defeat |
| [027-treasure-cards](027-treasure-cards/README.md) | Complete treasure card system: draw, view, assign, discard |
| [036-encounter-effect-notifications](036-encounter-effect-notifications/README.md) | Special encounter cards display effect notifications |
| [037-curse-and-special-events](037-curse-and-special-events/README.md) | Curse cards apply status effects |
| [038-encounter-cards-comprehensive](038-encounter-cards-comprehensive/README.md) | **Comprehensive**: All encounter types tested (damage, attack, curse, environment, trap, hazard, special) |
| [043-monster-move-dialog-orientation](043-monster-move-dialog-orientation/README.md) | Monster move dialog rotates to face controlling player |
| [051-righteous-smite](051-righteous-smite/README.md) | Righteous Smite power card: area healing on hit or miss |
| [072-command-card-relocation](072-command-card-relocation/README.md) | Command power card: Monster relocation system with two-step selection (monster → tile) |
| [091-kobold-warren](091-kobold-warren/README.md) | Kobold Warren encounter: filter monster deck for reptiles |
| [115-room-set-placement](115-room-set-placement/README.md) | Room set placement: Chamber Entrance reveals Obsidian Sanctum (Adventure 14) |
| [116-villain-display-and-activation](116-villain-display-and-activation/README.md) | Villain token, HP bar, shield badge, and per-turn activation (Adventure 14) |
| [117-villain-defeat-victory](117-villain-defeat-victory/README.md) | Victory screen when villain defeated (Adventures 14 and 15) |
| [118-tile-deck-exhaustion-defeat](118-tile-deck-exhaustion-defeat/README.md) | Defeat screen when tile deck exhausted before chamber found (Adventure 15) |
| [119-deck-recipe](119-deck-recipe/README.md) | Deck recipe: Chamber Entrance at position 10 (Adv 14) or 12 (Adv 15) |
| [120-adventure-14-trigger-rules](120-adventure-14-trigger-rules/README.md) | Adventure 14 trigger rules: Creeping Void, Daze All Heroes, Reflect Natural One |
| [121-adventure-15-trigger-rules](121-adventure-15-trigger-rules/README.md) | Adventure 15 trigger rules: Forge Awakens modifiers, Heat Exhaustion (Volcanic Vent) |

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run with UI mode for debugging
npm run test:e2e:ui

# View test report
npm run test:e2e:report

# Update baseline screenshots
npm run test:e2e -- --update-snapshots
```

## Guidelines

All E2E tests must follow the [E2E Test Guidelines](../docs/E2E_TEST_GUIDELINES.md):

1. **Baseline screenshots committed** - Tests include committed baseline screenshots
2. **Zero-pixel tolerance** - Screenshots must match exactly
3. **No arbitrary delays** - Wait for specific conditions instead
4. **Programmatic verification** - Every screenshot includes DOM/Redux state verification
5. **README with direct links** - Each test has a README with embedded screenshots

## Screenshot Naming

Screenshots are automatically named by Playwright:
- Format: `{spec-name}-{test-name}-{step}-{project}-{platform}.png`
- Example: `001-character-selection.spec.ts-player-selects-hero-and-starts-game-1-chromium-linux.png`
