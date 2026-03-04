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

Visual changes to the application have made many existing screenshot baselines outdated. Even test 001 (the simplest test) fails with a 71% pixel difference when run against the current UI. This means the entire baseline corpus needs to be regenerated after all logic/selector fixes are applied.

**Scope:** Essentially all tests with screenshot comparisons will need baseline regeneration. This is best done via the `update-screenshots.yml` workflow in filtered batches after all logic fixes are in place.

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

### Phase 1: Validate a Known-Good Test Baseline (~15 min)

Before making any changes, verify that a simple test that does NOT touch attack flows passes cleanly. This establishes a known-good baseline.

```bash
# Run the character selection test (no attack panel involved)
bun run test:e2e -- --grep "001"
```

If test 001 fails, there is a deeper environmental problem to resolve first (build, server, Playwright configuration).

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

### Phase 3: Replace Arbitrary `waitForTimeout` (Stability, ~4-6 hrs)

Work through the 42 tests with arbitrary delays, replacing each `waitForTimeout` with a proper condition. Do this in batches of 5-10 tests per PR.

**Replacement patterns:**

```typescript
// Instead of waiting for an arbitrary time:
await page.waitForTimeout(500);

// Wait for a specific element to appear:
await page.locator('[data-testid="combat-result"]').waitFor({ state: 'visible' });

// Or wait for a condition:
await expect(page.locator('[data-testid="turn-phase"]')).toContainText('Villain Phase');

// Or use expect.toPass for polling:
await expect(async () => {
  const state = await page.evaluate(() => (window as any).__REDUX_STORE__.getState());
  expect(state.game.turnState.currentPhase).toBe('villain-phase');
}).toPass();
```

**Batch 3.1** — Fix tests 050, 081, 082 (highest timeout offenders)
**Batch 3.2** — Fix tests 096, 097, 111 (next highest)
**Batch 3.3** — Fix remaining tests in groups of 5

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

### Phase 5: Regenerate Stale Screenshots (Cleanup, ~2-3 hrs)

After all logic fixes are in place, run the screenshot update workflow in filtered batches using the `--grep` option to regenerate only the tests that have changed screenshots. Do NOT run `--update-snapshots` without `--grep` unless all tests are confirmed passing.

**Use the update-screenshots GitHub Actions workflow:**

1. Navigate to Actions → Update E2E Screenshots
2. Trigger with `grep` filter for each batch, e.g.:
   - `"001|006|007|008"` — early tests batch
   - `"009|010|011|012"` — hero attack tests batch
   - etc.
3. Review and merge screenshot updates

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
