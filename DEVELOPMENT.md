# Development Environment

This document outlines the development environment setup for the Wrath of Ashardalon project, designed to help developers (including AI coding agents like GitHub Copilot) understand what tools and configurations are available upon startup.

## Overview

This project uses a **Nix-based development environment** for reproducible builds and consistent tooling across different machines and CI environments. The environment is defined in `flake.nix` and automatically activated via `direnv`.

## Environment Components

### Nix Flake (`flake.nix`)

The Nix flake provides a declarative development environment that includes:

- **Bun** - A fast JavaScript runtime, bundler, transpiler, and package manager
  - Alternative to Node.js with improved performance
  - Can run JavaScript/TypeScript directly
  - Built-in test runner and package manager

### direnv Integration (`.envrc`)

The `.envrc` file contains `use flake`, which tells direnv to automatically activate the Nix development shell when entering the project directory.

## Available Tools

When the development environment is loaded, you have access to:

| Tool | Purpose | Usage |
|------|---------|-------|
| `bun` | JavaScript/TypeScript runtime | `bun run <script>`, `bun install`, `bun test` |

### Pre-installed on GitHub Runners

When running in GitHub Actions (via Copilot or CI), these tools are also available:

- **Node.js** and **npm** - JavaScript ecosystem
- **Python 3** and **pip** - Python ecosystem
- **Go** - Go programming language
- **Git** - Version control
- **Docker** - Container runtime

## Getting Started

### Prerequisites

1. **Nix Package Manager** - Install from [nixos.org](https://nixos.org/download.html)
   ```bash
   # Linux/macOS
   sh <(curl -L https://nixos.org/nix/install)
   ```

2. **Enable Flakes** - Add to `~/.config/nix/nix.conf`:
   ```
   experimental-features = nix-command flakes
   ```

3. **direnv** (recommended) - Install and hook into your shell:
   ```bash
   # Install via nix
   nix profile install nixpkgs#direnv
   
   # Add to your shell (e.g., ~/.bashrc or ~/.zshrc)
   eval "$(direnv hook bash)"  # or zsh
   ```

### Activating the Environment

#### With direnv (recommended)

```bash
# Navigate to the project directory
cd /path/to/Ashardalon

# Allow direnv (first time only)
direnv allow

# Environment is now active! You'll see:
# "Bun development environment loaded"
# "Bun version: x.x.x"
```

#### Without direnv

```bash
# Enter the development shell manually
nix develop

# Or run a single command
nix develop -c bun --version
```

## GitHub Copilot Integration

This project includes `.github/workflows/copilot-setup-steps.yml` which automatically:

1. Checks out the repository
2. Installs Nix with flakes enabled
3. Installs and configures direnv
4. Pre-authorizes the `.envrc` file
5. Makes all development tools available to Copilot's coding agent

### For Copilot

When working on this repository, you have:

- **Bun runtime** available via the Nix flake for JavaScript/TypeScript tasks
- **direnv** for automatic environment activation
- **All GitHub runner pre-installed tools** (Node.js, Python, Go, etc.)

## Adding More Tools

To add additional tools to the development environment, edit `flake.nix`:

```nix
buildInputs = [
  pkgs.bun
  # Add more packages here, e.g.:
  # pkgs.nodejs
  # pkgs.python3
  # pkgs.ripgrep
];
```

Then run:
```bash
# Update the lock file
nix flake update

# Re-enter the shell
direnv reload  # or exit and re-enter the directory
```

## File Structure

```
Ashardalon/
├── .envrc                    # direnv configuration (use flake)
├── .github/
│   ├── copilot-instructions.md      # Instructions for GitHub Copilot
│   └── workflows/
│       └── copilot-setup-steps.yml  # Copilot environment setup
├── flake.nix                 # Nix flake (defines dev environment)
├── flake.lock                # Locked dependencies (auto-generated)
├── DEVELOPMENT.md            # This file
├── E2E_TEST_GUIDELINES.md    # E2E testing guidelines
├── README.md                 # Project overview
├── CONTRIBUTING.md           # Contribution guidelines
├── VISION.md                 # Project vision and roadmap
├── assets/                   # Game assets (images, etc.)
└── tests/
    ├── e2e/                  # End-to-end tests (Playwright)
    └── unit/                 # Unit tests
```

## Testing

### E2E Tests

This project uses Playwright for E2E testing. See [E2E_TEST_GUIDELINES.md](E2E_TEST_GUIDELINES.md) for detailed guidelines on writing E2E tests that:

- Are numbered (001, 002, etc.)
- Tell user stories through screenshot sequences
- Are human-verifiable via a README.md with linked screenshots

```bash
# Run E2E tests
bun run test:e2e

# Run a specific E2E test
bun run test:e2e -- --grep "001"
```

### Unit Tests

```bash
# Run unit tests
bun run test:unit

# Run with coverage
bun run test:unit:coverage
```

## Troubleshooting

### direnv not loading

```bash
# Check if .envrc is allowed
direnv status

# Re-allow if needed
direnv allow
```

### Nix flake not working

```bash
# Check if flakes are enabled
nix --version
nix flake info

# Update flake lock
nix flake update
```

### Bun not found

```bash
# Ensure you're in the nix shell
nix develop

# Or use direnv
direnv allow && eval "$(direnv export bash)"
```
