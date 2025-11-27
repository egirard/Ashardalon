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
