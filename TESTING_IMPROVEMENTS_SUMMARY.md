# Testing Infrastructure Improvements - Summary

This document summarizes the improvements made to prevent the `require()` browser bug (PR #383) from happening again.

## Changes Made

### 1. ESLint Configuration (`eslint.config.js`)

**What**: Added ESLint rules to detect CommonJS `require()` in browser code

**How it helps**:
- Catches `require()` usage at development time
- Shows clear error message referencing PR #383
- Prevents commits with browser-incompatible code

**Test**:
```bash
npm run lint
# Creates test file with require()
echo "const x = require('./test');" > src/test.ts
npm run lint  # Should fail with error
rm src/test.ts
```

### 2. CI Lint/Build Workflow (`.github/workflows/lint-build-check.yml`)

**What**: New CI workflow that runs on every PR

**Workflow Steps**:
1. **Lint** - Run ESLint to catch require() and other issues
2. **Build** - Verify code builds successfully
3. **Unit Tests** - Run unit tests in jsdom environment

**How it helps**:
- Catches issues in CI even if developer skips local checks
- Blocks PRs with linting failures
- Ensures code builds before E2E tests run

### 3. Vitest Configuration (`vitest.config.ts`)

**What**: Changed test environment from `node` to `jsdom`

**Before**:
```typescript
environment: 'node',  // Has require() built-in
```

**After**:
```typescript
environment: 'jsdom',  // Simulates browser environment
```

**How it helps**:
- Unit tests now run in browser-like environment
- `require()` will fail in tests just like in browser
- Catches browser-specific issues earlier in development

### 4. Documentation

**Files Created**:
- `docs/POST_MORTEM_REQUIRE_ISSUE.md` - Detailed analysis of PR #383 bug
- `docs/IMPORT_BEST_PRACTICES.md` - Developer guide for ES6 imports
- Updated `README.md` with development guidelines

**How it helps**:
- Educates developers on why `require()` breaks
- Provides examples of correct import usage
- Documents the incident for future reference

## Verification

### Manual Verification

1. **Linter catches require()**:
   ```bash
   cd /home/runner/work/Ashardalon/Ashardalon
   echo "const x = require('./test');" > src/test.ts
   npm run lint  # Should show error
   rm src/test.ts
   ```

2. **Build succeeds**:
   ```bash
   npm run build
   # Should complete without errors
   ```

3. **Unit tests run in jsdom**:
   ```bash
   npm run test:unit
   # Tests run in browser-like environment
   ```

### Automated Verification

CI workflow runs automatically on every PR:
- ✅ Lint check (catches require())
- ✅ Build check (verifies buildability)
- ✅ Unit tests (runs in jsdom)
- ✅ E2E tests (runs after above checks pass)

## Prevention Layers

The changes create multiple layers of defense:

```
Layer 1: Developer's IDE/Editor with ESLint integration
   ↓ (if missed)
Layer 2: npm run lint before commit
   ↓ (if missed)
Layer 3: CI lint check on PR
   ↓ (if passed incorrectly)
Layer 4: CI build check
   ↓ (if passed)
Layer 5: Unit tests in jsdom (would fail on require())
   ↓ (if passed)
Layer 6: E2E tests in real browser
```

## Impact on Development Workflow

### For Developers

**New Steps**:
```bash
# Before committing
npm run lint           # NEW: Catches require() and other issues
npm run test:unit      # Run unit tests
npm run build          # Verify build
```

**IDE Integration**:
- ESLint can be integrated with VS Code, IntelliJ, etc.
- Shows errors inline while coding
- Auto-fix available for some issues

### For CI/CD

**New Workflow**:
1. PR created/updated
2. **NEW**: Lint check runs first
3. **NEW**: Build check runs after lint
4. Unit tests run after build
5. E2E tests run last (only if above pass)

**Benefits**:
- Faster feedback (lint fails early)
- Prevents wasted E2E test time on broken code
- Clear error messages for developers

## Metrics

### Before These Changes

- ❌ Unit tests passed (Node.js has require())
- ❌ Build succeeded (Vite doesn't check require() usage)
- ⚠️ E2E tests may or may not catch it (depends on coverage)
- ❌ No linting to catch require()
- 🐛 Bug reached production

### After These Changes

- ✅ Linter catches require() immediately
- ✅ CI blocks PR if linting fails
- ✅ Unit tests run in browser-like environment
- ✅ Build verified before E2E tests
- ✅ Multiple layers of defense
- 🛡️ Bug prevented before merge

## Testing the Fix

To verify the improvements work:

```bash
# 1. Clone the repo
git clone https://github.com/egirard/Ashardalon.git
cd Ashardalon

# 2. Install dependencies
bun install

# 3. Try to add require() to a source file
echo "const x = require('./test');" > src/store/test-require.ts

# 4. Run linter (should fail)
npm run lint
# Expected: Error pointing to test-require.ts

# 5. Clean up
rm src/store/test-require.ts

# 6. Verify normal linting passes
npm run lint
# Expected: No errors

# 7. Verify build works
npm run build
# Expected: Build succeeds

# 8. Verify tests run
npm run test:unit
# Expected: Tests run in jsdom environment
```

## Future Improvements

1. **Pre-commit hooks**: Run linter automatically before every commit
   - Use Husky or similar tool
   - Prevents commits with linting errors

2. **Stricter TypeScript**: Enable additional TypeScript strict mode options
   - Catch more type errors at compile time

3. **Import validation**: Add checks to ensure imports resolve correctly
   - Catch broken imports before runtime

4. **E2E test for power card eligibility**: Add specific test for the bug scenario
   - Test power card eligibility with various conditions
   - Verify cards are enabled when they should be

## Success Criteria Met

✅ ESLint catches `require()` in src/ files  
✅ CI runs lint check before other checks  
✅ Vitest uses jsdom environment  
✅ Build verification in CI  
✅ Comprehensive documentation created  
✅ README updated with development guidelines  
✅ All existing tests still pass

## Conclusion

The improvements create a robust defense against the `require()` bug and similar issues. The multiple layers ensure that even if one check is missed, others will catch the problem before it reaches production.

**Key Takeaway**: Always use ES6 `import` in browser code, never CommonJS `require()`.
