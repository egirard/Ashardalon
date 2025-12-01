/**
 * Hero's basic attack information
 */
export interface HeroAttack {
  name: string;
  attackBonus: number;
  damage: number;
  range: number; // 1 for melee
}

/**
 * Hero level (1 or 2)
 */
export type HeroLevel = 1 | 2;

/**
 * Hero stats that vary by level
 */
export interface HeroLevelStats {
  level: HeroLevel;
  hp: number;
  maxHp: number;
  ac: number;
  surgeValue: number;
  attackBonus: number;
  damage: number;
}

/**
 * Level 1 and Level 2 stats for each hero
 */
export const HERO_LEVELS: Record<string, { level1: HeroLevelStats; level2: HeroLevelStats }> = {
  quinn: {
    level1: { level: 1, hp: 8, maxHp: 8, ac: 17, surgeValue: 4, attackBonus: 6, damage: 2 },
    level2: { level: 2, hp: 10, maxHp: 10, ac: 18, surgeValue: 5, attackBonus: 7, damage: 2 },
  },
  vistra: {
    level1: { level: 1, hp: 10, maxHp: 10, ac: 18, surgeValue: 5, attackBonus: 8, damage: 2 },
    level2: { level: 2, hp: 12, maxHp: 12, ac: 19, surgeValue: 6, attackBonus: 9, damage: 2 },
  },
  keyleth: {
    level1: { level: 1, hp: 10, maxHp: 10, ac: 18, surgeValue: 5, attackBonus: 7, damage: 2 },
    level2: { level: 2, hp: 12, maxHp: 12, ac: 19, surgeValue: 6, attackBonus: 8, damage: 2 },
  },
  tarak: {
    level1: { level: 1, hp: 8, maxHp: 8, ac: 17, surgeValue: 4, attackBonus: 7, damage: 2 },
    level2: { level: 2, hp: 10, maxHp: 10, ac: 18, surgeValue: 5, attackBonus: 8, damage: 2 },
  },
  haskan: {
    level1: { level: 1, hp: 6, maxHp: 6, ac: 14, surgeValue: 3, attackBonus: 4, damage: 1 },
    level2: { level: 2, hp: 8, maxHp: 8, ac: 15, surgeValue: 4, attackBonus: 5, damage: 1 },
  },
};

/**
 * Cost in XP to level up a hero
 */
export const LEVEL_UP_COST = 5;

/**
 * Cost in XP to cancel an encounter
 */
export const ENCOUNTER_CANCEL_COST = 5;

/**
 * Monster's basic attack information
 */
export interface MonsterAttack {
  attackBonus: number;
  damage: number;
}

/**
 * Monster attacks from cards (keyed by monster ID)
 */
export const MONSTER_ATTACKS: Record<string, MonsterAttack> = {
  kobold: { attackBonus: 5, damage: 1 },
  snake: { attackBonus: 4, damage: 1 },
  cultist: { attackBonus: 5, damage: 1 },
};

/**
 * Hero type representing a playable character
 */
export interface Hero {
  id: string;
  name: string;
  heroClass: 'Cleric' | 'Fighter' | 'Paladin' | 'Rogue' | 'Wizard';
  imagePath: string;
  speed: number; // Movement speed in squares
  attack: HeroAttack; // Hero's basic attack
  hp: number; // Current hit points
  maxHp: number; // Maximum hit points
  ac: number; // Armor class
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
 * Monster definition representing a monster type
 */
export interface Monster {
  id: string;
  name: string;
  ac: number;     // Armor Class
  hp: number;     // Hit Points
  maxHp: number;
  xp: number;     // Experience Points value
  imagePath: string;
}

/**
 * Monster instance on the game board
 */
export interface MonsterState {
  monsterId: string;     // Reference to Monster.id
  instanceId: string;    // Unique instance ID
  position: Position;
  currentHp: number;
  controllerId: string;  // Hero ID who controls this monster
  tileId: string;        // Tile where the monster was spawned
}

/**
 * Result of a hero's attack against a monster
 */
export interface AttackResult {
  roll: number;        // d20 result (1-20)
  attackBonus: number;
  total: number;       // roll + bonus
  targetAC: number;
  isHit: boolean;
  damage: number;      // 0 if miss
  isCritical: boolean; // natural 20
}

/**
 * Monster deck for drawing monsters during exploration
 */
export interface MonsterDeck {
  drawPile: string[];    // Monster IDs
  discardPile: string[];
}

/**
 * Available monsters in the game
 */
export const MONSTERS: Monster[] = [
  { id: 'kobold', name: 'Kobold Dragonshield', ac: 14, hp: 1, maxHp: 1, xp: 1, imagePath: 'assets/Monster_KoboldDragonshield.png' },
  { id: 'snake', name: 'Snake', ac: 12, hp: 1, maxHp: 1, xp: 1, imagePath: 'assets/Monster_Snake.png' },
  { id: 'cultist', name: 'Cultist', ac: 13, hp: 2, maxHp: 2, xp: 1, imagePath: 'assets/Monster_Cultist.png' },
];

/**
 * Initial monster deck (monster IDs that can be drawn)
 */
export const INITIAL_MONSTER_DECK: string[] = [
  'kobold', 'kobold', 'kobold',
  'snake', 'snake', 'snake',
  'cultist', 'cultist', 'cultist',
];

/**
 * Party resources shared by all heroes
 */
export interface PartyResources {
  /** Total experience points earned by defeating monsters */
  xp: number;
  /** Number of healing surges remaining for the party */
  healingSurges: number;
}

/**
 * Game screen states
 */
export type GameScreen = 'character-select' | 'game-board' | 'victory' | 'defeat';

/**
 * Scenario state for tracking win/loss conditions
 * MVP scenario: Defeat 2 monsters to win
 */
export interface ScenarioState {
  /** Number of monsters defeated */
  monstersDefeated: number;
  /** Monsters needed to win (MVP: 2) */
  monstersToDefeat: number;
  /** Objective description */
  objective: string;
}

/**
 * Game phase types
 */
export type GamePhase = 'hero-phase' | 'exploration-phase' | 'villain-phase';

/**
 * Hero turn sub-action types
 * - move: hero moved to a new position
 * - attack: hero attacked a monster
 */
export type HeroSubAction = 'move' | 'attack';

/**
 * Hero turn actions state for tracking what actions have been taken during hero phase
 * Valid sequences:
 * - Move only (can move again after)
 * - Move, then attack (turn ends)
 * - Attack, then move (turn ends)
 * - Move twice (turn ends)
 * No double attacks allowed
 */
export interface HeroTurnActions {
  actionsTaken: HeroSubAction[];
  canMove: boolean;
  canAttack: boolean;
}

/**
 * Turn state for tracking current turn
 */
export interface TurnState {
  currentHeroIndex: number;
  currentPhase: GamePhase;
  turnNumber: number;
  /** 
   * Whether a tile was placed (exploration occurred) during this turn.
   * Used to track if hero explored at all.
   */
  exploredThisTurn: boolean;
  /**
   * Whether only white arrow tiles were drawn this turn.
   * - true: only white tiles drawn (prevents encounter draw)
   * - false: at least one black tile drawn OR no tiles drawn
   * This is used to determine if an encounter should be drawn:
   * - No exploration: draw encounter
   * - Black tile drawn: draw encounter
   * - Only white tiles drawn: NO encounter
   */
  drewOnlyWhiteTilesThisTurn: boolean;
}

/**
 * Villain phase step types for tracking monster activations
 * Note: This type is defined for future animation/logging features
 * to track individual steps during monster activation.
 */
export type VillainPhaseStep = 
  | { type: 'monster-activation'; monsterId: string }
  | { type: 'monster-move'; monsterId: string; destination: Position }
  | { type: 'monster-attack'; monsterId: string; targetId: string; result: AttackResult }
  | { type: 'phase-complete' };

/**
 * Hero HP state for tracking current HP and level during the game
 */
export interface HeroHpState {
  heroId: string;
  currentHp: number;
  maxHp: number;
  level: HeroLevel;
  ac: number;
  surgeValue: number;
  attackBonus: number;
}

/**
 * All available heroes in the game
 * Quinn and Vistra have speed 5, others have speed 6
 * HP, maxHp, and AC based on game design
 */
export const AVAILABLE_HEROES: Hero[] = [
  { id: 'quinn', name: 'Quinn', heroClass: 'Cleric', imagePath: 'assets/Hero_Cleric_Quinn.png', speed: 5, attack: { name: 'Mace', attackBonus: 6, damage: 2, range: 1 }, hp: 8, maxHp: 8, ac: 17 },
  { id: 'vistra', name: 'Vistra', heroClass: 'Fighter', imagePath: 'assets/Hero_Fighter_Vistra.png', speed: 5, attack: { name: 'Warhammer', attackBonus: 8, damage: 2, range: 1 }, hp: 10, maxHp: 10, ac: 18 },
  { id: 'keyleth', name: 'Keyleth', heroClass: 'Paladin', imagePath: 'assets/Hero_Paladin_Keyleth.png', speed: 6, attack: { name: 'Longsword', attackBonus: 7, damage: 2, range: 1 }, hp: 10, maxHp: 10, ac: 18 },
  { id: 'tarak', name: 'Tarak', heroClass: 'Rogue', imagePath: 'assets/Hero_Rogue_Tarak.png', speed: 6, attack: { name: 'Short Sword', attackBonus: 7, damage: 2, range: 1 }, hp: 8, maxHp: 8, ac: 17 },
  { id: 'haskan', name: 'Haskan', heroClass: 'Wizard', imagePath: 'assets/Hero_Wizard_Haskan.png', speed: 6, attack: { name: 'Quarterstaff', attackBonus: 4, damage: 1, range: 1 }, hp: 6, maxHp: 6, ac: 14 },
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
  /** 
   * Whether this is a black arrow tile.
   * - Black arrow tiles: spawn monsters AND trigger encounter draw
   * - White arrow tiles: spawn monsters but prevent encounter draw (if only white tiles drawn)
   */
  isBlackTile: boolean;
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
 * - Black arrow tiles: spawn monsters AND trigger encounter draw
 * - White arrow tiles: spawn monsters but prevent encounter draw (if only white tiles drawn)
 */
export const TILE_DEFINITIONS: TileDefinition[] = [
  // Black 2-exit tiles (spawn monsters, trigger encounter)
  { tileType: 'tile-black-2exit-a', imagePath: 'assets/Tile_Black_x2_01.png', defaultEdges: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, isBlackTile: true },
  { tileType: 'tile-black-2exit-b', imagePath: 'assets/Tile_Black_x2_02.png', defaultEdges: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, isBlackTile: true },
  { tileType: 'tile-black-2exit-c', imagePath: 'assets/Tile_Black_x2_03.png', defaultEdges: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, isBlackTile: true },
  // Black 3-exit tiles (spawn monsters, trigger encounter)
  { tileType: 'tile-black-3exit-a', imagePath: 'assets/Tile_Black_x3_01.png', defaultEdges: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, isBlackTile: true },
  { tileType: 'tile-black-3exit-b', imagePath: 'assets/Tile_Black_x3_02.png', defaultEdges: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, isBlackTile: true },
  { tileType: 'tile-black-3exit-c', imagePath: 'assets/Tile_Black_x3_03.png', defaultEdges: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, isBlackTile: true },
  // Black 4-exit tiles (spawn monsters, trigger encounter)
  { tileType: 'tile-black-4exit-a', imagePath: 'assets/Tile_Black_x4_01.png', defaultEdges: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, isBlackTile: true },
  { tileType: 'tile-black-4exit-b', imagePath: 'assets/Tile_Black_x4_02.png', defaultEdges: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, isBlackTile: true },
  // White 2-exit tiles (spawn monsters, prevent encounter if only white tiles drawn)
  { tileType: 'tile-white-2exit-a', imagePath: 'assets/Tile_White_x2_01.png', defaultEdges: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, isBlackTile: false },
  { tileType: 'tile-white-2exit-b', imagePath: 'assets/Tile_White_x2_02.png', defaultEdges: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, isBlackTile: false },
  { tileType: 'tile-white-2exit-c', imagePath: 'assets/Tile_White_x2_03.png', defaultEdges: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, isBlackTile: false },
  { tileType: 'tile-white-2exit-d', imagePath: 'assets/Tile_White_x2_04.png', defaultEdges: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, isBlackTile: false },
  { tileType: 'tile-white-2exit-e', imagePath: 'assets/Tile_White_x2_05.png', defaultEdges: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, isBlackTile: false },
  // White 3-exit tiles (spawn monsters, prevent encounter if only white tiles drawn)
  { tileType: 'tile-white-3exit-a', imagePath: 'assets/Tile_White_x3_01.png', defaultEdges: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, isBlackTile: false },
  { tileType: 'tile-white-3exit-b', imagePath: 'assets/Tile_White_x3_02.png', defaultEdges: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, isBlackTile: false },
  { tileType: 'tile-white-3exit-c', imagePath: 'assets/Tile_White_x3_03.png', defaultEdges: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, isBlackTile: false },
];

/**
 * Initial tile deck for the game (tile type IDs)
 * Mix of black (spawn monsters) and white (no monsters) tiles
 */
export const INITIAL_TILE_DECK: string[] = [
  // Black tiles
  'tile-black-2exit-a', 'tile-black-2exit-b', 'tile-black-2exit-c',
  'tile-black-3exit-a', 'tile-black-3exit-b', 'tile-black-3exit-c',
  'tile-black-4exit-a', 'tile-black-4exit-b',
  // White tiles
  'tile-white-2exit-a', 'tile-white-2exit-b', 'tile-white-2exit-c', 'tile-white-2exit-d', 'tile-white-2exit-e',
  'tile-white-3exit-a', 'tile-white-3exit-b', 'tile-white-3exit-c',
];

/**
 * Sub-tile identifier for the start tile.
 * The start tile consists of two joined sub-tiles:
 * - 'north': The north half (y: 0-3)
 * - 'south': The south half (y: 4-7)
 * 
 * Each sub-tile is treated as its own tile for movement and counting purposes,
 * but the start tile is displayed and referenced as a single unified tile.
 */
export type StartTileSubTileId = 'start-tile-north' | 'start-tile-south';

/**
 * Constants for start tile sub-tile boundaries.
 * The start tile is divided into two 4x4 sub-tiles along the y-axis.
 */
export const START_TILE_SUB_TILE_BOUNDARY = {
  /** Y coordinate where the north sub-tile ends (inclusive) */
  northMaxY: 3,
  /** Y coordinate where the south sub-tile starts (inclusive) */
  southMinY: 4,
};

/**
 * Check if a y-coordinate is in the north half of the start tile
 */
export function isInNorthSubTile(y: number): boolean {
  return y >= 0 && y <= START_TILE_SUB_TILE_BOUNDARY.northMaxY;
}

/**
 * Check if a y-coordinate is in the south half of the start tile
 */
export function isInSouthSubTile(y: number): boolean {
  return y >= START_TILE_SUB_TILE_BOUNDARY.southMinY && y <= 7;
}

/**
 * Get the sub-tile ID for a position on the start tile
 * @param y - The y coordinate within the start tile (0-7)
 * @returns The sub-tile ID ('start-tile-north' or 'start-tile-south'), or null if outside start tile bounds
 */
export function getStartTileSubTileId(y: number): StartTileSubTileId | null {
  if (isInNorthSubTile(y)) {
    return 'start-tile-north';
  }
  if (isInSouthSubTile(y)) {
    return 'start-tile-south';
  }
  return null;
}

/**
 * Start tile definition - double height tile with 4 unexplored edges
 * 
 * The start tile is a special double-sized tile composed of two joined sub-tiles:
 * - North sub-tile: y coordinates 0-3
 * - South sub-tile: y coordinates 4-7
 * 
 * For visual and exploration purposes, it's treated as one tile with 4 edges.
 * For movement and tile counting purposes, each sub-tile is treated separately.
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

/**
 * Encounter card type categories
 */
export type EncounterType = 'event' | 'trap' | 'hazard' | 'curse' | 'environment';

/**
 * Encounter effect types that can be applied when an encounter card is drawn
 * 
 * - damage: Immediately deal damage to one or all heroes
 * - curse: Apply a lasting debuff (duration in turns) - NOT YET IMPLEMENTED
 * - environment: Create a persistent dungeon-wide effect - NOT YET IMPLEMENTED
 * - trap: Can be disabled with a skill check (disableDC) - NOT YET IMPLEMENTED
 * - hazard: Make an attack against hero's AC - NOT YET IMPLEMENTED
 */
export type EncounterEffect = 
  | { type: 'damage'; amount: number; target: 'active-hero' | 'all-heroes' }
  | { type: 'curse'; duration: number }
  | { type: 'environment' }
  | { type: 'trap'; disableDC: number }
  | { type: 'hazard'; ac: number; damage: number };

/**
 * Encounter card definition
 */
export interface EncounterCard {
  id: string;
  name: string;
  type: EncounterType;
  description: string;
  effect: EncounterEffect;
  imagePath: string;
}

/**
 * Encounter deck for drawing encounters when no tile is placed
 */
export interface EncounterDeck {
  drawPile: string[];
  discardPile: string[];
}

/**
 * Initial encounter cards for the game
 * 
 * Effect Implementation Status:
 * - damage (active-hero): ✅ IMPLEMENTED - Deals damage to the active hero
 * - damage (all-heroes): ✅ IMPLEMENTED - Deals damage to all heroes
 * - environment: ⚠️ NOT IMPLEMENTED - Would apply dungeon-wide effects (e.g., attack roll penalties)
 * - curse: ⚠️ NOT IMPLEMENTED - Would apply duration-based debuffs to heroes
 * - trap: ⚠️ NOT IMPLEMENTED - Would allow skill checks to disable
 * - hazard: ⚠️ NOT IMPLEMENTED - Would make attack rolls against hero AC
 * 
 * Cards with unimplemented effects will show description but not apply mechanical effects.
 */
export const ENCOUNTER_CARDS: EncounterCard[] = [
  {
    id: 'volcanic-spray',
    name: 'Volcanic Spray',
    type: 'event',
    description: 'Hot volcanic spray erupts from a crack in the ground. The active hero takes 1 damage.',
    effect: { type: 'damage', amount: 1, target: 'active-hero' },
    imagePath: 'assets/Encounter_VolcanicSpray.png',
  },
  {
    id: 'goblin-ambush',
    name: 'Goblin Ambush',
    type: 'event',
    description: 'The active hero takes 1 damage.',
    effect: { type: 'damage', amount: 1, target: 'active-hero' },
    imagePath: 'assets/Encounter_GoblinAmbush.png',
  },
  {
    id: 'dark-fog',
    name: 'Dark Fog',
    type: 'environment',
    description: 'All heroes have -2 to attack rolls until the end of the next Hero Phase.',
    effect: { type: 'environment' },
    imagePath: 'assets/Encounter_DarkFog.png',
  },
  {
    id: 'cave-in',
    name: 'Cave-In',
    type: 'event',
    description: 'All heroes take 1 damage.',
    effect: { type: 'damage', amount: 1, target: 'all-heroes' },
    imagePath: 'assets/Encounter_CaveIn.png',
  },
  {
    id: 'poisoned-dart-trap',
    name: 'Poisoned Dart Trap',
    type: 'trap',
    description: 'The active hero takes 2 damage unless they succeed on a DC 12 Dexterity check.',
    effect: { type: 'trap', disableDC: 12 },
    imagePath: 'assets/Encounter_PoisonedDartTrap.png',
  },
];

/**
 * Initial encounter deck (encounter IDs that can be drawn)
 */
export const INITIAL_ENCOUNTER_DECK: string[] = [
  'volcanic-spray',
  'goblin-ambush', 
  'dark-fog',
  'cave-in',
  'poisoned-dart-trap',
];
