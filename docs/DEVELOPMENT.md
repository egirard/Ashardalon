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
5. **Installs Bun runtime** via the oven-sh/setup-bun action
6. **Installs project dependencies** (including Playwright) with `bun install`
7. **Installs Playwright browsers** with `bunx playwright install --with-deps chromium`
8. Makes all development tools available to Copilot's coding agent

### For Copilot

When working on this repository, you have:

- **Bun runtime** available directly via the setup-bun action
- **All project dependencies** installed (from package.json)
- **Playwright with Chromium browser** ready for E2E testing
- **direnv** for automatic environment activation
- **All GitHub runner pre-installed tools** (Node.js, Python, Go, etc.)

You can run E2E tests with:
```bash
bun run test:e2e
```

### Why Both Nix and setup-bun?

The repository uses **Nix flakes** for local development (reproducible environments), but GitHub Copilot's environment uses **setup-bun** action for faster setup times. Both approaches provide Bun, but:
- **Local development**: Use Nix flake (via `nix develop` or `direnv`)
- **GitHub Copilot environment**: Uses setup-bun action automatically

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
├── docs/                      # Documentation files
│   ├── DEVELOPMENT.md         # Development environment guide
│   ├── E2E_TEST_GUIDELINES.md # E2E testing guidelines
│   ├── VISION.md              # Project vision and roadmap
│   ├── design.md              # Complete game design and rules
│   ├── gameplay-ux.md         # Game board screen design
│   ├── lobby-ux.md            # Character selection screen design
│   └── ... (other documentation)
├── flake.nix                  # Nix flake (defines dev environment)
├── flake.lock                 # Locked dependencies (auto-generated)
├── README.md                  # Project overview
├── CONTRIBUTING.md            # Contribution guidelines
├── LICENSE                    # MIT License
├── assets/                    # Game assets (images, etc.)
└── tests/
    ├── e2e/                   # End-to-end tests (Playwright)
    └── unit/                  # Unit tests
```

## Development Server

The project uses Vite as the development server, configured to run on **port 3000**.

### Running the Dev Server

```bash
# Start the development server
bun run dev

# Server will be available at http://localhost:3000
```

### Port Configuration

The development server port is explicitly configured in `vite.config.ts`:

```typescript
server: {
  port: 3000,
  strictPort: true, // Fail if port 3000 is not available
}
```

**Important**: The `strictPort: true` setting ensures that if port 3000 is already in use, Vite will fail to start instead of silently switching to a different port (like the default 5173). This prevents port mismatch issues with E2E tests.

### E2E Test Port Configuration

Playwright tests are configured to connect to the same port (3000) in `playwright.config.ts`:

```typescript
use: {
  baseURL: 'http://localhost:3000',
  // ...
},
webServer: {
  command: 'bun run dev',
  url: 'http://localhost:3000',
  timeout: 120 * 1000, // 120 seconds to start the server
  // ...
}
```

This ensures consistency between the development server and E2E tests, preventing connection errors.

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
