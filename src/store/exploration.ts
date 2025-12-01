import type { 
  Position, 
  HeroToken, 
  PlacedTile, 
  TileEdge, 
  Direction, 
  GridPosition,
  DungeonState,
  TileDefinition
} from './types';
import { TILE_DEFINITIONS, START_TILE, getStartTileSubTileId } from './types';
import { findTileAtPosition, isOnTileEdge } from './movement';

/**
 * Grid dimensions for the start tile (double height)
 * Valid squares are x: 1-3, y: 0-7
 */
export const START_TILE_BOUNDS = {
  minX: 1,
  maxX: 3,
  minY: 0,
  maxY: 7,
};

/**
 * Positions that are considered "on the edge" for each direction on the start tile
 * A hero on these positions can trigger exploration of the corresponding unexplored edge
 */
export const START_TILE_EDGE_POSITIONS: Record<Direction, Position[]> = {
  north: [
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 0 },
  ],
  south: [
    { x: 1, y: 7 },
    { x: 2, y: 7 },
    { x: 3, y: 7 },
  ],
  east: [
    { x: 3, y: 0 },
    { x: 3, y: 1 },
    { x: 3, y: 2 },
    { x: 3, y: 5 },
    { x: 3, y: 6 },
    { x: 3, y: 7 },
  ],
  west: [
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 1, y: 2 },
    { x: 1, y: 5 },
    { x: 1, y: 6 },
    { x: 1, y: 7 },
  ],
};

/**
 * Check if a position is on the edge squares for a given direction
 */
export function isOnEdge(position: Position, direction: Direction): boolean {
  const edgePositions = START_TILE_EDGE_POSITIONS[direction];
  return edgePositions.some(p => p.x === position.x && p.y === position.y);
}

/**
 * Get the opposite direction
 */
export function getOppositeDirection(direction: Direction): Direction {
  const opposites: Record<Direction, Direction> = {
    north: 'south',
    south: 'north',
    east: 'west',
    west: 'east',
  };
  return opposites[direction];
}

/**
 * Check if a hero is adjacent to an unexplored edge
 * Returns the unexplored edge if hero is on edge squares, null otherwise
 * 
 * For the start tile, east/west edges have sub-tile identifiers. The function
 * determines which sub-tile the hero is in and returns the matching edge.
 */
export function checkExploration(
  hero: HeroToken,
  dungeon: DungeonState
): TileEdge | null {
  // Find the tile the hero is on
  const heroTile = findTileAtPosition(hero.position, dungeon);
  
  if (!heroTile) {
    return null;
  }
  
  // Get the hero's sub-tile ID if on the start tile
  const heroSubTileId = heroTile.tileType === 'start' 
    ? getStartTileSubTileId(hero.position.y) 
    : undefined;
  
  // Check each unexplored edge of the hero's current tile
  for (const edge of dungeon.unexploredEdges) {
    // Only check edges on the hero's current tile
    if (edge.tileId !== heroTile.id) {
      continue;
    }
    
    // Check if hero is on an edge square for this direction using the generic isOnTileEdge
    if (isOnTileEdge(hero.position, heroTile, edge.direction)) {
      // For start tile east/west edges with sub-tile IDs, match the hero's sub-tile
      if (edge.subTileId && heroSubTileId && edge.subTileId !== heroSubTileId) {
        continue; // Hero is in a different sub-tile than this edge
      }
      return edge;
    }
  }
  
  return null;
}

/**
 * Calculate the grid position for a new tile based on the edge being explored
 */
export function getNewTilePosition(
  existingTile: PlacedTile,
  direction: Direction
): GridPosition {
  const { col, row } = existingTile.position;
  
  switch (direction) {
    case 'north':
      return { col, row: row - 1 };
    case 'south':
      return { col, row: row + 1 };
    case 'east':
      return { col: col + 1, row };
    case 'west':
      return { col: col - 1, row };
  }
}

/**
 * Calculate the rotation needed for a new tile so its arrow points
 * toward the exit that the hero approached from.
 * 
 * In the tile images, arrows point south (down) by default.
 * We rotate the tile so the arrow points to the connecting edge
 * (where the hero is standing).
 * 
 * @param explorationDirection - The direction the hero explored from (on the existing tile)
 */
export function calculateTileRotation(explorationDirection: Direction): number {
  // The connecting edge on the new tile is opposite to the exploration direction
  const connectingEdge = getOppositeDirection(explorationDirection);
  
  // Tile arrow points south by default. We need to rotate so arrow points
  // toward the connecting edge (where the hero is standing).
  // Rotation values (clockwise):
  // - Arrow should point south (hero at south/connecting edge is south): 0°
  // - Arrow should point west (hero at west/connecting edge is west): 90°
  // - Arrow should point north (hero at north/connecting edge is north): 180°
  // - Arrow should point east (hero at east/connecting edge is east): 270°
  const rotations: Record<Direction, number> = {
    south: 0,
    west: 90,
    north: 180,
    east: 270,
  };
  
  return rotations[connectingEdge];
}

/**
 * Get the tile definition for a tile type
 */
export function getTileDefinition(tileType: string): TileDefinition | undefined {
  return TILE_DEFINITIONS.find(t => t.tileType === tileType);
}

/**
 * Place a new tile at the specified edge
 */
export function placeTile(
  edge: TileEdge,
  tileType: string,
  dungeon: DungeonState
): PlacedTile | null {
  // Find the tile that has the unexplored edge
  const existingTile = dungeon.tiles.find(t => t.id === edge.tileId);
  
  if (!existingTile) {
    return null;
  }
  
  // Calculate position for the new tile
  const newPosition = getNewTilePosition(existingTile, edge.direction);
  
  // Calculate rotation
  const rotation = calculateTileRotation(edge.direction);
  
  // Get the tile definition for default edges
  const tileDef = getTileDefinition(tileType);
  if (!tileDef) {
    return null;
  }
  
  // Generate a unique ID for the new tile
  const newTileId = `tile-${dungeon.tiles.length}`;
  
  // Determine edges for the new tile
  // The edge that connects to the existing tile becomes 'open'
  // Other edges become 'unexplored' (for now, simplified to all unexplored)
  const connectingEdge = getOppositeDirection(edge.direction);
  
  const edges = {
    north: 'unexplored' as const,
    south: 'unexplored' as const,
    east: 'unexplored' as const,
    west: 'unexplored' as const,
    [connectingEdge]: 'open' as const,
  };
  
  return {
    id: newTileId,
    tileType,
    position: newPosition,
    rotation,
    edges,
  };
}

/**
 * Initialize the dungeon state with the start tile.
 * 
 * The start tile has 6 unexplored edges:
 * - 1 north edge (spans full width)
 * - 1 south edge (spans full width)
 * - 2 east edges (one for north sub-tile, one for south sub-tile)
 * - 2 west edges (one for north sub-tile, one for south sub-tile)
 */
export function initializeDungeon(): DungeonState {
  return {
    tiles: [{ ...START_TILE }],
    unexploredEdges: [
      { tileId: 'start-tile', direction: 'north' },
      { tileId: 'start-tile', direction: 'south' },
      // East edges - one per sub-tile
      { tileId: 'start-tile', direction: 'east', subTileId: 'start-tile-north' },
      { tileId: 'start-tile', direction: 'east', subTileId: 'start-tile-south' },
      // West edges - one per sub-tile
      { tileId: 'start-tile', direction: 'west', subTileId: 'start-tile-north' },
      { tileId: 'start-tile', direction: 'west', subTileId: 'start-tile-south' },
    ],
    tileDeck: [],
  };
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
export function shuffleArray<T>(
  array: T[],
  randomFn: () => number = Math.random
): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Initialize the tile deck with shuffled tiles
 */
export function initializeTileDeck(
  tiles: string[],
  randomFn: () => number = Math.random
): string[] {
  return shuffleArray(tiles, randomFn);
}

/**
 * Draw a tile from the deck
 * Returns the tile type and the remaining deck
 */
export function drawTile(deck: string[]): { drawnTile: string | null; remainingDeck: string[] } {
  if (deck.length === 0) {
    return { drawnTile: null, remainingDeck: [] };
  }
  
  const [drawnTile, ...remainingDeck] = deck;
  return { drawnTile, remainingDeck };
}

/**
 * Update dungeon state after exploration
 */
export function updateDungeonAfterExploration(
  dungeon: DungeonState,
  exploredEdge: TileEdge,
  newTile: PlacedTile
): DungeonState {
  // Remove the explored edge from unexplored edges
  const updatedUnexploredEdges = dungeon.unexploredEdges.filter(
    e => !(e.tileId === exploredEdge.tileId && e.direction === exploredEdge.direction)
  );
  
  // Add new unexplored edges from the new tile (excluding the connected edge)
  const connectingEdge = getOppositeDirection(exploredEdge.direction);
  const directions: Direction[] = ['north', 'south', 'east', 'west'];
  
  const newUnexploredEdges = directions
    .filter(dir => dir !== connectingEdge && newTile.edges[dir] === 'unexplored')
    .map(dir => ({ tileId: newTile.id, direction: dir }));
  
  // Update the existing tile's edge to 'open'
  const updatedTiles = dungeon.tiles.map(tile => {
    if (tile.id === exploredEdge.tileId) {
      return {
        ...tile,
        edges: {
          ...tile.edges,
          [exploredEdge.direction]: 'open' as const,
        },
      };
    }
    return tile;
  });
  
  return {
    tiles: [...updatedTiles, newTile],
    unexploredEdges: [...updatedUnexploredEdges, ...newUnexploredEdges],
    tileDeck: dungeon.tileDeck,
  };
}
