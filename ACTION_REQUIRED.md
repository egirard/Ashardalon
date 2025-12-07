# Action Required: Add Issue Dependencies

This document outlines the manual steps needed to complete the issue dependency task.

## Summary

A comprehensive analysis of all open issues has been completed, identifying 4 key dependency relationships that should be added as blockers to help prioritize work.

## Files Created

1. **ISSUE_DEPENDENCIES.md** - Human-readable documentation with full dependency graph and analysis
2. **issue-dependencies.json** - Machine-readable dependency data
3. **scripts/add-issue-dependencies.sh** - Bash script using GitHub CLI
4. **scripts/add-issue-dependencies.py** - Python script using GitHub REST API
5. **scripts/README.md** - Documentation for the scripts

## Dependencies Identified

| Issue | Title | Blocked By | Priority |
|-------|-------|------------|----------|
| #34 | Win Adventure | #102, #107 | High - User feature |
| #125 | Integration of Encounter Mechanics | #107, #126, #127 | Critical - Integration |
| #126 | Special Encounter Mechanics | #103, #107 | High - Core gameplay |
| #127 | Traps and Hazards | #124 | High - Core gameplay |

## How to Add Dependencies

### Option 1: Use the Python Script (Recommended)

```bash
# 1. Create a GitHub Personal Access Token
#    Go to: https://github.com/settings/tokens
#    Scope needed: "repo" (Full control of private repositories)

# 2. Export the token
export GITHUB_TOKEN=your_token_here

# 3. Run the script
cd /path/to/Ashardalon
python3 scripts/add-issue-dependencies.py

# The script will:
# - Check if dependencies already exist (to avoid duplicates)
# - Add a comment to each issue with its dependencies
# - Provide a summary of what was done
```

### Option 2: Use the Bash Script

```bash
# 1. Authenticate with GitHub CLI
gh auth login

# 2. Run the script
cd /path/to/Ashardalon
./scripts/add-issue-dependencies.sh

# The script will add the same dependency comments
```

### Option 3: Manual Addition

If you prefer to add dependencies manually, copy the following comments to each issue:

#### Issue #34 - Win Adventure

```markdown
## Dependencies

This issue is blocked by the following issues and should not be started until they are completed:

- [ ] #102 - Fully implement player cards (provides player/hero state tracking)
- [ ] #107 - Track remaining work to fully implement encounter cards (provides encounter system for villain spawning)

See [ISSUE_DEPENDENCIES.md](https://github.com/egirard/Ashardalon/blob/main/ISSUE_DEPENDENCIES.md) for the full dependency analysis.
```

#### Issue #125 - Integration of Encounter Mechanics

```markdown
## Dependencies

This issue is blocked by the following issues and should not be started until they are completed:

- [ ] #107 - Track remaining work to fully implement encounter cards (meta-issue for tracking)
- [ ] #126 - Implement Tile, Monster Deck Manipulation, and Special Encounter Mechanics
- [ ] #127 - Implement Trap and Hazard Systems for Encounter Cards

See [ISSUE_DEPENDENCIES.md](https://github.com/egirard/Ashardalon/blob/main/ISSUE_DEPENDENCIES.md) for the full dependency analysis.
```

#### Issue #126 - Special Encounter Mechanics

```markdown
## Dependencies

This issue is blocked by the following issues and should not be started until they are completed:

- [ ] #103 - Fully implement treasure cards (special encounters need treasure placement)
- [ ] #107 - Track remaining work to fully implement encounter cards (subset of encounter functionality)

See [ISSUE_DEPENDENCIES.md](https://github.com/egirard/Ashardalon/blob/main/ISSUE_DEPENDENCIES.md) for the full dependency analysis.
```

#### Issue #127 - Traps and Hazards

```markdown
## Dependencies

This issue is blocked by the following issues and should not be started until they are completed:

- [ ] #124 - Implement board tokens for power cards that create persistent entities (needs board token system for persistent markers)

See [ISSUE_DEPENDENCIES.md](https://github.com/egirard/Ashardalon/blob/main/ISSUE_DEPENDENCIES.md) for the full dependency analysis.
```

## Recommended Work Order

After adding dependencies, consider this work order:

### Phase 1: Foundation (Can be done in parallel)
- #102 - Player Cards
- #103 - Treasure Cards
- #122 - Status/Conditions for Power Cards
- #123 - Conditional Effects for Power Cards
- #124 - Board Tokens for Power Cards

### Phase 2: Encounter System
- #107 - Encounter Cards (meta-issue, ongoing)
- #126 - Special Encounters (after #103, #107)
- #127 - Traps/Hazards (after #124)

### Phase 3: Integration
- #125 - Integration (after #107, #126, #127)

### Phase 4: Features
- #34 - Win Adventure (after #102, #107)

## Benefits

Adding these dependencies will:

1. **Prevent wasted effort** - Developers won't start work that depends on incomplete features
2. **Improve planning** - Clear understanding of what can be worked on in parallel
3. **Better prioritization** - Foundation issues naturally get higher priority
4. **Clearer progress tracking** - Easy to see what's blocking completion

## Verification

After adding dependencies, verify:

1. Each of the 4 issues (#34, #125, #126, #127) has a "Dependencies" comment
2. The dependencies match those listed above
3. No duplicate dependency comments were created
4. Other team members understand the dependency structure

## Questions?

If you have questions about:
- Why a specific dependency exists: See ISSUE_DEPENDENCIES.md for detailed reasoning
- The overall structure: See the dependency graph in ISSUE_DEPENDENCIES.md
- The implementation: See scripts/README.md for script documentation
