# Pull Request

## Description

<!-- Provide a clear and concise description of what this PR does -->

## Type of Change

<!-- Mark the relevant option with an 'x' -->

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Configuration/Infrastructure change

## E2E Test Checklist (Required for UI changes)

<!-- If this PR modifies user-facing functionality, E2E tests are REQUIRED -->

**Does this PR require E2E tests?** (Check one)

- [ ] ✅ Yes - E2E tests included (complete checklist below)
- [ ] ❌ No - This PR is documentation/config/refactoring only (no UI changes)

### If E2E tests are required, complete this checklist:

- [ ] Created new numbered test directory: `e2e/###-feature-name/`
- [ ] Test spec file follows naming pattern: `###-feature-name.spec.ts`
- [ ] Used `createScreenshotHelper()` from `../helpers/screenshot-helper`
- [ ] Captured screenshots at each major step with `screenshots.capture()`
- [ ] Each screenshot includes programmatic verification (DOM/state checks)
- [ ] Generated baseline screenshots with: `npm run test:e2e -- --update-snapshots`
- [ ] Committed baseline screenshots to repository
- [ ] Created `README.md` in test directory with:
  - [ ] Test description and user story
  - [ ] Direct links to all baseline screenshots
  - [ ] Step-by-step explanation
- [ ] Updated `e2e/README.md` to add test to "Available Tests" table
- [ ] Verified tests pass locally with: `npm run test:e2e`
- [ ] Tests follow [E2E_TEST_GUIDELINES.md](../E2E_TEST_GUIDELINES.md):
  - [ ] Zero-pixel tolerance (no maxDiffPixels)
  - [ ] No arbitrary delays (use waitFor/expect)
  - [ ] Programmatic verification at each step
  - [ ] Complete user story from start to finish

## Test Plan

<!-- Describe how to verify this change works correctly -->

### Local Testing

1. <!-- Step 1 to test locally -->
2. <!-- Step 2 to test locally -->

### CI Testing

<!-- Describe what CI checks should pass -->

- [ ] Unit tests pass (`npm run test:unit`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] Build succeeds (`npm run build`)

## Screenshots (if applicable)

<!-- Add screenshots for visual changes -->

## Related Issues

<!-- Link related issues: Closes #123, Relates to #456 -->

## Additional Notes

<!-- Any additional information or context -->

---

**Reviewer Note**: Please verify that:
1. E2E tests are present if required
2. E2E tests follow the guidelines in [E2E_TEST_GUIDELINES.md](../E2E_TEST_GUIDELINES.md)
3. All baseline screenshots are committed
4. Test README has direct screenshot links
