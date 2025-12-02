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

All E2E tests must follow the [E2E Test Guidelines](../E2E_TEST_GUIDELINES.md):

1. **Baseline screenshots committed** - Tests include committed baseline screenshots
2. **Zero-pixel tolerance** - Screenshots must match exactly
3. **No arbitrary delays** - Wait for specific conditions instead
4. **Programmatic verification** - Every screenshot includes DOM/Redux state verification
5. **README with direct links** - Each test has a README with embedded screenshots

## Screenshot Naming

Screenshots are automatically named by Playwright:
- Format: `{spec-name}-{test-name}-{step}-{project}-{platform}.png`
- Example: `001-character-selection.spec.ts-player-selects-hero-and-starts-game-1-chromium-linux.png`
