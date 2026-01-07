# E2E Screenshot Stability Investigation

## Summary

During the completion of e2e test 072 (Command Card Monster Relocation), a systemic screenshot non-determinism issue was discovered that affects all e2e tests in the repository, not just test 072. This document details the investigation, findings, and recommendations.

## Issue Description

**Symptom**: E2E tests with screenshot assertions fail intermittently, with screenshots differing by approximately 1-2% of pixels (~5,000-12,000 pixels) between consecutive test runs.

**Scope**: Affects multiple e2e tests:
- Test 072 (Command Card Relocation)
- Test 001 (Character Selection)
- Test 011 (Hero Turn Structure)
- Likely others (not exhaustively tested)

**Key Finding**: Even the original, unmodified code from the `main` branch fails with the committed baseline screenshots, confirming this is not a regression introduced by recent changes.

## Investigation Steps Taken

### 1. Animation Disabling
Attempted comprehensive animation disabling:
```typescript
// CSS-based disabling
await page.addStyleTag({
  content: `
    *, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
      animation: none !important;
      transition: none !important;
    }
  `
});

// Playwright media preference
await page.emulateMedia({ reducedMotion: 'reduce' });

// Playwright screenshot option
await expect(page).toHaveScreenshot('name.png', {
  animations: "disabled"
});
```

**Result**: No improvement. Screenshots still vary between runs.

### 2. Render Settling
Added explicit waits for page stability:
```typescript
// Network idle
await page.waitForLoadState('networkidle');

// DOM load
await page.waitForLoadState('load');

// Animation frames
await page.locator('[data-testid="game-board"]').evaluate((el) => {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve(true);
      });
    });
  });
});
```

**Result**: Reduced variation slightly but did not eliminate it.

### 3. State Verification
Added explicit verification of Redux state before screenshots:
```typescript
await page.waitForFunction(() => {
  const gameState = (window as any).__REDUX_STORE__.getState().game;
  const heroToken = gameState.heroTokens.find((t: any) => t.heroId === 'quinn');
  return heroToken && heroToken.position.x === 2 && heroToken.position.y === 3;
}, { timeout: 5000 });
```

**Result**: No improvement. State is consistent, but rendering varies.

### 4. Arbitrary Delays Removed
Removed non-compliant `waitForTimeout()` calls in favor of proper state-based waits per E2E guidelines.

**Result**: Improved test quality but did not resolve screenshot issues.

## Root Cause - RESOLVED

### Actual Problem: Non-Deterministic Game Initialization

The screenshot failures were **NOT** caused by browser rendering variations. They were caused by **non-deterministic test logic**.

**Discovery:**
Analysis of diff images revealed that entire game elements (tiles, tokens) were appearing in different positions between runs, not subtle rendering differences. This indicated logic errors, not visual noise.

**Root Cause Found:**
```typescript
// src/store/gameSlice.ts, line 746
const gameSeed = seed ?? Date.now();  // Uses current timestamp!
```

The `startGame` action uses `Date.now()` as the random seed when no seed is provided:
1. Each test run gets a different timestamp
2. Different seed → different shuffled tile deck
3. Different seed → different shuffled hero positions  
4. Result: Dungeons have different layouts between runs
5. Screenshots show entirely different game boards

**Evidence:**
- Diff images showed 500-5000 pixel differences representing entire grid squares
- Pixel counts varied significantly between runs (4,946 vs 12,107 pixels)
- Elements appeared in completely different board positions
- Not subtle anti-aliasing or sub-pixel shifts

### Solution Implemented

**Fix:** Override `Date.now()` before game start to return a fixed timestamp:

```typescript
// e2e tests must include this before starting game:
await page.evaluate(() => {
  Date.now = function() {
    return 1234567890000; // Fixed timestamp for deterministic seed
  };
});

await page.locator('[data-testid="start-game-button"]').click();
```

**Results:**
- Test 072 now passes consistently (3/3 runs, 0 pixel difference)
- Zero tolerance configuration maintained (`maxDiffPixels: 0, threshold: 0`)
- Baseline screenshots regenerated with deterministic setup
- Real visual regressions will be caught immediately

### Lessons Learned

1. **Don't add tolerance to mask bugs** - Screenshot differences usually indicate real issues
2. **Analyze diff images carefully** - Entire elements moving ≠ rendering noise
3. **Check for randomness sources** - `Date.now()`, `Math.random()`, shuffles, timestamps
4. **Make tests deterministic** - Override randomness at the source
5. **Zero tolerance is achievable** - With proper deterministic setup

## Test Results

### Intermittent Pass/Fail Pattern
Running test 072 multiple times shows inconsistent results:
```
Run 1: Failed (12,107 pixels differ)
Run 2: Passed
Run 3: Failed (4,946 pixels differ)
Run 4: Failed (12,107 pixels differ)
Run 5: Passed
```

This intermittent pattern strongly suggests rendering timing variations rather than logic errors.

## Comparison with Other Repositories

The Playwright documentation acknowledges screenshot flakiness and recommends:
1. Disabling animations ✅ (Done)
2. Using consistent fonts ✅ (System fonts available)
3. Waiting for network idle ✅ (Done)
4. Using a tolerance threshold ❌ (Config requires 0 pixels)

The zero-pixel tolerance in `playwright.config.ts` may be too strict:
```typescript
expect: {
  toHaveScreenshot: {
    maxDiffPixels: 0,  // No pixels can differ
    threshold: 0,       // No color difference allowed
  },
},
```

## Recommendations

### Option 1: CI as Source of Truth (Recommended)
**Approach**: Generate all baseline screenshots in CI and use CI for validation.

**Rationale**:
- CI environment is consistent and reproducible
- Issue description mentions "Ensure CI pipeline captures new screenshots"
- Aligns with issue's acceptance criteria about CI validation

**Implementation**:
1. Add a CI workflow step to regenerate screenshots with `--update-snapshots`
2. Commit the CI-generated screenshots
3. Run e2e tests in CI without `--update-snapshots` to validate
4. Document that local screenshot tests may fail due to environment differences

### Option 2: Increase Tolerance (Pragmatic)
**Approach**: Adjust Playwright config to allow small pixel differences.

**Implementation**:
```typescript
expect: {
  toHaveScreenshot: {
    maxDiffPixels: 200,    // Allow up to 200 pixels (~0.05%)
    threshold: 0.1,         // Allow 10% color difference per pixel
  },
},
```

**Trade-off**: May miss small visual regressions but eliminates false positives.

### Option 3: Hybrid Approach
**Approach**: Combine CI validation with increased local tolerance.

**Implementation**:
```typescript
expect: {
  toHaveScreenshot: {
    maxDiffPixels: process.env.CI ? 0 : 200,  // Strict in CI, lenient locally
    threshold: process.env.CI ? 0 : 0.1,
  },
},
```

## Current State of Test 072

### Improvements Made
✅ Removed arbitrary delays (`waitForTimeout`)  
✅ Added proper state-based waits  
✅ Enhanced animation disabling  
✅ Added network idle waits  
✅ Added render frame waits  
✅ Regenerated all 9 screenshots  
✅ Updated README with complete documentation  
✅ Added test to main e2e README  

### Test Coverage
✅ Hero selection  
✅ Game start with Command card  
✅ Monster placement  
✅ Card details panel  
✅ Monster selection UI  
✅ Tile selection UI  
✅ Cancel at monster selection  
✅ Cancel at tile selection  
⚠️ Final relocation step (manual testing required)  

### Known Limitations
- Screenshots are not stable between local runs
- Final relocation completion not automated (movement overlay interference)
- Distant Diversion test (073) not created due to screenshot stability concerns

## Next Steps

### ✅ RESOLVED - Deterministic Game Initialization (January 2026)

The screenshot non-determinism issue has been **completely resolved** by fixing the root cause: non-deterministic game initialization.

**Solution Implemented:**
1. **Fixed Date.now() in tests** - Override with constant timestamp before game start
2. **Regenerated baselines** - All screenshots created with deterministic setup
3. **Zero tolerance maintained** - `maxDiffPixels: 0, threshold: 0`
4. **Verified stability** - Test 072 passes consistently (3/3 runs)

**Results:**
- Tests pass with pixel-perfect accuracy
- No tolerance needed - deterministic logic = deterministic visuals
- Real visual regressions will be caught immediately
- No false positives from "rendering variations"

**Files Updated:**
- `e2e/072-command-card-relocation/072-command-card-relocation.spec.ts` - Added Date.now() override
- `docs/E2E_TEST_GUIDELINES.md` - Added section 2 on deterministic initialization
- `E2E_SCREENSHOT_INVESTIGATION.md` - Updated with correct root cause and solution

### Remaining Work

1. **Audit other E2E tests** (Priority: High)
   - Check all 68 e2e tests for Date.now() override
   - Tests that start games without the fix will be non-deterministic
   - Regenerate baselines for affected tests
   
2. **Create helper function** (Priority: Medium)
   ```typescript
   // e2e/helpers/deterministic-game.ts
   export async function setupDeterministicGame(page: Page) {
     await page.evaluate(() => {
       Date.now = function() { return 1234567890000; };
     });
   }
   ```

3. **Consider game-level fix** (Priority: Low)
   - Add test mode that accepts explicit seed
   - Would eliminate need for Date.now() override
   - Less invasive for test code

4. **Update CI checks** (Priority: Low)
   - Add validation that tests include Date.now() override
   - Warn if test starts game without deterministic setup

### Future Test 073 - Distant Diversion

Now that screenshot stability is resolved, test 073 can be created:
- Use test 072 as template
- Include Date.now() override
- Similar two-step selection flow
- Should pass consistently with zero tolerance

## Conclusion

The screenshot non-determinism was caused by **non-deterministic game initialization logic**, not browser rendering variations. The game's `startGame` action used `Date.now()` as a random seed, causing different tile deck shuffles and hero positions on each test run.

**The solution:**
- Override `Date.now()` in tests before starting games to return a fixed timestamp
- This ensures deterministic tile layouts and hero positions
- Maintain zero-pixel tolerance for pixel-perfect regression detection
- Real visual bugs are caught immediately without false positives

**Test 072 status:** ✅ **RESOLVED** - Tests pass consistently with deterministic initialization and zero tolerance.

---

*Investigation completed: December 2024*  
*Root cause identified and resolved: January 2025*  
*Final resolution: Non-deterministic logic fixed, not tolerance added*
