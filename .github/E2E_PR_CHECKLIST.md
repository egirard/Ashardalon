# E2E Test PR Checklist

This checklist must be completed for all PRs that include user-facing changes.

## Quick Reference

Use this checklist in your PR description to ensure E2E tests meet all requirements.

---

## E2E Test Checklist

### Test Creation

- [ ] Created new numbered test directory: `e2e/###-feature-name/`
- [ ] Test number is unique and follows the next available number
- [ ] Directory name is descriptive and kebab-case
- [ ] Test spec file follows naming pattern: `###-feature-name.spec.ts`

### Test Implementation

- [ ] Imported and used `createScreenshotHelper()` from `../helpers/screenshot-helper`
- [ ] Test describes a complete user story from start to finish
- [ ] Each step captures a screenshot with `screenshots.capture(page, 'step-name', { ... })`
- [ ] Every screenshot includes `programmaticCheck` callback with assertions
- [ ] Used proper waiting mechanisms:
  - [ ] `await page.locator().waitFor()` for elements
  - [ ] `await expect().toBeVisible()` for visibility checks
  - [ ] NO arbitrary delays (`waitForTimeout`)
- [ ] Test uses data-testid attributes for selectors
- [ ] Test is deterministic and passes consistently

### Screenshot Requirements

- [ ] Generated baseline screenshots with: `npm run test:e2e -- --update-snapshots`
- [ ] Baseline screenshots committed to repository
- [ ] Screenshots are in `e2e/###-feature-name/screenshots/` directory
- [ ] Screenshot files follow Playwright naming convention
- [ ] Screenshots show each step of the user journey

### Documentation

- [ ] Created `README.md` in test directory (`e2e/###-feature-name/README.md`)
- [ ] README includes:
  - [ ] Clear test title and description
  - [ ] User story being tested
  - [ ] List of steps with descriptions
  - [ ] Direct links to baseline screenshots for each step
  - [ ] Example: `![Step 1](./screenshots/###-feature-name-1-chromium-linux.png)`
- [ ] Updated `e2e/README.md` to add test to "Available Tests" table
- [ ] Added row with test number, link to README, and description

### Validation

- [ ] Tests pass locally: `npm run test:e2e`
- [ ] Tests pass with zero-pixel tolerance (no screenshot differences)
- [ ] No flaky tests (run multiple times to verify)
- [ ] Tests complete in reasonable time (< 60 seconds per test)
- [ ] No console errors or warnings during test execution

### Guidelines Compliance

Verify compliance with [E2E_TEST_GUIDELINES.md](../E2E_TEST_GUIDELINES.md):

- [ ] **Baseline screenshots committed** ✅
- [ ] **Zero-pixel tolerance** (maxDiffPixels: 0, threshold: 0) ✅
- [ ] **No arbitrary delays** (only specific waits) ✅
- [ ] **Programmatic verification** at each screenshot ✅
- [ ] **README with direct links** to all screenshots ✅

---

## Example Checklist for PR Description

Copy this into your PR description:

```markdown
## E2E Test Checklist

- [x] ✅ Yes - E2E tests included (complete checklist below)

### E2E Test Implementation

- [x] Created new numbered test directory: `e2e/034-my-feature/`
- [x] Test spec file: `034-my-feature.spec.ts`
- [x] Used `createScreenshotHelper()` from `../helpers/screenshot-helper`
- [x] Captured screenshots at each major step with programmatic verification
- [x] Generated baseline screenshots with: `npm run test:e2e -- --update-snapshots`
- [x] Committed baseline screenshots to repository
- [x] Created `README.md` in test directory with screenshot links
- [x] Updated `e2e/README.md` to add test to "Available Tests" table
- [x] Verified tests pass locally with: `npm run test:e2e`
- [x] Tests follow [E2E_TEST_GUIDELINES.md](../E2E_TEST_GUIDELINES.md)
```

---

## Common Issues and Solutions

### Missing Baseline Screenshots

**Problem**: Tests fail in CI with "Screenshot not found"

**Solution**: 
```bash
npm run test:e2e -- --update-snapshots
git add e2e/###-feature-name/screenshots/
git commit -m "Add baseline screenshots for E2E test ###"
```

### Screenshot Differences

**Problem**: Tests fail with pixel differences

**Solution**:
1. Ensure you're using the same browser/OS as CI (chromium on Linux)
2. Wait for elements to be visible before capturing
3. Avoid timing-dependent elements (animations, timestamps)
4. Use `{ state: 'visible' }` in waitFor calls

### Flaky Tests

**Problem**: Tests pass sometimes, fail other times

**Solution**:
1. Remove all `waitForTimeout()` calls
2. Wait for specific conditions instead
3. Ensure elements are stable before capturing
4. Check for race conditions in async operations

### Test Too Slow

**Problem**: Test takes more than 60 seconds

**Solution**:
1. Remove unnecessary steps
2. Optimize selectors
3. Avoid redundant captures
4. Focus on critical user path

---

## Resources

- [E2E_TEST_GUIDELINES.md](../E2E_TEST_GUIDELINES.md) - Detailed testing guidelines
- [AGENT_PROBLEM_STATEMENT.md](../AGENT_PROBLEM_STATEMENT.md) - Template for coding agents
- [e2e/README.md](../e2e/README.md) - E2E test overview
- [Playwright Documentation](https://playwright.dev/) - Official Playwright docs
