#!/usr/bin/env python3
"""
add-issue-dependencies.py

This script adds dependency information to GitHub issues based on the
analysis in issue-dependencies.json. It adds a comment to each issue
listing its blockers (dependencies).

Prerequisites:
  - Python 3.6+
  - A GitHub personal access token with repo scope
  - Set GITHUB_TOKEN environment variable or pass via --token

Usage:
  export GITHUB_TOKEN=your_token_here
  ./scripts/add-issue-dependencies.py [--dry-run]

  OR

  ./scripts/add-issue-dependencies.py --token your_token_here [--dry-run]

Options:
  --dry-run    Show what would be updated without actually updating issues
  --token      GitHub personal access token (alternatively use GITHUB_TOKEN env var)
"""

import argparse
import json
import os
import sys
from typing import Dict, List, Any
import urllib.request
import urllib.error

REPO_OWNER = "egirard"
REPO_NAME = "Ashardalon"
DEPENDENCIES_FILE = "issue-dependencies.json"


def load_dependencies() -> Dict[str, Any]:
    """Load dependency information from JSON file."""
    try:
        with open(DEPENDENCIES_FILE, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: {DEPENDENCIES_FILE} not found.")
        print("Please run this script from the repository root.")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {DEPENDENCIES_FILE}: {e}")
        sys.exit(1)


def check_existing_comment(issue_number: int, token: str) -> bool:
    """Check if issue already has a dependency comment."""
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/issues/{issue_number}/comments"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "issue-dependencies-script"
    }
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            comments = json.loads(response.read().decode())
            
        for comment in comments:
            if "## Dependencies" in comment.get("body", ""):
                return True
        return False
    except urllib.error.HTTPError as e:
        print(f"  ⚠️  Warning: Could not check existing comments: {e}")
        return False


def add_comment_to_issue(issue_number: int, comment_body: str, token: str, dry_run: bool = False) -> bool:
    """Add a comment to a GitHub issue."""
    if dry_run:
        print(f"  [DRY-RUN] Would add comment to issue #{issue_number}:")
        print("  " + "="*60)
        for line in comment_body.split('\n'):
            print(f"  {line}")
        print("  " + "="*60)
        return True
    
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/issues/{issue_number}/comments"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "User-Agent": "issue-dependencies-script"
    }
    
    data = json.dumps({"body": comment_body}).encode('utf-8')
    
    try:
        req = urllib.request.Request(url, data=data, headers=headers, method='POST')
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            print(f"  ✓ Added dependency comment to issue #{issue_number}")
            print(f"    Comment URL: {result.get('html_url', 'N/A')}")
            return True
    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else "Unknown error"
        print(f"  ✗ Failed to add comment to issue #{issue_number}")
        print(f"    HTTP {e.code}: {e.reason}")
        print(f"    Details: {error_body}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Add dependency information to GitHub issues"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be updated without making changes"
    )
    parser.add_argument(
        "--token",
        help="GitHub personal access token (or use GITHUB_TOKEN env var)"
    )
    
    args = parser.parse_args()
    
    # Get GitHub token
    token = args.token or os.environ.get("GITHUB_TOKEN")
    if not token and not args.dry_run:
        print("Error: GitHub token required.")
        print("Either set GITHUB_TOKEN environment variable or use --token option.")
        print("\nTo create a token:")
        print("  1. Go to https://github.com/settings/tokens")
        print("  2. Create a new token with 'repo' scope")
        print("  3. Export it: export GITHUB_TOKEN=your_token_here")
        sys.exit(1)
    
    print("=" * 70)
    print("  GitHub Issue Dependencies Updater")
    print("=" * 70)
    print()
    
    if args.dry_run:
        print("Running in DRY-RUN mode (no changes will be made)")
        print()
    
    # Load dependencies
    print(f"Loading dependencies from {DEPENDENCIES_FILE}...")
    data = load_dependencies()
    dependencies = data.get("dependencies", {})
    comments = data.get("dependency_comments", {})
    
    print(f"Found {len(comments)} issues with dependencies to add")
    print()
    
    # Process each issue
    success_count = 0
    skip_count = 0
    error_count = 0
    
    for issue_num_str, comment_body in comments.items():
        issue_number = int(issue_num_str)
        dep_info = dependencies.get(issue_num_str, {})
        title = dep_info.get("title", "Unknown")
        blocked_by = dep_info.get("blocked_by", [])
        
        print(f"Issue #{issue_number}: {title}")
        print(f"  Blocked by: {', '.join(f'#{num}' for num in blocked_by)}")
        
        # Check if already has dependency comment
        if not args.dry_run and check_existing_comment(issue_number, token):
            print(f"  ⚠️  Already has a Dependencies section. Skipping to avoid duplicates.")
            skip_count += 1
            print()
            continue
        
        # Add comment
        if add_comment_to_issue(issue_number, comment_body, token or "", args.dry_run):
            success_count += 1
        else:
            error_count += 1
        
        print()
    
    # Summary
    print("=" * 70)
    if args.dry_run:
        print("  Dry run complete!")
        print("  Remove --dry-run to actually add dependencies.")
    else:
        print("  Summary:")
        print(f"    ✓ Successfully added: {success_count}")
        print(f"    ⚠️  Skipped (existing): {skip_count}")
        print(f"    ✗ Failed: {error_count}")
    print("=" * 70)
    print()
    print("Next steps:")
    print("  1. Review the dependency comments on each issue")
    print("  2. Check ISSUE_DEPENDENCIES.md for the full analysis")
    print("  3. Consider the recommended work order in the documentation")


if __name__ == "__main__":
    main()
