#!/usr/bin/env python3
"""
Tile image validation and metadata repair script for Wrath of Ashardalon.

Inspects tile images to detect common data failures:
  - Wall vs exit-bar confusion (metadata says 'open' but image shows solid wall)
  - Scorch mark placement validation
  - Edge count mismatch with tile name convention

Generates a machine-readable JSON report and human-readable summary.
Supports --check mode (no changes; non-zero exit if problems found) and
--fix mode (apply deterministic metadata fixes to tile definitions).

Dependencies:
  pip install Pillow numpy

Usage:
  python tools/validate_tiles.py --check
  python tools/validate_tiles.py --fix
  python tools/validate_tiles.py --check --output report.json
  python tools/validate_tiles.py --check --assets-dir public/assets --source-file src/store/types.ts
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Optional

try:
    import numpy as np
    from PIL import Image
except ImportError:
    print(
        "ERROR: Required packages not found. Install with: pip install Pillow numpy",
        file=sys.stderr,
    )
    sys.exit(2)

# ---------------------------------------------------------------------------
# Configuration defaults
# ---------------------------------------------------------------------------
DEFAULT_ASSETS_DIR = "public/assets"
DEFAULT_SOURCE_FILE = "src/store/types.ts"

# Image analysis thresholds (tuned against the known tile dataset)
EDGE_DEPTH_PX = 60          # How many pixels deep to sample from each edge
CENTER_FRAC = 0.30          # Fraction of edge length used as "center" sample
CORNER_FRAC = 0.15          # Fraction of edge length used as "corner" sample
# Conservative thresholds – only flag HIGH-CONFIDENCE mismatches to avoid
# false positives from image noise / lighting variations in scanned tiles.
WALL_RATIO_THRESHOLD = 0.67 # Center/corner ratio below this → likely wall
OPEN_RATIO_THRESHOLD = 0.85 # Center/corner ratio above this → likely open

# Tile grid constants (must match NORMAL_TILE_SIZE in src/store/movement.ts)
TILE_GRID_SIZE = 4           # Each tile is 4×4 cells (0-based, 0..3)

# For scorch-mark image analysis
SCORCH_DETECTION_RADIUS = 30   # Pixel radius around scorch position to inspect
SCORCH_DARK_THRESHOLD = 60     # Mean brightness below this → dark/burned region


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------
class TileDefinition:
    """Mirrors one entry in TILE_DEFINITIONS from src/store/types.ts."""

    def __init__(
        self,
        tile_type: str,
        image_path: str,
        default_edges: dict,
        is_black_tile: bool,
        scorch_mark_position: dict,
    ):
        self.tile_type = tile_type
        self.image_path = image_path
        self.default_edges = default_edges  # {north, south, east, west} → 'open'|'wall'
        self.is_black_tile = is_black_tile
        self.scorch_mark_position = scorch_mark_position  # {x, y}

    def __repr__(self):
        return f"TileDefinition({self.tile_type})"


# ---------------------------------------------------------------------------
# Parsing src/store/types.ts
# ---------------------------------------------------------------------------
_TILE_DEF_RE = re.compile(
    r"\{\s*"
    r"tileType:\s*'([^']+)',\s*"
    r"imagePath:\s*'([^']+)',\s*"
    r"defaultEdges:\s*\{([^}]+)\},\s*"
    r"isBlackTile:\s*(true|false),\s*"
    r"scorchMarkPosition:\s*\{\s*x:\s*(\d+),\s*y:\s*(\d+)\s*\}\s*"
    r"\}",
    re.MULTILINE,
)

_EDGE_RE = re.compile(r"(\w+):\s*'(\w+)'")


def parse_tile_definitions(source_path: str) -> list:
    """Parse TILE_DEFINITIONS from the TypeScript source file."""
    with open(source_path, encoding="utf-8") as fh:
        source = fh.read()

    # Find the TILE_DEFINITIONS block
    start = source.find("export const TILE_DEFINITIONS")
    if start == -1:
        raise ValueError(f"Could not find TILE_DEFINITIONS in {source_path}")
    end = source.find("];", start)
    block = source[start:end]

    definitions = []
    for m in _TILE_DEF_RE.finditer(block):
        tile_type = m.group(1)
        image_path = m.group(2)
        edges_str = m.group(3)
        is_black = m.group(4) == "true"
        scorch_x = int(m.group(5))
        scorch_y = int(m.group(6))

        edges = {}
        for edge_match in _EDGE_RE.finditer(edges_str):
            edges[edge_match.group(1)] = edge_match.group(2)

        definitions.append(
            TileDefinition(
                tile_type=tile_type,
                image_path=image_path,
                default_edges=edges,
                is_black_tile=is_black,
                scorch_mark_position={"x": scorch_x, "y": scorch_y},
            )
        )

    return definitions


# ---------------------------------------------------------------------------
# Image analysis helpers
# ---------------------------------------------------------------------------
def _load_image_array(image_path: str) -> Optional[np.ndarray]:
    """Load an image as an RGBA numpy array, or return None if not found."""
    if not os.path.exists(image_path):
        return None
    img = Image.open(image_path).convert("RGBA")
    return np.array(img)


def _edge_opening_score(arr: np.ndarray, side: str) -> dict:
    """
    Analyse one edge of a tile image.

    Returns a dict with:
      center_brightness  – mean RGB brightness of the centre third of the edge
      corner_brightness  – mean RGB brightness of the corner sections
      ratio              – centre / corner ratio
      inferred_type      – 'open' | 'wall' | 'uncertain'
    """
    h, w = arr.shape[:2]
    center_half = int(min(h, w) * CENTER_FRAC / 2)
    corner_end = int(min(h, w) * CORNER_FRAC)
    mid_h, mid_w = h // 2, w // 2
    depth = min(EDGE_DEPTH_PX, min(h, w) // 4)

    if side == "north":
        strip = arr[:depth, :, :3].astype(float)
        center = strip[:, mid_w - center_half : mid_w + center_half, :]
        corners = np.concatenate([strip[:, :corner_end, :], strip[:, -corner_end:, :]])
    elif side == "south":
        strip = arr[-depth:, :, :3].astype(float)
        center = strip[:, mid_w - center_half : mid_w + center_half, :]
        corners = np.concatenate([strip[:, :corner_end, :], strip[:, -corner_end:, :]])
    elif side == "east":
        strip = arr[:, -depth:, :3].astype(float)
        center = strip[mid_h - center_half : mid_h + center_half, :, :]
        corners = np.concatenate(
            [strip[:corner_end, :, :], strip[-corner_end:, :, :]], axis=0
        )
    elif side == "west":
        strip = arr[:, :depth, :3].astype(float)
        center = strip[mid_h - center_half : mid_h + center_half, :, :]
        corners = np.concatenate(
            [strip[:corner_end, :, :], strip[-corner_end:, :, :]], axis=0
        )
    else:
        raise ValueError(f"Unknown side: {side}")

    center_bright = float(center.mean()) if center.size else 0.0
    corner_bright = float(corners.mean()) if corners.size else 1.0
    ratio = center_bright / corner_bright if corner_bright > 0 else 1.0

    if ratio < WALL_RATIO_THRESHOLD:
        inferred = "wall"
    elif ratio > OPEN_RATIO_THRESHOLD:
        inferred = "open"
    else:
        inferred = "uncertain"

    return {
        "center_brightness": round(center_bright, 1),
        "corner_brightness": round(corner_bright, 1),
        "ratio": round(ratio, 3),
        "inferred_type": inferred,
    }


def _detect_scorch_mark(arr: np.ndarray, scorch_pos: dict, tile_size: int = 632) -> dict:
    """
    Check the declared scorch mark position in the tile image.

    scorch_pos uses 0-based tile grid coordinates {x, y} where each tile is
    divided into a TILE_GRID_SIZE × TILE_GRID_SIZE logical grid.
    Returns brightness and a validity flag.
    """
    cell_w = tile_size // TILE_GRID_SIZE
    cell_h = tile_size // TILE_GRID_SIZE
    # Convert 0-based grid coords to pixel centre
    px_x = int((scorch_pos["x"] + 0.5) * cell_w)
    px_y = int((scorch_pos["y"] + 0.5) * cell_h)

    # Clamp to image bounds
    r = SCORCH_DETECTION_RADIUS
    y1 = max(0, px_y - r)
    y2 = min(arr.shape[0], px_y + r)
    x1 = max(0, px_x - r)
    x2 = min(arr.shape[1], px_x + r)

    region = arr[y1:y2, x1:x2, :3].astype(float)
    brightness = float(region.mean()) if region.size else 255.0

    return {
        "pixel_x": px_x,
        "pixel_y": px_y,
        "region_brightness": round(brightness, 1),
        "appears_dark": brightness < SCORCH_DARK_THRESHOLD,
    }


def _is_scorch_on_wall(scorch_pos: dict, edges: dict) -> tuple:
    """
    Check if the scorch mark position is on a wall cell.

    Mirrors the TypeScript isOnWallSquare() logic from movement.ts.
    Returns (is_on_wall, reason_string).
    """
    x = scorch_pos["x"]
    y = scorch_pos["y"]
    max_idx = TILE_GRID_SIZE - 1  # 3 for a 4×4 grid

    if edges.get("north") == "wall" and y == 0:
        return True, f"north edge is wall and scorch y={y} is at north row"
    if edges.get("south") == "wall" and y == max_idx:
        return True, f"south edge is wall and scorch y={y} is at south row"
    if edges.get("west") == "wall" and x == 0:
        return True, f"west edge is wall and scorch x={x} is at west column"
    if edges.get("east") == "wall" and x == max_idx:
        return True, f"east edge is wall and scorch x={x} is at east column"

    return False, ""


def _count_open_edges(edges: dict) -> int:
    return sum(1 for v in edges.values() if v == "open")


def _expected_open_count_from_name(tile_type: str) -> Optional[int]:
    """
    Extract the advertised exit count from the tile type name.
    e.g. 'tile-black-3exit-a' → 3
    """
    m = re.search(r"(\d+)exit", tile_type)
    return int(m.group(1)) if m else None


# ---------------------------------------------------------------------------
# Core validation logic
# ---------------------------------------------------------------------------
def validate_tile(tile_def: TileDefinition, assets_dir: str) -> dict:
    """
    Validate one tile: image analysis + metadata consistency checks.

    Returns a dict suitable for JSON serialisation.
    """
    abs_image_path = os.path.join(assets_dir, os.path.basename(tile_def.image_path))
    arr = _load_image_array(abs_image_path)

    issues = []
    edge_analysis = {}
    scorch_info = {}

    # --- Image-based analysis -----------------------------------------------
    if arr is None:
        issues.append({
            "severity": "error",
            "code": "IMAGE_NOT_FOUND",
            "message": f"Image file not found: {abs_image_path}",
        })
    else:
        tile_h, tile_w = arr.shape[:2]

        # Edge analysis (image-based, best-effort)
        for side in ("north", "south", "east", "west"):
            meta_type = tile_def.default_edges.get(side, "unknown")
            analysis = _edge_opening_score(arr, side)
            edge_analysis[side] = {**analysis, "metadata_type": meta_type}

            inferred = analysis["inferred_type"]
            # Only flag HIGH-CONFIDENCE mismatches (not 'uncertain')
            if inferred != "uncertain" and inferred != meta_type:
                issues.append({
                    "severity": "warning",
                    "code": "EDGE_MISMATCH",
                    "message": (
                        f"{side} edge: metadata='{meta_type}' but image "
                        f"analysis infers '{inferred}' "
                        f"(ratio={analysis['ratio']:.3f})"
                    ),
                    "side": side,
                    "metadata_type": meta_type,
                    "inferred_type": inferred,
                    "ratio": analysis["ratio"],
                })

        # Scorch mark image analysis (informational only)
        scorch_pos = tile_def.scorch_mark_position
        scorch_info = _detect_scorch_mark(arr, scorch_pos, tile_size=tile_w)

    # --- Metadata-only checks -----------------------------------------------
    scorch_pos = tile_def.scorch_mark_position

    # Check if scorch mark is placed on a wall cell
    on_wall, wall_reason = _is_scorch_on_wall(scorch_pos, tile_def.default_edges)
    if on_wall:
        issues.append({
            "severity": "warning",
            "code": "SCORCH_ON_WALL",
            "message": (
                f"Scorch mark at grid ({scorch_pos['x']},{scorch_pos['y']}) "
                f"is on a wall cell: {wall_reason}. "
                "Move to an adjacent accessible cell."
            ),
            "scorch_x": scorch_pos["x"],
            "scorch_y": scorch_pos["y"],
            "reason": wall_reason,
        })
    actual_open = _count_open_edges(tile_def.default_edges)
    expected_open = _expected_open_count_from_name(tile_def.tile_type)
    if expected_open is not None and actual_open != expected_open:
        issues.append({
            "severity": "info",
            "code": "EXIT_COUNT_MISMATCH",
            "message": (
                f"Tile name implies {expected_open} exits but metadata "
                f"defines {actual_open} open edges. The name may be "
                "historical and the metadata is the authoritative source."
            ),
            "name_exits": expected_open,
            "metadata_open_edges": actual_open,
        })

    return {
        "tile_type": tile_def.tile_type,
        "image_path": tile_def.image_path,
        "metadata_edges": tile_def.default_edges,
        "is_black_tile": tile_def.is_black_tile,
        "scorch_mark_position": tile_def.scorch_mark_position,
        "edge_analysis": edge_analysis,
        "scorch_analysis": scorch_info,
        "issues": issues,
        "has_errors": any(i["severity"] == "error" for i in issues),
        "has_warnings": any(i["severity"] == "warning" for i in issues),
    }


# ---------------------------------------------------------------------------
# Fix mode – apply deterministic metadata corrections to types.ts
# ---------------------------------------------------------------------------
def _find_valid_scorch_position(scorch_pos: dict, edges: dict) -> Optional[dict]:
    """
    Find the nearest valid (non-wall) scorch position.

    Searches adjacent cells in priority order: move inward from the wall edge.
    Returns a new {x, y} dict, or None if no simple fix is found.
    """
    max_idx = TILE_GRID_SIZE - 1
    x, y = scorch_pos["x"], scorch_pos["y"]

    # Build list of candidate adjustments
    candidates = []
    if edges.get("east") == "wall" and x == max_idx:
        candidates.append({"x": x - 1, "y": y})
    if edges.get("west") == "wall" and x == 0:
        candidates.append({"x": x + 1, "y": y})
    if edges.get("south") == "wall" and y == max_idx:
        candidates.append({"x": x, "y": y - 1})
    if edges.get("north") == "wall" and y == 0:
        candidates.append({"x": x, "y": y + 1})

    for cand in candidates:
        on_wall, _ = _is_scorch_on_wall(cand, edges)
        if not on_wall:
            return cand
    return None


def apply_fixes(tile_results: list, source_path: str, dry_run: bool = False) -> int:
    """
    Apply high-confidence deterministic fixes to src/store/types.ts.

    Currently fixes:
      SCORCH_ON_WALL  – moves scorchMarkPosition to the nearest valid cell
      EDGE_MISMATCH   – updates defaultEdges when image analysis is high-confidence

    Returns the number of fixes applied (or that would be applied in dry-run).
    """
    # Need full definitions to compute fixes
    try:
        tile_defs_map = {r["tile_type"]: r for r in tile_results}
    except Exception:
        return 0

    with open(source_path, encoding="utf-8") as fh:
        source = fh.read()

    modified = source
    applied = 0

    for result in tile_results:
        if result["has_errors"]:
            continue  # skip tiles with missing images

        tile_type = result["tile_type"]
        edges = result["metadata_edges"]

        for issue in result["issues"]:
            # --- Fix SCORCH_ON_WALL ------------------------------------------
            if issue["code"] == "SCORCH_ON_WALL":
                old_x = issue["scorch_x"]
                old_y = issue["scorch_y"]
                new_pos = _find_valid_scorch_position(
                    {"x": old_x, "y": old_y}, edges
                )
                if new_pos is None:
                    print(
                        f"  SKIP: {tile_type} scorch fix – no simple adjacent "
                        "position found"
                    )
                    continue

                # Replace scorchMarkPosition in the matching line
                lines = modified.splitlines(keepends=True)
                for i, line in enumerate(lines):
                    if f"tileType: '{tile_type}'" in line:
                        old_pat = f"scorchMarkPosition: {{ x: {old_x}, y: {old_y} }}"
                        new_pat = (
                            f"scorchMarkPosition: "
                            f"{{ x: {new_pos['x']}, y: {new_pos['y']} }}"
                        )
                        if old_pat in line:
                            lines[i] = line.replace(old_pat, new_pat, 1)
                            applied += 1
                            print(
                                f"  FIX: {tile_type} scorchMarkPosition: "
                                f"({old_x},{old_y}) \u2192 "
                                f"({new_pos['x']},{new_pos['y']})"
                            )
                        break
                modified = "".join(lines)

            # --- Fix EDGE_MISMATCH -------------------------------------------
            elif issue["code"] == "EDGE_MISMATCH":
                side = issue["side"]
                new_type = issue["inferred_type"]
                old_type = "open" if new_type == "wall" else "wall"

                lines = modified.splitlines(keepends=True)
                for i, line in enumerate(lines):
                    if f"tileType: '{tile_type}'" in line:
                        old_pat = f"{side}: '{old_type}'"
                        new_pat = f"{side}: '{new_type}'"
                        if old_pat in line:
                            lines[i] = line.replace(old_pat, new_pat, 1)
                            applied += 1
                            print(
                                f"  FIX: {tile_type} {side} edge: "
                                f"'{old_type}' \u2192 '{new_type}'"
                            )
                        break
                modified = "".join(lines)

    if applied > 0 and not dry_run:
        with open(source_path, "w", encoding="utf-8") as fh:
            fh.write(modified)

    return applied


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------
def print_summary(results: list, fixes_applied: int = 0) -> None:
    """Print a human-readable summary of validation results."""
    total = len(results)
    errors = sum(1 for r in results if r["has_errors"])
    warnings = sum(1 for r in results if r["has_warnings"])
    clean = total - errors - warnings

    print()
    print("=" * 65)
    print("  Tile Validation Report")
    print("=" * 65)
    print(f"  Tiles processed : {total}")
    print(f"  Clean           : {clean}")
    print(f"  With warnings   : {warnings}")
    print(f"  With errors     : {errors}")
    if fixes_applied:
        print(f"  Fixes applied   : {fixes_applied}")
    print()

    for result in results:
        if not result["issues"]:
            continue
        print(f"  ── {result['tile_type']} ({result['image_path']})")
        for issue in result["issues"]:
            icon = {"error": "✗", "warning": "⚠", "info": "ℹ"}.get(
                issue["severity"], "?"
            )
            print(f"     {icon} [{issue['code']}] {issue['message']}")
        print()

    if errors == 0 and warnings == 0:
        print("  ✓ All tiles passed validation.")
    elif errors > 0:
        print(f"  ✗ {errors} tile(s) have errors that require attention.")
    else:
        print(f"  ⚠ {warnings} tile(s) have warnings – review recommended.")
    print()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    mode = p.add_mutually_exclusive_group(required=True)
    mode.add_argument(
        "--check",
        action="store_true",
        help="Read-only mode. Exit with code 1 if any warnings or errors are found.",
    )
    mode.add_argument(
        "--fix",
        action="store_true",
        help="Apply high-confidence deterministic metadata fixes.",
    )
    p.add_argument(
        "--assets-dir",
        default=DEFAULT_ASSETS_DIR,
        metavar="PATH",
        help=f"Path to tile image assets directory (default: {DEFAULT_ASSETS_DIR})",
    )
    p.add_argument(
        "--source-file",
        default=DEFAULT_SOURCE_FILE,
        metavar="PATH",
        help=f"Path to TypeScript source with TILE_DEFINITIONS (default: {DEFAULT_SOURCE_FILE})",
    )
    p.add_argument(
        "--output",
        metavar="FILE",
        help="Write JSON report to FILE (default: print to stdout only)",
    )
    p.add_argument(
        "--verbose",
        action="store_true",
        help="Include per-edge image analysis details in the report.",
    )
    return p


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    # Resolve paths relative to repo root (script's parent directory)
    repo_root = Path(__file__).parent.parent
    assets_dir = str(repo_root / args.assets_dir)
    source_file = str(repo_root / args.source_file)

    # Parse tile definitions
    try:
        tile_defs = parse_tile_definitions(source_file)
    except Exception as exc:
        print(f"ERROR: Could not parse tile definitions: {exc}", file=sys.stderr)
        return 2

    print(f"Found {len(tile_defs)} tile definition(s) in {args.source_file}")

    # Validate each tile
    results = [validate_tile(td, assets_dir) for td in tile_defs]

    # Strip verbose image analysis from report unless requested
    if not args.verbose:
        for r in results:
            r.pop("edge_analysis", None)
            r.pop("scorch_analysis", None)

    # Apply fixes (fix mode only)
    fixes_applied = 0
    if args.fix:
        print("\nApplying high-confidence fixes …")
        fixes_applied = apply_fixes(results, source_file)
        if fixes_applied == 0:
            print("  No high-confidence fixes to apply.")

    # Print human-readable summary
    print_summary(results, fixes_applied=fixes_applied)

    # Write JSON report
    report = {
        "summary": {
            "total_tiles": len(results),
            "tiles_with_errors": sum(1 for r in results if r["has_errors"]),
            "tiles_with_warnings": sum(1 for r in results if r["has_warnings"]),
            "fixes_applied": fixes_applied,
        },
        "tiles": results,
    }

    if args.output:
        with open(args.output, "w", encoding="utf-8") as fh:
            json.dump(report, fh, indent=2)
        print(f"JSON report written to: {args.output}")
    else:
        print(json.dumps(report, indent=2))

    # Exit code: 1 if any issues found in --check mode
    if args.check:
        has_issues = any(r["has_errors"] or r["has_warnings"] for r in results)
        return 1 if has_issues else 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
