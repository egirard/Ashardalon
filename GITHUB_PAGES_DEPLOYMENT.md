# GitHub Pages Deployment Strategy

This document outlines the deployment strategy for the Wrath of Ashardalon web application to GitHub Pages.

## Overview

The project uses GitHub Pages for hosting with two deployment scenarios:

1. **Production Deployment** - Automatic deployment from the `main` branch to the root of the GitHub Pages site
2. **PR Preview Deployment** - On-demand deployment of pull requests to sub-paths for verification

## Deployment URLs

| Deployment Type | URL Pattern | Trigger |
|-----------------|-------------|---------|
| Production | `https://<owner>.github.io/Ashardalon/` | Automatic on merge to `main` |
| PR Preview | `https://<owner>.github.io/Ashardalon/pr-<number>/` | Manual workflow dispatch |

## Production Deployment (Main Branch)

### Trigger

Production deployment happens **automatically** when:
- A pull request is merged into the `main` branch
- Any push is made directly to the `main` branch

### Workflow: `deploy.yml`

The production deployment workflow performs the following steps:

1. Checkout the `main` branch
2. Install dependencies using `bun install`
3. Build the application using `bun run build`
4. Deploy the `dist/` directory to the root of GitHub Pages

### Configuration

The production build uses the default base path configured in `vite.config.ts`:

```typescript
export default defineConfig({
  base: './',
  // ...
});
```

## PR Preview Deployment

### Purpose

PR preview deployments allow reviewers to test and verify changes in a pull request before merging. Each PR can be deployed to its own unique sub-path.

### Trigger

PR preview deployment is triggered **manually** via GitHub Actions workflow dispatch. This allows:
- Reviewers to request a preview when needed
- Authors to deploy their PR for testing
- Controlled resource usage (not every PR is automatically deployed)

### URL Structure

PR previews are deployed to: `https://<owner>.github.io/Ashardalon/pr-<number>/`

For example:
- PR #42 → `https://<owner>.github.io/Ashardalon/pr-42/`
- PR #123 → `https://<owner>.github.io/Ashardalon/pr-123/`

### Workflow: `deploy-pr-preview.yml`

The PR preview deployment workflow performs the following steps:

1. Accept the PR number as a workflow input
2. Checkout the PR branch
3. Install dependencies using `bun install`
4. Build the application with the PR-specific base path
5. Deploy the `dist/` directory to the `/pr-<number>/` sub-path on GitHub Pages

### Configuration

For PR preview builds, the base path must be set dynamically:

```bash
# Build with PR-specific base path
VITE_BASE=/Ashardalon/pr-<number>/ bun run build
```

Or configure in the build script:

```typescript
// vite.config.ts with dynamic base path
export default defineConfig({
  base: process.env.VITE_BASE || './',
  // ...
});
```

## GitHub Actions Workflows

### Production Deployment Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        run: bun install

      - name: Build
        run: bun run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### PR Preview Deployment Workflow

Create `.github/workflows/deploy-pr-preview.yml`:

```yaml
name: Deploy PR Preview

on:
  workflow_dispatch:
    inputs:
      pr_number:
        description: 'Pull Request Number'
        required: true
        type: string

permissions:
  contents: write
  pages: write
  id-token: write
  pull-requests: read

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    steps:
      - name: Get PR branch
        id: pr
        uses: actions/github-script@v7
        with:
          script: |
            const pr = await github.rest.pulls.get({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: parseInt('${{ inputs.pr_number }}')
            });
            core.setOutput('ref', pr.data.head.ref);
            core.setOutput('sha', pr.data.head.sha);

      - name: Checkout PR branch
        uses: actions/checkout@v4
        with:
          ref: ${{ steps.pr.outputs.ref }}

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        run: bun install

      - name: Build with PR base path
        run: bun run build
        env:
          VITE_BASE: /Ashardalon/pr-${{ inputs.pr_number }}/

      - name: Checkout gh-pages branch
        uses: actions/checkout@v4
        with:
          ref: gh-pages
          path: gh-pages

      - name: Copy build to PR sub-path
        run: |
          mkdir -p gh-pages/pr-${{ inputs.pr_number }}
          cp -r dist/* gh-pages/pr-${{ inputs.pr_number }}/

      - name: Deploy to GitHub Pages
        run: |
          cd gh-pages
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add .
          git commit -m "Deploy PR #${{ inputs.pr_number }} preview" || echo "No changes to commit"
          git push
```

> **Note**: This workflow requires the `gh-pages` branch to exist. If using the default GitHub Pages Actions deployment (without a `gh-pages` branch), the PR preview deployment will need to use the `actions/upload-pages-artifact` approach with custom artifact handling.

## Repository Settings

To enable GitHub Pages deployment:

1. Go to **Settings** → **Pages**
2. Under **Build and deployment**:
   - Source: **GitHub Actions**
3. Ensure the repository has GitHub Pages enabled

## Vite Configuration

Update `vite.config.ts` to support dynamic base paths:

```typescript
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  base: process.env.VITE_BASE || './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    port: 3000,
  },
});
```

## Cleanup

PR preview deployments should be cleaned up after the PR is merged or closed. This can be done:

1. **Manually** - Delete the PR sub-directory from the GitHub Pages branch
2. **Automatically** - Add a workflow triggered on PR close to remove the preview

### Optional Cleanup Workflow

```yaml
name: Cleanup PR Preview

on:
  pull_request:
    types: [closed]

permissions:
  contents: write

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout gh-pages branch
        uses: actions/checkout@v4
        with:
          ref: gh-pages

      - name: Remove PR preview directory
        run: |
          PR_DIR="pr-${{ github.event.pull_request.number }}"
          if [ -d "$PR_DIR" ]; then
            rm -rf "$PR_DIR"
            git config user.name "github-actions[bot]"
            git config user.email "github-actions[bot]@users.noreply.github.com"
            git add .
            git commit -m "Remove PR #${{ github.event.pull_request.number }} preview" || echo "No changes to commit"
            git push
            echo "Cleaned up preview for PR #${{ github.event.pull_request.number }}"
          else
            echo "No preview directory found for PR #${{ github.event.pull_request.number }}"
          fi
```

## Summary

| Feature | Production | PR Preview |
|---------|------------|------------|
| Trigger | Automatic (push to main) | Manual (workflow dispatch) |
| URL | Root (`/`) | Sub-path (`/pr-###/`) |
| Workflow | `deploy.yml` | `deploy-pr-preview.yml` |
| Base Path | `./` | `/Ashardalon/pr-###/` |
