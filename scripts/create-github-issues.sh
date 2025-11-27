#!/usr/bin/env bash
#
# create-github-issues.sh
#
# This script creates GitHub issues from the markdown files in .github/ISSUES/
# It reads each issue file, extracts the title and labels, and uses the
# GitHub CLI (gh) to create the issues.
#
# Prerequisites:
#   - GitHub CLI (gh) must be installed and authenticated
#   - Run from the repository root directory
#
# Usage:
#   ./scripts/create-github-issues.sh [--dry-run]
#
# Options:
#   --dry-run    Show what would be created without actually creating issues
#

set -euo pipefail

# Configuration
ISSUES_DIR=".github/ISSUES"
DRY_RUN=false

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

# Check if we're in the repository root
if [[ ! -d "$ISSUES_DIR" ]]; then
    echo "Error: $ISSUES_DIR directory not found."
    echo "Please run this script from the repository root."
    exit 1
fi

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

# Function to extract title from issue file
extract_title() {
    local file="$1"
    # Extract the first H1 heading and remove "# Issue: " prefix
    grep -m1 '^# Issue:' "$file" | sed 's/^# Issue: //'
}

# Function to extract labels from issue file
extract_labels() {
    local file="$1"
    # Extract 2 lines after "## Labels" (there's an empty line), and clean up the backticks
    grep -A2 '^## Labels' "$file" | tail -1 | tr -d '`' | tr -d ' '
}

# Create labels first (if they don't exist)
create_labels() {
    echo "Ensuring labels exist..."
    
    # Define labels with colors and descriptions
    declare -A LABELS=(
        ["user-story"]="#0E8A16|User-visible feature"
        ["phase-1"]="#5319E7|Foundation phase"
        ["phase-2"]="#5319E7|Exploration phase"
        ["phase-3"]="#5319E7|Combat phase"
        ["phase-4"]="#5319E7|Resources phase"
        ["phase-5"]="#5319E7|Game flow phase"
        ["ui"]="#FBCA04|User interface work"
        ["gameplay"]="#B60205|Game mechanics"
        ["state-management"]="#1D76DB|State/store work"
        ["game-state"]="#1D76DB|Game state management"
        ["navigation"]="#D4C5F9|Screen navigation"
        ["movement"]="#F9D0C4|Hero movement"
        ["exploration"]="#C5DEF5|Tile exploration"
        ["monsters"]="#E99695|Monster system"
        ["combat"]="#B60205|Combat system"
        ["monster-ai"]="#BFDADC|Monster behavior"
        ["xp"]="#FEF2C0|Experience points"
        ["treasure"]="#D4AF37|Treasure system"
        ["encounters"]="#D93F0B|Encounter cards"
        ["healing"]="#0E8A16|Healing mechanics"
        ["leveling"]="#9B59B6|Level up system"
        ["turn-management"]="#006B75|Turn/phase system"
        ["game-end"]="#B60205|Win/lose conditions"
        ["adventure"]="#0052CC|Adventure system"
        ["setup"]="#C2E0C6|Initial setup"
    )
    
    for label in "${!LABELS[@]}"; do
        IFS='|' read -r color description <<< "${LABELS[$label]}"
        if [[ "$DRY_RUN" == true ]]; then
            echo "  [DRY-RUN] Would create label: $label (color: $color)"
        else
            # Try to create label, ignore if it already exists
            gh label create "$label" --color "${color#\#}" --description "$description" 2>/dev/null || true
        fi
    done
    
    echo ""
}

# Process issue files
process_issues() {
    local files=("$ISSUES_DIR"/[0-9][0-9][0-9]-*.md)
    local count=0
    local total=${#files[@]}
    
    echo "Found $total issue files to process."
    echo ""
    
    for file in "${files[@]}"; do
        ((count++))
        
        local filename
        filename=$(basename "$file")
        
        local title
        title=$(extract_title "$file")
        
        local labels
        labels=$(extract_labels "$file")
        
        echo "[$count/$total] Processing: $filename"
        echo "  Title: $title"
        echo "  Labels: $labels"
        
        if [[ "$DRY_RUN" == true ]]; then
            echo "  [DRY-RUN] Would create issue with:"
            echo "    gh issue create --title \"$title\" --body-file \"$file\" --label \"$labels\""
        else
            # Create the issue
            local issue_url
            issue_url=$(gh issue create --title "$title" --body-file "$file" --label "$labels" 2>&1)
            echo "  Created: $issue_url"
        fi
        
        echo ""
    done
    
    echo "Done! Processed $count issues."
}

# Main execution
echo "=========================================="
echo "  GitHub Issues Creator"
echo "=========================================="
echo ""

if [[ "$DRY_RUN" == true ]]; then
    echo "Running in DRY-RUN mode (no changes will be made)"
    echo ""
fi

create_labels
process_issues

echo ""
echo "=========================================="
if [[ "$DRY_RUN" == true ]]; then
    echo "  Dry run complete!"
    echo "  Remove --dry-run to create issues."
else
    echo "  All issues created successfully!"
fi
echo "=========================================="
