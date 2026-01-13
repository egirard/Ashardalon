# Post-Mortem: require() in Browser Context (PR #383)

## Incident Summary

**Date**: Resolved January 13, 2026  
**Issue**: CommonJS `require()` calls in `src/store/powerCardEligibility.ts` broke attack card functionality in the browser  
**Impact**: Attack cards were disabled during hero phase due to silent runtime errors  
**Root Cause**: Use of Node.js-specific `require()` in browser-executed code  
**Resolution**: PR #383 - Replaced `require()` with ES6 `import` statements

## Timeline

### Problem Introduction
- **Location**: `src/store/powerCardEligibility.ts` lines 151, 163, 250, 265
- **Code Pattern**:
  ```typescript
  // ❌ BAD: Node.js-only syntax in browser code
  const { getTileOrSubTileId } = require('./movement');
  const { findTileAtPosition } = require('./movement');
  ```
- **Error in Browser**: `ReferenceError: require is not defined`
- **Failure Mode**: Silent failure - eligibility checks failed, cards appeared disabled

### Why Tests Didn't Catch It

1. **Unit Tests (Vitest)**:
   - Ran in Node.js environment (`environment: 'node'` in vitest.config.ts)
   - Node.js has `require()` built-in, so tests passed
   - No browser environment simulation

2. **E2E Tests (Playwright)**:
   - Tested user interactions but didn't verify all power card eligibility edge cases
   - The specific code paths with `require()` may not have been exercised
   - No tests specifically checking for module loading errors

3. **Build Process**:
   - Vite bundler transpiled the code but didn't fail on `require()` usage
   - No static analysis or linting to catch CommonJS in ES6 modules

## Impact

- **User-Facing**: Players could not use attack cards during hero phase
- **Error Visibility**: Silent failure - no visible error to users
- **Console Error**: `ReferenceError: require is not defined` visible only in browser console
- **Duration**: Unknown - detected through user feedback (issue #382)

## Root Cause Analysis

### Why `require()` Doesn't Work in Browser

1. **ES6 Module Context**: The project uses `"type": "module"` in package.json
2. **Browser Limitation**: Browsers don't implement CommonJS `require()`
3. **Vite Bundling**: While Vite bundles modules, it doesn't polyfill `require()` for inline usage
4. **Mixed Module Systems**: Using `require()` in an ES6 module file breaks at runtime

### Why It Was Introduced

- Likely copy-paste from Node.js code or older JavaScript patterns
- Lack of awareness that `require()` doesn't work in browser ES6 modules
- No automated checks to prevent CommonJS usage in browser code

## Prevention Measures Implemented

### 1. ESLint Rules (Primary Defense)

**File**: `eslint.config.js`

```javascript
rules: {
  'no-restricted-syntax': [
    'error',
    {
      selector: 'CallExpression[callee.name="require"]',
      message: 'CommonJS require() is not allowed in browser code. Use ES6 import instead.',
    },
  ],
  'no-restricted-globals': [
    'error',
    {
      name: 'require',
      message: 'CommonJS require is not allowed in browser code.',
    },
  ],
}
```

**How It Helps**: Catches `require()` usage at development time before code is committed

### 2. CI/CD Lint Check

**File**: `.github/workflows/lint-build-check.yml`

- Runs ESLint on every PR
- Blocks merge if linting fails
- Runs before build and E2E tests

**How It Helps**: Catches issues in CI even if developers skip local linting

### 3. Vitest Environment Change

**File**: `vitest.config.ts`

```typescript
// Before
environment: 'node',

// After
environment: 'jsdom', // Simulates browser environment
```

**How It Helps**: 
- Unit tests now run in browser-like environment
- `require()` will fail in tests just like it does in the browser
- Catches browser-specific issues earlier

### 4. Build Check in CI

**File**: `.github/workflows/lint-build-check.yml`

- Explicitly runs `bun run build` before E2E tests
- Verifies build artifacts are created successfully
- Blocks merge if build fails

**How It Helps**: Ensures code builds successfully before reaching E2E tests

## Lessons Learned

### What Went Wrong

1. **Gap Between Test and Runtime Environments**:
   - Unit tests ran in Node.js (has `require()`)
   - Production ran in browser (no `require()`)
   - Mismatch was not obvious

2. **No Static Analysis**:
   - No linting rules to catch CommonJS patterns
   - No TypeScript checks for module system mismatches

3. **Silent Failures**:
   - Browser errors were only in console
   - No visual indicators of the error
   - Required manual inspection to discover

### What Went Right

1. **E2E Test Infrastructure**: Though tests didn't catch this specific issue, the E2E framework is solid
2. **User Feedback**: Issue #382 provided clear reproduction steps with screenshots
3. **Quick Fix**: Problem was easy to fix once identified (just change to ES6 imports)

## Best Practices Going Forward

### For Developers

1. **Always Use ES6 Imports in Browser Code**:
   ```typescript
   // ✅ GOOD
   import { getTileOrSubTileId } from './movement';
   
   // ❌ BAD
   const { getTileOrSubTileId } = require('./movement');
   ```

2. **Run Linter Before Committing**:
   ```bash
   npm run lint
   ```

3. **Test in Browser Dev Tools**:
   - Open browser console when testing
   - Look for errors in red
   - Don't assume "looks fine" means "is fine"

### For Code Reviewers

1. **Check for CommonJS Patterns**:
   - Search for `require(` in diffs
   - Flag any usage in `src/` directory
   - Config files are OK (they run in Node.js)

2. **Verify Test Coverage**:
   - New features should have unit tests
   - Critical paths should have E2E tests
   - Browser-specific code should be tested in jsdom or browser

3. **Look for Silent Failures**:
   - Check for try-catch blocks that swallow errors
   - Verify error handling has user-visible feedback
   - Ensure console errors are not ignored

## Related Files

- **Fixed File**: `src/store/powerCardEligibility.ts`
- **PR**: #383
- **Triggering Issue**: #382
- **Prevention Config**: `eslint.config.js`, `vitest.config.ts`, `.github/workflows/lint-build-check.yml`

## Verification

To verify the fix works and prevention measures are in place:

```bash
# 1. Linter catches require()
echo "const x = require('./test');" > src/test.ts
npm run lint  # Should fail
rm src/test.ts

# 2. Unit tests run in browser-like environment
npm run test:unit  # Should pass

# 3. Build succeeds
npm run build  # Should succeed

# 4. E2E tests pass
npm run test:e2e  # Should pass
```

## Success Criteria

✅ ESLint catches `require()` in src/ files  
✅ Vitest runs in jsdom environment  
✅ CI runs lint, build, and tests in sequence  
✅ Build must succeed before E2E tests run  
✅ All checks must pass before PR can merge

## Future Improvements

1. **Add Pre-Commit Hooks**: Run linter automatically before commits
2. **Expand E2E Coverage**: Add tests specifically for power card eligibility edge cases
3. **Error Monitoring**: Add browser error tracking to catch runtime errors in production
4. **TypeScript Strict Mode**: Enable stricter TypeScript checks to catch more issues
5. **Import Validation**: Consider adding checks to ensure imports resolve correctly
