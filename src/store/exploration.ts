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
 * 
 * For the start tile's east/west edges, the new tile's row position depends on
 * which sub-tile (north or south) is being explored:
 * - North sub-tile (y: 0-3) → new tile at row 0 (spans y: 0-3)
 * - South sub-tile (y: 4-7) → new tile at row 1 (spans y: 4-7)
 */
export function getNewTilePosition(
  existingTile: PlacedTile,
  direction: Direction,
  subTileId?: string
): GridPosition {
  const { col, row } = existingTile.position;
  
  switch (direction) {
    case 'north':
      return { col, row: row - 1 };
    case 'south':
      return { col, row: row + 1 };
    case 'east':
      // For start tile east/west edges, adjust row based on sub-tile
      if (existingTile.tileType === 'start' && subTileId === 'start-tile-south') {
        return { col: col + 1, row: 1 };
      }
      return { col: col + 1, row };
    case 'west':
      // For start tile east/west edges, adjust row based on sub-tile
      if (existingTile.tileType === 'start' && subTileId === 'start-tile-south') {
        return { col: col - 1, row: 1 };
      }
      return { col: col - 1, row };
  }
}

/**
 * Calculate the rotation needed for a new tile so that one of its openings
 * aligns with the connecting edge.
 * 
 * @param explorationDirection - The direction the hero explored from (on the existing tile)
 * @param tileDef - The tile definition with default edge configuration
 * @returns The rotation in degrees (0, 90, 180, or 270) needed to align an opening with the connecting edge
 */
export function calculateTileRotation(explorationDirection: Direction, tileDef: TileDefinition): number {
  // The connecting edge on the new tile is opposite to the exploration direction
  const connectingEdge = getOppositeDirection(explorationDirection);
  
  // Find which edges have openings in the default orientation
  const openEdges: Direction[] = [];
  if (tileDef.defaultEdges.north === 'open') openEdges.push('north');
  if (tileDef.defaultEdges.south === 'open') openEdges.push('south');
  if (tileDef.defaultEdges.east === 'open') openEdges.push('east');
  if (tileDef.defaultEdges.west === 'open') openEdges.push('west');
  
  // For each possible rotation, check if it would place an opening at the connecting edge
  const rotations = [0, 90, 180, 270];
  
  for (const rotation of rotations) {
    const rotatedEdges = rotateEdges(tileDef.defaultEdges, rotation);
    if (rotatedEdges[connectingEdge] === 'open') {
      return rotation;
    }
  }
  
  // Fallback: if no opening can be aligned (shouldn't happen), return 0
  return 0;
}

/**
 * Get the tile definition for a tile type
 */
export function getTileDefinition(tileType: string): TileDefinition | undefined {
  return TILE_DEFINITIONS.find(t => t.tileType === tileType);
}

/**
 * Rotate tile edges based on rotation amount.
 * The default tile orientation has the arrow pointing south (0 degrees).
 * Positive rotation is clockwise.
 * 
 * @param defaultEdges - The edges in the default orientation (0 degrees)
 * @param rotation - Rotation in degrees (0, 90, 180, or 270)
 * @returns The rotated edges
 */
export function rotateEdges(
  defaultEdges: { north: EdgeType; south: EdgeType; east: EdgeType; west: EdgeType },
  rotation: number
): { north: EdgeType; south: EdgeType; east: EdgeType; west: EdgeType } {
  // Normalize rotation to 0, 90, 180, or 270
  const normalizedRotation = ((rotation % 360) + 360) % 360;
  
  switch (normalizedRotation) {
    case 0:
      // No rotation
      return { ...defaultEdges };
    case 90:
      // 90° clockwise: north -> east, east -> south, south -> west, west -> north
      return {
        north: defaultEdges.west,
        east: defaultEdges.north,
        south: defaultEdges.east,
        west: defaultEdges.south,
      };
    case 180:
      // 180°: north -> south, south -> north, east -> west, west -> east
      return {
        north: defaultEdges.south,
        east: defaultEdges.west,
        south: defaultEdges.north,
        west: defaultEdges.east,
      };
    case 270:
      // 270° clockwise (or 90° counter-clockwise): north -> west, west -> south, south -> east, east -> north
      return {
        north: defaultEdges.east,
        east: defaultEdges.south,
        south: defaultEdges.west,
        west: defaultEdges.north,
      };
    default:
      // Fallback to no rotation
      return { ...defaultEdges };
  }
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
  const newPosition = getNewTilePosition(existingTile, edge.direction, edge.subTileId);
  
  // Get the tile definition for default edges
  const tileDef = getTileDefinition(tileType);
  if (!tileDef) {
    return null;
  }
  
  // Calculate rotation needed to align an opening with the connecting edge
  const rotation = calculateTileRotation(edge.direction, tileDef);
  
  // Generate a unique ID for the new tile
  const newTileId = `tile-${dungeon.tiles.length}`;
  
  // Rotate the tile's default edges based on the calculated rotation
  const rotatedEdges = rotateEdges(tileDef.defaultEdges, rotation);
  
  // Determine which edge connects to the existing tile
  const connectingEdge = getOppositeDirection(edge.direction);
  
  // Build final edges:
  // - Connecting edge must be 'open'
  // - Other edges from rotatedEdges that are 'open' become 'unexplored'
  // - Edges that are 'wall' stay as 'wall'
  const edges = {
    north: rotatedEdges.north === 'wall' ? 'wall' : (connectingEdge === 'north' ? 'open' : 'unexplored'),
    south: rotatedEdges.south === 'wall' ? 'wall' : (connectingEdge === 'south' ? 'open' : 'unexplored'),
    east: rotatedEdges.east === 'wall' ? 'wall' : (connectingEdge === 'east' ? 'open' : 'unexplored'),
    west: rotatedEdges.west === 'wall' ? 'wall' : (connectingEdge === 'west' ? 'open' : 'unexplored'),
  } as const;
  
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
 * Draw a tile from the bottom of the deck
 * Used by special encounter cards like Lost and Occupied Lair
 */
export function drawTileFromBottom(deck: string[]): { drawnTile: string | null; remainingDeck: string[] } {
  if (deck.length === 0) {
    return { drawnTile: null, remainingDeck: [] };
  }
  
  const drawnTile = deck[deck.length - 1];
  return { drawnTile, remainingDeck: deck.slice(0, -1) };
}

/**
 * Move bottom tile to top of deck
 * Used by encounter card "Lost" - take bottom tile and place it on top without looking
 */
export function moveBottomTileToTop(deck: string[]): string[] {
  if (deck.length <= 1) {
    return deck;
  }
  
  const bottomTile = deck[deck.length - 1];
  const remainingDeck = deck.slice(0, -1);
  return [bottomTile, ...remainingDeck];
}

/**
 * Shuffle the tile deck in place
 * Used by encounter cards that require shuffling
 */
export function shuffleTileDeck(
  deck: string[],
  randomFn: () => number = Math.random
): string[] {
  return shuffleArray(deck, randomFn);
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
  // For edges with subTileId, must match all three: tileId, direction, AND subTileId
  const updatedUnexploredEdges = dungeon.unexploredEdges.filter(
    e => !(
      e.tileId === exploredEdge.tileId && 
      e.direction === exploredEdge.direction &&
      e.subTileId === exploredEdge.subTileId
    )
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
