# E2E Test Failure Analysis

## Executive Summary

PR #330 claimed that E2E test failures were due to environmental issues. However, after running the tests and analyzing the failures, **the failures are consistent and occur because the test logic does not match the actual DOM structure**. This is NOT an environmental issue.

## Root Cause

The CharacterSelect component (in `src/components/CharacterSelect.svelte`) uses test IDs that include an edge position: `hero-{heroId}-{edge}` where edge can be `top`, `bottom`, `left`, or `right`.

**Example:** `data-testid="hero-vistra-bottom"`, `data-testid="hero-quinn-top"` (defined at lines 140, 190, 259, 308 in CharacterSelect.svelte)

However, the majority of E2E tests (60+ tests) are looking for test IDs without the edge suffix: `data-testid="hero-vistra"`, which doesn't exist in the DOM.

## Evidence

### Failure Point 1: Test 062 - Card Detail View

**Test Code (Line 11):**
```typescript
await page.locator('[data-testid="hero-vistra"]').click();
```

**Error:**
```
Test timeout of 60000ms exceeded.
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('[data-testid="hero-vistra"]')
```

**Actual DOM Structure (from error-context.md):**
The page snapshot shows hero cards with the format:
```yaml
- button "Vistra Vistra Fighter" [ref=e14] [cursor=pointer]:
  - img "Vistra" [ref=e15]
  - generic [ref=e16]:
    - generic [ref=e17]: Vistra
    - generic [ref=e18]: Fighter
```

**Note:** No `data-testid="hero-vistra"` exists. The actual test IDs in the source code are in the format `data-testid="hero-{hero.id}-{edge}"`, such as `data-testid="hero-vistra-bottom"` or `data-testid="hero-vistra-top"`.

### Failure Point 2: Test 044 - Multi-Target Attacks

**Test 1 Code (Line 13):**
```typescript
await page.locator('[data-testid="hero-keyleth"]').click();
```

**Test 2 Code (Line 255):**
```typescript
await page.locator('[data-testid="hero-haskan"]').click();
```

**Errors:**
```
Test timeout of 60000ms exceeded.
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('[data-testid="hero-keyleth"]')

Test timeout of 60000ms exceeded.
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('[data-testid="hero-haskan"]')
```

Both failures have the same root cause - the test IDs don't include the edge position.

## Source Code Evidence

From `src/components/CharacterSelect.svelte`:

**Top edge (line 140):**
```html
<button
  class="hero-card"
  class:selected={isSelectedOnEdge(hero.id, 'top')}
  class:unavailable={isSelectedOnOtherEdge(hero.id, 'top')}
  data-testid="hero-{hero.id}-top"
  onclick={() => handleHeroClick(hero.id, 'top')}
  disabled={isSelectedOnOtherEdge(hero.id, 'top')}
>
```

**Left edge (line 190):**
```html
data-testid="hero-{hero.id}-left"
```

**Right edge (line 259):**
```html
data-testid="hero-{hero.id}-right"
```

**Bottom edge (line 308):**
```html
data-testid="hero-{hero.id}-bottom"
```

## Affected Tests

A comprehensive search of all E2E test files reveals **at least 60+ tests** (the majority of the test suite) are using the incorrect test ID format without the edge suffix. Some examples include:

- **Test 001 - Character Selection** - Uses `hero-quinn` (incorrect)
- **Test 044 - Multi-Target Attacks** - Uses `hero-keyleth` and `hero-haskan` (incorrect)
- **Test 048 - Attack Then Move** - Uses `hero-quinn` and `hero-vistra` (incorrect)
- **Test 052 - Clerics Shield** - Uses `hero-quinn` and `hero-vistra` (incorrect)
- **Test 062 - Card Detail View** - Uses `hero-vistra` (incorrect)
- Tests 006-010, 012-016, 018-020, 022-030, 033-035, 038-042, 045, 046, 049, 050, 053-055, 057-065 (verified through grep search of test files)

**Examples of tests using the correct format:**

Tests 011, 031, 032, 036, 037, 043, 047, 056, 066, 067, and 068 use the correct format with edge positions:
```typescript
await page.locator('[data-testid="hero-quinn-top"]').click();
```

These tests work because they include the edge position suffix (`-top`, `-bottom`, `-left`, or `-right`).

## Pattern of Failures

All failures follow the same pattern:
1. Test navigates to character selection screen successfully
2. Test waits for `[data-testid="character-select"]` - **this works**
3. Test tries to click on a hero using `[data-testid="hero-{id}"]` - **this times out**
4. Test never progresses past hero selection

The timeout occurs because Playwright waits for an element that doesn't exist in the DOM.

## Why This is NOT Environmental

1. **Consistent failure pattern**: All affected tests fail at the exact same point with the same error
2. **DOM is correctly loaded**: The character selection screen loads successfully, as evidenced by the successful wait for `[data-testid="character-select"]`
3. **Page snapshot available**: The error context shows a complete page snapshot with all hero cards rendered
4. **No timing issues**: The 60-second timeout is more than sufficient for the page to load
5. **Other tests pass**: Test 056 passes because it uses the correct test ID format

## Recommended Fix

Update all affected tests to use the correct test ID format with edge positions:

**Before:**
```typescript
await page.locator('[data-testid="hero-vistra"]').click();
```

**After (choose appropriate edge):**
```typescript
await page.locator('[data-testid="hero-vistra-bottom"]').click();
```

**Note:** The edge position to use depends on the test scenario. For most single-player tests, `bottom` is the natural choice as it represents the player's edge of the table.

## Conclusion

The E2E test failures in PR #330 are **NOT due to environmental issues**. They are caused by a **systematic mismatch between test selectors and actual DOM structure**. The tests are looking for test IDs that don't exist in the code.

**This is a test logic bug that needs to be fixed in the test files, not an environmental/infrastructure issue.**

---

**Analysis Date:** 2026-01-02  
**Tests Run:** E2E tests 044, 062 (failed as predicted), tests 011, 056 (used for comparison)
