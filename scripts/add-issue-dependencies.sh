#!/usr/bin/env bash
#
# add-issue-dependencies.sh
#
# This script adds dependency information to GitHub issues based on the
# analysis in ISSUE_DEPENDENCIES.md. It updates issue descriptions to include
# a "Blocked By" section that lists the issues that must be completed first.
#
# Prerequisites:
#   - GitHub CLI (gh) must be installed and authenticated
#   - Run from the repository root directory
#
# Usage:
#   ./scripts/add-issue-dependencies.sh [--dry-run]
#
# Options:
#   --dry-run    Show what would be updated without actually updating issues
#

set -euo pipefail

# Configuration
DRY_RUN=false
REPO="egirard/Ashardalon"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--dry-run]"
            exit 1
            ;;
    esac
done

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed."
    echo "Please install it from: https://cli.github.com/"
    exit 1
fi

# Check if gh is authenticated
if ! gh auth status &> /dev/null; then
    echo "Error: GitHub CLI is not authenticated."
    echo "Please run: gh auth login"
    exit 1
fi

# Define dependencies
# Format: "issue_number:blocker1,blocker2,..."
declare -A DEPENDENCIES=(
    ["34"]="102,107"
    ["125"]="107,126,127"
    ["126"]="103,107"
    ["127"]="124"
)

# Function to create dependency comment
create_dependency_comment() {
    local issue_number=$1
    local blockers=$2
    
    local comment="## Dependencies

This issue is blocked by the following issues and should not be started until they are completed:

"
    
    IFS=',' read -ra BLOCKER_ARRAY <<< "$blockers"
    for blocker in "${BLOCKER_ARRAY[@]}"; do
        comment+="- [ ] #${blocker}
"
    done
    
    comment+="

---
*This dependency information was added automatically based on issue analysis. See [ISSUE_DEPENDENCIES.md](https://github.com/${REPO}/blob/main/ISSUE_DEPENDENCIES.md) for the full dependency graph.*"
    
    echo "$comment"
}

# Function to add dependency comment to issue
add_dependency_to_issue() {
    local issue_number=$1
    local blockers=$2
    
    echo "Processing issue #${issue_number}..."
    
    # Get current issue body to check if dependencies already added
    local current_body
    current_body=$(gh issue view "$issue_number" --json body --jq .body 2>/dev/null || echo "")
    
    # Check if dependency section already exists
    if echo "$current_body" | grep -q "## Dependencies"; then
        echo "  ⚠️  Issue #${issue_number} already has a Dependencies section. Skipping to avoid duplicates."
        return
    fi
    
    # Create the dependency comment
    local comment
    comment=$(create_dependency_comment "$issue_number" "$blockers")
    
    if [[ "$DRY_RUN" == true ]]; then
        echo "  [DRY-RUN] Would add comment to issue #${issue_number}:"
        echo "----------------------------------------"
        echo "$comment"
        echo "----------------------------------------"
    else
        # Add comment to issue
        if gh issue comment "$issue_number" --body "$comment" 2>/dev/null; then
            echo "  ✓ Added dependency comment to issue #${issue_number}"
        else
            echo "  ✗ Failed to add comment to issue #${issue_number}"
            return 1
        fi
    fi
    
    echo ""
}

# Main execution
echo "=========================================="
echo "  GitHub Issue Dependencies Updater"
echo "=========================================="
echo ""

if [[ "$DRY_RUN" == true ]]; then
    echo "Running in DRY-RUN mode (no changes will be made)"
    echo ""
fi

echo "Analyzing dependencies from ISSUE_DEPENDENCIES.md..."
echo ""

# Process each issue with dependencies
local_count=0
local_total=${#DEPENDENCIES[@]}

for issue_number in "${!DEPENDENCIES[@]}"; do
    ((local_count++))
    blockers="${DEPENDENCIES[$issue_number]}"
    
    echo "[$local_count/$local_total] Issue #${issue_number} blocked by: #${blockers//,/, #}"
    add_dependency_to_issue "$issue_number" "$blockers"
done

echo ""
echo "=========================================="
if [[ "$DRY_RUN" == true ]]; then
    echo "  Dry run complete!"
    echo "  Remove --dry-run to add dependencies."
else
    echo "  All dependencies added successfully!"
fi
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Review the dependency comments on each issue"
echo "  2. Check ISSUE_DEPENDENCIES.md for the full analysis"
echo "  3. Consider the recommended work order in the documentation"
