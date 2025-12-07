import type { 
  BoardTokenState, 
  BoardTokenType,
  Position,
  PlacedTile,
  DungeonState,
} from './types';

/**
 * Create a board token instance
 */
export function createBoardToken(
  type: BoardTokenType,
  powerCardId: number,
  ownerId: string,
  position: Position,
  instanceId: number,
  options?: {
    charges?: number;
    canMove?: boolean;
  }
): BoardTokenState {
  return {
    id: `token-${type}-${instanceId}`,
    type,
    powerCardId,
    ownerId,
    position,
    charges: options?.charges,
    canMove: options?.canMove,
  };
}

/**
 * Check if a position has a specific type of board token
 */
export function hasTokenAtPosition(
  position: Position,
  tokens: BoardTokenState[],
  type?: BoardTokenType
): boolean {
  return tokens.some(token => 
    token.position.x === position.x && 
    token.position.y === position.y &&
    (!type || token.type === type)
  );
}

/**
 * Get all tokens at a specific position
 */
export function getTokensAtPosition(
  position: Position,
  tokens: BoardTokenState[]
): BoardTokenState[] {
  return tokens.filter(token =>
    token.position.x === position.x && token.position.y === position.y
  );
}

/**
 * Get tokens by owner
 */
export function getTokensByOwner(
  ownerId: string,
  tokens: BoardTokenState[]
): BoardTokenState[] {
  return tokens.filter(token => token.ownerId === ownerId);
}

/**
 * Get tokens by type
 */
export function getTokensByType(
  type: BoardTokenType,
  tokens: BoardTokenState[]
): BoardTokenState[] {
  return tokens.filter(token => token.type === type);
}

/**
 * Remove a token by ID
 */
export function removeToken(
  tokenId: string,
  tokens: BoardTokenState[]
): BoardTokenState[] {
  return tokens.filter(token => token.id !== tokenId);
}

/**
 * Update a token's position
 */
export function moveToken(
  tokenId: string,
  newPosition: Position,
  tokens: BoardTokenState[]
): BoardTokenState[] {
  return tokens.map(token =>
    token.id === tokenId
      ? { ...token, position: newPosition }
      : token
  );
}

/**
 * Decrement token charges and remove if depleted
 */
export function decrementTokenCharges(
  tokenId: string,
  tokens: BoardTokenState[]
): BoardTokenState[] {
  return tokens
    .map(token => {
      if (token.id === tokenId && token.charges !== undefined) {
        return { ...token, charges: token.charges - 1 };
      }
      return token;
    })
    .filter(token => token.charges === undefined || token.charges > 0);
}

/**
 * Get token display information
 */
export function getTokenDisplayInfo(type: BoardTokenType): {
  name: string;
  emoji: string;
  color: string;
} {
  switch (type) {
    case 'blade-barrier':
      return {
        name: 'Blade Barrier',
        emoji: '⚔️',
        color: '#c0c0c0', // silver
      };
    case 'flaming-sphere':
      return {
        name: 'Flaming Sphere',
        emoji: '🔥',
        color: '#ff6600', // orange-red
      };
    case 'mirror-image':
      return {
        name: 'Mirror Image',
        emoji: '👤',
        color: '#00aaff', // light blue
      };
    case 'wizard-eye':
      return {
        name: 'Wizard Eye',
        emoji: '👁️',
        color: '#9900ff', // purple
      };
    default:
      return {
        name: 'Token',
        emoji: '⭐',
        color: '#ffff00', // yellow
      };
  }
}

/**
 * Check if a position is valid for token placement on a specific tile
 */
export function isValidTokenPosition(
  position: Position,
  dungeon: DungeonState
): boolean {
  // Check if position is within any placed tile's bounds
  for (const tile of dungeon.tiles) {
    const bounds = getTileBoundsForPosition(tile);
    if (
      position.x >= bounds.minX &&
      position.x <= bounds.maxX &&
      position.y >= bounds.minY &&
      position.y <= bounds.maxY
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Get tile bounds for a placed tile
 */
function getTileBoundsForPosition(tile: PlacedTile): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  const tileWidth = 4;
  const tileHeight = tile.id === 'start-tile' ? 8 : 4;
  
  const minX = tile.position.col * tileWidth;
  const maxX = minX + tileWidth - 1;
  const minY = tile.position.row * tileHeight;
  const maxY = minY + tileHeight - 1;
  
  return { minX, maxX, minY, maxY };
}
