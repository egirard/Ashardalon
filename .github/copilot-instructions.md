# Copilot Instructions

When working on this repository, please read the [DEVELOPMENT.md](../docs/DEVELOPMENT.md) file first to understand the development environment and available tools.

## Quick Reference

- This project uses a **Nix-based development environment** with `bun` runtime
- The environment is automatically activated via `direnv` when the `.envrc` file is allowed
- See `docs/DEVELOPMENT.md` for:
  - Available tools and how to use them
  - How to add new tools to the environment
  - Troubleshooting common issues

## Testing Guidelines

When writing E2E tests, follow [E2E_TEST_GUIDELINES.md](../docs/E2E_TEST_GUIDELINES.md) **rigidly**:

- **Numbered tests**: Each E2E test has a unique 3-digit number (001, 002, etc.)
- **User stories**: Each test tells a complete user story
- **Screenshot sequences**: Capture screenshots at each step
- **Human verification**: Link all screenshots in `tests/e2e/README.md`

Example E2E test structure:
```typescript
test.describe('001 - Character Selection', () => {
  test('User can select a hero and start the game', async ({ page }) => {
    await page.goto('/');
    await screenshotStep(page, '001', '01', 'initial-screen');
    // ... more steps with screenshots
  });
});
```
