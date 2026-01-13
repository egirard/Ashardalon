# Import Best Practices for Browser Code

This document outlines best practices for module imports in the Wrath of Ashardalon project to prevent browser compatibility issues.

## Golden Rule: Always Use ES6 Imports in Browser Code

The project uses ES6 modules (`"type": "module"` in package.json). All browser-executed code must use ES6 import syntax.

## ✅ Correct: ES6 Imports

```typescript
// Single named import
import { getTileOrSubTileId } from './movement';

// Multiple named imports
import { getTileOrSubTileId, findTileAtPosition } from './movement';

// Default import
import GameBoard from './components/GameBoard.svelte';

// Namespace import
import * as utils from './utils';

// Side-effect import
import './styles.css';

// Type-only import (TypeScript)
import type { GameState } from './gameSlice';
```

## ❌ Incorrect: CommonJS require()

```typescript
// NEVER use require() in src/ files
const { getTileOrSubTileId } = require('./movement');  // ❌ BREAKS IN BROWSER

// NEVER use module.exports
module.exports = { something };  // ❌ BREAKS IN BROWSER

// NEVER use exports
exports.something = function() {};  // ❌ BREAKS IN BROWSER
```

## Why require() Breaks in Browser

1. **Browser Environment**: Browsers don't have a built-in `require()` function
2. **ES6 Modules**: Modern JavaScript uses `import/export`, not CommonJS
3. **Vite Bundler**: While Vite bundles ES6 modules, it doesn't polyfill `require()`
4. **Runtime Error**: Using `require()` causes `ReferenceError: require is not defined`

## Where require() IS Allowed

CommonJS `require()` is only allowed in Node.js-specific files:

- `vite.config.ts` - Vite configuration (runs in Node.js)
- `vitest.config.ts` - Vitest configuration (runs in Node.js)
- `playwright.config.ts` - Playwright configuration (runs in Node.js)
- `eslint.config.js` - ESLint configuration (runs in Node.js)
- Any `*.config.js` or `*.config.ts` files

These files run in Node.js, not the browser, so `require()` works there.

## Automated Checks

The project has ESLint rules to catch `require()` usage:

```bash
# Run linter to catch require() usage
npm run lint

# The linter will show errors like:
# error  CommonJS require() is not allowed in browser code
```

**Always run linter before committing:**
```bash
npm run lint
npm run lint:fix  # Auto-fix simple issues
```

## Dynamic Imports

If you need to dynamically load modules at runtime, use ES6 dynamic imports:

```typescript
// ✅ Correct: ES6 dynamic import
const module = await import('./dynamicModule');

// ❌ Incorrect: CommonJS require
const module = require('./dynamicModule');
```

## Import Paths

- **Relative imports**: Start with `./` or `../`
  ```typescript
  import { something } from './utils';
  import { something } from '../shared/utils';
  ```

- **Package imports**: No prefix
  ```typescript
  import { createSlice } from '@reduxjs/toolkit';
  import React from 'react';
  ```

- **Type imports**: Use `type` keyword (TypeScript)
  ```typescript
  import type { GameState } from './gameSlice';
  ```

## Circular Dependencies

Avoid circular dependencies between modules:

```typescript
// ❌ BAD: Circular dependency
// fileA.ts
import { functionB } from './fileB';
export function functionA() { functionB(); }

// fileB.ts
import { functionA } from './fileA';  // ❌ Circular!
export function functionB() { functionA(); }
```

Instead, extract shared code to a third file:

```typescript
// ✅ GOOD: Shared utilities in separate file
// utils.ts
export function sharedFunction() { }

// fileA.ts
import { sharedFunction } from './utils';
export function functionA() { sharedFunction(); }

// fileB.ts
import { sharedFunction } from './utils';
export function functionB() { sharedFunction(); }
```

## Tree Shaking

ES6 imports enable tree shaking (removing unused code):

```typescript
// ✅ GOOD: Import only what you need
import { getTileOrSubTileId } from './movement';

// ⚠️ AVOID: Namespace import prevents tree shaking
import * as movement from './movement';
movement.getTileOrSubTileId();  // Imports entire module
```

## Side Effects

Mark side-effect-free modules in package.json for better optimization:

```json
{
  "sideEffects": false
}
```

Or specify which files have side effects:

```json
{
  "sideEffects": ["*.css", "src/polyfills.ts"]
}
```

## Testing

Unit tests should also use ES6 imports:

```typescript
// test file
import { describe, it, expect } from 'vitest';
import { myFunction } from './myModule';

describe('myFunction', () => {
  it('should work', () => {
    expect(myFunction()).toBe(true);
  });
});
```

## Common Mistakes

### 1. Mixing Import Styles

```typescript
// ❌ BAD: Mixing require() and import
import { something } from './module1';
const { other } = require('./module2');  // ❌ Don't mix!
```

### 2. Using require() for "Quick Fixes"

```typescript
// ❌ BAD: Using require() because you forgot to add import at top
function myFunction() {
  const { helper } = require('./helper');  // ❌ Bad practice!
  return helper();
}

// ✅ GOOD: Always use import at top
import { helper } from './helper';

function myFunction() {
  return helper();
}
```

### 3. Conditional require()

```typescript
// ❌ BAD: Conditional require()
if (condition) {
  const module = require('./module');  // ❌ Doesn't work in browser
}

// ✅ GOOD: Conditional ES6 dynamic import
if (condition) {
  const module = await import('./module');
}
```

## Migration from require()

If you encounter `require()` in old code:

```typescript
// OLD CODE (❌ BAD)
const { getTileOrSubTileId } = require('./movement');
const { findTileAtPosition } = require('./movement');

// NEW CODE (✅ GOOD)
import { getTileOrSubTileId, findTileAtPosition } from './movement';
```

## Resources

- [MDN: JavaScript Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [ES6 Modules vs CommonJS](https://hacks.mozilla.org/2018/03/es-modules-a-cartoon-deep-dive/)
- [Vite Module Handling](https://vitejs.dev/guide/features.html#npm-dependency-resolving-and-pre-bundling)

## Questions?

If you're unsure whether a pattern is correct:

1. Run `npm run lint` - the linter will catch most issues
2. Check this document for examples
3. Look at existing code in the project for patterns
4. Ask in PR reviews - code reviewers will help catch issues

## See Also

- `docs/POST_MORTEM_REQUIRE_ISSUE.md` - Detailed analysis of the require() bug
- `eslint.config.js` - Linting rules that prevent require() usage
- `vitest.config.ts` - Test environment configuration
