import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // Changed from 'node' to 'jsdom' to simulate browser environment.
    // This catches browser-specific issues like require() usage that fail at runtime.
    // The 'node' environment has require() built-in, which masked the PR #383 bug.
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/store/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts', 'src/store/index.ts'],
    },
  },
});
