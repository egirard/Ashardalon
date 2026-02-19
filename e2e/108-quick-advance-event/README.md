# 108 - Quick Advance Encounter Card

Tests the complete lifecycle of the **Quick Advance** event card:
- Drawing the card
- Monster movement toward the active hero
- Resolution with player choice (multiple monsters)
- Discard and follow-up encounter draw

## Scenarios

### Scenario 1: No Monsters in Play

When Quick Advance is drawn with no monsters in play, the card is discarded with a message and another encounter card is drawn immediately.

![Character Select](108-quick-advance-event.spec.ts-snapshots/000-character-select-screen-chromium-linux.png)

![No Monsters Initial State](108-quick-advance-event.spec.ts-snapshots/001-no-monsters-initial-state-chromium-linux.png)

![Quick Advance Drawn No Monsters](108-quick-advance-event.spec.ts-snapshots/002-quick-advance-drawn-no-monsters-chromium-linux.png)

![Card Discarded No Effect](108-quick-advance-event.spec.ts-snapshots/003-card-discarded-no-effect-chromium-linux.png)

### Scenario 2: Single Monster Present

When Quick Advance is drawn with a single monster, it automatically moves that monster one step closer to the active hero.

![Single Monster Present](108-quick-advance-event.spec.ts-snapshots/000-single-monster-present-chromium-linux.png)

![Quick Advance Drawn Single Monster](108-quick-advance-event.spec.ts-snapshots/001-quick-advance-drawn-single-monster-chromium-linux.png)

![Monster Moved Closer](108-quick-advance-event.spec.ts-snapshots/002-monster-moved-closer-chromium-linux.png)

### Scenario 3: Multiple Monsters Present

When Quick Advance is drawn with multiple monsters, the player must choose which monster to move. After the choice, the selected monster moves one step closer to the active hero.

![Multiple Monsters Present](108-quick-advance-event.spec.ts-snapshots/000-multiple-monsters-present-chromium-linux.png)

![Quick Advance Drawn Multiple Monsters](108-quick-advance-event.spec.ts-snapshots/001-quick-advance-drawn-multiple-monsters-chromium-linux.png)

![Monster Choice Modal Displayed](108-quick-advance-event.spec.ts-snapshots/002-monster-choice-modal-displayed-chromium-linux.png)

![Monster Selected Effect Applied](108-quick-advance-event.spec.ts-snapshots/003-monster-selected-effect-applied-chromium-linux.png)
