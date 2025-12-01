import type { Position, HeroToken, DungeonState, PlacedTile, Direction, StartTileSubTileId } from './types';
import { getStartTileSubTileId, START_TILE_SUB_TILE_BOUNDARY } from './types';

/**
 * Start Tile boundaries
 * The Start Tile is a double-height tile with valid spaces from x: 1-3, y: 0-7.
 * The staircase occupies the center (x: 1-2, y: 3-4) and is not walkable.
 * 
 * The start tile is composed of two sub-tiles (north and south halves):
 * - North sub-tile: y: 0-3
 * - South sub-tile: y: 4-7
 * 
 * For tile counting purposes, each sub-tile is treated as a separate tile.
 */
export const START_TILE = {
  minX: 1,
  maxX: 3,
  minY: 0,
  maxY: 7,
  // Staircase squares that cannot be walked on
  staircase: [
    { x: 1, y: 3 },
    { x: 2, y: 3 },
    { x: 1, y: 4 },
    { x: 2, y: 4 },
  ],
  // Sub-tile boundaries
  subTiles: {
    north: { minY: 0, maxY: START_TILE_SUB_TILE_BOUNDARY.northMaxY },
    south: { minY: START_TILE_SUB_TILE_BOUNDARY.southMinY, maxY: 7 },
  },
};

/**
 * Normal tile dimensions (4x4 grid)
 */
export const NORMAL_TILE_SIZE = 4;

/**
 * Start tile dimensions (4 wide, 8 tall)
 */
export const START_TILE_WIDTH = 4;
export const START_TILE_HEIGHT = 8;

/**
 * Get the bounds of a tile in absolute coordinates based on its type and grid position.
 * 
 * Coordinate system:
 * - Start tile at col=0, row=0 has positions x: 0-3, y: 0-7 (but walkable is x: 1-3)
 * - Tiles to the east (col=1) start at x=4
 * - Tiles to the west (col=-1) start at x=-4
 * - Tiles to the north (row=-1) start at y=-4
 * - Tiles to the south (row=1) start at y=8
 */
export function getTileBounds(tile: PlacedTile): { minX: number; maxX: number; minY: number; maxY: number } {
  const { col, row } = tile.position;
  
  if (tile.tileType === 'start') {
    // Start tile is at col=0, row=0 with special dimensions
    // Walkable area is x: 1-3, y: 0-7 (the 0th column is wall)
    return {
      minX: 0,
      maxX: 3,
      minY: 0,
      maxY: 7,
    };
  }
  
  // Normal tiles are 4x4 and positioned based on their grid position relative to start tile
  // The start tile occupies col=0 and spans 4 columns (x: 0-3)
  // The start tile occupies row=0 and spans 8 rows (y: 0-7)
  
  let minX: number, minY: number;
  
  if (col > 0) {
    // Tiles to the east: start after the start tile (x >= 4)
    minX = START_TILE_WIDTH + (col - 1) * NORMAL_TILE_SIZE;
  } else if (col < 0) {
    // Tiles to the west: start before x=0
    minX = col * NORMAL_TILE_SIZE;
  } else {
    // col === 0: same column as start tile
    minX = 0;
  }
  
  if (row > 0) {
    // Tiles to the south: start after the start tile (y >= 8)
    minY = START_TILE_HEIGHT + (row - 1) * NORMAL_TILE_SIZE;
  } else if (row < 0) {
    // Tiles to the north: start before y=0
    minY = row * NORMAL_TILE_SIZE;
  } else {
    // row === 0: same row as start tile (but different column)
    minY = 0;
  }
  
  return {
    minX,
    maxX: minX + NORMAL_TILE_SIZE - 1,
    minY,
    maxY: minY + NORMAL_TILE_SIZE - 1,
  };
}

/**
 * Find which tile a position is on, if any.
 */
export function findTileAtPosition(pos: Position, dungeon: DungeonState): PlacedTile | null {
  for (const tile of dungeon.tiles) {
    const bounds = getTileBounds(tile);
    if (pos.x >= bounds.minX && pos.x <= bounds.maxX &&
        pos.y >= bounds.minY && pos.y <= bounds.maxY) {
      return tile;
    }
  }
  return null;
}

/**
 * Get the sub-tile identifier for a position on the start tile.
 * The start tile is composed of two sub-tiles:
 * - 'start-tile-north': y coordinates 0-3
 * - 'start-tile-south': y coordinates 4-7
 * 
 * This is used for tile counting purposes where each sub-tile
 * is treated as a separate tile.
 * 
 * @param pos - The position to check
 * @param dungeon - The dungeon state (to verify position is on start tile)
 * @returns The sub-tile ID if on start tile, null otherwise
 */
export function getSubTileIdAtPosition(pos: Position, dungeon: DungeonState): StartTileSubTileId | null {
  const tile = findTileAtPosition(pos, dungeon);
  
  if (!tile || tile.tileType !== 'start') {
    return null;
  }
  
  return getStartTileSubTileId(pos.y);
}

/**
 * Check if two positions are on the same sub-tile (for tile counting purposes).
 * 
 * This implements the rule that the start tile consists of 2 connected tiles,
 * each section treated as its own tile for movement and counting.
 * 
 * @param pos1 - First position
 * @param pos2 - Second position
 * @param dungeon - The dungeon state
 * @returns true if both positions are on the same logical tile (or sub-tile for start tile)
 */
export function areOnSameTileOrSubTile(pos1: Position, pos2: Position, dungeon: DungeonState): boolean {
  const tile1 = findTileAtPosition(pos1, dungeon);
  const tile2 = findTileAtPosition(pos2, dungeon);
  
  // If either position is not on a tile, they're not on the same tile
  if (!tile1 || !tile2) {
    return false;
  }
  
  // If on different tiles (by ID), they're not on the same tile
  if (tile1.id !== tile2.id) {
    return false;
  }
  
  // If on the start tile, check sub-tiles
  if (tile1.tileType === 'start') {
    const subTile1 = getStartTileSubTileId(pos1.y);
    const subTile2 = getStartTileSubTileId(pos2.y);
    return subTile1 === subTile2;
  }
  
  // For normal tiles, same tile ID means same tile
  return true;
}

/**
 * Check if a position is within the valid start tile bounds
 */
export function isWithinStartTile(pos: Position): boolean {
  return (
    pos.x >= START_TILE.minX &&
    pos.x <= START_TILE.maxX &&
    pos.y >= START_TILE.minY &&
    pos.y <= START_TILE.maxY
  );
}

/**
 * Get a unique identifier for the tile or sub-tile at a position.
 * This is used for tile counting purposes where the start tile's
 * sub-tiles are treated as separate tiles.
 * 
 * @param pos - The position to check
 * @param dungeon - The dungeon state
 * @returns A unique string identifier for the tile/sub-tile, or null if not on a tile
 */
export function getTileOrSubTileId(pos: Position, dungeon: DungeonState): string | null {
  const tile = findTileAtPosition(pos, dungeon);
  
  if (!tile) {
    return null;
  }
  
  // For start tile, return the sub-tile ID
  if (tile.tileType === 'start') {
    const subTileId = getStartTileSubTileId(pos.y);
    return subTileId;
  }
  
  // For normal tiles, return the tile ID
  return tile.id;
}

/**
 * Check if a position is on the staircase (not walkable)
 */
export function isOnStaircase(pos: Position): boolean {
  return START_TILE.staircase.some(s => s.x === pos.x && s.y === pos.y);
}

/**
 * Check if a position is on a wall square within a normal (non-start) tile.
 * Wall squares are determined by the tile's edge configuration:
 * - When an edge is 'wall' (not 'open' or 'unexplored'), the squares along that edge are walls
 * 
 * Note: Start tiles use different wall logic (x<1 column and staircase) handled in isValidSquare.
 * This function returns false for start tiles to allow the caller to use the appropriate logic.
 * 
 * @param localX - X coordinate relative to the tile's bounds (0-3 for normal tiles)
 * @param localY - Y coordinate relative to the tile's bounds (0-3 for normal tiles)
 * @param tile - The placed tile to check
 * @returns true if the position is a wall square, false for start tiles
 */
export function isOnWallSquare(localX: number, localY: number, tile: PlacedTile): boolean {
  // Start tiles use different wall logic (x<1 column and staircase) handled elsewhere
  if (tile.tileType === 'start') {
    return false;
  }
  
  // Check each edge - if it's a wall, the squares along that edge are walls
  // North edge (y = 0)
  if (tile.edges.north === 'wall' && localY === 0) {
    return true;
  }
  
  // South edge (y = NORMAL_TILE_SIZE - 1 = 3)
  if (tile.edges.south === 'wall' && localY === NORMAL_TILE_SIZE - 1) {
    return true;
  }
  
  // West edge (x = 0)
  if (tile.edges.west === 'wall' && localX === 0) {
    return true;
  }
  
  // East edge (x = NORMAL_TILE_SIZE - 1 = 3)
  if (tile.edges.east === 'wall' && localX === NORMAL_TILE_SIZE - 1) {
    return true;
  }
  
  return false;
}

/**
 * Convert a global position to local tile coordinates.
 * @param pos - Global position
 * @param tile - The tile to get local coordinates for
 * @returns Local coordinates (0-based within the tile)
 */
export function getLocalTileCoordinates(pos: Position, tile: PlacedTile): { localX: number; localY: number } {
  const bounds = getTileBounds(tile);
  return {
    localX: pos.x - bounds.minX,
    localY: pos.y - bounds.minY,
  };
}

/**
 * Check if a position is a valid walkable square on any tile in the dungeon.
 * If no dungeon is provided, falls back to checking only the start tile.
 */
export function isValidSquare(pos: Position, dungeon?: DungeonState): boolean {
  if (!dungeon) {
    // Fallback for backward compatibility - only check start tile
    return isWithinStartTile(pos) && !isOnStaircase(pos);
  }
  
  const tile = findTileAtPosition(pos, dungeon);
  if (!tile) {
    return false;
  }
  
  // Check for staircase on start tile
  if (tile.tileType === 'start') {
    if (isOnStaircase(pos)) {
      return false;
    }
    // On start tile, only x: 1-3 are walkable (x=0 is wall)
    if (pos.x < 1) {
      return false;
    }
    return true;
  }
  
  // For normal tiles, check if position is on a wall square
  const { localX, localY } = getLocalTileCoordinates(pos, tile);
  if (isOnWallSquare(localX, localY, tile)) {
    return false;
  }
  
  return true;
}

/**
 * Check if a position is occupied by a hero
 */
export function isOccupied(pos: Position, heroTokens: HeroToken[], excludeHeroId?: string): boolean {
  return heroTokens.some(
    token => token.position.x === pos.x && 
             token.position.y === pos.y && 
             token.heroId !== excludeHeroId
  );
}

/**
 * Check if a position is on the edge of a tile in a specific direction
 */
export function isOnTileEdge(pos: Position, tile: PlacedTile, direction: Direction): boolean {
  const bounds = getTileBounds(tile);
  
  // For start tile, walkable area starts at x=1, not x=0
  const effectiveMinX = tile.tileType === 'start' ? 1 : bounds.minX;
  
  switch (direction) {
    case 'north':
      return pos.y === bounds.minY;
    case 'south':
      return pos.y === bounds.maxY;
    case 'east':
      return pos.x === bounds.maxX;
    case 'west':
      return pos.x === effectiveMinX;
  }
}

/**
 * Check if diagonal movement within a tile is blocked by walls at the tile edges.
 * Diagonal movement is blocked if both connected edges have walls.
 * 
 * This implements the rule: "Diagonal movement is not allowed if both connected edges have walls."
 * 
 * The logic checks if:
 * 1. The current position is on an edge that has a wall
 * 2. The diagonal movement direction would "cross" that wall corner
 * 3. Both the horizontal and vertical directions are blocked by walls
 * 
 * For example, if at position (3,0) on a tile (bounds 0-3) with walls on north and east:
 * - Moving north-east (dx=1, dy=-1) toward (4,-1): blocked because we're on both north 
 *   and east edges, moving toward both walls (would cut through the corner)
 * - Moving south-west (dx=-1, dy=1) toward (2,1): NOT blocked because we're moving AWAY
 *   from the wall corner
 * 
 * Note: In practice, diagonal moves toward wall corners often lead to positions outside
 * the tile, which are filtered by findTileAtPosition returning null. This function
 * provides an additional safety check for edge cases where adjacent tiles might exist.
 * 
 * Returns true if movement is blocked, false if allowed.
 */
export function isDiagonalBlockedByWalls(
  pos: Position,
  dx: number,
  dy: number,
  tile: PlacedTile
): boolean {
  const bounds = getTileBounds(tile);
  
  // For start tile, walkable area starts at x=1, not x=0 (x=0 is wall column)
  const effectiveMinX = tile.tileType === 'start' ? 1 : bounds.minX;
  
  // Determine which edges the current position is on
  const onNorthEdge = pos.y === bounds.minY;
  const onSouthEdge = pos.y === bounds.maxY;
  const onEastEdge = pos.x === bounds.maxX;
  const onWestEdge = pos.x === effectiveMinX;
  
  // Get the two cardinal directions that make up this diagonal movement
  const verticalDir: Direction | null = dy < 0 ? 'north' : dy > 0 ? 'south' : null;
  const horizontalDir: Direction | null = dx < 0 ? 'west' : dx > 0 ? 'east' : null;
  
  // Both directions must be present for diagonal movement
  if (!verticalDir || !horizontalDir) {
    return false; // Not a diagonal move, let other checks handle it
  }
  
  // Track if each direction is blocked by a wall
  // A direction is blocked if: we're on that edge AND moving toward it AND it has a wall
  let verticalWallBlocks = false;
  let horizontalWallBlocks = false;
  
  // Check if moving toward a wall in the vertical direction
  if (verticalDir === 'north' && onNorthEdge && tile.edges.north === 'wall') {
    verticalWallBlocks = true;
  }
  if (verticalDir === 'south' && onSouthEdge && tile.edges.south === 'wall') {
    verticalWallBlocks = true;
  }
  
  // Check if moving toward a wall in the horizontal direction
  if (horizontalDir === 'east' && onEastEdge && tile.edges.east === 'wall') {
    horizontalWallBlocks = true;
  }
  if (horizontalDir === 'west' && onWestEdge && tile.edges.west === 'wall') {
    horizontalWallBlocks = true;
  }
  
  // Diagonal movement is blocked only if BOTH connected edges have walls
  // (i.e., trying to cut through a corner where two walls meet)
  return verticalWallBlocks && horizontalWallBlocks;
}

/**
 * Check if movement between two tiles is allowed via their connected edges.
 * Movement between tiles is only allowed in cardinal directions (not diagonal)
 * and only if both tiles have 'open' edges on the connecting sides.
 */
export function canMoveBetweenTiles(
  fromTile: PlacedTile,
  toTile: PlacedTile,
  fromPos: Position,
  toPos: Position
): boolean {
  // Calculate direction of movement
  const dx = toPos.x - fromPos.x;
  const dy = toPos.y - fromPos.y;
  
  // Only cardinal movement allowed between tiles
  if (dx !== 0 && dy !== 0) {
    return false;
  }
  
  // Determine which direction we're moving
  let fromDirection: Direction;
  let toDirection: Direction;
  if (dy < 0) {
    fromDirection = 'north';
    toDirection = 'south';
  } else if (dy > 0) {
    fromDirection = 'south';
    toDirection = 'north';
  } else if (dx > 0) {
    fromDirection = 'east';
    toDirection = 'west';
  } else {
    fromDirection = 'west';
    toDirection = 'east';
  }
  
  // Check if both tiles have open edges on the connecting sides
  if (fromTile.edges[fromDirection] !== 'open') {
    return false;
  }
  
  if (toTile.edges[toDirection] !== 'open') {
    return false;
  }
  
  return true;
}

/**
 * Get adjacent positions (orthogonal and diagonal within tile)
 * Diagonal movement is allowed within a tile but not between tiles.
 * Cardinal movement between adjacent tiles is allowed if the tiles have connected edges.
 * 
 * If no dungeon is provided, falls back to only checking the start tile.
 */
export function getAdjacentPositions(pos: Position, dungeon?: DungeonState): Position[] {
  const adjacent: Position[] = [];
  
  // All 8 directions (orthogonal + diagonal)
  const directions = [
    { dx: 0, dy: -1, cardinal: true },   // up (north)
    { dx: 0, dy: 1, cardinal: true },    // down (south)
    { dx: -1, dy: 0, cardinal: true },   // left (west)
    { dx: 1, dy: 0, cardinal: true },    // right (east)
    { dx: -1, dy: -1, cardinal: false }, // up-left
    { dx: 1, dy: -1, cardinal: false },  // up-right
    { dx: -1, dy: 1, cardinal: false },  // down-left
    { dx: 1, dy: 1, cardinal: false },   // down-right
  ];
  
  // If no dungeon provided, use legacy behavior (start tile only)
  if (!dungeon) {
    for (const dir of directions) {
      const newPos = { x: pos.x + dir.dx, y: pos.y + dir.dy };
      if (isValidSquare(newPos)) {
        adjacent.push(newPos);
      }
    }
    return adjacent;
  }
  
  // Find the tile the current position is on
  const currentTile = findTileAtPosition(pos, dungeon);
  if (!currentTile) {
    return adjacent;
  }
  
  for (const dir of directions) {
    const newPos = { x: pos.x + dir.dx, y: pos.y + dir.dy };
    
    // Find which tile the new position is on (returns null if not on any tile)
    const targetTile = findTileAtPosition(newPos, dungeon);
    if (!targetTile) {
      continue;
    }
    
    // Check validity based on tile-specific rules (staircase, walls, etc.)
    // This now handles both start tile and normal tile wall squares
    if (!isValidSquare(newPos, dungeon)) {
      continue;
    }
    
    // If same tile, movement is allowed (including diagonal) unless blocked by walls
    if (currentTile.id === targetTile.id) {
      // For diagonal movement, check if both connected edges have walls
      if (!dir.cardinal && isDiagonalBlockedByWalls(pos, dir.dx, dir.dy, currentTile)) {
        continue;
      }
      adjacent.push(newPos);
      continue;
    }
    
    // If different tiles, only cardinal movement is allowed
    if (!dir.cardinal) {
      continue;
    }
    
    // Check if the tiles are connected via open edges
    if (canMoveBetweenTiles(currentTile, targetTile, pos, newPos)) {
      adjacent.push(newPos);
    }
  }
  
  return adjacent;
}

/**
 * Calculate Manhattan distance between two positions
 */
export function getManhattanDistance(from: Position, to: Position): number {
  return Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
}

/**
 * Get all valid movement squares within the hero's speed using BFS
 * @param heroPos - Current position of the hero
 * @param speed - Movement speed in squares
 * @param heroTokens - All hero tokens on the board
 * @param heroId - ID of the hero being moved (to exclude from occupation check)
 * @param dungeon - Optional dungeon state for multi-tile movement
 * @returns Array of valid destination positions
 */
export function getValidMoveSquares(
  heroPos: Position,
  speed: number,
  heroTokens: HeroToken[],
  heroId: string,
  dungeon?: DungeonState
): Position[] {
  const validSquares: Position[] = [];
  const visited = new Set<string>();
  const queue: { pos: Position; distance: number }[] = [{ pos: heroPos, distance: 0 }];
  
  visited.add(`${heroPos.x},${heroPos.y}`);
  
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    
    // If we're at a position other than the starting position and it's not occupied, it's valid
    if (current.distance > 0 && !isOccupied(current.pos, heroTokens, heroId)) {
      validSquares.push(current.pos);
    }
    
    // If we haven't reached max distance, explore adjacent squares
    if (current.distance < speed) {
      const adjacent = getAdjacentPositions(current.pos, dungeon);
      for (const adjPos of adjacent) {
        const key = `${adjPos.x},${adjPos.y}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({ pos: adjPos, distance: current.distance + 1 });
        }
      }
    }
  }
  
  return validSquares;
}

/**
 * Check if movement from one square to another is valid
 * This checks adjacency and that the destination is a valid, unoccupied square
 */
export function canMoveTo(
  from: Position,
  to: Position,
  heroTokens: HeroToken[],
  heroId: string
): boolean {
  // Check if destination is a valid square
  if (!isValidSquare(to)) {
    return false;
  }
  
  // Check if destination is occupied
  if (isOccupied(to, heroTokens, heroId)) {
    return false;
  }
  
  // Check if destination is adjacent (including diagonal)
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  
  // Must be within 1 square in each direction
  return dx <= 1 && dy <= 1 && (dx > 0 || dy > 0);
}

/**
 * Check if a position is within the valid movement squares
 */
export function isValidMoveDestination(
  pos: Position,
  validSquares: Position[]
): boolean {
  return validSquares.some(s => s.x === pos.x && s.y === pos.y);
}
