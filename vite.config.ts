import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { execSync } from 'child_process';

const gitCommit = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'unknown';
  }
})();

export default defineConfig({
  plugins: [svelte()],
  base: process.env.VITE_BASE || './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    port: 3000,
    strictPort: true, // Fail if port 3000 is not available
  },
  define: {
    __GIT_COMMIT__: JSON.stringify(gitCommit),
  },
});
