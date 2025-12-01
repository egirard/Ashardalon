import type { MonsterDeck, Monster, MonsterState, Position, PlacedTile, DungeonState } from './types';
import { MONSTERS, INITIAL_MONSTER_DECK } from './types';

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
 * Initialize the monster deck with shuffled monsters
 */
export function initializeMonsterDeck(
  randomFn: () => number = Math.random
): MonsterDeck {
  return {
    drawPile: shuffleArray([...INITIAL_MONSTER_DECK], randomFn),
    discardPile: [],
  };
}

/**
 * Draw a monster from the deck
 * If the draw pile is empty, shuffle the discard pile to form a new draw pile
 */
export function drawMonster(
  deck: MonsterDeck,
  randomFn: () => number = Math.random
): { monster: string | null; deck: MonsterDeck } {
  // If draw pile is empty, reshuffle discard pile
  if (deck.drawPile.length === 0) {
    if (deck.discardPile.length === 0) {
      return { monster: null, deck };
    }
    
    // Reshuffle discard pile into draw pile
    const reshuffled = shuffleArray(deck.discardPile, randomFn);
    return {
      monster: reshuffled[0],
      deck: {
        drawPile: reshuffled.slice(1),
        discardPile: [],
      },
    };
  }
  
  const [monster, ...remainingDraw] = deck.drawPile;
  return {
    monster,
    deck: {
      drawPile: remainingDraw,
      discardPile: deck.discardPile,
    },
  };
}

/**
 * Discard a monster card to the discard pile
 */
export function discardMonster(
  deck: MonsterDeck,
  monsterId: string
): MonsterDeck {
  return {
    drawPile: deck.drawPile,
    discardPile: [...deck.discardPile, monsterId],
  };
}

/**
 * Get monster definition by ID
 */
export function getMonsterById(monsterId: string): Monster | undefined {
  return MONSTERS.find(m => m.id === monsterId);
}

/**
 * Create a new monster instance
 */
export function createMonsterInstance(
  monsterId: string,
  position: Position,
  controllerId: string,
  tileId: string,
  instanceIndex: number
): MonsterState | null {
  const monster = getMonsterById(monsterId);
  if (!monster) {
    return null;
  }
  
  return {
    monsterId,
    instanceId: `${monsterId}-${instanceIndex}`,
    position,
    currentHp: monster.hp,
    controllerId,
    tileId,
  };
}

/**
 * Tile grid dimensions for monster placement
 * Normal tiles are 4x4 grid
 */
const NORMAL_TILE_GRID_SIZE = 4;

/**
 * Center position of a normal tile
 * Calculated as floor of grid size / 2
 */
const TILE_CENTER = Math.floor(NORMAL_TILE_GRID_SIZE / 2);

/**
 * Get the center position of a tile for monster placement
 * For normal tiles (4x4), center is at (2, 2)
 * @deprecated Use getBlackSquarePosition for proper black square positioning
 */
export function getTileMonsterSpawnPosition(): Position {
  return { x: TILE_CENTER, y: TILE_CENTER };
}

/**
 * Get the black square position on a tile based on its rotation.
 * 
 * In Wrath of Ashardalon, the black square is located at the edge where the
 * arrow points (the connecting edge where heroes enter). The position is
 * at the center of that edge (position 1 in local coordinates).
 * 
 * Tile rotation determines which edge the arrow points to:
 * - 0° (arrow points south): black square at (1, 3) - south edge center
 * - 90° (arrow points west): black square at (0, 1) - west edge center  
 * - 180° (arrow points north): black square at (1, 0) - north edge center
 * - 270° (arrow points east): black square at (3, 1) - east edge center
 * 
 * @param rotation - The tile's rotation in degrees (0, 90, 180, or 270)
 * @returns The black square position in local tile coordinates
 */
export function getBlackSquarePosition(rotation: number): Position {
  // Normalize rotation to 0, 90, 180, or 270
  const normalizedRotation = ((rotation % 360) + 360) % 360;
  
  switch (normalizedRotation) {
    case 0:
      // Arrow points south, black square at south edge center
      return { x: 1, y: 3 };
    case 90:
      // Arrow points west, black square at west edge center
      return { x: 0, y: 1 };
    case 180:
      // Arrow points north, black square at north edge center
      return { x: 1, y: 0 };
    case 270:
      // Arrow points east, black square at east edge center
      return { x: 3, y: 1 };
    default:
      // Fallback to center for unexpected rotations
      return { x: TILE_CENTER, y: TILE_CENTER };
  }
}

/**
 * Get the adjacent positions to a given position on a tile.
 * Returns positions in a consistent order for deterministic fallback selection.
 * 
 * @param pos - The position to get adjacent squares for
 * @returns Array of adjacent positions (up to 8, excluding positions outside tile bounds)
 */
export function getAdjacentTilePositions(pos: Position): Position[] {
  const adjacent: Position[] = [];
  
  // Check all 8 directions in a consistent order: N, S, E, W, NE, NW, SE, SW
  const directions = [
    { dx: 0, dy: -1 },  // North
    { dx: 0, dy: 1 },   // South
    { dx: 1, dy: 0 },   // East
    { dx: -1, dy: 0 },  // West
    { dx: 1, dy: -1 },  // Northeast
    { dx: -1, dy: -1 }, // Northwest
    { dx: 1, dy: 1 },   // Southeast
    { dx: -1, dy: 1 },  // Southwest
  ];
  
  for (const dir of directions) {
    const newX = pos.x + dir.dx;
    const newY = pos.y + dir.dy;
    
    // Check if within tile bounds (0-3 for 4x4 tile)
    if (newX >= 0 && newX < NORMAL_TILE_GRID_SIZE && 
        newY >= 0 && newY < NORMAL_TILE_GRID_SIZE) {
      adjacent.push({ x: newX, y: newY });
    }
  }
  
  return adjacent;
}

/**
 * Check if a position on a tile is occupied by a monster.
 * 
 * @param position - The local tile position to check
 * @param tileId - The tile ID to check for occupation
 * @param monsters - Array of all monsters on the board
 * @returns true if the position is occupied by a monster on that tile
 */
export function isPositionOccupiedByMonster(
  position: Position,
  tileId: string,
  monsters: MonsterState[]
): boolean {
  return monsters.some(
    m => m.tileId === tileId && 
         m.position.x === position.x && 
         m.position.y === position.y
  );
}

/**
 * Get the spawn position for a monster on a tile.
 * 
 * According to the rules:
 * 1. Monsters spawn on the black square of the tile
 * 2. If the black square is occupied, spawn on an adjacent open square
 * 3. If no adjacent square is available, return null (no valid spawn position)
 * 
 * @param tile - The placed tile where the monster will spawn
 * @param monsters - Array of all monsters currently on the board
 * @returns The spawn position in local tile coordinates, or null if no valid position
 */
export function getMonsterSpawnPosition(
  tile: PlacedTile,
  monsters: MonsterState[]
): Position | null {
  // Get the black square position based on tile rotation
  const blackSquare = getBlackSquarePosition(tile.rotation);
  
  // Check if the black square is available
  if (!isPositionOccupiedByMonster(blackSquare, tile.id, monsters)) {
    return blackSquare;
  }
  
  // Black square is occupied, find an adjacent open square
  const adjacentPositions = getAdjacentTilePositions(blackSquare);
  
  for (const pos of adjacentPositions) {
    if (!isPositionOccupiedByMonster(pos, tile.id, monsters)) {
      return pos;
    }
  }
  
  // No valid spawn position found
  return null;
}
