# Scripts Directory

This directory contains utility scripts for managing the repository.

## Issue Management Scripts

### add-issue-dependencies.sh

Bash script to add dependency information to GitHub issues using the GitHub CLI.

**Prerequisites:**
- GitHub CLI (`gh`) installed and authenticated
- Run from repository root

**Usage:**
```bash
# Dry run to see what would be changed
./scripts/add-issue-dependencies.sh --dry-run

# Actually add dependencies
./scripts/add-issue-dependencies.sh
```

### add-issue-dependencies.py

Python script to add dependency information to GitHub issues using the GitHub REST API.

**Prerequisites:**
- Python 3.6+
- GitHub personal access token with `repo` scope

**Usage:**
```bash
# Set your GitHub token
export GITHUB_TOKEN=your_token_here

# Dry run to see what would be changed
./scripts/add-issue-dependencies.py --dry-run

# Actually add dependencies
./scripts/add-issue-dependencies.py

# Or pass token directly
./scripts/add-issue-dependencies.py --token your_token_here
```

**To create a GitHub token:**
1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name (e.g., "Issue Dependencies")
4. Select scope: `repo` (Full control of private repositories)
5. Click "Generate token"
6. Copy the token (you won't be able to see it again!)

### create-github-issues.sh

Bash script to create GitHub issues from markdown files.

**Usage:**
```bash
# Dry run
./scripts/create-github-issues.sh --dry-run

# Create issues
./scripts/create-github-issues.sh
```

## Supporting Files

### issue-dependencies.json

Machine-readable JSON file containing:
- All issue dependencies (blocked_by, blocking relationships)
- Recommended work order organized by phases
- Pre-formatted dependency comments for each issue

This file is used by the dependency scripts and can also be used by other automation tools.

### ISSUE_DEPENDENCIES.md

Human-readable documentation of issue dependencies, including:
- Visual dependency graph
- Detailed dependency analysis
- Recommended work order
- Table of blocker relationships

## Workflow

To add dependencies to issues:

1. Review the analysis in `ISSUE_DEPENDENCIES.md`
2. Run one of the dependency scripts in dry-run mode to preview changes
3. Run the script without `--dry-run` to apply changes
4. Verify the dependency comments were added to issues on GitHub

The scripts are idempotent - they won't add duplicate dependency comments if run multiple times.
