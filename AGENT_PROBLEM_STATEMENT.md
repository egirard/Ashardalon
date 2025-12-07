# Agent problem statement template (required for automated coding agents)

When invoking the coding agent (github-coding-agent-*), always construct the `problem_statement` by appending the following required section *verbatim* (replace <FEATURE_DESC> with the task-specific description):

---
E2E TEST REQUIREMENT (MANDATORY)
- This PR MUST include at least one end-to-end (E2E) test that exercises the new or changed feature end-to-end.
- Follow E2E_TEST_GUIDELINES.md in the repo root. Link: ./E2E_TEST_GUIDELINES.md
- Put tests under tests/e2e or the repo's canonical E2E path. Name the test file to reflect the feature (e.g. tests/e2e/<feature>-e2e.spec.(js|ts|py)).
- Ensure tests are runnable in CI via the repository's canonical command (e.g. `npm run e2e`, `make e2e`, or `./scripts/run-e2e`). If none exists, create a simple `npm run e2e` or `make e2e` target and document usage in the PR.
- Add any required docker-compose or test fixtures to `tests/e2e/ci/` and ensure they don't require private secrets to run in CI (use mocks or test doubles).
- Add a short test plan to the PR description listing the scenarios covered and the commands reviewers should run locally to reproduce.
- If E2E cannot be reasonably provided (e.g. external paid service or long-running infra), explain why in the PR description and include an integration test alternative and a follow-up issue tracking adding the E2E harness.

Add this checklist to the end of your problem statement:
- [ ] Includes runnable E2E test(s) under tests/e2e
- [ ] CI job configured for E2E and passes locally
- [ ] Test plan added to PR description
---
Replace <FEATURE_DESC> with: <FEATURE_DESC>
