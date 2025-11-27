/**
 * Hero type representing a playable character
 */
export interface Hero {
  id: string;
  name: string;
  heroClass: 'Cleric' | 'Fighter' | 'Paladin' | 'Rogue' | 'Wizard';
  imagePath: string;
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
 */
export const AVAILABLE_HEROES: Hero[] = [
  { id: 'quinn', name: 'Quinn', heroClass: 'Cleric', imagePath: 'assets/Hero_Cleric_Quinn.png' },
  { id: 'vistra', name: 'Vistra', heroClass: 'Fighter', imagePath: 'assets/Hero_Fighter_Vistra.png' },
  { id: 'keyleth', name: 'Keyleth', heroClass: 'Paladin', imagePath: 'assets/Hero_Paladin_Keyleth.png' },
  { id: 'tarak', name: 'Tarak', heroClass: 'Rogue', imagePath: 'assets/Hero_Rogue_Tarak.png' },
  { id: 'haskan', name: 'Haskan', heroClass: 'Wizard', imagePath: 'assets/Hero_Wizard_Haskan.png' },
];

/**
 * Valid starting positions around the staircase on the Start Tile.
 * The Start Tile is a double-height tile with valid spaces from x: 1-4, y: 0-7.
 * These positions are adjacent to the staircase.
 */
export const START_TILE_POSITIONS: Position[] = [
  { x: 1, y: 2 },
  { x: 2, y: 2 },
  { x: 3, y: 2 },
  { x: 3, y: 3 },
  { x: 3, y: 4 },
];
