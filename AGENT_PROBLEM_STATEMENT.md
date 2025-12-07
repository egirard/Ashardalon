# Agent problem statement template (required for automated coding agents)

When invoking the coding agent (github-coding-agent-*), always construct the `problem_statement` by appending the following required section *verbatim* (replace `<PR_NUMBER>` with actual PR number):

---

## E2E Test Requirements (Mandatory)

**IMPORTANT**: Every PR that adds or modifies user-facing functionality MUST include end-to-end (E2E) tests.

### Checklist for E2E Tests

When adding E2E tests, you must:

- [ ] Create a new numbered test directory in `e2e/` (e.g., `034-feature-name/`)
- [ ] Write the test spec file following the pattern: `###-feature-name.spec.ts`
- [ ] Use the screenshot helper: `import { createScreenshotHelper } from '../helpers/screenshot-helper';`
- [ ] Capture screenshots at each major step with programmatic verification
- [ ] Generate and commit baseline screenshots by running: `npm run test:e2e -- --update-snapshots`
- [ ] Create a `README.md` in the test directory with:
  - Test description and user story
  - Direct links to all baseline screenshots
  - Step-by-step explanation with screenshot references
- [ ] Update `e2e/README.md` to add the new test to the "Available Tests" table
- [ ] Verify tests pass in CI with zero-pixel tolerance

### E2E Test Guidelines

All E2E tests MUST follow the guidelines in [E2E_TEST_GUIDELINES.md](E2E_TEST_GUIDELINES.md):

1. **Baseline screenshots committed** - Tests include committed baseline screenshots
2. **Zero-pixel tolerance** - Screenshots must match exactly (no maxDiffPixels)
3. **No arbitrary delays** - Use `waitFor()`, `waitForSelector()`, or `expect().toBeVisible()`
4. **Programmatic verification** - Every screenshot includes DOM/Redux state checks
5. **README with direct links** - Each test has a README with embedded screenshots

### When E2E Tests Are Required

E2E tests are required for:

- ✅ New UI components or screens
- ✅ Changes to existing UI behavior
- ✅ User interaction flows (clicks, selections, navigation)
- ✅ Game state changes visible to the user
- ✅ Visual changes or layout modifications

E2E tests are NOT required for:

- ❌ Documentation-only changes
- ❌ Internal refactoring with no user-visible changes
- ❌ Configuration changes
- ❌ Dependency updates (unless they affect UI)

### Example Problem Statement Suffix

```
## E2E Test Requirements

This PR adds/modifies user-facing functionality and requires E2E tests.

Please create E2E test `###-feature-name` that:
1. Tests the complete user workflow from start to finish
2. Captures screenshots at each major step
3. Includes programmatic verification of DOM state
4. Follows the E2E_TEST_GUIDELINES.md strictly

Generate baseline screenshots with: `npm run test:e2e -- --update-snapshots`
```

---

## How to Use This Template

1. **For new features**: Copy the entire "E2E Test Requirements" section above
2. **Replace placeholders**: Update test numbers and feature names
3. **Append to problem statement**: Add this section to the end of your issue/PR description
4. **Agent will comply**: The coding agent will follow these requirements automatically

## Enforcement

- PRs without required E2E tests will fail CI checks
- The `check-e2e-tests` workflow validates E2E test existence
- Reviewers should verify E2E tests are comprehensive and follow guidelines
