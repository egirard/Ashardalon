# Tile Validation Workflow

This document describes the image-processing tile validation script (`tools/validate_tiles.py`) that inspects tile images and metadata for consistency.

## Overview

The script cross-references each tile's `defaultEdges` and `scorchMarkPosition` metadata (defined in `src/store/types.ts`) with the actual tile PNG images. It detects:

| Check | Severity | Description |
|-------|----------|-------------|
| `EDGE_MISMATCH` | warning | Tile edge metadata says `'open'`/`'wall'` but image analysis confidently infers the opposite |
| `SCORCH_ON_WALL` | warning | Scorch mark position falls on a wall cell (inaccessible grid square) |
| `EXIT_COUNT_MISMATCH` | info | Tile name (e.g. `tile-black-3exit-a`) implies N exits but metadata defines a different count |
| `IMAGE_NOT_FOUND` | error | Image file referenced in metadata cannot be found |

Severity levels:
- **error** – blocks the game from running correctly; must be fixed
- **warning** – deterministic fix available; run `--fix` or review manually
- **info** – informational note; metadata is authoritative, name is historical

## When to Run

Run the validator **whenever you:**
- Add a new tile image or modify an existing one
- Change edge definitions (`defaultEdges`) in `src/store/types.ts`
- Change `scorchMarkPosition` values in `src/store/types.ts`

## Usage

### Prerequisites

```bash
pip install Pillow numpy
```

Python 3.8+ is required.

### Check mode (read-only)

Exits with code `0` if all tiles pass, `1` if any warnings or errors are found.

```bash
# Run from the repository root
python tools/validate_tiles.py --check
```

To save a machine-readable JSON report:

```bash
python tools/validate_tiles.py --check --output report.json
```

To include detailed per-edge image analysis in the report:

```bash
python tools/validate_tiles.py --check --verbose --output report.json
```

### Fix mode (apply deterministic fixes)

Applies high-confidence fixes directly to `src/store/types.ts`. Only fixes with a single unambiguous correction are applied; ambiguous cases are reported for manual review.

```bash
python tools/validate_tiles.py --fix
```

### Custom paths

```bash
python tools/validate_tiles.py --check \
  --assets-dir public/assets \
  --source-file src/store/types.ts \
  --output /tmp/report.json
```

## Interpreting the Report

### Human-readable output

```
══════════════════════════════════════════════════════════════════
  Tile Validation Report
══════════════════════════════════════════════════════════════════
  Tiles processed : 16
  Clean           : 15
  With warnings   : 1
  With errors     : 0

  ── tile-black-3exit-a (assets/Tile_Black_x3_01.png)
     ⚠ [SCORCH_ON_WALL] Scorch mark at grid (3,1) is on a wall cell: ...

  ⚠ 1 tile(s) have warnings – review recommended.
```

- `ℹ` (info) – informational, no action required
- `⚠` (warning) – fix available; run `--fix` or review manually
- `✗` (error) – blocking issue; requires immediate attention

### JSON report structure

```json
{
  "summary": {
    "total_tiles": 16,
    "tiles_with_errors": 0,
    "tiles_with_warnings": 1,
    "fixes_applied": 0
  },
  "tiles": [
    {
      "tile_type": "tile-black-3exit-a",
      "image_path": "assets/Tile_Black_x3_01.png",
      "metadata_edges": { "north": "open", "south": "open", "east": "wall", "west": "open" },
      "scorch_mark_position": { "x": 2, "y": 1 },
      "issues": [ { "severity": "warning", "code": "SCORCH_ON_WALL", ... } ],
      "has_errors": false,
      "has_warnings": true
    }
  ]
}
```

## Technical Details

### Edge analysis algorithm

The script samples two regions of each 632×632 tile image for each edge (N/S/E/W):

- **Center strip** – 30% of the edge length around the midpoint (the corridor opening area)
- **Corner strips** – 15% of the edge length from each end (the wall area)

The _center/corner brightness ratio_ determines the inferred edge type:

| Ratio | Inferred type |
|-------|--------------|
| < 0.67 | `wall` (high confidence) |
| 0.67 – 0.85 | `uncertain` (not flagged) |
| > 0.85 | `open` (high confidence) |

Only high-confidence mismatches trigger a `EDGE_MISMATCH` warning.

### Scorch mark grid coordinates

Scorch marks use 0-based coordinates in a 4×4 game grid (matching `NORMAL_TILE_SIZE = 4` in `src/store/movement.ts`):

```
  x: 0  x: 1  x: 2  x: 3
y:0  ┌─────┬─────┬─────┬─────┐
     │ 0,0 │ 1,0 │ 2,0 │ 3,0 │
y:1  ├─────┼─────┼─────┼─────┤
     │ 0,1 │ 1,1 │ 2,1 │ 3,1 │
y:2  ├─────┼─────┼─────┼─────┤
     │ 0,2 │ 1,2 │ 2,2 │ 3,2 │
y:3  ├─────┼─────┼─────┼─────┤
     │ 0,3 │ 1,3 │ 2,3 │ 3,3 │
     └─────┴─────┴─────┴─────┘
west                      east
```

Edge cells (x=0 west, x=3 east, y=0 north, y=3 south) are wall squares when the corresponding edge is `'wall'`. The scorch mark must not be placed on a wall cell.

## Adding New Tiles

1. Add the tile PNG to `public/assets/`.
2. Add a `TileDefinition` entry to `TILE_DEFINITIONS` in `src/store/types.ts` with correct `defaultEdges` and `scorchMarkPosition`.
3. Run validation:
   ```bash
   python tools/validate_tiles.py --check
   ```
4. If warnings appear, either fix manually or run:
   ```bash
   python tools/validate_tiles.py --fix
   ```
5. Re-run `--check` to confirm clean state before committing.

## CI Integration

The repository includes a CI workflow (`.github/workflows/tile-validation.yml`) that runs the script in `--check` mode on every pull request. A failing validation will block the PR merge.

If you intentionally introduced a tile name/count mismatch (e.g. a "2exit" tile that actually has 3 openings for game-balance reasons), note that `EXIT_COUNT_MISMATCH` is an `info`-level finding that does **not** cause CI to fail.
