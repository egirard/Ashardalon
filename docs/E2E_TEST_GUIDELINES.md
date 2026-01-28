# E2E Test Guidelines

This document outlines how to properly write end-to-end (E2E) tests for the Wrath of Ashardalon web application using Playwright.

## Core Principles

### 1. Tests Must Come with Baseline Screenshots

**Every new E2E test must include committed baseline screenshots.** Tests will fail in CI if baselines are missing.

- Test authors are responsible for generating and committing baseline screenshots
- CI does not regenerate baselines - it only compares against existing ones
- Baseline screenshots serve as the visual "source of truth"

### 2. Select Heroes from Bottom Edge for Natural Reading Orientation

**Always select heroes from the bottom edge of the screen to ensure proper text alignment and natural reading orientation.**

When selecting heroes in E2E tests, use the `-bottom` variant of hero test IDs (e.g., `hero-quinn-bottom` instead of `hero-quinn`). This ensures that in-game messages and UI elements align with the natural reading orientation for users sitting at the bottom of the screen.

**Always use the bottom variant when selecting heroes:**
```typescript
// ✅ GOOD: Select hero from bottom edge
await page.locator('[data-testid="hero-quinn-bottom"]').click();

// ❌ BAD: Generic selector without position
await page.locator('[data-testid="hero-quinn"]').click();
```

**Why this is important:**
- Ensures consistent player perspective in E2E tests
- Aligns UI messages with natural reading orientation
- Matches how most users interact with the game
- Provides stable, predictable test screenshots
- Simulates the primary player viewpoint

**Available hero positions:**
- `hero-{name}-bottom` - Hero card at bottom edge (recommended for tests)
- `hero-{name}-top` - Hero card at top edge
- `hero-{name}-left` - Hero card at left edge
- `hero-{name}-right` - Hero card at right edge

### 3. Deterministic Game Initialization

**Tests must use deterministic game initialization to ensure stable screenshot comparisons.**

The game uses `Date.now()` as a random seed for shuffling tile decks and hero positions when not explicitly provided. This causes **non-deterministic game state** where entities appear in different locations between test runs, resulting in screenshot failures.

**Problem Example:**
```typescript
// ❌ BAD: Uses current timestamp → different tile layout each run
await page.locator('[data-testid="start-game-button"]').click();
```

**Solution: Override Date.now() before game start:**
```typescript
// ✅ GOOD: Fixed timestamp → deterministic tile layout
await page.evaluate(() => {
  Date.now = function() {
    return 1234567890000; // Fixed timestamp
  };
});

await page.locator('[data-testid="start-game-button"]').click();
```

**Why this is critical:**

The `startGame` action in `src/store/gameSlice.ts` uses:
- `seed ?? Date.now()` to generate a random seed
- This seed shuffles the tile deck using `shuffleArray(INITIAL_TILE_DECK, randomFn)`
- This seed shuffles hero starting positions
- Different seeds = different dungeon layouts = screenshot failures

**Implementation in tests:**
```typescript
test('my game test', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
  
  // CRITICAL: Set fixed Date.now() before starting game
  await page.evaluate(() => {
    Date.now = function() { return 1234567890000; };
  });
  
  // Select hero from bottom edge for natural reading orientation
  await page.locator('[data-testid="hero-quinn-bottom"]').click();
  await page.locator('[data-testid="start-game-button"]').click();
  // Game now has deterministic layout
});
```

**Zero-pixel tolerance:**

With deterministic initialization, tests use strict pixel-perfect comparison:
```typescript
expect: {
  toHaveScreenshot: {
    maxDiffPixels: 0,  // No pixels can differ
    threshold: 0,       // No color difference allowed
  },
}
```

This ensures any visual regression is caught immediately.

### 4. No Arbitrary Delays or Retries

**Tests must not use arbitrary delays or rely on retries.**

❌ **Do NOT use:**
```typescript
await page.waitForTimeout(2000);  // Arbitrary delay
```

✅ **Instead, wait for specific conditions:**
```typescript
await page.locator('[data-testid="hero-card"]').waitFor({ state: 'visible' });
await expect(page.locator('h1')).toBeVisible();
await page.waitForSelector('[data-testid="game-loaded"]');
```

**Retries are disabled in configuration:**
```typescript
retries: 0,  // Tests must pass on first attempt
```

If a test is flaky, fix the underlying issue rather than relying on retries.

### 5. Programmatic Verification is Required

**Every screenshot must be accompanied by programmatic verification of the page content or Redux store state.**

Visual snapshots alone are not sufficient. Each screenshot should verify that the application state matches expectations based on the test scenario.

✅ **Always include programmatic checks:**
```typescript
await screenshots.capture(page, 'heroes-displayed', {
  programmaticCheck: async () => {
    // Verify DOM content
    await expect(page.locator('[data-testid="hero-card"]')).toHaveCount(5);
    
    // Verify specific data
    const heroNames = await page.locator('[data-testid="hero-name"]').allTextContents();
    expect(heroNames).toContain('Quinn');
    expect(heroNames).toContain('Vistra');
  }
});
```

**What to verify:**
- DOM elements are visible/hidden as expected
- Content matches expected values (text, counts, etc.)
- Data is correctly displayed (hero cards, game board, etc.)
- Redux store state (using page.evaluate())
- Error states are shown/hidden appropriately

**Example verifying Redux store:**
```typescript
await screenshots.capture(page, 'hero-selected', {
  programmaticCheck: async () => {
    // Access Redux store from the page context
    const storeState = await page.evaluate(() => {
      return window.__REDUX_STORE__.getState();
    });
    
    expect(storeState.heroes.selectedHeroes.length).toBe(1);
    expect(storeState.heroes.selectedHeroes[0].name).toBe('Quinn');
  }
});
```

The `programmaticCheck` callback runs **before** the screenshot is captured, ensuring the page is in the correct state before visual verification.

---

## Writing a New E2E Test

### Step 1: Create the Test Directory and File

Create a new test directory following the naming convention `###-<testname>`:

```
e2e/###-<testname>/
├── ###-<testname>.spec.ts    # Test file
├── README.md                  # Documentation with screenshot gallery
└── screenshots/               # Baseline screenshots (committed)
```

For example:
```
e2e/001-character-selection/
├── 001-character-selection.spec.ts
├── README.md
└── screenshots/
    ├── 000-initial-screen-chromium-linux.png
    ├── 001-hero-selected-chromium-linux.png
    └── 002-game-started-chromium-linux.png
```

The three-digit prefix (e.g., `001`, `002`) helps organize tests in a specific order.

### Step 2: Use the Screenshot Helper

Import and use the screenshot helper for numbered screenshots:

```typescript
import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from '../helpers/screenshot-helper';

test.describe('001 - Character Selection', () => {
  test('User can select a hero and start the game', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // Navigate to the page
    await page.goto('/');
    
    // Wait for a specific element (NOT arbitrary timeout)
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    // Capture screenshot with programmatic verification
    await screenshots.capture(page, 'initial-screen', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="hero-card"]')).toHaveCount(5);
      }
    });
    
    // Continue with user actions...
  });
});
```

### Step 3: Follow the User Story Pattern

Structure tests as complete user journeys:

```typescript
test('player selects hero and sees game board', async ({ page }) => {
  const screenshots = createScreenshotHelper();
  
  // STEP 1: Initial state - character selection screen
  await page.goto('/');
  await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
  await screenshots.capture(page, 'character-selection', {
    programmaticCheck: async () => {
      await expect(page.locator('[data-testid="hero-card"]')).toHaveCount(5);
      await expect(page.locator('[data-testid="start-game-button"]')).toBeDisabled();
    }
  });
  
  // STEP 2: Select a hero from bottom edge
  await page.locator('[data-testid="hero-quinn-bottom"]').click();
  await screenshots.capture(page, 'hero-selected', {
    programmaticCheck: async () => {
      await expect(page.locator('[data-testid="hero-quinn-bottom"]')).toHaveClass(/selected/);
      await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled();
    }
  });
  
  // STEP 3: Start the game
  await page.locator('[data-testid="start-game-button"]').click();
  await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
  await screenshots.capture(page, 'game-board', {
    programmaticCheck: async () => {
      await expect(page.locator('[data-testid="start-tile"]')).toBeVisible();
      await expect(page.locator('[data-testid="hero-token"]')).toBeVisible();
    }
  });
});
```

### Step 4: Generate Baseline Screenshots

After writing your test, generate the baseline screenshots:

```bash
# Generate baselines for your new test
bun run test:e2e -- --update-snapshots
```

### Step 5: Verify and Commit Baselines

1. **Verify** the generated screenshots look correct
2. **Check** that screenshots are in `e2e/###-<testname>/screenshots/`
3. **Commit** the baseline screenshots with your test:

```bash
git add e2e/###-<testname>/
git commit -m "Add E2E test for <feature>"
```

### Step 6: Create Test Documentation

Create `e2e/###-<testname>/README.md` documenting:

- User story description
- Screenshot gallery with **direct links** to images in the snapshots subdirectory
- What each screenshot verifies
- Manual verification checklist

**IMPORTANT: Image Link Format for GitHub Markdown**

When linking to screenshot images in E2E test READMEs, use **bare relative paths without any prefix**:

```markdown
✅ CORRECT:
![Screenshot 000](test-name.spec.ts-snapshots/000-001-description-chromium-linux.png)

❌ INCORRECT (causes GitHub to misresolve paths):
![Screenshot 000](./test-name.spec.ts-snapshots/000-001-description-chromium-linux.png)
![Screenshot 000](/e2e/test-name/test-name.spec.ts-snapshots/000-001-description-chromium-linux.png)
```

**Why this matters:**
- The `./` prefix causes GitHub's markdown renderer to misresolve paths when the README is in a subdirectory
- Bare relative paths (no prefix) work correctly for README files in subdirectories
- Playwright generates snapshot directories named `test-name.spec.ts-snapshots/` by default

**Example README with correct image links:**
```markdown
## Screenshot 001: Initial Screen
![Initial Screen](101-my-test.spec.ts-snapshots/000-001-initial-screen-chromium-linux.png)

## Screenshot 002: After Action
![After Action](101-my-test.spec.ts-snapshots/001-002-after-action-chromium-linux.png)
```

This allows users to view all screenshots directly in the README without navigating to other files.

---

## Screenshot Helper API

The `createScreenshotHelper()` function provides:

```typescript
interface ScreenshotHelper {
  // Capture a numbered screenshot
  capture(
    page: Page,
    description: string,
    options?: {
      fullPage?: boolean;
      programmaticCheck?: () => Promise<void>;
    }
  ): Promise<void>;
  
  // Reset counter (for new test)
  reset(): void;
  
  // Get current counter value
  getCounter(): number;
}
```

**Screenshot naming:** `NNN-description.png` (e.g., `000-initial-screen.png`, `001-hero-selected.png`)

---

## Waiting for Elements

### Correct Patterns

```typescript
// Wait for element to be visible
await page.locator('selector').waitFor({ state: 'visible' });

// Wait for element to be hidden
await page.locator('selector').waitFor({ state: 'hidden' });

// Wait for element to be attached to DOM
await page.locator('selector').waitFor({ state: 'attached' });

// Use expect with auto-waiting
await expect(page.locator('selector')).toBeVisible();
await expect(page.locator('selector')).toHaveText('expected text');

// Wait for specific count
await expect(page.locator('[data-testid="hero-card"]')).toHaveCount(5);
```

### Incorrect Patterns

```typescript
// ❌ NEVER use arbitrary delays
await page.waitForTimeout(2000);

// ❌ NEVER use sleep/delay functions
await new Promise(resolve => setTimeout(resolve, 1000));

// ❌ NEVER use polling with arbitrary intervals
while (true) {
  await page.waitForTimeout(500);
  if (await page.locator('.element').isVisible()) break;
}
```

---

## Test Structure

```
e2e/
├── helpers/                       # Helper utilities
│   └── screenshot-helper.ts      # Numbered screenshot helper
├── ###-<testname>/                # Test directory (e.g., 001-character-selection)
│   ├── ###-<testname>.spec.ts    # Test file
│   ├── README.md                 # User story, screenshot gallery (with direct image links)
│   └── screenshots/              # Baseline screenshots (committed)
│       ├── 000-initial-screen-chromium-linux.png
│       ├── 001-hero-selected-chromium-linux.png
│       └── ...
└── README.md                     # E2E overview documentation
```

---

## Running Tests

```bash
# Run all E2E tests
bun run test:e2e

# Run a specific test by number
bun run test:e2e -- --grep "001"

# Interactive UI mode
bun run test:e2e:ui

# Headed mode (see browser)
bun run test:e2e:headed

# View test report
bun run test:e2e:report

# Update snapshots
bun run test:e2e -- --update-snapshots
```

---

## Debugging Failed Tests

1. **View the HTML report:**
   ```bash
   bun run test:e2e:report
   ```

2. **Check diff images** in `test-results/` for visual differences

3. **Run in headed mode** to see what's happening:
   ```bash
   bun run test:e2e:headed
   ```

4. **Use UI mode** for step-by-step debugging:
   ```bash
   bun run test:e2e:ui
   ```

---

## Updating Existing Tests

When you change the UI and need to update baselines:

1. **Run the test** to see the failure:
   ```bash
   bun run test:e2e -- e2e/###-<testname>/###-<testname>.spec.ts
   ```

2. **Review the diff** in `test-results/` directory

3. **If the change is intentional**, update baselines:
   ```bash
   bun run test:e2e -- e2e/###-<testname>/###-<testname>.spec.ts --update-snapshots
   ```

4. **Verify and commit** the new baselines:
   ```bash
   git add e2e/###-<testname>/screenshots/
   git commit -m "Update baselines for <reason>"
   ```

---

## Checklist for New Tests

Before submitting a PR with a new E2E test, verify:

- [ ] Test directory created as `e2e/###-<testname>/`
- [ ] Test file named `e2e/###-<testname>/###-<testname>.spec.ts`
- [ ] Test uses `createScreenshotHelper()` for screenshots
- [ ] **Every screenshot includes programmatic verification via `programmaticCheck`**
- [ ] Test waits for specific conditions (no arbitrary delays)
- [ ] Test does not rely on retries
- [ ] Baseline screenshots generated with `--update-snapshots`
- [ ] Baseline screenshots stored in `e2e/###-<testname>/screenshots/`
- [ ] Baseline screenshots committed to git
- [ ] Test documentation created in `e2e/###-<testname>/README.md`
- [ ] **README includes direct links to screenshots** (e.g., `![Screenshot](screenshots/000-example.png)`)
- [ ] Test passes consistently when run multiple times
- [ ] Test passes with zero-pixel tolerance

---

## Example: Complete Test

See `e2e/001-character-selection/001-character-selection.spec.ts` for a complete example following these guidelines.

```typescript
import { test, expect } from '@playwright/test';
import { createScreenshotHelper } from '../helpers/screenshot-helper';

test.describe('001 - Character Selection to Game Board', () => {
  test('player selects hero and starts game', async ({ page }) => {
    const screenshots = createScreenshotHelper();
    
    // STEP 1: Navigate to character selection
    await page.goto('/');
    await page.locator('[data-testid="character-select"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'initial-screen', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="hero-card"]')).toHaveCount(5);
        await expect(page.locator('[data-testid="start-game-button"]')).toBeDisabled();
      }
    });
    
    // STEP 2: Select hero Quinn from bottom edge
    await page.locator('[data-testid="hero-quinn-bottom"]').click();
    
    await screenshots.capture(page, 'hero-selected', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="hero-quinn-bottom"]')).toHaveClass(/selected/);
        await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled();
        
        // Verify Redux store
        const storeState = await page.evaluate(() => {
          return (window as any).__REDUX_STORE__.getState();
        });
        expect(storeState.heroes.selectedHeroes).toHaveLength(1);
      }
    });
    
    // STEP 3: Start the game
    await page.locator('[data-testid="start-game-button"]').click();
    await page.locator('[data-testid="game-board"]').waitFor({ state: 'visible' });
    
    await screenshots.capture(page, 'game-board', {
      programmaticCheck: async () => {
        await expect(page.locator('[data-testid="start-tile"]')).toBeVisible();
        await expect(page.locator('[data-testid="hero-token"]')).toBeVisible();
      }
    });
  });
});
```

---

*This guideline ensures our E2E tests serve as living documentation that anyone can review to understand the application's behavior.*
