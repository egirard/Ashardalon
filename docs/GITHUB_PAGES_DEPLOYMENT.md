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
  base: process.env.VITE_BASE || './',
  // ...
});
```

## PR Preview Deployment

### Purpose

PR preview deployments allow reviewers to test and verify changes in a pull request before merging. Each PR can be deployed to its own unique sub-path.

### Trigger

PR preview deployment triggers automatically on all pull requests:

1. **Automatic**: The workflow runs automatically when:
   - A new PR is opened
   - New commits are pushed to any PR branch
   - A PR is reopened

2. **Manual (Workflow dispatch)**: Navigate to Actions → Deploy PR Preview → Run workflow and enter the PR number

### How to Use

1. Open or push to a Pull Request
2. The workflow will automatically run and deploy your changes
3. A comment will be added with the preview URL
4. Subsequent pushes to the PR will automatically re-deploy

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
# Build with PR-specific base path (example for PR #42)
VITE_BASE=/Ashardalon/pr-42/ bun run build
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
  pull_request:
    types: [opened, synchronize, reopened]
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
  pull-requests: write

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    steps:
      - name: Get PR info
        id: pr
        uses: actions/github-script@v7
        with:
          script: |
            let prNumber, ref, sha;
            if (context.eventName === 'workflow_dispatch') {
              const pr = await github.rest.pulls.get({
                owner: context.repo.owner,
                repo: context.repo.repo,
                pull_number: parseInt('${{ inputs.pr_number }}')
              });
              prNumber = pr.data.number;
              ref = pr.data.head.ref;
              sha = pr.data.head.sha;
            } else {
              prNumber = context.payload.pull_request.number;
              ref = context.payload.pull_request.head.ref;
              sha = context.payload.pull_request.head.sha;
            }
            core.setOutput('number', prNumber);
            core.setOutput('ref', ref);
            core.setOutput('sha', sha);

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
          VITE_BASE: /${{ github.event.repository.name }}/pr-${{ steps.pr.outputs.number }}/

      - name: Checkout gh-pages branch
        uses: actions/checkout@v4
        with:
          ref: gh-pages
          path: gh-pages

      - name: Copy build to PR sub-path
        run: |
          mkdir -p gh-pages/pr-${{ steps.pr.outputs.number }}
          cp -r dist/. gh-pages/pr-${{ steps.pr.outputs.number }}/

      - name: Deploy to GitHub Pages
        run: |
          cd gh-pages
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add .
          git commit -m "Deploy PR #${{ steps.pr.outputs.number }} preview" || echo "No changes to commit"
          git push

      - name: Add comment with preview URL
        if: success()
        uses: actions/github-script@v7
        with:
          script: |
            const prNumber = parseInt('${{ steps.pr.outputs.number }}', 10);
            const previewUrl = `https://${{ github.repository_owner }}.github.io/${{ github.event.repository.name }}/pr-${prNumber}/`;
            const body = `🚀 **Preview deployed!**\n\n📱 Preview URL: ${previewUrl}\n\n_This preview was automatically deployed from commit ${{ steps.pr.outputs.sha }}_`;
            
            // Check if a comment already exists
            const comments = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: prNumber
            });
            
            const existingComment = comments.data.find(c => 
              c.user.login === 'github-actions[bot]' && 
              c.body.includes('Preview deployed!')
            );
            
            if (existingComment) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: existingComment.id,
                body: body
              });
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: prNumber,
                body: body
              });
            }
```

> **Note**: This workflow requires a `gh-pages` branch to exist for storing PR previews. If you prefer to use the default GitHub Pages Actions deployment approach (using `actions/upload-pages-artifact` and `actions/deploy-pages`), you would need to implement a custom solution that downloads the existing pages artifact, adds the PR preview content, and re-uploads the combined artifact. The `gh-pages` branch approach shown here is simpler and allows PR previews to coexist with the production deployment.

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

## Google Analytics Configuration

The `index.html` file includes a Google Analytics gtag snippet with a placeholder `GA_MEASUREMENT_ID`. To enable analytics tracking:

1. **Create a Google Analytics 4 property** at [analytics.google.com](https://analytics.google.com)
2. **Get your Measurement ID** (format: `G-XXXXXXXXXX`)
3. **Replace the placeholder** in `index.html`:
   ```html
   <!-- Before -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
   <script>
     gtag('config', 'GA_MEASUREMENT_ID');
   </script>
   
   <!-- After -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
   <script>
     gtag('config', 'G-XXXXXXXXXX');
   </script>
   ```

### Alternative: Build-Time Configuration

For more flexible configuration (e.g., different IDs for development/production), you can use a Vite plugin or environment variable substitution during the build process.

## Summary

| Feature | Production | PR Preview |
|---------|------------|------------|
| Trigger | Automatic (push to main) | Automatic (all PRs) or manual (workflow dispatch) |
| URL | Root (`/`) | Sub-path (`/pr-###/`) |
| Workflow | `deploy.yml` | `deploy-pr-preview.yml` |
| Base Path | `./` | `/Ashardalon/pr-###/` |
