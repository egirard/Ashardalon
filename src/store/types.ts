/**
 * Hero type representing a playable character
 */
export interface Hero {
  id: string;
  name: string;
  heroClass: 'Cleric' | 'Fighter' | 'Paladin' | 'Rogue' | 'Wizard';
  imagePath: string;
  speed: number; // Movement speed in squares
}

/**
 * Position on the game board
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Hero token on the game board
 */
export interface HeroToken {
  heroId: string;
  position: Position;
}

/**
 * Game screen states
 */
export type GameScreen = 'character-select' | 'game-board';

/**
 * Game phase types
 */
export type GamePhase = 'hero-phase' | 'exploration-phase' | 'villain-phase';

/**
 * Turn state for tracking current turn
 */
export interface TurnState {
  currentHeroIndex: number;
  currentPhase: GamePhase;
  turnNumber: number;
}

/**
 * All available heroes in the game
 * Quinn and Vistra have speed 5, others have speed 6
 */
export const AVAILABLE_HEROES: Hero[] = [
  { id: 'quinn', name: 'Quinn', heroClass: 'Cleric', imagePath: 'assets/Hero_Cleric_Quinn.png', speed: 5 },
  { id: 'vistra', name: 'Vistra', heroClass: 'Fighter', imagePath: 'assets/Hero_Fighter_Vistra.png', speed: 5 },
  { id: 'keyleth', name: 'Keyleth', heroClass: 'Paladin', imagePath: 'assets/Hero_Paladin_Keyleth.png', speed: 6 },
  { id: 'tarak', name: 'Tarak', heroClass: 'Rogue', imagePath: 'assets/Hero_Rogue_Tarak.png', speed: 6 },
  { id: 'haskan', name: 'Haskan', heroClass: 'Wizard', imagePath: 'assets/Hero_Wizard_Haskan.png', speed: 6 },
];

/**
 * All 8 valid starting positions around the staircase on the Start Tile.
 * The Start Tile is a double-height tile with valid spaces from x: 1-3, y: 0-7.
 * These positions are adjacent to the staircase. At game start, 5 of these 8
 * positions are randomly chosen for player placement.
 */
export const START_TILE_POSITIONS: Position[] = [
  // Row 2 (above staircase)
  { x: 1, y: 2 },
  { x: 2, y: 2 },
  { x: 3, y: 2 },
  // Right side of staircase
  { x: 3, y: 3 },
  { x: 3, y: 4 },
  // Row 5 (below staircase)
  { x: 1, y: 5 },
  { x: 2, y: 5 },
  { x: 3, y: 5 },
];

/**
 * Cardinal directions for tile edges
 */
export type Direction = 'north' | 'south' | 'east' | 'west';

/**
 * Type of tile edge - wall blocks passage, open connects to other tiles, unexplored can be explored
 */
export type EdgeType = 'wall' | 'open' | 'unexplored';

/**
 * Reference to a specific edge on a tile
 */
export interface TileEdge {
  tileId: string;
  direction: Direction;
}

/**
 * Grid position for tiles in the dungeon layout
 */
export interface GridPosition {
  col: number;
  row: number;
}

/**
 * A tile placed on the dungeon board
 */
export interface PlacedTile {
  id: string;
  tileType: string;
  position: GridPosition;
  rotation: number; // 0, 90, 180, or 270 degrees
  edges: {
    north: EdgeType;
    south: EdgeType;
    east: EdgeType;
    west: EdgeType;
  };
}

/**
 * Tile definition describing a tile type before placement
 */
export interface TileDefinition {
  tileType: string;
  imagePath: string;
  /** Default edges before rotation - describes which edges are open/walls */
  defaultEdges: {
    north: EdgeType;
    south: EdgeType;
    east: EdgeType;
    west: EdgeType;
  };
}

/**
 * Dungeon state for tracking placed tiles and exploration
 */
export interface DungeonState {
  tiles: PlacedTile[];
  unexploredEdges: TileEdge[];
  tileDeck: string[]; // Array of tile type IDs remaining in the deck
}

/**
 * Available tile definitions
 * Based on the assets available: 2-exit, 3-exit, and 4-exit tiles
 */
export const TILE_DEFINITIONS: TileDefinition[] = [
  // 2-exit tiles (north and south open)
  { tileType: 'tile-2exit-a', imagePath: 'assets/Tile_Black_x2_01.png', defaultEdges: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' } },
  { tileType: 'tile-2exit-b', imagePath: 'assets/Tile_Black_x2_02.png', defaultEdges: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' } },
  { tileType: 'tile-2exit-c', imagePath: 'assets/Tile_Black_x2_03.png', defaultEdges: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' } },
  // 3-exit tiles
  { tileType: 'tile-3exit-a', imagePath: 'assets/Tile_Black_x3_01.png', defaultEdges: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' } },
  { tileType: 'tile-3exit-b', imagePath: 'assets/Tile_Black_x3_02.png', defaultEdges: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' } },
  { tileType: 'tile-3exit-c', imagePath: 'assets/Tile_Black_x3_03.png', defaultEdges: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' } },
  // 4-exit tiles
  { tileType: 'tile-4exit-a', imagePath: 'assets/Tile_Black_x4_01.png', defaultEdges: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' } },
  { tileType: 'tile-4exit-b', imagePath: 'assets/Tile_Black_x4_02.png', defaultEdges: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' } },
];

/**
 * Initial tile deck for the game (tile type IDs)
 */
export const INITIAL_TILE_DECK: string[] = [
  'tile-2exit-a', 'tile-2exit-b', 'tile-2exit-c',
  'tile-3exit-a', 'tile-3exit-b', 'tile-3exit-c',
  'tile-4exit-a', 'tile-4exit-b',
];

/**
 * Start tile definition - double height tile with 4 unexplored edges
 */
export const START_TILE: PlacedTile = {
  id: 'start-tile',
  tileType: 'start',
  position: { col: 0, row: 0 },
  rotation: 0,
  edges: {
    north: 'unexplored',
    south: 'unexplored',
    east: 'unexplored',
    west: 'unexplored',
  },
};
