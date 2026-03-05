# E2E Test Remediation Plan

## Executive Summary

The E2E test suite has accumulated a systemic failure that prevents reliable test execution and screenshot generation. This document identifies root causes, categorizes issues by type and severity, and prescribes a step-by-step remediation process designed to avoid running the full test suite until all issues are resolved.

**Total test files:** 118 spec files across 118 test directories.  
**Estimated broken tests:** 30–40 files require fixes before screenshots can be regenerated.

---

## Root Cause Analysis

### Root Cause 1: Orphaned `PowerCardAttackPanel` Component (Critical)

`src/components/PowerCardAttackPanel.svelte` exists in the codebase but is **not imported in any other component**. The attack card UI has been migrated to `PlayerPowerCards.svelte`, which exposes different `data-testid` attributes.

Because `PowerCardAttackPanel` is never rendered, any test that waits for its elements will always **timeout**, causing the entire test to fail and consuming the full `timeout: 60000ms` budget. This is a primary driver of the overall suite timeout.

**Affected selector pattern (tests will always timeout):**
- `[data-testid="power-card-attack-panel"]` — rendered by the orphaned component
- `[data-testid="attack-card-{id}"]` — card buttons inside the orphaned component (note: NOT `attack-card-expanded-{id}`)

**Replacement selectors in the live UI (`PlayerPowerCards.svelte`):**
| Old selector | New selector | Notes |
|---|---|---|
| `power-card-attack-panel` (container) | `player-power-cards` | Container in `PlayerPowerCards.svelte` |
| `attack-card-{id}` (click to activate) | `power-card-{id}` (click to expand) | Then wait for `attack-card-expanded-{id}` |
| _(no equivalent)_ | `attack-card-expanded-{id}` | Expanded view after clicking `power-card-{id}` |
| `attack-target-{instanceId}` | `attack-target-{instanceId}` | Unchanged — inside expanded card |
| `cancel-move-attack` | `cancel-move-attack` | Unchanged — in both components |

**New attack flow (replacing all `power-card-attack-panel` usage):**
```typescript
// OLD (broken - PowerCardAttackPanel is not rendered)
await page.locator('[data-testid="power-card-attack-panel"]').waitFor({ state: 'visible' });
await page.locator('[data-testid="attack-card-12"]').click();

// NEW (correct - uses PlayerPowerCards)
await page.locator('[data-testid="player-power-cards"]').waitFor({ state: 'visible' });
await page.locator('[data-testid="power-card-12"]').click();
await page.locator('[data-testid="attack-card-expanded-12"]').waitFor({ state: 'visible' });
await page.locator('[data-testid="attack-target-{instanceId}"]').click();
```

**Number of affected test files:**
- 14 files reference `power-card-attack-panel`
- 12 files reference `attack-card-{id}` (non-expanded form, from the orphaned component)
- Many files overlap between the two

Files affected:
```
020-power-card-use, 024-reaping-strike, 029-treasure-item-bonuses,
039-ranged-attacks, 044-multi-target-attacks, 046-movement-before-attack,
048-attack-then-move, 050-area-attacks-tile, 051-righteous-smite,
052-clerics-shield, 053-comeback-strike, 054-tornado-strike,
060-attack-cards-valid-targets, 065-cross-tile-adjacency,
082-dragon-fear-curse
```

### Root Cause 2: Arbitrary `waitForTimeout` Usage (Fragility)

42 test files use `page.waitForTimeout()`, which violates the E2E test guidelines and is a primary cause of test timeouts in CI. These tests introduce cumulative latency that causes the full suite to exceed time limits.

Worst offenders (multiple calls per test):
```
050-area-attacks-tile (5 calls × 500ms = 2500ms per test)
097-player-panel-font-scaling (5 calls × 800ms = 4000ms per test)
111-ancient-spirits-blessing (3 calls × 500ms = 1500ms per test)
096-monster-triggered-exploration (5 calls × 200–500ms = ~2000ms per test)
```

### Root Cause 4: Stale Redux Action Dispatches (Logic Errors)

Some tests dispatch Redux actions that may have been renamed, removed, or have changed payload shapes. These tests fail silently (no UI reaction) or throw errors in the browser console.

Key action types that need verification:
- `game/setHeroPosition` ✅ confirmed in source
- `game/setMonsters` ✅ confirmed in source
- `game/setHeroTurnActions` ✅ confirmed in source
- `game/setAttackResult` ✅ confirmed in source
- `game/setState` — bulk state override, may be misused

### Root Cause 5: Stale Screenshot Baselines (Widespread)

Visual changes to the application have made many existing screenshot baselines outdated. This means the entire baseline corpus needs to be regenerated after all logic/selector fixes are applied.

**Update (2026-03-04):** Test 001 screenshot baselines are now current and the test passes cleanly. The earlier note about a 71% pixel difference on test 001 is no longer accurate — screenshots appear to have been regenerated. Other tests may still have stale baselines.

**Scope:** Tests with logic errors or selector migrations (see Root Cause 1) will also need baseline regeneration. This is best done via the `update-screenshots.yml` workflow in filtered batches after all logic fixes are in place.

---

## Remediation Strategy

### Key Principle: Never Run the Full Suite

Running all 118 tests at once:
1. Takes 30+ minutes and exceeds CI timeouts
2. Makes failures hard to diagnose (failures cascade)
3. Wastes time regenerating screenshots for tests that have logic errors

**Always use `--grep` to run individual tests or small batches.**

### Recommended Process Per Test Fix

```bash
# 1. Run the specific test to see what's failing
bun run test:e2e -- --grep "042"

# 2. Fix the logic error

# 3. Regenerate its screenshots
bun run test:e2e -- --grep "042" --update-snapshots

# 4. Verify the screenshots look correct
# (inspect the .spec.ts-snapshots/ directory)

# 5. Commit the fixed test and new screenshots together
```

---

## Step-by-Step Remediation Plan

### Phase 1: Validate a Known-Good Test Baseline (~15 min) ✅ COMPLETED

Before making any changes, verify that a simple test that does NOT touch attack flows passes cleanly. This establishes a known-good baseline.

```bash
# Run the character selection test (no attack panel involved)
bun run test:e2e -- --grep "001"
```

**Findings (2026-03-04):**

Test 001 passes cleanly in 1 attempt (~7s). All three screenshot baselines are current and match. The note in Root Cause 5 about test 001 failing with a 71% pixel difference is no longer accurate — screenshots appear to have been regenerated at some point and the baseline is now in sync with the current UI.

No environmental problems found. The build, dev server, and Playwright configuration are all working correctly.

**Conclusion:** Phase 1 baseline is confirmed. Proceed to Phase 2.

---

### Phase 2: Fix Attack Panel Selector Migration (Critical, ~2-3 hrs)

Fix the tests that reference the orphaned `PowerCardAttackPanel` component.

**Migration pattern for all affected tests:**

Replace the old flow:
```typescript
// OLD (broken - PowerCardAttackPanel is not rendered)
await page.locator('[data-testid="power-card-attack-panel"]').waitFor({ state: 'visible' });
await page.locator('[data-testid="attack-card-12"]').click();
```

With the new flow:
```typescript
// NEW (correct - uses PlayerPowerCards)
await page.locator('[data-testid="player-power-cards"]').waitFor({ state: 'visible' });
await page.locator('[data-testid="power-card-12"]').click();
// Wait for the expanded attack card to appear
await page.locator('[data-testid="attack-card-expanded-12"]').waitFor({ state: 'visible' });
// Then click the target
await page.locator('[data-testid="attack-target-{instanceId}"]').click();
```

**Step 2.1** — Fix test 020 (power-card-use):
```bash
bun run test:e2e -- --grep "020" --update-snapshots
```

**Step 2.2** — Fix test 024 (reaping-strike):
```bash
bun run test:e2e -- --grep "024" --update-snapshots
```

**Step 2.3** — Fix test 029 (treasure-item-bonuses):
```bash
bun run test:e2e -- --grep "029" --update-snapshots
```

**Step 2.4** — Fix test 039 (ranged-attacks):
```bash
bun run test:e2e -- --grep "039" --update-snapshots
```

**Step 2.5** — Fix test 044 (multi-target-attacks):
```bash
bun run test:e2e -- --grep "044" --update-snapshots
```

**Step 2.6** — Fix test 046 (movement-before-attack):
```bash
bun run test:e2e -- --grep "046" --update-snapshots
```

**Step 2.7** — Fix test 048 (attack-then-move):
```bash
bun run test:e2e -- --grep "048" --update-snapshots
```

**Step 2.8** — Fix test 050 (area-attacks-tile):
```bash
bun run test:e2e -- --grep "050" --update-snapshots
```

**Step 2.9** — Fix tests 051-054 (individual power card tests):
```bash
bun run test:e2e -- --grep "05[1-4]" --update-snapshots
```

**Step 2.10** — Fix tests 060, 065, 082 (remaining affected):
```bash
bun run test:e2e -- --grep "060|065|082" --update-snapshots
```

Each step: commit fixed test + regenerated screenshots together.

---

### Phase 2 Migration Notes (2026-03-04)

**Status:** Phase 2 selector migration complete.

**Root cause confirmed:** The `power-card-attack-panel` selector was already absent from all spec files before this fix. The remaining broken selectors were `attack-card-list` and `button[data-testid^="attack-card-"]` (from the orphaned `PowerCardAttackPanel` component) used in tests 060 and 065.

**Changes made:**

- **Test 060** (`060-attack-cards-valid-targets.spec.ts`): Replaced `attack-card-list` container check and `button[data-testid^="attack-card-"]` count with `button[data-testid^="power-card-"]` count scoped to the already-referenced `attackPanel` locator.

- **Test 065** (`065-cross-tile-adjacency.spec.ts`): Replaced `attack-card-list` container check and `button[data-testid^="attack-card-"]` count with `button[data-testid^="power-card-"]` count. Replaced `[data-testid^="monster-target-"]` (non-existent in live UI) with `button.power-card-mini.eligible` count, which correctly verifies that attack cards are eligible (i.e., monsters are in range).

**Tests with selectors already migrated (no changes needed):** 020, 024, 029, 039, 044, 046, 048, 050, 051, 052, 053, 054, 059, 082 — these were already using the correct `player-power-cards` and `attack-card-expanded-{id}` selectors.

---

### Phase 3: Replace Arbitrary `waitForTimeout` (Stability, ~4-6 hrs) ✅ COMPLETED

**Status (2026-03-04):** All `waitForTimeout` calls eliminated from the E2E test suite. 0 remaining calls.

**Total fixed:** 43 test files + 1 helper file (120+ individual `waitForTimeout` calls removed or replaced).

**Patterns used:**

```typescript
// REMOVED: Before screenshots.capture() with programmaticCheck — auto-retry handles waiting
// Before: await page.waitForTimeout(500);
// After:  (removed — programmaticCheck assertions retry automatically)

// REPLACED: Waiting for UI element to appear
// Before: await page.waitForTimeout(500);
// After:  await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });

// REPLACED: Waiting for UI element to disappear
// Before: await page.waitForTimeout(500);
// After:  await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'hidden' });

// REPLACED: Waiting for text to update
// Before: await page.waitForTimeout(800);
// After:  await expect(page.locator('[data-testid="font-scale-value"]')).toContainText('130%');

// REPLACED: Waiting for Redux phase transition
// Before: await page.waitForTimeout(500);
// After:  await page.waitForFunction(() =>
//           (window as any).__REDUX_STORE__.getState().game.turnState.currentPhase === 'villain-phase'
//         );
```

**Tests fixed (by batch):**

- Batch 3.1: helpers/screenshot-helper.ts, 042, 043, 045, 097, 098
- Batch 3.2: 081, 082, 083, 084, 085, 096
- Batch 3.3: 050, 054, 059, 060, 064, 065, 067
- Batch 3.4: 069, 070, 071, 087, 088, 092, 101-legion, 101-monster-move, 102
- Batch 3.5: 073, 103, 105, 107, 108, 109, 110, 111, 112, 121
- Batch 3.6: 009, 016, 022, 026, 039

---

### Phase 4: Audit and Fix Logic Errors (Correctness, ~3-4 hrs)

Review tests that use direct Redux state manipulation to verify:
1. Action types still exist and are exported
2. Payload shapes match current reducer expectations
3. Test assertions match current UI behavior

Key tests to audit:
- `042-attack-ends-hero-phase` — complex multi-step Redux dispatch
- `046-movement-before-attack` — pendingMoveAttack flow
- `048-attack-then-move` — post-attack movement flow
- `050-area-attacks-tile` — multi-monster area attack flow

---

### Phase 5: Regenerate Stale Screenshots (Cleanup, ~2-3 hrs) 🔄 IN PROGRESS

After all logic fixes are in place, run the screenshot update workflow in filtered batches using the `--grep` option to regenerate only the tests that have changed screenshots. Do NOT run `--update-snapshots` without `--grep` unless all tests are confirmed passing.

**Approach:** Running `bunx playwright test --update-snapshots --grep "<filter>"` locally in filtered batches, committing passing results after each batch.

**Batch processing best practices followed:**
- Each batch uses `--grep` to avoid running the full suite
- Only regenerate screenshots for tests that actually pass
- Commit after each batch so progress is preserved on timeout

#### Completed Batches (2026-03-05)

**Batch 5.1 — Known-good simple tests:** `001`, `006`, `011`, `019`, `020`, `026`
- All passed ✅ — 6 tests regenerated

**Batch 5.2 — Phase 3 waitForTimeout fixes:** `081`, `082`, `083`, `084` (1 fail), `085`
- 4 of 5 passed ✅ — 084 fails (Redux `hasCurse` assertion mismatch — needs Phase 4 fix)

**Batch 5.3 — Phase 3 fixes continued:** `092`, `097`, `098`
- All passed ✅ — 3 tests regenerated

**Batch 5.4 — Phase 3 fixes continued:** `101` (legion-devil-spawn + monster-move), `102`, `111`, `112`
- All passed ✅ — 4 test groups regenerated

**Batch 5.5 — Higher-number tests:** `103`, `105`, `107`, `108`, `109`, `110`
- All passed ✅ — 6 tests regenerated

**Batch 5.6 — Adventure rule tests:** `113`, `114`, `115`, `116`, `117`, `118`, `119`, `120`, `121`, `122`
- All passed ✅ — 10 tests regenerated

**Batch 5.7 — Mixed passing tests from 031–041:** `031`, `032`, `034`, `037`, `038`, `041`
- Partially passed; screenshots regenerated for passing tests ✅

**Batch 5.8 — Tests 043–044, 056, 059, 061–063, 065–066:**
- 043, 056, 059, 061, 065 passed ✅ (044 partial, 062/066 fail — logic errors)

**Batch 5.9 — Tests 074–080:**
- 074, 075, 077, 078, 079, 080 passed ✅ (076 fails — `h1` text mismatch)

**Batch 5.10 — Tests 086–091:**
- 086, 087, 088, 089, 090 passed ✅ (091 fails — message text mismatch)

**Batch 5.11 — Tests 093–095:**
- All passed ✅ — 3 tests regenerated

**Total tests with new screenshots: ~98 PNG files across 36 test directories**

#### Tests confirmed failing (require Phase 4 logic fixes before screenshot regeneration)

| Test | Failure reason |
|---|---|
| 007 | `[data-testid="monster-card-mini"]` not found after tile exploration |
| 008 | `movement-overlay` still visible after move |
| 012 | Objective shows `1 / 12 defeated` instead of `1 / 2 defeated` |
| 016 | Redux dispatch error in `setAttackResult` |
| 021 | Exploration chain logic failure |
| 022 | Multi-player UI orientation failure |
| 023 | Start tile sub-tiles adjacency assertion |
| 024 | `[data-testid="card-effect-13"]` not visible |
| 027 | Encounter card overlay intercepting click in final test case |
| 028 | `[data-testid="map-control-button"]` not found |
| 030 | Missing `dismissScenarioIntroduction` import |
| 033 | Board tokens failure |
| 035 | Consumable items failure |
| 036 | `encounter-continue` / `encounter-card` wait failure |
| 040 | `[data-testid="done-power-selection"]` not found |
| 042 | Multi-step Redux dispatch failure |
| 045 | `[data-testid="notification-title"]` not found |
| 054 | Tornado Strike target selection failure |
| 064 | Scenario introduction rotation failure |
| 067 | `[data-testid="expanded-card"]` not found |
| 069–071 | Flaming Sphere `power-card-45` not found |
| 073 | Encounter card overlay timing |
| 084 | `hasCurse` assertion mismatch |
| 096 | New tiles count is 0 after monster move |

#### Remaining tests to regenerate (confirmed passing, screenshots may be stale)

Run these when resuming work:
```bash
# Batch: Tests 009, 013, 014, 015, 018, 025, 027 (first 3 cases)
bunx playwright test --update-snapshots --grep "009|013|014|015|018"

# Batch: Tests 029, 039, 043, 044, 046, 048, 050, 051, 052, 053
bunx playwright test --update-snapshots --grep "043|044|046|048"

# Batch: Tests 056-066
bunx playwright test --update-snapshots --grep "056|057|058|059|060|061|062|063|065|066"

# Batch: Tests 074-100
bunx playwright test --update-snapshots --grep "074|075|076|077|078|079|080|086|087|088|089|090|091|093|094|095|099|100"

# Batch: Tests 103-110
bunx playwright test --update-snapshots --grep "103|104|106"
```

---

## Test Quality Checklist

Before marking any test as "fixed," verify:

- [ ] Test runs without `waitForTimeout` (or has a well-documented reason)
- [ ] All selectors reference real `data-testid` attributes in the live components
- [ ] No references to `power-card-attack-panel` or `attack-card-{id}` (non-expanded)
- [ ] Baseline screenshots are committed and up-to-date
- [ ] Test passes 3 consecutive runs without flakiness
- [ ] `programmaticCheck` assertions verify actual state, not just element visibility

---

## Priority Matrix

| Priority | Issue | Tests Affected | Effort |
|---|---|---|---|
| P0 | Orphaned `PowerCardAttackPanel` selectors | 15 | 2–3 hrs |
| P1 | Logic errors in attack flow tests (post-selector fix) | 5–10 | 2–3 hrs |
| P2 | Arbitrary `waitForTimeout` | 42 | 4–6 hrs |
| P3 | Stale screenshots (visual-only changes) | ~50 | 2–3 hrs |

---

## Key Constraint: Avoid Full Suite Runs

The `update-screenshots.yml` workflow supports a `grep` input. **Always use it.** Running the full suite (`grep = ""`) should only happen after all P0 and P1 issues are resolved, as a final verification step.

```yaml
# Correct usage:
grep: "009|010"   # Fix missing baselines first

# Avoid until all fixes are in:
grep: ""          # Full suite run — only after everything is fixed
```

---

## Reference: Test ID Mapping

### Attack Card Flow

| Scenario | Correct Selector | Notes |
|---|---|---|
| Attack panel container | `player-power-cards` | In `PlayerPowerCards.svelte` |
| Click to expand attack card | `power-card-{id}` | In `PlayerPowerCards.svelte` |
| Expanded attack card view | `attack-card-expanded-{id}` | In `PlayerPowerCards.svelte` |
| Attack a specific monster | `attack-target-{instanceId}` | In `AttackCardDetailPanel.svelte` |
| Target selection area | `target-selection` | In `AttackCardDetailPanel.svelte` |
| Cancel move-attack | `cancel-move-attack` | In `PowerCardAttackPanel.svelte` (still rendered in some flows) |
| Movement overlay | `movement-overlay` | In `MovementOverlay.svelte` |

### Key Note on `PowerCardAttackPanel`

`PowerCardAttackPanel.svelte` is currently an **orphaned component** — it is not imported by any parent component and therefore never rendered. Any test waiting for `[data-testid="power-card-attack-panel"]` will always timeout.

The correct approach is to use the `PlayerPowerCards.svelte` selectors listed above.
