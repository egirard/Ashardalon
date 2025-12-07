/**
 * Power card effect handlers for special effects like board tokens
 */

import type { BoardTokenState, Position, DungeonState, MonsterState } from './types';
import { createBoardToken } from './boardTokens';

/**
 * Tile dimension constants
 */
const TILE_WIDTH = 4;
const NORMAL_TILE_HEIGHT = 4;
const START_TILE_HEIGHT = 8;
const TILE_BORDER_SIZE = 1; // Wall border thickness in squares

/**
 * Get all valid squares on a specific tile for token placement
 * Valid squares are interior squares, excluding the border walls
 */
export function getTileSquares(tileId: string, dungeon: DungeonState): Position[] {
  const tile = dungeon.tiles.find(t => t.id === tileId);
  if (!tile) return [];

  const tileWidth = TILE_WIDTH;
  const tileHeight = tile.id === 'start-tile' ? START_TILE_HEIGHT : NORMAL_TILE_HEIGHT;
  
  const minX = tile.position.col * tileWidth;
  const maxX = minX + tileWidth - 1;
  const minY = tile.position.row * tileHeight;
  const maxY = minY + tileHeight - 1;
  
  const squares: Position[] = [];
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      // Exclude wall squares (outer border of each tile)
      // Interior squares are those not on the border
      const localX = x - minX;
      const localY = y - minY;
      const isInteriorX = localX >= TILE_BORDER_SIZE && localX < tileWidth - TILE_BORDER_SIZE;
      const isInteriorY = localY >= TILE_BORDER_SIZE && localY < tileHeight - TILE_BORDER_SIZE;
      
      if (isInteriorX && isInteriorY) {
        squares.push({ x, y });
      }
    }
  }
  
  return squares;
}

/**
 * Create Blade Barrier tokens for placement
 * Card ID: 5 (Cleric daily)
 * Rule: Place five Blade Barrier tokens on five different squares on a chosen tile
 */
export function createBladeBarrierTokens(
  heroId: string,
  tileId: string,
  dungeon: DungeonState,
  startingCounter: number
): BoardTokenState[] {
  const validSquares = getTileSquares(tileId, dungeon);
  
  // Select up to 5 squares for token placement
  // For now, just place on the first 5 valid squares
  const tokenSquares = validSquares.slice(0, Math.min(5, validSquares.length));
  
  return tokenSquares.map((position, index) => 
    createBoardToken(
      'blade-barrier',
      5, // Power card ID
      heroId,
      position,
      startingCounter + index
    )
  );
}

/**
 * Create Flaming Sphere token
 * Card ID: 45 (Wizard daily)
 * Rule: Place 3 Flaming Sphere tokens in a stack on any square within 1 tile
 */
export function createFlamingSphereToken(
  heroId: string,
  position: Position,
  startingCounter: number
): BoardTokenState {
  return createBoardToken(
    'flaming-sphere',
    45, // Power card ID
    heroId,
    position,
    startingCounter,
    { charges: 3, canMove: true }
  );
}

/**
 * Handle Blade Barrier damage when a monster is placed on a token square
 * Rule: When a Monster is placed on a square with a Blade Barrier token,
 *       remove that token and deal 1 damage to the Monster
 */
export function checkBladeBarrierDamage(
  monsterPosition: Position,
  tokens: BoardTokenState[]
): {
  shouldDamage: boolean;
  tokenToRemove: string | null;
} {
  const bladeBarrierToken = tokens.find(
    token => 
      token.type === 'blade-barrier' &&
      token.position.x === monsterPosition.x &&
      token.position.y === monsterPosition.y
  );
  
  if (bladeBarrierToken) {
    return {
      shouldDamage: true,
      tokenToRemove: bladeBarrierToken.id,
    };
  }
  
  return {
    shouldDamage: false,
    tokenToRemove: null,
  };
}

/**
 * Deal damage to all monsters on Flaming Sphere's tile
 * Rule: At the end of your Hero Phase, you can remove 1 Flaming Sphere token
 *       and deal 1 damage to each Monster on that tile
 */
export function getFlamingSphereDamageTargets(
  token: BoardTokenState,
  monsters: MonsterState[]
): MonsterState[] {
  // Get all monsters on the same tile as the token
  const tokenTileX = Math.floor(token.position.x / TILE_WIDTH);
  const tokenTileY = Math.floor(token.position.y / TILE_WIDTH);
  
  return monsters.filter(monster => {
    const monsterTileX = Math.floor(monster.position.x / TILE_WIDTH);
    const monsterTileY = Math.floor(monster.position.y / TILE_WIDTH);
    return monsterTileX === tokenTileX && monsterTileY === tokenTileY;
  });
}

/**
 * Check if a position is within N tiles of another position
 */
export function isWithinTiles(
  fromPosition: Position,
  toPosition: Position,
  tileDistance: number
): boolean {
  const fromTileX = Math.floor(fromPosition.x / TILE_WIDTH);
  const fromTileY = Math.floor(fromPosition.y / TILE_WIDTH);
  const toTileX = Math.floor(toPosition.x / TILE_WIDTH);
  const toTileY = Math.floor(toPosition.y / TILE_WIDTH);
  
  const tileDiffX = Math.abs(toTileX - fromTileX);
  const tileDiffY = Math.abs(toTileY - fromTileY);
  
  // Use Manhattan distance for tile counting
  return (tileDiffX + tileDiffY) <= tileDistance;
}

/**
 * Get valid positions for Flaming Sphere placement (within 1 tile of hero)
 */
export function getValidFlamingSpherePositions(
  heroPosition: Position,
  dungeon: DungeonState
): Position[] {
  const validPositions: Position[] = [];
  
  // Check all tiles
  for (const tile of dungeon.tiles) {
    const squares = getTileSquares(tile.id, dungeon);
    for (const square of squares) {
      if (isWithinTiles(heroPosition, square, 1)) {
        validPositions.push(square);
      }
    }
  }
  
  return validPositions;
}

/**
 * Get valid positions for moving Flaming Sphere (1 tile from current position)
 */
export function getValidFlamingSphereMovePositions(
  currentPosition: Position,
  dungeon: DungeonState
): Position[] {
  const validPositions: Position[] = [];
  
  // Check all tiles
  for (const tile of dungeon.tiles) {
    const squares = getTileSquares(tile.id, dungeon);
    for (const square of squares) {
      if (isWithinTiles(currentPosition, square, 1)) {
        validPositions.push(square);
      }
    }
  }
  
  return validPositions;
}
