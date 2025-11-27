import type { Position, HeroToken } from './types';

/**
 * Start Tile boundaries
 * The Start Tile is a double-height tile with valid spaces from x: 1-3, y: 0-7.
 * The staircase occupies the center (x: 1-2, y: 3-4) and is not walkable.
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
};

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
 * Check if a position is on the staircase (not walkable)
 */
export function isOnStaircase(pos: Position): boolean {
  return START_TILE.staircase.some(s => s.x === pos.x && s.y === pos.y);
}

/**
 * Check if a position is a valid walkable square
 */
export function isValidSquare(pos: Position): boolean {
  return isWithinStartTile(pos) && !isOnStaircase(pos);
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
 * Get adjacent positions (orthogonal and diagonal within tile)
 * Diagonal movement is allowed within a tile but not between tiles
 */
export function getAdjacentPositions(pos: Position): Position[] {
  const adjacent: Position[] = [];
  
  // All 8 directions (orthogonal + diagonal)
  const directions = [
    { dx: 0, dy: -1 },  // up
    { dx: 0, dy: 1 },   // down
    { dx: -1, dy: 0 },  // left
    { dx: 1, dy: 0 },   // right
    { dx: -1, dy: -1 }, // up-left
    { dx: 1, dy: -1 },  // up-right
    { dx: -1, dy: 1 },  // down-left
    { dx: 1, dy: 1 },   // down-right
  ];
  
  for (const dir of directions) {
    const newPos = { x: pos.x + dir.dx, y: pos.y + dir.dy };
    if (isValidSquare(newPos)) {
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
 * @returns Array of valid destination positions
 */
export function getValidMoveSquares(
  heroPos: Position,
  speed: number,
  heroTokens: HeroToken[],
  heroId: string
): Position[] {
  const validSquares: Position[] = [];
  const visited = new Set<string>();
  const queue: { pos: Position; distance: number }[] = [{ pos: heroPos, distance: 0 }];
  
  visited.add(`${heroPos.x},${heroPos.y}`);
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    
    // If we're at a position other than the starting position and it's not occupied, it's valid
    if (current.distance > 0 && !isOccupied(current.pos, heroTokens, heroId)) {
      validSquares.push(current.pos);
    }
    
    // If we haven't reached max distance, explore adjacent squares
    if (current.distance < speed) {
      const adjacent = getAdjacentPositions(current.pos);
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
