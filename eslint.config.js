import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2023,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // Prevent CommonJS require() usage in browser code
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.name="require"]',
          message: 'CommonJS require() is not allowed in browser code. Use ES6 import instead. This breaks in browser context and was the root cause of PR #383 bug.',
        },
        {
          selector: 'MemberExpression[object.name="global"][property.name="require"]',
          message: 'Indirect require access via global.require is not allowed. Use ES6 import instead.',
        },
        {
          selector: 'MemberExpression[object.name="window"][property.name="require"]',
          message: 'Indirect require access via window.require is not allowed. Use ES6 import instead.',
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'require',
          message: 'CommonJS require is not allowed in browser code. Use ES6 import instead. This breaks in browser context.',
        },
      ],
    },
  },
  {
    // Allow require() in config files (Node.js context)
    files: ['*.config.js', '*.config.ts', 'vite.config.ts', 'vitest.config.ts', 'playwright.config.ts'],
    rules: {
      'no-restricted-syntax': 'off',
      'no-restricted-globals': 'off',
    },
  },
  {
    ignores: ['node_modules', 'dist', '.direnv', 'e2e/**'],
  },
];
