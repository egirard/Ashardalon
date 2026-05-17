# Test 128: Cultist "Move and Attack" Behavior

## User Story

As a player, when a Cultist activates during the villain phase and is within 1 tile of a Hero (but NOT already adjacent), I expect it to:
1. **Move adjacent** to the closest Hero, AND
2. **Attack with a Dagger** (+6 attack bonus, 1 damage, Poisoned on hit)

This is the second condition on the official Cultist card.

## Bug Fixed

**Issue**: Cultist "move and attack" was not executed

When a Cultist was within 1 tile of a Hero and needed to cross to the Hero's tile, if the **scorch mark** on the Hero's tile was **occupied** (e.g., by another Hero), a `choose-tile-entry-position` decision was created. After the player selected a tile entry position, only the **move** was executed — the **attack was silently skipped**.

### Root Cause

In `gameSlice.ts`, the `activateNextMonster` handler correctly identified the move-and-attack scenario but returned early (via `return`) when the scorch mark was occupied to await player input. When `selectMonsterPosition` resolved the tile-entry decision, it moved the monster but did not check whether a pending attack needed to be executed.

### Fix

1. **`types.ts`**: Extended `PendingMonsterDecision.options` with an optional `pendingAttack` field (`{ targetId, attackResult }`) to carry the pre-rolled attack data through the decision.

2. **`gameSlice.ts`** — `activateNextMonster`: When creating the `choose-tile-entry-position` decision for a `move-and-attack` context, store the pre-rolled attack result in `options.pendingAttack`.

3. **`gameSlice.ts`** — `selectMonsterPosition`: After moving the monster to the chosen position, check if `decision.options.pendingAttack` is set (and context is `'move-and-attack'`). If so, apply the attack: deal damage, apply status effects, log the event.

---

## Test 1: Standard Move-and-Attack (Scorch Mark Free)

### Screenshot 000: Board Before Villain Phase

![Board before villain phase](128-cultist-move-and-attack.spec.ts-snapshots/000-board-before-villain-phase-chromium-linux.png)

**Verification**:
- Cultist is on the east tile (adjacent to start tile)
- Quinn is on the start tile

### Screenshot 001: Cultist Move-and-Attack Result

![Cultist move-and-attack result](128-cultist-move-and-attack.spec.ts-snapshots/001-cultist-move-and-attack-result-chromium-linux.png)

**Verification**:
- `monsterAttackResult` is not null (attack fired)
- Attack bonus is +6 (Dagger)
- Target is Quinn

### Screenshot 002: Move-and-Attack Complete

![Cultist move-and-attack complete](128-cultist-move-and-attack.spec.ts-snapshots/002-cultist-move-and-attack-complete-chromium-linux.png)

**Verification**:
- Quinn's HP reduced by 1 (Dagger damage)
- Cultist moved to start tile
- Combat log contains "moves and attacks"

---

## Test 2: Bug-Fix Path — Attack After Tile-Entry Decision (Occupied Scorch Mark)

### Screenshot 000: After Cultist Activation

![After cultist activation](128-cultist-move-and-attack.spec.ts-snapshots/000-after-cultist-activation-chromium-linux.png)

**Verification**:
- Either a tile-entry decision is pending OR attack result already shown

### Screenshot 001: Attack After Tile-Entry Choice

![Cultist attack after tile entry](128-cultist-move-and-attack.spec.ts-snapshots/001-cultist-attack-after-tile-entry-chromium-linux.png)

**Verification**:
- `monsterAttackResult` is not null (attack fired after tile entry — the bug fix)
- Attack bonus is +6 (Dagger)
- Cultist is now on the hero's tile

### Screenshot 002: HP Reduced

![Tile entry attack complete](128-cultist-move-and-attack.spec.ts-snapshots/002-cultist-tile-entry-attack-complete-chromium-linux.png)

**Verification**:
- At least one hero has HP reduced (confirming attack dealt damage)
