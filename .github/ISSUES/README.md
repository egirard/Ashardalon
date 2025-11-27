# Implementation Issues

This directory contains detailed issue specifications for implementing the Wrath of Ashardalon web application. Each issue corresponds to a user story from the [Implementation Plan](../../implementation-plan.md).

## Overview

These issue files can be used to create GitHub Issues for tracking development progress. Each issue includes:

- **User Story**: The feature from the user's perspective
- **Acceptance Criteria**: Checkboxes for verifying completion
- **Design**: Technical design including data models, components, and UI layouts
- **Implementation Tasks**: Detailed breakdown of work
- **Unit Tests**: Tests for logic and components
- **E2E Test**: Playwright test specification with screenshot sequence
- **Dependencies**: Which issues must be completed first

## Issue Index

### Phase 1: Foundation (Issues 001-005)

| Issue | Title | Description |
|-------|-------|-------------|
| [001](001-view-hero-selection-screen.md) | View Hero Selection Screen | Display 5 heroes on app load |
| [002](002-select-heroes-for-game.md) | Select Heroes for Game | Toggle selection, enable Start Game |
| [003](003-start-game-and-see-board.md) | Start Game and See Board | Navigate to game board with Start Tile |
| [004](004-see-hero-positions-on-start-tile.md) | See Hero Positions on Start Tile | Position hero tokens on Start Tile |
| [005](005-see-current-turn-indicator.md) | See Current Turn Indicator | Show whose turn and current phase |

### Phase 2: Exploration (Issues 006-008)

| Issue | Title | Description |
|-------|-------|-------------|
| [006](006-move-a-hero.md) | Move a Hero | Select destination, move token |
| [007](007-explore-and-place-new-tile.md) | Explore and Place New Tile | Draw and place tiles on exploration |
| [008](008-spawn-monster-on-exploration.md) | Spawn Monster on Exploration | Spawn monster when tile placed |

### Phase 3: Combat (Issues 009-012)

| Issue | Title | Description |
|-------|-------|-------------|
| [009](009-hero-attacks-monster.md) | Hero Attacks Monster | Attack roll, damage, hit/miss |
| [010](010-monster-attacks-hero.md) | Monster Attacks Hero | Monster AI movement and attacks |
| [011](011-defeat-monster-and-gain-xp.md) | Defeat Monster and Gain XP | Remove defeated monsters, gain XP |
| [012](012-draw-treasure-on-monster-defeat.md) | Draw Treasure on Monster Defeat | Draw treasure cards, inventory |

### Phase 4: Resources (Issues 013-016)

| Issue | Title | Description |
|-------|-------|-------------|
| [013](013-draw-encounter-card.md) | Draw Encounter Card | Draw encounters when no exploration |
| [014](014-use-healing-surge.md) | Use Healing Surge | Auto-heal at 0 HP |
| [015](015-cancel-encounter-with-xp.md) | Cancel Encounter with XP | Spend 5 XP to cancel encounters |
| [016](016-level-up-hero.md) | Level Up Hero | Level up on natural 20 with 5+ XP |

### Phase 5: Game Flow (Issues 017-019)

| Issue | Title | Description |
|-------|-------|-------------|
| [017](017-complete-turn-cycle.md) | Complete Turn Cycle | Pass turns between heroes |
| [018](018-party-defeat.md) | Party Defeat | Game over when heroes fall |
| [019](019-win-adventure.md) | Win Adventure | Victory when objective completed |

## Dependency Graph

```
001 → 002 → 003 → 004 → 005 → 006 ─┬→ 007 → 008 → 009 → 011 ─┬→ 012
                                   │                         │
                                   │                         └→ 016
                                   │
                                   └→ 010 ─┬→ 014 → 018
                                           │
                                           └→ 013 → 015

017 requires: 005, 006, 010, 013
019 requires: 008, 011
```

## Creating GitHub Issues

To create GitHub issues from these files:

### Manual Creation

1. Open GitHub Issues for the repository
2. Click "New Issue"
3. Copy the content from the corresponding `.md` file
4. Add appropriate labels (listed at bottom of each file)
5. Set milestone if applicable
6. Assign to developer if known

### Using GitHub CLI

```bash
# Navigate to repository
cd /path/to/Ashardalon

# Create issue from file
gh issue create --title "View Hero Selection Screen" \
  --body-file .github/ISSUES/001-view-hero-selection-screen.md \
  --label "user-story,phase-1,ui,setup"
```

### Labels to Create

Before creating issues, set up these labels:

| Label | Color | Description |
|-------|-------|-------------|
| `user-story` | `#0E8A16` | User-visible feature |
| `phase-1` | `#5319E7` | Foundation phase |
| `phase-2` | `#5319E7` | Exploration phase |
| `phase-3` | `#5319E7` | Combat phase |
| `phase-4` | `#5319E7` | Resources phase |
| `phase-5` | `#5319E7` | Game flow phase |
| `ui` | `#FBCA04` | User interface work |
| `gameplay` | `#B60205` | Game mechanics |
| `state-management` | `#1D76DB` | State/store work |
| `navigation` | `#D4C5F9` | Screen navigation |
| `movement` | `#F9D0C4` | Hero movement |
| `exploration` | `#C5DEF5` | Tile exploration |
| `monsters` | `#E99695` | Monster system |
| `combat` | `#B60205` | Combat system |
| `monster-ai` | `#BFDADC` | Monster behavior |
| `xp` | `#FEF2C0` | Experience points |
| `treasure` | `#D4AF37` | Treasure system |
| `encounters` | `#D93F0B` | Encounter cards |
| `healing` | `#0E8A16` | Healing mechanics |
| `leveling` | `#9B59B6` | Level up system |
| `turn-management` | `#006B75` | Turn/phase system |
| `game-end` | `#B60205` | Win/lose conditions |
| `adventure` | `#0052CC` | Adventure system |
| `setup` | `#C2E0C6` | Initial setup |

## E2E Test Numbers

Each issue has a numbered E2E test (001-019) corresponding to the test guidelines in [E2E_TEST_GUIDELINES.md](../../E2E_TEST_GUIDELINES.md).

| Test # | Issue | Feature |
|--------|-------|---------|
| 001 | View Hero Selection Screen | Initial app load |
| 002 | Select Heroes for Game | Hero selection |
| 003 | Start Game and See Board | Game board display |
| 004 | See Hero Positions | Token placement |
| 005 | See Current Turn Indicator | Turn display |
| 006 | Move a Hero | Hero movement |
| 007 | Explore and Place New Tile | Tile placement |
| 008 | Spawn Monster | Monster spawning |
| 009 | Hero Attacks Monster | Hero attack |
| 010 | Monster Attacks Hero | Monster attack |
| 011 | Defeat Monster and Gain XP | Monster defeat |
| 012 | Draw Treasure | Treasure cards |
| 013 | Draw Encounter Card | Encounter cards |
| 014 | Use Healing Surge | Healing |
| 015 | Cancel Encounter with XP | XP spending |
| 016 | Level Up Hero | Leveling |
| 017 | Complete Turn Cycle | Turn cycle |
| 018 | Party Defeat | Game loss |
| 019 | Win Adventure | Game win |

## Notes

- Each issue is designed to be a complete vertical slice
- Issues should be implemented in order when possible
- Some issues can be worked on in parallel (see dependency graph)
- Each issue should have passing E2E tests before moving to the next
