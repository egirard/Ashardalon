## Description

<!-- Provide a brief description of the changes in this PR -->

## Changes Made

<!-- List the key changes made in this PR -->

- 
- 
- 

## Test Plan

<!-- Describe how to test these changes locally and what to verify -->

### Local Testing

```bash
# Steps to test locally

```

### CI Testing

<!-- What CI checks should pass? -->

- [ ] E2E tests pass
- [ ] Build succeeds
- [ ] No new linting errors

---

## E2E Test Requirements (Mandatory)

This PR **MUST** include runnable end-to-end (E2E) tests that follow the repository's E2E test guidelines (`E2E_TEST_GUIDELINES.md`).

### Required E2E Test Checklist

Before submitting this PR, verify that your E2E tests meet ALL of the following criteria:

- [ ] Test directory created as `e2e/###-<testname>/` (where ### is a unique 3-digit number)
- [ ] Test file named `e2e/###-<testname>/###-<testname>.spec.ts`
- [ ] Test uses `createScreenshotHelper()` for numbered screenshots
- [ ] **Every screenshot includes programmatic verification via `programmaticCheck`**
- [ ] Test waits for specific conditions (NO arbitrary delays like `waitForTimeout`)
- [ ] Test does NOT rely on retries (retries are disabled in config)
- [ ] Baseline screenshots generated with `bun run test:e2e -- --update-snapshots`
- [ ] Baseline screenshots stored in `e2e/###-<testname>/###-<testname>.spec.ts-snapshots/`
- [ ] Baseline screenshots committed to git
- [ ] Test documentation created in `e2e/###-<testname>/README.md`
- [ ] **README includes direct links to screenshots** (e.g., `![Screenshot](###-<testname>.spec.ts-snapshots/000-example-chromium-linux.png)`)
- [ ] Test tells a complete user story from start to finish
- [ ] Test passes consistently when run multiple times
- [ ] Test passes with zero-pixel tolerance (maxDiffPixels: 0)
- [ ] All programmatic checks verify expected application state

### Running E2E Tests

```bash
# Run all E2E tests
bun run test:e2e

# Run your specific test (replace ### with your test number)
bun run test:e2e -- --grep "###"

# Update baseline screenshots (if UI changed intentionally)
bun run test:e2e -- --update-snapshots
```

### E2E Test Documentation

<!-- Link to your E2E test README -->

- E2E Test: `e2e/###-<testname>/README.md`

### Why E2E Tests Are Mandatory

E2E tests serve as:
- **Living documentation** that shows how features work
- **Visual regression detection** to catch unintended UI changes
- **Integration validation** to ensure all components work together
- **Automated acceptance criteria** that can be reviewed by stakeholders

See `E2E_TEST_GUIDELINES.md` for complete guidelines on writing E2E tests.

---

## Screenshots (if applicable)

<!-- Include screenshots of UI changes -->

---

## Related Issues

<!-- Link to related issues -->

Closes #
